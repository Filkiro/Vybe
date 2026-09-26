import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, FlatList, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Trash2, Calendar, Disc } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { excluirAlbum } from "../../lib/biblioteca";
import { confirmar, avisar } from "../../lib/alertas";

export default function TodosAlbuns() {
  const usuario = useAuthStore((s) => s.usuario);
  const [albuns, setAlbuns] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [aba, setAba] = useState<"todos" | "ativos" | "rascunhos">("todos");

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from("album")
      .select("id, nome, capa_url, status, criado_em")
      .eq("usuario_id", usuario.id)
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
      `Tem certeza que quer excluir o álbum "${item.nome}"? As músicas dele não serão excluídas, mas ficarão sem álbum.`,
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

  const albunsAtivos = albuns.filter((a) => a.status === "ativo");
  const albunsRascunho = albuns.filter((a) => a.status === "rascunho");

  const albunsFiltrados = albuns.filter((a) => {
    if (aba === "todos") return true;
    if (aba === "ativos") return a.status === "ativo";
    if (aba === "rascunhos") return a.status === "rascunho";
    return true;
  });

  return (
    <View className="flex-1 bg-[#0a0e16]">
      {/* Top Bar Navigation & Actions */}
      <View className="px-4 sm:px-6 py-6 pt-14 flex-col md:flex-row md:items-center justify-between gap-6">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={voltar}
            className="w-10 h-10 rounded-full bg-[#1c2028] flex items-center justify-center border border-white/5 shadow-md active:bg-[#262a33]"
          >
            <ChevronLeft color="#dfe2ee" size={24} />
          </Pressable>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-[26px] font-bold text-[#dfe2ee] tracking-tight">Seus álbuns</Text>
              <View className="px-2 py-0.5 rounded-full bg-[#262a33]">
                <Text className="text-[#b4c5ff] text-[12px] font-medium">{albuns.length} álbuns</Text>
              </View>
            </View>
            <Text className="text-[12px] text-[#c3c6d7] mt-0.5">Gerencie seus projetos maiores, EPs e discografia</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-[#181c24] rounded-lg p-1">
          <Pressable
            onPress={() => setAba("todos")}
            className={`px-4 py-1.5 rounded-md ${aba === "todos" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "todos" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Todos ({albuns.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setAba("ativos")}
            className={`px-4 py-1.5 rounded-md ${aba === "ativos" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "ativos" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Ativos ({albunsAtivos.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setAba("rascunhos")}
            className={`px-4 py-1.5 rounded-md ${aba === "rascunhos" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "rascunhos" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Rascunhos ({albunsRascunho.length})</Text>
          </Pressable>
        </View>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={albunsFiltrados}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 16 }}
          ListEmptyComponent={
            <Text className="text-[#8d90a0] text-center mt-8 text-sm">Nenhum álbum encontrado nesta categoria.</Text>
          }
          renderItem={({ item }) => {
            const isAtivo = item.status === "ativo";
            const dataCriacao = item.criado_em 
              ? new Date(item.criado_em).toLocaleDateString('pt-BR') 
              : "Data não definida";

            return (
              <View className="flex-col md:flex-row items-start md:items-center justify-between gap-6 p-4 rounded-xl bg-[#181c24] border border-[#31353e] shadow-sm">
                
                <View className="flex-row items-center gap-4 flex-1 w-full">
                  {/* Album Cover */}
                  <View className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#0a0e16] border border-[#31353e] items-center justify-center">
                    {item.capa_url ? (
                      <Image source={{ uri: item.capa_url }} className="w-full h-full object-cover" />
                    ) : (
                      <Disc color="#8d90a0" size={32} />
                    )}
                  </View>

                  {/* Metadata */}
                  <View className="flex-col flex-1 gap-1">
                    <View className="flex-row items-center gap-2 flex-wrap mb-1">
                      <View className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#262a33]">
                        <View className={`w-1.5 h-1.5 rounded-full ${isAtivo ? "bg-emerald-400" : "bg-gray-400"}`} />
                        <Text className="text-[11px] font-semibold text-[#b4c5ff] capitalize">{item.status || "Ativo"}</Text>
                      </View>
                      <View className="px-2 py-0.5 rounded bg-[#31353e]">
                        <Text className="text-[11px] font-medium text-[#c3c6d7]">Álbum / EP</Text>
                      </View>
                    </View>

                    <Text numberOfLines={1} className="text-lg font-semibold text-[#dfe2ee] tracking-tight">
                      {item.nome}
                    </Text>

                    <View className="flex-row items-center gap-3 text-[#c3c6d7] mt-1 flex-wrap">
                      <View className="flex-row items-center gap-1">
                        <Calendar color="#8d90a0" size={14} />
                        <Text className="text-[#8d90a0] text-[12px]">Criado em {dataCriacao}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center justify-end gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <Pressable
                    onPress={() => router.push(`/album/editar/${item.id}`)}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg bg-[#262a33] active:bg-[#31353e] border border-white/5"
                  >
                    <Pencil color="#dfe2ee" size={16} />
                    <Text className="text-[#dfe2ee] text-[13px] font-medium">Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmarExclusao(item)}
                    disabled={excluindoId === item.id}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg bg-[#262a33] active:bg-red-500/20 border border-white/5"
                    style={{ opacity: excluindoId === item.id ? 0.6 : 1 }}
                  >
                    <Trash2 color={excluindoId === item.id ? "#8d90a0" : "#dfe2ee"} size={16} />
                    <Text className={`text-[13px] font-medium ${excluindoId === item.id ? "text-[#8d90a0]" : "text-[#dfe2ee]"}`}>
                      {excluindoId === item.id ? "..." : "Excluir"}
                    </Text>
                  </Pressable>
                </View>

              </View>
            );
          }}
        />
      )}
    </View>
  );
}
