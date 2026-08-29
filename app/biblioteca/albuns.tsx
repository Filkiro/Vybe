import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, FlatList, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Disc, Pencil, Trash2 } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { excluirAlbum } from "../../lib/biblioteca";
import { confirmar, avisar } from "../../lib/alertas";
import { colors } from "../../constants/theme";

const LARGURA_IDEAL_CARD = 170;
const MAX_COLUNAS = 6;

// Lista completa dos álbuns do usuário logado — alcançada pelo
// botão "Gerenciar"/"Ver tudo" da seção Álbuns no Perfil (sempre
// visível, mesmo com poucos álbuns). Sempre tem botão de voltar, já
// que essa tela só existe como destino de navegação. Cada card tem
// os botões de editar e excluir sempre visíveis.
export default function TodosAlbuns() {
  const usuario = useAuthStore((s) => s.usuario);
  const [albuns, setAlbuns] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const PADDING_HORIZONTAL = 16;
  const GAP = 12;
  const larguraUtil = width - PADDING_HORIZONTAL * 2;
  const numColunas = Math.min(MAX_COLUNAS, Math.max(2, Math.floor(larguraUtil / LARGURA_IDEAL_CARD)));
  const larguraCard = (larguraUtil - GAP * (numColunas - 1)) / numColunas;

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from("album")
      .select("id, nome, capa_url")
      .eq("usuario_id", usuario.id)
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        setAlbuns(data ?? []);
        setCarregando(false);
      });
  }, [usuario?.id]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/perfil");
  }

  async function confirmarExclusao(item: any) {
    const ok = await confirmar(
      "Excluir álbum",
      `Tem certeza que quer excluir "${item.nome}"? As músicas não serão apagadas, só saem do álbum. Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (!ok) return;

    setExcluindoId(item.id);
    try {
      await excluirAlbum(item);
      setAlbuns((atual) => atual.filter((a) => a.id !== item.id));
    } catch (e: any) {
      avisar("Erro ao excluir", e.message ?? "Não foi possível excluir o álbum.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <Pressable
          onPress={voltar}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          className="bg-card rounded-full p-2 mr-3"
        >
          <ChevronLeft color={colors.textDark} size={22} />
        </Pressable>
        <Text className="text-xl font-bold text-textDark">Seus álbuns</Text>
      </View>

      {carregando ? (
        <Text className="text-muted text-center mt-4">Carregando...</Text>
      ) : (
        <FlatList
          data={albuns}
          keyExtractor={(item) => item.id}
          key={numColunas}
          numColumns={numColunas}
          contentContainerStyle={{ paddingHorizontal: PADDING_HORIZONTAL, paddingBottom: 140 }}
          columnWrapperStyle={{ gap: GAP }}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8">Nenhum álbum criado ainda.</Text>
          }
          renderItem={({ item }) => (
            <View style={{ width: larguraCard }} className="bg-card rounded-2xl p-3 mb-4">
              <Pressable onPress={() => router.push(`/album/${item.id}`)}>
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2" />
                ) : (
                  <View className="w-full aspect-square rounded-xl bg-surface mb-2 items-center justify-center">
                    <Disc color={colors.muted} size={28} />
                  </View>
                )}
              </Pressable>

              <Text numberOfLines={1} className="font-bold text-textDark mb-2">
                {item.nome}
              </Text>

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => router.push(`/album/editar/${item.id}`)}
                  className="flex-1 flex-row items-center justify-center bg-surface rounded-xl py-2"
                >
                  <Pencil color={colors.textDark} size={14} />
                  <Text className="text-textDark text-xs font-medium ml-1">Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmarExclusao(item)}
                  disabled={excluindoId === item.id}
                  className="flex-1 flex-row items-center justify-center bg-red-500/10 rounded-xl py-2"
                  style={{ opacity: excluindoId === item.id ? 0.6 : 1 }}
                >
                  <Trash2 color={colors.danger} size={14} />
                  <Text className="text-red-400 text-xs font-medium ml-1">
                    {excluindoId === item.id ? "..." : "Excluir"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
