import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { excluirEvento } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";
import { maskDate, parseDateToDB, parseDateFromDB } from "../../../lib/dateMask";
import { withAuth } from "../../../components/AuthGuard";

const STATUS_OPCOES = ["aberto", "encerrado", "cancelado"] as const;

function GerenciarEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);

  const [carregando, setCarregando] = useState(true);
  const [evento, setEvento] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPCOES)[number]>("aberto");

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("evento")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data: dadosEvento }) => {
        setEvento(dadosEvento ?? null);
        if (dadosEvento) {
          setNome(dadosEvento.nome ?? "");
          setData(dadosEvento.data ? parseDateFromDB(dadosEvento.data) : "");
          setHorario(dadosEvento.horario ?? "");
          setLocalizacao(dadosEvento.localizacao ?? "");
          setGeneroMusical(dadosEvento.genero_musical ?? "");
          setCapacidade(dadosEvento.capacidade != null ? String(dadosEvento.capacidade) : "");
          setStatus((dadosEvento.status as any) ?? "aberto");
        }
        setCarregando(false);
      });
  }, [id]);



  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/perfil");
  }

  async function salvar() {
    if (!evento) return;
    setErro(null);
    setSucesso(false);
    if (!nome || !data) {
      setErro("Preencha ao menos o nome e a data do evento.");
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from("evento")
        .update({
          nome,
          data: data ? parseDateToDB(data) : null,
          horario: horario || null,
          localizacao: localizacao || null,
          genero_musical: generoMusical || null,
          capacidade: capacidade ? Number(capacidade) : null,
          status,
        })
        .eq("id", evento.id);
      if (error) throw error;

      // NOTIFICAR MÚSICOS CONFIRMADOS
      const { data: convitesAceitos } = await supabase
        .from("evento_convite")
        .select("musico_id")
        .eq("evento_id", evento.id)
        .eq("status", "aceito");

      if (convitesAceitos && convitesAceitos.length > 0) {
        for (const convite of convitesAceitos) {
          let conversaId;
          const { data: convExistente } = await supabase
            .from("conversa")
            .select("id")
            .or(`and(usuario_id1.eq.${evento.organizador_id},usuario_id2.eq.${convite.musico_id}),and(usuario_id1.eq.${convite.musico_id},usuario_id2.eq.${evento.organizador_id})`)
            .maybeSingle();

          if (convExistente) {
            conversaId = convExistente.id;
          }

          if (conversaId) {
            await supabase.from("mensagem").insert({
              conversa_id: conversaId,
              remetente_id: evento.organizador_id,
              conteudo: `📢 **Atualização de Evento**\nO evento "${nome}" foi atualizado pelo organizador. Confira os novos detalhes!`,
            });
          }
        }
      }

      setSucesso(true);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  const [modalExclusao, setModalExclusao] = useState(false);
  const [motivoExclusao, setMotivoExclusao] = useState("");

  function iniciarExclusao() {
    setMotivoExclusao("");
    setModalExclusao(true);
  }

  async function confirmarExclusao() {
    if (!evento || !motivoExclusao.trim()) return;
    setExcluindo(true);
    setErro(null);
    try {
      // 1. Notificar os músicos confirmados/pendentes sobre o cancelamento do evento
      const { data: convites } = await supabase
        .from("evento_convite")
        .select("musico_id")
        .eq("evento_id", evento.id)
        .in("status", ["aceito", "pendente"]);

      if (convites && convites.length > 0) {
        for (const convite of convites) {
          let conversaId;
          const { data: convExistente } = await supabase
            .from("conversa")
            .select("id")
            .or(`and(usuario_id1.eq.${evento.organizador_id},usuario_id2.eq.${convite.musico_id}),and(usuario_id1.eq.${convite.musico_id},usuario_id2.eq.${evento.organizador_id})`)
            .maybeSingle();

          if (convExistente) {
            conversaId = convExistente.id;
          }

          if (conversaId) {
            await supabase.from("mensagem").insert({
              conversa_id: conversaId,
              remetente_id: evento.organizador_id,
              conteudo: `⚠️ **Evento Cancelado**\nO evento "${evento.nome}" foi apagado pelo organizador.\n\nMotivo: ${motivoExclusao.trim()}`,
            });
          }
        }
      }

      // 2. Excluir o evento
      await excluirEvento(evento);
      setModalExclusao(false);
      router.replace("/(tabs)/perfil");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao excluir o evento.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Carregando...</Text>
      </View>
    );
  }



  const souDono = !!usuario && !!evento && usuario.id === evento.organizador_id;
  
  if (!evento || !souDono) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">Você não tem permissão para gerenciar esse evento.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 140 }}>
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={voltar}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
          className="bg-card rounded-full p-2 mr-3"
        >
          <ChevronLeft color={colors.textDark} size={22} />
        </Pressable>
        <Text className="text-2xl font-bold text-textDark">Gerenciar evento</Text>
      </View>

      <TextInput
        placeholder="Nome do evento"
        placeholderTextColor="#9CA3AF"
        value={nome}
        onChangeText={setNome}
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />
      <TextInput
        placeholder="DD/MM/AAAA"
        placeholderTextColor="#9CA3AF"
        value={data}
        onChangeText={(txt) => setData(maskDate(txt))}
        keyboardType="numeric"
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />
      <TextInput
        placeholder="Horário (HH:MM)"
        placeholderTextColor="#9CA3AF"
        value={horario}
        onChangeText={setHorario}
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />
      <TextInput
        placeholder="Localização"
        placeholderTextColor="#9CA3AF"
        value={localizacao}
        onChangeText={setLocalizacao}
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />
      <TextInput
        placeholder="Gênero musical"
        placeholderTextColor="#9CA3AF"
        value={generoMusical}
        onChangeText={setGeneroMusical}
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />
      <TextInput
        placeholder="Capacidade"
        placeholderTextColor="#9CA3AF"
        value={capacidade}
        onChangeText={setCapacidade}
        keyboardType="numeric"
        className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      />

      <Text className="text-xs text-muted mb-2">Status do evento</Text>
      <View className="flex-row gap-2 mb-4">
        {STATUS_OPCOES.map((opcao) => (
          <Pressable
            key={opcao}
            onPress={() => setStatus(opcao)}
            className={`flex-1 py-2.5 rounded-full items-center ${status === opcao ? "bg-primary" : "bg-surface"}`}
          >
            <Text className={`font-medium capitalize ${status === opcao ? "text-white" : "text-muted"}`}>{opcao}</Text>
          </Pressable>
        ))}
      </View>

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && <Text className="text-green-600 mb-4 text-center">Alterações salvas!</Text>}

      <Pressable onPress={salvar} disabled={salvando || excluindo} className="bg-primary rounded-full py-4 items-center mb-3">
        {salvando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar alterações</Text>}
      </Pressable>

      <Pressable
        onPress={iniciarExclusao}
        disabled={salvando || excluindo}
        className="flex-row items-center justify-center border border-red-500/30 bg-red-500/10 rounded-full py-4"
      >
        {excluindo ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Trash2 color={colors.danger} size={18} />
            <Text className="text-red-400 font-bold ml-2">Excluir evento</Text>
          </>
        )}
      </Pressable>

      <Modal transparent visible={modalExclusao} animationType="fade" onRequestClose={() => setModalExclusao(false)}>
        <View className="flex-1 justify-center bg-black/50 px-4">
          <View className="bg-[#1A2235] rounded-2xl p-6 border border-white/10">
            <Text className="text-white font-bold text-xl mb-2">Excluir Evento</Text>
            <Text className="text-gray-400 text-sm mb-4">
              Ao excluir o evento, os músicos confirmados serão notificados no chat. Informe o motivo do cancelamento:
            </Text>

            <TextInput
              value={motivoExclusao}
              onChangeText={setMotivoExclusao}
              placeholder="Motivo do cancelamento..."
              placeholderTextColor="#64748B"
              multiline
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-h-[100px] mb-4"
              style={{ textAlignVertical: "top" }}
            />

            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => setModalExclusao(false)}
                className="flex-1 bg-white/10 rounded-xl py-3 items-center border border-white/10"
              >
                <Text className="text-white font-bold">Voltar</Text>
              </Pressable>
              
              <Pressable 
                onPress={confirmarExclusao}
                disabled={excluindo || !motivoExclusao.trim()}
                className={`flex-1 rounded-xl py-3 items-center ${!motivoExclusao.trim() ? 'bg-red-500/30' : 'bg-red-500'}`}
              >
                {excluindo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">Excluir Evento</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

export default withAuth(GerenciarEvento, ['organizador']);
