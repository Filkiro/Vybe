import { useState, useEffect } from "react";
import { View, Text, Pressable, Image, TextInput, ActivityIndicator, Modal } from "react-native";
import { Heart, MoreVertical, Flag } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
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
  usuario: {
    nome: string;
    tipo_conta: "musico" | "organizador" | "moderador" | "adm";
  } | null;
  apelido: string | null;
  foto_perfil_url: string | null;
  total_curtidas: number;
  curtido_por_mim: boolean;
  evento?: { nome: string; data: string; localizacao: string | null } | null;
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
  const [motivoEscolhido, setMotivoEscolhido] = useState<string | null>(null);
  const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
  const [erroDenuncia, setErroDenuncia] = useState<string | null>(null);
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);
  const [artistasConfirmados, setArtistasConfirmados] = useState<any[]>([]);

  useEffect(() => {
    if (item.evento_id) {
      supabase
        .from("evento_convite")
        .select("musico_id")
        .eq("evento_id", item.evento_id)
        .eq("status", "aceito")
        .then(async ({ data }) => {
          if (data && data.length > 0) {
            const ids = data.map((d: any) => d.musico_id);
            const { data: perfis } = await supabase
              .from("perfil_musico")
              .select("usuario_id, apelido, foto_url")
              .in("usuario_id", ids);
            setArtistasConfirmados(perfis ?? []);
          }
        });
    }
  }, [item.evento_id]);

  async function alternarCurtida() {
    requireAuth(async () => {
      if (enviando || !usuarioLogado) return;
      setEnviando(true);

      const novoEstado = !curtido;
      setCurtido(novoEstado);
      setTotalCurtidas((atual) => atual + (novoEstado ? 1 : -1));

      if (novoEstado) {
        const { error } = await supabase
          .from("curtida")
          .insert({ publicacao_id: item.id, usuario_id: usuarioLogado.id });
        if (error) {
          setCurtido(!novoEstado);
          setTotalCurtidas((atual) => atual - 1);
        }
      } else {
        const { error } = await supabase
          .from("curtida")
          .delete()
          .eq("publicacao_id", item.id)
          .eq("usuario_id", usuarioLogado.id);
        if (error) {
          setCurtido(!novoEstado);
          setTotalCurtidas((atual) => atual + 1);
        }
      }
      setEnviando(false);
    });
  }

  async function enviarDenuncia() {
    requireAuth(async () => {
      if (!motivoEscolhido) {
        setErroDenuncia("Escolha um motivo.");
        return;
      }
      if (motivoEscolhido === "Outro motivo" && !descricaoDenuncia.trim()) {
        setErroDenuncia("Descreva o motivo da denúncia.");
        return;
      }

      setErroDenuncia(null);
      setEnviandoDenuncia(true);

      const { error } = await supabase
        .from("denuncia")
        .insert({
          denunciante_id: usuarioLogado!.id,
          tipo_alvo: "publicacao",
          alvo_id: item.id,
          motivo: motivoEscolhido,
          descricao: motivoEscolhido === "Outro motivo" ? descricaoDenuncia.trim() : null
        });

      setEnviandoDenuncia(false);
      
      if (!error) {
        setDenunciaAberta(false);
        setMotivoEscolhido(null);
        setDescricaoDenuncia("");
        alert("Denúncia enviada com sucesso. A moderação vai analisar.");
      } else {
        setErroDenuncia(error.message);
      }
    });
  }

  return (
    <View className="bg-[#121829] rounded-3xl mb-4 overflow-hidden border border-white/5  ">
      <View className="flex-row items-center px-4 pt-4 pb-3">
        <Pressable onPress={() => abrirPerfil(item.usuario_id)} className="flex-row items-center flex-1">
          {item.foto_perfil_url ? (
            <Image source={{ uri: item.foto_perfil_url }} className="w-10 h-10 rounded-full mr-3 border border-white/10" />
          ) : (
            <View className="w-10 h-10 rounded-full bg-[#1A2235] mr-3 border border-white/10" />
          )}
          <View className="flex-1">
            <Text className="font-bold text-white">{item.apelido ?? item.usuario?.nome ?? "Usuário"}</Text>
            <Text className="text-gray-400 text-xs">
              {item.usuario ? rotulosTipoConta[item.usuario.tipo_conta] ?? item.usuario.tipo_conta : ""}
            </Text>
          </View>
        </Pressable>

        <View>
          <Pressable onPress={() => setMostrarOpcoes(true)} className="w-8 h-8 items-center justify-center rounded-full active:bg-white/5">
            <MoreVertical size={20} color="#94A3B8" />
          </Pressable>

          <Modal transparent visible={mostrarOpcoes} animationType="fade" onRequestClose={() => setMostrarOpcoes(false)}>
            <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setMostrarOpcoes(false)}>
              <Pressable className="w-64 bg-[#1A2235] border border-white/10 rounded-2xl overflow-hidden " onPress={(e) => e.stopPropagation()}>
                <Pressable 
                  onPress={() => {
                    setMostrarOpcoes(false);
                    setDenunciaAberta(true);
                  }} 
                  className="flex-row items-center px-5 py-4 active:bg-white/5"
                >
                  <Flag size={18} color={colors.danger} />
                  <Text className="text-red-500 font-bold text-base ml-3">Denunciar publicação</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </View>

      {item.descricao && (
        <Text className="text-gray-200 px-4 pb-3 leading-tight">{item.descricao}</Text>
      )}

      {item.evento && (
        <View className="mx-4 mb-3 bg-[#1A2235] rounded-xl px-3 py-2.5 border border-white/5">
          <Text className="text-primary font-bold text-sm">{item.evento.nome}</Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            {item.evento.data} {item.evento.localizacao ? `· ${item.evento.localizacao}` : ""}
          </Text>
        </View>
      )}

      {item.foto_url && (
        <Image source={{ uri: item.foto_url }} className="w-full bg-[#0B101E]" style={{ aspectRatio: 1 }} resizeMode="contain" />
      )}

      {artistasConfirmados.length > 0 && (
        <View className="px-4 py-3 bg-[#161C2C] border-t border-white/5">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Artistas Confirmados</Text>
          <View className="flex-row flex-wrap gap-2">
            {artistasConfirmados.map((a: any) => (
              <Pressable
                key={a.usuario_id}
                onPress={() => abrirPerfil(a.usuario_id)}
                className="flex-row items-center bg-white/5 border border-white/10 rounded-full pr-3 py-1 overflow-hidden"
              >
                {a.foto_url ? (
                  <Image source={{ uri: a.foto_url }} className="w-5 h-5 rounded-full mr-2" />
                ) : (
                  <View className="w-5 h-5 rounded-full bg-[#3B82F6] items-center justify-center mr-2">
                    <Text className="text-white text-[10px] font-bold">{a.apelido?.[0] ?? "A"}</Text>
                  </View>
                )}
                <Text className="text-white text-xs font-medium">{a.apelido}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View className="flex-row items-center px-4 py-3 border-t border-white/5 bg-[#121829]">
        <Pressable onPress={alternarCurtida} disabled={enviando} className="flex-row items-center gap-2 active:opacity-70">
          <Heart size={22} color={curtido ? colors.danger : "#64748B"} fill={curtido ? colors.danger : "transparent"} />
          <Text className={curtido ? "text-red-500 font-semibold" : "text-gray-400 font-medium"}>{totalCurtidas}</Text>
        </Pressable>
      </View>

      {/* Área de Denúncia Expandida */}
      {denunciaAberta && (
        <View className="p-4 bg-[#1A2235] border-t border-white/5">
          <Text className="text-white font-bold mb-3">Por que está denunciando esta postagem?</Text>
          {["Conteúdo ofensivo", "Spam ou golpe", "Mídia inapropriada", "Outro motivo"].map((motivo) => (
            <Pressable
              key={motivo}
              onPress={() => setMotivoEscolhido(motivo)}
              className="py-2.5 border-b border-white/5 flex-row items-center"
            >
              <View className={`w-4 h-4 rounded-full border mr-3 items-center justify-center ${motivoEscolhido === motivo ? "border-primary" : "border-gray-500"}`}>
                {motivoEscolhido === motivo && <View className="w-2 h-2 rounded-full bg-primary" />}
              </View>
              <Text className={motivoEscolhido === motivo ? "text-primary font-bold" : "text-gray-300"}>
                {motivo}
              </Text>
            </Pressable>
          ))}

          {motivoEscolhido === "Outro motivo" && (
            <TextInput
              placeholder="Descreva o motivo da denúncia..."
              placeholderTextColor="#64748B"
              value={descricaoDenuncia}
              onChangeText={setDescricaoDenuncia}
              multiline
              className="bg-[#0B101E] text-white border border-white/10 rounded-xl px-3 py-2 mt-3 min-h-[80px]"
              style={{ textAlignVertical: "top" }}
            />
          )}

          {erroDenuncia && (
            <Text className="text-red-500 text-sm mt-2">{erroDenuncia}</Text>
          )}

          <View className="flex-row gap-3 mt-4">
            <Pressable onPress={() => { setDenunciaAberta(false); setErroDenuncia(null); }} className="flex-1 py-2.5 items-center rounded-xl border border-white/10">
              <Text className="text-gray-300 font-medium">Cancelar</Text>
            </Pressable>
            <Pressable onPress={enviarDenuncia} disabled={enviandoDenuncia} className="flex-1 py-2.5 items-center rounded-xl bg-red-600">
              {enviandoDenuncia ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-bold">Enviar</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
