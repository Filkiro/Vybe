import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  Image,
  useWindowDimensions,
  StyleSheet,
  Modal,
  Pressable,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ModalEventoDetalhes, EventoDetalhado } from "../../components/ModalEventoDetalhes";
import {
  Camera,
  LogOut,
  BarChart3,
  Music,
  LifeBuoy,
  Trash2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Play,
  Heart,
  MoreVertical,
  Calendar,
  Disc,
  Plus,
  MapPin,
  Clock,
  Settings,
  Rss,
  Info
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { supabase, PerfilMusico, PerfilOrganizador } from "../../lib/supabase";
import { useAuthStore, ehContaComum } from "../../store/authStore";
import { enviarArquivoParaStorage } from "../../lib/upload";
import { usePlayerStore } from "../../store/playerStore";
import { AppLogo } from "../../components/AppLogo";
import { colors, rotulosTipoConta } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

export default function Perfil() {
  const usuario = useAuthStore((s) => s.usuario);
  const router = useRouter();
  const [aba, setAba] = useState<"biblioteca" | "dados">("biblioteca");
  const paddingBottom = usePlayerAwarePadding(140);

  async function handleLogout() {
    usePlayerStore.getState().resetar();
    await supabase.auth.signOut();
    router.replace("/(tabs)/home");
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-[#0B101E] items-center justify-center px-8">
        <AppLogo />
        <Text className="text-xl font-bold text-textDark text-center mt-6 mb-2">
          Sua jornada musical começa aqui
        </Text>
        <Text className="text-muted text-center mb-8 leading-relaxed">
          Entre ou crie uma conta para acessar seu perfil, gerenciar sua biblioteca e conectar-se.
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
          className="bg-primary rounded-2xl py-4 items-center w-full mb-3  "
        >
          <Text className="text-white font-bold text-base">Criar conta</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/entrar?aba=login")}
          className="bg-card border border-border rounded-2xl py-4 items-center w-full"
        >
          <Text className="text-textDark font-semibold">Já tenho conta — Entrar</Text>
        </Pressable>
      </View>
    );
  }

  const temBiblioteca = ehContaComum(usuario);

  return (
    <View className="flex-1 bg-[#0B101E]">
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner + Hero do Perfil */}
        <CabecalhoPerfil usuario={usuario} />

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        {temBiblioteca ? (
          <View className="px-4 mt-2">
            {/* Seletor de Abas Estilo Segmented Control */}
            <View className="flex-row items-center justify-between gap-4 mb-6 z-10">
              <View className="flex-row p-1.5 rounded-full bg-white/5 border border-white/10">
                <Pressable
                  onPress={() => setAba("biblioteca")}
                  className={`flex-row items-center gap-2 px-6 py-2 rounded-full transition-all ${
                    aba === "biblioteca" ? "bg-[#3B82F6]" : "bg-transparent"
                  }`}
                  style={aba === "biblioteca" ? { shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16 } : undefined}
                >
                  <Music size={16} color={aba === "biblioteca" ? "white" : "#94A3B8"} />
                  <Text
                    className={`font-bold text-xs ${
                      aba === "biblioteca" ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Sua Biblioteca
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAba("dados")}
                  className={`flex-row items-center gap-2 px-6 py-2 rounded-full transition-all ${
                    aba === "dados" ? "bg-[#3B82F6]" : "bg-transparent"
                  }`}
                  style={aba === "dados" ? { shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16 } : undefined}
                >
                  <UserCheck size={16} color={aba === "dados" ? "white" : "#94A3B8"} />
                  <Text
                    className={`font-bold text-xs ${
                      aba === "dados" ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Dados Pessoais
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Conteúdo da Aba */}
            {aba === "biblioteca" ? (
              <BibliotecaPropria tipoConta={usuario.tipo_conta} usuarioId={usuario.id} />
            ) : (
              <View>
                {usuario.tipo_conta === "musico" ? (
                  <FormularioMusico usuarioId={usuario.id} />
                ) : (
                  <FormularioOrganizador usuarioId={usuario.id} />
                )}
              </View>
            )}
          </View>
        ) : (
          /* Card Especial para ADM / Moderador */
          <View className="px-4 mt-4">
            <View className="bg-card border border-border/80 rounded-3xl p-6 items-center text-center">
              <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-3">
                <ShieldCheck color={colors.primary} size={26} />
              </View>
              <Text className="text-base font-bold text-textDark mb-1">
                Painel Administrativo
              </Text>
              <Text className="text-muted text-xs text-center leading-relaxed">
                Conta de <Text className="font-semibold text-textDark">{rotulosTipoConta[usuario.tipo_conta]}</Text>. Utilize as abas dedicadas de{" "}
                <Text className="text-primary font-semibold">
                  {usuario.tipo_conta === "adm" ? "Painel" : "Moderação"}
                </Text>{" "}
                para gerenciar os recursos da plataforma.
              </Text>
            </View>
          </View>
        )}



        {/* BOTÃO DE SAIR */}
        <View className="px-4 mt-8 pb-8 items-center justify-center">
          <Pressable
            onPress={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 rounded-full px-8 py-3 flex-row items-center justify-center gap-2 transition-colors"
          >
            <LogOut color="#EF4444" size={18} />
            <Text className="text-red-500 font-bold text-sm">Encerrar Sessão da Conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CabecalhoPerfil({ usuario }: { usuario: any }) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [apelido, setApelido] = useState<string | null>(null);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const [totalMusicas, setTotalMusicas] = useState(0);
  const [totalShows, setTotalShows] = useState(0);
  const ehMusico = usuario.tipo_conta === "musico";
  const ehOrganizador = usuario.tipo_conta === "organizador";
  const tabelaPerfil = ehMusico ? "perfil_musico" : ehOrganizador ? "perfil_organizador" : null;

  useEffect(() => {
    if (!tabelaPerfil) return;
    supabase
      .from(tabelaPerfil)
      .select(ehMusico ? "foto_url, banner_url, apelido, disponivel" : "banner_url")
      .eq("usuario_id", usuario.id)
      .single()
      .then(({ data }) => {
        if (ehMusico) {
          setFotoUrl((data as any)?.foto_url ?? null);
          setDisponivel((data as any)?.disponivel ?? null);
          setApelido((data as any)?.apelido ?? null);
          supabase.from("musica").select("id", { count: "exact" }).eq("usuario_id", usuario.id).eq("status", "ativo").then(({ count }) => setTotalMusicas(count || 0));
          supabase.from("evento_convite").select("id", { count: "exact" }).eq("musico_id", usuario.id).eq("status", "aceito").then(({ count }) => setTotalShows(count || 0));
        }
        setBannerUrl((data as any)?.banner_url ?? null);
      });
  }, [usuario.id, tabelaPerfil]);

  async function trocarFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    setEnviandoFoto(true);
    try {
      const url = await enviarArquivoParaStorage({
        bucket: "foto_perfil",
        uri: resultado.assets[0].uri,
        nomeArquivo: `${usuario.id}.jpg`,
        contentType: "image/jpeg",
      });

      const { error } = await supabase
        .from("perfil_musico")
        .update({ foto_url: url })
        .eq("usuario_id", usuario.id);

      if (error) throw error;
      setFotoUrl(url);
    } catch (e) {
      console.error("Erro ao atualizar foto de perfil:", e);
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function trocarBanner() {
    if (!tabelaPerfil) return;
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    setEnviandoBanner(true);
    try {
      const url = await enviarArquivoParaStorage({
        bucket: "banner_perfil",
        uri: resultado.assets[0].uri,
        nomeArquivo: `${usuario.id}.jpg`,
        contentType: "image/jpeg",
      });

      const { error } = await supabase.from(tabelaPerfil).update({ banner_url: url }).eq("usuario_id", usuario.id);

      if (error) throw error;
      setBannerUrl(url);
    } catch (e) {
      console.error("Erro ao atualizar banner de perfil:", e);
    } finally {
      setEnviandoBanner(false);
    }
  }

  return (
    <View className="mb-4 relative">
      {/* Banner */}
      <View pointerEvents="none" className="h-64 sm:h-72 w-full overflow-hidden bg-surface relative">
        {bannerUrl ? (
          <Image source={{ uri: bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <>
            <View className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-primary/25 blur-2xl" />
            <View className="absolute top-0 right-0 w-56 h-56 rounded-full bg-blue-600/15 blur-3xl" />
            <BlurView intensity={30} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
          </>
        )}
        
        {/* Camada de escurecimento suave geral */}
        <View className="absolute inset-0 bg-black/10" />

        {/* Gradiente inferior para mesclar com o background do app (#0B101E) */}
        <View className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0B101E] via-[#0B101E]/60 to-transparent" />
      </View>

      {tabelaPerfil && (
        <Pressable
          onPress={trocarBanner}
          disabled={enviandoBanner}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ position: "absolute", top: 16, right: 16, zIndex: 20, elevation: 20 }}
          className="bg-black/60 rounded-full p-2 border border-white/20 flex-row items-center gap-1.5 px-3 active:bg-black/80"
        >
          <Camera color="white" size={14} />
          <Text className="text-white text-[11px] font-semibold uppercase tracking-wide">
            {enviandoBanner ? "Enviando..." : bannerUrl ? "Trocar banner" : "Adicionar banner"}
          </Text>
        </Pressable>
      )}

      {/* Overlay com detalhes (Avatar, Nome, Badges, Botões e Métricas) */}
      <View className="px-4 -mt-20 relative z-10">
        <View className="flex-col xl:flex-row xl:items-end justify-between gap-4">
          {/* Esquerda: Avatar e Info */}
          <View className="flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left flex-1 shrink min-w-0">
            {/* Avatar com borda */}
            <Pressable onPress={ehMusico ? trocarFoto : undefined} disabled={!ehMusico || enviandoFoto}>
              <View className="relative">
                <View className="w-36 h-36 rounded-full p-1 bg-primary/20">
                  <View className="w-full h-full rounded-full overflow-hidden bg-[#0B101E] border-4 border-[#0B101E]">
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full bg-surface items-center justify-center">
                        <Text className="text-4xl font-extrabold text-muted">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {/* Ícone de Verificado */}
                <View className="absolute bottom-2 right-4 w-6 h-6 rounded-full bg-[#3B82F6] items-center justify-center border-2 border-[#0B101E]">
                  <UserCheck color="white" size={12} />
                </View>
                
                {ehMusico && (
                  <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera color="white" size={28} />
                  </View>
                )}
              </View>
            </Pressable>

            {/* Nome e Tags */}
            <View className="items-center sm:items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-3xl sm:text-4xl font-black text-textDark tracking-tight">
                  {usuario.nome}
                </Text>
                {apelido && <Text className="text-muted font-medium text-sm">(@{apelido})</Text>}
              </View>

              <View className="flex-row flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10">
                  {usuario.tipo_conta === "musico" && <Sparkles size={12} color={colors.primary} />}
                  {usuario.tipo_conta === "organizador" && <UserCheck size={12} color={colors.primary} />}
                  {(usuario.tipo_conta === "adm" || usuario.tipo_conta === "moderador") && (
                    <ShieldCheck size={12} color={colors.primary} />
                  )}
                  <Text className="text-primary text-xs font-semibold capitalize">
                    {rotulosTipoConta[usuario.tipo_conta]}
                  </Text>
                </View>

                {usuario.tipo_conta === "musico" && disponivel !== null && (
                  <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10">
                    <View className={`w-2 h-2 rounded-full ${disponivel ? "bg-green-500" : "bg-red-500"}`} />
                    <Text className="text-textDark text-xs font-semibold">
                      {disponivel ? "Disponível para contratar" : "Indisponível"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Direita: Botões */}
          <View className="flex-row flex-wrap items-center justify-center gap-2 mb-2">
            <Pressable
              onPress={() => {
                Share.share({
                  message: `Confira meu perfil no Vybe: https://vybe.app/usuario/${usuario.id}`,
                });
              }}
              className="flex-row items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 active:bg-white/20"
            >
              <Text className="text-textDark text-xs font-bold">Compartilhar</Text>
            </Pressable>
          </View>
        </View>

        {/* Faixa de Métricas */}
        {ehMusico && (
          <View className="flex-row items-center gap-8 mt-6 pt-4 border-t border-white/10 bg-black/20 p-4 rounded-xl">
            <View className="flex-col items-center sm:items-start px-2">
              <Text className="text-2xl font-black text-textDark">{totalMusicas}</Text>
              <Text className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Faixas lançadas</Text>
            </View>
            <View className="flex-col items-center sm:items-start px-2">
              <Text className="text-2xl font-black text-primary">{totalShows} {totalShows === 1 ? "Show" : "Shows"}</Text>
              <Text className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Confirmados</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function ItemMenu({
  icone,
  titulo,
  subtitulo,
  onPress,
  ultimo = false,
}: {
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  onPress: () => void;
  ultimo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between p-4 active:bg-surface/60 ${
        !ultimo ? "border-b border-border/50" : ""
      }`}
    >
      <View className="flex-row items-center gap-3.5 flex-1">
        <View className="w-10 h-10 rounded-2xl bg-surface items-center justify-center border border-border/40">
          {icone}
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-textDark font-bold text-sm">{titulo}</Text>
          <Text className="text-muted text-[11px] mt-0.5">{subtitulo}</Text>
        </View>
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
  );
}

const LARGURA_IDEAL_CARD = 160;
const MAX_COLUNAS = 6;
const LIMITE_PREVIA = 6;

function BibliotecaPropria({ tipoConta, usuarioId }: { tipoConta: string; usuarioId: string }) {
  if (tipoConta === "musico") return <BibliotecaMusico usuarioId={usuarioId} />;
  return <BibliotecaOrganizador usuarioId={usuarioId} />;
}

function BibliotecaMusico({ usuarioId }: { usuarioId: string }) {
  const [musicas, setMusicas] = useState<any[]>([]);
  const [albuns, setAlbuns] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const router = useRouter();
  const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("musica")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .order("data_lancamento", { ascending: false })
      .then(({ data }) => setMusicas(data ?? []));
    supabase
      .from("album")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .then(({ data }) => setAlbuns(data ?? []));
    supabase
      .from("evento_convite")
      .select("id, evento:evento_id(*)")
      .eq("musico_id", usuarioId)
      .eq("status", "aceito")
      .then(({ data }) => setEventos((data ?? []).map((d: any) => d.evento).filter(Boolean)));
  }, [usuarioId]);

  return (
    <View className="pb-10 pt-4 flex-col gap-10">
      
      {/* SECTION: Minhas Músicas */}
      <View className="flex-col gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Music color="#3B82F6" size={22} />
            <Text className="text-lg font-semibold text-textDark">Minhas Músicas</Text>
            <View className="px-2 py-0.5 rounded-full bg-white/10 ml-1">
              <Text className="text-[#3B82F6] font-bold text-xs">{musicas.length}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push("/biblioteca/musicas")} className="flex-row items-center gap-1">
            <Text className="text-xs text-[#3B82F6] uppercase font-bold tracking-wider hover:text-blue-400">Gerenciar Tudo</Text>
            <ChevronRight color="#3B82F6" size={16} />
          </Pressable>
        </View>

        <View className="flex-col gap-3">
          {musicas.slice(0, 4).map((m, idx) => (
            <Pressable
              key={m.id || idx}
              onPress={() => {
                const fila = musicas.map((mu) => ({
                  id: mu.id,
                  nome: mu.nome,
                  autorApelido: null,
                  arquivoUrl: mu.arquivo_url,
                  capaUrl: mu.capa_url,
                }));
                tocarMusica(
                  { id: m.id, nome: m.nome, autorApelido: null, arquivoUrl: m.arquivo_url, capaUrl: m.capa_url },
                  fila
                );
                router.push("/tocando");
              }}
              className="flex-row items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <View className="flex-row items-center gap-4 flex-1">
                <View className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 relative">
                  {m.capa_url ? (
                    <Image source={{ uri: m.capa_url }} className="w-full h-full" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Music size={20} color="#94A3B8" />
                    </View>
                  )}
                  {/* Hover Overlay */}
                  <View className="absolute inset-0 bg-black/50 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <View className="w-8 h-8 rounded-full bg-[#3B82F6] items-center justify-center shadow-lg">
                      <Play color="white" size={16} fill="white" />
                    </View>
                  </View>
                </View>
                <View className="flex-1 justify-center">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-textDark group-hover:text-[#3B82F6] transition-colors">{m.nome}</Text>
                    <View className="px-2 py-0.5 rounded-full bg-[#3B82F6]/20">
                      <Text className="text-[#3B82F6] text-[10px] font-bold">{m.status || "Ativo"}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-400 mt-1">{m.genero || "Original"}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable className="p-2 rounded-full hover:bg-white/10">
                  <Heart size={20} color="#94A3B8" />
                </Pressable>
                <Pressable className="p-2 rounded-full hover:bg-white/10">
                  <MoreVertical size={20} color="#94A3B8" />
                </Pressable>
              </View>
            </Pressable>
          ))}
          {musicas.length === 0 && (
            <Text className="text-muted text-xs text-center p-4">Você ainda não publicou nenhuma música.</Text>
          )}
        </View>
      </View>

      {/* SECTION: Meus Álbuns */}
      <View className="flex-col gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Disc color="#3B82F6" size={22} />
            <Text className="text-lg font-semibold text-textDark">Meus Álbuns & EPs</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push("/biblioteca/albuns")} className="flex-row items-center gap-1">
              <Text className="text-xs text-[#3B82F6] uppercase font-bold tracking-wider hover:text-blue-400">Ver Todos</Text>
              <ChevronRight color="#3B82F6" size={16} />
            </Pressable>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-4">
          {albuns.slice(0, 3).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/album/${item.id}`)}
              style={{ width: "31%", minWidth: 150 }}
              className="group rounded-2xl bg-white/5 border border-white/5 p-4 flex-col justify-between hover:bg-white/10 shadow-lg"
            >
              <View className="w-full aspect-square rounded-xl overflow-hidden mb-4 relative">
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <View className="w-full h-full bg-white/10 items-center justify-center">
                    <Disc color="#94A3B8" size={32} />
                  </View>
                )}
                {/* Play Button Overlay */}
                <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <View className="w-10 h-10 rounded-full bg-[#3B82F6] items-center justify-center shadow-lg">
                    <Play color="white" size={20} fill="white" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </View>
              <View>
                <Text numberOfLines={1} className="font-semibold text-textDark text-sm group-hover:text-[#3B82F6] transition-colors">
                  {item.nome}
                </Text>
                <Text numberOfLines={1} className="text-xs text-gray-400 mt-1">
                  Álbum • {new Date(item.criado_em).getFullYear()}
                </Text>
              </View>
            </Pressable>
          ))}
          {albuns.length === 0 && (
            <Text className="text-muted text-xs p-4">Nenhum álbum criado.</Text>
          )}
        </View>
      </View>

      {/* SECTION: Eventos Contratados */}
      <View className="flex-col gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Calendar color="#3B82F6" size={22} />
            <Text className="text-lg font-semibold text-textDark">Shows Confirmados & Contratos</Text>
          </View>
          <Pressable onPress={() => router.push("/meus-eventos")} className="flex-row items-center gap-1">
            <Text className="text-xs text-[#3B82F6] uppercase font-bold tracking-wider hover:text-blue-400">Agenda Completa</Text>
            <ChevronRight color="#3B82F6" size={16} />
          </Pressable>
        </View>

        <View className="flex-col gap-4">
          {eventos.slice(0, 1).map((item) => {
            const dataObj = item.data ? new Date(item.data + "T12:00:00Z") : new Date();
            const mes = dataObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
            const dia = dataObj.getDate();
            const ano = dataObj.getFullYear();
            
            return (
              <View key={item.id} className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <View className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl" />
                
                <View className="flex-row items-center gap-4 flex-1">
                  {/* Calendar Badge */}
                  <View className="flex-col items-center justify-center w-16 h-16 rounded-xl bg-white/10 shadow-inner">
                    <Text className="text-[10px] text-[#3B82F6] uppercase font-black tracking-widest">{mes}</Text>
                    <Text className="text-xl font-bold text-textDark leading-tight">{dia}</Text>
                    <Text className="text-[8px] text-gray-400">{ano}</Text>
                  </View>

                  {/* Event Details */}
                  <View className="flex-col gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-textDark text-sm">{item.nome}</Text>
                      <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20">
                        <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <Text className="text-green-500 text-[10px] font-bold">Participando</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-4 mt-1">
                      <View className="flex-row items-center gap-1">
                        <MapPin color="#3B82F6" size={14} />
                        <Text className="text-gray-400 text-xs">{item.localizacao || "Local a definir"}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Clock color="#94A3B8" size={14} />
                        <Text className="text-gray-400 text-xs">{item.horario || "Não definido"}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => setEventoSelecionado(item)} className="px-4 py-2 rounded-full bg-[#3B82F6] hover:scale-105 transition-transform">
                    <Text className="text-white text-xs font-bold">Mostrar Detalhes</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {eventos.length === 0 && (
             <Text className="text-muted text-xs p-4">Nenhum show confirmado.</Text>
          )}
        </View>
      </View>

      {/* SECTION: Navegação Rápida */}
      <View className="flex-col gap-4">
        <Text className="text-lg font-semibold text-textDark">Navegação Rápida do Artista</Text>
        <View className="flex-row flex-wrap gap-4">
          
          <Pressable onPress={() => router.push("/dashboard")} style={{ width: "31%", minWidth: 200 }} className="group rounded-2xl bg-white/5 border border-white/5 p-5 flex-col justify-between hover:bg-white/10 transition-colors">
            <View className="flex-col gap-3">
              <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center group-hover:bg-[#3B82F6] transition-colors">
                <BarChart3 color="white" size={24} />
              </View>
              <Text className="font-semibold text-textDark text-sm group-hover:text-[#3B82F6] transition-colors">Dashboard de Desempenho</Text>
              <Text className="text-xs text-gray-400">Acompanhe ouvintes únicos diários, royalties e mais.</Text>
            </View>
            <View className="flex-row items-center gap-1 mt-4">
              <Text className="text-xs text-[#3B82F6] font-bold group-hover:translate-x-1 transition-transform">Abrir métricas</Text>
              <ChevronRight color="#3B82F6" size={14} className="group-hover:translate-x-1 transition-transform" />
            </View>
          </Pressable>

          <Pressable onPress={() => router.push("/minhas-publicacoes")} style={{ width: "31%", minWidth: 200 }} className="group rounded-2xl bg-white/5 border border-white/5 p-5 flex-col justify-between hover:bg-white/10 transition-colors">
            <View className="flex-col gap-3">
              <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center group-hover:bg-[#3B82F6] transition-colors">
                <Rss color="white" size={24} />
              </View>
              <Text className="font-semibold text-textDark text-sm group-hover:text-[#3B82F6] transition-colors">Minhas Publicações & Feed</Text>
              <Text className="text-xs text-gray-400">Gerencie postagens na timeline e atualizações.</Text>
            </View>
            <View className="flex-row items-center gap-1 mt-4">
              <Text className="text-xs text-[#3B82F6] font-bold group-hover:translate-x-1 transition-transform">Criar publicação</Text>
              <ChevronRight color="#3B82F6" size={14} className="group-hover:translate-x-1 transition-transform" />
            </View>
          </Pressable>

          <Pressable onPress={() => router.push("/suporte")} style={{ width: "31%", minWidth: 200 }} className="group rounded-2xl bg-white/5 border border-white/5 p-5 flex-col justify-between hover:bg-white/10 transition-colors">
            <View className="flex-col gap-3">
              <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center group-hover:bg-[#3B82F6] transition-colors">
                <LifeBuoy color="white" size={24} />
              </View>
              <Text className="font-semibold text-textDark text-sm group-hover:text-[#3B82F6] transition-colors">Central de Ajuda & Termos</Text>
              <Text className="text-xs text-gray-400">Políticas de contratação, faturamento e suporte.</Text>
            </View>
            <View className="flex-row items-center gap-1 mt-4">
              <Text className="text-xs text-[#3B82F6] font-bold group-hover:translate-x-1 transition-transform">Falar com o suporte</Text>
              <ChevronRight color="#3B82F6" size={14} className="group-hover:translate-x-1 transition-transform" />
            </View>
          </Pressable>

        </View>
      </View>
      <ModalEventoDetalhes eventoSelecionado={eventoSelecionado as any} onFechar={() => setEventoSelecionado(null)} />

    </View>
  );
}

function BibliotecaOrganizador({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [eventos, setEventos] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("evento")
      .select("id, nome, data, localizacao, status")
      .eq("organizador_id", usuarioId)
      .order("data", { ascending: true })
      .then(({ data }) => setEventos(data ?? []));
  }, [usuarioId]);

  return (
    <View className="pt-1">
      {eventos.length === 0 && (
        <View className="bg-card/40 border border-border/50 rounded-2xl p-6 items-center">
          <Text className="text-muted text-center text-xs">
            Você ainda não criou nenhum evento. Toque em "Criar" para começar.
          </Text>
        </View>
      )}
      {eventos.map((item) => (
        <View
          key={item.id}
          className="bg-card border border-border/80 rounded-2xl p-4 mb-3 flex-row items-center justify-between "
        >
          <View className="flex-1 pr-3">
            <Text className="font-bold text-textDark text-sm">{item.nome}</Text>
            <Text className="text-muted text-xs mt-1">
              {item.data} · {item.localizacao ?? "Local a definir"}
            </Text>
            <View className="self-start bg-primary/10 px-2 py-0.5 rounded-md mt-2">
              <Text className="text-primary text-[10px] font-bold capitalize">{item.status}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push(`/evento/editar/${item.id}`)}
            className="bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-2 active:bg-primary/20"
          >
            <Text className="text-primary text-xs font-bold">Gerenciar</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/* Campos de Formulário Modernos em Cards Clean */
function CampoTexto({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="bg-card border border-border/70 rounded-2xl p-3.5 mb-3">
      <Text className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        className="text-textDark font-medium text-sm p-0"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function ModalConfirmarExclusao({
  visivel,
  onCancelar,
  onConfirmar,
  excluindo,
}: {
  visivel: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  excluindo: boolean;
}) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <View className="flex-1 bg-black/75 items-center justify-center px-6">
        <View className="bg-card rounded-3xl p-6 w-full border border-border ">
          <View className="w-12 h-12 rounded-2xl bg-red-500/10 items-center justify-center self-center mb-4">
            <AlertTriangle color={colors.danger} size={24} />
          </View>

          <Text className="text-lg font-bold text-textDark text-center mb-2">
            Excluir sua conta?
          </Text>
          <Text className="text-muted text-xs text-center mb-6 leading-relaxed">
            Essa ação é permanente e não pode ser desfeita. Todos os seus dados, músicas, álbuns, eventos e conversas serão apagados.
          </Text>

          <Pressable
            onPress={onConfirmar}
            disabled={excluindo}
            className="bg-red-500 rounded-2xl py-3.5 items-center mb-2  -500/20"
          >
            <Text className="text-white font-bold text-xs">
              {excluindo ? "Excluindo..." : "Sim, excluir minha conta"}
            </Text>
          </Pressable>

          <Pressable onPress={onCancelar} disabled={excluindo} className="py-2.5 items-center">
            <Text className="text-textDark font-semibold text-xs">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function BotaoExcluirConta() {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmarExclusao() {
    setExcluindo(true);
    setErro(null);
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) throw error;

      setModalAberto(false);
      usePlayerStore.getState().resetar();
      await supabase.auth.signOut();
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível excluir a conta. Tente novamente.");
      setExcluindo(false);
    }
  }

  return (
    <View className="mt-6 pt-4 border-t border-border/50">
      <Pressable
        onPress={() => setModalAberto(true)}
        className="flex-row items-center justify-center gap-2 py-2"
      >
        <Trash2 color={colors.danger} size={15} />
        <Text className="text-red-500 font-bold text-xs">Excluir minha conta</Text>
      </Pressable>

      {erro && <Text className="text-red-500 text-xs text-center mt-1">{erro}</Text>}

      <ModalConfirmarExclusao
        visivel={modalAberto}
        onCancelar={() => setModalAberto(false)}
        onConfirmar={confirmarExclusao}
        excluindo={excluindo}
      />
    </View>
  );
}

function FormularioMusico({ usuarioId }: { usuarioId: string }) {
  const [perfil, setPerfil] = useState<PerfilMusico | null>(null);
  const [apelido, setApelido] = useState("");
  const [descricao, setDescricao] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [contatoExterno, setContatoExterno] = useState("");
  const [disponivel, setDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    supabase
      .from("perfil_musico")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single()
      .then(({ data }) => {
        setPerfil(data ?? null);
        setApelido(data?.apelido ?? "");
        setDescricao(data?.descricao ?? "");
        setGeneroMusical(data?.genero_musical ?? "");
        setLocalizacao(data?.localizacao ?? "");
        setContatoExterno(data?.contato_externo ?? "");
        setDisponivel(data?.disponivel ?? true);
      });
  }, [usuarioId]);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    await supabase
      .from("perfil_musico")
      .update({ apelido, descricao, genero_musical: generoMusical, localizacao, contato_externo: contatoExterno, disponivel })
      .eq("usuario_id", usuarioId);
    setSalvando(false);
    setSalvo(true);
  }

  if (!perfil) return <Text className="text-muted text-xs p-4">Carregando dados...</Text>;

  return (
    <View className="flex-col md:flex-row gap-6 pb-10">
      {/* Coluna Esquerda: Dados Pessoais */}
      <View className="flex-1 space-y-4">
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-textDark">Identidade do Músico</Text>
            <Text className="text-xs text-[#3B82F6] font-medium">Informações Públicas</Text>
          </View>

          <View className="flex-col gap-3">
            <CampoTexto label="Apelido / Nome Artístico" value={apelido} onChangeText={setApelido} />
            <CampoTexto label="Gênero Musical Principal" value={generoMusical} onChangeText={setGeneroMusical} />
            <CampoTexto label="Localização Atual" value={localizacao} onChangeText={setLocalizacao} />
            <CampoTexto label="Bio / Descrição do Artista" value={descricao} onChangeText={setDescricao} multiline />
          </View>
        </View>
      </View>

      {/* Coluna Direita: Configurações de Show */}
      <View className="flex-1 space-y-4 md:max-w-sm">
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
          <Text className="text-lg font-semibold text-textDark mb-4">Configuração de Shows</Text>

          {/* Toggle de Disponibilidade */}
          <View className="bg-black/20 rounded-xl p-4 flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-textDark">Disponível para contratação</Text>
              <Text className="text-xs text-gray-400 mt-1">Exibe o selo de contratação no perfil público</Text>
            </View>
            <Switch
              value={disponivel}
              onValueChange={setDisponivel}
              trackColor={{ false: "#1E293B", true: "#3B82F6" }}
              thumbColor="white"
            />
          </View>

          <View className="flex-col gap-3">
            <CampoTexto label="Contato Profissional / Assessoria" value={contatoExterno} onChangeText={setContatoExterno} />
          </View>

          {salvo && <Text className="text-green-500 text-xs font-bold text-center mt-4">Alterações salvas com sucesso!</Text>}

          <Pressable
            onPress={salvar}
            disabled={salvando}
            className="bg-[#3B82F6] rounded-full py-3.5 items-center mt-6 active:opacity-90 transition-opacity shadow-lg shadow-[#3B82F6]/30"
          >
            <Text className="text-white font-bold text-sm">
              {salvando ? "Salvando alterações..." : "Salvar Alterações"}
            </Text>
          </Pressable>

          <View className="mt-8">
            <BotaoExcluirConta />
          </View>
        </View>
      </View>
    </View>
  );
}

function FormularioOrganizador({ usuarioId }: { usuarioId: string }) {
  const [perfil, setPerfil] = useState<PerfilOrganizador | null>(null);
  const [descricao, setDescricao] = useState("");
  const [nichoTrabalho, setNichoTrabalho] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [contato, setContato] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    supabase
      .from("perfil_organizador")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single()
      .then(({ data }) => {
        setPerfil(data ?? null);
        setDescricao(data?.descricao ?? "");
        setNichoTrabalho(data?.nicho_trabalho ?? "");
        setLocalizacao(data?.localizacao ?? "");
        setContato(data?.contato ?? "");
      });
  }, [usuarioId]);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    await supabase
      .from("perfil_organizador")
      .update({ descricao, nicho_trabalho: nichoTrabalho, localizacao, contato })
      .eq("usuario_id", usuarioId);
    setSalvando(false);
    setSalvo(true);
  }

  if (!perfil) return <Text className="text-muted text-xs">Carregando dados...</Text>;

  return (
    <View>
      <CampoTexto label="Nicho de Trabalho / Eventos" value={nichoTrabalho} onChangeText={setNichoTrabalho} />
      <CampoTexto label="Localização / Região de Atuação" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto label="Descrição do Organizador" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto label="Contato Principal" value={contato} onChangeText={setContato} />

      {salvo && <Text className="text-green-500 text-xs font-bold text-center my-2">Alterações salvas com sucesso!</Text>}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primary rounded-2xl py-4 items-center mt-3   active:opacity-90"
      >
        <Text className="text-white font-bold text-sm">
          {salvando ? "Salvando alterações..." : "Salvar Alterações"}
        </Text>
      </Pressable>

      <BotaoExcluirConta />
    </View>
  );
}
