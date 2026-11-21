// components/ModalConvidarMusico.tsx
import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { X, Calendar, MapPin, Sparkles, Plus, CheckCircle2, AlertCircle, Send } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { enviarConviteParaMusico } from "../lib/conversaUtils";
import { obterIniciais } from "../lib/avatarUtils";

interface ModalConvidarMusicoProps {
  visible: boolean;
  onClose: () => void;
  musicoId: string;
  musicoNome: string;
  musicoFotoUrl?: string | null;
  musicoGenero?: string | null;
}

export function ModalConvidarMusico({
  visible,
  onClose,
  musicoId,
  musicoNome,
  musicoFotoUrl,
  musicoGenero,
}: ModalConvidarMusicoProps) {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const [eventos, setEventos] = useState<any[]>([]);
  const [convitesExistentes, setConvitesExistentes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !usuario || !musicoId) return;
    carregarEventosDoOrganizador();
  }, [visible, usuario?.id, musicoId]);

  async function carregarEventosDoOrganizador() {
    setCarregando(true);
    setMensagemSucesso(null);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: listaEventos } = await supabase
        .from("evento")
        .select("id, nome, data, horario, localizacao, genero_musical, capacidade")
        .eq("organizador_id", usuario?.id)
        .gte("data", hoje)
        .order("data", { ascending: true });

      const evts = listaEventos ?? [];
      setEventos(evts);

      if (evts.length > 0) {
        const eventoIds = evts.map((e) => e.id);
        const { data: convites } = await supabase
          .from("evento_convite")
          .select("evento_id, status")
          .eq("musico_id", musicoId)
          .in("evento_id", eventoIds);

        const mapa: Record<string, string> = {};
        (convites ?? []).forEach((c: any) => {
          mapa[c.evento_id] = c.status;
        });
        setConvitesExistentes(mapa);
      }
    } catch (e) {
      console.error("Erro ao carregar eventos para convite:", e);
    } finally {
      setCarregando(false);
    }
  }

  async function handleEnviarConvite(evento: any) {
    if (!usuario) return;
    setEnviandoId(evento.id);

    // Se for músico mock/demo
    if (musicoId.startsWith("demo-")) {
      setEnviandoId(null);
      alert(`Convite demonstrativo para "${evento.nome}" enviado com sucesso para ${musicoNome}!`);
      onClose();
      return;
    }

    const res = await enviarConviteParaMusico({
      organizadorId: usuario.id,
      musicoId,
      eventoId: evento.id,
      eventoNome: evento.nome,
    });

    setEnviandoId(null);

    if (res.sucesso && res.conversaId) {
      setMensagemSucesso(`Convite enviado para ${musicoNome}!`);
      setTimeout(() => {
        onClose();
        router.push(
          `/chat/${res.conversaId}?contatoId=${musicoId}&contatoNome=${encodeURIComponent(
            musicoNome
          )}&contatoFotoUrl=${encodeURIComponent(musicoFotoUrl || "")}`
        );
      }, 700);
    } else {
      alert(res.erro || "Não foi possível enviar o convite.");
    }
  }

  function verificarCompatibilidade(generoEvento: string | null): boolean {
    if (!generoEvento || !musicoGenero) return false;
    const gEvt = generoEvento.toLowerCase();
    const gMus = musicoGenero.toLowerCase();
    const termos = gMus.split(/[\s•,/]+/).filter((t) => t.length > 2);
    return termos.some((t) => gEvt.includes(t));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/80 items-center justify-center p-4">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#121829] border border-white/10 rounded-3xl p-6 shadow-2xl relative"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-white/5">
            <View className="flex-row items-center gap-3 flex-1 pr-4">
              <View className="w-12 h-12 rounded-full overflow-hidden bg-[#1e293b] items-center justify-center border border-white/10 shrink-0">
                {musicoFotoUrl ? (
                  <Image source={{ uri: musicoFotoUrl }} className="w-full h-full" />
                ) : (
                  <Text className="text-primary font-black text-sm tracking-wider">
                    {obterIniciais(musicoNome)}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg leading-tight" numberOfLines={1}>
                  Convidar para Evento
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                  Selecione o evento para enviar convite a <Text className="text-primary font-semibold">{musicoNome}</Text>
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center active:scale-95"
            >
              <X color="#94A3B8" size={18} />
            </Pressable>
          </View>

          {/* Feedback Sucesso */}
          {mensagemSucesso && (
            <View className="my-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex-row items-center gap-2">
              <CheckCircle2 color="#34D399" size={18} />
              <Text className="text-emerald-300 font-semibold text-xs">{mensagemSucesso}</Text>
            </View>
          )}

          {/* Conteúdo */}
          {carregando ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator color="#3B82F6" size="large" />
              <Text className="text-gray-400 text-xs mt-3">Carregando seus eventos abertos...</Text>
            </View>
          ) : eventos.length === 0 ? (
            <View className="py-12 px-4 items-center text-center">
              <View className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mb-3">
                <Calendar color="#64748B" size={28} />
              </View>
              <Text className="text-white font-bold text-base mb-1 text-center">Nenhum evento em aberto</Text>
              <Text className="text-gray-400 text-xs text-center mb-5 max-w-sm leading-relaxed">
                Você não possui eventos futuros cadastrados para convidar músicos. Crie seu primeiro evento na Central de Criação.
              </Text>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(tabs)/criar");
                }}
                className="flex-row items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 transition-all px-5 py-2.5 rounded-full"
              >
                <Plus color="white" size={16} />
                <Text className="text-white font-bold text-xs">Criar Novo Evento</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView className="max-h-[380px] my-3 pr-1" showsVerticalScrollIndicator={false}>
              <View className="flex-col gap-3">
                {eventos.map((evento) => {
                  const statusConvite = convitesExistentes[evento.id];
                  const jaConvidado = !!statusConvite && statusConvite !== "cancelado";
                  const compativel = verificarCompatibilidade(evento.genero_musical);
                  const enviandoEste = enviandoId === evento.id;

                  const dataObj = evento.data ? new Date(evento.data + "T12:00:00Z") : null;
                  const dataFormatada = dataObj ? dataObj.toLocaleDateString("pt-BR") : "Data a definir";

                  return (
                    <View
                      key={evento.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex-col gap-3"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-white font-bold text-sm">{evento.nome}</Text>
                            {compativel && (
                              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                <Sparkles size={10} color="#34D399" />
                                <Text className="text-emerald-300 text-[10px] font-bold">Gênero Compatível</Text>
                              </View>
                            )}
                          </View>

                          <View className="flex-row items-center gap-3 mt-1.5 flex-wrap">
                            <View className="flex-row items-center gap-1">
                              <Calendar size={12} color="#94A3B8" />
                              <Text className="text-gray-400 text-xs">
                                {dataFormatada} {evento.horario ? `às ${evento.horario}` : ""}
                              </Text>
                            </View>
                            {evento.localizacao && (
                              <View className="flex-row items-center gap-1">
                                <MapPin size={12} color="#94A3B8" />
                                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                                  {evento.localizacao}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Botão de Ação */}
                      <View className="flex-row items-center justify-between pt-2 border-t border-white/5">
                        <Text className="text-xs text-gray-500 font-medium">
                          {evento.genero_musical || "Gênero Geral"}
                        </Text>

                        {jaConvidado ? (
                          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10">
                            <CheckCircle2 size={13} color="#34D399" />
                            <Text className="text-gray-300 text-xs font-semibold capitalize">
                              {statusConvite === "aceito" ? "Confirmado" : statusConvite === "recusado" ? "Recusado" : "Convite Pendente"}
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleEnviarConvite(evento)}
                            disabled={enviandoEste}
                            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 transition-all"
                          >
                            {enviandoEste ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <>
                                <Send size={12} color="white" />
                                <Text className="text-white font-bold text-xs">Enviar Convite</Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
