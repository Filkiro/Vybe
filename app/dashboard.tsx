import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Heart, TrendingUp, Music2, Share2, Star, Play, BarChart2, MessageSquare, ExternalLink } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";

type MusicaStats = { id: string; nome: string; curtidas: number; arquivo_url: string; capa_url: string | null; };
type PublicacaoStats = { id: string; descricao: string; curtidas: number };

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const [publicacoes, setPublicacoes] = useState<PublicacaoStats[]>([]);
  const [musicas, setMusicas] = useState<MusicaStats[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    carregar();
  }, [usuario?.id]);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);

    const { data: posts } = await supabase
      .from("publicacao")
      .select("id, descricao")
      .eq("usuario_id", usuario.id);

    const listaPosts = posts ?? [];
    if (listaPosts.length > 0) {
      const { data: curtidasPosts } = await supabase
        .from("curtida")
        .select("publicacao_id")
        .in("publicacao_id", listaPosts.map((p) => p.id));

      const contagemPosts = new Map<string, number>();
      (curtidasPosts ?? []).forEach((c: any) => contagemPosts.set(c.publicacao_id, (contagemPosts.get(c.publicacao_id) ?? 0) + 1));
      setPublicacoes(listaPosts.map((p) => ({ ...p, curtidas: contagemPosts.get(p.id) ?? 0 })));
    } else {
      setPublicacoes([]);
    }

    const { data: musics } = await supabase
      .from("musica_com_autor")
      .select("id, nome, arquivo_url, capa_url")
      .eq("usuario_id", usuario.id);

    const listaMusicas = musics ?? [];
    if (listaMusicas.length > 0) {
      const { data: curtidasMusicas } = await supabase
        .from("curtida_musica")
        .select("musica_id")
        .in("musica_id", listaMusicas.map((m) => m.id));

      const contagemMusicas = new Map<string, number>();
      (curtidasMusicas ?? []).forEach((c: any) => contagemMusicas.set(c.musica_id, (contagemMusicas.get(c.musica_id) ?? 0) + 1));
      setMusicas(listaMusicas.map((m) => ({ ...m, curtidas: contagemMusicas.get(m.id) ?? 0 })));
    } else {
      setMusicas([]);
    }

    setCarregando(false);
  }

  const stats = useMemo(() => {
    const totalPubs = publicacoes.reduce((sum, p) => sum + p.curtidas, 0);
    const totalMusicas = musicas.reduce((sum, m) => sum + m.curtidas, 0);
    const totalCurtidas = totalPubs + totalMusicas;

    const topMusicas = [...musicas].sort((a, b) => b.curtidas - a.curtidas).slice(0, 5);
    const topPubs = [...publicacoes].sort((a, b) => b.curtidas - a.curtidas).slice(0, 5);

    const mediaMusicas = musicas.length ? (totalMusicas / musicas.length).toFixed(1) : "0.0";
    const mediaPubs = publicacoes.length ? (totalPubs / publicacoes.length).toFixed(1) : "0.0";

    return {
      totalCurtidas,
      totalPubs,
      totalMusicas,
      mediaMusicas,
      mediaPubs,
      topMusicas,
      topPubs,
      qteMusicas: musicas.length,
      qtePubs: publicacoes.length,
    };
  }, [publicacoes, musicas]);

  return (
    <View className="flex-1 bg-[#0a0e16]" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 1024, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        
        {/* Page Header */}
        <View className="flex-col justify-between gap-4 py-4 mb-6">
          <View className="flex-col gap-1">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-2 active:opacity-70 group">
              <ChevronLeft color="#8d90a0" size={18} />
              <Text className="text-[#8d90a0] font-medium text-sm tracking-wide">Voltar ao Perfil</Text>
            </Pressable>
            <Text className="text-white font-bold text-3xl tracking-tight">Desempenho de Músico</Text>
            <Text className="text-[#8d90a0] text-sm max-w-2xl mt-1">
              Estatísticas de engajamento, métricas de streaming e desempenho das suas criações no Vybe.
            </Text>
          </View>
        </View>

        {carregando ? (
          <Text className="text-[#8d90a0] text-center mt-8">Carregando dashboard completo...</Text>
        ) : !stats ? null : (
          <>
            {/* Hero Highlight Metric Card */}
            <View className="bg-[#181c24]/90 rounded-2xl p-6 mb-8 overflow-hidden relative shadow-xl">
               <View className="flex-col md:flex-row md:items-center justify-between gap-6 z-10">
                 <View className="flex-col gap-2">
                   <View className="flex-row items-center gap-2 mb-1">
                     <View className="w-8 h-8 rounded-lg bg-[#2563eb]/20 flex items-center justify-center">
                       <Star color="#b4c5ff" size={20} fill="#b4c5ff" />
                     </View>
                     <Text className="text-[#b4c5ff] text-xs font-semibold uppercase tracking-wider">TOTAL DE CURTIDAS</Text>
                   </View>
                   <View className="flex-row items-baseline gap-4 mt-1">
                     <Text className="text-white font-bold text-6xl tracking-tight leading-none">{stats.totalCurtidas}</Text>
                     <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-[#2563eb]/25">
                       <TrendingUp color="#b4c5ff" size={14} />
                       <Text className="text-[#b4c5ff] text-xs font-medium">+1 esta semana</Text>
                     </View>
                   </View>
                   <Text className="text-[#8d90a0] text-sm max-w-xl mt-2">
                     Métrica combinada de músicas lançadas e publicações no feed da comunidade autoral.
                   </Text>
                 </View>
               </View>
            </View>

            {/* Section 1: Músicas */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-semibold text-2xl">Músicas</Text>
                  <View className="px-2.5 py-0.5 rounded-full bg-[#262a33]">
                    <Text className="text-[#c3c6d7] text-xs font-medium">{stats.qteMusicas} {stats.qteMusicas === 1 ? 'faixa ativa' : 'faixas ativas'}</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push("/biblioteca/musicas")} className="flex-row items-center gap-1">
                  <Text className="text-[#b4c5ff] hover:text-white text-sm font-medium">Gerenciar faixas</Text>
                </Pressable>
              </View>

              <View className="flex-col md:flex-row gap-4 mb-4">
                <View className="flex-1 bg-[#181c24]/80 rounded-xl p-4 flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 rounded-xl bg-[#3761ea]/20 flex items-center justify-center">
                      <Heart color="#b7c4ff" size={24} fill="#b7c4ff" />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-2xl">{stats.totalMusicas}</Text>
                      <Text className="text-[#8d90a0] text-xs mt-0.5">Total de Curtidas em Músicas</Text>
                    </View>
                  </View>
                  <View className="flex-row items-end gap-1 opacity-30 h-8 w-16">
                    <View className="w-2 h-2 bg-[#b7c4ff] rounded-t" />
                    <View className="w-2 h-2 bg-[#b7c4ff] rounded-t" />
                    <View className="w-2 h-2 bg-[#b7c4ff] rounded-t" />
                    <View className="w-2 h-2 bg-[#b7c4ff] rounded-t" />
                  </View>
                </View>

                <View className="flex-1 bg-[#181c24]/80 rounded-xl p-4 flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 rounded-xl bg-[#0267b8]/20 flex items-center justify-center">
                      <TrendingUp color="#a4c9ff" size={24} />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-2xl">{stats.mediaMusicas}</Text>
                      <Text className="text-[#8d90a0] text-xs mt-0.5">Média de Curtidas por Música</Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded bg-[#1c2028]">
                    <Text className="text-[#8d90a0] text-xs font-medium">Estável</Text>
                  </View>
                </View>
              </View>

              {stats.topMusicas.length > 0 && (
                <View className="bg-[#0a0e16]/60 rounded-xl p-4">
                  <View className="flex-row items-center justify-between pb-1 mb-2">
                    <Text className="text-[#8d90a0] text-xs uppercase tracking-wider font-semibold">Top Músicas Mais Curtidas</Text>
                    <Text className="text-[#8d90a0] text-xs font-medium">Classificação Geral</Text>
                  </View>
                  {stats.topMusicas.map((m, i) => (
                    <View key={m.id} className="flex-row items-center justify-between p-2 rounded-lg bg-[#181c24]/70 mb-1 flex-wrap gap-2">
                      <View className="flex-row items-center gap-4 flex-1 min-w-[200px]">
                        <Text className="text-[#b4c5ff] font-bold text-xs w-5 text-center">#{i + 1}</Text>
                        <View className="w-12 h-12 rounded-lg bg-[#31353e] items-center justify-center shadow-md overflow-hidden">
                           {m.capa_url ? (
                             <Image source={{ uri: m.capa_url }} className="w-full h-full object-cover" />
                           ) : (
                             <Music2 color="white" size={22} />
                           )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-sm" numberOfLines={1}>{m.nome}</Text>
                          <Text className="text-[#8d90a0] text-xs mt-0.5" numberOfLines={1}>Faixa • {m.curtidas} curtidas</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c2028]">
                          <Heart color="#b7c4ff" size={16} fill="#b7c4ff" />
                          <Text className="text-white text-sm font-medium">{m.curtidas} curtidas</Text>
                        </View>
                        <View className="flex-row items-center gap-1 opacity-70">
                          <Pressable className="w-8 h-8 rounded-full items-center justify-center">
                            <BarChart2 color="#8d90a0" size={18} />
                          </Pressable>
                          <Pressable 
                            onPress={() => {
                              const fila = stats.topMusicas.map((t) => ({
                                id: t.id,
                                nome: t.nome,
                                autorApelido: null,
                                arquivoUrl: t.arquivo_url,
                                capaUrl: t.capa_url,
                              }));
                              tocarMusica(
                                { id: m.id, nome: m.nome, autorApelido: null, arquivoUrl: m.arquivo_url, capaUrl: m.capa_url },
                                fila
                              );
                            }}
                            className="w-8 h-8 rounded-full bg-[#2563eb] items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.3)]">
                            <Play color="white" size={18} fill="white" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Section 2: Publicações */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-semibold text-2xl">Publicações no Feed</Text>
                  <View className="px-2.5 py-0.5 rounded-full bg-[#262a33]">
                    <Text className="text-[#c3c6d7] text-xs font-medium">{stats.qtePubs} {stats.qtePubs === 1 ? 'publicação' : 'publicações'}</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push("/minhas-publicacoes")} className="flex-row items-center gap-1">
                  <Text className="text-[#b4c5ff] hover:text-white text-sm font-medium">Gerenciar publicações</Text>
                </Pressable>
              </View>

              <View className="flex-col md:flex-row gap-4 mb-4">
                <View className="flex-1 bg-[#181c24]/80 rounded-xl p-4 flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 rounded-xl bg-[#2563eb]/20 flex items-center justify-center">
                      <MessageSquare color="#b4c5ff" size={24} />
                    </View>
                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white font-bold text-2xl">{stats.totalPubs}</Text>
                        <Text className="text-[#b4c5ff] text-xs font-medium">+3 novo</Text>
                      </View>
                      <Text className="text-[#8d90a0] text-xs mt-0.5">Total de Curtidas em Publicações</Text>
                    </View>
                  </View>
                  <View className="flex-row items-end gap-1 h-8 w-16">
                    <View className="w-2.5 h-3 bg-[#2563eb]/40 rounded-t" />
                    <View className="w-2.5 h-5 bg-[#2563eb]/60 rounded-t" />
                    <View className="w-2.5 h-8 bg-[#b4c5ff] rounded-t shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                  </View>
                </View>

                <View className="flex-1 bg-[#181c24]/80 rounded-xl p-4 flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 rounded-xl bg-[#0267b8]/20 flex items-center justify-center">
                      <TrendingUp color="#a4c9ff" size={24} />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-2xl">{stats.mediaPubs}</Text>
                      <Text className="text-[#8d90a0] text-xs mt-0.5">Média de Curtidas por Publicação</Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded bg-[#2563eb]/20">
                    <Text className="text-[#b4c5ff] text-xs font-medium">Alto Impacto</Text>
                  </View>
                </View>
              </View>

              {stats.topPubs.length > 0 && (
                <View className="bg-[#0a0e16]/60 rounded-xl p-4">
                  <View className="flex-row items-center justify-between pb-1 mb-2">
                    <Text className="text-[#8d90a0] text-xs uppercase tracking-wider font-semibold">Top Publicações Mais Curtidas</Text>
                    <Text className="text-[#8d90a0] text-xs font-medium">Taxa de Engajamento 100%</Text>
                  </View>
                  {stats.topPubs.map((p, i) => (
                    <View key={p.id} className="flex-row items-center justify-between p-2 rounded-lg bg-[#181c24]/70 mb-1 flex-wrap gap-2">
                      <View className="flex-row items-center gap-4 flex-1 min-w-[200px]">
                        <Text className="text-[#b4c5ff] font-bold text-xs w-5 text-center">#{i + 1}</Text>
                        <View className="w-12 h-12 rounded-lg bg-[#31353e] items-center justify-center">
                           <MessageSquare color="#b4c5ff" size={22} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-sm" numberOfLines={1}>{p.descricao || "(sem descrição)"}</Text>
                          <Text className="text-[#8d90a0] text-xs mt-0.5" numberOfLines={1}>Publicado há 3 dias • Feed da Cena</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2563eb]/20">
                          <Heart color="#b4c5ff" size={16} fill="#b4c5ff" />
                          <Text className="text-white text-sm font-bold">{p.curtidas} curtidas</Text>
                        </View>
                        <Pressable onPress={() => router.push("/minhas-publicacoes")} className="w-8 h-8 rounded-full items-center justify-center">
                          <ExternalLink color="#8d90a0" size={18} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

          </>
        )}
      </ScrollView>
    </View>
  );
}

