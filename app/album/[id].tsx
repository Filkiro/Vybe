import { useCallback, useState, useRef } from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator, ImageBackground, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ChevronLeft, Plus, Check, Disc, Pencil, Play, Clock } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { colors } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

type FaixaAlbum = {
  id: string;
  nome: string;
  capa_url: string | null;
  arquivo_url: string;
};

export default function AlbumDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();

  const [carregando, setCarregando] = useState(true);
  const [album, setAlbum] = useState<any>(null);
  const [autorNome, setAutorNome] = useState<string | null>(null);
  const [faixas, setFaixas] = useState<FaixaAlbum[]>([]);
  const [minhasForaDoAlbum, setMinhasForaDoAlbum] = useState<FaixaAlbum[]>([]);
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [adicionando, setAdicionando] = useState(false);

  const souDono = !!usuarioLogado && !!album && usuarioLogado.id === album.usuario_id;
  const jaCarregouUmaVez = useRef(false);

  const carregar = useCallback(async (mostrarCarregando = true) => {
    if (!id) return;
    if (mostrarCarregando) setCarregando(true);

    const { data: dadosAlbum } = await supabase.from("album").select("*").eq("id", id).single();
    setAlbum(dadosAlbum ?? null);

    if (dadosAlbum) {
      const [{ data: perfilAutor }, { data: itensAlbum }] = await Promise.all([
        supabase.from("perfil_musico").select("apelido").eq("usuario_id", dadosAlbum.usuario_id).single(),
        supabase
          .from("album_musica")
          .select("musica:musica_id(id, nome, capa_url, arquivo_url, status)")
          .eq("album_id", id),
      ]);

      setAutorNome(perfilAutor?.apelido ?? null);

      const listaFaixas: FaixaAlbum[] = (itensAlbum ?? [])
        .map((item: any) => item.musica)
        .filter((m: any) => m && m.status === "ativo");
      setFaixas(listaFaixas);

      if (usuarioLogado?.id === dadosAlbum.usuario_id) {
        const idsNoAlbum = listaFaixas.map((m) => m.id);
        let query = supabase
          .from("musica")
          .select("id, nome, capa_url, arquivo_url")
          .eq("usuario_id", dadosAlbum.usuario_id)
          .eq("status", "ativo");
        if (idsNoAlbum.length > 0) {
          query = query.not("id", "in", `(${idsNoAlbum.join(",")})`);
        }
        const { data: fora } = await query;
        setMinhasForaDoAlbum(fora ?? []);
      } else {
        setMinhasForaDoAlbum([]);
      }
    }

    setCarregando(false);
  }, [id, usuarioLogado?.id]);

  useFocusEffect(
    useCallback(() => {
      carregar(!jaCarregouUmaVez.current);
      jaCarregouUmaVez.current = true;
    }, [carregar])
  );

  function tocarFaixa(item: FaixaAlbum) {
    requireAuth(() => {
      const fila = faixas.map((f) => ({
        id: f.id,
        nome: f.nome,
        autorApelido: autorNome,
        arquivoUrl: f.arquivo_url,
        capaUrl: f.capa_url,
      }));
      tocarMusica(
        { id: item.id, nome: item.nome, autorApelido: autorNome, arquivoUrl: item.arquivo_url, capaUrl: item.capa_url },
        fila
      );
      router.push("/tocando");
    });
  }

  function alternarSelecao(idMusica: string) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(idMusica)) nova.delete(idMusica);
      else nova.add(idMusica);
      return nova;
    });
  }

  async function adicionarSelecionadas() {
    if (selecionadas.size === 0 || !album) return;
    setAdicionando(true);
    const { error } = await supabase
      .from("album_musica")
      .insert(Array.from(selecionadas).map((musica_id) => ({ album_id: album.id, musica_id })));
    setAdicionando(false);
    if (error) return;

    setSelecionadas(new Set());
    setMostrarAdicionar(false);
    carregar();
  }

  if (carregando || !album) {
    return (
      <View className="flex-1 bg-[#0B101E] items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0B101E]">
      {/* Background Blur */}
      {album.capa_url && (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: album.capa_url }} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} blurRadius={70} />
          <LinearGradient colors={["transparent", "#0B101E", "#0B101E"]} style={StyleSheet.absoluteFill} locations={[0, 0.4, 1]} />
        </View>
      )}

      {/* Header Fixo */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-2 z-50 w-full max-w-[1200px] self-center">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
          <ChevronLeft color="white" size={24} />
        </Pressable>
        {souDono && (
          <Pressable onPress={() => router.push(`/album/editar/${album.id}`)} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
            <Pencil color="white" size={20} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} className="w-full max-w-[1200px] self-center">
        {/* Capa e Info do Álbum */}
        <View className="items-center px-6 pt-6 pb-8">
          <View className="shadow-2xl shadow-black/50 rounded-2xl mb-6">
            {album.capa_url ? (
              <Image source={{ uri: album.capa_url }} style={{ width: 220, height: 220, borderRadius: 24 }} />
            ) : (
              <View style={{ width: 220, height: 220, borderRadius: 24 }} className="bg-[#1A2235] items-center justify-center border border-white/5">
                <Disc color={colors.muted} size={64} />
              </View>
            )}
          </View>
          <Text className="text-3xl font-extrabold text-white text-center mb-2">{album.nome}</Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-6 h-6 rounded-full bg-primary/20 items-center justify-center border border-primary/30">
              <Text className="text-primary text-[10px] font-bold">BY</Text>
            </View>
            <Text className="text-gray-300 font-medium">{autorNome ?? "Autor desconhecido"}</Text>
          </View>
          <View className="bg-white/5 rounded-full px-4 py-1.5 flex-row items-center gap-2 border border-white/10">
            <Clock size={14} color="#94A3B8" />
            <Text className="text-muted text-xs font-semibold uppercase tracking-wider">{faixas.length} {faixas.length === 1 ? "FAIXA" : "FAIXAS"}</Text>
          </View>
        </View>

        {/* Play Button Flutuante (Opcional visual) */}
        {faixas.length > 0 && (
          <View className="flex-row justify-center mb-10">
            <Pressable onPress={() => tocarFaixa(faixas[0])} className="bg-primary flex-row items-center justify-center rounded-full px-8 py-3.5 shadow-lg shadow-primary/30 active:scale-95 transition-transform">
              <Play fill="white" color="white" size={20} style={{ marginLeft: 4 }} />
              <Text className="text-white font-bold ml-2 text-base">Tocar Álbum</Text>
            </Pressable>
          </View>
        )}

        {/* Lista de Faixas */}
        <View className="px-5">
          {faixas.length === 0 ? (
            <View className="items-center py-10 bg-white/5 rounded-3xl border border-white/10">
              <Disc color="#64748B" size={48} className="mb-4 opacity-50" />
              <Text className="text-gray-300 font-medium">Nenhuma faixa neste álbum ainda.</Text>
            </View>
          ) : (
            faixas.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => tocarFaixa(item)}
                className="flex-row items-center p-3 mb-2 bg-[#121829] border border-white/5 rounded-2xl active:opacity-70 transition-opacity"
              >
                <Text className="text-muted font-bold text-sm w-6 text-center mr-2">{index + 1}</Text>
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} style={{ width: 44, height: 44 }} className="rounded-xl mr-3 bg-[#1A2235]" />
                ) : (
                  <View style={{ width: 44, height: 44 }} className="rounded-xl bg-[#1A2235] mr-3 items-center justify-center border border-white/5">
                    <Disc color="#64748B" size={16} />
                  </View>
                )}
                <View className="flex-1 justify-center">
                  <Text numberOfLines={1} className="text-white font-bold text-sm mb-0.5">{item.nome}</Text>
                  <Text numberOfLines={1} className="text-gray-400 text-xs">{autorNome ?? "Autor desconhecido"}</Text>
                </View>
                <View className="w-8 h-8 items-center justify-center rounded-full bg-white/5 border border-white/10 ml-2">
                  <Play color="#94A3B8" fill="#94A3B8" size={12} style={{ marginLeft: 2 }} />
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Área de Gerenciamento do Dono */}
        {souDono && (
          <View className="px-5 mt-10">
            {!mostrarAdicionar ? (
              <Pressable
                onPress={() => setMostrarAdicionar(true)}
                className="flex-row items-center justify-center bg-white/5 border border-dashed border-white/20 rounded-3xl py-5 active:bg-white/10 transition-colors"
              >
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                  <Plus color={colors.primary} size={20} />
                </View>
                <Text className="text-gray-300 font-bold text-sm">Adicionar músicas ao álbum</Text>
              </Pressable>
            ) : (
              <View className="bg-[#1A2235] border border-white/10 rounded-3xl p-5 shadow-2xl">
                <Text className="text-white font-extrabold text-lg mb-1">Músicas Disponíveis</Text>
                <Text className="text-gray-400 text-xs mb-5">Selecione suas músicas soltas para incluir.</Text>

                {minhasForaDoAlbum.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-muted text-center text-sm">Nenhuma música fora do álbum disponível.</Text>
                  </View>
                ) : (
                  minhasForaDoAlbum.map((item) => {
                    const marcada = selecionadas.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => alternarSelecao(item.id)}
                        className={`flex-row items-center p-3 mb-2 rounded-2xl border transition-all ${marcada ? "bg-primary/10 border-primary/30" : "bg-black/20 border-white/5"}`}
                      >
                        {item.capa_url ? (
                          <Image source={{ uri: item.capa_url }} style={{ width: 44, height: 44 }} className="rounded-xl mr-3" />
                        ) : (
                          <View style={{ width: 44, height: 44 }} className="rounded-xl bg-surface mr-3 border border-white/5" />
                        )}
                        <Text numberOfLines={1} className={`flex-1 font-bold ${marcada ? "text-primary" : "text-gray-300"}`}>
                          {item.nome}
                        </Text>
                        <View className={`w-6 h-6 items-center justify-center rounded-full border ${marcada ? "bg-primary border-primary" : "bg-transparent border-white/20"}`}>
                          {marcada && <Check color="#fff" size={14} />}
                        </View>
                      </Pressable>
                    );
                  })
                )}

                <View className="flex-row gap-3 mt-6">
                  <Pressable onPress={() => { setMostrarAdicionar(false); setSelecionadas(new Set()); }} className="flex-1 border border-white/10 bg-white/5 rounded-full py-3.5 items-center">
                    <Text className="text-gray-300 font-bold">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={adicionarSelecionadas}
                    disabled={selecionadas.size === 0 || adicionando}
                    className={`flex-1 rounded-full py-3.5 items-center flex-row justify-center ${selecionadas.size === 0 ? "bg-white/10" : "bg-primary shadow-lg shadow-primary/30"}`}
                  >
                    {adicionando ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Plus color={selecionadas.size === 0 ? "#64748B" : "#fff"} size={16} />
                        <Text className={`font-bold ml-1 ${selecionadas.size === 0 ? "text-[#64748B]" : "text-white"}`}>Incluir ({selecionadas.size})</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
