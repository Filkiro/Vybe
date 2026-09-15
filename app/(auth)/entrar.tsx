import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import {
  X,
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  Music2,
  CalendarCheck2,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { AppLogo } from "../../components/AppLogo";
import { AnimatedBackgroundBlobs } from "../../components/AnimatedBackgroundBlobs";
import { colors } from "../../constants/theme";

export default function AuthScreen() {
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string }>();
  const [aba, setAba] = useState<"cadastro" | "login">(
    abaParam === "login" ? "login" : "cadastro"
  );

  function fechar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#070B14" }}>
      {/* BACKGROUND OCUPANDO A TELA INTEIRA SEM CORTAR */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <AnimatedBackgroundBlobs height="100%" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 48,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[460px] relative">
          {/* BOTÃO FECHAR */}
          <View className="w-full pb-4 flex-row justify-end">
            <Pressable
              onPress={fechar}
              hitSlop={12}
              className="w-11 h-11 rounded-full bg-white/5 border border-white/10 items-center justify-center active:scale-95 "
            >
              <X color="#94A3B8" size={20} />
            </Pressable>
          </View>

          {/* HERO HEADER */}
          <View className="items-center justify-center pt-2 pb-6">
            <AppLogo tamanho="grande" />

            <Text className="text-white text-3xl font-black mt-5 tracking-tight text-center">
              {aba === "cadastro" ? "Crie o seu perfil" : "Bem-vindo de volta"}
            </Text>

            <Text className="text-muted text-sm font-medium mt-2 text-center max-w-sm leading-relaxed">
              {aba === "cadastro"
                ? "Conecte sua arte a organizadores e fãs da cena independente."
                : "Acesse sua conta para gerenciar shows, faixas e conversas."}
            </Text>

            {/* SELETOR FLUTUANTE (PILL TABS) */}
            <View className="w-full mt-7 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 flex-row overflow-hidden">
              <Pressable
                onPress={() => setAba("cadastro")}
                className={`flex-1 py-3 rounded-xl items-center justify-center  ${
                  aba === "cadastro"
                    ? "bg-primary "
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    aba === "cadastro" ? "text-white" : "text-gray-400"
                  }`}
                >
                  Criar Conta
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAba("login")}
                className={`flex-1 py-3 rounded-xl items-center justify-center  ${
                  aba === "login"
                    ? "bg-primary "
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    aba === "login" ? "text-white" : "text-gray-400"
                  }`}
                >
                  Entrar
                </Text>
              </Pressable>
            </View>
          </View>

          {/* CARD DO FORMULÁRIO */}
          <View className="w-full rounded-3xl overflow-hidden border border-white/10 p-7">
            <BlurView intensity={Platform.OS === 'android' ? 30 : 50} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 23, 42, 0.75)' }]} pointerEvents="none" />

            {aba === "cadastro" ? <FormCadastro /> : <FormLogin />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Campo({
  icone: Icon,
  isPassword,
  ...props
}: React.ComponentProps<typeof TextInput> & { icone?: any; isPassword?: boolean }) {
  const [secureText, setSecureText] = useState(isPassword);
  const [focado, setFocado] = useState(false);

  return (
    <View
      style={{ height: 52, overflow: "hidden" }}
      className={`flex-row items-center bg-white/5 rounded-2xl px-4 mb-4 border  ${
        focado
          ? "border-primary bg-white/[0.08] "
          : "border-white/10"
      }`}
    >
      {/* Ícone fixo da esquerda */}
      {Icon && (
        <View
          style={{ width: 22, height: 22, flexShrink: 0 }}
          className="items-center justify-center mr-2.5"
        >
          <Icon color={focado ? colors.primary : "#64748B"} size={19} />
        </View>
      )}

      {/* Input com minWidth: 0 para anular o tamanho mínimo padrão do navegador */}
      <TextInput
        placeholderTextColor="#64748B"
        className="flex-1 text-white font-medium text-base h-full"
        secureTextEntry={secureText}
        underlineColorAndroid="transparent"
        selectionColor={colors.primary}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        style={{
          outlineStyle: "none",
          color: "#FFFFFF",
          minWidth: 0,
          width: "100%",
        } as any}
        {...props}
      />

      {/* Ícone do olho travado na ponta direita dentro do container */}
      {isPassword && (
        <Pressable
          onPress={() => setSecureText(!secureText)}
          hitSlop={10}
          style={{ width: 28, height: 28, flexShrink: 0 }}
          className="items-center justify-center ml-2"
        >
          {secureText ? (
            <EyeOff color="#64748B" size={19} />
          ) : (
            <Eye color={colors.primary} size={19} />
          )}
        </Pressable>
      )}
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
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa de no mínimo 6 caracteres.");
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
    <View>
      <Text className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
        Eu quero atuar como:
      </Text>

      {/* SELEÇÃO DE PAPEL */}
      <View className="flex-row gap-3 mb-5">
        <Pressable
          onPress={() => setTipoConta("musico")}
          style={{ height: 74 }}
          className={`flex-1 rounded-2xl border items-center justify-center  ${
            tipoConta === "musico"
              ? "bg-primary/20 border-primary "
              : "bg-white/5 border-white/10"
          }`}
        >
          <Music2
            size={24}
            color={tipoConta === "musico" ? colors.primary : "#94A3B8"}
            style={{ marginBottom: 4 }}
          />
          <Text
            className={`text-xs font-bold ${
              tipoConta === "musico" ? "text-white" : "text-gray-400"
            }`}
          >
            Músico
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTipoConta("organizador")}
          style={{ height: 74 }}
          className={`flex-1 rounded-2xl border items-center justify-center  ${
            tipoConta === "organizador"
              ? "bg-primary/20 border-primary "
              : "bg-white/5 border-white/10"
          }`}
        >
          <CalendarCheck2
            size={24}
            color={tipoConta === "organizador" ? colors.primary : "#94A3B8"}
            style={{ marginBottom: 4 }}
          />
          <Text
            className={`text-xs font-bold ${
              tipoConta === "organizador" ? "text-white" : "text-gray-400"
            }`}
          >
            Organizador
          </Text>
        </Pressable>
      </View>

      <Campo icone={User} placeholder="Nome completo" value={nome} onChangeText={setNome} />

      {tipoConta === "musico" && (
        <Campo
          icone={AtSign}
          placeholder="Nome artístico / Apelido"
          value={apelido}
          onChangeText={setApelido}
        />
      )}

      <Campo
        icone={Mail}
        placeholder="Seu melhor e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Campo
        icone={Lock}
        placeholder="Criar senha segura"
        value={senha}
        onChangeText={setSenha}
        isPassword
      />
      <Campo
        icone={Lock}
        placeholder="Confirmar senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        isPassword
      />

      {erro && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-4">
          <Text className="text-red-400 text-xs font-medium text-center">{erro}</Text>
        </View>
      )}

      <Pressable
        onPress={handleCadastrar}
        disabled={carregando}
        style={{ height: 52 }}
        className="bg-primary rounded-2xl flex-row items-center justify-center mt-2 mb-4 active:scale-98 "
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text className="text-white font-bold text-base tracking-wide mr-2">
              Concluir Cadastro
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </>
        )}
      </Pressable>

      <View className="flex-row items-center my-3">
        <View className="flex-1 h-[1px] bg-white/10" />
        <Text className="text-gray-500 px-3 text-xs font-semibold uppercase tracking-wider">
          ou
        </Text>
        <View className="flex-1 h-[1px] bg-white/10" />
      </View>

      <Pressable
        style={{ height: 50 }}
        className="bg-white/5 border border-white/10 rounded-2xl flex-row justify-center items-center active:bg-white/10"
      >
        <Sparkles color="#94A3B8" size={18} style={{ marginRight: 8 }} />
        <Text className="text-white font-semibold text-sm">Continuar com Google</Text>
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
      setErro("Preencha seu e-mail e senha.");
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
    <View>
      <Campo
        icone={Mail}
        placeholder="Seu e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Campo
        icone={Lock}
        placeholder="Sua senha"
        value={senha}
        onChangeText={setSenha}
        isPassword
      />

      {erro && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-4">
          <Text className="text-red-400 text-xs font-medium text-center">{erro}</Text>
        </View>
      )}

      <Pressable className="self-end mb-6 mt-1">
        <Text className="text-primaryLight text-xs font-semibold">Esqueceu a senha?</Text>
      </Pressable>

      <Pressable
        onPress={handleEntrar}
        disabled={carregando}
        style={{ height: 52 }}
        className="bg-primary rounded-2xl flex-row items-center justify-center mb-4 active:scale-98 "
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text className="text-white font-bold text-base tracking-wide mr-2">
              Acessar Conta
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </>
        )}
      </Pressable>

      <View className="flex-row items-center my-3">
        <View className="flex-1 h-[1px] bg-white/10" />
        <Text className="text-gray-500 px-3 text-xs font-semibold uppercase tracking-wider">
          ou
        </Text>
        <View className="flex-1 h-[1px] bg-white/10" />
      </View>

      <Pressable
        style={{ height: 50 }}
        className="bg-white/5 border border-white/10 rounded-2xl flex-row justify-center items-center active:bg-white/10"
      >
        <Sparkles color="#94A3B8" size={18} style={{ marginRight: 8 }} />
        <Text className="text-white font-semibold text-sm">Continuar com Google</Text>
      </Pressable>
    </View>
  );
}
