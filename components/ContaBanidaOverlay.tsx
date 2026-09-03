import { View, Text, Pressable } from "react-native";
import { Ban } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { colors } from "../constants/theme";

export function ContaBanidaOverlay({ motivo }: { motivo: string | null }) {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-5">
        <Ban color={colors.danger} size={30} />
      </View>
      <Text className="text-2xl font-bold text-textDark text-center mb-3">
        Conta banida
      </Text>
      <Text className="text-muted text-center mb-2 leading-relaxed">
        Sua conta foi banida da plataforma e você não pode mais utilizar o Vybe.
      </Text>
      {motivo && (
        <View className="bg-card border border-border rounded-2xl px-4 py-3 mt-3 mb-6 w-full">
          <Text className="text-xs text-muted mb-1 font-semibold">Motivo</Text>
          <Text className="text-textDark text-sm">{motivo}</Text>
        </View>
      )}
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="border border-border rounded-full py-3 px-8"
      >
        <Text className="text-textDark font-medium">Sair da conta</Text>
      </Pressable>
    </View>
  );
}