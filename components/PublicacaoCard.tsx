import { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useRequireAuth } from "../store/authPromptStore";
import { colors, rotulosTipoConta } from "../constants/theme";

export type PublicacaoFeedItem = {
  id: string;
  usuario_id: string;
  foto_url: string | null;
  descricao: string | null;
  criado_em: string;
  evento_id: string | null;
  usuario: {
    nome: string;
    tipo_conta: "musico" | "organizador" | "moderador" | "adm";
  } | null;
  apelido: string | null;
  foto_perfil_url: string | null;
  total_curtidas: number;
  curtido_por_mim: boolean;
  evento?: { nome: string; data: string; localizacao: string | null } | null;
};

export function PublicacaoCard({ item }: { item: PublicacaoFeedItem }) {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const requireAuth = useRequireAuth();
  const [curtido, setCurtido] = useState(item.curtido_por_mim);
  const [totalCurtidas, setTotalCurtidas] = useState(item.total_curtidas);
  const [enviando, setEnviando] = useState(false);

  async function alternarCurtida() {
    requireAuth(async () => {
      if (enviando || !usuarioLogado) return;
      setEnviando(true);

      // Atualização otimista: a UI responde na hora, e desfaz se a
      // chamada ao Supabase falhar.
      const novoEstado = !curtido;
      setCurtido(novoEstado);
      setTotalCurtidas((atual) => atual + (novoEstado ? 1 : -1));

      if (novoEstado) {
        const { error } = await supabase
          .from("curtida")
          .insert({ publicacao_id: item.id, usuario_id: usuarioLogado.id });
        if (error) {
          setCurtido(!novoEstado);
          setTotalCurtidas((atual) => atual - 1);
        }
      } else {
        const { error } = await supabase
          .from("curtida")
          .delete()
          .eq("publicacao_id", item.id)
          .eq("usuario_id", usuarioLogado.id);
        if (error) {
          setCurtido(!novoEstado);
          setTotalCurtidas((atual) => atual + 1);
        }
      }
      setEnviando(false);
    });
  }

  return (
    <View className="bg-card rounded-2xl mb-4 overflow-hidden border border-border">
      <Pressable
        onPress={() => router.push(`/usuario/${item.usuario_id}`)}
        className="flex-row items-center px-3 pt-3 pb-2"
      >
        {item.foto_perfil_url ? (
          <Image source={{ uri: item.foto_perfil_url }} className="w-10 h-10 rounded-full mr-3" />
        ) : (
          <View className="w-10 h-10 rounded-full bg-surface mr-3" />
        )}
        <View className="flex-1">
          <Text className="font-bold text-textDark">{item.apelido ?? item.usuario?.nome ?? "Usuário"}</Text>
          <Text className="text-muted text-xs">
            {item.usuario ? rotulosTipoConta[item.usuario.tipo_conta] ?? item.usuario.tipo_conta : ""}
          </Text>
        </View>
      </Pressable>

      {item.descricao && (
        <Text className="text-textDark px-3 pb-2">{item.descricao}</Text>
      )}

      {item.evento && (
        <View className="mx-3 mb-2 bg-surface rounded-xl px-3 py-2">
          <Text className="text-primary font-bold">{item.evento.nome}</Text>
          <Text className="text-muted text-xs mt-0.5">
            {item.evento.data} {item.evento.localizacao ? `· ${item.evento.localizacao}` : ""}
          </Text>
        </View>
      )}

      {item.foto_url && (
        <Image source={{ uri: item.foto_url }} className="w-full" style={{ aspectRatio: 1 }} resizeMode="cover" />
      )}

      <View className="flex-row items-center px-3 py-3">
        <Pressable onPress={alternarCurtida} disabled={enviando} className="flex-row items-center gap-2">
          <Heart size={22} color={curtido ? colors.danger : colors.muted} fill={curtido ? colors.danger : "transparent"} />
          <Text className="text-muted text-sm">{totalCurtidas}</Text>
        </Pressable>
      </View>
    </View>
  );
}
