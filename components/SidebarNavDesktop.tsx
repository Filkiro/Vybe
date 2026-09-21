import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Home, Compass, Plus, MessageCircle, ShieldCheck, Settings, User, LogOut } from "lucide-react-native";
import { AppLogo } from "./AppLogo";
import { supabase } from "../lib/supabase";
import { useAuthStore, ehContaComum, ehModerador, ehAdministrador } from "../store/authStore";
import { useUnreadStore } from "../store/unreadStore";
import { usePlayerStore } from "../store/playerStore";
import { colors } from "../constants/theme";

type ItemNav = {
  rota: string;
  rotulo: string;
  Icone: any;
  badge?: number;
};

// Mesma navegação das abas mobile (app/(tabs)/_layout.tsx), só que em
// formato de lista vertical fixa — a existência das rotas e as regras de
// quem pode ver cada uma (comum/moderador/admin) são exatamente as mesmas.
export function SidebarNavDesktop() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const comum = ehContaComum(usuario);
  const moderacao = ehModerador(usuario);
  const admin = ehAdministrador(usuario);
  const naoLidas = useUnreadStore((s) => s.naoLidas);
  const pathname = usePathname();

  const itens: ItemNav[] = [
    { rota: "/(tabs)/home", rotulo: "Início", Icone: Home },
    ...(comum ? [{ rota: "/(tabs)/explorar", rotulo: "Explorar", Icone: Compass }] : []),
    ...(comum ? [{ rota: "/(tabs)/criar", rotulo: "Criar", Icone: Plus }] : []),
    ...(comum
      ? [{ rota: "/(tabs)/conversa", rotulo: "Conversas", Icone: MessageCircle, badge: naoLidas }]
      : []),
    ...(moderacao ? [{ rota: "/(tabs)/moderacao", rotulo: "Moderação", Icone: ShieldCheck }] : []),
    ...(admin ? [{ rota: "/(tabs)/admin", rotulo: "Painel", Icone: Settings }] : []),
    { rota: "/(tabs)/perfil", rotulo: "Perfil", Icone: User },
  ];

  async function handleSair() {
    usePlayerStore.getState().resetar();
    await supabase.auth.signOut();
    router.replace("/(tabs)/home");
  }

  return (
    <View
      style={{
        width: 240,
        paddingTop: Math.max(insets.top, 14),
        paddingBottom: Math.max(insets.bottom, 14),
        paddingLeft: 14,
        paddingRight: 6,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 28,
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

        <View className="flex-1 px-4 py-5">
          <View className="items-center">
            <AppLogo />
          </View>

          <View className="gap-1">
            {itens.map((item) => {
              const ativo = pathname === item.rota || pathname.endsWith(item.rota.replace("/(tabs)", ""));
              return (
                <Pressable
                  key={item.rota}
                  onPress={() => router.push(item.rota as any)}
                  className="flex-row items-center gap-3 px-3 py-3 rounded-2xl active:opacity-80"
                  style={{ backgroundColor: ativo ? colors.primary : "transparent" }}
                >
                  <item.Icone color={ativo ? "#FFFFFF" : colors.muted} size={20} />
                  <Text
                    className="text-sm font-semibold flex-1"
                    style={{ color: ativo ? "#FFFFFF" : colors.muted }}
                  >
                    {item.rotulo}
                  </Text>
                  {!!item.badge && (
                    <View className="bg-white/90 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
                      <Text className="text-[#0B101E] text-xs font-bold">{item.badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View className="flex-1" />

          {usuario && (
            <Pressable
              onPress={handleSair}
              className="flex-row items-center gap-3 px-3 py-3 rounded-2xl active:opacity-80"
            >
              <LogOut color={colors.muted} size={20} />
              <Text className="text-muted text-sm font-semibold">Sair</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
