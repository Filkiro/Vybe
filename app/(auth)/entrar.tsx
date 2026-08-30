import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { X, Mail, Lock, User, AtSign, Sparkles } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { AppLogo } from "../../components/AppLogo";
import { colors } from "../../constants/theme";
import Animated from 'react-native-reanimated';


export default function AuthScreen() {
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string }>();
  const [aba, setAba] = useState<"cadastro" | "login">(abaParam === "login" ? "login" : "cadastro");

  function fechar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  }

  return (
    <View className="flex-1 bg-[#0B101E]">
      {/* Botão de Fechar Premium - área de toque maior que o círculo visível,
          pra não precisar acertar em cima do ícone com precisão */}
      <AnimatedPressable
        onPress={fechar}
        hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
        className="absolute top-8 right-8 w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center z-20"
      >
        <X color={colors.textDark} size={20} />
      </AnimatedPressable>

      {/* Área da Logo e Boas-vindas (Centralizada no espaço superior) */}
      <View className="flex-[0.5] items-center justify-center w-full px-6 min-h-[220px]">
        <AppLogo tamanho="grande" />
        
        {/* Título dinâmico que muda dependendo da aba selecionada */}
        <Text className="text-white text-3xl font-bold mt-6 tracking-wide text-center">
          {aba === "cadastro" ? "Comece no Vybe" : "Bem-vindo de volta"}
        </Text>
        
        <Text className="text-muted text-base mt-2 text-center max-w-md">
          A plataforma definitiva para conectar músicos, organizadores e o público.
        </Text>
      </View>

      {/* Container do Formulário (Estilo Bottom Sheet) */}
      <View className="flex-1 bg-[#121827] rounded-t-[40px] px-8 pt-8 border-t border-white/5 shadow-2xl">
        
        {/* Abas de Navegação */}
        <View className="flex-row mb-8 justify-start">
          <AbaBotao label="Criar Conta" ativa={aba === "cadastro"} onPress={() => setAba("cadastro")} />
          <AbaBotao label="Entrar" ativa={aba === "login"} onPress={() => setAba("login")} />
        </View>

        {aba === "cadastro" ? <FormCadastro /> : <FormLogin />}
      </View>
    </View>
  );
}
// --- COMPONENTES VISUAIS ---

function AbaBotao({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mr-8 items-center">
      <Text className={`text-xl transition-all ${ativa ? "font-bold text-textDark" : "font-medium text-muted"}`}>
        {label}
      </Text>
      {ativa && (
        <View className="h-1 bg-primary rounded-full mt-2 w-full" style={styles.glowLine} />
      )}
    </Pressable>
  );
}

// Campo de texto modernizado com suporte a ícones da Lucide
function Campo({ icone: Icon, ...props }: React.ComponentProps<typeof TextInput> & { icone?: any }) {
  return (
    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-14 mb-4 focus:border-primary/50 transition-colors">
      {Icon && <Icon color="#9CA3AF" size={20} />}
      <TextInput
        placeholderTextColor="#6B7280"
        className="flex-1 ml-3 text-base text-textDark"
        {...props}
      />
    </View>
  );
}

// --- FORMULÁRIOS ---

function FormCadastro() {
  const [tipoConta, setTipoConta] = useState<"musico" | "organizador">("musico");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const cadastrar = useAuthStore((s) => s.cadastrar);

  async function handleCadastrar() {
    setErro(null);

    if (!nome || !email || !senha || (tipoConta === "musico" && !apelido)) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const { error } = await cadastrar({ nome, apelido, email, senha, tipoConta });
    setCarregando(false);

    if (error) {
      setErro(error);
      return;
    }
    router.replace("/(tabs)/home");
  }
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Seletor de Conta (Segmented Control) */}
      <View className="flex-row mb-6 bg-white/5 rounded-2xl p-1 border border-white/5">
        <AnimatedPressable
          onPress={() => setTipoConta("musico")}
          className={`flex-1 py-3 rounded-xl items-center ${tipoConta === "musico" ? "bg-primary shadow-sm" : ""}`}
        >
          <Text className={`font-medium ${tipoConta === "musico" ? "text-white" : "text-muted"}`}>
            Sou Músico
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => setTipoConta("organizador")}
          className={`flex-1 py-3 rounded-xl items-center ${tipoConta === "organizador" ? "bg-primary shadow-sm" : ""}`}
        >
          <Text className={`font-medium ${tipoConta === "organizador" ? "text-white" : "text-muted"}`}>
            Sou Organizador
          </Text>
        </AnimatedPressable>
      </View>

      <Campo icone={User} placeholder="Nome completo" value={nome} onChangeText={setNome} />
      
      {tipoConta === "musico" && (
        <Campo icone={AtSign} placeholder="Nome artístico / Apelido" value={apelido} onChangeText={setApelido} />
      )}
      
      <Campo icone={Mail} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Campo icone={Lock} placeholder="Criar senha" value={senha} onChangeText={setSenha} secureTextEntry />
      <Campo icone={Lock} placeholder="Confirmar senha" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />

      {erro && <Text className="text-red-400 mb-4 text-center font-medium">{erro}</Text>}

      <Pressable
        onPress={handleCadastrar}
        disabled={carregando}
        className="bg-primary rounded-2xl py-4 items-center mt-2 mb-6"
        style={styles.buttonGlow}
      >
        <Text className="text-white font-bold text-base tracking-wide">
          {carregando ? "Criando conta..." : "Criar minha conta"}
        </Text>
      </Pressable>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-[1px] bg-white/10" />
        <Text className="text-muted px-4 text-sm font-medium">Ou continue com</Text>
        <View className="flex-1 h-[1px] bg-white/10" />
      </View>

      <Pressable className="bg-white/5 border border-white/10 rounded-2xl py-4 flex-row justify-center items-center">
        {/* Você pode substituir este ícone pela logo real do Google no futuro */}
        <Sparkles color={colors.textDark} size={18} className="mr-3" />
        <Text className="text-textDark font-medium text-base">Google</Text>
      </Pressable>
    </ScrollView>
  );
}

function FormLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const entrar = useAuthStore((s) => s.entrar);

  async function handleEntrar() {
    setErro(null);
    if (!email || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    setCarregando(true);
    const { error } = await entrar(email, senha);
    setCarregando(false);

    if (error) {
      setErro(error);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Campo icone={Mail} placeholder="Seu e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Campo icone={Lock} placeholder="Sua senha" value={senha} onChangeText={setSenha} secureTextEntry />

      {erro && <Text className="text-red-400 mb-4 text-center font-medium">{erro}</Text>}

      <Pressable className="self-end mb-8 mt-2">
        <Text className="text-primaryLight text-sm font-medium">Esqueceu a senha?</Text>
      </Pressable>

      <Pressable
        onPress={handleEntrar}
        disabled={carregando}
        className="bg-primary rounded-2xl py-4 items-center mb-6"
        style={styles.buttonGlow}
      >
        <Text className="text-white font-bold text-base tracking-wide">
          {carregando ? "Acessando..." : "Entrar no Vybe"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// --- ESTILOS ---

const styles = StyleSheet.create({
  buttonGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glowLine: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  }
});