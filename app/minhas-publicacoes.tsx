import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Trash2, X, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { enviarArquivoParaStorage } from "../lib/upload";
import { useAuthStore } from "../store/authStore";
import { confirmar, avisar } from "../lib/alertas";
import { colors } from "../constants/theme";

type Publicacao = {
  id: string;
  foto_url: string | null;
  descricao: string | null;
  criado_em: string;
  evento_id: string | null;
  evento?: { nome: string } | null;
};

// Tela de gerenciamento das próprias publicações (acessada pelo
// Perfil): editar foto/descrição ou apagar. O evento vinculado (pro
// organizador) não pode ser trocado aqui — só a foto e o texto.
export default function MinhasPublicacoes() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricaoEdicao, setDescricaoEdicao] = useState("");
  const [fotoEdicaoUri, setFotoEdicaoUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [apagandoId, setApagandoId] = useState<string | null>(null);

  useEffect(() => {
    if (usuario) carregar();
  }, [usuario?.id]);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    const { data } = await supabase
      .from("publicacao")
      .select("id, foto_url, descricao, criado_em, evento_id, evento:evento_id(nome)")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false });
    setPublicacoes((data as any) ?? []);
    setCarregando(false);
  }

  function iniciarEdicao(item: Publicacao) {
    setEditandoId(item.id);
    setDescricaoEdicao(item.descricao ?? "");
    setFotoEdicaoUri(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setDescricaoEdicao("");
    setFotoEdicaoUri(null);
  }

  async function escolherNovaFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      avisar("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setFotoEdicaoUri(resultado.assets[0].uri);
  }

  async function salvarEdicao(item: Publicacao) {
    if (!usuario) return;
    setSalvando(true);
    try {
      let fotoUrl = item.foto_url;
      if (fotoEdicaoUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: fotoEdicaoUri,
          nomeArquivo: `${usuario.id}-post-${item.id}-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase
        .from("publicacao")
        .update({ descricao: descricaoEdicao || null, foto_url: fotoUrl })
        .eq("id", item.id);
      if (error) throw error;

      setPublicacoes((atual) =>
        atual.map((p) => (p.id === item.id ? { ...p, descricao: descricaoEdicao || null, foto_url: fotoUrl } : p))
      );
      cancelarEdicao();
    } catch (e: any) {
      avisar("Erro ao salvar", e.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(item: Publicacao) {
    const ok = await confirmar("Apagar publicação?", "Essa ação não pode ser desfeita.", "Apagar");
    if (!ok) return;

    setApagandoId(item.id);
    const { error } = await supabase.from("publicacao").delete().eq("id", item.id);
    setApagandoId(null);
    if (error) {
      avisar("Erro ao apagar", error.message);
      return;
    }
    setPublicacoes((atual) => atual.filter((p) => p.id !== item.id));
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">Entre na sua conta para gerenciar suas publicações.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pt-14 pb-3 bg-card border-b border-border">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-2 p-1">
          <ChevronLeft color={colors.textDark} size={24} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Minhas publicações</Text>
      </View>

      {carregando ? (
        <Text className="text-muted text-center mt-8">Carregando...</Text>
      ) : (
        <FlatList
          data={publicacoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8">
              Você ainda não tem publicações. Crie uma na aba Criar.
            </Text>
          }
          renderItem={({ item }) => {
            const emEdicao = editandoId === item.id;
            return (
              <View className="bg-card rounded-2xl mb-4 border border-border overflow-hidden self-center w-full max-w-[700px]">
                {item.evento && (
                  <View className="px-3 pt-3">
                    <Text className="text-primary text-xs font-bold">Evento: {item.evento.nome}</Text>
                  </View>
                )}

                {emEdicao ? (
                  <View className="p-3">
                    <Pressable
                      onPress={escolherNovaFoto}
                      className="self-center w-28 h-28 rounded-xl bg-surface items-center justify-center mb-3 overflow-hidden"
                    >
                      {(fotoEdicaoUri ?? item.foto_url) ? (
                        <Image source={{ uri: fotoEdicaoUri ?? item.foto_url! }} className="w-full h-full" />
                      ) : (
                        <Text className="text-muted text-xs text-center px-2">Toque para trocar a foto</Text>
                      )}
                    </Pressable>

                    <TextInput
                      value={descricaoEdicao}
                      onChangeText={setDescricaoEdicao}
                      placeholder="Descrição"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      className="border border-border rounded-2xl px-4 py-3 mb-3 text-textDark"
                    />

                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => salvarEdicao(item)}
                        disabled={salvando}
                        className="flex-1 bg-primary rounded-full py-3 items-center flex-row justify-center gap-1"
                      >
                        {salvando ? <ActivityIndicator color="#fff" /> : <><Check color="#fff" size={16} /><Text className="text-white font-bold">Salvar</Text></>}
                      </Pressable>
                      <Pressable
                        onPress={cancelarEdicao}
                        disabled={salvando}
                        className="flex-1 bg-surface rounded-full py-3 items-center flex-row justify-center gap-1 border border-border"
                      >
                        <X color={colors.textDark} size={16} />
                        <Text className="text-textDark font-bold">Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    {item.descricao && <Text className="text-textDark px-3 pt-3 pb-2">{item.descricao}</Text>}
                    {item.foto_url && (
                      <Image source={{ uri: item.foto_url }} className="w-full" style={{ aspectRatio: 1 }} resizeMode="cover" />
                    )}
                    <View className="flex-row gap-2 p-3">
                      <Pressable
                        onPress={() => iniciarEdicao(item)}
                        className="flex-row items-center gap-1.5 bg-surface px-3 py-2 rounded-xl border border-border"
                      >
                        <Pencil color={colors.textDark} size={14} />
                        <Text className="text-textDark text-xs font-bold">Editar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => apagar(item)}
                        disabled={apagandoId === item.id}
                        className="flex-row items-center gap-1.5 bg-red-500/10 px-3 py-2 rounded-xl"
                      >
                        {apagandoId === item.id ? (
                          <ActivityIndicator color={colors.danger} size="small" />
                        ) : (
                          <>
                            <Trash2 color={colors.danger} size={14} />
                            <Text className="text-red-500 text-xs font-bold">Apagar</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
