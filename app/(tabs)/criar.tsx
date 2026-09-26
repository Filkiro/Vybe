import { Fragment, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  Check,
  Image as ImageIcon,
  Music,
  Disc,
  Calendar,
  Clock,
  Sparkles,
  Upload,
  X,
  MapPin,
  Users,
  FileText,
  Info,
  UserSearch,
  CheckCircle2,
} from "lucide-react-native";
import { Heart } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { enviarArquivoParaStorage } from "../../lib/upload";
import { useAuthStore, bloqueioAtivo } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { useHomeStore } from "../../store/homeStore";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { maskDate, parseDateToDB } from "../../lib/dateMask";
import DatePickerModal from "../../components/DatePickerModal";
import TimePickerModal from "../../components/TimePickerModal";

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
        <View className="bg-[#121829] border border-red-500/30 p-6 rounded-3xl items-center w-full max-w-[500px]">
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

function CampoSelecionavel({
  label,
  valor,
  placeholder,
  icone,
  onPress,
}: {
  label: string;
  valor: string;
  placeholder: string;
  icone: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-white text-xs font-semibold mb-2 ml-1">{label}</Text>
      <Pressable
        onPress={onPress}
        className="bg-[#161D30] border border-border/60 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
      >
        <Text className={`font-medium ${valor ? "text-white" : "text-[#64748B]"}`}>
          {valor || placeholder}
        </Text>
        {icone}
      </Pressable>
    </View>
  );
}

