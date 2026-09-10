import React, { useEffect } from "react";
import { View, StyleSheet, DimensionValue, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface AnimatedBackgroundBlobsProps {
  height?: DimensionValue;
}

export function AnimatedBackgroundBlobs({ height = 520 }: AnimatedBackgroundBlobsProps) {
  // Shared values com movimentos mais fluidos e orgânicos
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
    // Curva Easing suave para animações contínuas estilo fluido
    const easingConfig = Easing.bezier(0.42, 0, 0.58, 1);

    // Blob 1: Azul Cyan Neon (#00F0FF) - Canto Superior Esquerdo
    blob1X.value = withRepeat(
      withSequence(
        withTiming(70, { duration: 9000, easing: easingConfig }),
        withTiming(-50, { duration: 11000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(80, { duration: 10000, easing: easingConfig }),
        withTiming(-40, { duration: 8500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob1Scale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 7500, easing: easingConfig }),
        withTiming(0.85, { duration: 8000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );

    // Blob 2: Violeta / Púrpura Royal (#8B5CF6) - Topo Direita
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-80, { duration: 10000, easing: easingConfig }),
        withTiming(40, { duration: 9000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 8500, easing: easingConfig }),
        withTiming(-60, { duration: 11500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob2Scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 8000, easing: easingConfig }),
        withTiming(0.9, { duration: 9500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );

    // Blob 3: Azul Ultramarine (#3B82F6) - Centro / Baixo Direita
    blob3X.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 11000, easing: easingConfig }),
        withTiming(-70, { duration: 9500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob3Y.value = withRepeat(
      withSequence(
        withTiming(-70, { duration: 8000, easing: easingConfig }),
        withTiming(90, { duration: 10500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob3Scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 9000, easing: easingConfig }),
        withTiming(0.8, { duration: 8500, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );

    // Blob 4: Magenta Deep Glow (#EC4899) - Centro / Esquerda
    blob4X.value = withRepeat(
      withSequence(
        withTiming(-60, { duration: 9500, easing: easingConfig }),
        withTiming(70, { duration: 12000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob4Y.value = withRepeat(
      withSequence(
        withTiming(-50, { duration: 10500, easing: easingConfig }),
        withTiming(70, { duration: 8000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    blob4Scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 7500, easing: easingConfig }),
        withTiming(0.85, { duration: 9000, easing: easingConfig })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.Never
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
      {/* Container das Blobs */}
      <View style={styles.container}>
        {/* Blob 1: Cyan Neon */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: -100,
              left: -80,
              width: 360,
              height: 360,
              borderRadius: 180,
              backgroundColor: "rgba(6, 182, 212, 0.65)",
              shadowColor: "#06B6D4",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 40,
            },
            animatedStyle1,
          ]}
        />

        {/* Blob 2: Violeta Royal */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: -60,
              right: -90,
              width: 380,
              height: 380,
              borderRadius: 190,
              backgroundColor: "rgba(139, 92, 246, 0.6)",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 50,
            },
            animatedStyle2,
          ]}
        />

        {/* Blob 3: Azul Ultramarine */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: 160,
              right: -40,
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: "rgba(59, 130, 246, 0.55)",
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 45,
            },
            animatedStyle3,
          ]}
        />

        {/* Blob 4: Magenta Ambient Glow */}
        <Animated.View
          style={[
            styles.blob,
            {
              top: 200,
              left: -90,
              width: 340,
              height: 340,
              borderRadius: 170,
              backgroundColor: "rgba(236, 72, 153, 0.35)",
              shadowColor: "#EC4899",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 50,
            },
            animatedStyle4,
          ]}
        />
      </View>

      {/* Camada de Blur estilo Glassmorphism */}
      <BlurView
        intensity={Platform.OS === "ios" ? 90 : 70}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      {/* Transição ultra-suave com gradiente de 5 stops para o fundo sólido #0B101E */}
      <LinearGradient
        colors={[
          "rgba(11, 16, 30, 0.05)",
          "rgba(11, 16, 30, 0.25)",
          "rgba(11, 16, 30, 0.65)",
          "rgba(11, 16, 30, 0.92)",
          "#0B101E",
        ]}
        locations={[0, 0.35, 0.65, 0.88, 1]}
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
    zIndex: -1,
    backfaceVisibility: "hidden",
    ...(Platform.OS === "web" && {
      transform: "translateZ(0)",
    }),
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
  },
});