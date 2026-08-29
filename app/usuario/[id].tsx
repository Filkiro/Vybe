import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, Share, FlatList, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter, router } from "expo-router";
import { ChevronLeft, Flag, Share2 } from "lucide-react-native";
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
  const [carregando, setCarregando] = useState(true);
  const [contatando, setContatando] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    setCarregando(true);
    const { data: dadosUsuario } = await supabase.from("usuario").select("*").eq("id", id).single();
    setUsuario(dadosUsuario ?? null);

    if (dadosUsuario?.tipo_conta === "musico") {
      const [{ data: perfil }, { data: minhasMusicas }] = await Promise.all([
        supabase.from("perfil_musico").select("*").eq("usuario_id", id).single(),
        supabase
          .from("musica")
          .select("id, nome, capa_url, arquivo_url")
          .eq("usuario_id", id)
          .eq("status", "ativo")
          .order("data_lancamento", { ascending: false }),
      ]);
      setDadosPerfil(perfil ?? null);
      setMusicas(minhasMusicas ?? []);
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
    router.push(`/chat/${conversaId}?contatoNome=${encodeURIComponent(usuario.nome)}`);
  }

  async function compartilharPerfil() {
    await Share.share({ message: `Confira o perfil de ${usuario?.nome} no Vybe: vybe://usuario/${usuario?.id}` });
  }

  async function enviarDenuncia(motivo: string) {
    if (!usuarioLogado || !usuario) return;
    const { error } = await supabase
      .from("denuncia")
      .insert({ denunciante_id: usuarioLogado.id, tipo_alvo: "usuario", alvo_id: usuario.id, motivo });
    setDenunciaAberta(false);
    avisar(error ? "Erro" : "Denúncia enviada", error ? error.message : "A equipe de moderação vai analisar.");
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
      <View style={{ height: 120, backgroundColor: colors.primary }} className="rounded-b-[32px]" />

      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
        className="absolute top-14 left-4 bg-card/90 rounded-full p-2"
      >
        <ChevronLeft color={colors.textDark} size={22} />
      </Pressable>

      <Pressable onPress={compartilharPerfil} className="absolute top-14 right-4 bg-card/90 rounded-full p-2">
        <Share2 color={colors.textDark} size={18} />
      </Pressable>

      <View className="items-center" style={{ marginTop: -48 }}>
        {dadosPerfil?.foto_url ? (
          <Image
            source={{ uri: dadosPerfil.foto_url }}
            style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.background }}
          />
        ) : (
          <View
            className="rounded-full items-center justify-center bg-surface"
            style={{ width: 96, height: 96, borderWidth: 4, borderColor: colors.background }}
          >
            <Text className="text-3xl font-bold text-muted">{usuario.nome.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <Text className="text-xl font-bold text-textDark mt-3">{usuario.nome}</Text>
        {dadosPerfil?.apelido && <Text className="text-muted">@{dadosPerfil.apelido}</Text>}

        <View className="bg-surface rounded-full px-3 py-1 mt-2">
          <Text className="text-xs font-medium text-muted">{rotulosTipoConta[usuario.tipo_conta]}</Text>
        </View>

        {dadosPerfil?.descricao && (
          <Text className="text-textDark text-center px-8 mt-3">{dadosPerfil.descricao}</Text>
        )}

        <View className="flex-row gap-2 mt-3">
          {[dadosPerfil?.genero_musical, dadosPerfil?.nicho_trabalho, dadosPerfil?.localizacao]
            .filter(Boolean)
            .map((info: string) => (
              <View key={info} className="bg-primary/10 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-medium">{info}</Text>
              </View>
            ))}
        </View>

        <View className="flex-row gap-3 mt-5 px-4 w-full">
          <Pressable onPress={contatar} disabled={contatando} className="flex-1 bg-primary rounded-full py-3 items-center">
            <Text className="text-white font-bold">{contatando ? "Abrindo..." : "Contatar"}</Text>
          </Pressable>
        </View>

        {!denunciaAberta ? (
          <Pressable onPress={() => setDenunciaAberta(true)} className="flex-row items-center mt-3 py-1">
            <Flag color={colors.muted} size={13} />
            <Text className="text-muted text-xs ml-1.5">Denunciar este perfil</Text>
          </Pressable>
        ) : (
          <View className="bg-card border border-border rounded-2xl p-4 mx-4 mt-3 w-full">
            <Text className="text-textDark font-medium mb-2">Por que você está denunciando?</Text>
            {["Conteúdo ofensivo", "Spam ou golpe", "Perfil falso", "Outro motivo"].map((motivo) => (
              <Pressable key={motivo} onPress={() => enviarDenuncia(motivo)} className="py-2 border-b border-border">
                <Text className="text-textDark">{motivo}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setDenunciaAberta(false)} className="pt-2">
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
                  className="bg-card rounded-2xl p-3"
                >
                  {item.capa_url ? (
                    <Image source={{ uri: item.capa_url }} className="w-full aspect-square rounded-xl mb-2" />
                  ) : (
                    <View className="w-full aspect-square rounded-xl bg-surface mb-2" />
                  )}
                  <Text numberOfLines={1} className="font-bold text-textDark">
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
