import { useCallback, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Image, RefreshControl, ScrollView, ImageBackground, Modal, StyleSheet } from "react-native";
import { BlurView } from 'expo-blur'
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { useHomeStore } from "../../store/homeStore";
import { useEhDesktop } from "../../hooks/useEhDesktop";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Play, User as UserIcon, Calendar, Heart, X } from "lucide-react-native";
import { AnimatedBackgroundBlobs } from "../../components/AnimatedBackgroundBlobs";

type MusicaComAutor = {
  id: string;
  nome: string;
  autor_apelido: string | null;
  arquivo_url: string;
  capa_url: string | null;
};

type AlbumDestaque = {
  id: string;
  nome: string;
  capa_url: string | null;
  autor_apelido: string | null;
};

// Evento futuro em aberto (recomendado ao músico logado)
type EventoProximo = {
  id: string;
  titulo: string;
  local: string | null;
  data: string;
  imagem_url: string | null;
};

// Evento com todos os detalhes, usado no card/modal
type EventoDetalhado = {
  id: string;
  nome: string;
  data: string;
  horario: string | null;
  localizacao: string | null;
  genero_musical: string | null;
  capacidade: number | null;
  status: string;
  organizador_nome: string | null;
};

// Artista em destaque para o organizador, ordenado por curtidas no Explorar
type PerfilDestaque = {
  id: string;
  apelido: string;
  generos: string | null;
  local: string | null;
  imagem_url: string | null;
  total_curtidas: number;
};

type PerfilLogado = {
  tipo: "musico" | "organizador";
  nome: string;
  foto_url: string | null;
};

const LIMITE_ALBUNS_HOME = 6;

