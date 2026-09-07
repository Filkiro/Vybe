import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  useWindowDimensions,
  GestureResponderEvent,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Share,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  ListMusic,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import ImageColors from "react-native-image-colors";
import { usePlayerStore } from "../store/playerStore";
import { colors } from "../constants/theme";

type CorAnimada = Animated.AnimatedInterpolation<string | number>;

function formatarTempo(ms: number) {
  if (!ms || ms < 0 || !isFinite(ms)) return "0:00";
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

function formatarTempoRestante(posicaoMs: number, duracaoMs: number) {
  const restanteMs = Math.max(0, duracaoMs - posicaoMs);
  return `-${formatarTempo(restanteMs)}`;
}

export default function TocandoAgora() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 768;
  const { musicaAtual } = usePlayerStore();

  const corAnimada = useRef(new Animated.Value(0)).current;
  const [corAtual, setCorAtual] = useState<string>("#CCFF00"); // Verde/Amarelo Neon da imagem
  const [corAnterior, setCorAnterior] = useState<string>("#CCFF00");

  useEffect(() => {
    if (!musicaAtual?.capaUrl) return;

    ImageColors.getColors(musicaAtual.capaUrl, {
      fallback: "#CCFF00",
      cache: true,
      key: musicaAtual.capaUrl,
    })
      .then((colorsResult: any) => {
        let novaCor = "#CCFF00";
        switch (colorsResult.platform) {
          case "android":
            novaCor = colorsResult.vibrant || colorsResult.dominant || "#CCFF00";
            break;
          case "ios":
            novaCor = colorsResult.primary || colorsResult.background || "#CCFF00";
            break;
          case "web":
            novaCor = colorsResult.vibrant || colorsResult.dominant || "#CCFF00";
            break;
        }

        setCorAnterior(corAtual);
        setCorAtual(novaCor);

        corAnimada.setValue(0);
        Animated.timing(corAnimada, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      })
      .catch(() => {
        setCorAtual("#CCFF00");
      });
  }, [musicaAtual?.capaUrl]);

  const corPrincipalAnimada = corAnimada.interpolate({
    inputRange: [0, 1],
    outputRange: [corAnterior, corAtual],
  });

  if (!musicaAtual) {
    return (
      <View className="flex-1 bg-[#0A0A0C] items-center justify-center px-8">
        <Text className="text-muted text-center mb-4">Nenhuma música tocando no momento.</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-primary rounded-full px-6 py-3"
        >
          <Text className="text-textDark font-bold">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return ehDesktop ? (
    <LayoutDesktop corDinamica={corPrincipalAnimada} />
  ) : (
    <LayoutMobile corDinamica={corPrincipalAnimada} />
  );
}

// ---------------------------------------------------------------
// Mobile Layout
// ---------------------------------------------------------------
function LayoutMobile({ corDinamica }: { corDinamica: CorAnimada }) {
  const { musicaAtual, fila } = usePlayerStore();
  const [mostrarFila, setMostrarFila] = useState(false);
  const [curtido, setCurtido] = useState(false);

  if (!musicaAtual) return null;

  return (
    <View className="flex-1 bg-[#0B0B0E] relative overflow-hidden">
      {/* Imagem de Fundo com Blur Imersivo */}
      {musicaAtual.capaUrl && (
        <Image
          source={{ uri: musicaAtual.capaUrl }}
          className="absolute inset-0 w-full h-full opacity-40"
          blurRadius={50}
        />
      )}

      <View className="flex-1 bg-black/40 justify-between px-6 pt-12 pb-10 z-10">
        {/* Header Topo */}
        <View className="flex-row items-center justify-between z-10">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-white/10 items-center justify-center backdrop-blur-md"
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>

          <Text className="text-white text-base font-semibold">Tocando Agora</Text>

          <Pressable
            onPress={() => setCurtido((v) => !v)}
            className="w-11 h-11 rounded-full bg-white/10 items-center justify-center backdrop-blur-md"
          >
            <Heart
              color={curtido ? "#EF4444" : "#FFFFFF"}
              size={20}
              fill={curtido ? "#EF4444" : "transparent"}
            />
          </Pressable>
        </View>

        {mostrarFila ? (
          <View className="flex-1 my-6">
            <PainelFila aoFechar={() => setMostrarFila(false)} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 my-4"
            contentContainerStyle={{ alignItems: "center", justifyContent: "center", flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Capa Redonda do Álbum */}
            <CapaCircular tamanho={260} corGlow={corDinamica} />

            {/* Título e Artista */}
            <View className="items-center mt-8 px-4">
              <Text className="text-white text-2xl font-bold text-center tracking-wide" numberOfLines={1}>
                {musicaAtual.nome}
              </Text>
              <Text className="text-white/60 text-base mt-1 font-medium text-center" numberOfLines={1}>
                {musicaAtual.autorApelido ?? "Artista Desconhecido"}
              </Text>
            </View>

          </ScrollView>
        )}

        {/* Player Controls + Progresso */}
        <View className="w-full">
          <BarraProgressoLinha corDinamica={corDinamica} />

          <ControlesDesign
            tamanhoBotaoPrincipal={64}
            corDinamica={corDinamica}
            aoAlternarFila={() => setMostrarFila((v) => !v)}
            filaAtiva={mostrarFila}
          />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------
// Desktop Layout
// ---------------------------------------------------------------
function LayoutDesktop({ corDinamica }: { corDinamica: CorAnimada }) {
  const { musicaAtual } = usePlayerStore();
  const [curtido, setCurtido] = useState(false);

  if (!musicaAtual) return null;

  return (
    <View className="flex-1 bg-[#08080A] relative overflow-hidden items-center justify-center p-8">
      {/* Background desfoque estendido */}
      {musicaAtual.capaUrl && (
        <Image
          source={{ uri: musicaAtual.capaUrl }}
          className="absolute inset-0 w-full h-full opacity-30"
          blurRadius={70}
        />
      )}

      <View className="w-full max-w-5xl h-[680px] bg-black/50 border border-white/10 rounded-3xl overflow-hidden flex-row backdrop-blur-2xl">
        {/* Painel Esquerdo: Player */}
        <View className="flex-1 p-10 justify-between items-center border-r border-white/5">
          <View className="w-full flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <ArrowLeft color="#FFFFFF" size={20} />
            </Pressable>
            <Text className="text-white font-semibold">Tocando Agora</Text>
            <Pressable
              onPress={() => setCurtido((v) => !v)}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Heart
                color={curtido ? "#EF4444" : "#FFFFFF"}
                size={20}
                fill={curtido ? "#EF4444" : "transparent"}
              />
            </Pressable>
          </View>

          <CapaCircular tamanho={240} corGlow={corDinamica} />

          <View className="items-center w-full px-4">
            <Text className="text-white text-2xl font-bold text-center" numberOfLines={1}>
              {musicaAtual.nome}
            </Text>
            <Text className="text-white/60 text-base mt-1 text-center" numberOfLines={1}>
              {musicaAtual.autorApelido ?? "Artista Desconhecido"}
            </Text>
          </View>

          <View className="w-full">
            <BarraProgressoLinha corDinamica={corDinamica} />
            <ControlesDesign tamanhoBotaoPrincipal={64} corDinamica={corDinamica} />
          </View>
        </View>

        {/* Painel Direito: Fila de Reprodução */}
        <View className="flex-1 p-8 bg-black/20">
          <PainelFila />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------
// Capa Circular
// ---------------------------------------------------------------
function CapaCircular({ tamanho, corGlow }: { tamanho: number; corGlow: CorAnimada }) {
  const { musicaAtual } = usePlayerStore();
  if (!musicaAtual) return null;

  return (
    <View className="items-center justify-center relative">
      <Animated.View
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          shadowColor: corGlow as any,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 28,
          elevation: 15,
        }}
      >
        {musicaAtual.capaUrl ? (
          <Image
            source={{ uri: musicaAtual.capaUrl }}
            style={{ width: "100%", height: "100%", borderRadius:80 }}
          />
        ) : (
          <View
            style={{ width: "100%", height: "100%", borderRadius:80 }}
            className="bg-white/10 items-center justify-center"
          />
        )}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------
// Barra de Progresso em Linha Contínua
// ---------------------------------------------------------------
function BarraProgressoLinha({ corDinamica }: { corDinamica: CorAnimada }) {
  const { posicaoMs, duracaoMs, seek } = usePlayerStore();
  const [largura, setLargura] = useState(300);

  function aoTocarNaBarra(evento: GestureResponderEvent) {
    if (!duracaoMs || duracaoMs <= 0 || !isFinite(duracaoMs)) return;
    const nativeEvt = evento.nativeEvent as any;
    const x = nativeEvt.locationX ?? nativeEvt.offsetX ?? nativeEvt.layerX;
    if (typeof x !== "number" || !isFinite(x)) return;

    const larguraEfetiva = largura > 0 ? largura : 300;
    const fracao = Math.max(0, Math.min(1, x / larguraEfetiva));
    const tempoDestino = fracao * duracaoMs;

    if (isFinite(tempoDestino)) {
      seek(tempoDestino);
    }
  }

  const progresso =
    duracaoMs > 0 && isFinite(duracaoMs) && isFinite(posicaoMs)
      ? Math.max(0, Math.min(1, posicaoMs / duracaoMs))
      : 0;

  return (
    <View className="w-full my-2">
      <Pressable
        onPress={aoTocarNaBarra}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setLargura(w);
        }}
        className="h-6 justify-center"
      >
        <View className="h-1 w-full bg-white/20 rounded-full overflow-hidden relative">
          <Animated.View
            style={{
              height: "100%",
              width: `${progresso * 100}%`,
              backgroundColor: corDinamica as any,
              borderRadius: 999,
            }}
          />
        </View>

        {/* Indicador Redondo (Thumb) */}
        <Animated.View
          style={{
            position: "absolute",
            left: `${progresso * 100}%`,
            marginLeft: -6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: corDinamica as any,
          }}
        />
      </Pressable>

      <View className="flex-row justify-between mt-1">
        <Text className="text-white/50 text-xs font-medium">{formatarTempo(posicaoMs)}</Text>
        <Text className="text-white/50 text-xs font-medium">
          {formatarTempoRestante(posicaoMs, duracaoMs)}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------
// Controles de Mídia
// ---------------------------------------------------------------
function ControlesDesign({
  tamanhoBotaoPrincipal,
  corDinamica,
  aoAlternarFila,
  filaAtiva,
}: {
  tamanhoBotaoPrincipal: number;
  corDinamica: CorAnimada;
  aoAlternarFila?: () => void;
  filaAtiva?: boolean;
}) {
  const { estaTocando, fila, pausar, retomar, proxima, anterior } = usePlayerStore();
  const temFila = fila.length > 1;

  return (
    <View className="flex-row items-center justify-between mt-4">
      {/* Botão de Aleatório */}
      <Pressable className="p-2">
        <Shuffle color="#8E8E93" size={20} />
      </Pressable>

      {/* Anterior */}
      <Pressable
        onPress={anterior}
        disabled={!temFila}
        className="w-12 h-12 rounded-full bg-white/10 items-center justify-center active:opacity-80"
        style={{ opacity: temFila ? 1 : 0.4 }}
      >
        <SkipBack color="#FFFFFF" size={20} fill="#FFFFFF" />
      </Pressable>

      {/* Botão Play/Pause Neon Central */}
      <Animated.View
        style={{
          width: tamanhoBotaoPrincipal,
          height: tamanhoBotaoPrincipal,
          borderRadius: tamanhoBotaoPrincipal / 2,
          backgroundColor: corDinamica as any,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => (estaTocando ? pausar() : retomar())}
          className="w-full h-full items-center justify-center rounded-full"
        >
          {estaTocando ? (
            <Pause color="#000000" size={26} fill="#000000" />
          ) : (
            <Play color="#000000" size={26} fill="#000000" style={{ marginLeft: 3 }} />
          )}
        </Pressable>
      </Animated.View>

      {/* Próxima */}
      <Pressable
        onPress={proxima}
        disabled={!temFila}
        className="w-12 h-12 rounded-full bg-white/10 items-center justify-center active:opacity-80"
        style={{ opacity: temFila ? 1 : 0.4 }}
      >
        <SkipForward color="#FFFFFF" size={20} fill="#FFFFFF" />
      </Pressable>

      {/* Lista da Fila */}
      <Pressable onPress={aoAlternarFila} className="p-2">
        <ListMusic color={filaAtiva ? "#FFFFFF" : "#8E8E93"} size={20} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------
// Lista / Fila de Músicas
// ---------------------------------------------------------------
function PainelFila({ aoFechar }: { aoFechar?: () => void }) {
  const { fila, musicaAtual, tocarMusica } = usePlayerStore();

  return (
    <View className="flex-1 w-full">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white font-bold text-lg">Próximas Músicas</Text>
        {aoFechar && (
          <Pressable onPress={aoFechar}>
            <Text className="text-white/60 text-sm">Fechar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {fila.map((item) => {
          const ehAtual = item.id === musicaAtual?.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => tocarMusica(item, fila)}
              className={`flex-row items-center p-3 rounded-2xl mb-2 border ${
                ehAtual
                  ? "bg-white/15 border-white/20"
                  : "bg-white/5 border-transparent"
              }`}
            >
              {item.capaUrl ? (
                <Image source={{ uri: item.capaUrl }} className="w-12 h-12 rounded-full mr-3" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-white/10 mr-3" />
              )}
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className={`font-semibold text-base ${
                    ehAtual ? "text-white" : "text-white/80"
                  }`}
                >
                  {item.nome}
                </Text>
                <Text numberOfLines={1} className="text-white/50 text-xs mt-0.5">
                  {item.autorApelido ?? "Artista Desconhecido"}
                </Text>
              </View>
              {ehAtual && <Play color="#FFFFFF" size={16} fill="#FFFFFF" />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}