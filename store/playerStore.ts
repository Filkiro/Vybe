import { create } from "zustand";
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from "expo-audio";

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
  volume: number;
  isMuted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  resetar: () => void;
};

let token = 0;

let audioModeSet = false;

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
    } catch {}
  }

  if (meuToken !== token) return;

  // Garante que a sessão de áudio permita execução em segundo plano (Mobile)
  if (!audioModeSet) {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    audioModeSet = true;
  }

  const player = createAudioPlayer({ uri: musica.arquivoUrl });
  player.volume = get().isMuted ? 0 : get().volume;

  player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
    if (!status.isLoaded) return;
    if (meuToken !== token) return;

    const state = get();
    const aindaBuffering = state.estaTocando && !status.playing && status.currentTime === 0;
    
    set({
      posicaoMs: status.currentTime * 1000,
      duracaoMs: (status.duration ?? 0) * 1000,
      estaTocando: aindaBuffering ? true : status.playing,
    });

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

  // Integração com a Media Session API (Para Web e Controles de Tela de Bloqueio)
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: musica.nome,
      artist: musica.autorApelido ?? "Autor desconhecido",
      artwork: musica.capaUrl ? [{ src: musica.capaUrl, sizes: '512x512', type: 'image/jpeg' }] : []
    });

    navigator.mediaSession.setActionHandler('play', () => get().retomar());
    navigator.mediaSession.setActionHandler('pause', () => get().pausar());
    navigator.mediaSession.setActionHandler('previoustrack', () => get().anterior());
    navigator.mediaSession.setActionHandler('nexttrack', () => get().proxima());
  }

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

  volume: 1,
  isMuted: false,

  setVolume: (v) => {
    set({ volume: v, isMuted: v === 0 });
    const atual = get().sound;
    if (atual) atual.volume = v;
  },

  toggleMute: () => {
    const { isMuted, volume, sound } = get();
    const newMuted = !isMuted;
    set({ isMuted: newMuted });
    if (sound) {
      sound.volume = newMuted ? 0 : volume;
    }
  },

  // Para e libera o áudio atual e limpa o estado do player.
  resetar: () => {
    token++;
    const atual = get().sound;
    if (atual) {
      try {
        atual.pause();
        atual.release();
        atual.remove();
      } catch {}
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }

    set({
      sound: null,
      musicaAtual: null,
      fila: [],
      estaTocando: false,
      posicaoMs: 0,
      duracaoMs: 0,
    });
  },
}));