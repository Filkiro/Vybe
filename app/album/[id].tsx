import { useCallback, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ChevronLeft, Plus, Check, Disc, Pencil } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { colors } from "../../constants/theme";

type FaixaAlbum = {
  id: string;
  nome: string;
  capa_url: string | null;
  arquivo_url: string;
};

// Tela pública de um álbum — qualquer pessoa (logada ou não) pode
// abrir e ver as faixas; tocar uma faixa exige conta (ver
// requireAuth). Se quem está vendo é o dono do álbum, aparece
// também a seção "Adicionar músicas", que deixa incluir mais
// faixas depois de já ter criado o álbum.
export default function AlbumDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();

  const [carregando, setCarregando] = useState(true);
  const [album, setAlbum] = useState<any>(null);
  const [autorNome, setAutorNome] = useState<string | null>(null);
  const [faixas, setFaixas] = useState<FaixaAlbum[]>([]);
  const [minhasForaDoAlbum, setMinhasForaDoAlbum] = useState<FaixaAlbum[]>([]);
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [adicionando, setAdicionando] = useState(false);

  const souDono = !!usuarioLogado && !!album && usuarioLogado.id === album.usuario_id;

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);

    const { data: dadosAlbum } = await supabase.from("album").select("*").eq("id", id).single();
    setAlbum(dadosAlbum ?? null);

    if (dadosAlbum) {
      const [{ data: perfilAutor }, { data: itensAlbum }] = await Promise.all([
        supabase.from("perfil_musico").select("apelido").eq("usuario_id", dadosAlbum.usuario_id).single(),
        supabase
          .from("album_musica")
          .select("musica:musica_id(id, nome, capa_url, arquivo_url, status)")
          .eq("album_id", id),
      ]);

      setAutorNome(perfilAutor?.apelido ?? null);

      const listaFaixas: FaixaAlbum[] = (itensAlbum ?? [])
        .map((item: any) => item.musica)
        .filter((m: any) => m && m.status === "ativo");
      setFaixas(listaFaixas);

      // Só busca "músicas de fora" quando quem está vendo é o dono —
      // ninguém mais precisa dessa lista.
      if (usuarioLogado?.id === dadosAlbum.usuario_id) {
        const idsNoAlbum = listaFaixas.map((m) => m.id);
        let query = supabase
          .from("musica")
          .select("id, nome, capa_url, arquivo_url")
          .eq("usuario_id", dadosAlbum.usuario_id)
          .eq("status", "ativo");
        if (idsNoAlbum.length > 0) {
          query = query.not("id", "in", `(${idsNoAlbum.join(",")})`);
        }
        const { data: fora } = await query;
        setMinhasForaDoAlbum(fora ?? []);
      } else {
        setMinhasForaDoAlbum([]);
      }
    }

    setCarregando(false);
  }, [id, usuarioLogado?.id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function tocarFaixa(item: FaixaAlbum) {
    requireAuth(() => {
      const fila = faixas.map((f) => ({
        id: f.id,
        nome: f.nome,
        autorApelido: autorNome,
        arquivoUrl: f.arquivo_url,
        capaUrl: f.capa_url,
      }));
      tocarMusica(
        { id: item.id, nome: item.nome, autorApelido: autorNome, arquivoUrl: item.arquivo_url, capaUrl: item.capa_url },
        fila
      );
      router.push("/tocando");
    });
  }

  function alternarSelecao(idMusica: string) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(idMusica)) nova.delete(idMusica);
      else nova.add(idMusica);
      return nova;
    });
  }

  async function adicionarSelecionadas() {
    if (selecionadas.size === 0 || !album) return;
    setAdicionando(true);
    const { error } = await supabase
      .from("album_musica")
      .insert(Array.from(selecionadas).map((musica_id) => ({ album_id: album.id, musica_id })));
    setAdicionando(false);
    if (error) return;

    setSelecionadas(new Set());
    setMostrarAdicionar(false);
    carregar();
  }

  if (carregando || !album) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Carregando álbum...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 140 }}>
      <View style={{ height: 120, backgroundColor: colors.primary }} className="rounded-b-[32px]" />

      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
        className="absolute top-14 left-4 bg-card/90 rounded-full p-2"
      >
        <ChevronLeft color={colors.textDark} size={22} />
      </Pressable>

      {souDono && (
        <Pressable
          onPress={() => router.push(`/album/editar/${album.id}`)}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          className="absolute top-14 right-4 bg-card/90 rounded-full p-2"
        >
          <Pencil color={colors.textDark} size={20} />
        </Pressable>
      )}

      <View className="items-center px-6" style={{ marginTop: -48 }}>
        {album.capa_url ? (
          <Image
            source={{ uri: album.capa_url }}
            style={{ width: 128, height: 128, borderRadius: 24, borderWidth: 4, borderColor: colors.background }}
          />
        ) : (
          <View
            className="rounded-3xl items-center justify-center bg-surface"
            style={{ width: 128, height: 128, borderWidth: 4, borderColor: colors.background }}
          >
            <Disc color={colors.muted} size={40} />
          </View>
        )}

        <Text className="text-xl font-bold text-textDark mt-3 text-center">{album.nome}</Text>
        {autorNome && <Text className="text-muted mt-1">@{autorNome}</Text>}
        <Text className="text-muted text-xs mt-1">
          {faixas.length} {faixas.length === 1 ? "música" : "músicas"}
        </Text>
      </View>

      <View className="px-4 mt-6">
        {faixas.length === 0 ? (
          <Text className="text-muted text-center mt-4">Este álbum ainda não tem músicas.</Text>
        ) : (
          faixas.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => tocarFaixa(item)}
              className="flex-row items-center bg-card rounded-2xl p-3 mb-2"
            >
              {item.capa_url ? (
                <Image source={{ uri: item.capa_url }} style={{ width: 48, height: 48 }} className="rounded-xl mr-3" />
              ) : (
                <View style={{ width: 48, height: 48 }} className="rounded-xl bg-surface mr-3" />
              )}
              <Text numberOfLines={1} className="text-textDark font-medium flex-1">
                {item.nome}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {souDono && (
        <View className="px-4 mt-6">
          {!mostrarAdicionar ? (
            <Pressable
              onPress={() => setMostrarAdicionar(true)}
              className="flex-row items-center justify-center border border-dashed border-border rounded-2xl py-4"
            >
              <Plus color={colors.primary} size={18} />
              <Text className="text-primary font-medium ml-2">Adicionar músicas ao álbum</Text>
            </Pressable>
          ) : (
            <View className="bg-card border border-border rounded-2xl p-4">
              <Text className="text-textDark font-bold mb-3">Suas músicas fora deste álbum</Text>

              {minhasForaDoAlbum.length === 0 ? (
                <Text className="text-muted text-center py-4">
                  Todas as suas músicas já estão neste álbum, ou você ainda não publicou nenhuma outra.
                </Text>
              ) : (
                minhasForaDoAlbum.map((item) => {
                  const marcada = selecionadas.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => alternarSelecao(item.id)}
                      className="flex-row items-center py-2 border-b border-border"
                    >
                      {item.capa_url ? (
                        <Image source={{ uri: item.capa_url }} style={{ width: 40, height: 40 }} className="rounded-lg mr-3" />
                      ) : (
                        <View style={{ width: 40, height: 40 }} className="rounded-lg bg-surface mr-3" />
                      )}
                      <Text numberOfLines={1} className="text-textDark flex-1">
                        {item.nome}
                      </Text>
                      <View
                        className="items-center justify-center rounded-md"
                        style={{
                          width: 22,
                          height: 22,
                          borderWidth: marcada ? 0 : 1,
                          borderColor: colors.border,
                          backgroundColor: marcada ? colors.primary : "transparent",
                        }}
                      >
                        {marcada && <Check color="#fff" size={14} />}
                      </View>
                    </Pressable>
                  );
                })
              )}

              <View className="flex-row gap-2 mt-4">
                <Pressable
                  onPress={() => {
                    setMostrarAdicionar(false);
                    setSelecionadas(new Set());
                  }}
                  className="flex-1 border border-border rounded-full py-3 items-center"
                >
                  <Text className="text-muted font-medium">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={adicionarSelecionadas}
                  disabled={selecionadas.size === 0 || adicionando}
                  className="flex-1 bg-primary rounded-full py-3 items-center"
                  style={{ opacity: selecionadas.size === 0 || adicionando ? 0.6 : 1 }}
                >
                  {adicionando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">Adicionar ({selecionadas.size})</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
