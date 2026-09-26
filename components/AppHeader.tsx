import { useEffect, useState } from "react";
import { View, Pressable, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import { Search, Bell } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { SearchInputDesktop } from "./SearchInputDesktop";

const titulosAbas: Record<string, string> = {
  explorar: "Explorar",
  criar: "Criar",
  conversa: "Conversas",
  moderacao: "Moderação",
  admin: "Painel",
  perfil: "Perfil",
};

// --- Helper: iniciais a partir do nome ---
function getIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

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

  if (ehDesktop) {
    return (
      <View style={{ paddingTop: Math.max(insets.top, 14), zIndex: 9999 }}>
        {/* Adiciona um background sutil ou border-b para o AppHeader não parecer parte do resto do site */}
        <View className="px-6 pb-4 flex-row items-center justify-between border-b border-white/5 bg-[#0B101E]/80 backdrop-blur-md">
          {/* Esquerda: Espaço vazio para empurrar o centro */}
          <View className="flex-1 hidden md:flex" />

          {/* Centro: Input de Pesquisa Real */}
          <View className="flex-[2] items-center justify-center px-2">
            <SearchInputDesktop />
          </View>

          {/* Direita: Perfil/Avatar */}
          <View className="flex-row items-center gap-2 lg:gap-4 ml-2 justify-end shrink-0">
            {usuario ? (
              <>
                <Pressable className="w-10 h-10 rounded-full items-center justify-center active:bg-white/10 relative shrink-0">
                  <Bell size={20} color="#94A3B8" />
                  <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#3B82F6] border border-[#0B101E]" />
                </Pressable>
                
                <Pressable className="flex-row items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/5 active:bg-white/10 transition-colors shrink-0 max-w-[200px]">
                  <View className="w-8 h-8 rounded-full overflow-hidden items-center justify-center bg-[#3B82F6] shrink-0">
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} className="w-full h-full" />
                    ) : (
                      <Text className="text-white font-bold text-[10px]">{getIniciais(nomeExibido)}</Text>
                    )}
                  </View>
                  <View className="flex-shrink overflow-hidden">
                    <Text className="text-white font-bold text-xs leading-tight truncate" numberOfLines={1}>{nomeExibido}</Text>
                    {rotuloPerfil && <Text className="text-gray-400 text-[10px] leading-tight truncate" numberOfLines={1}>{rotuloPerfil}</Text>}
                  </View>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
                className="bg-surface rounded-full px-4 py-2 border border-border"
              >
                <Text className="text-textDark font-semibold text-sm">Cadastrar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-4 pt-2 flex-row items-center justify-between">
        {ehHome ? (
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#3B82F6] border-opacity-50 items-center justify-center bg-[#3B82F6]">
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} className="w-full h-full" />
              ) : (
                <Text className="text-white font-bold">{getIniciais(nomeExibido)}</Text>
              )}
            </View>
            <View>
              {rotuloPerfil && <Text className="text-muted text-sm font-medium">{rotuloPerfil}</Text>}
              <Text className="text-textDark text-xl font-bold tracking-tight">Olá, {nomeExibido}</Text>
            </View>
          </View>
        ) : (
          <Text className="text-textDark font-bold text-xl tracking-wide">
            {tituloPagina || ""}
          </Text>
        )}

        <View className="flex-row items-center gap-4">
          <Pressable 
            onPress={onOpenSearch} 
            className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border active:scale-95 transition-transform"
          >
            <Search color="#8B95A8" size={20} />
          </Pressable>

          {!usuario && (
            <Pressable
              onPress={() => router.push("/(auth)/entrar?aba=cadastro")}
              className="bg-surface rounded-full px-4 py-2 border border-border"
            >
              <Text className="text-textDark font-semibold text-sm">Cadastrar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
