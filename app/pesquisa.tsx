import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors } from "../constants/theme";

type Aba = "musicas" | "albuns" | "perfis";

function obterIniciais(titulo: string) {
  if (!titulo) return "VY";
  const partes = titulo.trim().split(/\s+/);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export default function Pesquisa() {
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<Aba>("perfis");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  async function buscar() {
    if (!busca.trim()) return;
    setCarregando(true);
    setBuscou(true);
    const termo = `%${busca}%`;

    if (aba === "perfis") {
      const [{ data: musicos }, { data: organizadores }] = await Promise.all([
        supabase
          .from("perfil_musico")
          .select("usuario_id, apelido, foto_url, genero_musical, localizacao, usuario:usuario_id(nome)")
          .ilike("apelido", termo)
          .limit(20),
        supabase
          .from("perfil_organizador")
          .select("usuario_id, localizacao, nicho_trabalho, usuario:usuario_id!inner(nome)")
          .ilike("usuario.nome", termo)
          .limit(20),
      ]);
      setResultados([
        ...(musicos ?? []).map((m: any) => ({
          tipo: "musico",
          usuario_id: m.usuario_id,
          titulo: m.apelido ?? (Array.isArray(m.usuario) ? m.usuario[0]?.nome : m.usuario?.nome),
          subtitulo: [m.genero_musical, m.localizacao].filter(Boolean).join(" · "),
          foto_url: m.foto_url,
        })),
        ...(organizadores ?? []).map((o: any) => ({
          tipo: "organizador",
          usuario_id: o.usuario_id,
          titulo: Array.isArray(o.usuario) ? o.usuario[0]?.nome : o.usuario?.nome,
          subtitulo: [o.nicho_trabalho, o.localizacao].filter(Boolean).join(" · "),
          foto_url: null,
        })),
      ]);
    } else if (aba === "musicas") {
      const { data } = await supabase
        .from("musica")
        .select("id, nome, capa_url, genero, usuario_id")
        .ilike("nome", termo)
        .eq("status", "ativo")
        .limit(30);
      setResultados(
        (data ?? []).map((m: any) => ({
          tipo: "musica",
          id: m.id,
          titulo: m.nome,
          subtitulo: m.genero,
          foto_url: m.capa_url,
          usuario_id: m.usuario_id,
        }))
      );
    } else {
      const { data } = await supabase
        .from("album")
        .select("id, nome, capa_url, usuario_id")
        .ilike("nome", termo)
        .eq("status", "ativo")
        .limit(30);
      setResultados(
        (data ?? []).map((a: any) => ({
          tipo: "album",
          id: a.id,
          titulo: a.nome,
          subtitulo: null,
          foto_url: a.capa_url,
          usuario_id: a.usuario_id,
        }))
      );
    }
    setCarregando(false);
  }

  function abrir(item: any) {
    if (item.tipo === "musico" || item.tipo === "organizador") router.push(`/usuario/${item.usuario_id}`);
    else if (item.tipo === "album") router.push(`/album/${item.id}`);
    else if (item.tipo === "musica") router.push(`/usuario/${item.usuario_id}`);
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-2 p-1">
          <ChevronLeft color={colors.textDark} size={24} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Pesquisa</Text>
      </View>

      <View className="flex-row px-4 mt-3 mb-3 gap-2">
        <AbaChip label="Perfis" ativa={aba === "perfis"} onPress={() => { setAba("perfis"); setResultados([]); setBuscou(false); }} />
        <AbaChip label="Músicas" ativa={aba === "musicas"} onPress={() => { setAba("musicas"); setResultados([]); setBuscou(false); }} />
        <AbaChip label="Álbuns" ativa={aba === "albuns"} onPress={() => { setAba("albuns"); setResultados([]); setBuscou(false); }} />
      </View>

      <View className="px-4 mb-3">
        <TextInput
          placeholder={
            aba === "perfis" ? "Buscar por apelido ou nome..." : aba === "musicas" ? "Buscar música..." : "Buscar álbum..."
          }
          placeholderTextColor="#9CA3AF"
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={buscar}
          returnKeyType="search"
          autoFocus
          className="border border-border rounded-full px-5 py-3 text-textDark bg-card"
        />
      </View>

      {carregando && <Text className="text-muted text-center">Buscando...</Text>}

      <FlatList
        showsVerticalScrollIndicator={false}
        data={resultados}
        keyExtractor={(item, i) => `${item.tipo}-${item.id ?? item.usuario_id}-${i}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          !carregando && buscou ? <Text className="text-muted text-center mt-8">Nenhum resultado encontrado.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => abrir(item)} className="flex-row items-center bg-card rounded-2xl p-3 mb-3">
            {item.foto_url ? (
              <Image source={{ uri: item.foto_url }} style={{borderRadius:48}} className="w-14 h-14 mr-3" />
            ) : (
              <View style={{borderRadius:48}} className="w-14 h-14 bg-surface mr-3 items-center justify-center">
                <Text className="text-primaryLight font-bold text-base">
                  {obterIniciais(item.titulo)}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="font-bold text-textDark">
                {item.titulo} <Text className="font-normal text-muted">- {item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1) : ""}</Text>
              </Text>
              {!!item.subtitulo && (
                <Text className="text-muted text-xs" numberOfLines={1}>
                  {item.subtitulo}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function AbaChip({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full px-4 py-2 ${ativa ? "bg-primary" : "bg-surface"}`}>
      <Text className={`text-sm font-medium ${ativa ? "text-white" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}