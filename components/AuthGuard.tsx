import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles?: string[]
) {
  return function ProtectedRoute(props: P) {
    const { usuario, carregando } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (carregando) return;

      if (!usuario) {
        router.replace("/(tabs)/home");
        return;
      }

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(usuario.tipo_conta)) {
          router.replace("/(tabs)/home");
        }
      }
    }, [usuario, carregando]);

    if (carregando) {
      return (
        <View className="flex-1 bg-[#0B101E] items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!usuario) return null;
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(usuario.tipo_conta)) return null;

    return <WrappedComponent {...props} />;
  };
}
