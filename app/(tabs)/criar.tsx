import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  Check,
  Image as ImageIcon,
  Music,
  Disc,
  Calendar,
  Sparkles,
  Upload,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { enviarArquivoParaStorage } from "../../lib/upload";
import { useAuthStore, bloqueioAtivo } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { useHomeStore } from "../../store/homeStore";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

export default function Criar() {
  const usuario = useAuthStore((s) => s.usuario);
  const restricaoAtiva = useAuthStore((s) => s.restricaoAtiva);

  if (!usuario) {
    return (
      <View className="flex-1 bg-[#0B101E] items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (bloqueioAtivo(usuario, restricaoAtiva)) {
    const dataFormatada = restricaoAtiva?.data_fim
      ? new Date(restricaoAtiva.data_fim).toLocaleDateString("pt-BR")
      : null;
    return (
      <View className="flex-1 bg-[#0B101E] items-center justify-center px-8">
        <View className="bg-[#121829] border border-red-500/30 p-6 rounded-3xl items-center w-full">
          <Text className="text-lg font-bold text-white text-center mb-2">
            Você está temporariamente bloqueado
          </Text>
          <Text className="text-muted text-center text-sm mb-2">
            Não é possível publicar conteúdo no momento{dataFormatada ? ` até ${dataFormatada}` : ""}.
          </Text>
          {restricaoAtiva?.motivo && (
            <Text className="text-red-400 text-center text-xs mt-2 font-medium">
              Motivo: {restricaoAtiva.motivo}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (usuario.tipo_conta === "musico") return <CriarMusico usuarioId={usuario.id} />;
  if (usuario.tipo_conta === "organizador") return <CriarOrganizador usuarioId={usuario.id} />;

  return (
    <View className="flex-1 bg-[#0B101E] items-center justify-center px-8">
      <Text className="text-muted text-center font-medium">
        Contas de moderador/administrador não publicam conteúdo por aqui.
      </Text>
    </View>
  );
}

function CampoTexto({ label, ...props }: React.ComponentProps<typeof TextInput> & { label?: string }) {
  return (
    <View className="mb-4">
      {label && <Text className="text-white text-xs font-semibold mb-2 ml-1">{label}</Text>}
      <TextInput
        placeholderTextColor="#64748B"
        className="bg-[#161D30] border border-border/60 rounded-2xl px-4 py-3.5 text-white font-medium focus:border-primary"
        {...props}
      />
    </View>
  );
}

// -----------------------------------------------------------
// Conta de músico: Música / Álbum / Publicação.
// -----------------------------------------------------------
function CriarMusico({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"musica" | "album" | "publicacao">("musica");

  return (
    <View className="flex-1 bg-[#0B101E]">
      {/* Navegação por Pills */}
      <View className="px-4 pt-6 pb-2">
        <View className="flex-row bg-[#121829] p-1.5 rounded-full border border-border/40">
          <SegmentoAba label="Música" ativa={aba === "musica"} onPress={() => setAba("musica")} />
          <SegmentoAba label="Álbum" ativa={aba === "album"} onPress={() => setAba("album")} />
          <SegmentoAba label="Publicação" ativa={aba === "publicacao"} onPress={() => setAba("publicacao")} />
        </View>
      </View>

      {aba === "musica" && <FormMusica usuarioId={usuarioId} />}
      {aba === "album" && <FormAlbum usuarioId={usuarioId} />}
      {aba === "publicacao" && <FormPublicacaoMusico usuarioId={usuarioId} />}
    </View>
  );
}

// -----------------------------------------------------------
// Conta de organizador: Evento / Publicação.
// -----------------------------------------------------------
function CriarOrganizador({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"evento" | "publicacao">("evento");

  return (
    <View className="flex-1 bg-[#0B101E]">
      <View className="px-4 pt-6 pb-2">
        <View className="flex-row bg-[#121829] p-1.5 rounded-full border border-border/40">
          <SegmentoAba label="Evento" ativa={aba === "evento"} onPress={() => setAba("evento")} />
          <SegmentoAba label="Publicação" ativa={aba === "publicacao"} onPress={() => setAba("publicacao")} />
        </View>
      </View>

      {aba === "evento" ? <FormEvento usuarioId={usuarioId} /> : <FormPublicacaoOrganizador usuarioId={usuarioId} />}
    </View>
  );
}

function SegmentoAba({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2.5 rounded-full items-center justify-center transition-all ${
        ativa ? "bg-primary shadow-lg shadow-primary/30" : "bg-transparent"
      }`}
    >
      <Text className={`font-bold text-xs ${ativa ? "text-white" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}

function FormMusica({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [genero, setGenero] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<{ uri: string; nome: string; tipo: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function escolherCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function escolherArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArquivo({ uri: asset.uri, nome: asset.name, tipo: asset.mimeType ?? "audio/mpeg" });
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!nome || !arquivo) {
      setErro("Preencha o nome e escolha o arquivo de áudio.");
      return;
    }

    setEnviando(true);
    try {
      let capaUrl: string | null = null;
      if (capaUri) {
        capaUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-capa.jpg`,
          contentType: "image/jpeg",
        });
      }

      const arquivoUrl = await enviarArquivoParaStorage({
        bucket: "musica_audio",
        uri: arquivo.uri,
        nomeArquivo: `${usuarioId}-${arquivo.nome}`,
        contentType: arquivo.tipo,
      });

      const { error } = await supabase.from("musica").insert({
        usuario_id: usuarioId,
        nome,
        descricao: descricao || null,
        genero: genero || null,
        data_lancamento: dataLancamento || null,
        capa_url: capaUrl,
        arquivo_url: arquivoUrl,
      });
      if (error) throw error;

      setSucesso(true);
      setNome("");
      setDescricao("");
      setGenero("");
      setDataLancamento("");
      setCapaUri(null);
      setArquivo(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar música.");
    } finally {
      useHomeStore.getState().invalidarHome();
      setEnviando(false);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-black text-white mb-5">Nova música</Text>

      {/* Upload da Capa Estilo Banner / Card */}
      <Pressable
        onPress={escolherCapa}
        className="w-full h-44 rounded-3xl bg-[#121829] border border-dashed border-border/80 items-center justify-center mb-6 overflow-hidden relative"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="items-center px-4">
            <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mb-2">
              <ImageIcon size={22} color={colors.primary} />
            </View>
            <Text className="text-white font-semibold text-sm">Capa da música</Text>
            <Text className="text-muted text-xs mt-1 text-center">Toque para selecionar uma imagem</Text>
          </View>
        )}
      </Pressable>

      <CampoTexto label="Título" placeholder="Ex: Melodia da Noite" value={nome} onChangeText={setNome} />
      <CampoTexto label="Descrição" placeholder="Conte um pouco sobre essa faixa..." value={descricao} onChangeText={setDescricao} multiline numberOfLines={3} />
      <CampoTexto label="Gênero Musical" placeholder="Ex: Rock, MPB, Indie..." value={genero} onChangeText={setGenero} />
      <CampoTexto label="Data de Lançamento" placeholder="AAAA-MM-DD" value={dataLancamento} onChangeText={setDataLancamento} />

      {/* Selecionar Áudio */}
      <View className="mb-6">
        <Text className="text-white text-xs font-semibold mb-2 ml-1">Arquivo de Áudio</Text>
        <Pressable
          onPress={escolherArquivo}
          className="bg-[#121829] border border-border/80 rounded-2xl py-4 px-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
              <Music size={20} color={colors.primary} />
            </View>
            <Text numberOfLines={1} className="text-white font-semibold text-sm flex-1">
              {arquivo ? arquivo.nome : "Escolher áudio do dispositivo"}
            </Text>
          </View>
          <Upload size={18} color={colors.muted} />
        </Pressable>
      </View>

      {erro && <Text className="text-red-400 mb-4 text-center font-medium text-xs">{erro}</Text>}
      {sucesso && <Text className="text-emerald-400 mb-4 text-center font-medium text-xs">Música publicada com sucesso!</Text>}

      <Pressable
        onPress={publicar}
        disabled={enviando}
        className="bg-primary rounded-2xl py-4 items-center shadow-lg shadow-primary/30 active:opacity-90"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Publicar Música</Text>}
      </Pressable>
    </ScrollView>
  );
}

function FormAlbum({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [minhasMusicas, setMinhasMusicas] = useState<any[]>([]);
  const [carregandoMusicas, setCarregandoMusicas] = useState(true);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase
      .from("musica")
      .select("id, nome, capa_url")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .order("data_lancamento", { ascending: false })
      .then(({ data }) => {
        setMinhasMusicas(data ?? []);
        setCarregandoMusicas(false);
      });
  }, [usuarioId]);

  async function escolherCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  async function criarAlbum() {
    setErro(null);
    setSucesso(false);
    if (!nome) {
      setErro("Dê um nome para o álbum.");
      return;
    }

    setEnviando(true);
    try {
      let capaUrl: string | null = null;
      if (capaUri) {
        capaUrl = await enviarArquivoParaStorage({
          bucket: "capa_album",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-capa-album.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { data: novoAlbum, error } = await supabase
        .from("album")
        .insert({ usuario_id: usuarioId, nome, capa_url: capaUrl })
        .select("id")
        .single();
      if (error || !novoAlbum) throw error ?? new Error("Erro ao criar álbum.");

      if (selecionadas.size > 0) {
        const { error: erroFaixas } = await supabase
          .from("album_musica")
          .insert(Array.from(selecionadas).map((musica_id) => ({ album_id: novoAlbum.id, musica_id })));
        if (erroFaixas) throw erroFaixas;
      }

      setSucesso(true);
      setNome("");
      setCapaUri(null);
      setSelecionadas(new Set());
      router.push(`/album/${novoAlbum.id}`);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao criar álbum.");
    } finally {
      useHomeStore.getState().invalidarHome();
      setEnviando(false);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-black text-white mb-5">Novo álbum</Text>

      <Pressable
        onPress={escolherCapa}
        className="w-full h-44 rounded-3xl bg-[#121829] border border-dashed border-border/80 items-center justify-center mb-6 overflow-hidden"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="items-center px-4">
            <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mb-2">
              <Disc size={22} color={colors.primary} />
            </View>
            <Text className="text-white font-semibold text-sm">Capa do álbum</Text>
            <Text className="text-muted text-xs mt-1 text-center">Toque para selecionar uma imagem</Text>
          </View>
        )}
      </Pressable>

      <CampoTexto label="Nome do Álbum" placeholder="Ex: Meu Primeiro Disco" value={nome} onChangeText={setNome} />

      <View className="mt-2 mb-4">
        <Text className="text-white font-bold text-sm mb-1">Adicionar músicas (opcional)</Text>
        <Text className="text-muted text-xs">
          Selecione faixas para incluir neste álbum agora ou adicione depois.
        </Text>
      </View>

      {carregandoMusicas ? (
        <ActivityIndicator color={colors.primary} className="py-6" />
      ) : minhasMusicas.length === 0 ? (
        <View className="bg-[#121829] border border-border/40 rounded-2xl p-4 mb-6">
          <Text className="text-muted text-xs text-center">
            Você ainda não publicou nenhuma música. Publique na aba "Música" para adicioná-las.
          </Text>
        </View>
      ) : (
        <View className="bg-[#121829] border border-border/60 rounded-3xl p-2 mb-6">
          {minhasMusicas.map((item) => {
            const marcada = selecionadas.has(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => alternarSelecao(item.id)}
                className="flex-row items-center p-3 rounded-2xl active:bg-white/5"
              >
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} className="w-10 h-10 rounded-xl mr-3" />
                ) : (
                  <View className="w-10 h-10 rounded-xl bg-surface items-center justify-center mr-3">
                    <Music size={16} color={colors.muted} />
                  </View>
                )}
                <Text numberOfLines={1} className="text-white font-medium flex-1 text-sm">
                  {item.nome}
                </Text>
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center border ${
                    marcada ? "bg-primary border-primary" : "border-border/80 bg-transparent"
                  }`}
                >
                  {marcada && <Check color="#fff" size={14} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {erro && <Text className="text-red-400 mb-4 text-center font-medium text-xs">{erro}</Text>}
      {sucesso && <Text className="text-emerald-400 mb-4 text-center font-medium text-xs">Álbum criado com sucesso!</Text>}

      <Pressable
        onPress={criarAlbum}
        disabled={enviando}
        className="bg-primary rounded-2xl py-4 items-center shadow-lg shadow-primary/30 active:opacity-90"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Criar Álbum</Text>}
      </Pressable>
    </ScrollView>
  );
}

function FormEvento({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!nome || !data) {
      setErro("Preencha ao menos o nome e a data do evento.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("evento").insert({
      organizador_id: usuarioId,
      nome,
      data,
      horario: horario || null,
      localizacao: localizacao || null,
      genero_musical: generoMusical || null,
      capacidade: capacidade ? Number(capacidade) : null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
    setNome("");
    setData("");
    setHorario("");
    setLocalizacao("");
    setGeneroMusical("");
    setCapacidade("");
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-black text-white mb-5">Novo evento</Text>

      <CampoTexto label="Nome do Evento" placeholder="Ex: Festival de Verão" value={nome} onChangeText={setNome} />
      <CampoTexto label="Data" placeholder="AAAA-MM-DD" value={data} onChangeText={setData} />
      <CampoTexto label="Horário" placeholder="HH:MM" value={horario} onChangeText={setHorario} />
      <CampoTexto label="Localização" placeholder="Ex: Av. Paulista, 1000 - SP" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto label="Gênero Principal" placeholder="Ex: Indie / Rock" value={generoMusical} onChangeText={setGeneroMusical} />
      <CampoTexto label="Capacidade de Público" placeholder="Ex: 500" value={capacidade} onChangeText={setCapacidade} keyboardType="numeric" />

      {erro && <Text className="text-red-400 mb-4 text-center font-medium text-xs">{erro}</Text>}
      {sucesso && (
        <Text className="text-emerald-400 mb-4 text-center font-medium text-xs">
          Evento criado! Vá na aba "Publicação" para divulgá-lo no Explorar.
        </Text>
      )}

      <Pressable
        onPress={publicar}
        disabled={enviando}
        className="bg-primary rounded-2xl py-4 items-center shadow-lg shadow-primary/30 active:opacity-90 mt-2"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Criar Evento</Text>}
      </Pressable>
    </ScrollView>
  );
}

function FormPublicacaoMusico({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [minhasMusicas, setMinhasMusicas] = useState<any[]>([]);
  const [meusAlbuns, setMeusAlbuns] = useState<any[]>([]);
  const [itemEscolhido, setItemEscolhido] = useState<{ tipo: "musica" | "album"; id: string; nome: string; capa_url: string | null } | null>(null);
  const [descricao, setDescricao] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase.from("musica").select("id, nome, capa_url").eq("usuario_id", usuarioId).eq("status", "ativo").then(({ data }) => setMinhasMusicas(data ?? []));
    supabase.from("album").select("id, nome, capa_url").eq("usuario_id", usuarioId).eq("status", "ativo").then(({ data }) => setMeusAlbuns(data ?? []));
  }, [usuarioId]);

  function escolher(tipo: "musica" | "album", item: any) {
    setItemEscolhido({ tipo, id: item.id, nome: item.nome, capa_url: item.capa_url });
    setCapaUri(null);
    setDescricao((atual) => atual || `Confira ${tipo === "musica" ? "minha música" : "meu álbum"} "${item.nome}"!`);
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!descricao && !capaUri && !itemEscolhido?.capa_url) {
      setErro("Escreva uma descrição ou escolha uma foto.");
      return;
    }
    setEnviando(true);
    try {
      let fotoUrl: string | null = itemEscolhido?.capa_url ?? null;
      if (capaUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-post-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        foto_url: fotoUrl,
        descricao: descricao || null,
      });
      if (error) throw error;

      setSucesso(true);
      setDescricao("");
      setCapaUri(null);
      setItemEscolhido(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar.");
    } finally {
      useHomeStore.getState().invalidarHome();
      setEnviando(false);
    }
  }

  const fotoPreview = capaUri ?? itemEscolhido?.capa_url ?? null;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-black text-white mb-5">Nova publicação</Text>

      {/* Card da Imagem do Post no estilo do Feed */}
      <Pressable
        onPress={escolherFoto}
        className="w-full h-56 rounded-3xl bg-[#121829] border border-dashed border-border/80 items-center justify-center mb-6 overflow-hidden relative"
      >
        {fotoPreview ? (
          <Image source={{ uri: fotoPreview }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="items-center px-4">
            <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mb-2">
              <ImageIcon size={22} color={colors.primary} />
            </View>
            <Text className="text-white font-semibold text-sm">Selecione uma imagem</Text>
            <Text className="text-muted text-xs mt-1 text-center">Ou escolha um item abaixo para importar a foto</Text>
          </View>
        )}
      </Pressable>

      <CampoTexto label="Legenda" placeholder="O que você deseja compartilhar hoje?" value={descricao} onChangeText={setDescricao} multiline numberOfLines={4} />

      {(minhasMusicas.length > 0 || meusAlbuns.length > 0) && (
        <View className="mt-2 mb-6">
          <Text className="text-white font-bold text-sm mb-1">Divulgar item do seu catálogo (opcional)</Text>
          <Text className="text-muted text-xs mb-3">
            Selecionar preenche o texto e a foto com as informações do item.
          </Text>
          <View>
            {meusAlbuns.map((a) => (
              <ItemEscolha key={`album-${a.id}`} nome={a.nome} tag="Álbum" selecionado={itemEscolhido?.id === a.id} onPress={() => escolher("album", a)} />
            ))}
            {minhasMusicas.map((m) => (
              <ItemEscolha key={`musica-${m.id}`} nome={m.nome} tag="Música" selecionado={itemEscolhido?.id === m.id} onPress={() => escolher("musica", m)} />
            ))}
          </View>
        </View>
      )}

      {erro && <Text className="text-red-400 mb-4 text-center font-medium text-xs">{erro}</Text>}
      {sucesso && <Text className="text-emerald-400 mb-4 text-center font-medium text-xs">Publicado no Explorar!</Text>}

      <Pressable
        onPress={publicar}
        disabled={enviando}
        className="bg-primary rounded-2xl py-4 items-center shadow-lg shadow-primary/30 active:opacity-90"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Publicar no Feed</Text>}
      </Pressable>
    </ScrollView>
  );
}

function FormPublicacaoOrganizador({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [meusEventos, setMeusEventos] = useState<any[]>([]);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase
      .from("evento")
      .select("id, nome, data")
      .eq("organizador_id", usuarioId)
      .order("data", { ascending: true })
      .then(({ data }) => setMeusEventos(data ?? []));
  }, [usuarioId]);

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!eventoId) {
      setErro("Escolha o evento que você quer divulgar.");
      return;
    }
    setEnviando(true);
    try {
      let fotoUrl: string | null = null;
      if (fotoUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: fotoUri,
          nomeArquivo: `${usuarioId}-post-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        evento_id: eventoId,
        foto_url: fotoUrl,
        descricao: descricao || null,
      });
      if (error) throw error;

      setSucesso(true);
      setDescricao("");
      setFotoUri(null);
      setEventoId(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar.");
    } finally {
      useHomeStore.getState().invalidarHome();
      setEnviando(false);
    }
  }

  if (meusEventos.length === 0) {
    return (
      <View className="flex-1 bg-[#0B101E] items-center justify-center px-8">
        <View className="bg-[#121829] border border-border/60 p-6 rounded-3xl items-center w-full">
          <Calendar size={32} color={colors.primary} className="mb-3" />
          <Text className="text-white font-bold text-center mb-1">Nenhum evento encontrado</Text>
          <Text className="text-muted text-center text-xs">
            Crie um evento na aba "Evento" primeiro para poder divulgá-lo no feed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-black text-white mb-5">Nova publicação</Text>

      <Text className="text-white font-bold text-sm mb-2">Evento a divulgar</Text>
      <View className="mb-4">
        {meusEventos.map((e) => (
          <ItemEscolha key={e.id} nome={`${e.nome} — ${e.data}`} tag="Evento" selecionado={eventoId === e.id} onPress={() => setEventoId(e.id)} />
        ))}
      </View>

      <Pressable
        onPress={escolherFoto}
        className="w-full h-56 rounded-3xl bg-[#121829] border border-dashed border-border/80 items-center justify-center mb-6 overflow-hidden relative"
      >
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="items-center px-4">
            <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mb-2">
              <ImageIcon size={22} color={colors.primary} />
            </View>
            <Text className="text-white font-semibold text-sm">Imagem do evento</Text>
            <Text className="text-muted text-xs mt-1 text-center">Toque para selecionar da galeria</Text>
          </View>
        )}
      </Pressable>

      <CampoTexto label="Legenda" placeholder="Escreva sobre o evento..." value={descricao} onChangeText={setDescricao} multiline numberOfLines={4} />

      {erro && <Text className="text-red-400 mb-4 text-center font-medium text-xs">{erro}</Text>}
      {sucesso && <Text className="text-emerald-400 mb-4 text-center font-medium text-xs">Publicado no Explorar!</Text>}

      <Pressable
        onPress={publicar}
        disabled={enviando}
        className="bg-primary rounded-2xl py-4 items-center shadow-lg shadow-primary/30 active:opacity-90"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Publicar no Feed</Text>}
      </Pressable>
    </ScrollView>
  );
}

function ItemEscolha({ nome, tag, selecionado, onPress }: { nome: string; tag: string; selecionado: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between p-3.5 rounded-2xl mb-2.5 border ${
        selecionado ? "bg-primary/10 border-primary" : "bg-[#121829] border-border/60"
      }`}
    >
      <View className="flex-1 mr-2">
        <Text className="text-white font-medium text-sm" numberOfLines={1}>{nome}</Text>
        <Text className="text-muted text-[10px] uppercase font-bold tracking-wider mt-0.5">{tag}</Text>
      </View>
      <View
        className={`w-6 h-6 rounded-full items-center justify-center border ${
          selecionado ? "bg-primary border-primary" : "border-border/80 bg-transparent"
        }`}
      >
        {selecionado && <Check color="#fff" size={14} />}
      </View>
    </Pressable>
  );
}