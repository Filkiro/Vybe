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
  } from "react-native";
  import { useLocalSearchParams, useRouter } from "expo-router";
  import { ChevronLeft, Send, MoreVertical, Flag } from "lucide-react-native";
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
        .select("*")
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
      </KeyboardAvoidingView>
    );
  }
