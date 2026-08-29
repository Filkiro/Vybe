// Alturas usadas tanto pelo layout das tabs (pra posicionar a tab
// bar e o MiniPlayer) quanto pelas telas (pra saber quanto espaço
// reservar no final do conteúdo e não deixar nada tampado). Ficam
// aqui, num lugar só, pra tab bar e telas nunca desalinharem.
export const TAB_BAR_HEIGHT = 76;

// Altura reservada pro MiniPlayer quando ele está visível: p-3 (24)
// + linha de conteúdo (~48, a capa 12x12) + mb-2 (8) + paddingBottom
// do wrapper (8) do MiniPlayer, com uma folga. Usada pelas telas pra
// somar ao paddingBottom de baixo quando existe música tocando —
// senão o player, que flutua por cima da tab bar fora do fluxo
// normal, tampa o final do conteúdo (como o toggle "Disponível para
// shows" no Perfil).
export const MINI_PLAYER_HEIGHT = 96;
