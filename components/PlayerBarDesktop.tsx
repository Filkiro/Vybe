import { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated, GestureResponderEvent } from "react-native";
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
import { useCorDinamica, BotaoCurtir, PainelFila } from "./player/PlayerVisuals";
import { useCurtidaMusica } from "../hooks/useCurtidaMusica";

function formatarTempo(ms: number) {
  if (!ms || ms < 0 || !isFinite(ms)) return "0:00";
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

function formatarTempoRestante(pos: number, dur: number) {
  if (!dur || dur <= 0 || !isFinite(dur)) return "-0:00";
  const dif = Math.max(0, dur - pos);
  return `-${formatarTempo(dif)}`;
}

export function PlayerBarDesktop() {
  const insets = useSafeAreaInsets();
  
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
    posicaoMs,
    duracaoMs,
    seek,
  } = usePlayerStore();

  const corDinamica = useCorDinamica();
  const { curtido, totalCurtidas, alternarCurtida } = useCurtidaMusica(musicaAtual?.id);
  const [mostrarFila, setMostrarFila] = useState(false);
  const [modoAleatorio, setModoAleatorio] = useState(false);
  const [larguraBarra, setLarguraBarra] = useState(300);

  if (!musicaAtual) return null;

  const handleTogglePlayPause = () => {
    if (estaTocando) {
      pausar();
    } else {
      retomar();
    }
  };

  const progresso =
    duracaoMs > 0 && isFinite(duracaoMs) && isFinite(posicaoMs)
      ? Math.max(0, Math.min(1, posicaoMs / duracaoMs))
      : 0;

  function aoTocarNaBarra(evento: GestureResponderEvent) {
    if (!duracaoMs || duracaoMs <= 0 || !isFinite(duracaoMs)) return;
    const nativeEvt = evento.nativeEvent as any;
    const x = nativeEvt.locationX ?? nativeEvt.offsetX ?? nativeEvt.layerX;
    if (typeof x !== "number" || !isFinite(x)) return;

    const larguraEfetiva = larguraBarra > 0 ? larguraBarra : 300;
    const fracao = Math.max(0, Math.min(1, x / larguraEfetiva));
    const tempoDestino = fracao * duracaoMs;

    if (isFinite(tempoDestino)) {
      seek(tempoDestino);
    }
  }

  return (
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: Math.max(insets.bottom, 0) }}>
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
            backgroundColor: "rgba(10, 14, 22, 0.95)",
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
          borderColor: "rgba(255, 255, 255, 0.05)",
          backgroundColor: "rgba(10, 14, 22, 0.9)", // #0a0e16 com 90% opacidade
        }}
        className="shadow-2xl h-[90px]"
      >
        <BlurView
          experimentalBlurMethod="dimezisBlurView"
          intensity={60}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        <View className="flex-row items-center justify-between px-6 h-full w-full max-w-[1920px] mx-auto">
          
          {/* 1. ESQUERDA: CAPA, DETALHES E LIKE (1/4 da tela) */}
          <View className="flex-row items-center gap-4 w-[25%] min-w-[200px]">
            {musicaAtual.capaUrl ? (
              <Image
                source={{ uri: musicaAtual.capaUrl }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
                className="shadow-md"
              />
            ) : (
              <View
                style={{ width: 56, height: 56, borderRadius: 8 }}
                className="bg-[#1c2028] items-center justify-center border border-white/5"
              >
                <Text className="text-[#3B82F6] font-bold text-[12px]">vybe</Text>
              </View>
            )}
            <View className="flex-col">
              <Text numberOfLines={1} className="text-[#dfe2ee] font-bold text-[14px] hover:text-[#3B82F6] transition-colors cursor-pointer max-w-[180px]">
                {musicaAtual.nome}
              </Text>
              <Text numberOfLines={1} className="text-[#8d90a0] text-[12px] mt-0.5 hover:text-[#dfe2ee] transition-colors cursor-pointer max-w-[180px]">
                {musicaAtual.autorApelido ?? "Artista Desconhecido"}
              </Text>
            </View>
            <View className="ml-1">
              <BotaoCurtir curtido={curtido} totalCurtidas={totalCurtidas} onPress={alternarCurtida} />
            </View>
          </View>

          {/* 2. CENTRO: CONTROLES E BARRA DE PROGRESSO EM LINHA UNICA */}
          <View className="flex-col items-center justify-center w-[50%] max-w-2xl px-4">
            
            {/* Controles Acima */}
            <View className="flex-row items-center gap-6 mb-2">
              <Pressable
                onPress={() => setModoAleatorio((v) => !v)}
                className="active:opacity-70 hover:scale-110 transition-transform"
              >
                <Shuffle size={18} color={modoAleatorio ? "#3B82F6" : "#8d90a0"} />
              </Pressable>

              <Pressable
                onPress={anterior}
                className="active:opacity-70 hover:scale-110 transition-transform"
              >
                <SkipBack size={22} color="#dfe2ee" />
              </Pressable>

              <Pressable
                onPress={handleTogglePlayPause}
                className="w-9 h-9 items-center justify-center rounded-full bg-[#2563EB] hover:scale-105 active:scale-95 transition-all shadow-[0_0_16px_rgba(37,99,235,0.45)]"
              >
                {estaTocando ? (
                  <Pause size={18} color="white" fill="white" />
                ) : (
                  <Play size={18} color="white" fill="white" style={{ marginLeft: 2 }} />
                )}
              </Pressable>

              <Pressable
                onPress={proxima}
                className="active:opacity-70 hover:scale-110 transition-transform"
              >
                <SkipForward size={22} color="#dfe2ee" />
              </Pressable>

              <Pressable
                onPress={alternarRepetir}
                className="active:opacity-70 hover:scale-110 transition-transform"
              >
                <Repeat size={18} color={repetir ? "#3B82F6" : "#8d90a0"} />
              </Pressable>
            </View>

            {/* Timeline na Mesma Linha com Textos nas Laterais */}
            <View className="w-full flex-row items-center gap-3">
              <Text className="text-[#8d90a0] text-[12px] font-medium w-10 text-right">
                {formatarTempo(posicaoMs)}
              </Text>
              
              <Pressable
                onPress={aoTocarNaBarra}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setLarguraBarra(w);
                }}
                className="flex-1 h-6 justify-center group"
              >
                <View className="h-1 w-full bg-[#31353e] rounded-full overflow-hidden relative">
                  <Animated.View
                    style={{
                      height: "100%",
                      width: `${progresso * 100}%`,
                      backgroundColor: corDinamica || "#3B82F6",
                      borderRadius: 999,
                    }}
                    className="group-hover:bg-[#2563eb] transition-colors"
                  />
                </View>

                {/* Bolinha (Slider handle) */}
                <Animated.View
                  style={{
                    position: "absolute",
                    left: `${progresso * 100}%`,
                    marginLeft: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#ffffff",
                    shadowColor: "#3B82F6",
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </Pressable>

              <Text className="text-[#8d90a0] text-[12px] font-medium w-10">
                {formatarTempoRestante(posicaoMs, duracaoMs)}
              </Text>
            </View>
          </View>

          {/* 3. DIREITA: FILA E VOLUME (1/4 da tela) */}
          <View className="flex-row items-center justify-end gap-5 w-[25%] min-w-[200px]">
            <Pressable
              onPress={() => setMostrarFila((v) => !v)}
              className={`active:opacity-70 hover:scale-110 transition-transform ${mostrarFila ? "bg-white/10 rounded-full p-1.5" : ""}`}
            >
              <ListMusic size={18} color={mostrarFila ? "#3B82F6" : "#8d90a0"} />
            </Pressable>

            {/* Container do Volume */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={toggleMute}
                className="active:opacity-70 hover:scale-110 transition-transform"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} color="#EF4444" />
                ) : (
                  <Volume2 size={18} color="#8d90a0" />
                )}
              </Pressable>
              
              <View
                style={{
                  width: 96,
                  height: 24,
                  justifyContent: "center",
                }}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  const x = e.nativeEvent.locationX;
                  setVolume(Math.max(0, Math.min(1, x / 96)));
                }}
                onResponderMove={(e) => {
                  const x = e.nativeEvent.locationX;
                  setVolume(Math.max(0, Math.min(1, x / 96)));
                }}
              >
                <View className="w-full h-1 bg-[#31353e] rounded-full overflow-hidden relative cursor-pointer group">
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: `${(isMuted ? 0 : volume) * 100}%`,
                      backgroundColor: "#3B82F6",
                      borderRadius: 4,
                    }}
                    className="group-hover:bg-[#2563EB] transition-colors"
                  />
                </View>
              </View>
            </View>
          </View>

        </View>
      </View>
    </View>
  );
}
