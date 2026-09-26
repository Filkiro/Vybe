import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Image, Modal, TextInput, ActivityIndicator, useWindowDimensions, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MessageCircle, MoreVertical, Flag } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { ChatPanel } from "../../components/ChatPanel";

type ConversaComContato = {
  id: string;
  contatoId: string;
  contatoNome: string;
  contatoFotoUrl: string | null;
  ultimaMensagem: string | null;
  ultimaMensagemData: string | null;
  ultimaMensagemEhMinha: boolean;
  naoLida: boolean;
  naoLidasContagem: number;
  contatoTipo: "musico" | "organizador" | "comum";
};

export default function Conversa() {
  const usuario = useAuthStore((s) => s.usuario);
  const [conversas, setConversas] = useState<ConversaComContato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "musico" | "organizador">("todos");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [conversaAtiva, setConversaAtiva] = useState<ConversaComContato | null>(null);
  const paddingBottom = usePlayerAwarePadding(140);

  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaComContato | null>(null);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [motivoEscolhido, setMotivoEscolhido] = useState<string | null>(null);
  const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
  const [erroDenuncia, setErroDenuncia] = useState<string | null>(null);
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  async function enviarDenuncia() {
    if (!motivoEscolhido || !usuario || !conversaSelecionada) {
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
        alvo_id: conversaSelecionada.id,
        motivo: motivoEscolhido,
        descricao: motivoEscolhido === "Outro motivo" ? descricaoDenuncia.trim() : null
      });

    setEnviandoDenuncia(false);
    
    if (!error) {
      setDenunciaAberta(false);
      setMotivoEscolhido(null);
      setDescricaoDenuncia("");
      setConversaSelecionada(null);
      alert("Denúncia enviada com sucesso. A moderação vai analisar.");
    } else {
      setErroDenuncia(error.message);
    }
  }

  // Controla se já foi feita a primeira carga desta tela nesta
  // sessão do app — só ela mostra o "Carregando..."/esvazia a lista.
  // Recargas seguintes (toda vez que a aba ganha foco de novo)
  // buscam os dados atualizados em segundo plano, sem esconder o
  // que já está na tela nem piscar um spinner.
  const jaCarregouUmaVez = useRef(false);

  const carregar = useCallback(async (mostrarCarregando: boolean) => {
    if (!usuario) return;
    if (mostrarCarregando) setCarregando(true);

    const { data: linhas } = await supabase
      .from("conversa")
      .select("id, usuario_id1, usuario_id2")
      .or(`usuario_id1.eq.${usuario.id},usuario_id2.eq.${usuario.id}`);

    if (!linhas || linhas.length === 0) {
      setConversas([]);
      setCarregando(false);
      return;
    }

    const resultado: ConversaComContato[] = [];
    for (const linha of linhas) {
      const contatoId = linha.usuario_id1 === usuario.id ? linha.usuario_id2 : linha.usuario_id1;

      const [{ data: contato }, { data: ultimasMsgs }, { count: naoLidasContagem }] = await Promise.all([
        supabase.from("usuario").select("id, nome").eq("id", contatoId).single(),
        supabase
          .from("mensagem")
          .select("conteudo, remetente_id, lida, data_hora")
          .eq("conversa_id", linha.id)
          .order("data_hora", { ascending: false })
          .limit(1),
        supabase
          .from("mensagem")
          .select("id", { count: "exact", head: true })
          .eq("conversa_id", linha.id)
          .eq("lida", false)
          .neq("remetente_id", usuario.id),
      ]);

      // Foto vem de perfil_musico OU perfil_organizador, dependendo
      // do tipo — busca as duas em paralelo e usa a que existir.
      const [{ data: pMusico }, { data: pOrg }] = await Promise.all([
        supabase.from("perfil_musico").select("foto_url").eq("usuario_id", contatoId).maybeSingle(),
        supabase.from("perfil_organizador").select("usuario_id").eq("usuario_id", contatoId).maybeSingle(),
      ]);

      const ultima = ultimasMsgs?.[0];
      const ultimaMensagemEhMinha = ultima?.remetente_id === usuario.id;

      resultado.push({
        id: linha.id,
        contatoId,
        contatoNome: contato?.nome ?? "Usuário",
        contatoFotoUrl: pMusico?.foto_url ?? null,
        ultimaMensagem: ultima?.conteudo ?? null,
        ultimaMensagemData: ultima?.data_hora ?? null,
        ultimaMensagemEhMinha,
        // "Não lida" pra fins de negrito só se aplica à última
        // mensagem quando ela veio da OUTRA pessoa — uma mensagem
        // que eu mesmo mandei já está, por definição, "vista" por
        // mim, mesmo que o outro lado ainda não tenha lido.
        naoLida: !ultimaMensagemEhMinha && !!ultima && !ultima.lida,
        naoLidasContagem: naoLidasContagem ?? 0,
        contatoTipo: pMusico ? "musico" : pOrg ? "organizador" : "comum",
      });
    }

    // Ordena pela conversa com a mensagem mais recente primeiro
    // (seja ela enviada por mim ou recebida). Conversas sem nenhuma
    // mensagem ainda ficam por último.
    resultado.sort((a, b) => {
      if (!a.ultimaMensagemData) return 1;
      if (!b.ultimaMensagemData) return -1;
      return new Date(b.ultimaMensagemData).getTime() - new Date(a.ultimaMensagemData).getTime();
    });

    setConversas(resultado);
    setCarregando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      // Só mostra o spinner/esvazia a lista na primeiríssima vez.
      // Nas próximas entradas na aba, atualiza por baixo dos panos.
      carregar(!jaCarregouUmaVez.current);
      jaCarregouUmaVez.current = true;

      // Enquanto essa tela estiver aberta, qualquer mensagem nova ou
      // marcada como lida (em qualquer conversa) recarrega a lista —
      // assim o número de não lidas e o negrito da prévia atualizam
      // sozinhos, sem precisar sair e voltar pra tela. Sempre em
      // segundo plano, sem spinner.
      const canal = supabase
        .channel("lista-conversas")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagem" }, () => carregar(false))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mensagem" }, () => carregar(false))
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }, [carregar])
  );

  if (!usuario) return null;

  const conversasFiltradas = conversas.filter((c) => {
    if (filtro === "todos") return true;
    return c.contatoTipo === filtro;
  });

  return (
    <View className="flex-1 bg-[#0B101E] pt-4 lg:pt-0">
      <View className="flex-1 flex-col lg:flex-row w-full max-w-[1440px] mx-auto lg:p-4 lg:gap-4">
        
        {/* LEFT PANE (LIST) */}
        <View className={`flex-1 lg:max-w-[420px] flex-col lg:bg-[#141a24]/80 lg:border border-white/5 lg:rounded-2xl overflow-hidden ${conversaAtiva ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header Desktop Only */}
          <View className="hidden lg:flex px-5 pt-5 pb-2">
            <View className="flex-row items-center gap-3">
              <Text className="text-white text-xl font-bold tracking-tight">Conversas</Text>
            </View>
          </View>

          {/* Abas de Filtro */}
          <View className="flex-row px-4 pt-2 pb-3 gap-2 border-b border-white/5">
            <Pressable
              onPress={() => setFiltro("todos")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${filtro === "todos" ? "bg-[#3B82F6] shadow-[0_0_14px_rgba(37,99,235,0.4)]" : "bg-white/5 hover:bg-white/10"}`}
            >
              <Text className={`font-semibold text-xs ${filtro === "todos" ? "text-white" : "text-[#94A3B8]"}`}>Tudo</Text>
            </Pressable>
            <Pressable
              onPress={() => setFiltro("musico")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${filtro === "musico" ? "bg-[#3B82F6] shadow-[0_0_14px_rgba(37,99,235,0.4)]" : "bg-white/5 hover:bg-white/10"}`}
            >
              <Text className={`font-semibold text-xs ${filtro === "musico" ? "text-white" : "text-[#94A3B8]"}`}>Músicos</Text>
            </Pressable>
            <Pressable
              onPress={() => setFiltro("organizador")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${filtro === "organizador" ? "bg-[#3B82F6] shadow-[0_0_14px_rgba(37,99,235,0.4)]" : "bg-white/5 hover:bg-white/10"}`}
            >
              <Text className={`font-semibold text-xs ${filtro === "organizador" ? "text-white" : "text-[#94A3B8]"}`}>Organizadores</Text>
            </Pressable>
          </View>

          {carregando ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              showsVerticalScrollIndicator={false}
              data={conversasFiltradas}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom }}
              ListEmptyComponent={
                <View className="items-center mt-20 px-8">
                  <MessageCircle color="#475569" size={48} strokeWidth={1.5} />
                  <Text className="text-[#64748B] text-center mt-4 text-sm">
                    Nenhuma conversa ainda.{"\n"}Vá ao perfil de alguém e toque em "Contatar" para começar.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = conversaAtiva?.id === item.id;
                return (
                  <View className="flex-row items-center mb-1">
                    <Pressable
                      onPress={() => {
                        if (isDesktop) {
                          setConversaAtiva(item);
                        } else {
                          router.push(
                            `/chat/${item.id}?contatoNome=${encodeURIComponent(item.contatoNome)}&contatoFotoUrl=${
                              item.contatoFotoUrl ? encodeURIComponent(item.contatoFotoUrl) : ""
                            }&contatoId=${item.contatoId}`
                          );
                        }
                      }}
                      className={`flex-1 flex-row items-center p-2.5 rounded-lg transition-all relative ${isActive ? 'bg-[#3B82F6]/15' : 'hover:bg-white/5 active:opacity-70'}`}
                    >
                      {isActive && (
                        <View className="absolute left-0 top-2 bottom-2 w-1 bg-[#3B82F6] rounded-r shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                      )}
                      
                      {item.contatoFotoUrl ? (
                        <Image
                          source={{ uri: item.contatoFotoUrl }}
                          className="w-11 h-11 rounded-full mr-3 border border-white/5 bg-[#1A2235]"
                        />
                      ) : (
                        <View className="w-11 h-11 rounded-full bg-[#1A2235] mr-3 items-center justify-center border border-white/5">
                          <Text className="text-[#94A3B8] font-bold text-lg">{item.contatoNome.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      
                      <View className="flex-1 mr-2 justify-center">
                        <View className="flex-row justify-between items-center mb-0.5">
                          <View className="flex-row items-center flex-1 mr-2 gap-1.5">
                            <Text className="font-semibold text-white text-[14px]" numberOfLines={1}>
                              {item.contatoNome}
                            </Text>
                            <View className="px-1.5 py-0.5 rounded bg-white/10">
                              <Text className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider">
                                {item.contatoTipo}
                              </Text>
                            </View>
                          </View>
                          {item.ultimaMensagemData && (
                            <Text className="text-[10px] text-[#64748B] font-medium">
                              {new Date(item.ultimaMensagemData).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </Text>
                          )}
                        </View>
                        
                        <Text
                          numberOfLines={1}
                          className={`text-[12px] ${item.naoLida ? "text-white font-medium" : "text-[#94A3B8]"}`}
                        >
                          {item.ultimaMensagem
                            ? <><Text className="text-[#64748B]">{item.ultimaMensagemEhMinha ? "Você: " : ""}</Text>{item.ultimaMensagem}</>
                            : "Nenhuma mensagem ainda"}
                        </Text>
                      </View>

                      {item.naoLidasContagem > 0 && (
                        <View className="bg-[#3B82F6] rounded-full min-w-[20px] h-[20px] px-1.5 items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.6)] mr-1">
                          <Text className="text-white text-[10px] font-bold">
                            {item.naoLidasContagem > 9 ? "9+" : item.naoLidasContagem}
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setConversaSelecionada(item);
                        setMostrarOpcoes(true);
                      }}
                      className="p-2 ml-1 rounded-full hover:bg-white/5 active:opacity-60"
                    >
                      <MoreVertical size={16} color="#64748B" />
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* RIGHT PANE (CHAT) */}
        <View className={`flex-[2] flex-col lg:bg-[#0B101E] lg:border border-white/5 lg:rounded-2xl overflow-hidden shadow-2xl ${conversaAtiva ? 'flex' : 'hidden lg:flex'}`}>
          {conversaAtiva ? (
            <ChatPanel
              conversaId={conversaAtiva.id}
              contatoNome={conversaAtiva.contatoNome}
              contatoFotoUrl={conversaAtiva.contatoFotoUrl ?? undefined}
              contatoId={conversaAtiva.contatoId}
              onVoltar={() => setConversaAtiva(null)}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-[#141a24]/40">
              <MessageCircle size={48} color="#1e293b" />
              <Text className="text-[#475569] mt-4 font-semibold text-sm">Selecione uma conversa para começar</Text>
            </View>
          )}
        </View>

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
              <Text className="text-red-500 font-bold text-base ml-3">Denunciar conversa</Text>
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
    </View>
  );
}
