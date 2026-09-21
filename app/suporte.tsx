import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

type Chamado = {
  id: string;
  assunto: string;
  descricao: string | null;
  status: string;
  criado_em: string;
};

const CORES_STATUS: Record<string, string> = {
  aberto: colors.warning,
  em_andamento: colors.primary,
  resolvido: colors.success,
};

export default function Suporte() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (usuario) carregar();
  }, [usuario?.id]);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    const { data } = await supabase
      .from("suporte")
      .select("id, assunto, descricao, status, criado_em")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false });
    setChamados(data ?? []);
    setCarregando(false);
  }

  async function abrirChamado() {
    if (!usuario) return;
    setErro(null);
    setSucesso(false);
    if (!assunto.trim()) {
      setErro("Escreva um assunto para o chamado.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("suporte").insert({
      usuario_id: usuario.id,
      assunto,
      descricao: descricao || null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setAssunto("");
    setDescricao("");
    setSucesso(true);
    setMostrarForm(false);
    carregar();
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">Entre na sua conta para abrir um chamado de suporte.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 bg-card border-b border-border">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={12} className="mr-2 p-1">
            <ChevronLeft color={colors.textDark} size={24} />
          </Pressable>
          <Text className="text-2xl font-bold text-textDark">Suporte</Text>
        </View>
        <Pressable onPress={() => setMostrarForm((v) => !v)} className="bg-primary rounded-full px-4 py-2">
          <Text className="text-white font-semibold text-sm">{mostrarForm ? "Cancelar" : "Novo chamado"}</Text>
        </Pressable>
      </View>

      {sucesso && !mostrarForm && (
        <Text className="text-green-600 text-center mt-2">Chamado aberto! Nossa equipe vai te responder por aqui.</Text>
      )}

      {mostrarForm && (
        <View className="px-4 mt-3">
          <TextInput
            placeholder="Assunto"
            placeholderTextColor="#9CA3AF"
            value={assunto}
            onChangeText={setAssunto}
            className="border border-border rounded-2xl px-4 py-3 mb-3 text-textDark"
          />
          <TextInput
            placeholder="Descreva o problema ou dúvida"
            placeholderTextColor="#9CA3AF"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={4}
            className="border border-border rounded-2xl px-4 py-3 mb-3 text-textDark"
            style={{ minHeight: 90, textAlignVertical: "top" }}
          />
          {erro && <Text className="text-red-500 mb-3 text-center">{erro}</Text>}
          <Pressable onPress={abrirChamado} disabled={enviando} className="bg-primary rounded-full py-3 items-center mb-4">
            {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Enviar chamado</Text>}
          </Pressable>
        </View>
      )}

      <Text className="text-textDark font-bold px-4 mt-2 mb-2">Meus chamados</Text>

      {carregando ? (
        <Text className="text-muted text-center mt-4">Carregando...</Text>
      ) : (
        <FlatList
          data={chamados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text className="text-muted text-center mt-4">Você ainda não abriu nenhum chamado.</Text>}
          renderItem={({ item }) => (
            <View className="bg-card rounded-2xl p-3 mb-3 border border-border">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-textDark font-bold flex-1 mr-2" numberOfLines={1}>{item.assunto}</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: (CORES_STATUS[item.status] ?? colors.muted) + "33" }}>
                  <Text className="text-xs font-medium" style={{ color: CORES_STATUS[item.status] ?? colors.muted }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              {item.descricao && <Text className="text-muted text-sm">{item.descricao}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
