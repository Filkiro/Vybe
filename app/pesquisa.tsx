import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { ChevronLeft, Search, X, Music, Disc, User, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAbrirPerfil } from "../store/perfilModalStore";
import { usePlayerStore } from "../store/playerStore";
import { useRequireAuth } from "../store/authPromptStore";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { buscarApelidos } from "../lib/buscaUtils";
import { AnimatedBackgroundBlobs } from "../components/AnimatedBackgroundBlobs";

type Aba = "musicas" | "albuns" | "perfis";
type ModoPerfil = "nome" | "genero";

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
  const abrirPerfil = useAbrirPerfil();
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const ehDesktop = useEhDesktop();
  const [aba, setAba] = useState<Aba>("perfis");
  const [modoPerfil, setModoPerfil] = useState<ModoPerfil>("nome");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Tira o foco do campo de pesquisa (ex.: ao clicar/rolar fora dele)
  function perderFoco() {
    inputRef.current?.blur();
  }

  async function buscar() {
    if (!busca.trim()) return;
    setCarregando(true);
    setBuscou(true);
    const termo = `%${busca}%`;

    if (aba === "perfis" && modoPerfil === "genero") {
      const { data: musicos } = await supabase
        .from("perfil_musico")
        .select("usuario_id, apelido, foto_url, genero_musical, localizacao, usuario:usuario_id(nome)")
        .ilike("genero_musical", termo)
        .limit(30);

      setResultados(
        (musicos ?? []).map((m: any) => ({
          tipo: "musico",
          usuario_id: m.usuario_id,
          titulo: m.apelido ?? (Array.isArray(m.usuario) ? m.usuario[0]?.nome : m.usuario?.nome),
          subtitulo: [m.genero_musical, m.localizacao].filter(Boolean).join(" · "),
          foto_url: m.foto_url,
        }))
      );
    } else if (aba === "perfis") {
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
        .select("id, nome, capa_url, genero, usuario_id, arquivo_url")
        .ilike("nome", termo)
        .eq("status", "ativo")
        .limit(30);
      const apelidos = await buscarApelidos((data ?? []).map((m: any) => m.usuario_id));
      setResultados(
        (data ?? []).map((m: any) => ({
          tipo: "musica",
          id: m.id,
          titulo: m.nome,
          subtitulo: m.genero,
          foto_url: m.capa_url,
          usuario_id: m.usuario_id,
          arquivo_url: m.arquivo_url,
          autor_apelido: apelidos.get(m.usuario_id) ?? null,
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
    if (item.tipo === "musico" || item.tipo === "organizador") {
      abrirPerfil(item.usuario_id);
    } else if (item.tipo === "album") {
      router.push(`/album/${item.id}`);
    } else if (item.tipo === "musica") {
      // Clicar numa música toca a música (antes abria o perfil do artista).
      requireAuth(() => {
        const fila = resultados
          .filter((r: any) => r.tipo === "musica" && r.arquivo_url)
          .map((r: any) => ({
            id: r.id,
            nome: r.titulo,
            autorApelido: r.autor_apelido ?? null,
            arquivoUrl: r.arquivo_url,
            capaUrl: r.foto_url ?? null,
          }));
        tocarMusica(
          {
            id: item.id,
            nome: item.titulo,
            autorApelido: item.autor_apelido ?? null,
            arquivoUrl: item.arquivo_url,
            capaUrl: item.foto_url ?? null,
          },
          fila
        );
        if (!ehDesktop) router.push("/tocando");
      });
    }
  }

  function limparBusca() {
    setBusca("");
    setResultados([]);
    setBuscou(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0B101E" }}>
      <AnimatedBackgroundBlobs height={400} />

      {/* Fundo clicável: clicar em qualquer lugar fora tira o foco da pesquisa */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={perderFoco} />

      {/* CABEÇALHO */}
      <View
        style={{ paddingTop: Math.max(insets.top, 16) }}
        className="px-5 pb-3 w-full max-w-[800px] self-center flex-row items-center gap-3"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center active:scale-95"
        >
          <ChevronLeft color="#94A3B8" size={22} />
        </Pressable>
        <Text className="text-2xl font-black text-white tracking-wide">Explorar</Text>
      </View>

      <View className="w-full max-w-[800px] self-center px-5">
        {/* BARRA DE PESQUISA */}
        <View className="relative my-2 justify-center">
  <View className="absolute left-4 z-10 pointer-events-none">
    <Search color="#64748B" size={20} />
  </View>
  <TextInput
    ref={inputRef}
    className="w-full h-12 bg-[#121A2F] border border-[#1E293B] rounded-2xl pl-12 pr-12 text-white text-base font-medium"
    placeholder={
      aba === "perfis"
        ? modoPerfil === "genero"
          ? "Buscar gênero musical (ex: rap)..."
          : "Buscar por apelido ou nome..."
        : aba === "musicas"
        ? "Buscar música..."
        : "Buscar álbum..."
    }
    placeholderTextColor="#64748B"
    value={busca}
    onChangeText={setBusca}
    onSubmitEditing={buscar}
    returnKeyType="search"
    autoCapitalize="none"
  />
  {busca.length > 0 && (
    <Pressable
      onPress={limparBusca}
      className="absolute right-4 w-6 h-6 items-center justify-center rounded-full bg-[#1E293B]"
    >
      <X color="#94A3B8" size={14} />
    </Pressable>
  )}
</View>

        {/* ABAS PRINCIPAIS */}
        <View className="flex-row gap-2 mt-4 mb-2">
          <AbaChip label="Perfis" ativa={aba === "perfis"} onPress={() => setAba("perfis")} icon={<User size={16} color={aba === "perfis" ? "white" : "#94A3B8"} />} />
          <AbaChip label="Músicas" ativa={aba === "musicas"} onPress={() => setAba("musicas")} icon={<Music size={16} color={aba === "musicas" ? "white" : "#94A3B8"} />} />
          <AbaChip label="Álbuns" ativa={aba === "albuns"} onPress={() => setAba("albuns")} icon={<Disc size={16} color={aba === "albuns" ? "white" : "#94A3B8"} />} />
        </View>

        {/* SUB-ABAS DE PERFIL */}
        {aba === "perfis" && (
          <View className="flex-row items-center gap-3 my-2 mb-4 px-1">
            <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest">Buscar por</Text>
            <SubAbaChip label="Nome/Apelido" ativa={modoPerfil === "nome"} onPress={() => setModoPerfil("nome")} />
            <SubAbaChip label="Gênero Musical" ativa={modoPerfil === "genero"} onPress={() => setModoPerfil("genero")} icon={<Sparkles size={12} color={modoPerfil === "genero" ? "#60A5FA" : "#94A3B8"}/>} />
          </View>
        )}
      </View>

      {/* FEED DE RESULTADOS */}
      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 font-medium">Buscando no Vybe...</Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={perderFoco}
          data={resultados}
          keyExtractor={(item, i) => `${item.tipo}-${item.id ?? item.usuario_id}-${i}`}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 60,
            paddingTop: 8,
          }}
          ListEmptyComponent={
            buscou ? (
              <View className="items-center justify-center pt-16 px-4">
                <Text className="text-white font-bold text-lg mb-1">Nenhum resultado</Text>
                <Text className="text-gray-400 text-center text-sm">
                  Não encontramos correspondências para "{busca}". Tente outros termos.
                </Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View className="w-full max-w-[800px] self-center">
              <Pressable
                onPress={() => abrir(item)}
                style={{ borderRadius: 20, overflow: "hidden" }}
                className="active:opacity-80"
              >
                {/* No Android, múltiplos BlurViews dentro de uma FlatList causam crash no scroll rápido. */}
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(15, 23, 42, 0.75)" }]} />
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                />

                <View className="flex-row items-center px-4 py-3">
                  {item.foto_url ? (
                    <Image
                      source={{ uri: item.foto_url }}
                      className={`w-12 h-12 mr-3.5 ${
                        item.tipo === "musico" || item.tipo === "organizador"
                          ? "rounded-full"
                          : "rounded-xl"
                      }`}
                    />
                  ) : (
                    <View
                      className={`w-12 h-12 bg-white/10 border border-white/10 mr-3.5 items-center justify-center ${
                        item.tipo === "musico" || item.tipo === "organizador"
                          ? "rounded-full"
                          : "rounded-xl"
                      }`}
                    >
                      <Text className="text-primary font-bold text-sm">
                        {obterIniciais(item.titulo)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-1 pr-2">
                    <Text numberOfLines={1} className="font-bold text-white text-base">
                      {item.titulo}
                    </Text>
                    {!!item.subtitulo && (
                      <Text numberOfLines={1} className="text-gray-400 text-xs mt-0.5">
                        {item.subtitulo}
                      </Text>
                    )}
                  </View>

                  <View className="bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                    <Text className="text-gray-300 text-[10px] font-semibold uppercase tracking-wider">
                      {item.tipo}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function AbaChip({
  label,
  ativa,
  onPress,
  icon,
}: {
  label: string;
  ativa: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all ${
        ativa
          ? "bg-primary border-primary"
          : "bg-white/5 border-white/10 active:bg-white/10"
      }`}
    >
      {icon}
      <Text className={`text-xs font-bold ${ativa ? "text-white" : "text-gray-400"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SubAbaChip({
  label,
  ativa,
  onPress,
  icon,
}: {
  label: string;
  ativa: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
        ativa
          ? "bg-primary/20 border-primary/50"
          : "bg-transparent border-white/10 active:bg-white/5"
      }`}
    >
      {icon}
      <Text className={`text-xs font-semibold ${ativa ? "text-primaryLight" : "text-gray-400"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
