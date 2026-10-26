// store/homeStore.ts
import { create } from "zustand";

type HomeState = {
  carregouUmaVez: boolean;
  precisaAtualizar: boolean;
  tokenRecarregar: number;
  marcarCarregado: () => void;
  invalidarHome: () => void; // chame isso ao publicar música/álbum novo
  recarregarHome: () => void; // força recarregamento imediato com indicador circular
};

export const useHomeStore = create<HomeState>((set) => ({
  carregouUmaVez: false,
  precisaAtualizar: true, // true no início pra forçar o primeiro load
  tokenRecarregar: 0,
  marcarCarregado: () => set({ carregouUmaVez: true, precisaAtualizar: false }),
  invalidarHome: () => set({ precisaAtualizar: true }),
  recarregarHome: () =>
    set((s) => ({
      tokenRecarregar: s.tokenRecarregar + 1,
      precisaAtualizar: true,
    })),
}));
