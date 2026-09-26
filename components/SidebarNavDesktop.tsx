import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Home, Compass, Plus, MessageCircle, ShieldCheck, Settings, User, LogOut } from "lucide-react-native";
import { AppLogo } from "./AppLogo";
import { supabase } from "../lib/supabase";
import { useAuthStore, ehContaComum, ehModerador, ehAdministrador } from "../store/authStore";
import { useUnreadStore } from "../store/unreadStore";
import { usePlayerStore } from "../store/playerStore";

type ItemNav = {
  rota: string;
  rotulo: string;
  Icone: any;
  badge?: number;
};

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
        paddingTop: Math.max(insets.top, 24),
        paddingBottom: 96, // espaço para o player
      }}
      className="bg-transparent flex-col justify-between h-full relative"
    >
      {/* Top Section */}
      <View className="flex-col gap-10 px-4">
        {/* Logo */}
        <View className="items-center mt-2 w-full pr-8">
          <AppLogo />
        </View>

        {/* Nav Items */}
        <View className="flex-col gap-1">
          {itens.map((item) => {
            const ativo = pathname === item.rota || pathname.endsWith(item.rota.replace("/(tabs)", ""));
            return (
              <Pressable
                key={item.rota}
                onPress={() => router.push(item.rota as any)}
                className={`flex-row items-center gap-4 px-4 py-2.5 rounded-lg transition-all ${
                  ativo ? "bg-[#2563EB]" : "hover:bg-white/5 active:opacity-80"
                }`}
                style={ativo ? { shadowColor: "#2563EB", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 24 } : undefined}
              >
                <item.Icone color={ativo ? "#EEEFFF" : "#C3C6D7"} size={20} />
                <Text
                  className={`text-sm flex-1 ${ativo ? "font-medium text-[#EEEFFF]" : "text-[#C3C6D7]"}`}
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
      </View>

      {/* Bottom Section */}
      <View className="px-4 mb-4">
        {usuario && (
          <Pressable
            onPress={handleSair}
            className="flex-row items-center gap-4 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-300 transition-all active:opacity-80 group"
          >
            <LogOut size={20} color="#C3C6D7" className="group-hover:text-red-300" />
            <Text className="text-sm text-[#C3C6D7] group-hover:text-red-300 transition-colors">Sair</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
