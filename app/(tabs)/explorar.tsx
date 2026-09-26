import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
} from "react-native";
import { Compass, TrendingUp, Calendar } from "lucide-react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { PublicacaoCard, PublicacaoFeedItem } from "../../components/PublicacaoCard";

const FILTROS_CENA = ["Tudo", "Lançamentos", "Eventos", "Em Alta", "Bastidores & Estúdio", "Collabs"];

export default function Explorar() {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<PublicacaoFeedItem[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState("Tudo");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [destaques, setDestaques] = useState<any[]>([]);
  const [oportunidade, setOportunidade] = useState<any>(null);
  const paddingBottom = usePlayerAwarePadding(140);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const carregar = useCallback(async () => {
    const { data: posts } = await supabase
      .from("publicacao")
      .select(
        "id, usuario_id, foto_url, descricao, criado_em, evento_id, musica_id, album_id, usuario:usuario_id(nome, tipo_conta), evento:evento_id(nome, data, localizacao), musica:musica_id(id, nome, capa_url, arquivo_url), album:album_id(id, nome, capa_url)"
      )
      .order("criado_em", { ascending: false });

    if (!posts) {
      setPublicacoes([]);
      setCarregando(false);
      return;
    }

    const { data: perfisMusico } = await supabase.from("perfil_musico").select("usuario_id, apelido, foto_url");
    const { data: perfisOrg } = await supabase.from("perfil_organizador").select("usuario_id, banner_url");

    const userId = usuarioLogado?.id;
    let likesSet = new Set();
    if (userId) {
      try {
        const { data: meusLikes } = await supabase.from("curtida_publicacao").select("publicacao_id").eq("usuario_id", userId);
        likesSet = new Set(meusLikes?.map((l: any) => l.publicacao_id));
      } catch (e) {}
    }

    let contagemLikes = null;
    try {
      const resp = await supabase.from("curtida_publicacao").select("publicacao_id");
      contagemLikes = resp.data;
    } catch (e) {
      console.log("Ignorando curtidas por enquanto", e);
    }
    const mapaLikes: Record<string, number> = {};
    if (contagemLikes) {
      contagemLikes.forEach((l: any) => {
        mapaLikes[l.publicacao_id] = (mapaLikes[l.publicacao_id] || 0) + 1;
      });
    }

    const formatados: PublicacaoFeedItem[] = posts.map((p: any) => {
      let apelido = null;
      let foto = null;
      if (p.usuario?.tipo_conta === "musico") {
        const perf = perfisMusico?.find((x) => x.usuario_id === p.usuario_id);
        if (perf) { apelido = perf.apelido; foto = perf.foto_url; }
      } else if (p.usuario?.tipo_conta === "organizador") {
        const perf = perfisOrg?.find((x) => x.usuario_id === p.usuario_id);
        if (perf) { foto = perf.banner_url; }
      }

      return {
        ...p,
        apelido,
        foto_perfil_url: foto,
        total_curtidas: mapaLikes[p.id] || 0,
        curtido_por_mim: likesSet.has(p.id),
      };
    });

    setPublicacoes(formatados);

    // Compute Destaques (Top 2 musicians by total likes on their posts)
    const likesPorMusico: Record<string, number> = {};
    formatados.forEach(p => {
        if (p.usuario?.tipo_conta === "musico" && p.apelido) {
            likesPorMusico[p.usuario_id] = (likesPorMusico[p.usuario_id] || 0) + (mapaLikes[p.id] || 0);
        }
    });
    
    // Sort and get top 2
    const topDestaques = Object.entries(likesPorMusico)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([uid, likes]) => {
            const perf = perfisMusico?.find(x => x.usuario_id === uid);
            return {
                id: uid,
                apelido: perf?.apelido || 'Desconhecido',
                foto: perf?.foto_url,
                genero: "Artista Independente", // Could fetch from DB if needed
                likes
            };
        });
    setDestaques(topDestaques);

    // Fetch Oportunidade
    const { data: ultimosEventos } = await supabase
        .from('evento')
        .select('id, nome, descricao, data, organizador_id, organizador:organizador_id(nome)')
        .order('criado_em', { ascending: false })
        .limit(1);
        
    if (ultimosEventos && ultimosEventos.length > 0) {
        setOportunidade(ultimosEventos[0]);
    } else {
        setOportunidade(null);
    }
    setCarregando(false);
  }, [usuarioLogado?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aoAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const publicacoesFiltradas = publicacoes.filter((p) => {
    if (filtroAtivo === "Lançamentos") return p.usuario?.tipo_conta === "musico" && p.foto_url;
    if (filtroAtivo === "Eventos") return !!p.evento_id;
    return true;
  });

  const FeedHeader = () => (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4 mt-2">
        <View>
          <View className="flex-row items-center gap-3">
            <Text className="text-[28px] font-extrabold text-white tracking-tight">Feed da Cena</Text>
            <View className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-md shadow-[#3b82f6]/50" />
          </View>
          <Text className="text-xs text-[#94a3b8] mt-1">Conecte-se com as novidades, ensaios e lançamentos da comunidade independente</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2 pt-1">
        {FILTROS_CENA.map((f) => {
          const ativo = f === filtroAtivo;
          return (
            <Pressable
              key={f}
              onPress={() => setFiltroAtivo(f)}
              className={`px-5 py-2 rounded-full mr-2.5 transition-all ${
                ativo 
                  ? "bg-[#2563eb] border border-[#2563eb]" 
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <Text className={`text-xs tracking-wide font-medium ${ativo ? "text-white font-semibold" : "text-[#cbd5e1]"}`}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const WidgetsSidebar = () => (
    <View className="w-full flex-col gap-6">
      <View className="bg-[#121724] rounded-2xl p-5 border border-white/5 shadow-xl">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <TrendingUp color="#60a5fa" size={16} />
            <Text className="text-sm font-bold text-white">Artistas em Destaque</Text>
          </View>
          <Text className="text-[11px] text-[#60a5fa]">Ver todos</Text>
        </View>

        <View className="flex-col gap-3">
          {destaques.length > 0 ? destaques.map((dest, i) => (
            <Pressable key={dest.id} onPress={() => router.push(`/usuario/${dest.id}`)} className="flex-row items-center gap-3 p-2 rounded-xl bg-white/5 active:bg-white/10">
              <View className="w-10 h-10 rounded-full items-center justify-center overflow-hidden bg-slate-800">
                {dest.foto ? (
                  <Image source={{uri: dest.foto}} className="w-full h-full" />
                ) : (
                  <Text className="text-white font-bold text-xs">{dest.apelido.substring(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white text-xs font-bold">{dest.apelido}</Text>
                <Text className="text-[#64748b] text-[10px]">{dest.genero} • {dest.likes} curtidas</Text>
              </View>
            </Pressable>
          )) : (
            <Text className="text-xs text-slate-500">Nenhum artista em destaque ainda.</Text>
          )}
        </View>
      </View>

      {oportunidade && (
        <View className="rounded-2xl p-5 bg-[#151c2c] border border-[#3b82f6]/30 overflow-hidden relative">
          <View className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#3b82f6]/10 rounded-full blur-2xl pointer-events-none" />
          <View className="flex-row items-center justify-between mb-2">
            <View className="px-2 py-0.5 rounded bg-[#3b82f6]">
              <Text className="text-[10px] font-bold uppercase text-white tracking-wider">Oportunidade</Text>
            </View>
            {oportunidade.data && <Text className="text-[11px] text-[#93c5fd]">{new Date(oportunidade.data).toLocaleDateString('pt-BR')}</Text>}
          </View>
          
          <Text className="font-bold text-sm text-white mt-1" numberOfLines={1}>{oportunidade.nome}</Text>
          <Text className="text-xs text-[#cbd5e1] mt-1 leading-relaxed" numberOfLines={2}>
            {oportunidade.descricao || "Participe deste evento!"}
          </Text>
          
          <Pressable 
            onPress={async () => {
              if (usuarioLogado) {
                 router.push(`/chat/novo?contatoId=${oportunidade.organizador_id}&contatoNome=${encodeURIComponent(oportunidade.organizador?.nome || 'Organizador')}`);
              }
            }}
            className="w-full mt-3 py-2 rounded-xl bg-[#2563eb] items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-xs tracking-wide">Conversar com Organizador</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-[#0a0e17] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-[#0a0e17]" 
      contentContainerStyle={{ paddingBottom, paddingHorizontal: 16, paddingTop: 24 }}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#3b82f6" />}
    >
      <View className="w-full max-w-[1200px] mx-auto flex-col lg:flex-row gap-8">
        
        {/* ESQUERDA: FEED */}
        <View className="flex-[7] min-w-0 flex-col">
          <FeedHeader />
          
          <View className="flex-col gap-6 mt-4 items-center">
            {publicacoesFiltradas.length > 0 ? (
              publicacoesFiltradas.map((item) => (
                <View key={item.id} className="w-full max-w-[600px]"><PublicacaoCard item={item} /></View>
              ))
            ) : (
              <View className="py-20 items-center justify-center">
                <Compass size={48} color="#334155" />
                <Text className="text-[#94a3b8] text-sm mt-4 font-medium text-center">
                  Nenhuma publicação encontrada.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* DIREITA: WIDGETS (Sempre aparece embaixo no mobile, e na direita no Desktop) */}
        <View className="flex-[4] min-w-0 pt-4">
          <View className="lg:sticky top-4">
            <WidgetsSidebar />
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
