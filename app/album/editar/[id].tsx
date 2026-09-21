import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2, Disc } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { enviarArquivoParaStorage, excluirArquivoDoStorage } from "../../../lib/upload";
import { excluirAlbum } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";

// Edição de um álbum já criado: nome e capa. Adicionar/remover
// músicas continua acontecendo direto na tela do álbum
// (app/album/[id].tsx); aqui é só onde apagar o álbum de vez.
export default function EditarAlbum() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);

  const [carregando, setCarregando] = useState(true);
  const [album, setAlbum] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [capaTrocada, setCapaTrocada] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("album")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setAlbum(data ?? null);
        if (data) {
          setNome(data.nome ?? "");
          setCapaUri(data.capa_url ?? null);
        }
        setCarregando(false);
      });
  }, [id]);

  const souDono = !!usuario && !!album && usuario.id === album.usuario_id;

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/perfil");
  }

  async function trocarCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) {
      setCapaUri(resultado.assets[0].uri);
      setCapaTrocada(true);
    }
  }

  async function salvar() {
    if (!album) return;
    setErro(null);
    if (!nome) {
      setErro("Dê um nome para o álbum.");
      return;
    }

    setSalvando(true);
    try {
      const dadosAtualizados: Record<string, any> = { nome };

      if (capaTrocada && capaUri) {
        const novaCapaUrl = await enviarArquivoParaStorage({
          bucket: "capa_album",
          uri: capaUri,
          nomeArquivo: `${album.usuario_id}-capa-album.jpg`,
          contentType: "image/jpeg",
        });
        await excluirArquivoDoStorage({ bucket: "capa_album", url: album.capa_url });
        dadosAtualizados.capa_url = novaCapaUrl;
      }

      const { error } = await supabase.from("album").update(dadosAtualizados).eq("id", album.id);
      if (error) throw error;

      voltar();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    const ok = await confirmar(
      "Excluir álbum",
      `Tem certeza que quer excluir "${album.nome}"? As músicas não serão apagadas, só saem do álbum. Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (ok) excluir();
  }

  async function excluir() {
    if (!album) return;
    setExcluindo(true);
    try {
      await excluirAlbum(album);
      router.replace("/biblioteca/albuns");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao excluir o álbum.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Carregando...</Text>
      </View>
    );
  }

  if (!album || !souDono) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">Você não tem permissão para editar esse álbum.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 140 }}>
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={voltar}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          className="bg-card rounded-full p-2 mr-3"
        >
          <ChevronLeft color={colors.textDark} size={22} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Editar álbum</Text>
      </View>

      <Pressable
        onPress={trocarCapa}
        className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" />
        ) : (
          <View className="items-center justify-center px-3">
            <Disc color={colors.muted} size={28} />
            <Text className="text-muted text-center text-sm mt-2">Toque para escolher a capa</Text>
          </View>
        )}
      </Pressable>

      <TextInput
        placeholder="Nome do álbum"
        placeholderTextColor="#9CA3AF"
        value={nome}
        onChangeText={setNome}
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}

      <Pressable onPress={salvar} disabled={salvando || excluindo} className="bg-primary rounded-full py-4 items-center mb-3">
        {salvando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar alterações</Text>}
      </Pressable>

      <Pressable
        onPress={confirmarExclusao}
        disabled={salvando || excluindo}
        className="flex-row items-center justify-center border border-red-500/30 bg-red-500/10 rounded-full py-4"
      >
        {excluindo ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Trash2 color={colors.danger} size={18} />
            <Text className="text-red-400 font-bold ml-2">Excluir álbum</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
