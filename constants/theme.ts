// Espelha as cores do tailwind.config.js — usar aqui quando o
// valor precisa ser um hex "de verdade" em JS (ex: prop `color` de
// ícones, `ActivityIndicator`, gradientes), já que className não
// alcança essas props. Qualquer mudança de cor deve acontecer nos
// DOIS lugares (aqui e no tailwind.config.js) para não desalinhar.
export const colors = {
  primary: "#3B82F6",
  primaryDark: "#1D4ED8",
  primaryLight: "#60A5FA",
  background: "#0A0E16",
  card: "#141A24",
  surface: "#1E2633",
  muted: "#8B95A8",
  textDark: "#F1F5F9",
  border: "#232C3D",
  danger: "#F87171",
  success: "#4ADE80",
  warning: "#FBBF24",
};

export const rotulosTipoConta: Record<string, string> = {
  musico: "Músico",
  organizador: "Organizador",
  moderador: "Moderador",
  administrador: "Administrador",
};
