import { create } from "zustand";
import { createAudioPlayer, AudioPlayer, AudioStatus } from "expo-audio";

type Musica = {
  id: string;
  nome: string;
  autorApelido: string | null;
  arquivoUrl: string;
  capaUrl: string | null;
};

type PlayerState = {
  musicaAtual: Musica | null;
  fila: Musica[];
  repetir: boolean;
  estaTocando: boolean;
  posicaoMs: number;
  duracaoMs: number;
  sound: AudioPlayer | null;
  tocarMusica: (musica: Musica, fila?: Musica[]) => Promise<void>;
  pausar: () => Promise<void>;
  retomar: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  proxima: () => Promise<void>;
  anterior: () => Promise<void>;
  alternarRepetir: () => void;
};

let token = 0;

async function carregarESocar(
  musica: Musica,
  get: () => PlayerState,
  set: (partial: Partial<PlayerState>) => void
) {
  const meuToken = ++token;

  const atual = get().sound;
  if (atual) {
    try {
      atual.pause();
      atual.release();
      atual.remove();
    } catch {
      // Player já pode ter sido liberado por outra chamada; ignora.
    }
  }

  // Enquanto liberávamos o player acima, outra chamada pode ter
  // começado (e já ter tomado a frente). Se não somos mais a mais
  // recente, para por aqui — nem chega a carregar o áudio novo.
  if (meuToken !== token) return;

  const player = createAudioPlayer({ uri: musica.arquivoUrl });

  player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
    if (!status.isLoaded) return;
    // Ignora atualizações de um player que já foi substituído — evita
    // que um "didJustFinish" atrasado de uma música antiga dispare
    // proxima()/seek() por cima da música atual.
    if (meuToken !== token) return;

    set({
      // expo-audio reporta currentTime/duration em SEGUNDOS —
      // convertendo pra ms aqui, o resto do app (que usa posicaoMs/
      // duracaoMs) não precisa mudar nada.
      posicaoMs: status.currentTime * 1000,
      duracaoMs: (status.duration ?? 0) * 1000,
      estaTocando: status.playing,
    });

    // Música terminou: repete se "repetir" estiver ligado, senão
    // avança pra próxima da fila (se houver).
    if (status.didJustFinish) {
      if (get().repetir) {
        player.seekTo(0);
        player.play();
        set({ posicaoMs: 0, estaTocando: true });
      } else {
        get().proxima();
      }
    }
  });

  player.play();

  // Outra chamada pode ter começado enquanto o player ainda estava
  // carregando/conectando. Se sim, esse player que acabamos de criar
  // é descartável: libera e não toca.
  if (meuToken !== token) {
    try {
      player.pause();
      player.release();
      player.remove();
    } catch {}
    return;
  }

  set({ sound: player, musicaAtual: musica, estaTocando: true });
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  musicaAtual: null,
  fila: [],
  repetir: false,
  estaTocando: false,
  posicaoMs: 0,
  duracaoMs: 0,
  sound: null,

  tocarMusica: async (musica, fila) => {
    set({ fila: fila && fila.length > 0 ? fila : [musica] });
    await carregarESocar(musica, get, set);
  },

  pausar: async () => {
    get().sound?.pause();
    set({ estaTocando: false });
  },

  retomar: async () => {
    get().sound?.play();
    set({ estaTocando: true });
  },

  seek: async (ms) => {
    get().sound?.seekTo(ms / 1000);
    set({ posicaoMs: ms });
  },

  proxima: async () => {
    const { fila, musicaAtual } = get();
    if (!musicaAtual || fila.length < 2) return;
    const indiceAtual = fila.findIndex((m) => m.id === musicaAtual.id);
    const proximaMusica = fila[(indiceAtual + 1) % fila.length];
    await carregarESocar(proximaMusica, get, set);
  },

  anterior: async () => {
    const { fila, musicaAtual } = get();
    if (!musicaAtual || fila.length < 2) return;
    const indiceAtual = fila.findIndex((m) => m.id === musicaAtual.id);
    const anteriorMusica = fila[(indiceAtual - 1 + fila.length) % fila.length];
    await carregarESocar(anteriorMusica, get, set);
  },

  alternarRepetir: () => set((s) => ({ repetir: !s.repetir })),
}));