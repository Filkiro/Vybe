import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Trash2, X, Check, Sparkles, Calendar, ArrowRight, Lightbulb, Music, Disc, Image as ImageIcon, Upload } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { enviarArquivoParaStorage } from "../lib/upload";
import { useAuthStore } from "../store/authStore";
import { PublicacaoCard, PublicacaoFeedItem } from "../components/PublicacaoCard";
import { confirmar, avisar } from "../lib/alertas";

type Publicacao = PublicacaoFeedItem & { status?: string };

export default function MinhasPublicacoes() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricaoEdicao, setDescricaoEdicao] = useState("");
  const [fotoEdicaoUri, setFotoEdicaoUri] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [itemLinkadoEdicao, setItemLinkadoEdicao] = useState<{tipo: "musica" | "album", id: string, nome: string} | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [apagandoId, setApagandoId] = useState<string | null>(null);

  const [minhasMusicas, setMinhasMusicas] = useState<any[]>([]);
  const [meusAlbuns, setMeusAlbuns] = useState<any[]>([]);

  useEffect(() => {
    if (usuario) {
      carregar();
      supabase.from("Música").select("id, nome").eq("usuario_id", usuario.id).then(({data}) => setMinhasMusicas(data ?? []));
      supabase.from("Álbum").select("id, nome").eq("usuario_id", usuario.id).then(({data}) => setMeusAlbuns(data ?? []));
    }
  }, [usuario?.id]);
  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    
    // Fetch posts
    const { data: posts } = await supabase
      .from("publicacao")
      .select("id, usuario_id, foto_url, descricao, criado_em, evento_id, musica_id, album_id, status, usuario:usuario_id(nome, tipo_conta), evento:evento_id(nome, data, localizacao), musica:musica_id(id, nome, capa_url, arquivo_url), album:album_id(id, nome, capa_url)")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false });

    if (!posts) {
      setPublicacoes([]);
      setCarregando(false);
      return;
    }

    // Fetch user profile info
    const { data: perfisMusico } = await supabase.from("perfil_musico").select("usuario_id, apelido, foto_url").eq("usuario_id", usuario.id);
    const { data: perfisOrg } = await supabase.from("perfil_organizador").select("usuario_id, banner_url").eq("usuario_id", usuario.id);

    // Fetch likes
    let likesSet = new Set();
    try {
      const { data: meusLikes } = await supabase.from("curtida_publicacao").select("publicacao_id").eq("usuario_id", usuario.id);
      likesSet = new Set(meusLikes?.map((l: any) => l.publicacao_id));
    } catch (e) {}

    let contagemLikes = null;
    try {
      const resp = await supabase.from("curtida_publicacao").select("publicacao_id");
      contagemLikes = resp.data;
    } catch (e) {}
    
    const mapaLikes: Record<string, number> = {};
    if (contagemLikes) {
      contagemLikes.forEach((l: any) => {
        mapaLikes[l.publicacao_id] = (mapaLikes[l.publicacao_id] || 0) + 1;
      });
    }

    const formatados = posts.map((p: any) => {
      let apelido = null;
      let foto = null;
      if (p.usuario?.tipo_conta === "musico") {
        const perf = perfisMusico?.find((x) => x.usuario_id === p.usuario_id);
        if (perf) { apelido = perf.apelido; foto = perf.foto_url; }
      } else if (p.usuario?.tipo_conta === "organizador") {
        const perf = perfisOrg?.find((x) => x.usuario_id === p.usuario_id);
        if (perf) { foto = perf.banner_url; }
      }

      return {
        ...p,
        apelido,
        foto_perfil_url: foto,
        total_curtidas: mapaLikes[p.id] || 0,
        curtido_por_mim: likesSet.has(p.id),
      };
    });

    setPublicacoes(formatados as any);
    setCarregando(false);
  }
  function iniciarEdicao(item: Publicacao) {
    setEditandoId(item.id);
    setDescricaoEdicao(item.descricao ?? "");
    setFotoEdicaoUri(null);
    setRemoverFoto(false);
    if (item.musica) {
      setItemLinkadoEdicao({ tipo: "musica", id: item.musica_id as string, nome: item.musica.nome });
    } else if (item.album) {
      setItemLinkadoEdicao({ tipo: "album", id: item.album_id as string, nome: item.album.nome });
    } else {
      setItemLinkadoEdicao(null);
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setDescricaoEdicao("");
    setFotoEdicaoUri(null);
    setRemoverFoto(false);
    setItemLinkadoEdicao(null);
  }

  async function escolherNovaFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      avisar("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setFotoEdicaoUri(resultado.assets[0].uri);
  }
  async function salvarEdicao(item: Publicacao) {
    if (!usuario) return;
    setSalvando(true);
    try {
      let fotoUrl = item.foto_url;
      if (removerFoto) {
        fotoUrl = null;
      } else if (fotoEdicaoUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: fotoEdicaoUri,
          nomeArquivo: `${usuario.id}-post-${item.id}-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      let m_id = null;
      let a_id = null;
      if (itemLinkadoEdicao) {
        if (itemLinkadoEdicao.tipo === "musica") m_id = itemLinkadoEdicao.id;
        else if (itemLinkadoEdicao.tipo === "album") a_id = itemLinkadoEdicao.id;
      }

      const { error } = await supabase
        .from("publicacao")
        .update({ 
          descricao: descricaoEdicao || null, 
          foto_url: fotoUrl,
          musica_id: m_id,
          album_id: a_id
        })
        .eq("id", item.id);
      if (error) throw error;

      // Optimistic update
      const updatedP = { 
        ...item, 
        descricao: descricaoEdicao || null, 
        foto_url: fotoUrl,
        musica_id: m_id,
        album_id: a_id,
        musica: itemLinkadoEdicao?.tipo === 'musica' ? { nome: itemLinkadoEdicao.nome, id: itemLinkadoEdicao.id, arquivo_url: '', capa_url: null } : null,
        album: itemLinkadoEdicao?.tipo === 'album' ? { nome: itemLinkadoEdicao.nome, id: itemLinkadoEdicao.id, capa_url: null } : null,
      };

      setPublicacoes((atual) =>
        atual.map((p) => (p.id === item.id ? updatedP : p))
      );
      cancelarEdicao();
    } catch (e: any) {
      avisar("Erro ao salvar", e.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(item: Publicacao) {
    const ok = await confirmar("Apagar publicação?", "Essa ação não pode ser desfeita.", "Apagar");
    if (!ok) return;

    setApagandoId(item.id);
    const { error } = await supabase.from("publicacao").delete().eq("id", item.id);
    setApagandoId(null);
    if (error) {
      avisar("Erro ao apagar", error.message);
      return;
    }
    setPublicacoes((atual) => atual.filter((p) => p.id !== item.id));
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-[#0a0e16] items-center justify-center px-8">
        <Text className="text-[#8d90a0] text-center">Entre na sua conta para gerenciar suas publicações.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0e16]" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 1152, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View className="flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <View className="flex-col gap-1">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 mb-2 active:opacity-70 group">
              <ChevronLeft color="#8d90a0" size={20} />
              <Text className="text-[#8d90a0] font-medium text-sm tracking-wide">Voltar ao Perfil</Text>
            </Pressable>
            <Text className="text-white font-bold text-3xl tracking-tight">Minhas Publicações</Text>
            <Text className="text-[#8d90a0] text-sm max-w-2xl mt-1">
              Gerencie, edite ou exclua as postagens e novidades compartilhadas na comunidade autoral do Vybe.
            </Text>
          </View>
        </View>

        {carregando ? (
          <Text className="text-[#8d90a0] text-center mt-8">Carregando...</Text>
        ) : (
          <View className="flex-col lg:flex-row gap-8 items-start">
            
            {/* Left Column: Posts List */}
            <View className="flex-1 w-full flex-col gap-8 items-center">
              {publicacoes.length === 0 && (
                 <Text className="text-[#8d90a0] text-center mt-8">Você ainda não tem publicações. Crie uma na aba Criar.</Text>
              )}
              {publicacoes.map(item => {
                  return (
                    <View key={item.id} className="w-full max-w-xl mb-6 relative">
                      {editandoId === item.id ? (
                        <View className="bg-[#181c24] rounded-2xl overflow-hidden shadow-2xl flex-col border border-white/5">
                          {/* Edit Form */}
                          <View className="p-4 flex-col gap-5">
                            <Text className="text-white font-semibold text-lg">Editar Publicação</Text>
                            
                            <View className="flex-col gap-2">
                              <Text className="text-[#8d90a0] text-sm font-medium">Legenda</Text>
                              <TextInput
                                value={descricaoEdicao}
                                onChangeText={setDescricaoEdicao}
                                multiline
                                placeholder="Descreva sua publicação..."
                                placeholderTextColor="#64748b"
                                className="border border-[#31353e] rounded-xl px-4 py-3 bg-[#0a0e16] text-white text-sm min-h-[100px]"
                                textAlignVertical="top"
                              />
                            </View>

                            <View className="flex-col gap-2">
                              <Text className="text-[#8d90a0] text-sm font-medium">Imagem Anexada</Text>
                              {fotoEdicaoUri || (item.foto_url && !removerFoto) ? (
                                <View className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#0a0e16] border border-white/5">
                                  <Image source={{ uri: fotoEdicaoUri || item.foto_url! }} className="w-full h-full object-cover" />
                                  <Pressable
                                    onPress={() => setRemoverFoto(true)}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-white/20 items-center justify-center"
                                  >
                                    <X size={16} color="white" />
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  onPress={escolherNovaFoto}
                                  className="rounded-xl bg-[#0a0e16] border border-dashed border-white/10 p-6 flex-col items-center justify-center"
                                >
                                  <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center mb-3">
                                    <ImageIcon size={20} color="#94a3b8" />
                                  </View>
                                  <Text className="text-[#94a3b8] text-xs font-medium">Trocar ou Adicionar Foto</Text>
                                </Pressable>
                              )}
                            </View>

                            <View className="flex-col gap-2">
                              <Text className="text-[#8d90a0] text-sm font-medium">Item do Catálogo</Text>
                              {itemLinkadoEdicao ? (
                                <View className="p-3 rounded-xl bg-[#0a0e16] border border-[#3b82f6]/30 flex-row items-center justify-between gap-3">
                                  <View className="flex-row items-center gap-3 flex-1">
                                    <View className="w-10 h-10 rounded-lg bg-[#3b82f6] items-center justify-center overflow-hidden">
                                      {itemLinkadoEdicao.tipo === "album" ? <Disc size={18} color="white" /> : <Music size={18} color="white" />}
                                    </View>
                                    <View className="flex-1">
                                      <Text className="text-xs font-bold text-white" numberOfLines={1}>{itemLinkadoEdicao.nome}</Text>
                                      <Text className="text-[10px] text-[#3B82F6] font-bold">
                                        {itemLinkadoEdicao.tipo === "album" ? "Álbum" : "Música"}
                                      </Text>
                                    </View>
                                  </View>
                                  <Pressable onPress={() => setItemLinkadoEdicao(null)} className="p-2">
                                    <X size={16} color="#94a3b8" />
                                  </Pressable>
                                </View>
                              ) : (
                                <View className="flex-col gap-2">
                                  {meusAlbuns.map(a => (
                                    <Pressable key={`ea-${a.id}`} onPress={() => setItemLinkadoEdicao({tipo:'album', id: a.id, nome: a.nome})} className="flex-row items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                      <Disc size={16} color="#94a3b8" className="mr-3" />
                                      <Text className="text-[#94a3b8] text-xs flex-1">{a.nome} (Álbum)</Text>
                                    </Pressable>
                                  ))}
                                  {minhasMusicas.map(m => (
                                    <Pressable key={`em-${m.id}`} onPress={() => setItemLinkadoEdicao({tipo:'musica', id: m.id, nome: m.nome})} className="flex-row items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                      <Music size={16} color="#94a3b8" className="mr-3" />
                                      <Text className="text-[#94a3b8] text-xs flex-1">{m.nome} (Música)</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              )}
                            </View>

                            <View className="flex-row items-center gap-3 mt-4 pt-4 border-t border-white/5">
                              <Pressable
                                onPress={cancelarEdicao}
                                disabled={salvando}
                                className="flex-1 bg-[#1c2028] hover:bg-[#262a33] rounded-xl py-3 items-center flex-row justify-center gap-2 border border-white/5 active:scale-[0.98]"
                              >
                                <X color="#dfe2ee" size={16} />
                                <Text className="text-[#dfe2ee] font-semibold text-sm">Cancelar</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => salvarEdicao(item)}
                                disabled={salvando}
                                className="flex-1 bg-[#2563eb] hover:bg-[#3761ea] rounded-xl py-3 items-center flex-row justify-center gap-2 shadow-[0_0_12px_rgba(37,99,235,0.4)] active:scale-[0.98]"
                              >
                                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <><Check color="#fff" size={16} /><Text className="text-white font-semibold text-sm">Salvar</Text></>}
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <PublicacaoCard 
                          item={item} 
                          noMargin 
                          esconderOpcoes 
                          footer={
                            <View className="px-5 pb-4">
                              <View className="pt-4 border-t border-white/5 flex-row items-center gap-3 flex-wrap">
                                {item.status === 'rascunho' && (
                                  <Pressable
                                    onPress={async () => {
                                      await supabase.from("publicacao").update({ status: "ativo" }).eq("id", item.id);
                                      setPublicacoes((atual) => atual.map((p) => p.id === item.id ? { ...p, status: "ativo" } : p));
                                    }}
                                    className="flex-1 inline-flex flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-[0.98] border border-emerald-500/20 min-w-[120px]"
                                  >
                                    <Check color="#10B981" size={16} />
                                    <Text className="text-[#10B981] font-medium text-sm">Publicar</Text>
                                  </Pressable>
                                )}
                                <Pressable
                                  onPress={() => iniciarEdicao(item)}
                                  className="flex-1 inline-flex flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-[0.98] border border-white/10 min-w-[120px]"
                                >
                                  <Pencil color="#dfe2ee" size={16} />
                                  <Text className="text-[#dfe2ee] font-medium text-sm">Editar</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => apagar(item)}
                                  disabled={apagandoId === item.id}
                                  className="flex-1 inline-flex flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#93000a]/20 hover:bg-[#93000a]/30 transition-all active:scale-[0.98] border border-[#93000a]/30 min-w-[120px]"
                                >
                                  {apagandoId === item.id ? (
                                    <ActivityIndicator color="#ffb4ab" size="small" />
                                  ) : (
                                    <>
                                      <Trash2 color="#ffb4ab" size={16} />
                                      <Text className="text-[#ffb4ab] font-medium text-sm">Apagar</Text>
                                    </>
                                  )}
                                </Pressable>
                              </View>
                            </View>
                          }
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Right Column: Insights Deck */}
            <View className="hidden lg:flex w-[320px] flex-col gap-4">
              <View className="bg-[#181c24] p-6 rounded-xl shadow-lg flex-col gap-4 border border-white/5 sticky top-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Lightbulb color="#b4c5ff" size={22} />
                  <Text className="text-white font-semibold text-lg">Dicas de Engajamento</Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <Check color="#b4c5ff" size={16} className="mt-0.5 shrink-0" />
                  <Text className="text-[#8d90a0] text-sm flex-1 leading-relaxed">Inclua bastidores de gravação ou trechos de processos criativos na legenda.</Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <Check color="#b4c5ff" size={16} className="mt-0.5 shrink-0" />
                  <Text className="text-[#8d90a0] text-sm flex-1 leading-relaxed">Sempre vincule sua publicação à faixa completa no player oficial.</Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <Check color="#b4c5ff" size={16} className="mt-0.5 shrink-0" />
                  <Text className="text-[#8d90a0] text-sm flex-1 leading-relaxed">Responda aos comentários da comunidade nas primeiras 24 horas.</Text>
                </View>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

