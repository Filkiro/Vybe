import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Home, Compass, Plus, User, ShieldCheck, Settings, MessageCircle } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "../../components/MiniPlayer";
import { AppHeader } from "../../components/AppHeader";
import { AnimatedBackgroundBlobs } from "../../components/AnimatedBackgroundBlobs";
import { useAuthStore, ehContaComum, ehModerador, ehAdministrador } from "../../store/authStore";
import { useUnreadStore } from "../../store/unreadStore";
import { colors } from "../../constants/theme";
import { TAB_BAR_CAPSULE_HEIGHT } from "../../constants/layout";

// Ícone de cada aba: quando ativa, ganha um "pill" preenchido com efeito neon glow estilo YouTube Music
function TabIcon({ Icone, focado }: { Icone: any; focado: boolean }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focado ? colors.primary : "transparent",
        shadowColor: focado ? "#3B82F6" : "transparent",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: focado ? 0.8 : 0,
        shadowRadius: 10,
        elevation: focado ? 8 : 0,
      }}
    >
      <Icone color={focado ? "#FFFFFF" : colors.muted} size={20} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const comum = ehContaComum(usuario);
  const moderacao = ehModerador(usuario);
  const admin = ehAdministrador(usuario);
  const naoLidas = useUnreadStore((state) => state.naoLidas);

  // Calcula margem inferior considerando safe areas (home indicator do iOS / gesture nav do Android)
  const bottomInset = Math.max(insets.bottom, 14);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B101E" }}>
      <AppHeader />

      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <Tabs
          initialRouteName="home"
          safeAreaInsets={{ bottom: 0 }}
          screenOptions={
            {
              headerShown: false,
              unmountOnBlur: true,
              tabBarActiveTintColor: "#3B82F6",
              sceneStyle: { backgroundColor: "#0B101E" },
              tabBarInactiveTintColor: colors.muted,
              tabBarShowLabel: false,
              tabBarIconStyle: {
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
              },
              tabBarItemStyle: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginTop: 0,
                marginBottom: 0,
                height: TAB_BAR_CAPSULE_HEIGHT,
                borderWidth: 0,
                // @ts-ignore
                outlineStyle: "none",
              },
              tabBarBackground: () => (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: TAB_BAR_CAPSULE_HEIGHT / 2,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.14)",
                    backgroundColor: "rgba(15, 22, 38, 0.75)",
                  }}
                >
                  <BlurView
                    experimentalBlurMethod="dimezisBlurView"
                    intensity={80}
                    tint="dark"
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              ),
              tabBarStyle: {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: bottomInset,
                width: "92%",
                maxWidth: 480,
                alignSelf: "center",
                marginHorizontal: "auto",
                height: TAB_BAR_CAPSULE_HEIGHT,
                borderRadius: TAB_BAR_CAPSULE_HEIGHT / 2,
                backgroundColor: "transparent",
                borderTopWidth: 0,
                elevation: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                paddingTop: 0,
                paddingBottom: 0,
              },
            } as any
          }
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Início",
              tabBarIcon: ({ focused }) => <TabIcon Icone={Home} focado={focused} />,
            }}
          />
          <Tabs.Screen
            name="explorar"
            options={{
              href: comum ? "/(tabs)/explorar" : null,
              title: "Explorar",
              tabBarIcon: ({ focused }) => <TabIcon Icone={Compass} focado={focused} />,
            }}
          />
          <Tabs.Screen
            name="criar"
            options={{
              href: comum ? "/(tabs)/criar" : null,
              title: "Criar",
              tabBarIcon: ({ focused }) => <TabIcon Icone={Plus} focado={focused} />,
            }}
          />
          <Tabs.Screen
            name="conversa"
            options={{
              href: comum ? "/(tabs)/conversa" : null,
              title: "Conversas",
              tabBarIcon: ({ focused }) => <TabIcon Icone={MessageCircle} focado={focused} />,
              tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
              tabBarBadgeStyle: {
                backgroundColor: colors.primary,
                color: "white",
                transform: [{ translateY: 2 }],
              },
            }}
          />
          <Tabs.Screen
            name="moderacao"
            options={{
              href: moderacao ? "/(tabs)/moderacao" : null,
              title: "Moderação",
              tabBarIcon: ({ focused }) => <TabIcon Icone={ShieldCheck} focado={focused} />,
            }}
          />
          <Tabs.Screen
            name="admin"
            options={{
              href: admin ? "/(tabs)/admin" : null,
              title: "Painel",
              tabBarIcon: ({ focused }) => <TabIcon Icone={Settings} focado={focused} />,
            }}
          />
          <Tabs.Screen
            name="perfil"
            options={{
              title: "Perfil",
                              // @ts-ignore
              unmountOnBlur: true,
              tabBarIcon: ({ focused }) => <TabIcon Icone={User} focado={focused} />,
            }}
          />
        </Tabs>
      </View>

      {/* MiniPlayer flutuante perfeitamente ancorado acima da bottom bar centralizada */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: TAB_BAR_CAPSULE_HEIGHT + bottomInset + 10,
          width: "92%",
          maxWidth: 480,
          alignSelf: "center",
          marginHorizontal: "auto",
        }}
        pointerEvents="box-none"
      >
        <MiniPlayer />
      </View>
    </View>
  );
}