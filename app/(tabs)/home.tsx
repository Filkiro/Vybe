import { useCallback, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Image, RefreshControl, ScrollView, ImageBackground, StyleSheet } from "react-native";
import { ModalEventoDetalhes, EventoDetalhado } from "../../components/ModalEventoDetalhes";
import { BlurView } from 'expo-blur'
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { useAbrirPerfil } from "../../store/perfilModalStore";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { useHomeStore } from "../../store/homeStore";
import { useEhDesktop } from "../../hooks/useEhDesktop";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Play, User as UserIcon, Calendar, Heart, X, Flame } from "lucide-react-native";
import { AnimatedBackgroundBlobs } from "../../components/AnimatedBackgroundBlobs";
import { EscolhaADedo } from "../../components/EscolhaADedo";
import { parseDateFromDB } from "../../lib/dateMask";

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
  descricao?: string;
};

// Evento com todos os detalhes, usado no card/modal


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
const LIMITE_LANCAMENTOS_HOME = 5;
const LIMITE_DESCOBERTA_PROCEDURAL = 5;

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
  // Muda a cada recarga da Home — faz a seção "Escolha a dedo" sortear outras músicas
  const [tokenEscolhaADedo, setTokenEscolhaADedo] = useState(0);

  // Perfil logado — usado só para decidir o conteúdo do card hero e os títulos
  const [perfilLogado, setPerfilLogado] = useState<PerfilLogado | null>(null);

  // Conteúdo do card hero, dependente do tipo real de usuário
  const [eventosProximos, setEventosProximos] = useState<EventoProximo[]>([]);
  const [artistasDestaque, setArtistasDestaque] = useState<PerfilDestaque[]>([]);

  // Modal de detalhes do evento
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoDetalhado | null>(null);
  const [carregandoEvento, setCarregandoEvento] = useState(false);

  // --- Seção procedural "Descubra Mais", abaixo de Artistas da Comunidade.
  // Independente dos 5 lançamentos fixos do topo: nunca duplica com eles nem entre si.
  const [musicasDescoberta, setMusicasDescoberta] = useState<MusicaComAutor[]>([]);
  const [paginaDescoberta, setPaginaDescoberta] = useState(0);
  const [carregandoDescoberta, setCarregandoDescoberta] = useState(false);
  const [semMaisDescoberta, setSemMaisDescoberta] = useState(false);

  const paddingBottom = usePlayerAwarePadding(120);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const abrirPerfil = useAbrirPerfil();
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

  const carregarEventosProximos = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10); // evento.data é "date"

    const { data, error } = await supabase
      .from("evento")
      .select("id, nome, data, localizacao, genero_musical, descricao, capa_url")
      .eq("status", "aberto")
      .gte("data", hoje)
      .order("data", { ascending: true })
      .limit(6);

    if (error) console.error("ERRO CARREGANDO EVENTOS:", error);

    const lista = (data ?? []).map((e) => ({
      id: e.id,
      titulo: e.nome,
      local: e.localizacao,
      data: e.data ? parseDateFromDB(e.data) : "",
      imagem_url: e.capa_url,
      descricao: e.descricao,
    }));

    setEventosProximos(lista);
  }, []);

  // --- Artistas em destaque, ordenados por curtidas nos posts (publicacao) ---
  const carregarArtistasDestaque = useCallback(async () => {
    const { data: curtidas } = await supabase
      .from("curtida_musica")
      .select("musica:musica_id(usuario_id)");

    if (!curtidas) {
      setArtistasDestaque([]);
      return;
    }

    const curtidasPorUsuario = new Map<string, number>();
    curtidas.forEach((c: any) => {
      const autorId = c.musica?.usuario_id;
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
        data: data.data ? parseDateFromDB(data.data) : "",
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
        .limit(LIMITE_LANCAMENTOS_HOME),
      supabase
        .from("album")
        .select("id, nome, capa_url, usuario_id")
        .eq("status", "ativo")
        .order("criado_em", { ascending: false })
        .limit(LIMITE_ALBUNS_HOME),
    ]);

    setMusicas(dadosMusicas ?? []);

    // Reinicia a seção procedural "Descubra Mais" sempre que a Home recarrega do zero
    setMusicasDescoberta([]);
    setPaginaDescoberta(0);
    setSemMaisDescoberta(false);

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

    // Carrega perfil e os dois tipos de destaque (Eventos e Artistas)
    const perfil = await carregarPerfilLogado();

    await carregarEventosProximos();
    
await Promise.all([
      carregarPerfilLogado(),
      carregarEventosProximos(),
      carregarArtistasDestaque(),
    ]);
  }, [carregarPerfilLogado, carregarEventosProximos, carregarArtistasDestaque]);

  // --- Carrega o próximo lote da seção procedural "Descubra Mais" ---
  // Usa range() do Supabase (paginação real no banco) e filtra por IDs já
  // usados — tanto os 5 do topo quanto os já carregados aqui — para nunca repetir.
  const carregarMaisDescoberta = useCallback(async () => {
    if (carregandoDescoberta || semMaisDescoberta || carregando || atualizando) return;

    setCarregandoDescoberta(true);
    try {
      // A primeira página da descoberta começa depois dos 5 lançamentos do topo
      const inicio = LIMITE_LANCAMENTOS_HOME + paginaDescoberta * LIMITE_DESCOBERTA_PROCEDURAL;
      const fim = inicio + LIMITE_DESCOBERTA_PROCEDURAL - 1;

      const { data: novasMusicas, error } = await supabase
        .from("musica_com_autor")
        .select("*")
        .eq("status", "ativo")
        .order("data_lancamento", { ascending: false })
        .range(inicio, fim);

      if (error) {
        console.error("Erro ao carregar seção Descubra Mais:", error);
        return;
      }

      if (!novasMusicas || novasMusicas.length === 0) {
        setSemMaisDescoberta(true);
        return;
      }

      setMusicasDescoberta((atuais) => {
        const idsUsados = new Set([...musicas.map((m) => m.id), ...atuais.map((m) => m.id)]);
        const semDuplicadas = novasMusicas.filter((m) => !idsUsados.has(m.id));
        return [...atuais, ...semDuplicadas];
      });

      setPaginaDescoberta((p) => p + 1);

      if (novasMusicas.length < LIMITE_DESCOBERTA_PROCEDURAL) {
        setSemMaisDescoberta(true);
      }
    } finally {
      setCarregandoDescoberta(false);
    }
  }, [paginaDescoberta, carregandoDescoberta, semMaisDescoberta, carregando, atualizando, musicas]);

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
    // Só o "puxar pra atualizar" re-sorteia o "Escolha a dedo"
    setTokenEscolhaADedo((t) => t + 1);
    try {
      await carregarDados();
    } catch (erro) {
      console.error("Erro ao atualizar a Home:", erro);
    } finally {
      setAtualizando(false);
    }
  }

  const tipoUsuario = perfilLogado?.tipo ?? "musico";

  const renderHeaderComponent = () => {
    const musicaEmAlta = musicas.length > 0 ? musicas[0] : null;
    
    return (
    <View className="mb-6 w-full max-w-[1200px] self-center pt-8 relative">
      {/* Dynamic Ambient Backing Glow */}
      <View className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden pointer-events-none -z-10">
        <View className="absolute -top-12 left-1/4 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-[100px]" />
        <View className="absolute top-48 right-12 w-80 h-80 bg-[#0267B8]/10 rounded-full blur-[90px]" />
      </View>

      {/* SEÇÃO 1: EVENTOS EM ABERTO & EM ALTA NO VYBE */}
      <View className="px-5 w-full">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-md shadow-[#3B82F6]/80" />
            <Text className="text-2xl font-bold text-white tracking-tight">Eventos em aberto</Text>
          </View>
        </View>

        <View className={`flex-col ${ehDesktop ? "lg:flex-row" : ""} gap-6`}>
          {/* Main Event Billboard Carousel */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="flex-1"
            contentContainerStyle={{ gap: 16 }}
            decelerationRate="fast"
            snapToInterval={ehDesktop ? 716 : 336} // Card + gap
          >
            {eventosProximos.length === 0 ? (
              <View
                className="group relative rounded-2xl overflow-hidden bg-[#181C24] shadow-xl min-h-[380px] justify-center items-center p-6 border border-white/5 w-[320px] sm:w-[400px] md:w-[600px] lg:w-[700px] xl:w-[800px]"
              >
                <Calendar color="#3B82F6" size={48} className="mb-4 opacity-50" />
                <Text className="text-2xl font-bold text-white mb-2">Nenhum evento em aberto</Text>
                <Text className="text-gray-400 text-center max-w-sm">
                  A cena está tranquila por enquanto. Volte mais tarde para conferir as próximas oportunidades e shows!
                </Text>
              </View>
            ) : (
              eventosProximos.map((evento) => (
                <Pressable
                  key={evento.id}
                  onPress={() => abrirEvento(evento.id)}
                  className="group relative rounded-2xl overflow-hidden bg-[#181C24] shadow-xl min-h-[380px] justify-end p-6 border border-white/5 active:opacity-90 w-[320px] sm:w-[400px] md:w-[600px] lg:w-[700px] xl:w-[800px]"
                >
                  <ImageBackground
                    source={{ uri: evento.imagem_url ?? "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop" }}
                    className="absolute inset-0"
                    resizeMode="cover"
                  >
                    <LinearGradient colors={["rgba(10, 14, 22, 0.2)", "rgba(10, 14, 22, 0.95)"]} className="absolute inset-0" />
                  </ImageBackground>

                  {/* Top Status Tag */}
                  <View className="absolute top-6 left-6 flex-row flex-wrap items-center gap-2 z-10">
                    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2563EB] shadow-lg shadow-[#2563EB]/50">
                      <Calendar color="white" size={14} />
                      <Text className="text-white text-xs font-bold">{evento.data}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                      <Text className="text-[#3B82F6] text-xs font-bold">Confirmar Presença</Text>
                    </View>
                  </View>

                  {/* Bottom Content */}
                  <View className="relative z-10 flex-col gap-2 max-w-xl">
                    <View className="flex-row items-center gap-1.5">
                      <MapPin color="#3B82F6" size={16} />
                      <Text className="text-gray-300 text-xs font-semibold uppercase tracking-wide">
                        {evento.local ?? "Local a definir"}
                      </Text>
                    </View>
                    <Text className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-1">
                      {evento.titulo}
                    </Text>
                    <Text className="text-gray-300 text-sm leading-relaxed mb-4" numberOfLines={2}>
                      {evento.descricao ?? "Um grande evento da cena na sua região. Toque para ver os detalhes e conferir tudo."}
                    </Text>
                    
                    <View className="flex-row items-center gap-3">
                      <View className="px-5 py-2.5 rounded-full bg-[#2563EB] shadow-lg shadow-[#2563EB]/40 flex-row items-center gap-2">
                        <Text className="text-white text-sm font-bold">Ver Detalhes</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Secondary Side Deck: 'Em Alta no Vybe' Live Pulse */}
          <View className={`rounded-2xl bg-[#181C24]/80 border border-white/5 p-6 flex-col justify-between shadow-lg ${ehDesktop ? "w-[340px]" : "w-full"}`}>
            <View className="flex-col gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Flame color="#3B82F6" size={20} />
                  <Text className="text-lg font-bold text-white">Em Alta no Vybe</Text>
                </View>
                <View className="px-2 py-0.5 rounded-full bg-[#2563EB]/20">
                  <Text className="text-[#3B82F6] text-[10px] uppercase font-bold tracking-wider">Ao Vivo</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-xs">Tendências com maior engajamento nas últimas 24h na rede.</Text>
            </View>

            {/* Pulse Widget */}
            <Pressable 
              onPress={() => {
                if (musicaEmAlta) {
                  requireAuth(() => {
                    tocarMusica({ 
                      id: musicaEmAlta.id, 
                      nome: musicaEmAlta.nome, 
                      autorApelido: musicaEmAlta.autor_apelido, 
                      arquivoUrl: musicaEmAlta.arquivo_url, 
                      capaUrl: musicaEmAlta.capa_url 
                    }, musicas.map(item => ({ id: item.id, nome: item.nome, autorApelido: item.autor_apelido, arquivoUrl: item.arquivo_url, capaUrl: item.capa_url })));
                    if (!ehDesktop) router.push("/tocando");
                  });
                }
              }}
              className="my-4 p-4 rounded-xl bg-white/5 border border-white/5 flex-col gap-3 active:opacity-80"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-lg bg-[#262A33] overflow-hidden">
                  {musicaEmAlta?.capa_url ? (
                    <Image source={{ uri: musicaEmAlta.capa_url }} className="w-full h-full" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <UserIcon color="#94A3B8" size={20} />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-white" numberOfLines={1}>{musicaEmAlta?.nome ?? "Carregando..."}</Text>
                  <Text className="text-xs text-gray-400" numberOfLines={1}>{musicaEmAlta?.autor_apelido ?? "Aguarde"}</Text>
                </View>
              </View>
              {/* Fake Waveform */}
              <View className="w-full h-10 flex-row items-end justify-between px-1 gap-1 opacity-80 pt-2">
                 {[...Array(11)].map((_, i) => (
                   <View key={i} className={`w-1.5 rounded-full ${i % 2 === 0 ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`} style={{ height: Math.max(8, Math.random() * 32) }} />
                 ))}
              </View>
            </Pressable>
            <View className="flex-1" />
          </View>
        </View>
      </View>

      {/* SEÇÃO 2: Lançamentos e Mais Tocadas Header */}
      <View className="px-5 mt-12 mb-4 w-full">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight">Lançamentos e Mais Tocadas</Text>
            <Text className="text-sm text-gray-400 mt-1">Músicas mais executadas e tendências no ecossistema autoral independente</Text>
          </View>
          {ehDesktop && (
            <View className="flex-row items-center gap-2">
              <View className="px-4 py-1.5 rounded-full bg-[#3B82F6]/20">
                <Text className="text-[#3B82F6] text-xs font-bold">Em Alta</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  )};

  // Linha de música reutilizada tanto na lista fixa do topo quanto na seção procedural
  function renderLinhaMusica(item: MusicaComAutor, index: number, fila: MusicaComAutor[]) {
    return (
      <Pressable
        onPress={() => {
          requireAuth(() => {
            const filaTocando = fila.map((m) => ({
              id: m.id,
              nome: m.nome,
              autorApelido: m.autor_apelido,
              arquivoUrl: m.arquivo_url,
              capaUrl: m.capa_url,
            }));
            tocarMusica(
              { id: item.id, nome: item.nome, autorApelido: item.autor_apelido, arquivoUrl: item.arquivo_url, capaUrl: item.capa_url },
              filaTocando
            );
            if (!ehDesktop) router.push("/tocando");
          });
        }}
        className="group relative flex-row items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 shadow-sm transition-all"
      >
        {/* Active Edge Indicator mock (would be dynamic if playing) */}
        <View className="absolute left-0 top-3 bottom-3 w-1 bg-[#2563EB] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

        <View className="flex-row items-center gap-4 flex-1 pl-2">
          <Text className="text-gray-500 font-bold text-xs w-5 text-center group-hover:hidden">{(index + 1).toString().padStart(2, '0')}</Text>
          <View className="w-5 items-center justify-center hidden group-hover:flex">
            <Play color="#3B82F6" size={14} fill="#3B82F6" />
          </View>

          <View className="w-12 h-12 rounded-lg bg-[#262A33] overflow-hidden">
            {item.capa_url ? (
              <Image source={{ uri: item.capa_url }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <UserIcon color="#94A3B8" size={20} />
              </View>
            )}
          </View>

          <View className="flex-1 pr-2">
            <Text numberOfLines={1} className="font-bold text-white text-sm group-hover:text-[#3B82F6] transition-colors">{item.nome}</Text>
            <Text numberOfLines={1} className="text-gray-400 text-xs mt-0.5">{item.autor_apelido ?? "Autor desconhecido"}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-4 pr-2">
          <View className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#3B82F6] transition-colors">
            <Play color="white" size={14} fill="white" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </Pressable>
    );
  }

  const renderFooterComponent = () => (
    <View className="w-full max-w-[1200px] self-center pb-12">
      {/* SEÇÃO 3: DESCUBRA ÁLBUNS */}
      {albuns.length > 0 && (
        <View className="px-5 mt-10">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-white tracking-tight">Descubra Álbuns</Text>
              <Text className="text-sm text-gray-400 mt-1">Obras completas recomendadas pela curadoria do algoritmo</Text>
            </View>
          </View>
          
          <ScrollView horizontal={!ehDesktop} showsHorizontalScrollIndicator={false}>
            <View className={`flex-row ${ehDesktop ? "flex-wrap" : ""} gap-4`}>
              {albuns.map((album) => (
                <Pressable
                  key={album.id}
                  onPress={() => requireAuth(() => router.push(`/album/${album.id}`))}
                  style={ehDesktop ? { flexGrow: 1, flexBasis: 200, maxWidth: 280 } : { width: 160 }}
                  className="group flex-col p-3 rounded-2xl bg-[#181C24] hover:bg-white/5 border border-white/5 transition-all shadow-lg"
                >
                  <View className="relative w-full aspect-square rounded-xl overflow-hidden bg-white/5 mb-3">
                    {album.capa_url ? (
                      <Image source={{ uri: album.capa_url }} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <View className="w-full h-full bg-surface items-center justify-center">
                        <UserIcon color="#94A3B8" size={32} />
                      </View>
                    )}
                    {/* Hover Play */}
                    <View className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#2563EB] items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-3 transition-all shadow-lg shadow-[#2563EB]/50">
                      <Play color="white" size={18} fill="white" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                  <Text numberOfLines={1} className="font-bold text-white text-sm group-hover:text-[#3B82F6] transition-colors">{album.nome}</Text>
                  <Text numberOfLines={1} className="text-gray-400 text-xs mt-1">{album.autor_apelido ?? "Autor desconhecido"}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* SEÇÃO 4: ARTISTAS DA COMUNIDADE */}
      <View className="px-5 mt-16">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight flex-row items-center gap-2">
               Artistas da Comunidade
            </Text>
            <Text className="text-sm text-gray-400 mt-1">Conecte-se diretamente com produtores e músicos para collabs, turnês e contratação direta</Text>
          </View>
        </View>

        <ScrollView horizontal={!ehDesktop} showsHorizontalScrollIndicator={false}>
          <View className={`flex-row ${ehDesktop ? "flex-wrap" : ""} gap-4`}>
            {artistasDestaque.map((artista) => (
              <Pressable
                key={artista.id}
                onPress={() => abrirPerfil(artista.id)}
                style={ehDesktop ? { flexGrow: 1, flexBasis: 220, maxWidth: 280 } : { width: 220 }}
                className="p-5 rounded-2xl bg-[#181C24] hover:bg-white/5 border border-white/5 transition-all flex-col items-center text-center group shadow-md"
              >
                <View className="relative w-24 h-24 mb-4">
                  <View className="w-full h-full rounded-full overflow-hidden border-4 border-[#181C24] shadow-xl">
                    <Image source={{ uri: artista.imagem_url ?? "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?q=80&w=200&auto=format&fit=crop" }} className="w-full h-full" />
                  </View>
                  <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#2563EB] border-2 border-[#181C24] items-center justify-center">
                    <Text className="text-white text-[8px] font-black">✓</Text>
                  </View>
                </View>
                <Text className="text-lg font-bold text-white group-hover:text-[#3B82F6] transition-colors">{artista.apelido}</Text>
                <Text className="text-xs text-gray-400 mt-1">{artista.local ?? "Local não informado"} • {artista.generos ?? "Músico"}</Text>
                <Text className="text-[#3B82F6] text-[10px] font-bold mt-2">{artista.total_curtidas}x Favoritado</Text>
                
                <View className="w-full mt-4 py-2 px-3 rounded-full bg-[#2563EB]/20 hover:bg-[#2563EB] transition-colors flex-row items-center justify-center gap-1">
                  <Calendar color={ehDesktop ? "#3B82F6" : "white"} size={14} className="group-hover:text-white" />
                  <Text className="text-[#3B82F6] group-hover:text-white text-xs font-bold transition-colors">Disponível p/ Shows</Text>
                </View>
              </Pressable>
            ))}
            {artistasDestaque.length === 0 && <Text className="text-gray-400 text-sm">Nenhum artista em destaque ainda.</Text>}
          </View>
        </ScrollView>
      </View>

      {/* SEÇÃO 5: DESCUBRA MAIS (procedural, cresce conforme rola a tela, sem repetir) */}
      <View className="px-5 mt-16">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight">Descubra Mais</Text>
            <Text className="text-sm text-gray-400 mt-1">Continue explorando novas músicas do ecossistema Vybe</Text>
          </View>
        </View>

        <View className="flex-col gap-2.5">
          {musicasDescoberta.map((item, index) => (
            <View key={item.id}>
              {renderLinhaMusica(item, index, musicasDescoberta)}
            </View>
          ))}
        </View>

        {carregandoDescoberta && (
          <View className="py-4 items-center justify-center">
            <Text className="text-gray-400 text-xs">Carregando mais músicas...</Text>
          </View>
        )}

        {!carregandoDescoberta && semMaisDescoberta && musicasDescoberta.length > 0 && (
          <View className="py-4 items-center justify-center">
            <Text className="text-gray-500 text-xs">Você chegou ao fim por enquanto.</Text>
          </View>
        )}

        {!carregandoDescoberta && musicasDescoberta.length === 0 && !semMaisDescoberta && (
          <Pressable
            onPress={carregarMaisDescoberta}
            className="py-3 items-center justify-center rounded-xl bg-white/5 border border-white/5 active:bg-white/10"
          >
            <Text className="text-[#3B82F6] text-xs font-bold">Carregar mais músicas</Text>
          </Pressable>
        )}
      </View>
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
          key={ehDesktop ? "desktop-grid" : "mobile-list"}
          numColumns={ehDesktop ? 2 : 1}
          columnWrapperStyle={ehDesktop ? { gap: 16, paddingHorizontal: 20, maxWidth: 1200, alignSelf: 'center', width: '100%', marginBottom: 12 } : undefined}
          showsVerticalScrollIndicator={false}
          data={musicas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom }}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#3B82F6" />}
          onEndReached={carregarMaisDescoberta}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={renderHeaderComponent}
          ListFooterComponent={renderFooterComponent}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-8 px-4">
              Nenhuma música encontrada no momento.
            </Text>
          }
          ItemSeparatorComponent={ehDesktop ? undefined : () => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <View 
              className={ehDesktop ? "" : "w-full px-5"}
              style={ehDesktop ? { flex: 1, minWidth: 300 } : undefined}
            >
              {renderLinhaMusica(item, index, musicas)}
            </View>
          )}
        />
      )}

      {/* Card de detalhes do evento */}
      <ModalEventoDetalhes eventoSelecionado={eventoSelecionado as any} carregandoEvento={carregandoEvento} onFechar={() => setEventoSelecionado(null)} />
    </View>
  );
} 