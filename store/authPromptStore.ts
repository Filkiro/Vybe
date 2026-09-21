import { create } from "zustand";
import { useAuthStore } from "./authStore";

// Store separado (não é o authStore) só pra controlar a
// visibilidade do card "Cadastre-se ou entre" que aparece por cima
// de qualquer tela quando uma ação exige estar logado — igual ao
// MiniPlayer/AppHeader, vive fora da árvore de cada tela.
type AuthPromptState = {
  visivel: boolean;
  abrir: () => void;
  fechar: () => void;
};

export const useAuthPromptStore = create<AuthPromptState>((set) => ({
  visivel: false,
  abrir: () => set({ visivel: true }),
  fechar: () => set({ visivel: false }),
}));

// Hook de conveniência: envolve qualquer ação que só pode acontecer
// logado (tocar uma música, contatar alguém, etc). Se não tiver
// usuário, abre o card de cadastro/login em vez de executar a ação.
// Retorna true/false pra quem chamou saber se a ação rolou.
export function useRequireAuth() {
  const usuario = useAuthStore((s) => s.usuario);
  const abrir = useAuthPromptStore((s) => s.abrir);

  return function requireAuth(acao: () => void): boolean {
    if (!usuario) {
      abrir();
      return false;
    }
    acao();
    return true;
  };
}
