import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  GestureResponderEvent,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import {
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  ListMusic,
} from "lucide-react-native";
import ImageColors from "react-native-image-colors";
import { usePlayerStore } from "../../store/playerStore";

export type CorAnimada = Animated.AnimatedInterpolation<string | number>;

export function formatarTempo(ms: number) {
  if (!ms || ms < 0 || !isFinite(ms)) return "0:00";
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

export function formatarTempoRestante(posicaoMs: number, duracaoMs: number) {
  const restanteMs = Math.max(0, duracaoMs - posicaoMs);
  return `-${formatarTempo(restanteMs)}`;
}

// --- Hook: extrai a cor dominante da capa e anima a transição entre cores ---
export function useCorDinamica() {
  const { musicaAtual } = usePlayerStore();
  const corAnimada = useRef(new Animated.Value(0)).current;
  const [corAtual, setCorAtual] = useState<string>("#CCFF00");
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

  return corAnimada.interpolate({
    inputRange: [0, 1],
    outputRange: [corAnterior, corAtual],
  }) as CorAnimada;
}

// ---------------------------------------------------------------
// Capa Circular
// ---------------------------------------------------------------
export function CapaCircular({ tamanho, corGlow }: { tamanho: number; corGlow: CorAnimada }) {
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
            style={{ width: "100%", height: "100%", borderRadius: 60}}
          />
        ) : (
          <View
            style={{ width: "100%", height: "100%", borderRadius: tamanho / 2 }}
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
export function BarraProgressoLinha({ corDinamica }: { corDinamica: CorAnimada }) {
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
export function ControlesDesign({
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
      <Pressable className="p-2">
        <Shuffle color="#8E8E93" size={20} />
      </Pressable>

      <Pressable
        onPress={anterior}
        disabled={!temFila}
        className="w-12 h-12 rounded-full bg-white/10 items-center justify-center active:opacity-80"
        style={{ opacity: temFila ? 1 : 0.4 }}
      >
        <SkipBack color="#FFFFFF" size={20} fill="#FFFFFF" />
      </Pressable>

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

      <Pressable
        onPress={proxima}
        disabled={!temFila}
        className="w-12 h-12 rounded-full bg-white/10 items-center justify-center active:opacity-80"
        style={{ opacity: temFila ? 1 : 0.4 }}
      >
        <SkipForward color="#FFFFFF" size={20} fill="#FFFFFF" />
      </Pressable>

      <Pressable onPress={aoAlternarFila} className="p-2">
        <ListMusic color={filaAtiva ? "#FFFFFF" : "#8E8E93"} size={20} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------
// Botão de curtir — extraído porque a sidebar precisa dele isolado no header
// ---------------------------------------------------------------
export function BotaoCurtir({ curtido, onPress }: { curtido: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
    >
      <Heart color={curtido ? "#EF4444" : "#FFFFFF"} size={20} fill={curtido ? "#EF4444" : "transparent"} />
    </Pressable>
  );
}

// ---------------------------------------------------------------
// Lista / Fila de Músicas
// ---------------------------------------------------------------
export function PainelFila({ aoFechar }: { aoFechar?: () => void }) {
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
                ehAtual ? "bg-white/15 border-white/20" : "bg-white/5 border-transparent"
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
                  className={`font-semibold text-base ${ehAtual ? "text-white" : "text-white/80"}`}
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
