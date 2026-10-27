import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2, Calendar, Clock } from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { excluirEvento } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";
import { maskDate, parseDateToDB, parseDateFromDB } from "../../../lib/dateMask";
import { withAuth } from "../../../components/AuthGuard";
import DatePickerModal from "../../../components/DatePickerModal";
import TimePickerModal from "../../../components/TimePickerModal";

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

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRelogio, setMostrarRelogio] = useState(false);

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
      <View className="flex-1 bg-[#0a0e16] items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const souDono = !!usuario && !!evento && usuario.id === evento.organizador_id;
  
  if (!evento || !souDono) {
    return (
      <View className="flex-1 bg-[#0a0e16] items-center justify-center px-8">
        <Text className="text-muted text-center">Você não tem permissão para gerenciar esse evento.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0e16]" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 140 }}>
      <View className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        {/* Top Bar / Return Navigation */}
        <View className="flex-row items-center gap-4 mb-2">
          <Pressable
            onPress={voltar}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            className="w-10 h-10 rounded-full bg-[#181c24] active:bg-[#262a33] items-center justify-center transition-colors shadow-sm"
            style={{ cursor: "pointer" as any }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft color="#dfe2ee" size={20} />
          </Pressable>
          <Text className="text-2xl font-bold text-[#dfe2ee] tracking-tight">Gerenciar evento</Text>
        </View>

        {/* Input 1: Nome do Evento */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Nome do evento
          </Text>
          <TextInput
            placeholder="Nome do evento"
            placeholderTextColor="#8d90a0"
            value={nome}
            onChangeText={setNome}
            className="w-full bg-[#181c24] text-[#dfe2ee] text-sm px-4 py-3 rounded-lg border border-transparent"
          />
        </View>

        {/* Input 2: Data do Evento */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Data
          </Text>
          <Pressable
            onPress={() => setMostrarCalendario(true)}
            className="w-full bg-[#181c24] px-4 py-3 rounded-lg border border-transparent flex-row items-center justify-between active:bg-[#262a33]"
            style={{ cursor: "pointer" as any }}
          >
            <Text className={`text-sm ${data ? "text-[#dfe2ee]" : "text-[#8d90a0]"}`}>
              {data || "DD/MM/AAAA"}
            </Text>
            <Calendar size={18} color="#8d90a0" />
          </Pressable>
        </View>

        {/* Input 3: Horário */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Horário
          </Text>
          <Pressable
            onPress={() => setMostrarRelogio(true)}
            className="w-full bg-[#181c24] px-4 py-3 rounded-lg border border-transparent flex-row items-center justify-between active:bg-[#262a33]"
            style={{ cursor: "pointer" as any }}
          >
            <Text className={`text-sm ${horario ? "text-[#dfe2ee]" : "text-[#8d90a0]"}`}>
              {horario || "14:00:00"}
            </Text>
            <Clock size={18} color="#8d90a0" />
          </Pressable>
        </View>

        {/* Input 4: Local / Endereço */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Local / Endereço
          </Text>
          <TextInput
            placeholder="Local / Endereço"
            placeholderTextColor="#8d90a0"
            value={localizacao}
            onChangeText={setLocalizacao}
            className="w-full bg-[#181c24] text-[#dfe2ee] text-sm px-4 py-3 rounded-lg border border-transparent"
          />
        </View>

        {/* Input 5: Gênero Musical */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Gênero musical
          </Text>
          <TextInput
            placeholder="Gênero musical"
            placeholderTextColor="#8d90a0"
            value={generoMusical}
            onChangeText={setGeneroMusical}
            className="w-full bg-[#181c24] text-[#dfe2ee] text-sm px-4 py-3 rounded-lg border border-transparent"
          />
        </View>

        {/* Input 6: Capacidade */}
        <View className="flex flex-col gap-1.5">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] tracking-wider uppercase pl-1">
            Capacidade
          </Text>
          <TextInput
            placeholder="Capacidade"
            placeholderTextColor="#8d90a0"
            value={capacidade}
            onChangeText={setCapacidade}
            keyboardType="numeric"
            className="w-full bg-[#181c24] text-[#dfe2ee] text-sm px-4 py-3 rounded-lg border border-transparent"
          />
        </View>

        {/* Status do Evento */}
        <View className="flex flex-col gap-1.5 mt-1">
          <Text className="text-[11px] font-semibold text-[#c3c6d7] pl-1">
            Status do evento
          </Text>
          <View className="flex-row gap-2 p-1.5 bg-[#181c24] rounded-xl">
            {STATUS_OPCOES.map((opcao) => {
              const ativo = status === opcao;
              return (
                <Pressable
                  key={opcao}
                  onPress={() => setStatus(opcao)}
                  className={`flex-1 py-2.5 rounded-lg items-center justify-center transition-all ${
                    ativo
                      ? "bg-[#2563eb] shadow-[0_0_16px_rgba(37,99,235,0.4)]"
                      : "bg-transparent active:bg-white/5"
                  }`}
                  style={{ cursor: "pointer" as any }}
                >
                  <Text
                    className={`text-sm capitalize ${
                      ativo ? "text-white font-semibold" : "text-[#c3c6d7] font-medium"
                    }`}
                  >
                    {opcao}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {erro && <Text className="text-red-400 my-1 text-center text-sm">{erro}</Text>}
        {sucesso && <Text className="text-emerald-400 my-1 text-center text-sm font-medium">Alterações salvas com sucesso!</Text>}

        {/* Action Buttons */}
        <View className="flex flex-col gap-3 mt-3">
          {/* Primary Action: Salvar alterações */}
          <Pressable
            onPress={salvar}
            disabled={salvando || excluindo}
            className="w-full py-3.5 rounded-xl bg-[#2563eb] items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.35)] active:opacity-80"
            style={{ cursor: "pointer" as any }}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-sm">Salvar alterações</Text>
            )}
          </Pressable>

          {/* Destructive Action: Excluir evento */}
          <Pressable
            onPress={iniciarExclusao}
            disabled={salvando || excluindo}
            className="w-full py-3.5 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/20 active:bg-[#93000a]/35 flex-row items-center justify-center gap-2"
            style={{ cursor: "pointer" as any }}
          >
            {excluindo ? (
              <ActivityIndicator color="#ffb4ab" />
            ) : (
              <>
                <Trash2 color="#ffb4ab" size={18} />
                <Text className="text-[#ffb4ab] font-semibold text-sm">Excluir evento</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={modalExclusao} animationType="fade" onRequestClose={() => setModalExclusao(false)}>
        <View className="flex-1 justify-center bg-black/60 px-4">
          <View className="bg-[#181c24] rounded-2xl p-6 border border-white/10 max-w-lg mx-auto w-full">
            <Text className="text-[#dfe2ee] font-bold text-xl mb-2">Excluir Evento</Text>
            <Text className="text-[#c3c6d7] text-sm mb-4">
              Ao excluir o evento, os músicos confirmados serão notificados no chat. Informe o motivo do cancelamento:
            </Text>

            <TextInput
              value={motivoExclusao}
              onChangeText={setMotivoExclusao}
              placeholder="Motivo do cancelamento..."
              placeholderTextColor="#8d90a0"
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

      <DatePickerModal
        visible={mostrarCalendario}
        valor={data}
        onFechar={() => setMostrarCalendario(false)}
        onSelecionar={setData}
      />
      <TimePickerModal
        visible={mostrarRelogio}
        valor={horario}
        onFechar={() => setMostrarRelogio(false)}
        onSelecionar={setHorario}
      />

    </ScrollView>
  );
}

export default withAuth(GerenciarEvento, ['organizador']);
