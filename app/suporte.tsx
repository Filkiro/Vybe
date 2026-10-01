import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { 
  ChevronLeft, ChevronRight, Plus, CheckCircle2, X, 
  Headphones, Paperclip, Clock, Inbox, HelpCircle, 
  MessageSquare, ExternalLink, User
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

type Chamado = {
  id: string;
  assunto: string;
  descricao: string | null;
  status: string;
  criado_em: string;
};

export default function Suporte() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (usuario) carregar();
  }, [usuario?.id]);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    const { data } = await supabase
      .from("suporte")
      .select("id, assunto, descricao, status, criado_em")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false });
    setChamados(data ?? []);
    setCarregando(false);
  }

  async function abrirChamado() {
    if (!usuario) return;
    setErro(null);
    setSucesso(false);
    if (!assunto.trim()) {
      setErro("Escreva um assunto para o chamado.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("suporte").insert({
      usuario_id: usuario.id,
      assunto,
      descricao: descricao || null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setAssunto("");
    setDescricao("");
    setSucesso(true);
    setMostrarForm(false);
    carregar();
  }

  if (!usuario) {
    return (
      <View className="flex-1 bg-[#0a0e16] items-center justify-center px-8">
        <Text className="text-[#8d90a0] text-center">Entre na sua conta para abrir um chamado de suporte.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0e16]" contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="px-6 pt-12 pb-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <View className="flex-col mb-6">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-3 self-start">
            <ChevronLeft size={16} color="#8d90a0" />
            <Text className="text-[#8d90a0] text-sm font-medium">Voltar ao Perfil</Text>
          </Pressable>
          <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
            <View className="flex-col">
              <Text className="text-[32px] font-bold text-white tracking-tight">Suporte</Text>
              <Text className="text-[#8d90a0] text-sm mt-1">Central de Atendimento ao Produtor & Músico.</Text>
            </View>
            {!mostrarForm && (
              <Pressable onPress={() => setMostrarForm(true)} className="flex-row items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563eb] shadow-lg">
                <Plus size={18} color="#eeefff" />
                <Text className="text-[#eeefff] font-semibold text-[13px]">Novo chamado</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Feedback Sucesso */}
        {sucesso && !mostrarForm && (
          <View className="mt-4 flex-row items-center justify-between p-4 rounded-xl bg-[#262a33]/90 shadow-lg">
            <View className="flex-row items-center gap-4 flex-1">
              <View className="w-9 h-9 rounded-full bg-emerald-500/20 items-center justify-center shrink-0">
                <CheckCircle2 size={22} color="#34d399" />
              </View>
              <View className="flex-col flex-1">
                <Text className="text-emerald-300 text-lg font-medium">Chamado aberto com sucesso!</Text>
                <Text className="text-[#c3c6d7] text-sm" numberOfLines={2}>Nossa equipe de suporte técnico e moderação vai te responder diretamente nesta tela.</Text>
              </View>
            </View>
            <Pressable onPress={() => setSucesso(false)} className="p-2 ml-2">
              <X size={18} color="#c3c6d7" />
            </Pressable>
          </View>
        )}

        <View className="flex-col lg:flex-row mt-6 gap-6">
          {/* Main Column */}
          <View className="w-full lg:w-[65%] flex-col gap-6">
            
            {/* Form */}
            {mostrarForm && (
              <View className="rounded-xl bg-[#1c2028]/90 p-6 flex-col gap-5 shadow-xl">
                <View className="flex-row items-center justify-between gap-4 pb-2">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Headphones size={22} color="#b4c5ff" shrink-0 />
                    <Text className="text-xl font-medium text-[#dfe2ee] flex-shrink" numberOfLines={1}>Abrir Novo Chamado</Text>
                  </View>
                  <Pressable onPress={() => setMostrarForm(false)} className="px-3 py-1.5 rounded-md bg-[#262a33] shrink-0">
                    <Text className="text-[#c3c6d7] text-[13px] font-medium">Cancelar</Text>
                  </Pressable>
                </View>

                
                {/* Campos */}
                <View className="flex-col gap-2">
                  <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider">ASSUNTO</Text>
                  <TextInput
                    placeholder="Assunto (ex: Erro no upload de WAV 24-bit)"
                    placeholderTextColor="#8d90a0"
                    value={assunto}
                    onChangeText={setAssunto}
                    className="w-full bg-[#0a0e16] text-[#dfe2ee] px-4 py-3.5 rounded-lg border border-white/5"
                  />
                </View>

                <View className="flex-col gap-2">
                  <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider">DESCRIÇÃO DETALHADA</Text>
                  <TextInput
                    placeholder="Descreva o problema ou dúvida com o máximo de detalhes..."
                    placeholderTextColor="#8d90a0"
                    value={descricao}
                    onChangeText={setDescricao}
                    multiline
                    numberOfLines={4}
                    className="w-full bg-[#0a0e16] text-[#dfe2ee] p-4 rounded-lg border border-white/5"
                    style={{ minHeight: 100, textAlignVertical: "top" }}
                  />
                </View>

                {erro && <Text className="text-red-400 text-sm">{erro}</Text>}

                <View className="flex-row items-center justify-between py-1">
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1.5">
                      <Paperclip size={16} color="#c3c6d7" />
                      <Text className="text-[#c3c6d7] text-[11px] font-semibold">Anexar log/áudio</Text>
                    </View>
                    <Text className="text-[#31353e]">•</Text>
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-[#2563eb]" />
                      <Text className="text-[11px] font-semibold text-[#c3c6d7]">Resposta média: ~2h</Text>
                    </View>
                  </View>
                </View>

                <Pressable onPress={abrirChamado} disabled={enviando} className="w-full py-3.5 rounded-lg bg-[#2563eb] items-center mt-2 shadow-lg">
                  {enviando ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-[#eeefff] font-semibold text-[13px] tracking-wide">Enviar chamado</Text>}
                </Pressable>
              </View>
            )}

            {/* Lista de Chamados */}
            <View className="flex-col gap-4">
              <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl font-bold text-[#dfe2ee]">Meus chamados</Text>
                  <View className="px-2 py-0.5 rounded-full bg-[#262a33]">
                    <Text className="text-[11px] font-mono font-semibold text-[#c3c6d7]">{chamados.length} {chamados.length === 1 ? "ativo" : "ativos"}</Text>
                  </View>
                </View>
              </View>

              {carregando ? (
                <ActivityIndicator color="#2563eb" size="large" className="mt-8" />
              ) : chamados.length === 0 ? (
                <View className="flex-col items-center justify-center py-12 px-6 rounded-xl bg-[#1c2028]/40 mt-4">
                  <View className="w-14 h-14 rounded-full bg-[#262a33] items-center justify-center mb-4">
                    <Inbox size={28} color="#8d90a0" />
                  </View>
                  <Text className="text-base text-[#c3c6d7] mb-2 text-center">Você ainda não abriu nenhum chamado.</Text>
                  <Text className="text-xs text-[#8d90a0] text-center max-w-[300px]">Precisa de ajuda com lançamentos, uploads ou pagamentos? Clique no botão "Novo chamado" acima.</Text>
                </View>
              ) : (
                <View className="flex-col gap-3">
                  {chamados.map((item) => (
                    <View key={item.id} className="flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#1c2028] hover:bg-[#262a33] shadow-md gap-4">
                      <View className="flex-row items-start gap-4 flex-1">
                        <View className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.status === 'aberto' ? 'bg-amber-500/10' : 'bg-[#262a33]'}`}>
                          {item.status === 'aberto' ? (
                            <Clock size={20} color="#fbbf24" />
                          ) : (
                            <CheckCircle2 size={20} color="#c3c6d7" />
                          )}
                        </View>
                        <View className="flex-col flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-base font-semibold text-[#dfe2ee]" numberOfLines={1}>{item.assunto}</Text>
                            <Text className="text-[11px] font-mono text-[#8d90a0]">#{item.id.substring(0,8).toUpperCase()}</Text>
                          </View>
                          <Text className="text-sm text-[#c3c6d7] mt-0.5" numberOfLines={1}>
                            {item.descricao || "Sem descrição"}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-2">
                            <Clock size={14} color="#8d90a0" />
                            <Text className="text-[11px] text-[#8d90a0]">Aberto em {new Date(item.criado_em).toLocaleDateString('pt-BR')}</Text>
                            <Text className="text-[11px] text-[#8d90a0]">• Distribuição</Text>
                          </View>
                        </View>
                      </View>

                      <View className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        {item.status === 'aberto' ? (
                          <View className="px-3 py-1 rounded-full bg-amber-500/15 flex-row items-center gap-1.5">
                            <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <Text className="text-[11px] font-semibold text-amber-400">aberto</Text>
                          </View>
                        ) : (
                          <View className="px-3 py-1 rounded-full bg-[#262a33]">
                            <Text className="text-[11px] font-medium text-[#c3c6d7]">{item.status}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Sidebar */}
          <View className="w-full lg:w-[35%] flex-col gap-4">

            {/* Dúvidas Frequentes */}
            <View className="p-4 rounded-xl bg-[#1c2028]/90 flex-col gap-3 shadow-md">
              <View className="flex-row items-center gap-2">
                <HelpCircle size={20} color="#b4c5ff" />
                <Text className="text-lg font-semibold text-[#dfe2ee]">Dúvidas Frequentes</Text>
              </View>
              <View className="flex-col gap-2 mt-1">
                <View className="p-3 rounded-lg bg-[#262a33]/60">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-medium text-[#dfe2ee]">Pq não consigo lançar músicas?</Text>
                    <ChevronRight size={16} color="#8d90a0" />
                  </View>
                  <Text className="text-xs text-[#c3c6d7] mt-1">Verifique se o seu áudio está em WAV 16 ou 24-bit (441kHz) e sua capa em 3000x3000px sem logos de terceiros.</Text>
                </View>
                <View className="p-3 rounded-lg bg-[#262a33]/60">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-medium text-[#dfe2ee]">Por onde vou receber a resposta do chamado?</Text>
                    <ChevronRight size={16} color="#8d90a0" />
                  </View>
                  <Text className="text-xs text-[#c3c6d7] mt-1">Você receberá a resposta em seu email.</Text>
                </View>
                <View className="p-3 rounded-lg bg-[#262a33]/60">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-medium text-[#dfe2ee]">Qual o prazo de moderação?</Text>
                    <ChevronRight size={16} color="#8d90a0" />
                  </View>
                  <Text className="text-xs text-[#c3c6d7] mt-1">O envio para lojas e DSPs parceiras leva de 2 a 5 dias úteis após aprovação cadastral da master.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
