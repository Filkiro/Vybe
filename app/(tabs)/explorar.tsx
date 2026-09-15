import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { Search, Sparkles, Disc, Calendar, Music, Compass, Flame } from "lucide-react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { PublicacaoCard, PublicacaoFeedItem } from "../../components/PublicacaoCard";
import { colors } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";

const FILTROS_CENA = ["Tudo", "Lançamentos", "Eventos", "Em Alta"];

export default function Explorar() {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<PublicacaoFeedItem[]>([]);
  const [destaques, setDestaques] = useState<PublicacaoFeedItem[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState("Tudo");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const paddingBottom = usePlayerAwarePadding(140);

  const carregar = useCallback(async () => {
    const { data: posts } = await supabase
      .from("publicacao")
      .select(
        "id, usuario_id, foto_url, descricao, criado_em, evento_id, usuario:usuario_id(nome, tipo_conta), evento:evento_id(nome, data, localizacao)"
      )
      .order("criado_em", { ascending: false })
      .limit(50);

    const lista = posts ?? [];
    if (lista.length === 0) {
      setPublicacoes([]);
      setDestaques([]);
      return;
    }

    const idsUsuarios = Array.from(new Set(lista.map((p: any) => p.usuario_id)));
    const idsPublicacoes = lista.map((p: any) => p.id);

    const [{ data: perfis }, { data: curtidas }] = await Promise.all([
      supabase.from("perfil_musico").select("usuario_id, apelido, foto_url").in("usuario_id", idsUsuarios),
      supabase.from("curtida").select("publicacao_id, usuario_id").in("publicacao_id", idsPublicacoes),
    ]);

    const mapaPerfil = new Map((perfis ?? []).map((p: any) => [p.usuario_id, p]));
    const contagem = new Map<string, number>();
    const curtiPorMim = new Set<string>();

    (curtidas ?? []).forEach((c: any) => {
      contagem.set(c.publicacao_id, (contagem.get(c.publicacao_id) ?? 0) + 1);
      if (usuarioLogado && c.usuario_id === usuarioLogado.id) curtiPorMim.add(c.publicacao_id);
    });

    const formatadas: PublicacaoFeedItem[] = lista.map((p: any) => {
      const perfil = mapaPerfil.get(p.usuario_id);
      return {
        id: p.id,
        usuario_id: p.usuario_id,
        foto_url: p.foto_url,
        descricao: p.descricao,
        criado_em: p.criado_em,
        evento_id: p.evento_id,
        usuario: p.usuario,
        apelido: perfil?.apelido ?? null,
        foto_perfil_url: perfil?.foto_url ?? null,
        total_curtidas: contagem.get(p.id) ?? 0,
        curtido_por_mim: curtiPorMim.has(p.id),
        evento: p.evento ?? null,
      };
    });

    const comFoto = formatadas.filter((item) => item.foto_url);
    setDestaques(comFoto.slice(0, 6));
    setPublicacoes(formatadas);
  }, [usuarioLogado]);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  async function aoAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const publicacoesFiltradas = publicacoes.filter((item) => {
    if (filtroAtivo === "Lançamentos") return !item.evento_id;
    if (filtroAtivo === "Eventos") return !!item.evento_id;
    if (filtroAtivo === "Em Alta") return item.total_curtidas > 0;
    return true;
  });

  return (
    <View className="flex-1 bg-[#0B101E]">

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={publicacoesFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom }}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={aoAtualizar}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View className="w-full max-w-[600px] self-center pt-10">
              {/* Filtros em Pílula (Pill Tabs) */}
              <View className="px-6 mb-6">
                <Text className="text-white font-extrabold text-lg tracking-wide mb-4">Feed da Cena</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {FILTROS_CENA.map((f) => {
                    const ativo = filtroAtivo === f;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setFiltroAtivo(f)}
                        className={`px-5 py-2.5 rounded-2xl border transition-all ${
                          ativo
                            ? "bg-primary border-primary shadow-lg shadow-primary/30"
                            : "bg-[#1A2235] border-white/5 hover:bg-[#222B45]"
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            ativo ? "text-white" : "text-gray-400"
                          }`}
                        >
                          {f}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="w-full max-w-[600px] self-center px-6">
              <View className="bg-[#1A2235] border border-white/5 rounded-[32px] p-10 items-center justify-center my-4">
                <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4 border border-white/10">
                  <Music size={28} color={colors.primary} />
                </View>
                <Text className="text-white font-bold text-center text-lg mb-2">
                  Nenhum resultado
                </Text>
                <Text className="text-gray-400 text-center text-sm px-4">
                  Mude o filtro ou publique novos conteúdos na aba Criar para movimentar a cena.
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View className="w-full max-w-[600px] self-center px-4 mb-5">
              <PublicacaoCard item={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}