// --- Helper: iniciais a partir do nome ---
function getIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function Home() {
  const [musicas, setMusicas] = useState<MusicaComAutor[]>([]);
  const [albuns, setAlbuns] = useState<AlbumDestaque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Perfil logado — usado só para decidir o conteúdo do card hero e os títulos
  const [perfilLogado, setPerfilLogado] = useState<PerfilLogado | null>(null);

  // Conteúdo do card hero, dependente do tipo real de usuário
  const [eventosProximos, setEventosProximos] = useState<EventoProximo[]>([]);
  const [artistasDestaque, setArtistasDestaque] = useState<PerfilDestaque[]>([]);

  // Modal de detalhes do evento
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoDetalhado | null>(null);
  const [carregandoEvento, setCarregandoEvento] = useState(false);

  const paddingBottom = usePlayerAwarePadding(120);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const ehDesktop = useEhDesktop();

  // Cache global — só recarrega quando algo novo for publicado (invalidarHome)
  const precisaAtualizar = useHomeStore((s) => s.precisaAtualizar);
  const marcarCarregado = useHomeStore((s) => s.marcarCarregado);

  // Controla se ESTA instância do componente já carregou pelo menos uma vez.
  // Evita loading infinito quando precisaAtualizar já é false no momento em
  // que a Home é montada de novo (ex: logo após o login).
  const jaCarregouNestaInstancia = useRef(false);

  // --- Descobre quem é o usuário logado e seu tipo real ---
  const carregarPerfilLogado = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const usuarioId = authData?.user?.id;
    if (!usuarioId) {
      setPerfilLogado(null);
      return null;
    }

    const { data: musico } = await supabase
      .from("perfil_musico")
      .select("apelido, foto_url")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (musico) {
      const perfil: PerfilLogado = { tipo: "musico", nome: musico.apelido, foto_url: musico.foto_url ?? null };
      setPerfilLogado(perfil);
      return perfil;
    }

    const { data: organizador } = await supabase
      .from("perfil_organizador")
      .select("usuario_id")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (organizador) {
      const { data: usuario } = await supabase
        .from("usuario")
        .select("nome")
        .eq("id", usuarioId)
        .maybeSingle();

      const perfil: PerfilLogado = { tipo: "organizador", nome: usuario?.nome ?? "Organizador", foto_url: null };
      setPerfilLogado(perfil);
      return perfil;
    }

    setPerfilLogado(null);
    return null;
  }, []);

  // --- Eventos futuros em aberto, recomendados ao músico logado ---
  const carregarEventosProximos = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10); // evento.data é "date"

    const { data } = await supabase
      .from("evento")
      .select("id, nome, data, localizacao, genero_musical")
      .eq("status", "aberto")
      .gte("data", hoje)
      .order("data", { ascending: true })
      .limit(6);

    const lista = (data ?? []).map((e) => ({
      id: e.id,
      titulo: e.nome,
      local: e.localizacao,
      data: e.data,
      imagem_url: null,
    }));

    setEventosProximos(lista);
  }, []);

  // --- Artistas em destaque, ordenados por curtidas nos posts (publicacao) ---
  const carregarArtistasDestaque = useCallback(async () => {
    const { data: curtidas } = await supabase
      .from("curtida")
      .select("publicacao:publicacao_id(usuario_id)");

    if (!curtidas) {
      setArtistasDestaque([]);
      return;
    }

    const curtidasPorUsuario = new Map<string, number>();
    curtidas.forEach((c: any) => {
      const autorId = c.publicacao?.usuario_id;
      if (!autorId) return;
      curtidasPorUsuario.set(autorId, (curtidasPorUsuario.get(autorId) ?? 0) + 1);
    });

    const idsOrdenados = [...curtidasPorUsuario.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    if (idsOrdenados.length === 0) {
      setArtistasDestaque([]);
      return;
    }

    const { data: perfis } = await supabase
      .from("perfil_musico")
      .select("usuario_id, apelido, genero_musical, localizacao, foto_url")
      .in("usuario_id", idsOrdenados);

    const lista = idsOrdenados
      .map((id) => {
        const p = perfis?.find((x) => x.usuario_id === id);
        if (!p) return null;
        return {
          id,
          apelido: p.apelido,
          generos: p.genero_musical ?? null,
          local: p.localizacao ?? null,
          imagem_url: p.foto_url ?? null,
          total_curtidas: curtidasPorUsuario.get(id) ?? 0,
        };
      })
      .filter(Boolean) as PerfilDestaque[];

    setArtistasDestaque(lista);
  }, []);

  // --- Busca os detalhes completos de um evento e abre o card ---
  async function abrirEvento(eventoId: string) {
    setCarregandoEvento(true);
    const { data } = await supabase
      .from("evento")
      .select("id, nome, data, horario, localizacao, genero_musical, capacidade, status, organizador_id")
      .eq("id", eventoId)
      .maybeSingle();

    if (data) {
      const { data: usuario } = await supabase
        .from("usuario")
        .select("nome")
        .eq("id", data.organizador_id)
        .maybeSingle();

      setEventoSelecionado({
        id: data.id,
        nome: data.nome,
        data: data.data,
        horario: data.horario,
        localizacao: data.localizacao,
        genero_musical: data.genero_musical,
        capacidade: data.capacidade,
        status: data.status,
        organizador_nome: usuario?.nome ?? null,
      });
    }
    setCarregandoEvento(false);
  }

  const carregarDados = useCallback(async () => {
    const [{ data: dadosMusicas }, { data: dadosAlbuns }] = await Promise.all([
      supabase
        .from("musica_com_autor")
        .select("*")
        .eq("status", "ativo")
        .order("data_lancamento", { ascending: false })
        .limit(10),
      supabase
        .from("album")
        .select("id, nome, capa_url, usuario_id")
        .eq("status", "ativo")
        .order("criado_em", { ascending: false })
        .limit(LIMITE_ALBUNS_HOME),
    ]);

    setMusicas(dadosMusicas ?? []);

    const listaAlbuns = dadosAlbuns ?? [];
    if (listaAlbuns.length > 0) {
      const idsAutores = [...new Set(listaAlbuns.map((a) => a.usuario_id))];
      const { data: perfis } = await supabase
        .from("perfil_musico")
        .select("usuario_id, apelido")
        .in("usuario_id", idsAutores);

      const apelidoPorUsuario = new Map((perfis ?? []).map((p) => [p.usuario_id, p.apelido]));
      setAlbuns(
        listaAlbuns.map((a) => ({
          id: a.id,
          nome: a.nome,
          capa_url: a.capa_url,
          autor_apelido: apelidoPorUsuario.get(a.usuario_id) ?? null,
        }))
      );
    } else {
      setAlbuns([]);
    }

    // Carrega o conteúdo do card hero de acordo com o tipo real do usuário
    const perfil = await carregarPerfilLogado();

    if (perfil?.tipo === "musico") {
      await carregarEventosProximos();
    } else if (perfil?.tipo === "organizador") {
      await carregarArtistasDestaque();
    }
  }, [carregarPerfilLogado, carregarEventosProximos, carregarArtistasDestaque]);

  // Recarrega ao focar apenas se: (a) esta instância do componente ainda não
  // carregou nada, ou (b) algo novo foi publicado (invalidarHome foi chamado).
  // O check em (a) é o que evita o loading infinito: mesmo que o cache global
  // já esteja "atualizado" de uma navegação anterior, a instância atual da
  // Home (ex: recém-montada após o login) ainda precisa buscar os dados dela.
  useFocusEffect(
    useCallback(() => {
      if (jaCarregouNestaInstancia.current && !precisaAtualizar) return;

      let ativo = true;
      const iniciar = async () => {
        setCarregando(true);
        try {
          await carregarDados();
        } catch (erro) {
          console.error("Erro ao carregar dados da Home:", erro);
        } finally {
          if (ativo) {
            jaCarregouNestaInstancia.current = true;
            setCarregando(false);
            marcarCarregado();
          }
        }
      };
      iniciar();
      return () => { ativo = false; };
    }, [precisaAtualizar, carregarDados, marcarCarregado])
  );

  async function aoAtualizar() {
    setAtualizando(true);
    try {
      await carregarDados();
    } catch (erro) {
      console.error("Erro ao atualizar a Home:", erro);
    } finally {
      setAtualizando(false);
    }
  }

  const tipoUsuario = perfilLogado?.tipo ?? "musico";

  const renderHeaderComponent = () => (
    <View className="mb-6">
      {/* Background animado de alta performance no topo do conteúdo (estilo YouTube Music que rola junto) */}
      <AnimatedBackgroundBlobs height={500} />

      {/* CARD HERO — eventos futuros (músico) ou artistas em destaque por curtidas (organizador) */}
      <View className="px-5 pt-6">
        <Text className="text-xl font-bold text-textDark mb-4">
          {tipoUsuario === "musico" ? "Eventos em aberto" : "Artistas em Destaque"}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          {tipoUsuario === "musico" ? (
            eventosProximos.length > 0 ? (
              eventosProximos.map((ev) => (
                <Pressable
                  key={ev.id}
                  onPress={() => abrirEvento(ev.id)}
                  className="w-72 h-48 rounded-3xl overflow-hidden relative border border-border"
                >
                  <ImageBackground
                    source={{ uri: ev.imagem_url ?? "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=500&auto=format&fit=crop" }}
                    className="w-full h-full"
                    resizeMode="cover"
                  >
                    <LinearGradient colors={["transparent", "rgba(7, 10, 18, 0.95)"]} className="absolute inset-0 justify-end p-4">
                      <View className="bg-[#3B82F6] self-start px-2 py-1 rounded-md mb-2 flex-row items-center gap-1">
                        <Calendar color="white" size={12} />
                        <Text className="text-white text-xs font-bold">{ev.data}</Text>
                      </View>
                      <Text className="text-white text-lg font-bold mb-1" numberOfLines={1}>{ev.titulo}</Text>
                      {ev.local && (
                        <View className="flex-row items-center gap-1">
                          <MapPin color="#94A3B8" size={12} />
                          <Text className="text-gray-300 text-sm">{ev.local}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              ))
            ) : (
              <Text className="text-muted">Nenhum evento em aberto por enquanto.</Text>
            )
          ) : artistasDestaque.length > 0 ? (
            artistasDestaque.map((artista) => (
              <Pressable
                key={artista.id}
                onPress={() => router.push(`/usuario/${artista.id}`)}
                className="w-72 h-48 rounded-3xl overflow-hidden relative border border-border"
              >
                <ImageBackground
                  source={{ uri: artista.imagem_url ?? "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?q=80&w=500&auto=format&fit=crop" }}
                  className="w-full h-full"
                  resizeMode="cover"
                >
                  <LinearGradient colors={["transparent", "rgba(7, 10, 18, 0.95)"]} className="absolute inset-0 justify-end p-4">
                    <View className="bg-[#3B82F6] self-start px-2 py-1 rounded-md mb-2 flex-row items-center gap-1">
                      <Heart color="white" size={12} fill="white" />
                      <Text className="text-white text-xs font-bold">{artista.total_curtidas}</Text>
                    </View>
                    <Text className="text-white text-lg font-bold mb-1">{artista.apelido}</Text>
                    <Text className="text-gray-300 text-sm mb-3">{artista.generos ?? "—"}</Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1">
                        <MapPin color="#94A3B8" size={12} />
                        <Text className="text-gray-400 text-xs">{artista.local ?? "—"}</Text>
                      </View>
                      <View className="bg-surface/80 rounded-full px-3 py-1 border border-border">
                        <Text className="text-white text-xs font-bold">Ver Perfil</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))
          ) : (
            <Text className="text-muted">Nenhum artista em destaque ainda.</Text>
          )}
        </ScrollView>
      </View>

      
      {/* SEÇÃO DE ÁLBUNS (Artista > Álbum) */}
      {albuns.length > 0 && (
        <View className="mt-8 pl-5">
          <Text className="text-xl font-bold text-textDark mb-4">Descubra Artistas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
            {albuns.map((album) => (
              <Pressable
                key={album.id}
                onPress={() => requireAuth(() => router.push(`/album/${album.id}`))}
                className="w-36"
              >
                <View className="bg-card rounded-2xl p-3 border border-border">
                  {album.capa_url ? (
                    <Image source={{ uri: album.capa_url }} className="w-full aspect-square rounded-xl mb-3" />
                  ) : (
                    <View className="w-full aspect-square rounded-xl bg-surface mb-3 items-center justify-center">
                      <UserIcon color="#94A3B8" size={24} />
                    </View>
                  )}
                  
                  <Text numberOfLines={1} className="font-bold text-textDark text-sm">
                  {album.nome}
                  </Text>
                  <Text numberOfLines={1} className="text-muted text-xs mt-1 ">
                    {album.autor_apelido ?? "Autor desconhecido"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CABEÇALHO DA LISTA PRINCIPAL — o título muda com o chip escolhido */}
      <Text className="text-xl font-bold px-5 pt-8 pb-0 text-textDark">
        {tipoUsuario === "musico" ? "Lançamentos" : "Músicas em Alta"}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0B101E' }}>
      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-center">Carregando o seu Vybe...</Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={musicas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom, }}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#3B82F6" />}
          ListHeaderComponent={renderHeaderComponent}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8 px-4">
              Nenhuma música encontrada no momento.
            </Text>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                requireAuth(() => {
                  const fila = musicas.map((m) => ({
                    id: m.id,
                    nome: m.nome,
                    autorApelido: m.autor_apelido,
                    arquivoUrl: m.arquivo_url,
                    capaUrl: m.capa_url,
                  }));
                  tocarMusica(
                    { id: item.id, nome: item.nome, autorApelido: item.autor_apelido, arquivoUrl: (item as MusicaComAutor).arquivo_url, capaUrl: item.capa_url },
                    fila
                  );
                  // No desktop o player já toca na sidebar persistente —
                  // só navega pra tela cheia no mobile.
                  if (!ehDesktop) {
                    router.push("/tocando");
                  }
                });
              }}
              style={{ borderRadius: 20, overflow: "hidden", marginRight:20, marginLeft:20}}
              className="active:opacity-80"
            >
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              />
 
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center gap-4 flex-1">
                  {item.capa_url ? (
                    <Image source={{ uri: item.capa_url }} className="w-12 h-12 rounded-lg" />
                  ) : (
                    <View className="w-12 h-12 rounded-lg bg-surface items-center justify-center">
                      <UserIcon color="#94A3B8" size={18} />
                    </View>
                  )}
                  <View className="flex-1 pr-4">
                    <Text numberOfLines={1} className="font-bold text-textDark text-base">{item.nome}</Text>
                    <Text numberOfLines={1} className="text-muted text-sm mt-0.5">{item.autor_apelido ?? "Autor desconhecido"}</Text>
                  </View>
                </View>
                <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center border border-white/20">
                  <Play color="#8B95A8" size={14} fill="#8B95A8" style={{ marginLeft: 2 }} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Card de detalhes do evento */}
      <Modal
        visible={!!eventoSelecionado || carregandoEvento}
        transparent
        animationType="fade"
        onRequestClose={() => setEventoSelecionado(null)}
      >
        <View style={{ flex: 1 }}>
          {/* Fundo — único responsável por fechar o modal */}
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            className="bg-black/70"
            onPress={() => setEventoSelecionado(null)}
          />

          {/* Wrapper que centraliza o card, sem capturar toque fora dele */}
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
            pointerEvents="box-none"
          >
            <View className="w-full bg-card rounded-3xl p-6 border border-border">
              {carregandoEvento ? (
                <Text className="text-muted text-center">Carregando evento...</Text>
              ) : eventoSelecionado ? (
                <>
                  <View className="flex-row items-start justify-between mb-4">
                    <Text className="text-textDark text-xl font-bold flex-1 pr-4">{eventoSelecionado.nome}</Text>
                    <Pressable onPress={() => setEventoSelecionado(null)}>
                      <X color="#8B95A8" size={22} />
                    </Pressable>
                  </View>

                  <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                      <Calendar color="#3B82F6" size={16} />
                      <Text className="text-textDark">
                        {eventoSelecionado.data}{eventoSelecionado.horario ? ` às ${eventoSelecionado.horario}` : ""}
                      </Text>
                    </View>

                    {eventoSelecionado.localizacao && (
                      <View className="flex-row items-center gap-2">
                        <MapPin color="#3B82F6" size={16} />
                        <Text className="text-textDark">{eventoSelecionado.localizacao}</Text>
                      </View>
                    )}

                    {eventoSelecionado.genero_musical && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-muted text-sm">Gênero:</Text>
                        <Text className="text-textDark">{eventoSelecionado.genero_musical}</Text>
                      </View>
                    )}

                    {eventoSelecionado.capacidade != null && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-muted text-sm">Capacidade:</Text>
                        <Text className="text-textDark">{eventoSelecionado.capacidade} pessoas</Text>
                      </View>
                    )}

                    {eventoSelecionado.organizador_nome && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-muted text-sm">Organizado por:</Text>
                        <Text className="text-textDark">{eventoSelecionado.organizador_nome}</Text>
                      </View>
                    )}

                    <View className="bg-surface self-start px-3 py-1 rounded-full mt-1">
                      <Text className="text-muted text-xs font-semibold uppercase">{eventoSelecionado.status}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}