import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2, Camera, Globe, Music, Tag, Calendar, FileAudio, Save } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../../lib/supabase";
import { enviarArquivoParaStorage, excluirArquivoDoStorage } from "../../../lib/upload";
import { excluirMusica } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";
import { maskDate, parseDateToDB, parseDateFromDB } from "../../../lib/dateMask";

export default function EditarMusica() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);

  const [carregando, setCarregando] = useState(true);
  const [musica, setMusica] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [genero, setGenero] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [capaTrocada, setCapaTrocada] = useState(false);
  const [arquivo, setArquivo] = useState<{ uri: string; nome: string; tipo: string } | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("musica")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setMusica(data ?? null);
        if (data) {
          setNome(data.nome ?? "");
          setDescricao(data.descricao ?? "");
          setGenero(data.genero ?? "");
          setDataLancamento(data.data_lancamento ? parseDateFromDB(data.data_lancamento) : "");
          setCapaUri(data.capa_url ?? null);
        }
        setCarregando(false);
      });
  }, [id]);

  const souDono = !!usuario && !!musica && usuario.id === musica.usuario_id;

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/perfil");
  }

  async function trocarCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) {
      setCapaUri(resultado.assets[0].uri);
      setCapaTrocada(true);
    }
  }

  async function trocarArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArquivo({ uri: asset.uri, nome: asset.name, tipo: asset.mimeType ?? "audio/mpeg" });
  }

  async function salvar() {
    if (!musica) return;
    setErro(null);
    if (!nome) {
      setErro("Dê um nome para a música.");
      return;
    }

    setSalvando(true);
    try {
      const dadosAtualizados: Record<string, any> = {
        nome,
        descricao: descricao || null,
        genero: genero || null,
        data_lancamento: dataLancamento ? parseDateToDB(dataLancamento) : null,
      };

      if (capaTrocada && capaUri) {
        const novaCapaUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${musica.usuario_id}-capa.jpg`,
          contentType: "image/jpeg",
        });
        if (musica.capa_url) {
          await excluirArquivoDoStorage({ bucket: "capa_musica", url: musica.capa_url });
        }
        dadosAtualizados.capa_url = novaCapaUrl;
      }

      if (arquivo) {
        const novoArquivoUrl = await enviarArquivoParaStorage({
          bucket: "musica_audio",
          uri: arquivo.uri,
          nomeArquivo: `${musica.usuario_id}-${arquivo.nome}`,
          contentType: arquivo.tipo,
        });
        if (musica.arquivo_url) {
           await excluirArquivoDoStorage({ bucket: "musica_audio", url: musica.arquivo_url });
        }
        dadosAtualizados.arquivo_url = novoArquivoUrl;
      }

      const { error } = await supabase.from("musica").update(dadosAtualizados).eq("id", musica.id);
      if (error) throw error;

      voltar();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    const ok = await confirmar(
      "Excluir música",
      `Tem certeza que quer excluir "${musica.nome}"? Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (ok) excluir();
  }

  async function excluir() {
    if (!musica) return;
    setExcluindo(true);
    try {
      await excluirMusica(musica);
      voltar();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao excluir a música.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-[#0a0e16] items-center justify-center">
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  if (!musica || !souDono) {
    return (
      <View className="flex-1 bg-[#0a0e16] items-center justify-center px-8">
        <Text className="text-[#8d90a0] text-center">
          Você não tem permissão para editar essa música.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0e16]" contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 140 }}>
      {/* Top Bar */}
      <View className="flex-row items-center mb-8">
        <Pressable onPress={voltar} className="w-10 h-10 rounded-full bg-[#1c2028] flex items-center justify-center border border-white/5 active:bg-[#262a33]">
          <ChevronLeft color="#dfe2ee" size={24} />
        </Pressable>
        <View className="ml-4">
          <Text className="text-[11px] font-semibold text-[#8d90a0] uppercase tracking-wider">Gerenciamento de Faixa</Text>
          <Text className="text-[26px] font-bold text-[#dfe2ee] tracking-tight mt-0.5">Editar música</Text>
        </View>
      </View>

      <View className="flex-col md:flex-row gap-6">
        {/* Left Column */}
        <View className="w-full md:w-[35%] flex-col gap-4">
          {/* Capa */}
          <View className="bg-[#181c24] p-5 rounded-xl shadow-lg border border-[#31353e]">
            <Text className="font-semibold text-[#dfe2ee] mb-4">Capa da Faixa</Text>
            <Pressable onPress={trocarCapa} className="w-full aspect-square rounded-lg bg-[#1c2028] overflow-hidden items-center justify-center border border-[#31353e] mb-4 relative group">
              {capaUri ? (
                 <Image source={{ uri: capaUri }} className="w-full h-full object-cover" />
              ) : (
                 <View className="items-center justify-center">
                   <Camera color="#8d90a0" size={32} />
                 </View>
              )}
            </Pressable>
            <Pressable onPress={trocarCapa} className="w-full py-2.5 rounded-lg bg-[#1c2028] border border-[#31353e] items-center justify-center active:bg-[#262a33]">
               <Text className="text-[#dfe2ee] font-medium text-[13px]">Substituir arte</Text>
            </Pressable>
          </View>

          {/* Status */}
          <View className="bg-[#181c24] p-4 rounded-xl border border-[#31353e]">
             <Text className="text-[11px] font-semibold text-[#8d90a0] uppercase tracking-wider mb-2">Status de Distribuição</Text>
             <View className="flex-row items-center justify-between bg-[#1c2028] p-3 rounded-lg border border-[#31353e]">
                <View className="flex-row items-center gap-2">
                   <Globe color="#b4c5ff" size={18} />
                   <Text className="text-[#dfe2ee] text-[13px]">Disponibilidade</Text>
                </View>
                <View className="bg-[#b4c5ff]/10 px-2 py-0.5 rounded-full border border-[#b4c5ff]/20">
                   <Text className="text-[#b4c5ff] text-[11px] font-medium">Pública</Text>
                </View>
             </View>
          </View>
        </View>

        {/* Right Column */}
        <View className="w-full md:w-[65%] flex-col gap-4">
          <View className="bg-[#181c24] p-5 rounded-xl shadow-lg border border-[#31353e] flex-col gap-4">
             <Text className="text-[20px] font-semibold text-[#dfe2ee] mb-2">Metadados da Faixa</Text>
             
             <View>
                <Text className="text-[#c3c6d7] text-[13px] font-medium mb-1.5">Título / Nome da faixa <Text className="text-[#b4c5ff]">*</Text></Text>
                <View className="bg-[#1c2028] border border-[#31353e] rounded-lg px-3 py-1 flex-row items-center">
                  <Music color="#8d90a0" size={18} />
                  <TextInput value={nome} onChangeText={setNome} placeholder="Nome da música..." placeholderTextColor="#8d90a0" className="flex-1 ml-2 text-[#dfe2ee] text-[14px] py-3" />
                </View>
             </View>

             <View>
                <Text className="text-[#c3c6d7] text-[13px] font-medium mb-1.5">Descrição / Notas conceituais</Text>
                <View className="bg-[#1c2028] border border-[#31353e] rounded-lg px-3 py-1">
                  <TextInput multiline value={descricao} onChangeText={setDescricao} placeholder="Conte aos seus ouvintes..." placeholderTextColor="#8d90a0" className="text-[#dfe2ee] text-[14px] py-3 min-h-[80px]" textAlignVertical="top" />
                </View>
             </View>

             <View className="flex-col sm:flex-row gap-4">
                <View className="flex-1">
                   <Text className="text-[#c3c6d7] text-[13px] font-medium mb-1.5">Gênero / Tag</Text>
                   <View className="bg-[#1c2028] border border-[#31353e] rounded-lg px-3 py-1 flex-row items-center">
                      <Tag color="#8d90a0" size={18} />
                      <TextInput value={genero} onChangeText={setGenero} placeholder="Indie Pop..." placeholderTextColor="#8d90a0" className="flex-1 ml-2 text-[#dfe2ee] text-[14px] py-3" />
                   </View>
                </View>
                <View className="flex-1">
                   <Text className="text-[#c3c6d7] text-[13px] font-medium mb-1.5">Data de Lançamento</Text>
                   <View className="bg-[#1c2028] border border-[#31353e] rounded-lg px-3 py-1 flex-row items-center">
                      <Calendar color="#8d90a0" size={18} />
                      <TextInput keyboardType="numeric" value={dataLancamento} onChangeText={(t) => setDataLancamento(maskDate(t))} placeholder="DD/MM/AAAA" placeholderTextColor="#8d90a0" className="flex-1 ml-2 text-[#dfe2ee] text-[14px] py-3" />
                   </View>
                </View>
             </View>

             <View className="mt-2">
                <View className="flex-row items-center justify-between mb-1.5">
                   <Text className="text-[#c3c6d7] text-[13px] font-medium">Trocar arquivo de áudio (opcional)</Text>
                   <Text className="text-[#b4c5ff] text-[11px] font-semibold">Áudio Master Ativo</Text>
                </View>
                <Pressable onPress={trocarArquivo} className="bg-[#1c2028] border border-[#31353e] rounded-lg p-3 flex-row items-center justify-between active:bg-[#262a33]">
                   <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-lg bg-[#31353e] items-center justify-center mr-3">
                         <FileAudio color="#b4c5ff" size={20} />
                      </View>
                      <Text className="text-[#dfe2ee] text-[13px] font-medium flex-1" numberOfLines={1}>
                        {arquivo ? arquivo.nome : (musica.arquivo_url ? "Arquivo original mantido" : "Nenhum arquivo selecionado")}
                      </Text>
                   </View>
                   <View className="bg-[#31353e] px-3 py-1.5 rounded-full ml-2">
                      <Text className="text-[#dfe2ee] text-[11px] font-medium">Substituir</Text>
                   </View>
                </Pressable>
             </View>

             {erro && <Text className="text-red-400 text-sm mt-2 text-center">{erro}</Text>}
          </View>

          {/* Footer Actions */}
          <View className="bg-[#181c24] p-4 rounded-xl border border-[#31353e] flex-row items-center justify-between">
             <Pressable onPress={confirmarExclusao} disabled={salvando || excluindo} className="flex-row items-center px-4 py-2 bg-red-900/20 rounded-lg border border-red-900/30 active:bg-red-900/40">
                <Trash2 color="#ef4444" size={16} />
                <Text className="text-red-400 font-medium ml-2 text-[13px]">Excluir música</Text>
             </Pressable>

             <View className="flex-row items-center gap-3">
                <Pressable onPress={voltar} className="px-4 py-2">
                   <Text className="text-[#c3c6d7] font-medium text-[13px]">Cancelar</Text>
                </Pressable>
                <Pressable onPress={salvar} disabled={salvando || excluindo} className="flex-row items-center px-6 py-2.5 bg-[#2563eb] rounded-lg shadow-lg active:bg-[#1d4ed8]">
                   {salvando ? <ActivityIndicator color="#fff" size="small" /> : (
                     <>
                       <Save color="#fff" size={16} />
                       <Text className="text-white font-medium ml-2 text-[13px]">Salvar alterações</Text>
                     </>
                   )}
                </Pressable>
             </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
