  import { useCallback, useEffect, useRef, useState } from "react";
  import {
    View,
    Text,
    FlatList,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Image,
    Modal,
    ActivityIndicator,
    ScrollView
  } from "react-native";
  import { useLocalSearchParams, useRouter } from "expo-router";
  import { ChevronLeft, Send, MoreVertical, Flag, Ticket } from "lucide-react-native";
  import { supabase, Mensagem } from "../../lib/supabase";
  import { useAuthStore } from "../../store/authStore";
  import { colors } from "../../constants/theme";

  export default function Chat() {
    const { conversaId, contatoNome, contatoFotoUrl, contatoId } = useLocalSearchParams<{ conversaId: string; contatoNome?: string; contatoFotoUrl?: string; contatoId?: string }>();
    const router = useRouter();
    const usuario = useAuthStore((s) => s.usuario);

    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const listaRef = useRef<FlatList>(null);

    const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
    const [denunciaAberta, setDenunciaAberta] = useState(false);
    const [motivoEscolhido, setMotivoEscolhido] = useState<string | null>(null);
    const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
    const [erroDenuncia, setErroDenuncia] = useState<string | null>(null);
    const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

    const [modalConviteAberto, setModalConviteAberto] = useState(false);
    const [meusEventos, setMeusEventos] = useState<any[]>([]);
    const [carregandoEventos, setCarregandoEventos] = useState(false);
    const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);

    async function abrirModalConvite() {
      if (!usuario || usuario.tipo_conta !== "organizador") return;
      setModalConviteAberto(true);
      setCarregandoEventos(true);
      const { data } = await supabase
        .from("evento")
        .select("id, nome, data")
        .eq("organizador_id", usuario.id)
        .order("data", { ascending: true });
      setMeusEventos(data ?? []);
      setCarregandoEventos(false);
    }

    async function enviarConviteNoChat(eventoId: string) {
      if (!usuario || !contatoId) return;
      setCarregandoEventos(true);
      
      const { data: conviteExistente } = await supabase
        .from("evento_convite")
        .select("id")
        .eq("evento_id", eventoId)
        .eq("musico_id", contatoId)
        .maybeSingle();
      
      let conviteId = conviteExistente?.id;
      
      if (!conviteId) {
        const { data: novoConvite } = await supabase
          .from("evento_convite")
          .insert({
            evento_id: eventoId,
            musico_id: contatoId,
            status: "pendente"
          })
          .select()
          .single();
        if (novoConvite) conviteId = novoConvite.id;
      }
      
      if (conviteId) {
        await supabase.from("mensagem").insert({
          conversa_id: conversaId,
          remetente_id: usuario.id,
          conteudo: "Você foi convidado para um evento!",
          evento_convite_id: conviteId
        });
      }
      
      setCarregandoEventos(false);
      setModalConviteAberto(false);
    }

    async function enviarDenuncia() {
      if (!motivoEscolhido || !usuario) {
        setErroDenuncia("Escolha um motivo.");
        return;
      }
      if (motivoEscolhido === "Outro motivo" && !descricaoDenuncia.trim()) {
        setErroDenuncia("Descreva o motivo da denúncia.");
        return;
      }
  
      setErroDenuncia(null);
      setEnviandoDenuncia(true);
  
      const { error } = await supabase
        .from("denuncia")
        .insert({
          denunciante_id: usuario.id,
          tipo_alvo: "conversa",
          alvo_id: conversaId,
          motivo: motivoEscolhido,
          descricao: motivoEscolhido === "Outro motivo" ? descricaoDenuncia.trim() : null
        });
  
      setEnviandoDenuncia(false);
      
      if (!error) {
        setDenunciaAberta(false);
        setMotivoEscolhido(null);
        setDescricaoDenuncia("");
        alert("Denúncia enviada com sucesso. A moderação vai analisar.");
      } else {
        setErroDenuncia(error.message);
      }
    }

    const carregar = useCallback(async () => {
      const { data } = await supabase
        .from("mensagem")
        .select("*, evento_convite:evento_convite_id(id, status, evento:evento_id(id, nome, data, horario, localizacao, genero_musical, capacidade))")
        .eq("conversa_id", conversaId)
        .order("data_hora", { ascending: true });
      setMensagens(data ?? []);
    }, [conversaId]);

    const marcarComoLidas = useCallback(async () => {
      if (!usuario) return;
      await supabase
        .from("mensagem")
        .update({ lida: true })
        .eq("conversa_id", conversaId)
        .eq("lida", false)
        .neq("remetente_id", usuario.id);
    }, [conversaId, usuario?.id]);

    async function responderConvite(conviteId: string, resposta: "aceito" | "recusado") {
      await supabase.from("evento_convite").update({ status: resposta }).eq("id", conviteId);
      // Atualiza o estado local
      setMensagens((atual) =>
        atual.map((m) => {
          if (m.evento_convite_id === conviteId && m.evento_convite) {
            return { ...m, evento_convite: { ...m.evento_convite, status: resposta } };
          }
          return m;
        })
      );
    }

    const [conviteParaCancelar, setConviteParaCancelar] = useState<string | null>(null);
    const [motivoCancelamento, setMotivoCancelamento] = useState("");
    const [enviandoCancelamento, setEnviandoCancelamento] = useState(false);

    async function cancelarParticipacao() {
      if (!conviteParaCancelar || !motivoCancelamento.trim() || !usuario) return;
      setEnviandoCancelamento(true);
      try {
        await supabase.from("evento_convite").update({ status: "cancelado" }).eq("id", conviteParaCancelar);
        await supabase.from("mensagem").insert({
          conversa_id: conversaId,
          remetente_id: usuario.id,
          conteudo: `⚠️ **Participação Cancelada**\n\nMotivo: ${motivoCancelamento.trim()}`,
        });
        
        setMensagens((atual) =>
          atual.map((m) => {
            if (m.evento_convite_id === conviteParaCancelar && m.evento_convite) {
              return { ...m, evento_convite: { ...m.evento_convite, status: "cancelado" } };
            }
            return m;
          })
        );
        setConviteParaCancelar(null);
        setMotivoCancelamento("");
      } finally {
        setEnviandoCancelamento(false);
      }
    }

    async function cancelarConvite(conviteId: string, mensagemId: string) {
      await supabase.from("evento_convite").delete().eq("id", conviteId);
      await supabase.from("mensagem").update({ 
        conteudo: "Convite cancelado pelo organizador.",
        evento_convite_id: null 
      }).eq("id", mensagemId);
      
      setMensagens((atual) =>
        atual.map((m) => {
          if (m.id === mensagemId) {
            return { ...m, conteudo: "Convite cancelado pelo organizador.", evento_convite_id: null, evento_convite: null };
          }
          return m;
        })
      );
    }

    function voltar() {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/conversa");
    }

    function irParaPerfil() {
      if (contatoId) {
        router.push(`/usuario/${contatoId}`);
      }
    }

    useEffect(() => {
      carregar().then(marcarComoLidas);

      const canal = supabase
        .channel(`conversa-${conversaId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "mensagem", filter: `conversa_id=eq.${conversaId}` },
          (payload) => {
            const nova = payload.new as Mensagem;
            setMensagens((atual) => {
              if (atual.some((m) => m.id === nova.id)) return atual;
              return [...atual, nova];
            });
            if (nova.remetente_id !== usuario?.id) {
              marcarComoLidas();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }, [conversaId, carregar, marcarComoLidas]);

    async function enviar() {
      if (!texto.trim() || !usuario) return;
      setEnviando(true);
      const conteudo = texto.trim();
      setTexto("");

      const { data, error } = await supabase
        .from("mensagem")
        .insert({
          conversa_id: conversaId,
          remetente_id: usuario.id,
          conteudo,
        })
        .select()
        .single();
      setEnviando(false);

      if (error || !data) {
        setTexto(conteudo);
        return;
      }

      setMensagens((atual) => {
        if (atual.some((m) => m.id === data.id)) return atual;
        return [...atual, data as Mensagem];
      });
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#0B101E" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between px-4 pt-14 pb-4 bg-card  border-b border-white/5">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={voltar} className="mr-3 p-1.5 active:opacity-60">
              <ChevronLeft color={colors.textDark} size={28} />
            </Pressable>
            <Pressable onPress={irParaPerfil} className="flex-row items-center flex-1 active:opacity-70 transition-opacity">
              {contatoFotoUrl ? (
                <Image source={{ uri: contatoFotoUrl }} className="w-11 h-11 rounded-full mr-3 border border-white/10" />
              ) : (
                <View className="w-11 h-11 rounded-full bg-surface mr-3 items-center justify-center border border-white/10">
                  <Text className="text-muted font-bold text-xl">{contatoNome?.charAt(0).toUpperCase() ?? "C"}</Text>
                </View>
              )}
              <View>
                <Text className="text-base font-bold text-textDark tracking-wide">{contatoNome ?? "Conversa"}</Text>
              </View>
            </Pressable>
          </View>
          
          <Pressable onPress={() => setMostrarOpcoes(true)} className="p-2 ml-2 rounded-full active:bg-white/5">
            <MoreVertical size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <FlatList
          showsVerticalScrollIndicator={false}
          ref={listaRef}
          data={mensagens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => {
            const ehMinhaMensagem = item.remetente_id === usuario?.id;
            const horaStr = item.data_hora ? new Date(item.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            // Agrupamento de mensagens para não arredondar os cantos internos se for a mesma pessoa
            const prevMessage = mensagens[index - 1];
            const nextMessage = mensagens[index + 1];
            const isFirstInGroup = !prevMessage || prevMessage.remetente_id !== item.remetente_id;
            const isLastInGroup = !nextMessage || nextMessage.remetente_id !== item.remetente_id;
            
            const marginTop = isFirstInGroup && index !== 0 ? 16 : 4;

            if (item.evento_convite_id && item.evento_convite) {
              const convite = item.evento_convite;
              const ehPendente = convite.status === "pendente";
              
              return (
                <View className="my-2 items-center w-full px-4">
                  <Pressable 
                    onPress={() => setEventoSelecionado(convite.evento)}
                    className="bg-[#1A2235] border border-primary/40 rounded-2xl p-4 w-full max-w-[300px] active:opacity-80"
                  >
                    <View className="bg-primary/20 self-start px-2 py-1 rounded-md mb-3">
                      <Text className="text-primary text-[10px] font-bold uppercase">Convite para Evento</Text>
                    </View>
                    <Text className="text-white font-bold text-lg mb-1">{convite.evento?.nome}</Text>
                    <Text className="text-white/60 text-xs mb-4">Data: {convite.evento?.data}</Text>
                    
                    {ehPendente && !ehMinhaMensagem ? (
                      <View className="flex-row gap-2">
                        <Pressable onPress={() => responderConvite(convite.id, "aceito")} className="flex-1 bg-emerald-500 py-2 rounded-xl items-center">
                          <Text className="text-white font-bold text-sm">Aceitar</Text>
                        </Pressable>
                        <Pressable onPress={() => responderConvite(convite.id, "recusado")} className="flex-1 bg-white/10 py-2 rounded-xl items-center border border-white/10">
                          <Text className="text-white font-bold text-sm">Recusar</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View className={`py-2 rounded-xl items-center ${
                        convite.status === 'aceito' ? 'bg-emerald-500/20 border border-emerald-500/30' : 
                        (convite.status === 'recusado' || convite.status === 'cancelado') ? 'bg-red-500/20 border border-red-500/30' : 
                        'bg-white/10'
                      }`}>
                        <Text className={`font-bold text-sm ${
                          convite.status === 'aceito' ? 'text-emerald-500' : 
                          (convite.status === 'recusado' || convite.status === 'cancelado') ? 'text-red-500' : 
                          'text-white/60'
                        }`}>
                          {convite.status === 'aceito' ? '✅ Convite Aceito' : 
                           convite.status === 'recusado' ? '❌ Convite Recusado' : 
                           convite.status === 'cancelado' ? '⚠️ Participação Cancelada' : 
                           'Aguardando resposta...'}
                        </Text>
                      </View>
                    )}

                    {ehPendente && ehMinhaMensagem && (
                      <Pressable onPress={() => cancelarConvite(convite.id, item.id)} className="mt-3 bg-red-500/10 py-2 rounded-xl items-center border border-red-500/20">
                        <Text className="text-red-400 font-bold text-xs">Cancelar Convite</Text>
                      </Pressable>
                    )}

                    {convite.status === 'aceito' && (
                      <Pressable onPress={() => setConviteParaCancelar(convite.id)} className="mt-3 bg-red-500/10 py-2 rounded-xl items-center border border-red-500/20">
                        <Text className="text-red-400 font-bold text-xs">Cancelar Participação</Text>
                      </Pressable>
                    )}

                    {horaStr !== '' && (
                      <Text className="text-[10px] mt-3 text-right font-medium text-muted">
                        {horaStr}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            }
            
            return (
              <View
                className={`max-w-[80%] px-4 py-3 ${
                  ehMinhaMensagem 
                    ? "bg-primary self-end " 
                    : "bg-[#1A2235] self-start  border border-white/5"
                }`}
                style={[
                  { marginTop },
                  ehMinhaMensagem ? {
                    borderTopLeftRadius: 18,
                    borderBottomLeftRadius: 18,
                    borderTopRightRadius: isFirstInGroup ? 18 : 6,
                    borderBottomRightRadius: isLastInGroup ? 18 : 6,
                  } : {
                    borderTopRightRadius: 18,
                    borderBottomRightRadius: 18,
                    borderTopLeftRadius: isFirstInGroup ? 18 : 6,
                    borderBottomLeftRadius: isLastInGroup ? 18 : 6,
                  }
                ]}
              >
                <Text className={`text-[15px] leading-6 ${ehMinhaMensagem ? "text-white" : "text-white/90"}`}>{item.conteudo}</Text>
                {horaStr !== '' && (
                  <Text className={`text-[10px] mt-1.5 text-right font-medium ${ehMinhaMensagem ? "text-white/60" : "text-muted"}`}>
                    {horaStr}
                  </Text>
                )}
              </View>
            );
          }}
        />

        <View className="bg-[#0B101E] border-t border-white/5 px-4 pt-3 pb-8">
          <View className="flex-row items-end">
            {usuario?.tipo_conta === "organizador" && (
              <Pressable
                onPress={abrirModalConvite}
                className="w-12 h-12 rounded-full items-center justify-center bg-[#1A2235] border border-white/5 mr-2"
              >
                <Ticket color="#94A3B8" size={20} />
              </Pressable>
            )}
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#64748B"
              className="flex-1 bg-[#1A2235] border border-white/5 rounded-3xl px-5 py-3.5 mr-3 text-white text-[15px]"
              multiline
              maxLength={255}
              style={{ maxHeight: 120 }}
            />
            <Pressable
              onPress={enviar}
              disabled={enviando || !texto.trim()}
              className={`w-12 h-12 rounded-full items-center justify-center transition-all ${
                !texto.trim() ? "bg-[#1A2235] border border-white/5" : "bg-primary "
              }`}
            >
              <Send color={!texto.trim() ? "#64748B" : "white"} size={20} style={{ marginLeft: !texto.trim() ? 0 : 2 }} />
            </Pressable>
          </View>
          <Text className="text-[10px] text-[#64748B] text-right mt-1.5 mr-[60px]">
            {texto.length}/255
          </Text>
        </View>

        {/* Modal de Envio de Convite */}
        <Modal transparent visible={modalConviteAberto} animationType="slide" onRequestClose={() => setModalConviteAberto(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#1A2235] rounded-t-3xl p-6 border-t border-white/10 max-h-[80%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-lg">Convidar para Evento</Text>
                <Pressable onPress={() => setModalConviteAberto(false)} className="p-2">
                  <Text className="text-gray-400 font-bold">X</Text>
                </Pressable>
              </View>
              
              {carregandoEventos ? (
                <ActivityIndicator color={colors.primary} className="my-8" />
              ) : meusEventos.length === 0 ? (
                <Text className="text-gray-400 text-center my-8">Você não possui nenhum evento criado.</Text>
              ) : (
                <FlatList
                  data={meusEventos}
                  keyExtractor={(e) => e.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: evento }) => (
                    <Pressable
                      onPress={() => enviarConviteNoChat(evento.id)}
                      className="bg-[#0B101E] border border-white/5 p-4 rounded-xl mb-3 flex-row justify-between items-center"
                    >
                      <View className="flex-1">
                        <Text className="text-white font-bold">{evento.nome}</Text>
                        <Text className="text-gray-400 text-xs mt-1">{evento.data}</Text>
                      </View>
                      <View className="bg-primary/20 px-3 py-1.5 rounded-full">
                        <Text className="text-primary font-bold text-xs">Enviar</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Modal de Opções */}
        <Modal transparent visible={mostrarOpcoes} animationType="fade" onRequestClose={() => setMostrarOpcoes(false)}>
          <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setMostrarOpcoes(false)}>
            <Pressable className="w-64 bg-[#1A2235] border border-white/10 rounded-2xl overflow-hidden " onPress={(e) => e.stopPropagation()}>
              <Pressable 
                onPress={() => {
                  setMostrarOpcoes(false);
                  setDenunciaAberta(true);
                }} 
                className="flex-row items-center px-5 py-4 active:bg-white/5"
              >
                <Flag size={18} color={colors.danger} />
                <Text className="text-red-500 font-bold text-base ml-3">Denunciar usuário</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de Formulário de Denúncia */}
        <Modal transparent visible={denunciaAberta} animationType="slide" onRequestClose={() => setDenunciaAberta(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#1A2235] rounded-t-3xl p-6 border-t border-white/10">
              <Text className="text-white font-bold text-lg mb-4">Por que está denunciando?</Text>
              {["Conteúdo ofensivo", "Spam ou golpe", "Assédio", "Outro motivo"].map((motivo) => (
                <Pressable
                  key={motivo}
                  onPress={() => setMotivoEscolhido(motivo)}
                  className="py-3 border-b border-white/5 flex-row items-center"
                >
                  <View className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${motivoEscolhido === motivo ? "border-primary" : "border-gray-500"}`}>
                    {motivoEscolhido === motivo && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </View>
                  <Text className={motivoEscolhido === motivo ? "text-primary font-bold" : "text-gray-300"}>
                    {motivo}
                  </Text>
                </Pressable>
              ))}

              {motivoEscolhido === "Outro motivo" && (
                <TextInput
                  placeholder="Descreva o motivo da denúncia..."
                  placeholderTextColor="#64748B"
                  value={descricaoDenuncia}
                  onChangeText={setDescricaoDenuncia}
                  multiline
                  className="bg-[#0B101E] text-white border border-white/10 rounded-xl px-4 py-3 mt-4 min-h-[100px]"
                  style={{ textAlignVertical: "top" }}
                />
              )}

              {erroDenuncia && (
                <Text className="text-red-500 text-sm mt-3">{erroDenuncia}</Text>
              )}

              <View className="flex-row gap-3 mt-6 mb-2">
                <Pressable onPress={() => { setDenunciaAberta(false); setErroDenuncia(null); }} className="flex-1 py-3.5 items-center rounded-xl border border-white/10">
                  <Text className="text-gray-300 font-medium">Cancelar</Text>
                </Pressable>
                <Pressable onPress={enviarDenuncia} disabled={enviandoDenuncia} className="flex-1 py-3.5 items-center rounded-xl bg-red-600">
                  {enviandoDenuncia ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold">Enviar Denúncia</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Detalhes do Evento */}
        <Modal transparent visible={!!eventoSelecionado} animationType="slide" onRequestClose={() => setEventoSelecionado(null)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#1A2235] rounded-t-3xl p-6 border-t border-white/10 max-h-[85%]">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-bold text-xl">Detalhes do Evento</Text>
                <Pressable onPress={() => setEventoSelecionado(null)} className="p-2">
                  <Text className="text-gray-400 font-bold">X</Text>
                </Pressable>
              </View>

              {eventoSelecionado && (
                <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                  <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Nome</Text>
                    <Text className="text-white text-base">{eventoSelecionado.nome}</Text>
                  </View>
                  <View className="mb-4 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Data</Text>
                      <Text className="text-white text-base">{eventoSelecionado.data}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Horário</Text>
                      <Text className="text-white text-base">{eventoSelecionado.horario || "Não definido"}</Text>
                    </View>
                  </View>
                  <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Localização</Text>
                    <Text className="text-white text-base">{eventoSelecionado.localizacao || "Não definida"}</Text>
                  </View>
                  <View className="mb-4 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Gênero Musical</Text>
                      <Text className="text-white text-base">{eventoSelecionado.genero_musical || "Todos"}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs uppercase font-bold mb-1">Capacidade</Text>
                      <Text className="text-white text-base">{eventoSelecionado.capacidade ? `${eventoSelecionado.capacidade} pessoas` : "Não definida"}</Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal de Motivo de Cancelamento */}
        <Modal transparent visible={!!conviteParaCancelar} animationType="fade" onRequestClose={() => setConviteParaCancelar(null)}>
          <View className="flex-1 justify-center bg-black/50 px-4">
            <View className="bg-[#1A2235] rounded-2xl p-6 border border-white/10">
              <Text className="text-white font-bold text-xl mb-2">Cancelar Participação</Text>
              <Text className="text-gray-400 text-sm mb-4">
                Informe o motivo do cancelamento. Esta mensagem será enviada no chat.
              </Text>

              <TextInput
                value={motivoCancelamento}
                onChangeText={setMotivoCancelamento}
                placeholder="Qual o motivo?"
                placeholderTextColor="#64748B"
                multiline
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-h-[100px] mb-4"
                style={{ textAlignVertical: "top" }}
              />

              <View className="flex-row gap-3">
                <Pressable 
                  onPress={() => setConviteParaCancelar(null)}
                  className="flex-1 bg-white/10 rounded-xl py-3 items-center border border-white/10"
                >
                  <Text className="text-white font-bold">Voltar</Text>
                </Pressable>
                
                <Pressable 
                  onPress={cancelarParticipacao}
                  disabled={enviandoCancelamento || !motivoCancelamento.trim()}
                  className={`flex-1 rounded-xl py-3 items-center ${!motivoCancelamento.trim() ? 'bg-red-500/30' : 'bg-red-500'}`}
                >
                  {enviandoCancelamento ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">Cancelar Participação</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    );
  }
