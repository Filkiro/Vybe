import { useState } from "react";
import { View, Text, Pressable, Image, useWindowDimensions, GestureResponderEvent, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Heart } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { usePlayerStore } from "../store/playerStore";
import { colors } from "../constants/theme";

const LARGURA_PAINEL_DESKTOP = 420;

function formatarTempo(ms: number) {
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

export default function TocandoAgora() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 768;
  const { musicaAtual } = usePlayerStore();

  if (!musicaAtual) {
    return (
      <View className="flex-1 bg-bg-dark items-center justify-center px-8">
        <Text className="text-muted text-center mb-4">Nenhuma música tocando no momento.</Text>
        <Pressable onPress={() => router.back()} className="bg-primary rounded-full px-6 py-3" style={styles.buttonGlow}>
          <Text className="text-textDark font-bold">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return ehDesktop ? <LayoutDesktop /> : <LayoutMobile />;
}

// ---------------------------------------------------------------
// Mobile: Painel Único Unificado com ScrollView
// ---------------------------------------------------------------
function LayoutMobile() {
  const { musicaAtual, fila } = usePlayerStore();
  if (!musicaAtual) return null;

  return (
    <View className="flex-1 bg-bg-dark">
      {/* Header Fixo */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-2 z-10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full border border-glass-white items-center justify-center bg-glass-white">
          <ChevronDown color={colors.textDark} size={22} />
        </Pressable>
        <Text className="text-primaryLight text-xs font-bold tracking-widest uppercase">Tocando Agora</Text>
        <View className="w-10" />
      </View>

      {/* Conteúdo rolável contendo o painel unificado e a playlist */}
      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ÚNICO CARD DE VIDRO UNIFICADO */}
        <BlurView 
        experimentalBlurMethod="dimezisBlurView"
          intensity={30} 
          tint="dark" 
          className="w-full p-6 rounded-3xl border border-glass-white items-center overflow-hidden"
        >
          <Capa tamanho={200} />
          
          <View className="w-full mt-5">
            <InfoMusica alinhamento="center" />
          </View>

          <View className="w-full mt-5">
            <BarraProgresso />
            <Controles tamanhoBotaoPrincipal={60} />
          </View>
        </BlurView>

        {/* Playlist logo abaixo */}
        {fila.length > 1 && (
          <View className="w-full mt-6">
            <PainelFila />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------
// Desktop: Cards com efeito Glassmorphism lado a lado
// ---------------------------------------------------------------
function LayoutDesktop() {
  const { musicaAtual } = usePlayerStore();
  if (!musicaAtual) return null;

  return (
    <View className="flex-1 bg-bg-dark items-center justify-center px-8 py-8">
      <Pressable
        onPress={() => router.back()}
        className="absolute top-8 left-8 w-10 h-10 rounded-full border border-glass-white items-center justify-center bg-glass-white"
      >
        <ChevronDown color={colors.textDark} size={22} />
      </Pressable>

      <View className="flex-row gap-6" style={{ maxWidth: 960, width: "100%", maxHeight: "80%" }}>
        
        {/* Card do Player */}
        <BlurView 
        experimentalBlurMethod="dimezisBlurView"
          intensity={30} 
          tint="dark" 
          className="rounded-3xl p-8 items-center border border-glass-white overflow-hidden" 
          style={{ width: LARGURA_PAINEL_DESKTOP }}
        >
          <Capa tamanho={260} />
          <InfoMusica alinhamento="center" />
          <View className="w-full mt-8">
            <BarraProgresso />
            <Controles tamanhoBotaoPrincipal={64} />
          </View>
        </BlurView>

        {/* Card da Playlist com flex-1 e style flex/minHeight para o scroll rodar */}
        <BlurView 
        experimentalBlurMethod="dimezisBlurView"
          intensity={20} 
          tint="dark" 
          className="flex-1 rounded-3xl border border-glass-white overflow-hidden"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <ScrollView 
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24 }}
          >
            <PainelFila />
          </ScrollView>
        </BlurView>

      </View>
    </View>
  );
}

function Capa({ tamanho }: { tamanho: number }) {
  const { musicaAtual } = usePlayerStore();
  if (!musicaAtual) return null;

  return (
    <View style={styles.glowShadow}>
      <View style={{ width: tamanho, height: tamanho, borderRadius: 24, overflow: 'hidden' }}>
        {musicaAtual.capaUrl ? (
          <Image
            source={{ uri: musicaAtual.capaUrl }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <View style={{ width: '100%', height: '100%' }} className="bg-surface" />
        )}
      </View>
    </View>
  );
}

function InfoMusica({ alinhamento }: { alinhamento: "left" | "center" }) {
  const { musicaAtual } = usePlayerStore();
  if (!musicaAtual) return null;

  return (
    <View className={`w-full ${alinhamento === "center" ? "items-center" : "items-start"}`}>
      <Text className="text-textDark text-xl font-bold text-center tracking-wide" numberOfLines={1}>
        {musicaAtual.nome}
      </Text>
      <Text className="text-primaryLight text-sm mt-1 font-medium text-center" numberOfLines={1}>
        {musicaAtual.autorApelido ?? "Autor desconhecido"}
      </Text>
    </View>
  );
}

function BarraProgresso() {
  const { posicaoMs, duracaoMs, seek } = usePlayerStore();
  const [largura, setLargura] = useState(300);

  function aoTocarNaBarra(evento: GestureResponderEvent) {
    if (!duracaoMs || duracaoMs <= 0 || !isFinite(duracaoMs)) return;

    const nativeEvt = evento.nativeEvent as any;
    // Captura o X tanto no mobile (locationX) quanto na web (offsetX ou clientX)
    const x = nativeEvt.locationX ?? nativeEvt.offsetX ?? nativeEvt.layerX;

    if (typeof x !== 'number' || !isFinite(x)) return;

    const larguraEfetiva = largura > 0 ? largura : 300;
    const fracao = Math.max(0, Math.min(1, x / larguraEfetiva));
    const tempoDestino = fracao * duracaoMs;

    if (isFinite(tempoDestino)) {
      seek(tempoDestino);
    }
  }

  const progresso = (duracaoMs > 0 && isFinite(duracaoMs) && isFinite(posicaoMs)) 
    ? Math.max(0, Math.min(1, posicaoMs / duracaoMs)) 
    : 0;

  return (
    <View>
      {/* Container com padding vertical para ampliar a área de clique sem engrossar a barra visual */}
      <Pressable
        onPress={aoTocarNaBarra}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setLargura(w);
        }}
        style={{ paddingVertical: 12, justifyContent: "center" }}
      >
        <View className="h-1.5 bg-glass-white rounded-full overflow-hidden w-full">
          <View className="h-1.5 bg-primary rounded-full" style={[{ width: `${progresso * 100}%` }, styles.progressGlow]} />
        </View>
      </Pressable>

      <View className="flex-row justify-between mt-1">
        <Text className="text-primaryLight text-xs font-medium">{formatarTempo(posicaoMs)}</Text>
        <Text className="text-muted text-xs font-medium">{formatarTempo(duracaoMs)}</Text>
      </View>
    </View>
  );
}

function Controles({ tamanhoBotaoPrincipal }: { tamanhoBotaoPrincipal: number }) {
  const { estaTocando, repetir, fila, pausar, retomar, proxima, anterior, alternarRepetir } = usePlayerStore();
  const [curtido, setCurtido] = useState(false);
  const temFila = fila.length > 1;

  return (
    <View className="flex-row items-center justify-between mt-4">
      <Pressable onPress={alternarRepetir} className="p-2">
        <Repeat color={repetir ? colors.primary : colors.muted} size={20} />
      </Pressable>

      <Pressable onPress={anterior} disabled={!temFila} style={{ opacity: temFila ? 1 : 0.4 }} className="p-2">
        <SkipBack color={colors.textDark} size={24} fill={colors.textDark} />
      </Pressable>

      <Pressable
        onPress={() => (estaTocando ? pausar() : retomar())}
        style={[
          styles.buttonGlow,
          {
            width: tamanhoBotaoPrincipal,
            height: tamanhoBotaoPrincipal,
            borderRadius: tamanhoBotaoPrincipal / 2,
          }
        ]}
        className="bg-primary items-center justify-center border border-blue-400"
      >
        {estaTocando ? (
          <Pause color="white" size={tamanhoBotaoPrincipal * 0.4} fill="white" />
        ) : (
          <Play color="white" size={tamanhoBotaoPrincipal * 0.4} fill="white" style={{ marginLeft: 4 }} />
        )}
      </Pressable>

      <Pressable onPress={proxima} disabled={!temFila} style={{ opacity: temFila ? 1 : 0.4 }} className="p-2">
        <SkipForward color={colors.textDark} size={24} fill={colors.textDark} />
      </Pressable>

      <Pressable onPress={() => setCurtido((v) => !v)} className="p-2">
        <Heart color={curtido ? "#EF4444" : colors.muted} size={20} fill={curtido ? "#EF4444" : "transparent"} />
      </Pressable>
    </View>
  );
}

function PainelFila() {
  const { fila, musicaAtual, tocarMusica } = usePlayerStore();

  if (fila.length <= 1) return null;

  return (
    <View className="w-full">
      <Text className="text-textDark font-bold text-base mb-3 px-1">Playlist ({fila.length})</Text>
      {fila.map((item) => {
        const ehAtual = item.id === musicaAtual?.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => tocarMusica(item, fila)}
            className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 border ${ehAtual ? "bg-glass-white border-primary" : "bg-transparent border-glass-white"}`}
          >
            {item.capaUrl ? (
              <Image source={{ uri: item.capaUrl }} className="w-12 h-12 rounded-xl mr-4" />
            ) : (
              <View className="w-12 h-12 rounded-xl bg-surface mr-4" />
            )}
            <View className="flex-1">
              <Text numberOfLines={1} className={`font-bold text-base ${ehAtual ? "text-primaryLight" : "text-textDark"}`}>
                {item.nome}
              </Text>
              <Text numberOfLines={1} className="text-muted text-sm mt-0.5">
                {item.autorApelido ?? "Autor desconhecido"}
              </Text>
            </View>
            {ehAtual && <Play color={colors.primary} size={16} fill={colors.primary} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  glowShadow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonGlow: {
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  progressGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  }
});