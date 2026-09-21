import { create } from "zustand";

// Store separado só pra controlar a visibilidade do popup de
// confirmação (excluir música, excluir álbum, etc) que aparece por
// cima de qualquer tela — mesmo padrão do authPromptStore, que já
// resolve isso pro card de cadastro/login.
//
// `pedir()` devolve uma Promise<boolean>, então quem chama continua
// escrevendo `const ok = await confirmar(...)` como já fazia antes,
// só que agora o popup é o Modal do próprio app (funciona igual em
// nativo e na web) em vez do Alert.alert/window.confirm.
type ConfirmState = {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  resolver: ((valor: boolean) => void) | null;
  pedir: (titulo: string, mensagem: string, textoConfirmar?: string) => Promise<boolean>;
  confirmar: () => void;
  cancelar: () => void;
};

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  visivel: false,
  titulo: "",
  mensagem: "",
  textoConfirmar: "Confirmar",
  resolver: null,

  pedir: (titulo, mensagem, textoConfirmar = "Confirmar") => {
    // Se já existia uma confirmação pendente (não deveria acontecer
    // na prática, mas por segurança), resolve ela como "não" antes
    // de abrir a nova, pra nunca deixar uma Promise pendurada.
    get().resolver?.(false);

    return new Promise<boolean>((resolve) => {
      set({ visivel: true, titulo, mensagem, textoConfirmar, resolver: resolve });
    });
  },

  confirmar: () => {
    get().resolver?.(true);
    set({ visivel: false, resolver: null });
  },

  cancelar: () => {
    get().resolver?.(false);
    set({ visivel: false, resolver: null });
  },
}));
