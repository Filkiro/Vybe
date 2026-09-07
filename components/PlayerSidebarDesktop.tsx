import { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayerStore } from "../store/playerStore";
import {
  useCorDinamica,
  CapaCircular,
  BarraProgressoLinha,
  ControlesDesign,
  BotaoCurtir,
  PainelFila,
} from "./player/PlayerVisuals";

// Sidebar flutuante do player — mesmo tratamento visual do navbar (blur,
// bordas arredondadas, afastada das bordas da tela) e mesmo comportamento
// do mobile: a fila fica escondida até o usuário clicar no ícone de lista.
export function PlayerSidebarDesktop() {
  const insets = useSafeAreaInsets();
  const { musicaAtual } = usePlayerStore();
  const corDinamica = useCorDinamica();
  const [curtido, setCurtido] = useState(false);
  const [mostrarFila, setMostrarFila] = useState(false);

  const margemVertical = Math.max(insets.top);
  const margemInferior = Math.max(insets.bottom, 14);

  return (
    <View
      style={{
        width: 340,
        paddingTop: margemVertical,
        paddingBottom: margemInferior,
        paddingRight: 14,
        paddingLeft: 6,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 28,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.14)",
          backgroundColor: "rgba(15, 22, 38, 0.75)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        <BlurView
          experimentalBlurMethod="dimezisBlurView"
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        {musicaAtual?.capaUrl && (
          <Image
            source={{ uri: musicaAtual.capaUrl }}
            style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.2 }}
            blurRadius={70}
          />
        )}

        <View className="flex-1 px-5 pt-5 pb-5">
          {!musicaAtual ? (
            <View className="flex-1 items-center justify-center px-2">
              <Text className="text-muted text-center">Nenhuma música tocando no momento.</Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-white text-base font-semibold">Tocando Agora</Text>
                <BotaoCurtir curtido={curtido} onPress={() => setCurtido((v) => !v)} />
              </View>

              {mostrarFila ? (
                <View className="flex-1 mb-4">
                  <PainelFila aoFechar={() => setMostrarFila(false)} />
                </View>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <CapaCircular tamanho={200} corGlow={corDinamica} />

                  <View className="items-center mt-6 px-2 w-full">
                    <Text className="text-white text-xl font-bold text-center tracking-wide" numberOfLines={1}>
                      {musicaAtual.nome}
                    </Text>
                    <Text className="text-white/60 text-sm mt-1 font-medium text-center" numberOfLines={1}>
                      {musicaAtual.autorApelido ?? "Artista Desconhecido"}
                    </Text>
                  </View>
                </View>
              )}

              <View className="w-full">
                <BarraProgressoLinha corDinamica={corDinamica} />
                <ControlesDesign
                  tamanhoBotaoPrincipal={56}
                  corDinamica={corDinamica}
                  aoAlternarFila={() => setMostrarFila((v) => !v)}
                  filaAtiva={mostrarFila}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}