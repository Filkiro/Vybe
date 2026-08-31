import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MessageCircle } from "lucide-react-native";
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
};

export default function Conversa() {
  const usuario = useAuthStore((s) => s.usuario);
  const [conversas, setConversas] = useState<ConversaComContato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const paddingBottom = usePlayerAwarePadding(140);

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

  return (
    <View className="flex-1 bg-background">
      <Text className="text-2xl font-bold px-4 pt-6 pb-4 text-textDark">Conversas</Text>

      {carregando ? (
        <Text className="text-muted text-center">Carregando...</Text>
      ) : (
        <FlatList
        showsVerticalScrollIndicator={false}
          data={conversas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom }}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <MessageCircle color={colors.muted} size={40} />
              <Text className="text-muted text-center mt-3">
                Nenhuma conversa ainda. Vá ao perfil de alguém e toque em "Contatar" para começar.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}?contatoNome=${encodeURIComponent(item.contatoNome)}`)}
              className="flex-row items-center bg-card rounded-2xl p-3 mb-3"
            >
              {item.contatoFotoUrl ? (
                <Image source={{ uri: item.contatoFotoUrl }} className="w-12 h-12 rounded-full mr-3" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-surface mr-3 items-center justify-center">
                  <Text className="text-muted font-bold">{item.contatoNome.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View className="flex-1 mr-2">
                <Text className="font-bold text-textDark">{item.contatoNome}</Text>
                <Text
                  numberOfLines={1}
                  className={`text-xs mt-0.5 ${item.naoLida ? "text-textDark font-bold" : "text-muted"}`}
                >
                  {item.ultimaMensagem
                    ? `${item.ultimaMensagemEhMinha ? "Você: " : ""}${item.ultimaMensagem}`
                    : "Nenhuma mensagem ainda"}
                </Text>
              </View>

              {/* Numerozinho com a quantidade de mensagens não lidas
                  dessa conversa — mesmo azul do balãozinho da aba. */}
              {item.naoLidasContagem > 0 && (
                <View className="bg-primary rounded-full min-w-[22px] h-[22px] px-1.5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {item.naoLidasContagem > 9 ? "9+" : item.naoLidasContagem}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}