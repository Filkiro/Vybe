import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet, ScrollView, Share, TextInput, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Flag, Share2, ShieldCheck, UserCheck, Sparkles, MessageCircle } from "lucide-react-native";
import { supabase, Usuario } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { useRequireAuth } from "../../store/authPromptStore";
import { avisar } from "../../lib/alertas";
import { colors, rotulosTipoConta } from "../../constants/theme";

// Tela dedicada para ver o perfil de QUALQUER outra pessoa — sempre
// uma rota nova (não reaproveita a pilha da aba Perfil), então
// nunca "gruda" o perfil de alguém na próxima vez que você abre o
// seu próprio.
export default function PerfilPublico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();
  const { width } = useWindowDimensions();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [dadosPerfil, setDadosPerfil] = useState<any>(null);
  const [musicas, setMusicas] = useState<any[]>([]);
  const [albuns, setAlbuns] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contatando, setContatando] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [motivoEscolhido, setMotivoEscolhido] = useState<string | null>(null);
  const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
  const [erroDenuncia, setErroDenuncia] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    setCarregando(true);
    const { data: dadosUsuario } = await supabase.from("usuario").select("*").eq("id", id).single();
    setUsuario(dadosUsuario ?? null);

    if (dadosUsuario?.tipo_conta === "musico") {
      const [{ data: perfil }, { data: minhasMusicas }, { data: meusAlbuns }] = await Promise.all([
        supabase.from("perfil_musico").select("*").eq("usuario_id", id).single(),
        supabase
          .from("musica")
          .select("id, nome, capa_url, arquivo_url")
          .eq("usuario_id", id)
          .eq("status", "ativo")
          .order("data_lancamento", { ascending: false }),
        supabase
          .from("album")
          .select("id, nome, capa_url")
          .eq("usuario_id", id)
          .eq("status", "ativo")
          .order("criado_em", { ascending: false }),
      ]);
      setDadosPerfil(perfil ?? null);
      setMusicas(minhasMusicas ?? []);
      setAlbuns(meusAlbuns ?? []);
    } else if (dadosUsuario?.tipo_conta === "organizador") {
      const { data: perfil } = await supabase.from("perfil_organizador").select("*").eq("usuario_id", id).single();
      setDadosPerfil(perfil ?? null);
    }
    setCarregando(false);
  }

  async function contatar() {
    if (!usuario) return;
    if (!usuarioLogado) {
      requireAuth(() => {});
      return;
    }
    setContatando(true);

    const { data: existente } = await supabase
      .from("conversa")
      .select("id")
      .or(
        `and(usuario_id1.eq.${usuarioLogado.id},usuario_id2.eq.${usuario.id}),and(usuario_id1.eq.${usuario.id},usuario_id2.eq.${usuarioLogado.id})`
      )
      .maybeSingle();

    let conversaId = existente?.id;
    if (!conversaId) {
      const { data: nova, error } = await supabase
        .from("conversa")
        .insert({ usuario_id1: usuarioLogado.id, usuario_id2: usuario.id })
        .select("id")
        .single();
      if (error || !nova) {
        setContatando(false);
        avisar("Erro", "Não foi possível iniciar a conversa.");
        return;
      }
      conversaId = nova.id;
    }

    setContatando(false);
    router.push(`/chat/${conversaId}?contatoNome=${encodeURIComponent(usuario.nome)}&contatoFotoUrl=${dadosPerfil?.foto_url ? encodeURIComponent(dadosPerfil.foto_url) : ""}`);
  }

  async function compartilharPerfil() {
    await Share.share({ message: `Confira o perfil de ${usuario?.nome} no Vybe: vybe://usuario/${usuario?.id}` });
  }

  async function enviarDenuncia(motivo: string, descricao: string | null) {
    if (!usuarioLogado || !usuario) return;
    const { error } = await supabase
      .from("denuncia")
      .insert({ denunciante_id: usuarioLogado.id, tipo_alvo: "usuario", alvo_id: usuario.id, motivo, descricao });
    setDenunciaAberta(false);
    setMotivoEscolhido(null);
    setDescricaoDenuncia("");
    setErroDenuncia(null);
    avisar(error ? "Erro" : "Denúncia enviada", error ? error.message : "A equipe de moderação vai analisar.");
  }

  function confirmarDenuncia() {
    if (!motivoEscolhido) {
      setErroDenuncia("Escolha um motivo.");
      return;
    }
    if (motivoEscolhido === "Outro motivo" && !descricaoDenuncia.trim()) {
      setErroDenuncia("Descreva o motivo da denúncia.");
      return;
    }
    setErroDenuncia(null);
    enviarDenuncia(motivoEscolhido, motivoEscolhido === "Outro motivo" ? descricaoDenuncia.trim() : null);
  }

  const PADDING_HORIZONTAL = 16;
  const GAP = 12;
  const larguraUtil = width - PADDING_HORIZONTAL * 2;
  const numColunas = Math.max(2, Math.floor(larguraUtil / 170));
  const larguraCard = (larguraUtil - GAP * (numColunas - 1)) / numColunas;

  if (carregando || !usuario) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Banner definido pelo usuário */}
      <View className="mb-4 relative">
        <View pointerEvents="none" className="h-64 sm:h-72 w-full overflow-hidden bg-surface relative">
          {dadosPerfil?.banner_url ? (
            <Image source={{ uri: dadosPerfil.banner_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <>
              <View className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-primary/25 blur-2xl" />
              <View className="absolute top-0 right-0 w-56 h-56 rounded-full bg-blue-600/15 blur-3xl" />
              <BlurView intensity={30} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
            </>
          )}
          
          <View className="absolute inset-0 bg-black/10" />
          <View className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0B101E] via-[#0B101E]/60 to-transparent" />
        </View>

        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          className="absolute top-14 left-4 bg-black/50 border border-white/20 rounded-full p-2 z-10"
        >
          <ChevronLeft color="white" size={22} />
        </Pressable>

        <Pressable onPress={compartilharPerfil} className="absolute top-14 right-4 bg-black/50 border border-white/20 rounded-full p-2 z-10">
          <Share2 color="white" size={18} />
        </Pressable>

        {/* Overlay com detalhes (Avatar, Nome, Badges, Botões) */}
        <View className="px-4 -mt-20 relative z-10">
          <View className="flex-col xl:flex-row xl:items-end justify-between gap-4">
            {/* Esquerda: Avatar e Info */}
            <View className="flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left flex-1 shrink min-w-0">
              <View className="relative">
                <View className="w-36 h-36 rounded-full p-1 bg-primary/20">
                  <View className="w-full h-full rounded-full overflow-hidden bg-[#0B101E] border-4 border-[#0B101E]">
                    {dadosPerfil?.foto_url ? (
                      <Image source={{ uri: dadosPerfil.foto_url }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full bg-surface items-center justify-center">
                        <Text className="text-4xl font-extrabold text-muted">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {/* Ícone de Verificado */}
                <View className="absolute bottom-2 right-4 w-6 h-6 rounded-full bg-[#3B82F6] items-center justify-center border-2 border-[#0B101E]">
                  <UserCheck color="white" size={12} />
                </View>
              </View>

              {/* Nome e Tags */}
              <View className="items-center sm:items-start mb-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-3xl sm:text-4xl font-black text-textDark tracking-tight">
                    {usuario.nome}
                  </Text>
                  {dadosPerfil?.apelido && <Text className="text-muted font-medium text-sm">(@{dadosPerfil.apelido})</Text>}
                </View>

                <View className="flex-row flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10">
                    {usuario.tipo_conta === "musico" && <Sparkles size={12} color={colors.primary} />}
                    {usuario.tipo_conta === "organizador" && <UserCheck size={12} color={colors.primary} />}
                    {(usuario.tipo_conta === "adm" || usuario.tipo_conta === "moderador") && (
                      <ShieldCheck size={12} color={colors.primary} />
                    )}
                    <Text className="text-primary text-xs font-semibold capitalize">
                      {rotulosTipoConta[usuario.tipo_conta]}
                    </Text>
                  </View>

                  {usuario.tipo_conta === "musico" && dadosPerfil?.disponivel !== undefined && (
                    <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10">
                      <View className={`w-2 h-2 rounded-full ${dadosPerfil.disponivel ? "bg-green-500" : "bg-red-500"}`} />
                      <Text className="text-textDark text-xs font-semibold">
                        {dadosPerfil.disponivel ? "Disponível para contratar" : "Indisponível"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Direita: Botões (Contatar) */}
            <View className="flex-row flex-wrap items-center justify-center gap-2 mb-2">
              <Pressable onPress={contatar} disabled={contatando} className="flex-row items-center gap-2 px-6 py-3 rounded-full bg-primary active:bg-primary/80">
                <MessageCircle color="white" size={16} />
                <Text className="text-white text-sm font-bold">{contatando ? "Abrindo..." : "Contatar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 mt-2">
        {/* Info Tags */}
        <View className="flex-row flex-wrap gap-2 mt-2 justify-center sm:justify-start">
          {[dadosPerfil?.genero_musical, dadosPerfil?.nicho_trabalho, dadosPerfil?.localizacao]
            .filter(Boolean)
            .map((info: string) => (
              <View key={info} className="bg-primary/10 rounded-full px-3 py-1.5 border border-primary/20">
                <Text className="text-primary text-xs font-semibold">{info}</Text>
              </View>
            ))}
        </View>

        {dadosPerfil?.descricao && (
          <Text className="text-gray-300 leading-relaxed mt-4 text-center sm:text-left">{dadosPerfil.descricao}</Text>
        )}
      </View>

      <View className="items-center px-4">
        {!denunciaAberta ? (
          <Pressable onPress={() => setDenunciaAberta(true)} className="flex-row items-center mt-3 py-1">
            <Flag color={colors.muted} size={13} />
            <Text className="text-muted text-xs ml-1.5">Denunciar este perfil</Text>
          </Pressable>
        ) : (
          <View className="bg-card border border-border rounded-2xl p-4 mt-3 w-full">
            <Text className="text-textDark font-medium mb-2">Por que você está denunciando?</Text>
            {["Conteúdo ofensivo", "Spam ou golpe", "Perfil falso", "Outro motivo"].map((motivo) => (
              <Pressable
                key={motivo}
                onPress={() => setMotivoEscolhido(motivo)}
                className="py-2 border-b border-border flex-row items-center justify-between"
              >
                <Text className={motivoEscolhido === motivo ? "text-primary font-bold" : "text-textDark"}>
                  {motivo}
                </Text>
              </Pressable>
            ))}

            {motivoEscolhido === "Outro motivo" && (
              <TextInput
                placeholder="Descreva o motivo da denúncia"
                placeholderTextColor="#9CA3AF"
                value={descricaoDenuncia}
                onChangeText={setDescricaoDenuncia}
                multiline
                className="border border-border rounded-2xl px-4 py-3 mt-2 text-textDark"
              />
            )}

            {erroDenuncia && <Text className="text-red-500 text-xs mt-2">{erroDenuncia}</Text>}

            <Pressable onPress={confirmarDenuncia} className="bg-primary rounded-xl py-3 items-center mt-3">
              <Text className="text-white font-bold text-sm">Enviar denúncia</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setDenunciaAberta(false);
                setMotivoEscolhido(null);
                setDescricaoDenuncia("");
                setErroDenuncia(null);
              }}
              className="pt-3"
            >
              <Text className="text-muted text-center">Cancelar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {usuario.tipo_conta === "musico" && (
        <View className="mt-6 px-4">
          <Text className="text-lg font-bold text-textDark mb-3">Músicas</Text>
          {musicas.length === 0 ? (
            <Text className="text-muted text-center mt-4">Nenhuma música publicada ainda.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {musicas.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    requireAuth(() => {
                      const fila = musicas.map((m: any) => ({
                        id: m.id,
                        nome: m.nome,
                        autorApelido: dadosPerfil?.apelido ?? null,
                        arquivoUrl: m.arquivo_url,
                        capaUrl: m.capa_url,
                      }));
                      tocarMusica(
                        {
                          id: item.id,
                          nome: item.nome,
                          autorApelido: dadosPerfil?.apelido ?? null,
                          arquivoUrl: item.arquivo_url,
                          capaUrl: item.capa_url,
                        },
                        fila
                      );
                      router.push("/tocando");
                    });
                  }}
                  style={{ width: larguraCard }}
                  className="bg-card border border-border/80 rounded-2xl p-2.5 active:scale-95 mb-2"
                >
                  {item.capa_url ? (
                    <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2.5" />
                  ) : (
                    <View className="w-full aspect-square rounded-xl bg-surface mb-2.5 items-center justify-center" />
                  )}
                  <Text numberOfLines={1} className="font-bold text-textDark text-xs">
                    {item.nome}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text className="text-lg font-bold text-textDark mb-3 mt-6">Álbuns</Text>
          {albuns.length === 0 ? (
            <Text className="text-muted text-center mt-4">Nenhum álbum publicado ainda.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {albuns.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/album/${item.id}`)}
                  style={{ width: larguraCard }}
                  className="bg-card border border-border/80 rounded-2xl p-2.5 active:scale-95 mb-2"
                >
                  {item.capa_url ? (
                    <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2.5" />
                  ) : (
                    <View className="w-full aspect-square rounded-xl bg-surface mb-2.5 items-center justify-center" />
                  )}
                  <Text numberOfLines={1} className="font-bold text-textDark text-xs">
                    {item.nome}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
