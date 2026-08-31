import { useEffect, useState } from "react";
import { View, Text, TextInput, Switch, ScrollView, Image, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, LogOut, BarChart3, Music, LifeBuoy } from "lucide-react-native";
import { supabase, PerfilMusico, PerfilOrganizador } from "../../lib/supabase";
import { useAuthStore, ehContaComum } from "../../store/authStore";
import { enviarArquivoParaStorage } from "../../lib/upload";
import { usePlayerStore } from "../../store/playerStore";
import { AppLogo } from "../../components/AppLogo";
import { colors, rotulosTipoConta } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { Pressable } from "react-native";

export default function Perfil() {
  const usuario = useAuthStore((s) => s.usuario);
  const router = useRouter();
  const [aba, setAba] = useState<"biblioteca" | "dados">("biblioteca");
  const paddingBottom = usePlayerAwarePadding(140);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/(tabs)/home");
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <AppLogo />
        <Text className="text-lg font-bold text-textDark text-center mt-4 mb-2">
          Você ainda não tem conta
        </Text>
        <Text className="text-muted text-center mb-6">
          Entre ou cadastre-se para ver seu perfil, sua biblioteca e conversar com outras pessoas.
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
          className="bg-primary rounded-full py-4 items-center w-full mb-3"
        >
          <Text className="text-white font-bold">Cadastrar</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/entrar?aba=login")}
          className="border border-border rounded-full py-4 items-center w-full"
        >
          <Text className="text-textDark font-medium">Já tenho conta — Entrar</Text>
        </Pressable>
      </View>
    );
  }

  const temBiblioteca = ehContaComum(usuario);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom }} stickyHeaderIndices={temBiblioteca ? [1] : undefined} showsVerticalScrollIndicator={false}>
      <CabecalhoPerfil usuario={usuario} onLogout={handleLogout} />

      {temBiblioteca ? (
        <>
          <View className="bg-background px-4 pt-4 pb-2 flex-row gap-2">
            <SegmentoAba label="Biblioteca" ativa={aba === "biblioteca"} onPress={() => setAba("biblioteca")} />
            <SegmentoAba label="Dados" ativa={aba === "dados"} onPress={() => setAba("dados")} />
          </View>

          {aba === "biblioteca" ? (
            <BibliotecaPropria tipoConta={usuario.tipo_conta} usuarioId={usuario.id} />
          ) : (
            <View className="px-4 mt-2">
              {usuario.tipo_conta === "musico" ? (
                <FormularioMusico usuarioId={usuario.id} />
              ) : (
                <FormularioOrganizador usuarioId={usuario.id} />
              )}
            </View>
          )}
        </>
      ) : (
        <View className="px-4 mt-4">
          <Text className="text-textDark">
            Conta de {rotulosTipoConta[usuario.tipo_conta]} — use as abas de{" "}
            {usuario.tipo_conta === "adm" ? "Painel" : "Moderação"} para gerenciar a plataforma.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function CabecalhoPerfil({ usuario, onLogout }: { usuario: any; onLogout: () => void }) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const router = useRouter();
  const ehMusico = usuario.tipo_conta === "musico";

  useEffect(() => {
    if (ehMusico) {
      supabase
        .from("perfil_musico")
        .select("foto_url")
        .eq("usuario_id", usuario.id)
        .single()
        .then(({ data }) => setFotoUrl(data?.foto_url ?? null));
    }
  }, [usuario.id, ehMusico]);

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
      await supabase.from("perfil_musico").update({ foto_url: url }).eq("usuario_id", usuario.id);
      setFotoUrl(url);
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <View>
      <View style={{ height: 120, backgroundColor: colors.primary }} className="rounded-b-[32px]" />

      <View className="items-center" style={{ marginTop: -48 }}>
        <Pressable onPress={ehMusico ? trocarFoto : undefined} disabled={!ehMusico || enviandoFoto}>
          <View
            className="rounded-full items-center justify-center bg-surface"
            style={{ width: 96, height: 96, borderWidth: 4, borderColor: colors.background }}
          >
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <Text className="text-3xl font-bold text-muted">{usuario.nome.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          {ehMusico && (
            <View
              className="absolute bottom-0 right-0 bg-primary rounded-full items-center justify-center"
              style={{ width: 30, height: 30, borderWidth: 2, borderColor: colors.background }}
            >
              <Camera color="white" size={14} />
            </View>
          )}
        </Pressable>

        <Text className="text-xl font-bold text-textDark mt-3">{usuario.nome}</Text>
        <View className="bg-surface rounded-full px-3 py-1 mt-1">
          <Text className="text-xs font-medium text-muted">
            {rotulosTipoConta[usuario.tipo_conta]}
            {enviandoFoto ? " · enviando foto..." : ""}
          </Text>
        </View>

        {/* Links de navegação adaptativos distribuídos por toda a largura */}
        <View className="w-full mt-5 px-4 flex-row flex-wrap justify-between gap-2.5">
          {ehMusico && (
            <Pressable 
              onPress={() => router.push("/dashboard")} 
              className="bg-card border border-border rounded-2xl py-3 px-4 flex-row items-center gap-2.5 active:opacity-70 flex-1 min-w-[140px] justify-center"
            >
              <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
                <BarChart3 color={colors.primary} size={16} />
              </View>
              <Text className="text-textDark font-semibold text-xs">Dashboard</Text>
            </Pressable>
          )}

          <Pressable 
            onPress={() => router.push("/minhas-publicacoes")} 
            className="bg-card border border-border rounded-2xl py-3 px-4 flex-row items-center gap-2.5 active:opacity-70 flex-1 min-w-[140px] justify-center"
          >
            <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
              <Music color={colors.primary} size={16} />
            </View>
            <Text className="text-textDark font-semibold text-xs">Publicações</Text>
          </Pressable>

          <Pressable 
            onPress={() => router.push("/suporte")} 
            className="bg-card border border-border rounded-2xl py-3 px-4 flex-row items-center gap-2.5 active:opacity-70 flex-1 min-w-[140px] justify-center"
          >
            <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
              <LifeBuoy color={colors.primary} size={16} />
            </View>
            <Text className="text-textDark font-semibold text-xs">Suporte</Text>
          </Pressable>
        </View>

        <Pressable onPress={onLogout} className="flex-row items-center mt-6 px-4 py-2">
          <LogOut color={colors.danger} size={16} />
          <Text className="text-red-500 text-sm ml-2 font-medium">Sair da conta</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentoAba({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-2.5 rounded-full items-center ${ativa ? "bg-primary" : "bg-surface"}`}>
      <Text className={`font-medium ${ativa ? "text-white" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}

const LARGURA_IDEAL_CARD = 170;
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

  const PADDING_HORIZONTAL = 16;
  const GAP = 12;
  const larguraUtil = width - PADDING_HORIZONTAL * 2;
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
    <View style={{ paddingHorizontal: PADDING_HORIZONTAL, paddingTop: 8 }}>
      <SecaoBiblioteca
        titulo="Músicas"
        itens={musicas}
        larguraCard={larguraCard}
        gap={GAP}
        limite={LIMITE_PREVIA}
        verTudoHref="/biblioteca/musicas"
        vazio='Você ainda não publicou nenhuma música. Toque em "Criar" pra começar.'
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
            className="bg-card rounded-2xl p-3"
          >
            {item.capa_url ? (
              <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2" />
            ) : (
              <View className="w-full aspect-square rounded-xl bg-surface mb-2" />
            )}
            <Text numberOfLines={1} className="font-bold text-textDark">
              {item.nome}
            </Text>
            <Text numberOfLines={1} className="text-muted text-xs capitalize">
              {item.status}
            </Text>
          </Pressable>
        )}
      />

      <SecaoBiblioteca
        titulo="Álbuns"
        itens={albuns}
        larguraCard={larguraCard}
        gap={GAP}
        limite={LIMITE_PREVIA}
        verTudoHref="/biblioteca/albuns"
        vazio="Você ainda não criou nenhum álbum. Toque em “Criar” pra começar."
        renderItem={(item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/album/${item.id}`)}
            style={{ width: larguraCard }}
            className="bg-card rounded-2xl p-3"
          >
            {item.capa_url ? (
              <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2" />
            ) : (
              <View className="w-full aspect-square rounded-xl bg-surface mb-2" />
            )}
            <Text numberOfLines={1} className="font-bold text-textDark">
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
        <Text className="text-lg font-bold text-textDark">{titulo}</Text>
        {itens.length > 0 && (
          <Pressable onPress={() => router.push(verTudoHref as any)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text className="text-primary text-sm font-medium">Gerenciar</Text>
          </Pressable>
        )}
      </View>

      {itens.length === 0 ? (
        <Text className="text-muted text-center py-4">{vazio}</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
          {visiveis.map((item) => renderItem(item))}

          {excedente > 0 && (
            <Pressable
              onPress={() => router.push(verTudoHref as any)}
              style={{ width: larguraCard }}
              className="bg-card rounded-2xl p-3"
            >
              <View className="w-full aspect-square rounded-xl bg-surface items-center justify-center mb-2">
                <Text className="text-primary text-xl font-bold">+{excedente}</Text>
              </View>
              <Text numberOfLines={1} className="font-bold text-primary">
                Ver tudo
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function BibliotecaOrganizador({ usuarioId }: { usuarioId: string }) {
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
    <View className="px-4 pt-2">
      {eventos.length === 0 && (
        <Text className="text-muted text-center mt-8">Você ainda não criou nenhum evento. Toque em "Criar" pra começar.</Text>
      )}
      {eventos.map((item) => (
        <View key={item.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="font-bold text-textDark">{item.nome}</Text>
          <Text className="text-muted text-sm mt-1">
            {item.data} · {item.localizacao ?? "Local a definir"}
          </Text>
          <Text className="text-primary text-xs mt-1 capitalize">{item.status}</Text>
        </View>
      ))}
    </View>
  );
}

function CampoTexto({ label, value, onChangeText, multiline }: { label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean }) {
  return (
    <View className="mt-4">
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        className="border border-border rounded-2xl px-4 py-3 text-textDark bg-card"
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

  if (!perfil) return <Text className="text-muted">Carregando...</Text>;

  return (
    <View>
      <CampoTexto label="Apelido" value={apelido} onChangeText={setApelido} />
      <CampoTexto label="Gênero musical" value={generoMusical} onChangeText={setGeneroMusical} />
      <CampoTexto label="Localização" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto label="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto label="Contato externo" value={contatoExterno} onChangeText={setContatoExterno} />

      <View className="flex-row items-center justify-between mt-4 bg-card rounded-2xl px-4 py-3">
        <Text className="text-textDark">Disponível para shows</Text>
        <Switch value={disponivel} onValueChange={setDisponivel} />
      </View>

      {salvo && <Text className="text-green-600 text-center mt-3">Salvo!</Text>}

      <Pressable onPress={salvar} disabled={salvando} className="bg-primary rounded-full py-3 items-center mt-4">
        <Text className="text-white font-bold">{salvando ? "Salvando..." : "Salvar alterações"}</Text>
      </Pressable>
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

  if (!perfil) return <Text className="text-muted">Carregando...</Text>;

  return (
    <View>
      <CampoTexto label="Nicho de trabalho" value={nichoTrabalho} onChangeText={setNichoTrabalho} />
      <CampoTexto label="Localização" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto label="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto label="Contato" value={contato} onChangeText={setContato} />

      {salvo && <Text className="text-green-600 text-center mt-3">Salvo!</Text>}

      <Pressable onPress={salvar} disabled={salvando} className="bg-primary rounded-full py-3 items-center mt-4">
        <Text className="text-white font-bold">{salvando ? "Salvando..." : "Salvar alterações"}</Text>
      </Pressable>
    </View>
  );
}