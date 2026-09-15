import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { Search, X, Music } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAbrirPerfil } from "../store/perfilModalStore";
import { router } from "expo-router";

type Aba = "todos" | "musicas" | "albuns" | "perfis";

export function SearchInputDesktop() {
  const abrirPerfil = useAbrirPerfil();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Aba>("todos");
  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [focado, setFocado] = useState(false);

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
        .select("id, nome, capa_url, genero, usuario_id")
        .ilike("nome", termo)
        .limit(6);

      const listaMusicas = (musicas ?? []).map((m: any) => ({
        tipo: "musica",
        id: m.id,
        usuario_id: m.usuario_id,
        titulo: m.nome,
        subtitulo: "Música • " + (m.genero || ""),
        foto_url: m.capa_url,
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
    setBusca("");
    setFocado(false);
    if (item.tipo === "musico" || item.tipo === "organizador" || item.tipo === "musica") {
      abrirPerfil(item.usuario_id || item.id);
    } else if (item.tipo === "album") {
      router.push(`/album/${item.id}`);
    }
  }

  const mostrarDropdown = focado && (busca.length > 0 || resultados.length > 0);

  return (
    <View style={{ flex: 1, minWidth: 250, maxWidth: 420, zIndex: 1000, position: "relative" }}>
      {mostrarDropdown && (
        <Pressable
          style={{ position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
          onPress={() => setFocado(false)}
        />
      )}

      <View 
        className={"flex-row items-center bg-[#1A2235] border h-11 rounded-full px-3 z-[1001] overflow-hidden " + (focado ? "border-primary  " : "border-white/10")}
      >
        <View className="mr-2 shrink-0">
          <Search color={focado ? "#3B82F6" : "#8B95A8"} size={18} />
        </View>
        <TextInput
          placeholder="Pesquisar músicas, artistas, álbuns..."
          placeholderTextColor="#8B95A8"
          value={busca}
          onChangeText={setBusca}
          onFocus={() => setFocado(true)}
          selectionColor="#3B82F6"
          className="flex-1 text-white font-medium text-sm focus:outline-none"
        />
        {carregando ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : busca.length > 0 ? (
          <Pressable onPress={() => setBusca("")} className="p-1 active:opacity-60">
            <X color="#94A3B8" size={16} />
          </Pressable>
        ) : null}
      </View>

      {mostrarDropdown && (
        <View 
          className="absolute left-0 right-0 mt-14 rounded-2xl border border-white/10 bg-[#0F172A]/95 overflow-hidden  z-[1001]"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.6, shadowRadius: 20 }}
        >
          <BlurView intensity={40} tint="dark" className="p-3">
            <View className="flex-row gap-2 mb-3 px-1">
              {(["todos", "musicas", "albuns", "perfis"] as Aba[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setAba(item)}
                  className={"px-3 py-1.5 rounded-full border " + (aba === item ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                >
                  <Text className={"text-xs font-semibold capitalize " + (aba === item ? "text-white" : "text-gray-400")}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            {resultados.length > 0 ? (
              <View className="max-h-[350px]">
                <FlatList
                  showsVerticalScrollIndicator={false}
                  data={resultados}
                  keyExtractor={(item, index) => `${item.tipo}-${item.id}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => selecionarItem(item)}
                      className="flex-row items-center p-2.5 rounded-xl active:bg-white/10 hover:bg-white/5 transition-colors"
                    >
                      {item.foto_url ? (
                        <Image
                          source={{ uri: item.foto_url }}
                          className={"w-10 h-10 mr-3 " + (item.tipo === "musico" || item.tipo === "organizador" ? "rounded-full" : "rounded-lg")}
                        />
                      ) : (
                        <View
                          className={"w-10 h-10 mr-3 bg-white/10 border border-white/10 items-center justify-center " + (item.tipo === "musico" || item.tipo === "organizador" ? "rounded-full" : "rounded-lg")}
                        >
                          <Music color="#3B82F6" size={16} />
                        </View>
                      )}

                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-white font-semibold text-sm">
                          {item.titulo}
                        </Text>
                        <Text numberOfLines={1} className="text-gray-400 text-[11px] mt-0.5">
                          {item.subtitulo}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            ) : (
              <Text className="text-muted text-center py-6 text-sm">Nenhum resultado encontrado.</Text>
            )}
          </BlurView>
        </View>
      )}
    </View>
  );
}
