  import { useCallback, useEffect, useRef, useState } from "react";
  import {
    View,
    Text,
    FlatList,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
  } from "react-native";
  import { useLocalSearchParams, useRouter } from "expo-router";
  import { ChevronLeft, Send } from "lucide-react-native";
  import { supabase, Mensagem } from "../../lib/supabase";
  import { useAuthStore } from "../../store/authStore";
  import { colors } from "../../constants/theme";

  export default function Chat() {
    const { conversaId, contatoNome } = useLocalSearchParams<{ conversaId: string; contatoNome?: string }>();
    const router = useRouter();
    const usuario = useAuthStore((s) => s.usuario);

    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const listaRef = useRef<FlatList>(null);

    const carregar = useCallback(async () => {
      const { data } = await supabase
        .from("mensagem")
        .select("*")
        .eq("conversa_id", conversaId)
        .order("data_hora", { ascending: true });
      setMensagens(data ?? []);
    }, [conversaId]);

    // Marca como lidas as mensagens que o outro participante mandou e
    // que ainda não foram vistas — chamada ao abrir a conversa e
    // também toda vez que uma mensagem nova chega enquanto a tela já
    // está aberta (já que a pessoa está vendo ela na hora). É essa
    // atualização que faz o balãozinho da aba Conversas diminuir.
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

    useEffect(() => {
      carregar().then(marcarComoLidas);

      // Realtime: novas mensagens aparecem na hora, sem precisar
      // recarregar a tela (equivalente ao que faríamos com um
      // "stream" de dados no FlutterFlow).
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
            // Chegou mensagem nova enquanto essa conversa já está
            // aberta na tela — marca como lida na hora, sem esperar a
            // pessoa sair e voltar.
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
        // Devolve o texto pro campo se falhar, pra não perder o que
        // a pessoa escreveu.
        setTexto(conteudo);
        return;
      }

      // Mostra a mensagem na hora, sem depender só do evento Realtime
      // voltar pra quem enviou — era isso que fazia a mensagem só
      // aparecer depois de sair e entrar de novo no chat (que recarrega
      // tudo do banco do zero). O listener de Realtime acima ainda cobre
      // as mensagens que chegam da outra pessoa, com checagem de
      // duplicidade pro caso de os dois caminhos coincidirem.
      setMensagens((atual) => {
        if (atual.some((m) => m.id === data.id)) return atual;
        return [...atual, data as Mensagem];
      });
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-4 pt-14 pb-3 bg-card border-b border-border">
          <Pressable onPress={voltar} className="mr-3">
            <ChevronLeft color={colors.textDark} size={26} />
          </Pressable>
          <Text className="text-lg font-bold text-textDark">{contatoNome ?? "Conversa"}</Text>
        </View>

        <FlatList
        showsVerticalScrollIndicator={false}
          ref={listaRef}
          data={mensagens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const ehMinhaMensagem = item.remetente_id === usuario?.id;
            return (
              <View
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  ehMinhaMensagem ? "bg-primary self-end" : "bg-card self-start border border-border"
                }`}
              >
                <Text className={ehMinhaMensagem ? "text-white" : "text-textDark"}>{item.conteudo}</Text>
              </View>
            );
          }}
        />

        <View className="flex-row items-center px-4 py-3 bg-card border-t border-border">
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 border border-border rounded-full px-4 py-3 mr-3 text-textDark"
            multiline
          />
          <Pressable
            onPress={enviar}
            disabled={enviando || !texto.trim()}
            className="w-11 h-11 rounded-full bg-primary items-center justify-center"
          >
            <Send color="white" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }
