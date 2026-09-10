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
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
          className="bg-primary rounded-2xl py-4 items-center w-full mb-3 shadow-lg shadow-primary/20"
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
            <View className="bg-card/80 border border-border p-1.5 rounded-2xl flex-row mb-6">
              <Pressable
                onPress={() => setAba("biblioteca")}
                className={`flex-1 py-3 rounded-xl items-center justify-center transition-all ${
                  aba === "biblioteca" ? "bg-primary shadow-md" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold text-xs ${
                    aba === "biblioteca" ? "text-white" : "text-muted"
                  }`}
                >
                  Sua Biblioteca
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAba("dados")}
                className={`flex-1 py-3 rounded-xl items-center justify-center transition-all ${
                  aba === "dados" ? "bg-primary shadow-md" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold text-xs ${
                    aba === "dados" ? "text-white" : "text-muted"
                  }`}
                >
                  Dados Pessoais
                </Text>
              </Pressable>
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

        {/* SEÇÃO DE AÇÕES E ATALHOS */}
        <View className="px-4 mt-6">
          <Text className="text-muted text-[11px] font-bold uppercase tracking-wider mb-3 px-1">
            Navegação Rápida
          </Text>
          <View className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
            {usuario.tipo_conta === "musico" && (
              <ItemMenu
                icone={<BarChart3 color={colors.primary} size={18} />}
                titulo="Dashboard de Desempenho"
                subtitulo="Estatísticas e métricas do seu perfil"
                onPress={() => router.push("/dashboard")}
              />
            )}
            <ItemMenu
              icone={<Music color={colors.primary} size={18} />}
              titulo="Minhas Publicações"
              subtitulo="Gerencie lançamentos e faixas"
              onPress={() => router.push("/minhas-publicacoes")}
            />
            <ItemMenu
              icone={<LifeBuoy color={colors.primary} size={18} />}
              titulo="Central de Suporte"
              subtitulo="Ajuda e termos da plataforma"
              onPress={() => router.push("/suporte")}
              ultimo
            />
          </View>
        </View>

        {/* BOTÃO DE SAIR */}
        <View className="px-4 mt-6">
          <Pressable
            onPress={handleLogout}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl py-4 flex-row items-center justify-center gap-2.5 active:bg-red-500/20"
          >
            <LogOut color={colors.danger} size={18} />
            <Text className="text-red-500 font-bold text-sm">Encerrar Sessão</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CabecalhoPerfil({ usuario }: { usuario: any }) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const ehMusico = usuario.tipo_conta === "musico";
  const ehOrganizador = usuario.tipo_conta === "organizador";
  // Só músico e organizador têm linha própria em perfil_musico /
  // perfil_organizador — adm e moderador não têm o que editar aqui.
  const tabelaPerfil = ehMusico ? "perfil_musico" : ehOrganizador ? "perfil_organizador" : null;

  useEffect(() => {
    if (!tabelaPerfil) return;
    supabase
      .from(tabelaPerfil)
      .select(ehMusico ? "foto_url, banner_url" : "banner_url")
      .eq("usuario_id", usuario.id)
      .single()
      .then(({ data }) => {
        if (ehMusico) setFotoUrl((data as any)?.foto_url ?? null);
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
      {/* Banner: se o usuário já definiu um, ele vira o fundo aqui —
          o mesmo banner que aparece no modal de prévia e no perfil
          público dele. Sem banner, cai no gradiente com blur de antes.
          O overflow-hidden fica só nessa camada de fundo — o botão vive
          fora dela, como irmão, pra nada (BlurView incluso) poder
          interceptar o toque nele. */}
      <View pointerEvents="none" className="h-36 w-full overflow-hidden bg-surface">
        {bannerUrl ? (
          <Image source={{ uri: bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <>
            <View className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-primary/25 blur-2xl" />
            <View className="absolute top-0 right-0 w-56 h-56 rounded-full bg-blue-600/15 blur-3xl" />
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          </>
        )}

        {bannerUrl && <View className="absolute inset-0 bg-black/25" />}
      </View>

      {tabelaPerfil && (
        <Pressable
          onPress={trocarBanner}
          disabled={enviandoBanner}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ position: "absolute", top: 96, right: 12, zIndex: 20, elevation: 20 }}
          className="bg-black/60 rounded-full p-2 border border-white/20 flex-row items-center gap-1.5 px-3 active:bg-black/80"
        >
          <Camera color="white" size={14} />
          <Text className="text-white text-[11px] font-semibold">
            {enviandoBanner ? "Enviando..." : bannerUrl ? "Trocar banner" : "Adicionar banner"}
          </Text>
        </Pressable>
      )}

      {/* Foto de Perfil (Voltou à lógica estável anterior) */}
      <View className="items-center -mt-14 px-4">
        <Pressable onPress={ehMusico ? trocarFoto : undefined} disabled={!ehMusico || enviandoFoto}>
          <View
            className="rounded-full items-center justify-center bg-surface relative shadow-2xl"
            style={{ width: 108, height: 108, borderWidth: 4, borderColor: "#0B101E" }}
          >
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <View className="w-full h-full rounded-full bg-surface items-center justify-center">
                <Text className="text-4xl font-extrabold text-muted">
                  {usuario.nome.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {ehMusico && (
              <View className="absolute bottom-0 right-0 bg-primary rounded-full p-2 border-2 border-[#0B101E] shadow-md">
                <Camera color="white" size={14} />
              </View>
            )}
          </View>
        </Pressable>

        <Text className="text-2xl font-black text-textDark mt-3 tracking-tight text-center">
          {usuario.nome}
        </Text>

        <View className="flex-row items-center gap-1.5 bg-card border border-border/80 px-3 py-1 rounded-full mt-2">
          {usuario.tipo_conta === "musico" && <Sparkles size={12} color={colors.primary} />}
          {usuario.tipo_conta === "organizador" && <UserCheck size={12} color={colors.primary} />}
          {(usuario.tipo_conta === "adm" || usuario.tipo_conta === "moderador") && (
            <ShieldCheck size={12} color={colors.primary} />
          )}
          <Text className="text-xs font-semibold text-muted capitalize">
            {rotulosTipoConta[usuario.tipo_conta]}
            {enviandoFoto ? " · Enviando foto..." : ""}
          </Text>
        </View>
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
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const PADDING_HORIZONTAL = 0;
  const GAP = 12;
  const larguraUtil = width - 32;
  const numColunas = Math.min(MAX_COLUNAS, Math.max(2, Math.floor(larguraUtil / LARGURA_IDEAL_CARD)));
  const larguraCard = (larguraUtil - GAP * (numColunas - 1)) / numColunas;

  useEffect(() => {
    supabase
      .from("musica")
      .select("id, nome, capa_url, arquivo_url, status")
      .eq("usuario_id", usuarioId)
      .order("data_lancamento", { ascending: false })
      .then(({ data }) => setMusicas(data ?? []));

    supabase
      .from("album")
      .select("id, nome, capa_url")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .then(({ data }) => setAlbuns(data ?? []));
  }, [usuarioId]);

  return (
    <View style={{ paddingHorizontal: PADDING_HORIZONTAL }}>
      <SecaoBiblioteca
        titulo="Minhas Músicas"
        itens={musicas}
        larguraCard={larguraCard}
        gap={GAP}
        limite={LIMITE_PREVIA}
        verTudoHref="/biblioteca/musicas"
        vazio='Você ainda não publicou nenhuma música. Toque em "Criar" para começar.'
        renderItem={(item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              const fila = musicas.map((m) => ({
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
            style={{ width: larguraCard }}
            className="bg-card border border-border/80 rounded-2xl p-2.5 active:scale-95"
          >
            {item.capa_url ? (
              <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2.5" />
            ) : (
              <View className="w-full aspect-square rounded-xl bg-surface mb-2.5 items-center justify-center">
                <Music color={colors.muted} size={24} />
              </View>
            )}
            <Text numberOfLines={1} className="font-bold text-textDark text-xs">
              {item.nome}
            </Text>
            <Text numberOfLines={1} className="text-muted text-[10px] uppercase font-semibold mt-0.5">
              {item.status}
            </Text>
          </Pressable>
        )}
      />

      <SecaoBiblioteca
        titulo="Meus Álbuns"
        itens={albuns}
        larguraCard={larguraCard}
        gap={GAP}
        limite={LIMITE_PREVIA}
        verTudoHref="/biblioteca/albuns"
        vazio="Você ainda não criou nenhum álbum. Toque em “Criar” para começar."
        renderItem={(item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/album/${item.id}`)}
            style={{ width: larguraCard }}
            className="bg-card border border-border/80 rounded-2xl p-2.5 active:scale-95"
          >
            {item.capa_url ? (
              <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2.5" />
            ) : (
              <View className="w-full aspect-square rounded-xl bg-surface mb-2.5 items-center justify-center">
                <Music color={colors.muted} size={24} />
              </View>
            )}
            <Text numberOfLines={1} className="font-bold text-textDark text-xs">
              {item.nome}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function SecaoBiblioteca({
  titulo,
  itens,
  larguraCard,
  gap,
  limite,
  verTudoHref,
  vazio,
  renderItem,
}: {
  titulo: string;
  itens: any[];
  larguraCard: number;
  gap: number;
  limite: number;
  verTudoHref: string;
  vazio: string;
  renderItem: (item: any) => React.ReactNode;
}) {
  const router = useRouter();
  const excedente = itens.length - limite;
  const visiveis = excedente > 0 ? itens.slice(0, limite) : itens;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-bold text-textDark tracking-wide">{titulo}</Text>
        {itens.length > 0 && (
          <Pressable onPress={() => router.push(verTudoHref as any)} hitSlop={8}>
            <Text className="text-primary text-xs font-bold">Gerenciar Tudo</Text>
          </Pressable>
        )}
      </View>

      {itens.length === 0 ? (
        <View className="bg-card/40 border border-border/50 rounded-2xl p-4 items-center">
          <Text className="text-muted text-center text-xs">{vazio}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
          {visiveis.map((item) => renderItem(item))}

          {excedente > 0 && (
            <Pressable
              onPress={() => router.push(verTudoHref as any)}
              style={{ width: larguraCard }}
              className="bg-card border border-border/80 rounded-2xl p-2.5 items-center justify-center"
            >
              <View className="w-full aspect-square rounded-xl bg-surface items-center justify-center mb-2">
                <Text className="text-primary text-xl font-black">+{excedente}</Text>
              </View>
              <Text numberOfLines={1} className="font-bold text-primary text-xs">
                Ver todos
              </Text>
            </Pressable>
          )}
        </View>
      )}
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
          className="bg-card border border-border/80 rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
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
        <View className="bg-card rounded-3xl p-6 w-full border border-border shadow-2xl">
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
            className="bg-red-500 rounded-2xl py-3.5 items-center mb-2 shadow-lg shadow-red-500/20"
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

  if (!perfil) return <Text className="text-muted text-xs">Carregando dados...</Text>;

  return (
    <View>
      <CampoTexto label="Apelido / Nome Artístico" value={apelido} onChangeText={setApelido} />
      <CampoTexto label="Gênero Musical Principal" value={generoMusical} onChangeText={setGeneroMusical} />
      <CampoTexto label="Localização Atual" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto label="Bio / Descrição do Artista" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto label="Contato Externo (Social / E-mail)" value={contatoExterno} onChangeText={setContatoExterno} />

      <View className="flex-row items-center justify-between my-2 bg-card border border-border/70 rounded-2xl p-4">
        <View className="pr-2 flex-1">
          <Text className="text-xs font-bold text-textDark">Disponível para shows</Text>
          <Text className="text-[10px] text-muted mt-0.5">Exibe status ativo no seu perfil público</Text>
        </View>
        <Switch
          value={disponivel}
          onValueChange={setDisponivel}
          trackColor={{ false: "#1E293B", true: colors.primary }}
        />
      </View>

      {salvo && <Text className="text-green-500 text-xs font-bold text-center my-2">Alterações salvas com sucesso!</Text>}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primary rounded-2xl py-4 items-center mt-3 shadow-lg shadow-primary/20 active:opacity-90"
      >
        <Text className="text-white font-bold text-sm">
          {salvando ? "Salvando alterações..." : "Salvar Alterações"}
        </Text>
      </Pressable>

      <BotaoExcluirConta />
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
        className="bg-primary rounded-2xl py-4 items-center mt-3 shadow-lg shadow-primary/20 active:opacity-90"
      >
        <Text className="text-white font-bold text-sm">
          {salvando ? "Salvando alterações..." : "Salvar Alterações"}
        </Text>
      </Pressable>

      <BotaoExcluirConta />
    </View>
  );
}