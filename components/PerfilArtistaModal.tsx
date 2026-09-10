import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, Image, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { X, MapPin, Sparkles } from "lucide-react-native";
import { supabase, Usuario } from "../lib/supabase";
import { usePerfilModalStore } from "../store/perfilModalStore";
import { rotulosTipoConta } from "../constants/theme";

export function PerfilArtistaModal() {
  const usuarioId = usePerfilModalStore((s) => s.usuarioId);
  const fechar = usePerfilModalStore((s) => s.fechar);
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [dadosPerfil, setDadosPerfil] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

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
          <View className="w-full max-w-[380px] bg-[#121829] border border-border/80 rounded-[28px] p-4 relative shadow-2xl">
            
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
                        <Sparkles size={11} color="white" />
                        <Text className="text-white text-[10px] font-bold uppercase">
                          {dadosPerfil.genero_musical}
                        </Text>
                      </View>
                    )}
                    {dadosPerfil?.localizacao && (
                      <View className="bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                        <MapPin size={11} color="white" />
                        <Text className="text-white text-[10px] font-bold">
                          {dadosPerfil.localizacao}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Foto de Perfil sobreposta vazando a borda inferior da capa */}
                  <View className="absolute -bottom-6 left-3 border-4 border-[#121829] rounded-full w-16 h-16 bg-surface items-center justify-center shadow-2xl z-20 overflow-hidden">
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} className="w-full h-full" />
                    ) : (
                      <Text className="text-xl font-black text-muted">
                        {usuario.nome.charAt(0).toUpperCase()}
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
                </View>

                {/* Descrição do Perfil */}
                {dadosPerfil?.descricao && (
                  <Text className="text-muted text-xs leading-relaxed mt-3 px-1" numberOfLines={3}>
                    {dadosPerfil.descricao}
                  </Text>
                )}

                {/* Botão de Navegar para Perfil Completo */}
                <Pressable
                  onPress={verPerfilCompleto}
                  className="bg-primary py-3.5 rounded-2xl items-center justify-center shadow-lg shadow-primary/25 active:opacity-90 mt-4"
                >
                  <Text className="text-white font-bold text-sm">Ver Perfil Completo</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}