import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Search, X, Music, Disc, User, Sparkles } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAbrirPerfil } from "../store/perfilModalStore";
import { usePlayerStore } from "../store/playerStore";
import { useRequireAuth } from "../store/authPromptStore";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { buscarApelidos } from "../lib/buscaUtils";
import { router } from "expo-router";

type Aba = "todos" | "musicas" | "albuns" | "perfis";

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function SearchOverlay({ visible, onClose }: SearchOverlayProps) {
  const abrirPerfil = useAbrirPerfil();
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const ehDesktop = useEhDesktop();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Aba>("todos");
  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Busca automática enquanto o usuário digita (Debounce)
  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      return;
    }

    const timer = setTimeout(() => {
      executarBusca();
    }, 300);

    return () => clearTimeout(timer);
  }, [busca, aba]);

  async function executarBusca() {
    if (!busca.trim()) return;
    setCarregando(true);
    const termo = `%${busca}%`;

    let itens: any[] = [];

    if (aba === "todos" || aba === "perfis") {
      const [{ data: musicos }, { data: organizadores }] = await Promise.all([
        supabase
          .from("perfil_musico")
          .select("usuario_id, apelido, foto_url, genero_musical, usuario:usuario_id(nome)")
          .ilike("apelido", termo)
          .limit(5),
        supabase
          .from("perfil_organizador")
          .select("usuario_id, nicho_trabalho, usuario:usuario_id!inner(nome)")
          .ilike("usuario.nome", termo)
          .limit(5),
      ]);

      const perfis = [
        ...(musicos ?? []).map((m: any) => ({
          tipo: "musico",
          id: m.usuario_id,
          titulo: m.apelido ?? (Array.isArray(m.usuario) ? m.usuario[0]?.nome : m.usuario?.nome),
          subtitulo: m.genero_musical || "Artista",
          foto_url: m.foto_url,
        })),
        ...(organizadores ?? []).map((o: any) => ({
          tipo: "organizador",
          id: o.usuario_id,
          titulo: Array.isArray(o.usuario) ? o.usuario[0]?.nome : o.usuario?.nome,
          subtitulo: o.nicho_trabalho || "Organizador",
          foto_url: null,
        })),
      ];
      itens = [...itens, ...perfis];
    }

    if (aba === "todos" || aba === "musicas") {
      const { data: musicas } = await supabase
        .from("musica")
        .select("id, nome, capa_url, genero, usuario_id, arquivo_url")
        .ilike("nome", termo)
        .limit(6);

      const apelidos = await buscarApelidos((musicas ?? []).map((m: any) => m.usuario_id));
      const listaMusicas = (musicas ?? []).map((m: any) => ({
        tipo: "musica",
        id: m.id,
        usuario_id: m.usuario_id,
        titulo: m.nome,
        subtitulo: `Música · ${m.genero || ""}`,
        foto_url: m.capa_url,
        arquivo_url: m.arquivo_url,
        autor_apelido: apelidos.get(m.usuario_id) ?? null,
      }));
      itens = [...itens, ...listaMusicas];
    }

    if (aba === "todos" || aba === "albuns") {
      const { data: albuns } = await supabase
        .from("album")
        .select("id, nome, capa_url, usuario_id")
        .ilike("nome", termo)
        .limit(5);

      const listaAlbuns = (albuns ?? []).map((a: any) => ({
        tipo: "album",
        id: a.id,
        usuario_id: a.usuario_id,
        titulo: a.nome,
        subtitulo: "Álbum",
        foto_url: a.capa_url,
      }));
      itens = [...itens, ...listaAlbuns];
    }

    setResultados(itens);
    setCarregando(false);
  }

  function selecionarItem(item: any) {
    onClose();
    if (item.tipo === "musico" || item.tipo === "organizador") {
      abrirPerfil(item.usuario_id || item.id);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60">
        {/* Backdrop para fechar ao clicar fora */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* CONTAINER DO OVERLAY estilo YT Music */}
        <View className="mt-12 mx-4 max-w-[600px] self-center w-full rounded-3xl overflow-hidden border border-white/10 bg-[#0F172A]/95 ">
          <BlurView intensity={40} tint="dark" className="p-4">
            
            {/* INPUT DE BUSCA */}
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-14">
              <Search color="#64748B" size={20} />
              <TextInput
                placeholder="Pesquisar músicas, artistas, álbuns..."
                placeholderTextColor="#64748B"
                value={busca}
                onChangeText={setBusca}
                autoFocus
                selectionColor="#3B82F6"
                className="flex-1 ml-3 text-white font-medium text-base focus:outline-none"
                style={{ color: "#FFFFFF" }}
              />
              {carregando ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : busca.length > 0 ? (
                <Pressable onPress={() => setBusca("")} className="p-1">
                  <X color="#94A3B8" size={18} />
                </Pressable>
              ) : null}
            </View>

            {/* ABAS / FILTROS RÁPIDOS */}
            <View className="flex-row gap-2 mt-3">
              {(["todos", "musicas", "albuns", "perfis"] as Aba[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setAba(item)}
                  className={`px-3 py-1.5 rounded-full border ${
                    aba === item
                      ? "bg-primary border-primary"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <Text className={`text-xs font-semibold capitalize ${aba === item ? "text-white" : "text-gray-400"}`}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* RESULTADOS DA BUSCA */}
            {resultados.length > 0 && (
              <View className="mt-4 max-h-[380px]">
                <FlatList
                  data={resultados}
                  keyExtractor={(item, index) => `${item.tipo}-${item.id}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => selecionarItem(item)}
                      className="flex-row items-center p-2.5 rounded-xl active:bg-white/10 hover:bg-white/5 transition-all"
                    >
                      {item.foto_url ? (
                        <Image
                          source={{ uri: item.foto_url }}
                          className={`w-11 h-11 mr-3 ${
                            item.tipo === "musico" || item.tipo === "organizador"
                              ? "rounded-full"
                              : "rounded-lg"
                          }`}
                        />
                      ) : (
                        <View
                          className={`w-11 h-11 mr-3 bg-white/10 border border-white/10 items-center justify-center ${
                            item.tipo === "musico" || item.tipo === "organizador"
                              ? "rounded-full"
                              : "rounded-lg"
                          }`}
                        >
                          <Music color="#3B82F6" size={18} />
                        </View>
                      )}

                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-white font-semibold text-sm">
                          {item.titulo}
                        </Text>
                        <Text numberOfLines={1} className="text-gray-400 text-xs mt-0.5">
                          {item.subtitulo}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}
