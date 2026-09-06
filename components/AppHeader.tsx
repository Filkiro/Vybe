import { useEffect, useState } from "react";
import { View, Pressable, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import { Search } from "lucide-react-native";
import { useAuthStore, ehContaComum } from "../store/authStore";
import { supabase } from "../lib/supabase";

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

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const segments = useSegments();

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
  const ehHome = abaAtual === "home" || !abaAtual;
  const tituloPagina = titulosAbas[abaAtual];

  const nomeExibido = apelido ?? usuario?.nome ?? "Visitante";
  const rotuloPerfil =
    usuario?.tipo_conta === "musico"
      ? "Perfil Músico"
      : usuario?.tipo_conta === "organizador"
      ? "Perfil Organizador"
      : null;

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
              <Text className="text-textDark text-2xl font-bold tracking-tight">Olá, {nomeExibido}</Text>
            </View>
          </View>
        ) : (
          <Text className="text-textDark font-bold text-xl tracking-wide">
            {tituloPagina || ""}
          </Text>
        )}

        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.push("/pesquisa")} className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border">
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