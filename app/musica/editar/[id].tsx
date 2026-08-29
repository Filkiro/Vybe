import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../../lib/supabase";
import { enviarArquivoParaStorage, excluirArquivoDoStorage } from "../../../lib/upload";
import { excluirMusica } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";

function CampoTexto(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#9CA3AF"
      className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      {...props}
    />
  );
}

// Edição de uma música já publicada — reaproveita o mesmo visual do
// formulário de criação (app/(tabs)/criar.tsx), mas pré-carregado
// com os dados atuais. Também é daqui que dá pra apagar a música de
// vez (áudio, capa e o registro no banco).
export default function EditarMusica() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);

  const [carregando, setCarregando] = useState(true);
  const [musica, setMusica] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [genero, setGenero] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [capaTrocada, setCapaTrocada] = useState(false);
  const [arquivo, setArquivo] = useState<{ uri: string; nome: string; tipo: string } | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("musica")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setMusica(data ?? null);
        if (data) {
          setNome(data.nome ?? "");
          setDescricao(data.descricao ?? "");
          setGenero(data.genero ?? "");
          setDataLancamento(data.data_lancamento ?? "");
          setCapaUri(data.capa_url ?? null);
        }
        setCarregando(false);
      });
  }, [id]);

  const souDono = !!usuario && !!musica && usuario.id === musica.usuario_id;

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

  async function trocarArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArquivo({ uri: asset.uri, nome: asset.name, tipo: asset.mimeType ?? "audio/mpeg" });
  }

  async function salvar() {
    if (!musica) return;
    setErro(null);
    if (!nome) {
      setErro("Dê um nome para a música.");
      return;
    }

    setSalvando(true);
    try {
      const dadosAtualizados: Record<string, any> = {
        nome,
        descricao: descricao || null,
        genero: genero || null,
        data_lancamento: dataLancamento || null,
      };

      // Só reenvia a capa se o usuário escolheu uma nova — evita
      // reupload desnecessário quando ela não mudou.
      if (capaTrocada && capaUri) {
        const novaCapaUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${musica.usuario_id}-capa.jpg`,
          contentType: "image/jpeg",
        });
        await excluirArquivoDoStorage({ bucket: "capa_musica", url: musica.capa_url });
        dadosAtualizados.capa_url = novaCapaUrl;
      }

      // Idem pro arquivo de áudio — só troca se um novo foi escolhido.
      if (arquivo) {
        const novoArquivoUrl = await enviarArquivoParaStorage({
          bucket: "musica_audio",
          uri: arquivo.uri,
          nomeArquivo: `${musica.usuario_id}-${arquivo.nome}`,
          contentType: arquivo.tipo,
        });
        await excluirArquivoDoStorage({ bucket: "musica_audio", url: musica.arquivo_url });
        dadosAtualizados.arquivo_url = novoArquivoUrl;
      }

      const { error } = await supabase.from("musica").update(dadosAtualizados).eq("id", musica.id);
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
      "Excluir música",
      `Tem certeza que quer excluir "${musica.nome}"? Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (ok) excluir();
  }

  async function excluir() {
    if (!musica) return;
    setExcluindo(true);
    try {
      await excluirMusica(musica);
      voltar();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao excluir a música.");
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

  if (!musica || !souDono) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">
          Você não tem permissão para editar essa música.
        </Text>
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
        <Text className="text-2xl font-bold text-textDark">Editar música</Text>
      </View>

      <Pressable
        onPress={trocarCapa}
        className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" />
        ) : (
          <Text className="text-muted text-center px-3 text-sm">Toque para escolher a capa</Text>
        )}
      </Pressable>

      <CampoTexto placeholder="Nome da música" value={nome} onChangeText={setNome} />
      <CampoTexto placeholder="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto placeholder="Gênero" value={genero} onChangeText={setGenero} />
      <CampoTexto
        placeholder="Data de lançamento (AAAA-MM-DD)"
        value={dataLancamento}
        onChangeText={setDataLancamento}
      />

      <Pressable onPress={trocarArquivo} className="border border-border rounded-2xl py-4 items-center mb-4">
        <Text className="text-textDark font-medium">
          {arquivo ? arquivo.nome : "Trocar arquivo de áudio (opcional)"}
        </Text>
      </Pressable>

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
            <Text className="text-red-400 font-bold ml-2">Excluir música</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
