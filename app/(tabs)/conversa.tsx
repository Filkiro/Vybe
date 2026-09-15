import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Image, Modal, TextInput, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MessageCircle, MoreVertical, Flag } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

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
    <View className="flex-1 bg-[#0B101E]">
      {/* Abas de Filtro */}
      <View className="flex-row px-4 pt-4 pb-2 gap-2">
        <Pressable
          onPress={() => setFiltro("todos")}
          className={`px-4 py-2 rounded-full border ${filtro === "todos" ? "bg-primary border-primary" : "bg-white/5 border-white/10"}`}
        >
          <Text className={`font-semibold text-sm ${filtro === "todos" ? "text-white" : "text-gray-400"}`}>Tudo</Text>
        </Pressable>
        <Pressable
          onPress={() => setFiltro("musico")}
          className={`px-4 py-2 rounded-full border ${filtro === "musico" ? "bg-primary border-primary" : "bg-white/5 border-white/10"}`}
        >
          <Text className={`font-semibold text-sm ${filtro === "musico" ? "text-white" : "text-gray-400"}`}>Músicos</Text>
        </Pressable>
        <Pressable
          onPress={() => setFiltro("organizador")}
          className={`px-4 py-2 rounded-full border ${filtro === "organizador" ? "bg-primary border-primary" : "bg-white/5 border-white/10"}`}
        >
          <Text className={`font-semibold text-sm ${filtro === "organizador" ? "text-white" : "text-gray-400"}`}>Organizadores</Text>
        </Pressable>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-center">Carregando mensagens...</Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={conversasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom }}
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <MessageCircle color={colors.muted} size={48} strokeWidth={1.5} />
              <Text className="text-muted text-center mt-4 text-base">
                Nenhuma conversa ainda.{"\n"}Vá ao perfil de alguém e toque em "Contatar" para começar.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center border-b border-border/30 pr-2">
              <Pressable
                onPress={() =>
                  router.push(
                    `/chat/${item.id}?contatoNome=${encodeURIComponent(item.contatoNome)}&contatoFotoUrl=${
                      item.contatoFotoUrl ? encodeURIComponent(item.contatoFotoUrl) : ""
                    }&contatoId=${item.contatoId}`
                  )
                }
                className={`flex-1 flex-row items-center py-4 active:opacity-60 transition-opacity`}
              >
                {item.contatoFotoUrl ? (
                  <Image
                    source={{ uri: item.contatoFotoUrl }}
                    className="w-14 h-14 rounded-full mr-4 border border-white/5"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-full bg-surface mr-4 items-center justify-center border border-white/5">
                    <Text className="text-muted font-bold text-xl">{item.contatoNome.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                
                <View className="flex-1 mr-3 justify-center">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-semibold text-textDark text-base" numberOfLines={1}>
                      {item.contatoNome}
                    </Text>
                    {item.ultimaMensagemData && (
                      <Text className="text-[11px] text-muted font-medium">
                        {new Date(item.ultimaMensagemData).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                  
                  <Text
                    numberOfLines={1}
                    className={`text-[13px] ${item.naoLida ? "text-primaryLight font-medium" : "text-muted"}`}
                  >
                    {item.ultimaMensagem
                      ? `${item.ultimaMensagemEhMinha ? "Você: " : ""}${item.ultimaMensagem}`
                      : "Nenhuma mensagem ainda"}
                  </Text>
                </View>

                {item.naoLidasContagem > 0 && (
                  <View className="bg-primary rounded-full min-w-[24px] h-[24px] px-1.5 items-center justify-center shadow-sm mr-2">
                    <Text className="text-white text-[11px] font-bold">
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
                className="p-2 ml-1 rounded-full active:bg-white/5"
              >
                <MoreVertical size={20} color="#94A3B8" />
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Modal de Opções */}
      <Modal transparent visible={mostrarOpcoes} animationType="fade" onRequestClose={() => setMostrarOpcoes(false)}>
        <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setMostrarOpcoes(false)}>
          <Pressable className="w-64 bg-[#1A2235] border border-white/10 rounded-2xl overflow-hidden shadow-2xl" onPress={(e) => e.stopPropagation()}>
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