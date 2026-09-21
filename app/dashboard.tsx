import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Heart, TrendingUp, Music2, Share2, Star } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

type MusicaStats = { id: string; nome: string; curtidas: number };
type PublicacaoStats = { id: string; descricao: string; curtidas: number };

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
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

    // 1. Carregar publicações e suas curtidas
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

    // 2. Carregar músicas (via view musica_com_autor) e suas curtidas
    const { data: musics } = await supabase
      .from("musica_com_autor")
      .select("id, nome")
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
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pt-14 pb-3 bg-card border-b border-border">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-2 p-1">
          <ChevronLeft color={colors.textDark} size={24} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Dashboard Geral</Text>
      </View>

      {carregando ? (
        <Text className="text-muted text-center mt-8">Carregando dashboard completo...</Text>
      ) : !stats || (stats.qteMusicas === 0 && stats.qtePubs === 0) ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted text-center">
            Você ainda não tem músicas ou publicações para analisar.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
          
          <View className="bg-primary/10 rounded-3xl p-5 mb-6 border border-primary/20 items-center">
            <Text className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Total de Curtidas</Text>
            <View className="flex-row items-center gap-2">
              <Star color={colors.primary} size={32} fill={colors.primary} />
              <Text className="text-5xl font-black text-textDark">{stats.totalCurtidas}</Text>
            </View>
          </View>

          <Text className="text-textDark font-bold text-lg mb-3">Músicas ({stats.qteMusicas})</Text>
          <View className="flex-row gap-3 mb-6">
            <CardEstatistica icone={<Heart color="#8B5CF6" size={20} />} rotulo="Curtidas" valor={String(stats.totalMusicas)} />
            <CardEstatistica icone={<TrendingUp color="#8B5CF6" size={20} />} rotulo="Média/Música" valor={stats.mediaMusicas} />
          </View>

          {stats.topMusicas.length > 0 && (
            <View className="mb-8">
              <Text className="text-textDark font-bold text-base mb-3">Top Músicas Mais Curtidas</Text>
              {stats.topMusicas.map((m, i) => (
                <View key={m.id} className="flex-row items-center bg-card rounded-2xl p-3 mb-2 border border-border">
                  <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-3">
                    <Text className="text-textDark font-bold">{i + 1}</Text>
                  </View>
                  <Text className="flex-1 text-textDark font-medium" numberOfLines={1}>
                    {m.nome}
                  </Text>
                  <View className="flex-row items-center ml-2 bg-white/5 px-2 py-1 rounded-full">
                    <Heart color={colors.danger} size={14} fill={colors.danger} />
                    <Text className="text-white text-xs ml-1 font-bold">{m.curtidas}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text className="text-textDark font-bold text-lg mb-3">Publicações ({stats.qtePubs})</Text>
          <View className="flex-row gap-3 mb-6">
            <CardEstatistica icone={<Share2 color="#3B82F6" size={20} />} rotulo="Curtidas" valor={String(stats.totalPubs)} />
            <CardEstatistica icone={<TrendingUp color="#3B82F6" size={20} />} rotulo="Média/Pub" valor={stats.mediaPubs} />
          </View>

          {stats.topPubs.length > 0 && (
            <View className="mb-2">
              <Text className="text-textDark font-bold text-base mb-3">Top Publicações Mais Curtidas</Text>
              {stats.topPubs.map((p, i) => (
                <View key={p.id} className="flex-row items-center bg-card rounded-2xl p-3 mb-2 border border-border">
                  <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-3">
                    <Text className="text-textDark font-bold">{i + 1}</Text>
                  </View>
                  <Text className="flex-1 text-textDark text-sm" numberOfLines={2}>
                    {p.descricao || "(sem descrição)"}
                  </Text>
                  <View className="flex-row items-center ml-2 bg-white/5 px-2 py-1 rounded-full">
                    <Heart color={colors.danger} size={14} fill={colors.danger} />
                    <Text className="text-white text-xs ml-1 font-bold">{p.curtidas}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

function CardEstatistica({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: string }) {
  return (
    <View className="flex-1 bg-card rounded-2xl p-4 border border-border flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-full bg-surface items-center justify-center">
        {icone}
      </View>
      <View>
        <Text className="text-xl font-bold text-textDark">{valor}</Text>
        <Text className="text-muted text-xs">{rotulo}</Text>
      </View>
    </View>
  );
}
