import { create } from "zustand";

// Store separado (mesmo padrão do authPromptStore) só pra controlar
// a visibilidade do modal de "prévia de perfil" que abre por cima da
// tela atual quando o usuário toca no nome/card de outra pessoa —
// sem navegar pra uma tela nova. Vive fora da árvore de cada tela e
// é montado uma vez no _layout.
type PerfilModalState = {
  usuarioId: string | null;
  abrir: (usuarioId: string) => void;
  fechar: () => void;
};

export const usePerfilModalStore = create<PerfilModalState>((set) => ({
  usuarioId: null,
  abrir: (usuarioId) => set({ usuarioId }),
  fechar: () => set({ usuarioId: null }),
}));

// Hook de conveniência: abre o modal de prévia de perfil pro
// usuarioId informado, mas só se não for o próprio usuário logado
// (o próprio usuário sempre vai direto pra aba "Perfil"/edição, não
// pro modal de prévia de terceiros).
import { useAuthStore } from "./authStore";
import { useRouter } from "expo-router";

export function useAbrirPerfil() {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const abrir = usePerfilModalStore((s) => s.abrir);
  const router = useRouter();

  return function abrirPerfil(usuarioId: string) {
    if (usuarioLogado?.id === usuarioId) {
      router.push("/(tabs)/perfil");
      return;
    }
    abrir(usuarioId);
  };
}
