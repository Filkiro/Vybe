import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, Text, Platform, UIManager, LayoutAnimation } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { useAuthStore, ehBanido } from "../store/authStore";
import { ContaBanidaOverlay } from "../components/ContaBanidaOverlay";
import { AuthPromptModal } from "../components/AuthPromptModal";
import { PerfilArtistaModal } from "../components/PerfilArtistaModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { UnreadMessagesListener } from "../components/UnreadMessagesListener";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { MiniPlayer } from "../components/MiniPlayer";
import { PlayerBarDesktop } from "../components/PlayerBarDesktop";
import { TAB_BAR_CAPSULE_HEIGHT } from "../constants/layout";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function GlobalPlayerWrapper() {
  const insets = useSafeAreaInsets();
  const ehDesktop = useEhDesktop();
  const segmentos = useSegments();

  const bottomInset = Math.max(insets.bottom, 14);
  const naTelaDeTabs = segmentos[0] === "(tabs)" && (segmentos.length as number) === 2;
  const telaTocandoAberta = segmentos.includes("tocando");
  const telaChatAberta = segmentos.includes("chat");

  const bottomPosition = naTelaDeTabs
    ? TAB_BAR_CAPSULE_HEIGHT + bottomInset + 10
    : bottomInset + 10;

  if (ehDesktop) {
    return <PlayerBarDesktop />;
  }

  if (telaTocandoAberta || telaChatAberta) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomPosition,
        width: "92%",
        maxWidth: 480,
        alignSelf: "center",
        marginHorizontal: "auto",
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      <MiniPlayer />
    </View>
  );
}

// Diz ao Expo Router que a rota "de verdade" da pilha raiz é o
// grupo (tabs), não o `index`. Sem isso, telas fora de (tabs)
// (dashboard, suporte, usuario/[id], album/[id], tocando, etc.)
// sintetizavam o histórico de navegação usando `index` como base —
// e como `index` só existe pra fazer <Redirect href="/(tabs)/home">,
// TODO botão de voltar acabava caindo no index, que redirecionava
// de novo pra Home na hora. Isso também é o motivo de `router.canGoBack()`
// retornar true mesmo nesses casos: tecnicamente existe uma tela
// anterior, só que ela é esse redirect fantasma.
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const inicializar = useAuthStore((s) => s.inicializar);
  const usuario = useAuthStore((s) => s.usuario);
  const carregando = useAuthStore((s) => s.carregando);
  const router = useRouter();
  const segmentos = useSegments();
  const restricaoAtiva = useAuthStore((s) => s.restricaoAtiva);
  const banido = ehBanido(usuario);


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
    {banido ? (
      <ContaBanidaOverlay motivo={restricaoAtiva?.motivo ?? null} />
    ) : (
      <>
        <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }} />
        <GlobalPlayerWrapper />
        <AuthPromptModal />
        <PerfilArtistaModal />
        <ConfirmModal />
        <UnreadMessagesListener />
      </>
    )}
  </SafeAreaProvider>
);
}