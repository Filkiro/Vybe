import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, FlatList, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Trash2, Clock, Calendar, Play } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { excluirMusica } from "../../lib/biblioteca";
import { confirmar, avisar } from "../../lib/alertas";
import { colors } from "../../constants/theme";

export default function TodasMusicas() {
  const usuario = useAuthStore((s) => s.usuario);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const [musicas, setMusicas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [aba, setAba] = useState<"todas" | "ativas" | "rascunhos">("todas");

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from("musica")
      .select("id, nome, capa_url, arquivo_url, status, data_lancamento")
      .eq("usuario_id", usuario.id)
      .order("data_lancamento", { ascending: false })
      .then(({ data }) => {
        setMusicas(data ?? []);
        setCarregando(false);
      });
  }, [usuario?.id]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/perfil");
  }

  async function confirmarExclusao(item: any) {
    const ok = await confirmar(
      "Excluir música",
      `Tem certeza que quer excluir "${item.nome}"? Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (!ok) return;

    setExcluindoId(item.id);
    try {
      await excluirMusica(item);
      setMusicas((atual) => atual.filter((m) => m.id !== item.id));
    } catch (e: any) {
      avisar("Erro ao excluir", e.message ?? "Não foi possível excluir a música.");
    } finally {
      setExcluindoId(null);
    }
  }

  const musicasAtivas = musicas.filter((m) => m.status === "ativo");
  const musicasRascunho = musicas.filter((m) => m.status === "rascunho");

  const musicasFiltradas = musicas.filter((m) => {
    if (aba === "todas") return true;
    if (aba === "ativas") return m.status === "ativo";
    if (aba === "rascunhos") return m.status === "rascunho";
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
              <Text className="text-[26px] font-bold text-[#dfe2ee] tracking-tight">Suas músicas</Text>
              <View className="px-2 py-0.5 rounded-full bg-[#262a33]">
                <Text className="text-[#b4c5ff] text-[12px] font-medium">{musicas.length} faixas</Text>
              </View>
            </View>
            <Text className="text-[12px] text-[#c3c6d7] mt-0.5">Gerencie seus lançamentos, métricas de streaming e disponibilidade pública</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-[#181c24] rounded-lg p-1">
          <Pressable
            onPress={() => setAba("todas")}
            className={`px-4 py-1.5 rounded-md ${aba === "todas" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "todas" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Todas ({musicas.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setAba("ativas")}
            className={`px-4 py-1.5 rounded-md ${aba === "ativas" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "ativas" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Ativas ({musicasAtivas.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setAba("rascunhos")}
            className={`px-4 py-1.5 rounded-md ${aba === "rascunhos" ? "bg-[#2563eb] shadow-md" : ""}`}
          >
            <Text className={`text-[13px] font-medium ${aba === "rascunhos" ? "text-[#eeefff]" : "text-[#c3c6d7]"}`}>Rascunhos ({musicasRascunho.length})</Text>
          </Pressable>
        </View>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={musicasFiltradas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 16 }}
          ListEmptyComponent={
            <Text className="text-[#8d90a0] text-center mt-8 text-sm">Nenhuma música encontrada nesta categoria.</Text>
          }
          renderItem={({ item }) => {
            const isAtivo = item.status === "ativo";
            const dataLancamento = item.data_lancamento 
              ? new Date(item.data_lancamento).toLocaleDateString('pt-BR') 
              : "Data não definida";

            return (
              <View className="flex-col md:flex-row items-start md:items-center justify-between gap-6 p-4 rounded-xl bg-[#181c24] border border-[#31353e] shadow-sm">
                
                <View className="flex-row items-center gap-4 flex-1 w-full">
                  {/* Album Cover */}
                  <Pressable
                    className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#0a0e16]"
                    onPress={() => {
                      const fila = musicasFiltradas.map((m) => ({
                        id: m.id,
                        nome: m.nome,
                        autorApelido: null,
                        arquivoUrl: m.arquivo_url,
                        capaUrl: m.capa_url,
                      }));
                      tocarMusica(
                        { id: item.id, nome: item.nome, autorApelido: null, arquivoUrl: item.arquivo_url, capaUrl: item.capa_url },
                        fila
                      );
                      router.push("/tocando");
                    }}
                  >
                    {item.capa_url ? (
                      <Image source={{ uri: item.capa_url }} className="w-full h-full object-cover" />
                    ) : (
                      <View className="w-full h-full bg-[#1c2028]" />
                    )}
                    <View className="absolute inset-0 bg-black/20" />
                    <View className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#2563eb] items-center justify-center opacity-80">
                      <Play color="white" size={14} fill="white" />
                    </View>
                  </Pressable>

                  {/* Metadata */}
                  <View className="flex-col flex-1 gap-1">
                    <View className="flex-row items-center gap-2 flex-wrap mb-1">
                      <View className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#262a33]">
                        <View className={`w-1.5 h-1.5 rounded-full ${isAtivo ? "bg-emerald-400" : "bg-gray-400"}`} />
                        <Text className="text-[11px] font-semibold text-[#b4c5ff] capitalize">{item.status}</Text>
                      </View>
                      <View className="px-2 py-0.5 rounded bg-[#31353e]">
                        <Text className="text-[11px] font-medium text-[#c3c6d7]">Música</Text>
                      </View>
                    </View>

                    <Text numberOfLines={1} className="text-lg font-semibold text-[#dfe2ee] tracking-tight">
                      {item.nome}
                    </Text>

                    <View className="flex-row items-center gap-3 text-[#c3c6d7] mt-1 flex-wrap">
                      <View className="flex-row items-center gap-1">
                        <Clock color="#8d90a0" size={14} />
                        <Text className="text-[#8d90a0] text-[12px] font-medium">03:45</Text>
                      </View>
                      <Text className="text-[#8d90a0] text-[10px]">●</Text>
                      <View className="flex-row items-center gap-1">
                        <Calendar color="#8d90a0" size={14} />
                        <Text className="text-[#8d90a0] text-[12px]">Lançada em {dataLancamento}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center justify-end gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <Pressable
                    onPress={() => router.push(`/musica/editar/${item.id}`)}
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
