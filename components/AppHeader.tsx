import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import { Search } from "lucide-react-native";
import { AppLogo } from "./AppLogo";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

const titulosAbas: Record<string, string> = {
  explorar: "Explorar",
  criar: "Criar",
  conversa: "Conversas",
  moderacao: "Moderação",
  admin: "Painel",
  perfil: "Perfil",
};

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const segments = useSegments();

  const abaAtual = segments[segments.length - 1];
  const ehHome = abaAtual === "home" || !abaAtual;
  const tituloPagina = titulosAbas[abaAtual];

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.primary,
      }}
    >
      {/* Container interno com altura fixa (h-14) para o header nunca encolher */}
      <View className="px-4 h-14 flex-row items-center justify-between p-8">
        {ehHome ? (
          <AppLogo />
        ) : (
          <Text className="text-white font-bold text-xl tracking-wide">
            {tituloPagina || ""}
          </Text>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.push("/pesquisa")} hitSlop={10} className="p-2">
            <Search color="#fff" size={22} />
          </Pressable>

          {!usuario && (
            <Pressable
              onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
              className="bg-white/15 rounded-full px-4 py-2"
            >
              <Text className="text-white font-semibold text-sm">Cadastrar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}