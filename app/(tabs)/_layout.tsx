import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Home, Compass, Plus, User, ShieldCheck, Settings, MessageCircle } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { MiniPlayer } from "../../components/MiniPlayer";
import { AppHeader } from "../../components/AppHeader";
import { useSegments } from "expo-router";
import { useAuthStore, ehContaComum, ehModerador, ehAdministrador } from "../../store/authStore";
import { useUnreadStore } from "../../store/unreadStore";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../constants/theme";
import { TAB_BAR_HEIGHT } from "../../constants/layout";

export default function TabsLayout() {
  const usuario = useAuthStore((s) => s.usuario);
  const comum = ehContaComum(usuario);
  const moderacao = ehModerador(usuario);
  const admin = ehAdministrador(usuario);
  const naoLidas = useUnreadStore((state) => state.naoLidas);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B101E' }}>
      {/* Brilho fixo no topo — atrás do header e do início do conteúdo, sempre no mesmo lugar */}
<View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420, overflow: "hidden" }} pointerEvents="none">
  <View style={{ position: "absolute", top: -100, left: -80, width: 340, height: 340, borderRadius: 170, backgroundColor: "rgba(59,130,246,0.75)" }} />
  <View style={{ position: "absolute", top: -40, right: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(99,102,241,0.6)" }} />
  <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
    <LinearGradient
    colors={["transparent", "transparent", "#0B101E"]}
    locations={[0, 0.4, 1]}
    style={StyleSheet.absoluteFillObject}
  />
</View>

      <AppHeader />
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>   
      <Tabs 
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3B82F6',
   sceneStyle: { backgroundColor: "#0B101E" },
          tabBarInactiveTintColor: colors.muted,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 2,
            marginBottom: 2,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarBackground: () => (
            <BlurView
              experimentalBlurMethod="dimezisBlurView"
              intensity={60}
              tint="dark"
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopWidth: 1,
                borderTopColor: 'rgba(21, 59, 211, 0.05)',
              }}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            height: TAB_BAR_HEIGHT,
            paddingBottom: 4,
            paddingTop: 4,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: "Início", tabBarIcon: ({ color }) => <Home color={color} size={20} /> }}
        />
        <Tabs.Screen
          name="explorar"
          options={{
            href: comum ? "/(tabs)/explorar" : null,
            title: "Explorar",
            tabBarIcon: ({ color }) => <Compass color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="criar"
          options={{
            href: comum ? "/(tabs)/criar" : null,
            title: "Criar",
            tabBarIcon: ({ color }) => <Plus color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="conversa"
          options={{
            href: comum ? "/(tabs)/conversa" : null,
            title: "Conversas",
            tabBarIcon: ({ color }) => <MessageCircle color={color} size={20} />,
            tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: "white" },
          }}
        />
        <Tabs.Screen
          name="moderacao"
          options={{
            href: moderacao ? "/(tabs)/moderacao" : null,
            title: "Moderação",
            tabBarIcon: ({ color }) => <ShieldCheck color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            href: admin ? "/(tabs)/admin" : null,
            title: "Painel",
            tabBarIcon: ({ color }) => <Settings color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{ title: "Perfil", tabBarIcon: ({ color }) => <User color={color} size={20} /> }}
        />
      </Tabs>
</View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: TAB_BAR_HEIGHT, paddingBottom: 8 }}>
        <MiniPlayer />
      </View>
    </View>
  );
}