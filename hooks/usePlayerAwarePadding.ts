import { usePlayerStore } from "../store/playerStore";
import { MINI_PLAYER_HEIGHT } from "../constants/layout";

// O MiniPlayer flutua por cima da tab bar, fora do fluxo normal da
// tela — então um ScrollView/FlatList com um paddingBottom fixo
// (só pensado pra tab bar) fica com o final do conteúdo tampado
// assim que uma música começa a tocar. Esse hook devolve o
// paddingBottom certo pra cada momento: o valor base da tela quando
// não tem nada tocando, e o valor base + a altura do player quando
// tem — assim o conteúdo "sobe" e some de baixo do player sozinho.
//
// Uso: contentContainerStyle={{ paddingBottom: usePlayerAwarePadding(140) }}
export function usePlayerAwarePadding(basePadding: number) {
  const tocando = usePlayerStore((s) => !!s.musicaAtual);
  return basePadding + (tocando ? MINI_PLAYER_HEIGHT : 0);
}
