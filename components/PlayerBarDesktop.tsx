import { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ListMusic,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { usePlayerStore } from "../store/playerStore";
import {
  useCorDinamica,
  BarraProgressoLinha,
  BotaoCurtir,
  PainelFila,
} from "./player/PlayerVisuals";

export function PlayerBarDesktop() {
  const insets = useSafeAreaInsets();
  
  // Extração das propriedades com os nomes exatos da store
  const {
    musicaAtual,
    estaTocando,
    pausar,
    retomar,
    proxima,
    anterior,
    repetir,
    alternarRepetir,
    volume,
    isMuted,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  const corDinamica = useCorDinamica();
  const [curtido, setCurtido] = useState(false);
  const [mostrarFila, setMostrarFila] = useState(false);
  const [modoAleatorio, setModoAleatorio] = useState(false);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);

  if (!musicaAtual) return null;

  // Handler para alternar reprodução
  const handleTogglePlayPause = () => {
    if (estaTocando) {
      pausar();
    } else {
      retomar();
    }
  };

  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 0) }}>
      {/* POPOVER DA FILA */}
      {mostrarFila && (
        <View
          style={{
            position: "absolute",
            right: 20,
            bottom: "100%",
            marginBottom: 12,
            width: 380,
            height: 400,
            borderRadius: 24,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.12)",
            backgroundColor: "rgba(15, 22, 38, 0.95)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
            elevation: 20,
          }}
        >
          <BlurView
            experimentalBlurMethod="dimezisBlurView"
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
          <View className="flex-1 p-5">
            <PainelFila aoFechar={() => setMostrarFila(false)} />
          </View>
        </View>
      )}

      {/* BARRA PRINCIPAL */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          backgroundColor: "#0B101E",
        }}
      >
        <BlurView
          experimentalBlurMethod="dimezisBlurView"
          intensity={60}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        <View className="flex-row items-center justify-between px-6 py-3.5 gap-6">
          
          {/* 1. ESQUERDA: CAPA E DETALHES DA MÚSICA */}
          <View className="flex-row items-center gap-3.5" style={{ minWidth: 220, maxWidth: 280 }}>
            {musicaAtual.capaUrl ? (
              <Image
                source={{ uri: musicaAtual.capaUrl }}
                style={{ width: 48, height: 48, borderRadius: 12 }}
              />
            ) : (
              <View
                style={{ width: 48, height: 48, borderRadius: 12 }}
                className="bg-white/10 items-center justify-center"
              >
                <Text className="text-white/40 font-bold text-xs">vybe</Text>
              </View>
            )}
            <View className="flex-1">
              <Text numberOfLines={1} className="text-white font-bold text-sm tracking-wide">
                {musicaAtual.nome}
              </Text>
              <Text numberOfLines={1} className="text-gray-400 text-xs mt-0.5 font-medium">
                {musicaAtual.autorApelido ?? "Artista Desconhecido"}
              </Text>
            </View>
          </View>

          {/* 2. CONTROLES DE REPRODUÇÃO */}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={anterior}
              className="w-9 h-9 items-center justify-center rounded-full active:bg-white/10"
            >
              <SkipBack size={20} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handleTogglePlayPause}
              className="w-11 h-11 items-center justify-center rounded-full bg-white active:scale-95 transition-transform"
              style={{
                shadowColor: "#FFF",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              {estaTocando ? (
                <Pause size={20} color="#0B101E" fill="#0B101E" />
              ) : (
                <Play size={20} color="#0B101E" fill="#0B101E" style={{ marginLeft: 2 }} />
              )}
            </Pressable>

            <Pressable
              onPress={proxima}
              className="w-9 h-9 items-center justify-center rounded-full active:bg-white/10"
            >
              <SkipForward size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {/* 3. CENTRO: BARRA DE PROGRESSO */}
          <View className="flex-1 px-4">
            <BarraProgressoLinha corDinamica={corDinamica || "#3B82F6"} />
          </View>

          {/* 4. DIREITA: BOTÕES SECUNDÁRIOS */}
          <View className="flex-row items-center gap-3">
            <BotaoCurtir curtido={curtido} onPress={() => setCurtido((v) => !v)} />

            <Pressable
              onPress={() => setModoAleatorio((v) => !v)}
              className="p-2 rounded-full active:bg-white/10"
            >
              <Shuffle size={18} color={modoAleatorio ? "#3B82F6" : "#64748B"} />
            </Pressable>

            <Pressable
              onPress={alternarRepetir}
              className="p-2 rounded-full active:bg-white/10"
            >
              <Repeat size={18} color={repetir ? "#3B82F6" : "#64748B"} />
            </Pressable>

            <Pressable
              onPress={() => setMostrarFila((v) => !v)}
              className={`p-2 rounded-full ${mostrarFila ? "bg-white/10" : "active:bg-white/10"}`}
            >
              <ListMusic size={18} color={mostrarFila ? "#3B82F6" : "#64748B"} />
            </Pressable>

            {/* Container do Volume: Ícone + Slider (visível no hover) */}
            <View
              className="items-center justify-center relative"
              // @ts-ignore
              onMouseEnter={() => setIsHoveringVolume(true)}
              // @ts-ignore
              onMouseLeave={() => setIsHoveringVolume(false)}
            >
              <Pressable
                onPress={toggleMute}
                className="p-2 rounded-full active:bg-white/10"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} color="#EF4444" />
                ) : (
                  <Volume2 size={18} color={isHoveringVolume ? "#3B82F6" : "#64748B"} />
                )}
              </Pressable>
              
              {/* O slider vertical aparece acima do ícone */}
              {isHoveringVolume && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 20, // Desce para cobrir o gap com o botão
                    paddingBottom: 24, // Empurra o fundo visível para cima
                    width: 40,
                    height: 144, // 120 (visível) + 24 (gap transparente)
                    zIndex: 9999,
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                  {/* Fundo visível do slider */}
                  <View
                    style={{
                      width: 36,
                      height: 120,
                      backgroundColor: "rgba(15, 22, 38, 0.95)",
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.5,
                      shadowRadius: 15,
                      elevation: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 90,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={(e) => {
                      const y = e.nativeEvent.locationY;
                      setVolume(Math.max(0, Math.min(1, 1 - y / 90)));
                    }}
                    onResponderMove={(e) => {
                      const y = e.nativeEvent.locationY;
                      setVolume(Math.max(0, Math.min(1, 1 - y / 90)));
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(isMuted ? 0 : volume) * 100}%`,
                        backgroundColor: "#3B82F6",
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </View>
              </View>
              )}
            </View>

          </View>

        </View>
      </View>
    </View>
  );
}