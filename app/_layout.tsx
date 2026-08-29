import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { useAuthStore } from "../store/authStore";
import { AuthPromptModal } from "../components/AuthPromptModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { UnreadMessagesListener } from "../components/UnreadMessagesListener";

export default function RootLayout() {
  const inicializar = useAuthStore((s) => s.inicializar);
  const usuario = useAuthStore((s) => s.usuario);
  const carregando = useAuthStore((s) => s.carregando);
  const router = useRouter();
  const segmentos = useSegments();

  useEffect(() => {
    inicializar();
  }, []);

  // IMPORTANTE: a Home agora é pública — quem não está logado pode
  // navegar pelo app livremente (ver músicas, álbuns, perfis). Por
  // isso NÃO existe mais o redirect automático "!usuario -> (auth)".
  // Cada ação que exige conta (tocar música, contatar alguém, criar
  // conteúdo) usa o `useRequireAuth()` pra abrir o card de
  // cadastro/login na hora, em vez de trancar o app inteiro atrás
  // de login. A única coisa que ainda redirecionamos automaticamente
  // é tirar quem JÁ está logado de dentro da tela de auth.
  useEffect(() => {
    if (carregando) return;

    const dentroDeAuth = segmentos[0] === "(auth)";

    if (usuario && dentroDeAuth) {
      router.replace("/(tabs)/home");
    }
  }, [usuario, carregando, segmentos]);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
      <AuthPromptModal />
      <ConfirmModal />
      <UnreadMessagesListener />
    </SafeAreaProvider>
  );
}
