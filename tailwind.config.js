/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Tema escuro do Vybe. "surface" é a superfície secundária —
        // chip inativo, placeholder de imagem, avatar sem foto — tudo
        // que antes usava cinza-claro (bg-gray-100/200) do tema claro.
        primary: "#3B82F6",
        primaryDark: "#1D4ED8",
        primaryLight: "#60A5FA",
        background: "#0A0E16",
        card: "#141A24",
        surface: "#1E2633",
        muted: "#8B95A8",
        textDark: "#F1F5F9",
        border: "#232C3D",
        'bg-dark': '#0B101E', // Fundo principal super escuro e levemente azulado
        'blue-glow': '#3B82F6', // Azul vibrante para os botões e sombras
        'glass-white': 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        pill: 999,
      },
    },
  },
  plugins: [],
};
