import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, Image, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { X, MapPin, Sparkles, MessageCircle, Ticket } from "lucide-react-native";
import { supabase, Usuario } from "../lib/supabase";
import { usePerfilModalStore } from "../store/perfilModalStore";
import { colors, rotulosTipoConta } from "../constants/theme";
import { DEMO_ARTISTAS_JUNDIAI } from "../lib/jundiaiDemoData";
import { useAuthStore } from "../store/authStore";
import { useRequireAuth } from "../store/authPromptStore";
import { obterOuCriarConversa } from "../lib/conversaUtils";
import { ModalConvidarMusico } from "./ModalConvidarMusico";
import { obterIniciais } from "../lib/avatarUtils";

export function PerfilArtistaModal() {
  const usuarioId = usePerfilModalStore((s) => s.usuarioId);
  const fechar = usePerfilModalStore((s) => s.fechar);
  const router = useRouter();
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const requireAuth = useRequireAuth();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [dadosPerfil, setDadosPerfil] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [iniciandoChat, setIniciandoChat] = useState(false);
  const [modalConvidarAberto, setModalConvidarAberto] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      setUsuario(null);
      setDadosPerfil(null);
      return;
    }
    carregar(usuarioId);
  }, [usuarioId]);

  async function carregar(id: string) {
    setCarregando(true);
    if (id.startsWith("demo-")) {
      const demo = DEMO_ARTISTAS_JUNDIAI.find((a) => a.id === id);
      if (demo) {
        setUsuario({
          id: demo.id,
          nome: demo.apelido,
          email: `${demo.apelido.toLowerCase().replace(/[^a-z0-9]/g, "")}@vybe.demo`,
          tipo_conta: "musico",
          status: "ativo",
          criado_em: new Date().toISOString(),
        });
        setDadosPerfil({
          id: demo.id,
          usuario_id: demo.id,
          apelido: demo.apelido,
          foto_url: demo.imagem_url,
          banner_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
          genero_musical: demo.generos,
          localizacao: demo.local,
          descricao: demo.descricao ?? "Artista da cena autoral de Jundiaí e região.",
          disponivel: true,
        });
      }
      setCarregando(false);
      return;
    }

    const { data: dadosUsuario } = await supabase.from("usuario").select("*").eq("id", id).single();
    setUsuario(dadosUsuario ?? null);

    if (dadosUsuario?.tipo_conta === "musico") {
      const { data: perfil } = await supabase.from("perfil_musico").select("*").eq("usuario_id", id).single();
      setDadosPerfil(perfil ?? null);
    } else if (dadosUsuario?.tipo_conta === "organizador") {
      const { data: perfil } = await supabase.from("perfil_organizador").select("*").eq("usuario_id", id).single();
      setDadosPerfil(perfil ?? null);
    }
    setCarregando(false);
  }

  async function iniciarConversa() {
    if (!usuarioId) return;
    if (!usuarioLogado) {
      fechar();
      requireAuth(() => {});
      return;
    }
    setIniciandoChat(true);
    const conversaId = await obterOuCriarConversa(usuarioLogado.id, usuarioId);
    setIniciandoChat(false);
    if (conversaId) {
      fechar();
      const nome = dadosPerfil?.apelido ?? usuario?.nome ?? "Contato";
      const foto = dadosPerfil?.foto_url ?? "";
      router.push(`/chat/${conversaId}?contatoId=${usuarioId}&contatoNome=${encodeURIComponent(nome)}&contatoFotoUrl=${encodeURIComponent(foto)}`);
    } else {
      alert("Não foi possível iniciar a conversa.");
    }
  }

  function verPerfilCompleto() {
    if (!usuarioId) return;
    fechar();
    router.push(`/usuario/${usuarioId}`);
  }

  const bannerUrl = dadosPerfil?.banner_url ?? null;
  const fotoUrl = dadosPerfil?.foto_url ?? null;

  return (
    <Modal visible={!!usuarioId} transparent animationType="fade" onRequestClose={fechar}>
      <Pressable onPress={fechar} className="flex-1 bg-black/80 items-center justify-center px-4">
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full items-center">
          <View className="w-full max-w-[380px] bg-[#121829] border border-border/80 rounded-[28px] p-4 relative ">
            
            {/* Botão de Fechar Modal */}
            <Pressable
              onPress={fechar}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              className="absolute top-6 right-6 bg-black/60 rounded-full p-2 z-30 border border-white/20"
            >
              <X color="white" size={16} />
            </Pressable>

            {carregando || !usuario ? (
              <View className="h-64 items-center justify-center">
                <Text className="text-muted text-xs">Carregando perfil...</Text>
              </View>
            ) : (
              <>
                {/* Área da Capa Superior */}
                <View className="h-36 w-full relative">
                  {bannerUrl ? (
                    <ImageBackground
                      source={{ uri: bannerUrl }}
                      className="w-full h-full rounded-2xl overflow-hidden"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full bg-gradient-to-r from-primary/30 to-blue-600/20 rounded-2xl overflow-hidden" />
                  )}

                  {/* Badges Flutuantes dentro da Capa */}
                  <View className="absolute bottom-2.5 right-2.5 flex-row items-center gap-1.5 z-10">
                    {dadosPerfil?.genero_musical && (
                      <View className="bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                        <Sparkles size={12} color="white" />
                        <Text className="text-white text-xs font-bold uppercase">
                          {dadosPerfil.genero_musical}
                        </Text>
                      </View>
                    )}
                    {dadosPerfil?.localizacao && (
                      <View className="bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                        <MapPin size={12} color="white" />
                        <Text className="text-white text-xs font-bold">
                          {dadosPerfil.localizacao}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Foto de Perfil sobreposta vazando a borda inferior da capa */}
                  <View className="absolute -bottom-6 left-3 border-4 border-[#121829] rounded-full w-16 h-16 bg-[#1e293b] items-center justify-center z-20 overflow-hidden">
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} className="w-full h-full" />
                    ) : (
                      <Text className="text-base font-black text-primary tracking-wider">
                        {obterIniciais(dadosPerfil?.apelido ?? usuario.nome)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Espaçamento superior para compensar a foto vazada */}
                <View className="mt-8 px-1">
                  <Text className="text-xl font-black text-textDark" numberOfLines={1}>
                    {dadosPerfil?.apelido ?? usuario.nome}
                  </Text>
                  <Text className="text-muted text-xs font-semibold capitalize mt-0.5">
                    {rotulosTipoConta[usuario.tipo_conta] ?? usuario.tipo_conta}
                  </Text>

                  {/* Disponibilidade para contratação */}
                  {usuario.tipo_conta === "musico" && dadosPerfil?.disponivel !== undefined && (
                    <View className="flex-row items-center gap-1.5 mt-1.5">
                      <View className={`w-2 h-2 rounded-full ${dadosPerfil.disponivel ? "bg-emerald-500" : "bg-red-500"}`} />
                      <Text className="text-gray-300 text-xs font-medium">
                        {dadosPerfil.disponivel ? "Disponível para contratação" : "Indisponível no momento"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Descrição do Perfil */}
                {dadosPerfil?.descricao && (
                  <Text className="text-muted text-xs leading-relaxed mt-3 px-1" numberOfLines={3}>
                    {dadosPerfil.descricao}
                  </Text>
                )}

                {/* Botões de Ação Direta */}
                <View className="flex-row gap-2 mt-4">
                  {usuarioLogado?.tipo_conta === "organizador" && usuario.tipo_conta === "musico" && usuarioLogado.id !== usuario.id && (
                    <Pressable
                      onPress={() => setModalConvidarAberto(true)}
                      className="flex-1 bg-emerald-600 py-3 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-emerald-700"
                    >
                      <Ticket size={15} color="white" />
                      <Text className="text-white font-bold text-xs">Convidar</Text>
                    </Pressable>
                  )}
                  {usuarioLogado?.id !== usuario.id && (
                    <Pressable
                      onPress={iniciarConversa}
                      disabled={iniciandoChat}
                      className="flex-1 bg-primary/20 border border-primary/30 py-3 rounded-xl flex-row items-center justify-center gap-1.5 active:bg-primary/30"
                    >
                      <MessageCircle size={15} color={colors.primary} />
                      <Text className="text-primary font-bold text-xs">{iniciandoChat ? "Abrindo..." : "Conversar"}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Botão de Navegar para Perfil Completo */}
                <Pressable
                  onPress={verPerfilCompleto}
                  className="bg-[#1A2235] border border-white/10 py-3 rounded-xl items-center justify-center active:opacity-80 mt-2"
                >
                  <Text className="text-white/80 font-bold text-xs">Ver Perfil Completo</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>

      {usuario && (
        <ModalConvidarMusico
          visible={modalConvidarAberto}
          onClose={() => setModalConvidarAberto(false)}
          musicoId={usuario.id}
          musicoNome={dadosPerfil?.apelido ?? usuario.nome}
          musicoFotoUrl={dadosPerfil?.foto_url}
          musicoGenero={dadosPerfil?.genero_musical}
        />
      )}
    </Modal>
  );
}
