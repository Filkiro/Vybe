import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { X, Sparkles } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useAuthPromptStore } from "../store/authPromptStore";
import { AppLogo } from "./AppLogo";
import { colors } from "../constants/theme"; // Ajuste o caminho se necessário

export function AuthPromptModal() {
  const visivel = useAuthPromptStore((s) => s.visivel);
  const fechar = useAuthPromptStore((s) => s.fechar);

  function ir(aba: "cadastro" | "login") {
    fechar();
    router.push(`/(auth)/entrar?aba=${aba}`);
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      {/* Fundo escuro semitransparente que fecha ao clicar fora */}
      <Pressable onPress={fechar} className="flex-1 bg-black/80 items-center justify-center px-6">
        
        {/* Container que impede o clique de vazar para o fundo */}
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full">
          
          {/* Card de Vidro Fosco */}
          <BlurView 
          experimentalBlurMethod="dimezisBlurView"
            intensity={40} 
            tint="dark" 
            className="w-full rounded-[32px] p-8 items-center border border-white/10 overflow-hidden"
          >
            {/* Botão X no canto superior direito para usabilidade clássica */}
            <Pressable 
              onPress={fechar} 
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10"
            >
              <X color={colors.muted} size={18} />
            </Pressable>

            {/* Logo e Ícone de destaque */}
            <View className="mb-4 mt-2">
              <AppLogo />
            </View>
            
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles color="#3B82F6" size={20} />
              <Text className="text-xl font-bold text-textDark text-center">
                Faça parte do Vybe
              </Text>
            </View>

            <Text className="text-muted text-center mb-8 px-2 leading-relaxed">
              Crie sua conta para ouvir músicas sem limites, curtir lançamentos e conectar-se com outros músicos.
            </Text>

            {/* Ações */}
            <Pressable
              onPress={() => ir("cadastro")}
              className="bg-primary rounded-full py-4 items-center w-full mb-4"
              style={styles.buttonGlow}
            >
              <Text className="text-white font-bold text-base tracking-wide">Criar conta grátis</Text>
            </Pressable>

            <Pressable
              onPress={() => ir("login")}
              className="border border-white/20 bg-white/5 rounded-full py-4 items-center w-full mb-2"
            >
              <Text className="text-textDark font-medium text-base">Já tenho conta</Text>
            </Pressable>

            {/* Opção secundária bem sutil */}
            <Pressable onPress={fechar} className="mt-4 py-2 px-4 rounded-full active:bg-white/5">
              <Text className="text-muted text-sm font-medium">Continuar explorando</Text>
            </Pressable>
            
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
});