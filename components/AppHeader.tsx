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
      style={{ paddingTop: insets.top }}
      accessibilityRole="header"
      // @ts-ignore
      role="banner"
      aria-label="Cabeçalho da aplicação"
    >
      <View className="px-5 pb-4 pt-2 flex-row items-center justify-between">
        {ehHome ? (
          usuario ? (
            <Pressable
              onPress={() => router.push("/(tabs)/perfil")}
              className="flex-row items-center gap-3"
            >
              <View className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2563EB] border-opacity-50 items-center justify-center bg-[#2563EB]">
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} alt={`Foto de ${nomeExibido}`} accessibilityLabel={`Foto de ${nomeExibido}`} className="w-full h-full" />
                ) : (
                  <Text className="text-white font-bold">{obterIniciais(nomeExibido)}</Text>
                )}
              </View>
              <View>
                {rotuloPerfil && <Text className="text-muted text-sm font-medium">{rotuloPerfil}</Text>}
                <Text className="text-textDark text-xl font-bold tracking-tight">Olá, {nomeExibido}</Text>
              </View>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center">
                <Text className="text-[#3B82F6] font-black text-sm">VY</Text>
              </View>
              <View>
                <Text className="text-muted text-xs font-medium">Cena Autoral</Text>
                <Text className="text-textDark text-lg font-bold tracking-tight">Jundiaí & Região</Text>
              </View>
            </View>
          )
        ) : (
          <Text className="text-textDark font-bold text-xl tracking-wide">
            {tituloPagina || ""}
          </Text>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable 
            onPress={onOpenSearch} 
            accessibilityRole="button"
            accessibilityLabel="Abrir pesquisa"
            className="w-9 h-9 rounded-full bg-surface items-center justify-center border border-border active:scale-95 transition-transform"
          >
            <Search color="#8B95A8" size={18} />
          </Pressable>

          {usuario ? (
            <Pressable
              onPress={handleSair}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 active:scale-95 transition-transform"
            >
              <LogOut color="#EF4444" size={14} />
              <Text className="text-red-400 font-bold text-xs">Sair</Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => router.push("/(auth)/entrar?aba=login")}
                accessibilityRole="button"
                accessibilityLabel="Entrar na conta"
                className="px-3 py-1.5 rounded-full border border-white/20 bg-white/5 active:scale-95"
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
