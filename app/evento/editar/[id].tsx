import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { excluirEvento } from "../../../lib/biblioteca";
import { confirmar } from "../../../lib/alertas";
import { useAuthStore } from "../../../store/authStore";
import { colors } from "../../../constants/theme";

const STATUS_OPCOES = ["aberto", "encerrado", "cancelado"] as const;

// Gerenciar evento: só quem organizou o evento (organizador_id ===
// usuário logado) chega a ver o formulário — pra qualquer outra
// pessoa que tente abrir esse link, a tela mostra "sem permissão"
// (e o Supabase, via RLS em evento_update_dono_ou_moderador, também
// bloqueiaria a alteração mesmo que alguém forçasse a chamada).
export default function GerenciarEvento() {
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
          setData(dadosEvento.data ?? "");
          setHorario(dadosEvento.horario ?? "");
          setLocalizacao(dadosEvento.localizacao ?? "");
          setGeneroMusical(dadosEvento.genero_musical ?? "");
          setCapacidade(dadosEvento.capacidade != null ? String(dadosEvento.capacidade) : "");
          setStatus((dadosEvento.status as any) ?? "aberto");
        }
        setCarregando(false);
      });
  }, [id]);

  const souDono = !!usuario && !!evento && usuario.id === evento.organizador_id;

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
          data,
          horario: horario || null,
          localizacao: localizacao || null,
          genero_musical: generoMusical || null,
          capacidade: capacidade ? Number(capacidade) : null,
          status,
        })
        .eq("id", evento.id);
      if (error) throw error;

      setSucesso(true);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    const ok = await confirmar(
      "Excluir evento",
      `Tem certeza que quer excluir "${evento.nome}"? Publicações que divulgam esse evento continuam existindo, só perdem o vínculo. Essa ação não pode ser desfeita.`,
      "Excluir"
    );
    if (ok) excluir();
  }

  async function excluir() {
    if (!evento) return;
    setExcluindo(true);
    try {
      await excluirEvento(evento);
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
        placeholder="Data (AAAA-MM-DD)"
        placeholderTextColor="#9CA3AF"
        value={data}
        onChangeText={setData}
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
        onPress={confirmarExclusao}
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
    </ScrollView>
  );
}
