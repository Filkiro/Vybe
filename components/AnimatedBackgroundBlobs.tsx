import React, { useEffect } from "react";
import { View, StyleSheet, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface AnimatedBackgroundBlobsProps {
  height?: DimensionValue;
}

export function AnimatedBackgroundBlobs({ height = 480 }: AnimatedBackgroundBlobsProps) {
  // Shared values para movimentos, tamanhos e opacidades orgânicas (estilo YouTube Music)
  const blob1X = useSharedValue(0);
  const blob1Y = useSharedValue(0);
  const blob1Scale = useSharedValue(1);

  const blob2X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob2Scale = useSharedValue(1);

  const blob3X = useSharedValue(0);
  const blob3Y = useSharedValue(0);
  const blob3Scale = useSharedValue(1);

  const blob4X = useSharedValue(0);
  const blob4Y = useSharedValue(0);
  const blob4Scale = useSharedValue(1);

  useEffect(() => {
    // Blob 1: Azul Elétrico (#3B82F6) - Topo Esquerda / Centro
    blob1X.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-40, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(70, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-30, { duration: 7500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob1Scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 6500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Blob 2: Índigo / Violeta (#6366F1) - Topo Direita
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-70, { duration: 8500, easing: Easing.inOut(Easing.quad) }),
        withTiming(30, { duration: 7000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 7500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-50, { duration: 9500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob2Scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.9, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Blob 3: Ciano Neon (#06B6D4) - Centro / Direita
    blob3X.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 9500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-60, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob3Y.value = withRepeat(
      withSequence(
        withTiming(-60, { duration: 6500, easing: Easing.inOut(Easing.quad) }),
        withTiming(80, { duration: 8500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob3Scale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.8, { duration: 7000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Blob 4: Púrpura Ambient (#8B5CF6) - Meio / Baixo
    blob4X.value = withRepeat(
      withSequence(
        withTiming(-50, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(60, { duration: 10000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob4Y.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(60, { duration: 7000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    blob4Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 6500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 8500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob1X.value },
      { translateY: blob1Y.value },
      { scale: blob1Scale.value },
    ],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob2X.value },
      { translateY: blob2Y.value },
      { scale: blob2Scale.value },
    ],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob3X.value },
      { translateY: blob3Y.value },
      { scale: blob3Scale.value },
    ],
  }));

  const animatedStyle4 = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob4X.value },
      { translateY: blob4Y.value },
      { scale: blob4Scale.value },
    ],
  }));

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="none">
      {/* Container de Blobs Animadas */}
      <View style={styles.container}>
        {/* Blob 1: Azul Elétrico */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: -80,
              left: -60,
              width: 340,
              height: 340,
              borderRadius: 170,
              backgroundColor: "rgba(59, 130, 246, 0.75)",
            },
            animatedStyle1,
          ]}
        />

        {/* Blob 2: Índigo */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: -40,
              right: -70,
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: "rgba(99, 102, 241, 0.65)",
            },
            animatedStyle2,
          ]}
        />

        {/* Blob 3: Ciano Neon */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: 140,
              right: -50,
              width: 290,
              height: 290,
              borderRadius: 145,
              backgroundColor: "rgba(6, 182, 212, 0.55)",
            },
            animatedStyle3,
          ]}
        />

        {/* Blob 4: Púrpura Ambient */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: 220,
              left: -80,
              width: 350,
              height: 350,
              borderRadius: 175,
              backgroundColor: "rgba(139, 92, 246, 0.5)",
            },
            animatedStyle4,
          ]}
        />
      </View>

      {/* Camada de Blur estilo Glassmorphism YouTube Music */}
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject} />

      {/* Gradiente que suaviza a transição para a cor sólida #0B101E na borda inferior */}
      <LinearGradient
        colors={["rgba(11, 16, 30, 0.1)", "rgba(11, 16, 30, 0.5)", "#0B101E"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
  },
});
