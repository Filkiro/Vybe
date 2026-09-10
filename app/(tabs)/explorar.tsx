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
import { Search, Sparkles, Disc, Calendar, Music } from "lucide-react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { PublicacaoCard, PublicacaoFeedItem } from "../../components/PublicacaoCard";
import { colors } from "../../constants/theme";

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
            <View className="pt-4 w-full max-w-[600px] self-center">

              {/* Carrossel Destaques (Spotlight) */}
              {destaques.length > 0 && (
                <View className="mb-6">
                  <View className="px-5 mb-3 flex-row items-center justify-between">
                    <Text className="text-white font-bold text-xs uppercase tracking-wider opacity-70">
                      Em Destaque
                    </Text>
                    <Sparkles size={14} color={colors.primary} />
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  >
                    {destaques.map((item) => {
                      const ehEvento = !!item.evento_id;
                      return (
                        <Pressable
                          key={`spotlight-${item.id}`}
                          className="w-40 h-52 rounded-3xl bg-[#121829] mr-3.5 overflow-hidden relative border border-border/50 active:scale-95 transition-all"
                        >
                          <Image
                            source={{ uri: item.foto_url! }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />

                          <View className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center">
                            {ehEvento ? (
                              <>
                                <Calendar size={10} color="#38BDF8" />
                                <Text className="text-[9px] font-bold text-sky-400 ml-1">Show</Text>
                              </>
                            ) : (
                              <>
                                <Disc size={10} color={colors.primary} />
                                <Text className="text-[9px] font-bold text-primary ml-1">Som</Text>
                              </>
                            )}
                          </View>

                          <View className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0B101E] via-[#0B101E]/80 to-transparent">
                            <Text numberOfLines={1} className="text-white font-bold text-xs">
                              {item.apelido ?? item.usuario?.nome}
                            </Text>
                            <Text numberOfLines={1} className="text-muted text-[10px] mt-0.5">
                              {ehEvento ? item.evento?.nome : item.descricao || "Novo lançamento"}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Filtros em Pílula (Pill Tabs) */}
              <View className="px-5 mb-5 flex-row items-center justify-between">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
                  {FILTROS_CENA.map((f) => {
                    const ativo = filtroAtivo === f;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setFiltroAtivo(f)}
                        className={`mr-2 px-4 py-2 rounded-full border transition-all ${
                          ativo
                            ? "bg-primary border-primary shadow-sm shadow-primary/40"
                            : "bg-[#121829] border-border/60"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            ativo ? "text-white" : "text-muted"
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
            <View className="w-full max-w-[600px] self-center px-4">
              <View className="bg-[#121829] border border-border/60 rounded-3xl p-8 items-center justify-center my-4">
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Music size={22} color={colors.primary} />
                </View>
                <Text className="text-white font-bold text-center text-sm mb-1">
                  Nenhum resultado nesta categoria
                </Text>
                <Text className="text-muted text-center text-xs">
                  Mude o filtro ou publique novos conteúdos na aba Criar.
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View className="w-full max-w-[600px] self-center px-4 mb-4">
              <PublicacaoCard item={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}