// -----------------------------------------------------------
// Conta de músico: Música / Álbum / Publicação.
// -----------------------------------------------------------
function CriarMusico({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"musica" | "album" | "publicacao">("musica");
  const paddingBottom = usePlayerAwarePadding(140);

  const subtitulos = {
    musica: "Lançamento de Faixa Solo",
    album: "Lançamento de Álbum / EP",
    publicacao: "Feed da Cena",
  };

  return (
    <ScrollView className="flex-1 bg-[#0B101E]" contentContainerStyle={{ paddingBottom }}>
      <View className="max-w-[1380px] mx-auto w-full flex-col gap-8 px-6 pt-10">

        {/* HEADER CONTROL BAR WITH MODE TABS */}
        <View className="flex-col lg:flex-row lg:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <View className="flex-col gap-1">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-[#3B82F6]" style={{ shadowColor: '#3B82F6', shadowRadius: 8, shadowOpacity: 1 }} />
              <Text className="text-[11px] uppercase tracking-wider text-[#3B82F6] font-semibold">VYBE STUDIO HUB</Text>
              <Text className="text-white/20">•</Text>
              <Text className="text-[11px] text-[#94A3B8]">{subtitulos[aba]}</Text>
            </View>
            <Text className="text-[28px] lg:text-[32px] text-white tracking-tight font-bold">
              Central de Criação
            </Text>
            <Text className="text-[#94A3B8] max-w-xl text-sm mt-1 leading-relaxed">
              {aba === "musica"
                ? "Publique seu som, construa seu catálogo e engaje diretamente com a cena independente."
                : aba === "album"
                ? "Agrupe suas faixas em um projeto coeso. Álbuns e EPs ganham mais destaque no feed."
                : "Atualizações para seus fãs, bastidores do estúdio e novidades da sua carreira."}
            </Text>
          </View>

          {/* TABS — mesmo padrão do Organizador */}
          <View className="flex-row p-1.5 bg-[#141a24] border border-white/10 rounded-2xl self-start lg:self-auto shadow-xl">
            <Pressable
              onPress={() => setAba("musica")}
              className={`flex-row items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 ${aba === "musica" ? "bg-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.45)]" : "hover:bg-white/5"}`}
            >
              <Music size={17} color={aba === "musica" ? "#fff" : "#94A3B8"} />
              <Text className={`font-semibold text-sm ${aba === "musica" ? "text-white" : "text-[#94A3B8]"}`}>Música</Text>
            </Pressable>

            <Pressable
              onPress={() => setAba("album")}
              className={`flex-row items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 ${aba === "album" ? "bg-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.45)]" : "hover:bg-white/5"}`}
            >
              <Disc size={17} color={aba === "album" ? "#fff" : "#94A3B8"} />
              <Text className={`font-semibold text-sm ${aba === "album" ? "text-white" : "text-[#94A3B8]"}`}>Álbum</Text>
            </Pressable>

            <Pressable
              onPress={() => setAba("publicacao")}
              className={`flex-row items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 ${aba === "publicacao" ? "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.45)]" : "hover:bg-white/5"}`}
            >
              <Sparkles size={17} color={aba === "publicacao" ? "#fff" : "#94A3B8"} />
              <Text className={`font-semibold text-sm ${aba === "publicacao" ? "text-white" : "text-[#94A3B8]"}`}>Publicação</Text>
            </Pressable>
          </View>
        </View>

        {aba === "musica" && <FormMusica usuarioId={usuarioId} />}
        {aba === "album" && <FormAlbum usuarioId={usuarioId} />}
        {aba === "publicacao" && <FormPublicacaoMusico usuarioId={usuarioId} />}
      </View>
    </ScrollView>
  );
}

// -----------------------------------------------------------
// Conta de organizador: Evento / Publicação.
// -----------------------------------------------------------
function CriarOrganizador({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"evento" | "publicacao">("evento");

  return (
    <ScrollView className="flex-1 bg-[#0B101E]" contentContainerStyle={{ paddingBottom: 140 }}>
      <View className="max-w-[1380px] mx-auto w-full flex-col gap-8 px-6 pt-10">
        
        {/* HEADER CONTROL BAR WITH MODE TABS */}
        <View className="flex-col lg:flex-row lg:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <View className="flex-col gap-1">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]" />
              <Text className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Vybe Organizer Hub</Text>
              <Text className="text-white/20">•</Text>
              <Text className="text-[11px] text-[#94A3B8]">
                {aba === "evento" ? "Criação de Evento" : "Feed da Cena"}
              </Text>
            </View>
            <Text className="text-[28px] lg:text-[32px] text-white tracking-tight font-bold flex-row items-center gap-2">
              Central de Criação
            </Text>
            <Text className="text-[#94A3B8] max-w-xl text-sm mt-1 leading-relaxed">
              {aba === "evento" 
                ? "Organize seus eventos, defina localizações, horários e convide os artistas da cena para participar." 
                : "Atualizações para o público, anúncios importantes e cobertura de eventos passados."}
            </Text>
          </View>

          {/* TWO DISTINCT TABS */}
          <View className="flex-row p-1.5 bg-[#141a24] border border-white/10 rounded-2xl self-start lg:self-auto shadow-xl">
            <Pressable 
              onPress={() => setAba("evento")}
              className={`flex-row items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 ${aba === "evento" ? "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.45)]" : "hover:bg-white/5"}`}
            >
              <Calendar size={19} color={aba === "evento" ? "#fff" : "#94A3B8"} />
              <Text className={`font-semibold text-sm ${aba === "evento" ? "text-white" : "text-[#94A3B8]"}`}>Evento</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => setAba("publicacao")}
              className={`flex-row items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 ${aba === "publicacao" ? "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.45)]" : "hover:bg-white/5"}`}
            >
              <Sparkles size={19} color={aba === "publicacao" ? "#fff" : "#94A3B8"} />
              <Text className={`font-semibold text-sm ${aba === "publicacao" ? "text-white" : "text-[#94A3B8]"}`}>Publicação</Text>
            </Pressable>
          </View>
        </View>

        {aba === "evento" ? <FormEvento usuarioId={usuarioId} /> : <FormPublicacaoOrganizador usuarioId={usuarioId} />}
      </View>
    </ScrollView>
  );
}

function SegmentoAba({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2.5 rounded-full items-center justify-center transition-all ${
        ativa ? "bg-primary  " : "bg-transparent"
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
  
  // 1. Adicionado o estado para controlar o modal do calendário
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  async function escolherCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
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
        data_lancamento: dataLancamento ? parseDateToDB(dataLancamento) : null,
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

  // 2. Fragment adicionado em volta do retorno para acomodar o Modal
  return (
    <Fragment>
      <View className="flex-col-reverse lg:flex-row gap-6 items-start w-full">
        {/* LEFT COLUMN */}
        <View className="flex-col gap-0 w-full lg:flex-[7] bg-[#141a24]/80 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          {/* Card Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/5">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 items-center justify-center">
                <Music size={16} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-white text-sm font-bold">Lançar Nova Faixa</Text>
                <Text className="text-[11px] text-[#64748B]">Música individual com áudio</Text>
              </View>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20">
              <Text className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-wider">SINGLE</Text>
            </View>
          </View>

          <View className="p-5 flex-col gap-5">
            {/* Capa */}
            <View className="flex-col gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-white">Capa do Single</Text>
                <Text className="text-[11px] text-[#64748B]">1:1 • Mínimo 800 x 800 px</Text>
              </View>
              <Pressable
                onPress={escolherCapa}
                className="rounded-xl bg-[#0a0e16] border border-dashed border-white/10 p-8 flex-col items-center justify-center overflow-hidden"
              >
                {capaUri ? (
                  <Image source={{ uri: capaUri }} className="w-full aspect-square rounded-lg" resizeMode="cover" />
                ) : (
                  <>
                    <View className="w-12 h-12 rounded-xl bg-[#1a2035] items-center justify-center mb-3">
                      <ImageIcon size={22} color="#3B82F6" />
                    </View>
                    <Text className="text-white font-semibold text-sm mb-1">Arraste a capa da música aqui</Text>
                    <Text className="text-xs text-[#64748B] text-center mb-4">Formatos aceitos: JPG ou PNG.</Text>
                    <View className="flex-row items-center gap-2 bg-[#1a2035] border border-white/10 rounded-lg px-4 py-2">
                      <Upload size={14} color="#94A3B8" />
                      <Text className="text-[#94A3B8] text-xs font-medium">Selecionar arte do dispositivo</Text>
                    </View>
                  </>
                )}
              </Pressable>
            </View>

            {/* Título */}
            <View className="flex-col gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-white">Título da Faixa</Text>
                <Text className="text-[11px] text-[#64748B]">{nome.length}/60</Text>
              </View>
              <TextInput
                className="bg-[#0a0e16] border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl"
                placeholder="Ex: Melodia da Noite"
                placeholderTextColor="#4B5563"
                value={nome}
                onChangeText={setNome}
                maxLength={60}
              />
            </View>

            {/* Descrição */}
            <View className="flex-col gap-1.5">
              <Text className="text-sm font-semibold text-white">Descrição & Notas</Text>
              <TextInput
                className="bg-[#0a0e16] border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl min-h-[90px]"
                placeholder="Conte um pouco sobre essa faixa..."
                placeholderTextColor="#4B5563"
                value={descricao}
                onChangeText={setDescricao}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Gênero + Data */}
            <View className="flex-col sm:flex-row gap-4">
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Gênero Musical</Text>
                <TextInput
                  className="bg-[#0a0e16] border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl"
                  placeholder="Ex: Rock, MPB..."
                  placeholderTextColor="#4B5563"
                  value={genero}
                  onChangeText={setGenero}
                />
              </View>
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Data de Lançamento</Text>
                <Pressable
                  onPress={() => setMostrarCalendario(true)}
                  className="bg-[#0a0e16] border border-white/10 w-full px-4 py-3 rounded-xl flex-row items-center justify-between"
                >
                  <Text className={`text-sm ${dataLancamento ? 'text-white' : 'text-[#4B5563]'}`}>
                    {dataLancamento || "DD/MM/AAAA"}
                  </Text>
                  <Calendar size={15} color="#64748B" />
                </Pressable>
              </View>
            </View>

            {/* Arquivo de Áudio */}
            <View className="flex-col gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-white">Arquivo de Áudio</Text>
                <View className="flex-row gap-1.5">
                  {["MP3", "WAV", "AAC"].map(f => (
                    <View key={f} className="px-1.5 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                      <Text className="text-[10px] text-[#3B82F6] font-bold">{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable
                onPress={escolherArquivo}
                className="bg-[#0a0e16] border border-white/10 rounded-xl px-4 py-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-3 gap-3">
                  <View className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 items-center justify-center">
                    <Music size={18} color="#3B82F6" />
                  </View>
                  <Text numberOfLines={1} className={`text-sm flex-1 ${arquivo ? 'text-white font-medium' : 'text-[#4B5563]'}`}>
                    {arquivo ? arquivo.nome : "Escolher áudio do dispositivo"}
                  </Text>
                </View>
                <Upload size={16} color="#64748B" />
              </Pressable>
            </View>

            {/* Ações */}
            <View className="flex-row items-center justify-between pt-4 border-t border-white/5">
              {erro && (
                <View className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-3">
                  <Text className="text-red-400 text-xs font-medium">{erro}</Text>
                </View>
              )}
              {sucesso && (
                <View className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-3">
                  <Text className="text-emerald-400 text-xs font-medium">Música publicada com sucesso!</Text>
                </View>
              )}

              <View className="flex-row items-center justify-between w-full">
                <Pressable
                  onPress={() => {
                    setNome(""); setDescricao(""); setGenero(""); setDataLancamento(""); setCapaUri(null); setArquivo(null);
                  }}
                  className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:opacity-70"
                >
                  <Upload size={15} color="#94A3B8" />
                  <Text className="text-white text-xs font-semibold">Salvar Rascunho</Text>
                </Pressable>

                <Pressable
                  onPress={publicar}
                  disabled={enviando}
                  className="flex-row items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 shadow-[0_0_24px_rgba(37,99,235,0.4)] active:opacity-90"
                >
                  {enviando ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Upload size={16} color="white" />
                      <Text className="text-white font-semibold text-sm">Publicar Música</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN: PREVIEW */}
        <View className="hidden lg:flex w-full lg:flex-[5] flex-col gap-4 lg:sticky top-4">
          <View className="bg-[#141a24]/80 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Preview header */}
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/5">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Preview do Single</Text>
              </View>
              <Text className="text-[11px] text-[#64748B]">Feed do Ouvinte</Text>
            </View>

            {/* Capa */}
            <View className="w-full aspect-square bg-[#0a0e16]">
              {capaUri ? (
                <Image source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Music size={56} color="#1E3A5F" />
                </View>
              )}
            </View>

            {/* Info */}
            <View className="p-5">
              <Text className="text-white font-black text-xl" numberOfLines={1}>{nome || "Melodia da Noite"}</Text>
              <Text className="text-[#64748B] text-xs mt-1">
                {genero ? genero : "Gênero Musical"}
              </Text>

              {arquivo && (
                <View className="flex-row items-center gap-2 mt-4 bg-[#3B82F6]/10 rounded-lg px-3 py-2 border border-[#3B82F6]/15">
                  <Music size={13} color="#3B82F6" />
                  <Text className="text-[#3B82F6] text-xs flex-1" numberOfLines={1}>{arquivo.nome}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={mostrarCalendario}
        valor={dataLancamento}
        onFechar={() => setMostrarCalendario(false)}
        onSelecionar={setDataLancamento}
      />
    </Fragment>
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
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
    <View className="flex-col-reverse lg:flex-row gap-8 items-start w-full">
      {/* LEFT COLUMN: FORM SECTION */}
      <View className="flex-col gap-5 w-full lg:flex-[7]">
        <View className="bg-[#141a24]/70 rounded-2xl p-6 flex-col gap-6 shadow-2xl border border-white/5 backdrop-blur-xl">
          <View className="flex-row items-center justify-between pb-2 border-b border-white/5">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-lg bg-[#A855F7]/10 items-center justify-center">
                <Disc size={18} color="#A855F7" />
              </View>
              <View>
                <Text className="text-white text-lg font-bold">Novo Álbum</Text>
                <Text className="text-xs text-[#94A3B8]">Agrupe suas músicas em um lançamento</Text>
              </View>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/20">
              <Text className="text-[10px] text-[#A855F7] font-bold uppercase tracking-wider">ÁLBUM / EP</Text>
            </View>
          </View>

          {/* Capa */}
          <View className="flex-col gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Capa do Álbum</Text>
              <Text className="text-xs text-[#94A3B8]">Proporção quadrada 1:1</Text>
            </View>
            <Pressable
              onPress={escolherCapa}
              className="group overflow-hidden rounded-xl bg-[#0a0e16]/80 border border-dashed border-white/15 p-6 flex-col items-center justify-center text-center hover:border-[#A855F7]/50 hover:bg-[#12162a]/60 transition-all"
            >
              {capaUri ? (
                <ImageBackground source={{ uri: capaUri }} className="w-full aspect-square rounded-xl shadow-lg" resizeMode="cover" />
              ) : (
                <>
                  <View className="w-12 h-12 rounded-full bg-[#182030] items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-[#A855F7] transition-all shadow-md">
                    <Disc size={24} color="#A855F7" />
                  </View>
                  <Text className="text-white font-medium text-sm mb-0.5">Toque para selecionar a capa</Text>
                  <Text className="text-xs text-[#8D90A0] max-w-sm mb-3 text-center">A capa será o rosto principal do seu lançamento.</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Informações Básicas */}
          <View className="flex-col gap-4">
            <View className="flex-col gap-1.5 w-full">
              <Text className="text-sm font-semibold text-white">Nome do Álbum</Text>
              <TextInput
                className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-[#A855F7]"
                placeholder="Ex: Meu Primeiro Disco"
                placeholderTextColor="#64748B"
                value={nome}
                onChangeText={setNome}
              />
            </View>
          </View>

          <View className="mt-2 mb-2">
            <Text className="text-white font-bold text-sm mb-1">Adicionar músicas (opcional)</Text>
            <Text className="text-[#94A3B8] text-xs">
              Selecione faixas já enviadas para incluir neste álbum.
            </Text>
          </View>

          {carregandoMusicas ? (
            <ActivityIndicator color="#A855F7" className="py-6" />
          ) : minhasMusicas.length === 0 ? (
            <View className="bg-[#0a0e16]/50 border border-white/5 rounded-xl p-4 mb-2">
              <Text className="text-[#94A3B8] text-xs text-center">
                Você ainda não publicou nenhuma música solta. Crie músicas primeiro para adicioná-las.
              </Text>
            </View>
          ) : (
            <View className="bg-[#0a0e16]/50 border border-white/5 rounded-2xl p-2 mb-2 max-h-[250px] overflow-hidden">
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {minhasMusicas.map((item) => {
                  const marcada = selecionadas.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => alternarSelecao(item.id)}
                      className={`flex-row items-center p-3 rounded-xl transition-colors ${marcada ? 'bg-[#A855F7]/10' : 'hover:bg-white/5'}`}
                    >
                      {item.capa_url ? (
                        <Image source={{ uri: item.capa_url }} className="w-10 h-10 rounded-lg mr-3" />
                      ) : (
                        <View className="w-10 h-10 rounded-lg bg-[#182030] items-center justify-center mr-3">
                          <Music size={16} color="#64748B" />
                        </View>
                      )}
                      <Text numberOfLines={1} className={`font-medium flex-1 text-sm ${marcada ? 'text-white' : 'text-[#CBD5E1]'}`}>
                        {item.nome}
                      </Text>
                      <View
                        className={`w-6 h-6 rounded-full items-center justify-center border transition-colors ${
                          marcada ? "bg-[#A855F7] border-[#A855F7]" : "border-white/20 bg-transparent"
                        }`}
                      >
                        {marcada && <Check color="#fff" size={14} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Ações */}
          <View className="flex-col gap-3 mt-2 pt-4 border-t border-white/5">
            {erro && (
              <View className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex-row items-center gap-2">
                <Text className="text-red-400 text-xs font-medium flex-1">{erro}</Text>
              </View>
            )}
            {sucesso && (
              <View className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex-row items-center gap-2">
                <Text className="text-emerald-400 text-xs font-medium flex-1">Álbum criado com sucesso!</Text>
              </View>
            )}

            <Pressable
              onPress={criarAlbum}
              disabled={enviando}
              className="bg-[#A855F7] rounded-xl py-4 items-center active:opacity-90 shadow-lg shadow-[#A855F7]/20"
            >
              {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Criar Álbum</Text>}
            </Pressable>
          </View>
        </View>
      </View>

      {/* RIGHT COLUMN: PREVIEW */}
      <View className="hidden lg:flex w-full lg:flex-[5] flex-col gap-4 lg:sticky top-4">
        <View className="bg-[#181C24]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <Text className="text-white text-sm font-bold mb-4 flex-row items-center">
            <Disc size={16} color="#9CA3AF" className="mr-2" /> Pré-visualização do Álbum
          </Text>
          
          <View className="flex-row gap-4 items-end pointer-events-none opacity-90 mb-4">
            <View className="w-32 h-32 rounded-lg bg-[#0a0e16] border border-white/10 overflow-hidden shadow-2xl">
              {capaUri ? (
                <Image source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Disc size={40} color="#64748B" />
                </View>
              )}
            </View>
            <View className="flex-1 pb-1">
              <Text className="text-[10px] text-[#A855F7] font-bold uppercase tracking-widest mb-1">Álbum</Text>
              <Text className="text-2xl font-black text-white" numberOfLines={2}>
                {nome || "Novo Álbum"}
              </Text>
              <Text className="text-sm text-[#94A3B8] mt-1">{selecionadas.size} faixa(s) selecionada(s)</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
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
  const [descricao, setDescricao] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  
  // Convites
  const [musicos, setMusicos] = useState<any[]>([]);
  const [convidados, setConvidados] = useState<string[]>([]);

  const [buscaArtista, setBuscaArtista] = useState("");
  const artistasFiltrados = buscaArtista.trim().length > 0 ? musicos.filter((m) => (m.apelido || "Sem Nome").toLowerCase().includes(buscaArtista.toLowerCase())) : [];

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRelogio, setMostrarRelogio] = useState(false);

  useEffect(() => {
    supabase
      .from("perfil_musico")
      .select("usuario_id, apelido, foto_url")
      .then(({ data }) => setMusicos(data ?? []));
  }, []);

  function toggleConvidado(id: string) {
    setConvidados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function publicar(comoRascunho: boolean) {
    setErro(null);
    setSucesso(false);
    if (!nome || !data || !descricao || !capaUri) {
      setErro("Preencha nome, data, descrição e escolha uma foto para o evento.");
      return;
    }
    setEnviando(true);
    
    try {
      // 1. Fazer upload da foto primeiro
      let fotoUrl: string | null = null;
      if (capaUri) {
        try {
          fotoUrl = await enviarArquivoParaStorage({
            bucket: "eventos",
            uri: capaUri,
            nomeArquivo: `${usuarioId}-evento-${Date.now()}.jpg`,
            contentType: "image/jpeg",
          });
        } catch (storageError: any) {
          throw new Error("Erro no upload do bucket 'eventos': " + storageError.message);
        }
      }

      // 2. Criar Evento
      const { data: novoEvento, error } = await supabase.from("evento").insert({
        organizador_id: usuarioId,
        nome,
        descricao,
        capa_url: fotoUrl,
        data: data ? parseDateToDB(data) : null,
        horario: horario || null,
        localizacao: localizacao || null,
        genero_musical: generoMusical || null,
        capacidade: capacidade ? Number(capacidade) : null,
        status: comoRascunho ? "rascunho" : "aberto",
      }).select().single();

      if (error) {
        throw new Error("Erro ao salvar o evento na tabela: " + error.message);
      }

      // 3. Criar Publicacao
      const { error: errorPub } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        evento_id: novoEvento.id,
        foto_url: fotoUrl,
        descricao,
        status: comoRascunho ? "rascunho" : "ativo",
      });
      if (errorPub) throw new Error("Erro ao criar publicação: " + errorPub.message);

      let redirecionarConversaId = null;

      if (convidados.length > 0 && novoEvento) {
        const convites = convidados.map((musicoId) => ({
          evento_id: novoEvento.id,
          musico_id: musicoId,
          status: "pendente",
        }));
        
        const { data: convitesInseridos } = await supabase
          .from("evento_convite")
          .insert(convites)
          .select();

        if (convitesInseridos) {
          for (const convite of convitesInseridos) {
            let conversaId;
            const { data: convExistente } = await supabase
              .from("conversa")
              .select("id")
              .or(`and(usuario_id1.eq.${usuarioId},usuario_id2.eq.${convite.musico_id}),and(usuario_id1.eq.${convite.musico_id},usuario_id2.eq.${usuarioId})`)
              .maybeSingle();

            if (convExistente) {
              conversaId = convExistente.id;
            } else {
              const { data: novaConv } = await supabase
                .from("conversa")
                .insert({ usuario_id1: usuarioId, usuario_id2: convite.musico_id })
                .select()
                .single();
              if (novaConv) conversaId = novaConv.id;
            }

            if (conversaId) {
              redirecionarConversaId = conversaId;
              await supabase.from("mensagem").insert({
                conversa_id: conversaId,
                remetente_id: usuarioId,
                conteudo: "Você foi convidado para um evento!",
                evento_convite_id: convite.id,
              });
            }
          }
        }
      }

      setEnviando(false);
      setSucesso(true);
      setNome("");
      setData("");
      setHorario("");
      setLocalizacao("");
      setGeneroMusical("");
      setCapacidade("");
      setDescricao("");
      setCapaUri(null);
      setConvidados([]);
      useHomeStore.getState().invalidarHome();

      if (convidados.length === 1 && redirecionarConversaId) {
        const musicoId = convidados[0];
        const musico = musicos.find((m) => m.usuario_id === musicoId);
        const nomeContato = musico?.apelido ?? "Músico";
        let url = `/chat/${redirecionarConversaId}?contatoId=${musicoId}&contatoNome=${encodeURIComponent(nomeContato)}`;
        if (musico?.foto_url) {
          url += `&contatoFotoUrl=${encodeURIComponent(musico.foto_url)}`;
        }
        router.push(url as any);
      } else if (convidados.length > 1) {
        router.push("/(tabs)/conversa");
      }
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar evento.");
      setEnviando(false);
    }
  }

  return (
    <Fragment>
      <View className="flex-col-reverse lg:flex-row gap-8 items-start w-full">
        {/* LEFT COLUMN: FORM SECTION */}
        <View className="flex-col gap-5 w-full lg:flex-[7]">
          <View className="bg-[#141a24]/70 rounded-2xl p-6 flex-col gap-6 shadow-2xl border border-white/5 backdrop-blur-xl">
            <View className="flex-row items-center justify-between pb-2 border-b border-white/5">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                  <Calendar size={18} color="#34d399" />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">Criar Evento</Text>
                  <Text className="text-xs text-[#94A3B8]">Organize shows e festivais</Text>
                </View>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Text className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">EVENTO • AO VIVO</Text>
              </View>
            </View>

            {/* Capa */}
            <View className="flex-col gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-white">Banner / Foto do Evento</Text>
                <Text className="text-xs text-[#94A3B8]">Proporção quadrada 1:1</Text>
              </View>
              <Pressable
                onPress={escolherFoto}
                className="group overflow-hidden rounded-xl bg-[#0a0e16]/80 border border-dashed border-white/15 p-6 flex-col items-center justify-center text-center hover:border-emerald-500/50 hover:bg-[#12162a]/60 transition-all"
              >
                {capaUri ? (
                  <ImageBackground source={{ uri: capaUri }} className="w-full aspect-square rounded-xl shadow-lg" resizeMode="cover" />
                ) : (
                  <>
                    <View className="w-12 h-12 rounded-full bg-[#182030] items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-emerald-600 transition-all shadow-md">
                      <Upload size={24} color="#34d399" />
                    </View>
                    <Text className="text-white font-medium text-sm mb-0.5">Toque para selecionar o banner</Text>
                    <Text className="text-xs text-[#8D90A0] max-w-sm mb-3 text-center">Imagem em formato quadrado para destaque no feed.</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Informações Básicas */}
            <View className="flex-col sm:flex-row gap-4">
              <View className="flex-col gap-1.5 flex-[2]">
                <Text className="text-sm font-semibold text-white">Nome do Evento</Text>
                <TextInput
                  className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500"
                  placeholder="Ex: Festival de Inverno"
                  placeholderTextColor="#64748B"
                  value={nome}
                  onChangeText={setNome}
                />
              </View>
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Capacidade</Text>
                <TextInput
                  className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500"
                  placeholder="Ex: 500"
                  placeholderTextColor="#64748B"
                  value={capacidade}
                  onChangeText={setCapacidade}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="flex-col sm:flex-row gap-4">
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Localização</Text>
                <TextInput
                  className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500"
                  placeholder="Ex: Av. Paulista, 1000 - SP"
                  placeholderTextColor="#64748B"
                  value={localizacao}
                  onChangeText={setLocalizacao}
                />
              </View>
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Gênero Principal</Text>
                <TextInput
                  className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500"
                  placeholder="Ex: Indie / Rock"
                  placeholderTextColor="#64748B"
                  value={generoMusical}
                  onChangeText={setGeneroMusical}
                />
              </View>
            </View>

            <View className="flex-col sm:flex-row gap-4">
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Data</Text>
                <Pressable
                  onPress={() => setMostrarCalendario(true)}
                  className="bg-[#0a0e16]/75 border border-white/10 w-full px-4 py-3 rounded-xl flex-row items-center justify-between"
                >
                  <Text className={`text-sm ${data ? "text-white" : "text-[#64748B]"}`}>
                    {data || "Selecionar data"}
                  </Text>
                  <Calendar size={16} color="#64748B" />
                </Pressable>
              </View>
              <View className="flex-col gap-1.5 flex-1">
                <Text className="text-sm font-semibold text-white">Horário</Text>
                <Pressable
                  onPress={() => setMostrarRelogio(true)}
                  className="bg-[#0a0e16]/75 border border-white/10 w-full px-4 py-3 rounded-xl flex-row items-center justify-between"
                >
                  <Text className={`text-sm ${horario ? "text-white" : "text-[#64748B]"}`}>
                    {horario || "Selecionar horário"}
                  </Text>
                  <Clock size={16} color="#64748B" />
                </Pressable>
              </View>
            </View>

            <View className="flex-col gap-1.5">
              <Text className="text-sm font-semibold text-white">Descrição do Evento</Text>
              <TextInput
                className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500 min-h-[100px]"
                placeholder="Conte um pouco sobre o evento..."
                placeholderTextColor="#64748B"
                value={descricao}
                onChangeText={setDescricao}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Convidar Artistas */}
            <View className="flex-col gap-3 pt-2 border-t border-white/5">
              <View className="flex-col gap-1">
                <Text className="text-sm font-semibold text-white flex-row items-center gap-1.5"><UserSearch size={16} color="#34d399" /> Convidar Artistas da Cena</Text>
                <Text className="text-xs text-[#94A3B8]">Eles receberão um convite no chat para confirmar a participação.</Text>
              </View>

              <View className="relative z-50">
                <TextInput
                  className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500"
                  placeholder="Digite o nome do artista para buscar..."
                  placeholderTextColor="#64748B"
                  value={buscaArtista}
                  onChangeText={setBuscaArtista}
                />
                
                {/* Search Results */}
                {buscaArtista.trim().length > 0 && (
                  <View className="absolute top-full mt-2 w-full bg-[#182030] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48">
                    <ScrollView nestedScrollEnabled>
                      {artistasFiltrados.length === 0 ? (
                        <Text className="text-[#94A3B8] text-sm text-center py-4">Nenhum artista encontrado.</Text>
                      ) : (
                        artistasFiltrados.map((m) => {
                          const selecionado = convidados.includes(m.usuario_id);
                          return (
                            <Pressable
                              key={m.usuario_id}
                              onPress={() => {
                                toggleConvidado(m.usuario_id);
                                setBuscaArtista("");
                              }}
                              className={`flex-row items-center gap-3 p-3 border-b border-white/5 active:bg-white/5 ${selecionado ? "bg-emerald-500/10" : ""}`}
                            >
                              {m.foto_url ? (
                                <Image source={{ uri: m.foto_url }} className="w-8 h-8 rounded-full" />
                              ) : (
                                <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                                  <UserSearch size={14} color="#94A3B8" />
                                </View>
                              )}
                              <Text className={`text-sm font-medium flex-1 ${selecionado ? "text-emerald-400" : "text-white"}`}>{m.apelido || "Sem Nome"}</Text>
                              {selecionado && <CheckCircle2 size={16} color="#34d399" />}
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Selected Chips */}
              {convidados.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {convidados.map(id => {
                    const musico = musicos.find(m => m.usuario_id === id);
                    if (!musico) return null;
                    return (
                      <Pressable 
                        key={id}
                        onPress={() => toggleConvidado(id)}
                        className="flex-row items-center gap-2 pl-1.5 pr-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
                      >
                        {musico.foto_url ? (
                          <Image source={{ uri: musico.foto_url }} className="w-5 h-5 rounded-full" />
                        ) : (
                          <View className="w-5 h-5 rounded-full bg-white/20" />
                        )}
                        <Text className="text-emerald-300 text-xs font-semibold">{musico.apelido}</Text>
                        <Text className="text-emerald-400/50 text-[10px] ml-1 font-bold">×</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {erro && <Text className="text-red-400 text-center font-medium text-xs">{erro}</Text>}
            {sucesso && <Text className="text-emerald-400 text-center font-medium text-xs">Evento salvo com sucesso!</Text>}

            {/* Ações */}
            <View className="flex-row items-center justify-end gap-3 pt-2 border-t border-white/5">
              <Pressable
                onPress={() => publicar(true)}
                disabled={enviando}
                className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all"
              >
                <Text className="text-white text-sm font-semibold">Salvar Rascunho</Text>
              </Pressable>

              <Pressable
                onPress={() => publicar(false)}
                disabled={enviando}
                className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 flex-row items-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition-all"
              >
                {enviando ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text className="text-white text-sm font-semibold">Publicar Evento</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN: PREVIEW */}
        <View className="hidden lg:flex flex-col gap-5 w-full lg:flex-[5] lg:sticky top-8">
          <View className="bg-[#141a24]/70 rounded-2xl p-6 flex-col gap-4 shadow-2xl border border-white/5 backdrop-blur-xl relative overflow-hidden">
            <View className="flex-row items-center justify-between pb-1">
              <View className="flex-row items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <Text className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Preview do Evento</Text>
              </View>
              <Text className="text-xs text-[#94A3B8]">Feed Principal</Text>
            </View>

            {/* Artwork */}
            <View className="relative w-full aspect-square rounded-2xl bg-[#101520] overflow-hidden border border-white/10 items-center justify-center shadow-2xl">
              {capaUri ? (
                <ImageBackground source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="items-center opacity-30">
                  <Calendar size={48} color="#fff" />
                </View>
              )}
            </View>

            {/* Info */}
            <View className="flex-col gap-0.5 mt-2">
              <Text className="text-lg font-bold text-white truncate">{nome || "Nome do Evento"}</Text>
              <Text className="text-xs text-emerald-400 font-medium">
                {data ? `${data} ${horario ? `• ${horario}` : ""}` : "Data a definir"}
              </Text>
              <Text className="text-xs text-[#94A3B8] mt-1" numberOfLines={2}>
                {localizacao || "Localização a definir"} • {convidados.length} artista{convidados.length !== 1 && "s"} convidado{convidados.length !== 1 && "s"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={mostrarCalendario}
        valor={data}
        onFechar={() => setMostrarCalendario(false)}
        onSelecionar={setData}
        dataMinima={new Date()}
      />
      <TimePickerModal
        visible={mostrarRelogio}
        valor={horario}
        onFechar={() => setMostrarRelogio(false)}
        onSelecionar={setHorario}
      />
    </Fragment>
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
    setItemEscolhido((atual) =>
      atual?.id === item.id ? null : { tipo, id: item.id, nome: item.nome, capa_url: item.capa_url }
    );
    setDescricao((atual) => atual || `Confira ${tipo === "musica" ? "minha música" : "meu álbum"} "${item.nome}"!`);
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function publicar(comoRascunho: boolean) {
    setErro(null);
    setSucesso(false);
    if (!descricao && !capaUri && !itemEscolhido) {
      setErro("Escreva uma descrição, anexe uma mídia ou selecione uma música/álbum.");
      return;
    }
    setEnviando(true);
    try {
      let uploadedCapaUrl: string | null = null;
      if (capaUri) {
        uploadedCapaUrl = await enviarArquivoParaStorage({
          bucket: "publicacao_midia",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-post-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        foto_url: uploadedCapaUrl,
        descricao: descricao || null,
        musica_id: itemEscolhido?.tipo === "musica" ? itemEscolhido.id : null,
        album_id: itemEscolhido?.tipo === "album" ? itemEscolhido.id : null,
        status: comoRascunho ? "rascunho" : "ativo",
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

  const fotoPreview = capaUri;

  return (
    <View className="flex-col-reverse lg:flex-row gap-6 items-start w-full">
      {/* LEFT COLUMN */}
      <View className="flex-col gap-0 w-full lg:flex-[7] bg-[#141a24]/80 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Card Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/5">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
              <Sparkles size={16} color="#34d399" />
            </View>
            <View>
              <Text className="text-white text-sm font-bold">Nova Publicação na Cena</Text>
              <Text className="text-[11px] text-[#64748B]">Atualizações para fãs, bastidores e novidades</Text>
            </View>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Text className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">FEED DA CENA</Text>
          </View>
        </View>

        <View className="p-5 flex-col gap-5">
          {/* Legenda */}
          <View className="flex-col gap-1.5">
            <Text className="text-sm font-semibold text-white">Legenda da Publicação</Text>
            <TextInput
              className="bg-[#0a0e16] border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl min-h-[100px]"
              placeholder="O que você deseja compartilhar hoje com a cena?"
              placeholderTextColor="#4B5563"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Mídia */}
          <View className="flex-col gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Mídia da Publicação</Text>
              <Text className="text-[11px] text-[#64748B]">Opcional</Text>
            </View>
            {capaUri ? (
              <View className="relative rounded-xl overflow-hidden">
                <Image source={{ uri: capaUri }} className="w-full aspect-square rounded-xl" resizeMode="cover" />
                <Pressable
                  onPress={() => setCapaUri(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-white/20 items-center justify-center"
                >
                  <X size={16} color="white" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={escolherFoto}
                className="rounded-xl bg-[#0a0e16] border border-dashed border-white/10 p-8 flex-col items-center justify-center overflow-hidden"
              >
                <View className="w-12 h-12 rounded-xl bg-[#1a2035] items-center justify-center mb-3">
                  <ImageIcon size={22} color="#34d399" />
                </View>
                <Text className="text-white font-semibold text-sm mb-1">Selecione uma imagem</Text>
                <Text className="text-xs text-[#64748B] text-center mb-4">Ou escolha um item do catálogo abaixo para importar a arte automaticamente.</Text>
                <View className="flex-row items-center gap-2 bg-[#1a2035] border border-white/10 rounded-lg px-4 py-2">
                  <Upload size={14} color="#94A3B8" />
                  <Text className="text-[#94A3B8] text-xs font-medium">Anexar foto</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Divulgar catálogo */}
          {(minhasMusicas.length > 0 || meusAlbuns.length > 0) && (
            <View className="flex-col gap-2 pt-2 border-t border-white/5">
              <View>
                <Text className="text-sm font-semibold text-white">Divulgar item do seu catálogo (opcional)</Text>
                <Text className="text-xs text-[#64748B] mt-0.5">Selecionar preenche o post com as informações do item.</Text>
              </View>
              <View className="flex-col gap-2 pt-1">
                {meusAlbuns.map((a) => {
                  const sel = itemEscolhido?.id === a.id;
                  return (
                    <Pressable
                      key={`album-${a.id}`}
                      onPress={() => escolher("album", a)}
                      className={`flex-row items-center justify-between p-3.5 rounded-xl border transition-all ${sel ? "bg-[#3B82F6]/10 border-[#3B82F6]/40" : "bg-[#0a0e16]/80 border-white/10"}`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className={`w-10 h-10 rounded-lg items-center justify-center ${sel ? "bg-blue-900/30 border border-blue-500/30" : "bg-white/5"}`}>
                          <Disc size={18} color={sel ? "#3B82F6" : "#94A3B8"} />
                        </View>
                        <View>
                          <Text className="text-sm font-semibold text-white">{a.nome}</Text>
                          <Text className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-bold">ÁLBUM</Text>
                        </View>
                      </View>
                      <View className={`w-5 h-5 rounded-full border items-center justify-center ${sel ? "bg-[#3B82F6] border-[#3B82F6]" : "border-white/20"}`}>
                        {sel && <Check size={12} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
                {minhasMusicas.map((m) => {
                  const sel = itemEscolhido?.id === m.id;
                  return (
                    <Pressable
                      key={`musica-${m.id}`}
                      onPress={() => escolher("musica", m)}
                      className={`flex-row items-center justify-between p-3.5 rounded-xl border transition-all ${sel ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[#0a0e16]/80 border-white/10"}`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className={`w-10 h-10 rounded-lg items-center justify-center ${sel ? "bg-emerald-900/30 border border-emerald-500/30" : "bg-white/5"}`}>
                          <Music size={18} color={sel ? "#34d399" : "#94A3B8"} />
                        </View>
                        <View>
                          <Text className="text-sm font-semibold text-white">{m.nome}</Text>
                          <Text className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-bold">MÚSICA • SINGLE</Text>
                        </View>
                      </View>
                      <View className={`w-5 h-5 rounded-full border items-center justify-center ${sel ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}>
                        {sel && <Check size={12} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Ações */}
          <View className="flex-row items-center justify-between pt-4 border-t border-white/5">
            {erro && <Text className="text-red-400 text-xs font-medium mb-3">{erro}</Text>}
            {sucesso && <Text className="text-emerald-400 text-xs font-medium mb-3">Publicação salva!</Text>}

            <View className="flex-row items-center justify-between w-full">
              <Pressable
                onPress={() => publicar(true)}
                disabled={enviando}
                className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:opacity-70"
              >
                <Text className="text-white text-xs font-semibold">Salvar Rascunho</Text>
              </Pressable>

              <Pressable
                onPress={() => publicar(false)}
                disabled={enviando}
                className="flex-row items-center gap-2 px-7 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 shadow-[0_0_24px_rgba(37,99,235,0.4)] active:opacity-90"
              >
                {enviando ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Sparkles size={15} color="white" />
                    <Text className="text-white font-semibold text-sm">Postar no Feed</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* RIGHT COLUMN: PREVIEW */}
      <View className="flex w-full lg:flex-[5] flex-col gap-4 lg:sticky top-4">
        <View className="bg-[#141a24]/80 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/5">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Como aparecerá no Feed</Text>
            </View>
            <Text className="text-[11px] text-[#64748B]">Feed da Cena</Text>
          </View>

          {/* Feed card mockup */}
          <View className="p-5 flex-col gap-3">
            {/* User header */}
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center">
                <Text className="text-white font-bold text-sm">M</Text>
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-bold text-white">Seu Perfil</Text>
                  <View className="px-1.5 py-0.5 rounded bg-[#3B82F6]/20">
                    <Text className="text-[10px] text-[#3B82F6] font-bold">MÚSICO</Text>
                  </View>
                </View>
                <Text className="text-[11px] text-[#64748B]">Agora mesmo</Text>
              </View>
            </View>

            {/* Post text */}
            <Text className="text-xs text-[#CBD5E1] leading-relaxed" numberOfLines={4}>
              {descricao || "Sua legenda aparecerá aqui para os fãs no feed..."}
            </Text>

            {/* Attached item */}
            {itemEscolhido && (
              <View className="p-3 rounded-xl bg-[#0a0e16] border border-[#3B82F6]/30 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-12 h-12 rounded-lg bg-gradient-to-tr from-blue-800 to-indigo-700 items-center justify-center">
                    {itemEscolhido.tipo === "album"
                      ? <Disc size={20} color="white" />
                      : <Music size={20} color="white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-white" numberOfLines={1}>{itemEscolhido.nome}</Text>
                    <Text className="text-[11px] text-[#3B82F6] font-bold">
                      {itemEscolhido.tipo === "album" ? "Álbum" : "Música • Single"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Photo preview */}
            {capaUri && (
              <View className="w-full aspect-square rounded-xl overflow-hidden">
                <Image source={{ uri: capaUri }} className="w-full h-full" resizeMode="cover" />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
      quality: 0.8,
    });
    if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
  }

  async function publicar(comoRascunho: boolean) {
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
        status: comoRascunho ? "rascunho" : "ativo",
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
      <View className="flex-1 bg-[#0B101E] items-center justify-center px-8 py-20">
        <View className="bg-[#141a24]/80 border border-white/5 p-8 rounded-3xl items-center w-full max-w-md shadow-2xl backdrop-blur-xl">
          <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center mb-4">
            <Calendar size={32} color="#34d399" />
          </View>
          <Text className="text-white text-lg font-bold text-center mb-2">Nenhum evento ativo</Text>
          <Text className="text-[#94A3B8] text-center text-sm leading-relaxed">
            Crie um evento na aba "Evento" primeiro para poder divulgá-lo no feed para o público da sua cidade.
          </Text>
        </View>
      </View>
    );
  }

  const eventoSelecionadoObj = meusEventos.find(e => e.id === eventoId);

  return (
    <View className="flex-col-reverse lg:flex-row gap-8 items-start w-full">
      {/* LEFT COLUMN: FORM SECTION */}
      <View className="flex-col gap-5 w-full lg:flex-[7]">
        <View className="bg-[#141a24]/70 rounded-2xl p-6 flex-col gap-6 shadow-2xl border border-white/5 backdrop-blur-xl">
          <View className="flex-row items-center justify-between pb-2 border-b border-white/5">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                <Sparkles size={18} color="#34d399" />
              </View>
              <View>
                <Text className="text-white text-lg font-bold">Publicação</Text>
                <Text className="text-xs text-[#94A3B8]">Feed do Organizador</Text>
              </View>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Text className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">POST • FEED</Text>
            </View>
          </View>

          {/* Event Selection */}
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-white">Vincular a um Evento (Obrigatório)</Text>
            <View className="flex-col gap-2">
              {meusEventos.map((e) => {
                const selecionado = eventoId === e.id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setEventoId(e.id)}
                    className={`bg-[#0a0e16]/80 p-3.5 rounded-xl flex-row items-center justify-between gap-3 border transition-all ${selecionado ? "border-emerald-500/50" : "border-white/5 hover:border-white/20"}`}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className={`w-10 h-10 rounded-lg items-center justify-center ${selecionado ? "bg-emerald-500/20" : "bg-white/5"}`}>
                        <Calendar size={18} color={selecionado ? "#34d399" : "#94A3B8"} />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-sm font-bold truncate ${selecionado ? "text-emerald-400" : "text-white"}`}>{e.nome}</Text>
                        <Text className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{e.data}</Text>
                      </View>
                    </View>
                    {selecionado ? (
                      <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        <Check size={12} color="#fff" />
                      </View>
                    ) : (
                      <View className="w-5 h-5 rounded-full border border-white/20" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Custom Banner Upload */}
          <View className="flex-col gap-2 pt-2 border-t border-white/5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Capa Alternativa (Opcional)</Text>
            </View>
            <Pressable
              onPress={escolherFoto}
              className="group overflow-hidden rounded-xl bg-[#0a0e16]/80 border border-dashed border-white/15 p-6 flex-col items-center justify-center text-center hover:border-emerald-500/50 hover:bg-[#101726]/60 transition-all"
            >
              {fotoUri ? (
                <ImageBackground source={{ uri: fotoUri }} className="w-full aspect-square rounded-xl shadow-lg" resizeMode="cover" />
              ) : (
                <>
                  <View className="w-12 h-12 rounded-full bg-[#182030] items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-emerald-600 transition-all shadow-md">
                    <ImageIcon size={24} color="#34d399" />
                  </View>
                  <Text className="text-white font-medium text-sm mb-0.5">Substituir capa no feed</Text>
                  <Text className="text-xs text-[#8D90A0] max-w-[200px] mb-3">Opcional. Se não enviar, usaremos a capa original do evento.</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Post Description */}
          <View className="flex-col gap-1.5 pt-2 border-t border-white/5">
            <Text className="text-sm font-semibold text-white">Legenda do Post</Text>
            <TextInput
              className="bg-[#0a0e16]/75 border border-white/10 w-full text-white text-sm px-4 py-3 rounded-xl focus:border-emerald-500 min-h-[100px]"
              placeholder="Escreva sobre o evento, atualizações, line-up..."
              placeholderTextColor="#64748B"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
            />
          </View>

          {erro && <Text className="text-red-400 text-center font-medium text-xs">{erro}</Text>}
          {sucesso && <Text className="text-emerald-400 text-center font-medium text-xs">Publicação salva com sucesso!</Text>}

          {/* Actions */}
          <View className="flex-row items-center justify-end gap-3 pt-2 border-t border-white/5">
            <Pressable
              onPress={() => publicar(true)}
              disabled={enviando}
              className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all"
            >
              <Text className="text-white text-sm font-semibold">Salvar Rascunho</Text>
            </Pressable>

            <Pressable
              onPress={() => publicar(false)}
              disabled={enviando}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 flex-row items-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition-all"
            >
              {enviando ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text className="text-white text-sm font-semibold">Postar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* RIGHT COLUMN: PREVIEW */}
      <View className="flex flex-col gap-5 w-full lg:flex-[5] lg:sticky top-8">
        <View className="bg-[#141a24]/70 rounded-2xl p-6 flex-col gap-4 shadow-2xl border border-white/5 backdrop-blur-xl relative overflow-hidden">
          <View className="flex-row items-center justify-between pb-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <Text className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Preview do Post</Text>
            </View>
            <Text className="text-xs text-[#94A3B8]">Feed Principal</Text>
          </View>

          {/* User Header */}
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
              <UserSearch size={16} color="#fff" />
            </View>
            <View>
              <Text className="text-white font-bold text-sm">Seu Perfil</Text>
              <Text className="text-emerald-400 text-[10px] font-bold tracking-wider">ORGANIZADOR</Text>
            </View>
          </View>

          <Text className="text-sm text-white/90 leading-relaxed">
            {descricao || "Sua legenda aparecerá aqui..."}
          </Text>

          {/* Attachment Preview */}
          <View className="mt-1 bg-[#101520] rounded-2xl overflow-hidden border border-white/5">
            {fotoUri ? (
              <ImageBackground source={{ uri: fotoUri }} className="w-full aspect-square" resizeMode="cover" />
            ) : (
              <View className="w-full aspect-square bg-white/5 items-center justify-center">
                <ImageIcon size={32} color="#ffffff20" />
                <Text className="text-[#ffffff40] text-xs font-semibold mt-2">Capa do Evento</Text>
              </View>
            )}
            
            {eventoId && eventoSelecionadoObj && (
              <View className="p-4 bg-[#141a24]">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Calendar size={12} color="#34d399" />
                  <Text className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Evento Vinculado</Text>
                </View>
                <Text className="text-white font-bold text-sm">{eventoSelecionadoObj.nome}</Text>
                <Text className="text-[#94A3B8] text-xs">{eventoSelecionadoObj.data}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
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
