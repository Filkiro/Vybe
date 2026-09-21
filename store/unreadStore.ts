import { create } from "zustand";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type UnreadState = {
  naoLidas: number;
  canal: RealtimeChannel | null;
  recontar: (usuarioId: string) => Promise<void>;
  iniciar: (usuarioId: string) => void;
  parar: () => void;
};

// Store global do contador de mensagens não lidas — alimenta o
// balãozinho na aba Conversas. Vive FORA da árvore de componentes
// (mesmo padrão do playerStore), então o número não some ao trocar
// de tela; é ligado/desligado conforme o login pelo
// UnreadMessagesListener, montado uma vez no _layout.tsx.
export const useUnreadStore = create<UnreadState>((set, get) => ({
  naoLidas: 0,
  canal: null,

  // Reconta do zero em vez de incrementar/decrementar manualmente —
  // mais simples e sem risco do número desalinhar do banco depois de
  // um tempo. A contagem em si é barata: um count(*) com head:true,
  // sem trazer nenhuma linha. Graças à policy "mensagem_select_
  // participante" (RLS), essa contagem já vem automaticamente
  // restrita às mensagens das conversas de que o usuário participa —
  // não precisa de join manual com a tabela conversa.
  recontar: async (usuarioId) => {
    const { count } = await supabase
      .from("mensagem")
      .select("id", { count: "exact", head: true })
      .eq("lida", false)
      .neq("remetente_id", usuarioId);
    set({ naoLidas: count ?? 0 });
  },

  // Assina o Realtime da tabela "mensagem" pra reagir a qualquer
  // mensagem nova ou marcada como lida — SEM filtro nenhum na
  // assinatura, porque o mesmo RLS que restringe o SELECT também
  // restringe quais eventos chegam aqui: só os das conversas do
  // usuário. Essa função async fica "sempre esperando": o canal
  // nunca é desligado enquanto a conta estiver logada (só quando
  // troca de usuário ou desloga, via UnreadMessagesListener), então
  // o número atualiza sozinho assim que uma mensagem chega ou é
  // lida, em qualquer tela do app.
// store/unreadStore.ts

iniciar: (usuarioId) => {
  if (get().canal) return; // Já está escutando, evita duplicar conexões

  get().recontar(usuarioId);

  const canal = supabase
    .channel("mensagens-nao-lidas")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mensagem" },
      () => get().recontar(usuarioId)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "mensagem" },
      () => get().recontar(usuarioId)
    )
    .subscribe();

  set({ canal });
},

  parar: () => {
    const canal = get().canal;
    if (canal) supabase.removeChannel(canal);
    set({ canal: null, naoLidas: 0 });
  },
}));
