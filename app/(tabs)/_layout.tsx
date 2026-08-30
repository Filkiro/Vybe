import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Home, Compass, Plus, User, ShieldCheck, Settings, MessageCircle } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { MiniPlayer } from "../../components/MiniPlayer";
import { AppHeader } from "../../components/AppHeader";
import { useAuthStore, ehContaComum, ehModerador, ehAdministrador } from "../../store/authStore";
import { useUnreadStore } from "../../store/unreadStore";
import { colors } from "../../constants/theme";
import { TAB_BAR_HEIGHT } from "../../constants/layout";

export default function TabsLayout() {
  const usuario = useAuthStore((s) => s.usuario);

  const comum = ehContaComum(usuario);
  const moderacao = ehModerador(usuario);
  const admin = ehAdministrador(usuario);
const naoLidas = useUnreadStore((state) => state.naoLidas);
  return (
    
    <View  style={{ flex: 1, backgroundColor: '#0B101E', }}>
      <AppHeader />
<Tabs
initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3B82F6', // Azul vibrante
          tabBarInactiveTintColor: colors.muted,
          
          // Mantém os textos ativados embaixo dos ícones
          tabBarShowLabel: true,

          // 👇 A mágica acontece aqui: força o texto para baixo do ícone
          tabBarLabelPosition: 'below-icon',

          // Estilo compacto para o texto alinhar perfeitamente embaixo do ícone
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 2,
            marginBottom: 2,
          },

          tabBarItemStyle: {
            paddingVertical: 4,
            justifyContent: 'center', // Garante o alinhamento central
            alignItems: 'center',
          },

          // Renderiza o vidro fosco por trás dos ícones
          tabBarBackground: () => (
            <BlurView 
            experimentalBlurMethod="dimezisBlurView"
              intensity={80} 
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

        {/* Telas de contas comuns (Músico/Organizador) */}
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
            // Balãozinho azul com o número de mensagens não lidas —
            // some sozinho quando naoLidas volta a 0 (undefined
            // esconde o badge). Acima de 9 mostra "9+" pra não
            // estourar o círculo.
tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: "white" },
          }}
        />

        {/* Telas exclusivas da equipe (Moderador/Administrador) */}
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

        {/* Perfil */}
        <Tabs.Screen
          name="perfil"
          options={{ title: "Perfil", tabBarIcon: ({ color }) => <User color={color} size={20} /> }}
        />
      </Tabs>

      {/* O MiniPlayer flutua perfeitamente acima da barra ajustada */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: TAB_BAR_HEIGHT, paddingBottom: 8 }}>
        <MiniPlayer />
      </View>
    </View>
  );
}