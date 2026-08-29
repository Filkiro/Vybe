import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Heart, TrendingUp, Music2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

// Dashboard livre pro músico entender o desempenho das próprias
// publicações: total de curtidas, média por publicação, publicação
// mais curtida e evolução recente. Como "publicacao" não tem FK
// pra musica/album, as métricas são por publicação (que é onde a
// curtida vive), não por faixa individual.
export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<any[]>([]);
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
      .select("id, descricao, foto_url, criado_em")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: true });

    const lista = posts ?? [];
    if (lista.length === 0) {
      setPublicacoes([]);
      setCarregando(false);
      return;
    }

    const { data: curtidas } = await supabase
      .from("curtida")
      .select("publicacao_id")
      .in("publicacao_id", lista.map((p) => p.id));

    const contagem = new Map<string, number>();
    (curtidas ?? []).forEach((c: any) => contagem.set(c.publicacao_id, (contagem.get(c.publicacao_id) ?? 0) + 1));

    setPublicacoes(lista.map((p) => ({ ...p, curtidas: contagem.get(p.id) ?? 0 })));
    setCarregando(false);
  }

  const stats = useMemo(() => {
    if (publicacoes.length === 0) return null;
    const total = publicacoes.reduce((soma, p) => soma + p.curtidas, 0);
    const media = total / publicacoes.length;
    const maisCurtida = [...publicacoes].sort((a, b) => b.curtidas - a.curtidas)[0];
    const top5 = [...publicacoes].sort((a, b) => b.curtidas - a.curtidas).slice(0, 5);
    return { total, media, maisCurtida, top5, totalPublicacoes: publicacoes.length };
  }, [publicacoes]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-2 p-1">
          <ChevronLeft color={colors.textDark} size={24} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Dashboard de curtidas</Text>
      </View>

      {carregando ? (
        <Text className="text-muted text-center mt-8">Carregando...</Text>
      ) : !stats ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted text-center">
            Você ainda não tem publicações. Divulgue um álbum ou música na aba Criar pra começar a acompanhar suas curtidas aqui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row gap-3 mb-4">
            <CardEstatistica icone={<Heart color={colors.danger} size={20} />} rotulo="Total de curtidas" valor={String(stats.total)} />
            <CardEstatistica icone={<TrendingUp color={colors.primary} size={20} />} rotulo="Média por publicação" valor={stats.media.toFixed(1)} />
          </View>
          <View className="flex-row gap-3 mb-6">
            <CardEstatistica icone={<Music2 color={colors.success} size={20} />} rotulo="Publicações" valor={String(stats.totalPublicacoes)} />
            <CardEstatistica icone={<Heart color={colors.warning} size={20} />} rotulo="Mais curtida" valor={String(stats.maisCurtida.curtidas)} />
          </View>

          <Text className="text-textDark font-bold text-lg mb-3">Top publicações</Text>
          {stats.top5.map((p, i) => (
            <View key={p.id} className="flex-row items-center bg-card rounded-2xl p-3 mb-3 border border-border">
              <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-3">
                <Text className="text-textDark font-bold">{i + 1}</Text>
              </View>
              <Text className="flex-1 text-textDark" numberOfLines={2}>
                {p.descricao || "(sem descrição)"}
              </Text>
              <View className="flex-row items-center ml-2">
                <Heart color={colors.danger} size={16} fill={colors.danger} />
                <Text className="text-muted text-sm ml-1">{p.curtidas}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CardEstatistica({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: string }) {
  return (
    <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
      {icone}
      <Text className="text-2xl font-bold text-textDark mt-2">{valor}</Text>
      <Text className="text-muted text-xs mt-0.5">{rotulo}</Text>
    </View>
  );
}
