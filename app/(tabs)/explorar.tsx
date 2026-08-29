import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { PublicacaoCard, PublicacaoFeedItem } from "../../components/PublicacaoCard";

// Explorar agora é só o feed de publicações — divulgação de evento
// (organizador) ou de álbum/música (músico). Busca por apelido,
// música e álbum foi pra aba Pesquisa (ícone na topbar).
export default function Explorar() {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<PublicacaoFeedItem[]>([]);
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
      return;
    }

    const idsUsuarios = Array.from(new Set(lista.map((p: any) => p.usuario_id)));
    const idsPublicacoes = lista.map((p: any) => p.id);

    const [{ data: perfis }, { data: curtidas }] = await Promise.all([
      supabase.from("perfil_musico").select("usuario_id, apelido, foto_url").in("usuario_id", idsUsuarios),
      supabase.from("curtida").select("publicacao_id, usuario_id").in("publicacao_id", idsPublicacoes),
    ]);

    // Organizador não tem apelido/foto em perfil_musico — cai no
    // nome da tabela usuario mesmo (já vem no select acima).
    const mapaPerfil = new Map((perfis ?? []).map((p: any) => [p.usuario_id, p]));

    const contagem = new Map<string, number>();
    const curtiPorMim = new Set<string>();
    (curtidas ?? []).forEach((c: any) => {
      contagem.set(c.publicacao_id, (contagem.get(c.publicacao_id) ?? 0) + 1);
      if (usuarioLogado && c.usuario_id === usuarioLogado.id) curtiPorMim.add(c.publicacao_id);
    });

    setPublicacoes(
      lista.map((p: any) => {
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
      })
    );
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

  return (
    <View className="flex-1 bg-background">
      <Text className="text-2xl font-bold px-4 pt-6 pb-4 text-textDark">Explorar</Text>

      {carregando ? (
        <Text className="text-muted text-center mt-8">Carregando...</Text>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={publicacoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom }}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#8B95A8" />}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8">
              Nenhuma publicação ainda. Divulgue seu álbum, música ou evento na aba Criar!
            </Text>
          }
          renderItem={({ item }) => (
            <View className="w-full self-center" style={{ maxWidth: 600, maxHeight: 650 }}>
              <PublicacaoCard item={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}