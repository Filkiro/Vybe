import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image, useWindowDimensions, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

type MusicaComAutor = {
  id: string;
  nome: string;
  autor_apelido: string | null;
  arquivo_url: string;
  capa_url: string | null;
};

type AlbumDestaque = {
  id: string;
  nome: string;
  capa_url: string | null;
  autor_apelido: string | null;
};

const LARGURA_IDEAL_CARD = 170;
const MAX_COLUNAS = 6;
const LIMITE_ALBUNS_HOME = 6;

export default function Home() {
  const [musicas, setMusicas] = useState<MusicaComAutor[]>([]);
  const [albuns, setAlbuns] = useState<AlbumDestaque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const paddingBottom = usePlayerAwarePadding(140);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const { width } = useWindowDimensions();

  const PADDING_HORIZONTAL = 12;
  const GAP = 12;
  const larguraUtil = width - PADDING_HORIZONTAL * 2;
  const numColunas = Math.min(
    MAX_COLUNAS,
    Math.max(2, Math.floor(larguraUtil / LARGURA_IDEAL_CARD))
  );
  const larguraCard = (larguraUtil - GAP * (numColunas - 1)) / numColunas;

  const carregarDados = useCallback(async () => {
    const [{ data: dadosMusicas }, { data: dadosAlbuns }] = await Promise.all([
      supabase
        .from("musica_com_autor")
        .select("*")
        .eq("status", "ativo")
        .order("data_lancamento", { ascending: false }),
      supabase
        .from("album")
        .select("id, nome, capa_url, usuario_id")
        .eq("status", "ativo")
        .order("criado_em", { ascending: false })
        .limit(LIMITE_ALBUNS_HOME),
    ]);

    setMusicas(dadosMusicas ?? []);

    const listaAlbuns = dadosAlbuns ?? [];
    if (listaAlbuns.length > 0) {
      const idsAutores = [...new Set(listaAlbuns.map((a) => a.usuario_id))];
      const { data: perfis } = await supabase
        .from("perfil_musico")
        .select("usuario_id, apelido")
        .in("usuario_id", idsAutores);

      const apelidoPorUsuario = new Map((perfis ?? []).map((p) => [p.usuario_id, p.apelido]));
      setAlbuns(
        listaAlbuns.map((a) => ({
          id: a.id,
          nome: a.nome,
          capa_url: a.capa_url,
          autor_apelido: apelidoPorUsuario.get(a.usuario_id) ?? null,
        }))
      );
    } else {
      setAlbuns([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      const iniciar = async () => {
        setCarregando(true);
        await carregarDados();
        if (ativo) setCarregando(false);
      };
      iniciar();
      return () => {
        ativo = false;
      };
    }, [carregarDados])
  );

  async function aoAtualizar() {
    setAtualizando(true);
    await carregarDados();
    setAtualizando(false);
  }

  return (
    <View className="flex-1 bg-bg-dark">
      {carregando ? (
        <Text className="text-muted text-center mt-4">Carregando...</Text>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={musicas}
          keyExtractor={(item) => item.id}
          key={numColunas}
          numColumns={numColunas}
          contentContainerStyle={{ paddingHorizontal: PADDING_HORIZONTAL, paddingBottom }}
          columnWrapperStyle={{ gap: GAP }}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#8B95A8" />
          }
          ListHeaderComponent={
            <>
              <SecaoAlbuns albuns={albuns} />
              <Text className="text-2xl font-bold px-1 pt-2 pb-4 text-textDark tracking-wide">
                Lançamentos
              </Text>
            </>
          }
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8 px-4">Nenhuma música publicada ainda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                requireAuth(() => {
                  const fila = musicas.map((m) => ({
                    id: m.id,
                    nome: m.nome,
                    autorApelido: m.autor_apelido,
                    arquivoUrl: m.arquivo_url,
                    capaUrl: m.capa_url,
                  }));
                  tocarMusica(
                    {
                      id: item.id,
                      nome: item.nome,
                      autorApelido: item.autor_apelido,
                      arquivoUrl: item.arquivo_url,
                      capaUrl: item.capa_url,
                    },
                    fila
                  );
                  router.push("/tocando");
                });
              }}
              style={{ width: larguraCard }}
              className="mb-4"
            >
              <View 
                className="bg-card rounded-3xl p-3 border border-border overflow-hidden"
              >
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-2xl mb-3" />
                ) : (
                  <View className="w-full aspect-square rounded-2xl bg-surface mb-3" />
                )}

                <Text numberOfLines={1} className="font-bold text-textDark text-base">
                  {item.nome}
                </Text>
                <Text numberOfLines={1} className="text-primaryLight text-xs font-medium mt-1">
                  {item.autor_apelido ?? "Autor desconhecido"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function SecaoAlbuns({ albuns }: { albuns: AlbumDestaque[] }) {
  if (albuns.length === 0) return null;

  return (
    <View className="pt-6 pb-2">
      <Text className="text-2xl font-bold px-1 pb-4 text-textDark tracking-wide">Álbuns</Text>
      <FlatList
        data={albuns.slice(0, LIMITE_ALBUNS_HOME)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 12 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/album/${item.id}`)} style={{ width: 140 }}>
            <View 
              className="bg-card rounded-3xl p-3 border border-border overflow-hidden"
            >
              {item.capa_url ? (
                <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-2xl mb-3" />
              ) : (
                <View className="w-full aspect-square rounded-2xl bg-surface mb-3" />
              )}
              <Text numberOfLines={1} className="font-bold text-textDark text-sm">
                {item.nome}
              </Text>
              <Text numberOfLines={1} className="text-primaryLight text-xs font-medium mt-1">
                {item.autor_apelido ?? "Autor desconhecido"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}