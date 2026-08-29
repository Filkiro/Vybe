import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { AppLogo } from "./AppLogo";
import { useAuthStore } from "../store/authStore";
import { colors } from "../constants/theme";

// Navbar fixa no topo, acima das Tabs — mora no (tabs)/_layout.tsx,
// então fica viva entre trocas de aba (mesma ideia do MiniPlayer:
// componente FORA da árvore de cada tela individual, sem re-montar).
//
// useSafeAreaInsets() troca o "pt-14 no olho" que cada tela tinha
// que replicar por conta própria por um valor real do dispositivo
// (notch, ilha dinâmica, etc.) — e como a navbar agora existe, as
// telas de dentro das abas não precisam mais desse padding.
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.primary,
      }}
      className="px-4 flex-row items-center justify-between "
    >
      <AppLogo />

      <View className="flex-row items-center gap-2">
        {/* Pesquisa por apelido/perfil, música ou álbum — antes vivia
            dentro da aba Explorar, agora é tela própria acessada por
            aqui, deixando o Explorar só com o feed de publicações. */}
        <Pressable onPress={() => router.push("/pesquisa")} hitSlop={10} className="p-2">
          <Search color="#fff" size={22} />
        </Pressable>

        {/* Quem não está logado vê o convite pra criar conta direto na
            navbar — a Home é pública, então esse botão é o principal
            caminho de cadastro pra quem só está passeando pelo app. */}
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
  );
}
