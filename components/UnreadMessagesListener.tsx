import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useUnreadStore } from "../store/unreadStore";

// Não renderiza nada — só liga o listener de mensagens não lidas
// (store/unreadStore.ts) quando existe uma conta logada, e desliga
// (zerando o número) ao deslogar ou trocar de usuário. Fica montado
// uma vez no _layout.tsx, então funciona em qualquer tela — não
// precisa a aba Conversas estar aberta pro balãozinho atualizar.
export function UnreadMessagesListener() {
  const usuarioId = useAuthStore((s) => s.usuario?.id);
  const iniciar = useUnreadStore((s) => s.iniciar);
  const parar = useUnreadStore((s) => s.parar);

  useEffect(() => {
    if (usuarioId) {
      iniciar(usuarioId);
    } else {
      parar();
    }
    return () => parar();
  }, [usuarioId]);

  return null;
}
