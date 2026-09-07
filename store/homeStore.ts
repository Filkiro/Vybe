// store/homeStore.ts
import { create } from "zustand";

type HomeState = {
  carregouUmaVez: boolean;
  precisaAtualizar: boolean;
  marcarCarregado: () => void;
  invalidarHome: () => void; // chame isso ao publicar música/álbum novo
};

export const useHomeStore = create<HomeState>((set) => ({
  carregouUmaVez: false,
  precisaAtualizar: true, // true no início pra forçar o primeiro load
  marcarCarregado: () => set({ carregouUmaVez: true, precisaAtualizar: false }),
  invalidarHome: () => set({ precisaAtualizar: true }),
}));