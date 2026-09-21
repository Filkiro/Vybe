import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Calendar } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";
import { withAuth } from "../components/AuthGuard";

function MeusEventos() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from("evento_convite")
      .select("id, status, evento:evento_id(*, organizador:usuario!organizador_id(nome, id))")
      .eq("musico_id", usuario.id)
      .eq("status", "aceito")
      .then(({ data }) => {
        setEventos(data ?? []);
        setCarregando(false);
      });
  }, [usuario]);

  async function irParaChat(organizadorId: string, nomeOrganizador: string) {
    if (!usuario) return;
    let conversaId;
    const { data: convExistente } = await supabase
      .from("conversa")
      .select("id")
      .or(`and(usuario_id1.eq.${usuario.id},usuario_id2.eq.${organizadorId}),and(usuario_id1.eq.${organizadorId},usuario_id2.eq.${usuario.id})`)
      .maybeSingle();

    if (convExistente) {
      conversaId = convExistente.id;
    } else {
      const { data: novaConv } = await supabase
        .from("conversa")
        .insert({ usuario_id1: usuario.id, usuario_id2: organizadorId })
        .select()
        .single();
      if (novaConv) conversaId = novaConv.id;
    }

    if (conversaId) {
      router.push(`/chat/${conversaId}?contatoId=${organizadorId}&contatoNome=${encodeURIComponent(nomeOrganizador)}`);
    }
  }

  return (
    <View className="flex-1 bg-[#0B101E] pt-12">
      <View className="flex-row items-center px-4 mb-6">
        <Pressable onPress={() => router.back()} className="p-2 mr-2 bg-white/5 rounded-full">
          <ChevronLeft color={colors.textDark} size={24} />
        </Pressable>
        <Text className="text-2xl font-bold text-white">Eventos Contratados</Text>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Calendar color={colors.muted} size={48} strokeWidth={1.5} />
              <Text className="text-gray-400 text-center mt-4">Nenhum evento contratado no momento.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => irParaChat(item.evento?.organizador?.id, item.evento?.organizador?.nome)}
              className="bg-[#1A2235] border border-white/5 rounded-2xl p-4 mb-4 active:opacity-80"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-white font-bold text-lg flex-1">{item.evento?.nome}</Text>
                <View className="bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30">
                  <Text className="text-emerald-500 text-[10px] font-bold uppercase">Confirmado</Text>
                </View>
              </View>
              
              <Text className="text-gray-400 text-sm mb-1">📅 {item.evento?.data} {item.evento?.horario ? `às ${item.evento?.horario}` : ""}</Text>
              <Text className="text-gray-400 text-sm mb-4">📍 {item.evento?.localizacao || "Local não definido"}</Text>

              <View className="bg-white/5 rounded-xl p-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold uppercase mb-0.5">Organizador</Text>
                  <Text className="text-white text-sm">{item.evento?.organizador?.nome}</Text>
                </View>
                <Text className="text-primary text-xs font-bold">Abrir Chat</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export default withAuth(MeusEventos, ['musico']);
