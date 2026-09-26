import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Calendar, MapPin, MessageCircle } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";
import { withAuth } from "../components/AuthGuard";

function MeusEventos() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"confirmados" | "historico">("confirmados");

  useEffect(() => {
    if (!usuario) return;
    setCarregando(true);
    supabase
      .from("evento_convite")
      .select("id, status, evento:evento_id(*, organizador:usuario!organizador_id(nome, id))")
      .eq("musico_id", usuario.id)
      .eq("status", "aceito")
      .then(({ data }) => {
        let evts = data ?? [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Considerar inicio do dia atual
        
        if (aba === "confirmados") {
           evts = evts.filter(d => {
             if (!d.evento?.data) return true;
             return new Date(d.evento.data + "T12:00:00Z") >= hoje;
           });
        } else {
           evts = evts.filter(d => {
             if (!d.evento?.data) return false;
             return new Date(d.evento.data + "T12:00:00Z") < hoje;
           });
        }

        setEventos(evts);
        setCarregando(false);
      });
  }, [usuario, aba]);

  async function irParaChat(organizadorId: string, nomeOrganizador: string) {
    if (!usuario || !organizadorId) return;
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
    <View className="flex-1 bg-[#0f131c]">
      <View className="absolute top-10 -left-10 w-96 h-96 bg-[#2563eb]/10 rounded-full blur-3xl" />
      <View className="absolute bottom-24 -right-10 w-80 h-80 bg-[#3761ea]/10 rounded-full blur-3xl" />

      <View className="px-6 pt-16 pb-4">
        <View className="flex-row items-center gap-4 mb-6">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-[#181c24]/80 items-center justify-center border border-white/5 shadow-md">
            <ChevronLeft color="#dfe2ee" size={24} />
          </Pressable>
          <View>
            <Text className="text-2xl font-bold text-[#dfe2ee] tracking-tight">Eventos Contratados</Text>
            <Text className="text-sm text-[#c3c6d7] mt-0.5">Seus shows e apresentações confirmadas</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-6">
          <Pressable 
            onPress={() => setAba("confirmados")}
            className={`px-4 py-2 rounded-full ${aba === "confirmados" ? "bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.35)]" : "bg-[#181c24]/60 border border-white/5"}`}
          >
            <Text className={`text-sm font-medium ${aba === "confirmados" ? "text-white" : "text-[#c3c6d7]"}`}>
              Confirmados {aba === "confirmados" ? `(${eventos.length})` : ""}
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => setAba("historico")}
            className={`px-4 py-2 rounded-full ${aba === "historico" ? "bg-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.35)]" : "bg-[#181c24]/60 border border-white/5"}`}
          >
            <Text className={`text-sm font-medium ${aba === "historico" ? "text-white" : "text-[#c3c6d7]"}`}>
              Histórico {aba === "historico" ? `(${eventos.length})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Calendar color="#434655" size={48} strokeWidth={1.5} />
              <Text className="text-[#8d90a0] text-center mt-4">Nenhum evento encontrado nesta categoria.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const dataObj = item.evento?.data ? new Date(item.evento.data + "T12:00:00Z") : null;
            const dataStr = dataObj ? dataObj.toLocaleDateString('pt-BR') : 'Data não definida';

            return (
              <View className="rounded-2xl bg-[#1c2028]/90 border border-[#31353e] p-5 shadow-lg mb-4">
                <View className="flex-row flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#31353e] pt-0">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl text-[#dfe2ee] font-bold tracking-tight">{item.evento?.nome}</Text>
                    <View className="px-2.5 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-800/50">
                      <Text className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Confirmado</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-col gap-4 py-4">
                  <View className="flex-row items-center gap-3 text-white">
                    <Calendar color="#b4c5ff" size={20} />
                    <View className="flex-col">
                      <Text className="text-[11px] text-[#8d90a0]">Data e Horário</Text>
                      <Text className="text-sm font-medium text-[#dfe2ee]">
                        {dataStr} {item.evento?.horario ? `às ${item.evento?.horario}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 text-white">
                    <MapPin color="#b4c5ff" size={20} />
                    <View className="flex-col">
                      <Text className="text-[11px] text-[#8d90a0]">Local</Text>
                      <Text className="text-sm font-medium text-[#dfe2ee]">{item.evento?.localizacao || "Local não definido"}</Text>
                    </View>
                  </View>
                </View>

                <View className="mt-2 pt-4 border-t border-[#31353e] flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-[#31353e] flex items-center justify-center">
                      <Text className="text-[#b4c5ff] font-bold text-lg">
                        {item.evento?.organizador?.nome?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View className="flex-col">
                      <Text className="text-[10px] text-[#8d90a0] uppercase tracking-wider font-semibold">Organizador</Text>
                      <Text className="text-sm text-[#dfe2ee] font-semibold">{item.evento?.organizador?.nome || "Desconhecido"}</Text>
                    </View>
                  </View>
                  <Pressable 
                    onPress={() => irParaChat(item.evento?.organizador?.id, item.evento?.organizador?.nome)} 
                    className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#2563eb] hover:scale-105 active:scale-95 transition-transform"
                  >
                    <MessageCircle color="white" size={16} />
                    <Text className="text-white text-xs font-bold">Abrir Chat</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

export default withAuth(MeusEventos, ['musico']);
