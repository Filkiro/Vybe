import { create } from "zustand";
import { Audio, AVPlaybackStatus } from "expo-av";

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
  sound: Audio.Sound | null;
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
// tocarMusica/proxima/anterior são assíncronos (createAsync depende
// de rede), então se duas chamadas se sobrepunham (ex: tocar uma
// música enquanto a anterior ainda estava carregando, ou "próxima"
// automática disparando quase junto de um toque manual), as DUAS
// liam `get().sound` como sendo a mesma música antiga, as DUAS
// criavam seu próprio Audio.Sound novo, e a que terminasse de
// carregar primeiro tinha seu `sound` sobrescrito no store pela
// segunda — sem nunca ser descarregada. Ela ficava tocando sozinha,
// invisível pro store, ao lado da música nova.
//
// A correção: cada chamada guarda seu próprio número (`meuToken`).
// Antes de mexer no estado global ou entregar o áudio pra tocar, ela
// confere se ainda é a chamada mais recente (`meuToken === token`).
// Se não for — porque uma chamada mais nova começou nesse meio
// tempo — ela descarrega o que acabou de carregar e desiste, em vez
// de sobrescrever o estado e abandonar o som tocando.
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
      await atual.unloadAsync();
    } catch {
      // Som já pode ter sido descarregado por outra chamada; ignora.
    }
  }

  // Enquanto esperávamos o unloadAsync acima, outra chamada pode ter
  // começado (e já ter tomado a frente). Se não somos mais a mais
  // recente, para por aqui — nem chega a carregar o áudio novo.
  if (meuToken !== token) return;

  const { sound } = await Audio.Sound.createAsync(
    { uri: musica.arquivoUrl },
    { shouldPlay: true },
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      // Ignora atualizações de um som que já foi substituído — evita
      // que um "didJustFinish" atrasado de uma música antiga dispare
      // proxima()/seek() por cima da música atual.
      if (meuToken !== token) return;

      set({
        posicaoMs: status.positionMillis,
        duracaoMs: status.durationMillis ?? 0,
        estaTocando: status.isPlaying,
      });

      // Música terminou: repete se "repetir" estiver ligado, senão
      // avança pra próxima da fila (se houver).
      if (status.didJustFinish) {
        if (get().repetir) {
          get().seek(0);
        } else {
          get().proxima();
        }
      }
    }
  );

  // Outra chamada pode ter começado enquanto createAsync (que
  // depende de rede) ainda estava em andamento. Se sim, esse som que
  // acabamos de carregar é descartável: descarrega e não toca — é
  // exatamente esse caso que antes ficava tocando por baixo.
  if (meuToken !== token) {
    try {
      await sound.unloadAsync();
    } catch {}
    return;
  }

  set({ sound, musicaAtual: musica, estaTocando: true });
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
    await get().sound?.pauseAsync();
    set({ estaTocando: false });
  },

  retomar: async () => {
    await get().sound?.playAsync();
    set({ estaTocando: true });
  },

  seek: async (ms) => {
    await get().sound?.setPositionAsync(ms);
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
