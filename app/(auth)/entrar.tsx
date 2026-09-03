import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { X, Mail, Lock, User, AtSign, Sparkles } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { AppLogo } from "../../components/AppLogo";
import { colors } from "../../constants/theme";
import Animated from 'react-native-reanimated';

// Correção: Criado fora dos componentes para manter a estabilidade da árvore do React
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AuthScreen() {
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
    <ScrollView 
      className="flex-1 bg-[#0B101E]"
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 w-full max-w-md relative">
        <View className="w-full px-6 pt-12 pb-2 flex-row justify-end z-20">
          <AnimatedPressable
            onPress={fechar}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center"
          >
            <X color={colors.textDark} size={20} />
          </AnimatedPressable>
        </View>

        <View className="items-center justify-center w-full px-6 pb-8">
          <AppLogo tamanho="grande" />
          
          <Text className="text-white text-3xl font-bold mt-6 tracking-wide text-center">
            {aba === "cadastro" ? "Comece no Vybe" : "Bem-vindo de volta"}
          </Text>
          
          <Text className="text-muted text-base mt-2 text-center max-w-sm">
            A plataforma definitiva para conectar músicos, organizadores e o público.
          </Text>
        </View>

        <View className="flex-1 bg-[#121827] rounded-t-[40px] px-8 pt-8 border-t border-white/5 shadow-2xl">
          <View className="flex-row mb-8 justify-start">
            <AbaBotao label="Criar Conta" ativa={aba === "cadastro"} onPress={() => setAba("cadastro")} />
            <AbaBotao label="Entrar" ativa={aba === "login"} onPress={() => setAba("login")} />
          </View>

          {aba === "cadastro" ? <FormCadastro /> : <FormLogin />}
        </View>
      </View>
    </ScrollView>
  );
}

function AbaBotao({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mr-8 items-center">
      <Text className={`text-xl ${ativa ? "font-bold text-textDark" : "font-medium text-muted"}`}>
        {label}
      </Text>
      {ativa && (
        <View className="h-1 bg-primary rounded-full mt-2 w-full" />
      )}
    </Pressable>
  );
}

function Campo({ icone: Icon, ...props }: React.ComponentProps<typeof TextInput> & { icone?: any }) {
  return (
    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-14 mb-4">
      {Icon && <Icon color="#9CA3AF" size={20} />}
      <TextInput
        placeholderTextColor="#6B7280"
        className="flex-1 ml-3 text-base text-textDark"
        {...props}
      />
    </View>
  );
}

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

  return (
    <View className="pb-10">
      <View className="flex-row mb-6 bg-white/5 rounded-2xl p-1 border border-white/5 w-full">
        <AnimatedPressable
          onPress={() => setTipoConta("musico")}
          style={[
            { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
            tipoConta === "musico" && { backgroundColor: colors.primary }
          ]}
        >
          <Text className={`font-medium text-center ${tipoConta === "musico" ? "text-white font-bold" : "text-muted"}`}>
            Sou Músico
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => setTipoConta("organizador")}
          style={[
            { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
            tipoConta === "organizador" && { backgroundColor: colors.primary }
          ]}
        >
          <Text className={`font-medium text-center ${tipoConta === "organizador" ? "text-white font-bold" : "text-muted"}`}>
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
        <Sparkles color={colors.textDark} size={18} className="mr-3" />
        <Text className="text-textDark font-medium text-base">Google</Text>
      </Pressable>
    </View>
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
    <View className="pb-10">
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
      >
        <Text className="text-white font-bold text-base tracking-wide">
          {carregando ? "Acessando..." : "Entrar no Vybe"}
        </Text>
      </Pressable>
    </View>
  );
}