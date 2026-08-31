module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Corrige "Cannot use 'import.meta' outside a module" no
          // bundle web — causado pelo Zustand v5, que usa
          // import.meta.env internamente (sintaxe ESM/Vite que o
          // Metro não entende por padrão). Esse plugin, adicionado
          // pela própria Expo no SDK 53+, transforma isso em algo
          // que o Metro consegue empacotar.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};