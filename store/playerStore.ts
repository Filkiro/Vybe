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
  // "fila" é a lista de onde a música foi tocada (ex: a grade da
  // Home) — permite Próxima/Anterior de verdade em vez de botões
  // decorativos. Se omitida, a fila vira só a própria música.
  tocarMusica: (musica: Musica, fila?: Musica[]) => Promise<void>;
  pausar: () => Promise<void>;
  retomar: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  proxima: () => Promise<void>;
  anterior: () => Promise<void>;
  alternarRepetir: () => void;
};

// Contador global de "geração" — cada chamada de carregarESocar tira
// um número. Existia um bug em que duas músicas tocavam juntas:
// tocarMusica/proxima/anterior são assíncronos (createAudioPlayer
// depende de rede), então se duas chamadas se sobrepunham (ex: tocar
// uma música enquanto a anterior ainda estava carregando, ou
// "próxima" automática disparando quase junto de um toque manual),
// as DUAS liam `get().sound` como sendo a mesma música antiga, as
// DUAS criavam seu próprio AudioPlayer novo, e a que terminasse de
// carregar primeiro tinha seu `sound` sobrescrito no store pela
// segunda — sem nunca ser liberada. Ela ficava tocando sozinha,
// invisível pro store, ao lado da música nova.
//
// A correção: cada chamada guarda seu próprio número (`meuToken`).
// Antes de mexer no estado global ou entregar o áudio pra tocar, ela
// confere se ainda é a chamada mais recente (`meuToken === token`).
// Se não for — porque uma chamada mais nova começou nesse meio
// tempo — ela libera o que acabou de carregar e desiste, em vez de
// sobrescrever o estado e abandonar o som tocando.
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
    // avança pra próxima da fila (se houver). Diferente do expo-av,
    // o expo-audio NÃO reinicia sozinho — o player fica pausado no
    // fim, então o repeat precisa voltar pro início e mandar tocar
    // de novo explicitamente.
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
  // é descartável: libera e não toca — é exatamente esse caso que
  // antes ficava tocando por baixo.
  if (meuToken !== token) {
    try {
      player.remove();
    } catch {}
    return;
  }

  set({ sound: player, musicaAtual: musica, estaTocando: true });
}

// Vive FORA da árvore de componentes do React — por isso nunca
// "reseta" ao trocar de tela/rota, resolvendo o mesmo problema que
// tivemos no FlutterFlow (player reiniciando a cada navegação).
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