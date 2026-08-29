import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Play, Pause } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { usePlayerStore } from "../store/playerStore";

function formatarTempo(ms: number) {
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { musicaAtual, estaTocando, posicaoMs, duracaoMs, pausar, retomar } = usePlayerStore();

  if (!musicaAtual) return null;

  const progresso = duracaoMs > 0 ? posicaoMs / duracaoMs : 0;

  return (
    <BlurView 
      intensity={40} 
      tint="dark" 
      className="mx-3 mb-2 rounded-2xl p-3 flex-row items-center border border-glass-white overflow-hidden"
    >
      {/* Toca no restante do mini player (capa + texto) abre a tela
          "Tocando agora" — só o botão de play/pause fica separado. */}
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
          
          {/* Barra de Progresso com Glow */}
          <View className="h-1 bg-glass-white rounded-full overflow-hidden">
            <View 
              className="h-1 bg-primary rounded-full" 
              style={[{ width: `${progresso * 100}%` }, styles.progressGlow]} 
            />
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => (estaTocando ? pausar() : retomar())}
        className="w-12 h-12 rounded-full bg-primary items-center justify-center ml-2 border border-blue-400"
        style={styles.buttonGlow}
      >
        {estaTocando ? (
          <Pause color="white" size={18} fill="white" />
        ) : (
          <Play color="white" size={18} fill="white" style={{ marginLeft: 3 }} />
        )}
      </Pressable>
    </BlurView>
  );
}

// ---------------------------------------------------------------
// Estilos Nativos (Sombras e Efeitos Neon)
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  buttonGlow: {
    shadowColor: '#60A5FA', // Azul claro para combinar com a paleta
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  progressGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  }
});