import { create } from "zustand";

export type MusicaEscolhida = {
  id: string;
  nome: string;
  autor_apelido: string | null;
  arquivo_url: string;
  capa_url: string | null;
};

// Cache global do "Escolha a dedo". Fica fora da árvore da Home pra
// sobreviver a remontagens: abrir/voltar pra Home NÃO re-sorteia.
// Só troca quando o usuário puxa pra atualizar (token muda).
type EscolhaADedoState = {
  musicas: MusicaEscolhida[];
  tokenCarregado: number | null;
  definir: (musicas: MusicaEscolhida[], token: number) => void;
};

export const useEscolhaADedoStore = create<EscolhaADedoState>((set) => ({
  musicas: [],
  tokenCarregado: null,
  definir: (musicas, token) => set({ musicas, tokenCarregado: token }),
}));
