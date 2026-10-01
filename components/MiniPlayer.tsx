import { View, Text, Pressable, Image, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";
import { Play, Pause } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { usePlayerStore } from "../store/playerStore";
import { useCorDinamica } from "./player/PlayerVisuals";

function formatarTempo(ms: number) {
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MiniPlayer() {
  const { musicaAtual, estaTocando, posicaoMs, duracaoMs, pausar, retomar } = usePlayerStore();
  const corDinamica = useCorDinamica();

  if (!musicaAtual) return null;

  const progresso = duracaoMs > 0 ? posicaoMs / duracaoMs : 0;

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        backgroundColor: "rgba(15, 22, 38, 0.82)",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      }}
    >
      <BlurView
        experimentalBlurMethod="dimezisBlurView"
        intensity={70}
        tint="dark"
        className="p-3 flex-row items-center"
      >
        {/* Toca no restante do mini player (capa + texto) abre a tela "Tocando agora" */}
        <Pressable onPress={() => router.push("/tocando")} className="flex-1 flex-row items-center">
          {musicaAtual.capaUrl ? (
            <Image source={{ uri: musicaAtual.capaUrl }} className="w-12 h-12 rounded-xl mr-3" />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-surface mr-3" />
          )}

          <View className="flex-1 pr-2">
            <Text numberOfLines={1} className="font-bold text-textDark text-sm">
              {musicaAtual.nome}
            </Text>
            <Text className="text-xs text-primaryLight font-medium mt-0.5 mb-1.5">
              {formatarTempo(posicaoMs)} / {formatarTempo(duracaoMs)}
            </Text>

            {/* Barra de Progresso */}
            <View className="h-1 w-full bg-white/20 rounded-full mt-1 relative overflow-hidden">
              <Animated.View
                style={{
                  height: "100%",
                  width: `${progresso * 100}%`,
                  backgroundColor: corDinamica as any,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        </Pressable>

        <View className="ml-2 relative items-center justify-center">
          <AnimatedPressable
            onPress={() => (estaTocando ? pausar() : retomar())}
            className="w-11 h-11 rounded-full items-center justify-center border border-white/10"
            style={{ backgroundColor: corDinamica as any, borderRadius: 9999, padding: 8 }}
          >
            {estaTocando ? (
              <Pause color="white" size={18} fill="white" />
            ) : (
              <Play color="white" size={18} fill="white" style={{ marginLeft: 0 }} />
            )}
          </AnimatedPressable>
        </View>
      </BlurView>
    </View>
  );
}

// ---------------------------------------------------------------
// Estilos Nativos (Sombras e Efeitos Neon)
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  buttonGlow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  progressGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
});
