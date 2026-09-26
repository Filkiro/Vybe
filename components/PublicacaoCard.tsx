import { useState, useEffect } from "react";
import { View, Text, Pressable, Image, TextInput, ActivityIndicator, Modal } from "react-native";
import { Heart, MoreVertical, Flag, Play, Music, Calendar, Disc } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { useRequireAuth } from "../store/authPromptStore";
import { useAbrirPerfil } from "../store/perfilModalStore";
import { colors, rotulosTipoConta } from "../constants/theme";

export type PublicacaoFeedItem = {
  id: string;
  usuario_id: string;
  foto_url: string | null;
  descricao: string | null;
  criado_em: string;
  evento_id: string | null;
  musica_id: string | null;
  album_id: string | null;
  usuario: {
    nome: string;
    tipo_conta: "musico" | "organizador" | "moderador" | "adm";
  } | null;
  apelido: string | null;
  foto_perfil_url: string | null;
  total_curtidas: number;
  curtido_por_mim: boolean;
  evento?: { nome: string; data: string; localizacao: string | null } | null;
  musica?: { id: string; nome: string; capa_url: string | null; arquivo_url: string } | null;
  album?: { id: string; nome: string; capa_url: string | null } | null;
};

export function PublicacaoCard({ item }: { item: PublicacaoFeedItem }) {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const requireAuth = useRequireAuth();
  const abrirPerfil = useAbrirPerfil();
  const [curtido, setCurtido] = useState(item.curtido_por_mim);
  const [totalCurtidas, setTotalCurtidas] = useState(item.total_curtidas);
  const [enviando, setEnviando] = useState(false);

  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  let realFotoUrl = item.foto_url;
  let linkedItem: { tipo: string; id: string; nome: string; capa_url: string | null; arquivo_url?: string } | null = null;
  
  // Backward compatibility with legacy description hacks (if the new DB columns are empty)
  if (!item.musica_id && !item.album_id && item.descricao && item.foto_url) {
    const matchM = item.descricao.match(/Confira minha música "(.*)"!/);
    if (matchM) linkedItem = { tipo: "musica", id: "", nome: matchM[1], capa_url: item.foto_url };
    const matchA = item.descricao.match(/Confira meu álbum "(.*)"!/);
    if (matchA) linkedItem = { tipo: "album", id: "", nome: matchA[1], capa_url: item.foto_url };
    if (linkedItem) realFotoUrl = null;
  }

  // Use the new proper DB columns
  if (item.musica) {
    linkedItem = { tipo: "musica", id: item.musica.id, nome: item.musica.nome, capa_url: item.musica.capa_url, arquivo_url: item.musica.arquivo_url };
  } else if (item.album) {
    linkedItem = { tipo: "album", id: item.album.id, nome: item.album.nome, capa_url: item.album.capa_url };
  }

  useEffect(() => {
    setCurtido(item.curtido_por_mim);
    setTotalCurtidas(item.total_curtidas);
  }, [item]);

async function alternarCurtida() {
  requireAuth(async () => {
    if (!usuarioLogado || enviando) return;
    setEnviando(true);

    const curtidoAtual = curtido;
    const totalAtual = totalCurtidas;

    if (curtidoAtual) {
      setCurtido(false);
      setTotalCurtidas((t) => Math.max(0, t - 1));
      const { error } = await supabase
        .from("curtida_publicacao")
        .delete()
        .eq("usuario_id", usuarioLogado.id)
        .eq("publicacao_id", item.id);

      if (error) {
        setCurtido(curtidoAtual);
        setTotalCurtidas(totalAtual);
      }
    } else {
      setCurtido(true);
      setTotalCurtidas((t) => t + 1);
      const { error } = await supabase
        .from("curtida_publicacao")
        .insert({ usuario_id: usuarioLogado.id, publicacao_id: item.id });

      if (error) {
        setCurtido(curtidoAtual);
        setTotalCurtidas(totalAtual);
      }
    }
    setEnviando(false);
  });
}

  async function enviarDenuncia() {
    if (!usuarioLogado) {
      setDenunciaAberta(false);
      requireAuth(() => setDenunciaAberta(true));
      return;
    }
    if (!motivoDenuncia) return;

    setEnviandoDenuncia(true);
    await supabase.from("denuncia").insert({
      denunciante_id: usuarioLogado.id,
      tipo_alvo: "post",
      alvo_id: item.id,
      motivo: motivoDenuncia,
      descricao: descricaoDenuncia,
    });
    setEnviandoDenuncia(false);
    setDenunciaAberta(false);
    setMotivoDenuncia("");
    setDescricaoDenuncia("");
  }

  function getLetrasIniciais(nome: string | null | undefined) {
    if (!nome) return "??";
    return nome.substring(0, 2).toUpperCase();
  }

  function formatarTempoPassado(dataIso: string) {
    const passado = new Date(dataIso);
    const agora = new Date();
    const dif = agora.getTime() - passado.getTime();

    const min = Math.floor(dif / 60000);
    const hr = Math.floor(min / 60);
    const dia = Math.floor(hr / 24);

    if (min < 60) return `Há ${Math.max(1, min)} min`;
    if (hr < 24) return `Há ${hr} ${hr === 1 ? 'hora' : 'horas'}`;
    return `Há ${dia} ${dia === 1 ? 'dia' : 'dias'}`;
  }

  return (
    <View className="bg-[#121724] rounded-2xl mb-6 shadow-xl border border-white/5 overflow-hidden w-full">
      {/* Header */}
      <View className="flex-row items-center justify-between p-5">
        <Pressable onPress={() => abrirPerfil(item.usuario_id)} className="flex-row items-center flex-1">
          <View className="relative mr-3">
            <View className="w-11 h-11 rounded-full p-0.5 border-2 border-[#3b82f6]/40 overflow-hidden items-center justify-center bg-[#2563eb]/20">
              {item.foto_perfil_url ? (
                <Image source={{ uri: item.foto_perfil_url }} className="w-full h-full rounded-full" />
              ) : (
                <Text className="text-white font-bold text-xs">{getLetrasIniciais(item.apelido || item.usuario?.nome)}</Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-[#3b82f6] rounded-full border-2 border-[#121724]" />
          </View>

          <View className="flex-col justify-center flex-1 pr-2">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text className="font-bold text-white text-[14px]" numberOfLines={1}>
                {item.apelido || item.usuario?.nome || "Usuário"}
              </Text>
              <View className="px-2 py-[2px] rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                <Text className="text-[10px] font-semibold text-[#60a5fa] uppercase tracking-wider">
                  {rotulosTipoConta[item.usuario?.tipo_conta || "musico"]}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] text-[#64748b]">
              {formatarTempoPassado(item.criado_em)} {item.evento?.localizacao ? `• ${item.evento.localizacao}` : ""}
            </Text>
          </View>
        </Pressable>

        <View className="relative">
          <Pressable onPress={() => setMostrarOpcoes(!mostrarOpcoes)} className="p-1.5 rounded-lg active:bg-white/5">
            <MoreVertical color="#94a3b8" size={20} />
          </Pressable>

          {mostrarOpcoes && (
            <View className="absolute right-0 top-10 w-44 bg-[#1f293d] rounded-xl shadow-2xl p-1 z-50 border border-white/5">
              <Pressable
                onPress={() => { setMostrarOpcoes(false); setDenunciaAberta(true); }}
                className="flex-row items-center p-3 rounded-lg active:bg-white/5"
              >
                <Flag color="#cbd5e1" size={16} />
                <Text className="text-[#cbd5e1] font-medium ml-3 text-sm">Denunciar post</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Descrição */}
      {item.descricao ? (
        <View className="px-5 pb-4">
          <Text className="text-[#e2e8f0] text-[14px] leading-relaxed font-normal">
            {item.descricao}
          </Text>
        </View>
      ) : null}

      {/* Linked Event Box (If Organizer linked an event) */}
      {item.evento_id && item.evento && (
        <View className="px-5 pb-4">
          <View className="p-3 rounded-xl bg-[#0a0e16] border border-[#3b82f6]/30 flex-row items-center justify-between gap-3">
             <View className="flex-row items-center gap-3 flex-1">
               <View className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-800 to-indigo-700 items-center justify-center">
                 <Calendar size={18} color="white" />
               </View>
               <View className="flex-1">
                 <Text className="text-xs font-semibold text-white" numberOfLines={1}>{item.evento.nome}</Text>
                 <Text className="text-[11px] text-[#3B82F6] font-bold">
                   Evento Oficial
                 </Text>
               </View>
             </View>
             <View className="px-2 py-1 bg-[#3b82f6]/10 rounded border border-[#3b82f6]/20">
               <Text className="text-[#3b82f6] text-[10px] font-bold">VER MAIS</Text>
             </View>
          </View>
        </View>
      )}

      {/* Linked Item Box (Music/Album) */}
      {linkedItem && (
        <View className="px-5 pb-4">
          <Pressable 
            onPress={() => {
              if (linkedItem?.tipo === 'album' && linkedItem.id) {
                router.push(`/album/${linkedItem.id}`);
              } else if (linkedItem?.tipo === 'musica' && linkedItem.id) {
                if (linkedItem.arquivo_url) {
                  usePlayerStore.getState().tocarMusica({
                    id: linkedItem.id,
                    nome: linkedItem.nome,
                    arquivoUrl: linkedItem.arquivo_url,
                    capaUrl: linkedItem.capa_url,
                    autorApelido: item.apelido || item.usuario?.nome || 'Artista Desconhecido'
                  });
                }
              }
            }}
            className="p-3 rounded-xl bg-[#0a0e16] border border-[#3b82f6]/30 flex-row items-center justify-between gap-3"
          >
             <View className="flex-row items-center gap-4 flex-1">
               <View className="w-12 h-12 rounded-lg bg-[#3b82f6] items-center justify-center overflow-hidden">
                 {linkedItem.capa_url && !linkedItem.capa_url.startsWith('vybe_item') ? (
                   <Image source={{ uri: linkedItem.capa_url }} className="w-full h-full object-cover" />
                 ) : (
                   linkedItem.tipo === "album" ? <Disc size={20} color="white" /> : <Music size={20} color="white" />
                 )}
               </View>
               <View className="flex-1">
                 <Text className="text-sm font-bold text-white" numberOfLines={1}>{linkedItem.nome}</Text>
                 <Text className="text-[11px] text-[#3B82F6] font-bold">
                   {linkedItem.tipo === "album" ? "Álbum" : "Música • Single"}
                 </Text>
               </View>
             </View>
          </Pressable>
        </View>
      )}

      {/* Imagem / Midia (Opcional) */}
      {realFotoUrl && (
        <View className="px-5 pb-4">
          <View className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/5 shadow-2xl">
            <Image source={{ uri: realFotoUrl }} className="w-full h-full object-cover" />
          </View>
        </View>
      )}

      {/* Footer Engajamento */}
      <View className="px-5 pb-4">
        <View className="pt-3 border-t border-white/5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-6">
            <Pressable onPress={alternarCurtida} className="flex-row items-center gap-2 group">
              <Heart
                color={curtido ? "#f43f5e" : "#94a3b8"}
                fill={curtido ? "#f43f5e" : "transparent"}
                size={22}
                className="group-active:scale-110"
              />
              <Text className="font-medium text-[#cbd5e1] text-xs">{totalCurtidas}</Text>
            </Pressable>
          </View>

          
        </View>
      </View>

      {/* Modal de Denúncia */}
      <Modal visible={denunciaAberta} transparent animationType="fade" onRequestClose={() => setDenunciaAberta(false)}>
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <View className="bg-[#121724] w-full max-w-sm rounded-3xl p-6 border border-white/5 shadow-2xl">
            <Text className="text-xl font-bold text-white mb-2">Denunciar Publicação</Text>
            <Text className="text-[#94a3b8] text-sm mb-6">Por que você está denunciando este conteúdo?</Text>
            
            <View className="bg-[#0a0e17] rounded-xl mb-4 border border-white/5 p-2">
              <TextInput
                placeholder="Ex: Spam, Ofensa, Violência..."
                placeholderTextColor="#64748b"
                value={motivoDenuncia}
                onChangeText={setMotivoDenuncia}
                className="text-white p-3 font-medium text-sm"
              />
            </View>
            
            <View className="bg-[#0a0e17] rounded-xl mb-6 border border-white/5 p-2 min-h-[100px]">
              <TextInput
                placeholder="Detalhes adicionais (opcional)"
                placeholderTextColor="#64748b"
                value={descricaoDenuncia}
                onChangeText={setDescricaoDenuncia}
                multiline
                className="text-white p-3 text-sm h-full"
                textAlignVertical="top"
              />
            </View>
            
            <View className="flex-row gap-3">
              <Pressable onPress={() => setDenunciaAberta(false)} className="flex-1 bg-white/5 py-4 rounded-xl items-center active:bg-white/10">
                <Text className="text-white font-medium">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={enviarDenuncia}
                disabled={!motivoDenuncia || enviandoDenuncia}
                className="flex-1 bg-red-500 py-4 rounded-xl items-center active:bg-red-600"
                style={{ opacity: !motivoDenuncia || enviandoDenuncia ? 0.5 : 1 }}
              >
                {enviandoDenuncia ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-medium">Enviar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
