import { useEffect, useState } from "react";
import { View, Pressable, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import { Search, LogOut } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { supabase } from "../lib/supabase";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { SearchInputDesktop } from "./SearchInputDesktop";
import { obterIniciais } from "../lib/avatarUtils";

const titulosAbas: Record<string, string> = {
  explorar: "Explorar",
  criar: "Criar",
  conversa: "Conversas",
  moderacao: "Moderação",
  admin: "Painel",
  perfil: "Perfil",
};

interface AppHeaderProps {
  onOpenSearch?: () => void;
}

export function AppHeader({ onOpenSearch }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const segments = useSegments();
  const ehDesktop = useEhDesktop();

  const [apelido, setApelido] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) {
      setApelido(null);
      setFotoUrl(null);
      return;
    }

    if (usuario.tipo_conta === "musico") {
      supabase
        .from("perfil_musico")
        .select("apelido, foto_url")
        .eq("usuario_id", usuario.id)
        .maybeSingle()
        .then(({ data }) => {
          setApelido(data?.apelido ?? null);
          setFotoUrl(data?.foto_url ?? null);
        });
    } else if (usuario.tipo_conta === "moderador" || usuario.tipo_conta === "adm") {
      setApelido(null);
      (async () => {
        try {
          const { data: pMod } = await supabase
            .from("perfil_moderador")
            .select("foto_url")
            .eq("usuario_id", usuario.id)
            .maybeSingle();
          if (pMod?.foto_url) {
            setFotoUrl(pMod.foto_url);
            return;
          }
        } catch (_) {}

        try {
          const { data: pMusico } = await supabase
            .from("perfil_musico")
            .select("foto_url")
            .eq("usuario_id", usuario.id)
            .maybeSingle();
          setFotoUrl(pMusico?.foto_url ?? null);
        } catch (_) {
          setFotoUrl(null);
        }
      })();
    } else if (usuario.tipo_conta === "organizador") {
      setApelido(null);
      supabase
        .from("perfil_organizador")
        .select("foto_url")
        .eq("usuario_id", usuario.id)
        .maybeSingle()
        .then(({ data }) => {
          setFotoUrl(data?.foto_url ?? null);
        });
    } else {
      setApelido(null);
      setFotoUrl(null);
    }
  }, [usuario?.id, usuario?.tipo_conta]);

  const abaAtual = segments[segments.length - 1];
  const ehHome = abaAtual === "home" || abaAtual === "(tabs)" || abaAtual === "index" || !abaAtual;
  const tituloPagina = abaAtual ? titulosAbas[abaAtual] : undefined;

  const nomeExibido = apelido ?? usuario?.nome ?? "Visitante";
  const rotuloPerfil =
    usuario?.tipo_conta === "musico"
      ? "Perfil Músico"
      : usuario?.tipo_conta === "organizador"
      ? "Perfil Organizador"
      : null;

  async function handleSair() {
    usePlayerStore.getState().resetar();
    await useAuthStore.getState().sair();
    router.replace("/(tabs)/home");
  }

  if (ehDesktop) {
    return (
      <View
        style={{ paddingTop: Math.max(insets.top, 14), zIndex: 9999 }}
        accessibilityRole="header"
        // @ts-ignore
        role="banner"
        aria-label="Cabeçalho da aplicação"
      >
        <View className="px-6 pb-4 flex-row items-center justify-between border-b border-white/5 bg-[#0B101E]/80 backdrop-blur-md">
          {/* Esquerda: Espaço vazio para empurrar o centro */}
          <View className="flex-1 hidden md:flex" />

          {/* Centro: Input de Pesquisa Real */}
          <View className="flex-[2] items-center justify-center px-2">
            <SearchInputDesktop />
          </View>

          {/* Direita: Perfil/Avatar ou Login/Cadastro */}
          <View className="flex-row items-center gap-3 ml-2 justify-end shrink-0">
            {usuario ? (
              <>
                <Pressable
                  onPress={() => router.push("/(tabs)/perfil")}
                  accessibilityRole="button"
                  accessibilityLabel={`Perfil de ${nomeExibido}`}
                  className="flex-row items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 max-w-[200px] cursor-pointer"
                >
                  <View className="w-8 h-8 rounded-full overflow-hidden items-center justify-center bg-[#2563EB] shrink-0">
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} alt={`Foto de ${nomeExibido}`} accessibilityLabel={`Foto de ${nomeExibido}`} className="w-full h-full" />
                    ) : (
                      <Text className="text-white font-bold text-xs">{obterIniciais(nomeExibido)}</Text>
                    )}
                  </View>
                  <View className="flex-shrink overflow-hidden">
                    <Text className="text-white font-bold text-xs leading-tight truncate" numberOfLines={1}>{nomeExibido}</Text>
                    {rotuloPerfil && <Text className="text-gray-300 text-xs leading-tight truncate" numberOfLines={1}>{rotuloPerfil}</Text>}
                  </View>
                </Pressable>

                <Pressable
                  onPress={handleSair}
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta"
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 border border-red-500/20 transition-all cursor-pointer"
                >
                  <LogOut size={14} color="#EF4444" />
                  <Text className="text-red-400 font-semibold text-xs">Sair</Text>
                </Pressable>
              </>
            ) : (
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => router.push("/(auth)/entrar?aba=login")}
                  accessibilityRole="button"
                  accessibilityLabel="Entrar na conta"
                  className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Text className="text-white font-semibold text-sm">Entrar</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
                  accessibilityRole="button"
                  accessibilityLabel="Criar nova conta"
                  className="px-4 py-1.5 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Text className="text-white font-bold text-sm">Criar Conta</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 8) }}
      accessibilityRole="header"
      // @ts-ignore
      role="banner"
      aria-label="Cabeçalho da aplicação"
      className="w-full bg-[#0B101E]/95 border-b border-white/5 backdrop-blur-md"
    >
      <View className="px-4 pb-3 pt-2 flex-row items-center justify-between gap-2 max-w-full overflow-hidden">
        {/* Esquerda: Logo Vybe e Contexto da Tela */}
        <Pressable
          onPress={() => router.push("/(tabs)/home")}
          accessibilityRole="button"
          accessibilityLabel="Ir para o início do Vybe"
          className="flex-row items-center gap-1.5 shrink-0 active:opacity-80"
        >
          <Text className="text-white text-2xl font-black tracking-tight">vybe</Text>
          <View className="w-2 h-2 rounded-full bg-[#3B82F6] mb-1" />
          {!ehHome && tituloPagina && (
            <View className="flex-row items-center gap-1.5 ml-1">
              <Text className="text-gray-500 text-xs font-semibold">•</Text>
              <Text className="text-gray-300 text-xs font-bold truncate max-w-[110px] sm:max-w-[180px]" numberOfLines={1}>
                {tituloPagina}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Direita: Busca, Avatar/Sair ou Entrar/Criar Conta */}
        <View className="flex-row items-center gap-2 shrink-0">
          <Pressable 
            onPress={onOpenSearch} 
            accessibilityRole="button"
            accessibilityLabel="Abrir pesquisa"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center active:scale-95"
          >
            <Search color="#94A3B8" size={17} />
          </Pressable>

          {usuario ? (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/(tabs)/perfil")}
                accessibilityRole="button"
                accessibilityLabel={`Perfil de ${nomeExibido}`}
                className="w-9 h-9 rounded-full overflow-hidden border border-[#2563EB]/60 bg-[#2563EB] items-center justify-center active:scale-95"
              >
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} alt={`Foto de ${nomeExibido}`} accessibilityLabel={`Foto de ${nomeExibido}`} className="w-full h-full" />
                ) : (
                  <Text className="text-white font-bold text-xs">{obterIniciais(nomeExibido)}</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleSair}
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center active:scale-95"
              >
                <LogOut color="#EF4444" size={15} />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => router.push("/(auth)/entrar?aba=login")}
                accessibilityRole="button"
                accessibilityLabel="Entrar na conta"
                className="px-2.5 py-1.5 rounded-full border border-white/20 bg-white/5 active:scale-95"
              >
                <Text className="text-white font-semibold text-xs">Entrar</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
                accessibilityRole="button"
                accessibilityLabel="Criar nova conta"
                className="px-3 py-1.5 rounded-full bg-[#2563EB] active:scale-95"
              >
                <Text className="text-white font-bold text-xs">Criar Conta</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
