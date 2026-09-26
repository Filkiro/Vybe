import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput } from "react-native";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { 
  TriangleAlert, 
  Ban, 
  ShieldAlert, 
  ArrowRight, 
  UserSearch, 
  CheckCircle2, 
  Clock,
  LifeBuoy,
  MessageSquareText,
  Lock
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";
import { maskDate, parseDateToDB } from "../../lib/dateMask";

type DenunciaCompleta = {
  id: string;
  tipo_alvo: string;
  alvo_id: string;
  motivo: string;
  descricao: string | null;
  data: string;
  denunciante_nome: string;
  alvo_nome?: string;
};

type ChamadoSuporte = {
  id: string;
  assunto: string;
  descricao: string | null;
  status: string;
  criado_em: string;
  usuario_nome: string;
};

export default function ModeracaoScreen() {
  const usuario = useAuthStore((s) => s.usuario);
  const router = useRouter();
  const paddingBottom = usePlayerAwarePadding(140);
  

  const [denuncias, setDenuncias] = useState<DenunciaCompleta[]>([]);
  const [chamados, setChamados] = useState<ChamadoSuporte[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [bloqueandoId, setBloqueandoId] = useState<string | null>(null);
  const [dataFimBloqueio, setDataFimBloqueio] = useState("");
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);

  async function bloquearUsuario(denuncia: DenunciaCompleta) {
  if (denuncia.tipo_alvo !== "usuario") return;
  if (!dataFimBloqueio) {
    setErroBloqueio("Escolha até quando o usuário fica bloqueado.");
    return;
  }
  setErroBloqueio(null);
  setProcessando(denuncia.id);

  const parsedData = parseDateToDB(dataFimBloqueio);

  await supabase.from("restricao").insert({
    usuario_id: denuncia.alvo_id,
    moderador_id: usuario?.id,
    tipo: "bloqueio",
    motivo: denuncia.motivo,
    data_fim: parsedData,
  });
  await supabase.from("usuario").update({ status: "bloqueado" }).eq("id", denuncia.alvo_id);
  await supabase
    .from("denuncia")
    .update({ status: "resolvida", moderador_id: usuario?.id })
    .eq("id", denuncia.id);

  setProcessando(null);
  setBloqueandoId(null);
  setDataFimBloqueio("");
  setDenuncias((atual) => atual.filter((d) => d.id !== denuncia.id));
}

  const carregar = useCallback(async () => {
    setCarregando(true);
    
    // 1. Busca as denúncias pendentes
    const { data: denunciasData } = await supabase
      .from("denuncia")
      .select("id, tipo_alvo, alvo_id, motivo, descricao, data, usuario:denunciante_id(nome)")
      .eq("status", "pendente")
      .order("data", { ascending: true });

    if (!denunciasData) {
      setDenuncias([]);
      setCarregando(false);
      return;
    }

    // 2. Identifica as denúncias que são contra usuários para buscar o nome do alvo
    const alvoUsuariosIds = denunciasData
      .filter((d) => d.tipo_alvo === "usuario")
      .map((d) => d.alvo_id);

    let mapaNomesAlvo: Record<string, string> = {};

    if (alvoUsuariosIds.length > 0) {
      const { data: alvosData } = await supabase
        .from("usuario")
        .select("id, nome")
        .in("id", alvoUsuariosIds);

      if (alvosData) {
        alvosData.forEach((u) => {
          mapaNomesAlvo[u.id] = u.nome;
        });
      }
    }

    // 3. Monta o objeto final
    setDenuncias(
      denunciasData.map((d: any) => ({
        id: d.id,
        tipo_alvo: d.tipo_alvo,
        alvo_id: d.alvo_id,
        motivo: d.motivo,
        descricao: d.descricao,
        data: d.data,
        denunciante_nome: d.usuario?.nome ?? "Usuário Anônimo",
        alvo_nome: d.tipo_alvo === "usuario" ? (mapaNomesAlvo[d.alvo_id] ?? "Usuário desconhecido") : undefined,
      }))
    );

    // Chamados de suporte em aberto/andamento — mesma fila, seção
    // separada, pra moderador não precisar sair da Central.
    const { data: chamadosData } = await supabase
      .from("suporte")
      .select("id, assunto, descricao, status, criado_em, usuario:usuario_id(nome)")
      .in("status", ["aberto", "em_andamento"])
      .order("criado_em", { ascending: true });
    // status possíveis: aberto, em_andamento, resolvido

    setChamados(
      (chamadosData ?? []).map((c: any) => ({
        id: c.id,
        assunto: c.assunto,
        descricao: c.descricao,
        status: c.status,
        criado_em: c.criado_em,
        usuario_nome: c.usuario?.nome ?? "Usuário",
      }))
    );

    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function marcarResolvida(id: string) {
    setProcessando(id);
    await supabase
      .from("denuncia")
      .update({ status: "resolvida", moderador_id: usuario?.id })
      .eq("id", id);
    setProcessando(null);
    setDenuncias((atual) => atual.filter((d) => d.id !== id));
  }

  async function banirUsuario(denuncia: DenunciaCompleta) {
    if (denuncia.tipo_alvo !== "usuario") return;
    setProcessando(denuncia.id);

    await supabase.from("restricao").insert({
      usuario_id: denuncia.alvo_id,
      moderador_id: usuario?.id,
      tipo: "banimento",
      motivo: denuncia.motivo,
    });
    await supabase.from("usuario").update({ status: "banido" }).eq("id", denuncia.alvo_id);
    await supabase
      .from("denuncia")
      .update({ status: "resolvida", moderador_id: usuario?.id })
      .eq("id", denuncia.id);

    setProcessando(null);
    setDenuncias((atual) => atual.filter((d) => d.id !== denuncia.id));
  }

  async function atualizarChamado(id: string, novoStatus: string) {
    setProcessando(id);
    await supabase
      .from("suporte")
      .update({ status: novoStatus, moderador_id: usuario?.id })
      .eq("id", id);
    setProcessando(null);
    if (novoStatus === "resolvido") {
      setChamados((atual) => atual.filter((c) => c.id !== id));
    } else {
      setChamados((atual) => atual.map((c) => (c.id === id ? { ...c, status: novoStatus } : c)));
    }
  }

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (usuario && usuario.tipo_conta !== "moderador" && usuario.tipo_conta !== "adm") {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View className="flex-1 bg-[#0B101E]">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: paddingBottom + 24 }}>
        <View className="w-full flex-col gap-10 max-w-7xl mx-auto">
          {/* Top Ambient Glow Field */}
          <View className="relative w-full overflow-hidden rounded-2xl bg-[#181c24] p-6 shadow-xl">
            <View className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#2563eb]/10" />
            <View className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-[#93000a]/10" />
            <View className="relative z-10 flex-col gap-2">
              <View className="flex-row items-center gap-2">
                <View className="items-center justify-center w-8 h-8 rounded-full bg-[#2563eb]/20">
                  <ShieldAlert color="#a4c9ff" size={16} />
                </View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#b4c5ff]">Painel de Integridade & Confiança</Text>
              </View>
              <Text className="text-[32px] font-bold text-[#dfe2ee] tracking-tight">Central de Moderação</Text>
              <Text className="text-[14px] text-[#c3c6d7] max-w-2xl">Analise e tome decisões sobre denúncias da comunidade com base nos termos de serviço e diretrizes de áudio.</Text>
            </View>
          </View>

          {/* Fila de Análise */}
          <View className="flex-col gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="items-center justify-center w-7 h-7 rounded-lg bg-[#93000a]/20">
                  <TriangleAlert color="#ffb4ab" size={16} />
                </View>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-[20px] font-semibold text-[#dfe2ee]">Fila de Análise</Text>
                  <View className="px-2 py-0.5 rounded-full bg-[#93000a]/30">
                    <Text className="text-[11px] font-bold text-[#ffb4ab]">{denuncias.length}</Text>
                  </View>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-[11px] font-bold text-[#8d90a0]">Prioridade Alta</Text>
              </View>
            </View>

            {denuncias.length === 0 && !carregando ? (
               <Text className="text-[#8d90a0] text-sm">Fila limpa.</Text>
            ) : (
              denuncias.map((item) => (
                <View key={item.id} className="relative overflow-hidden rounded-xl bg-[#181c24] p-6 shadow-xl flex-col gap-6">
                  {/* Left accent strip */}
                  <View className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffb4ab]" />
                  
                  {/* Header */}
                  <View className="flex-row flex-wrap items-center justify-between gap-3">
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#93000a]/40">
                        <ShieldAlert color="#ffdad6" size={12} />
                        <Text className="text-[11px] font-bold tracking-wide uppercase text-[#ffdad6]">Denúncia de {item.tipo_alvo}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Clock color="#8d90a0" size={14} />
                      <Text className="text-[13px] text-[#c3c6d7]">{formatarData(item.data)}</Text>
                    </View>
                  </View>

                  {/* Route Diagram */}
                  <View className="flex-row items-center bg-[#0a0e16]/70 rounded-xl p-4 gap-4 flex-wrap">
                    <View className="flex-row items-center gap-4 flex-1 min-w-[150px]">
                      <View className="w-12 h-12 rounded-xl bg-[#31353e] items-center justify-center">
                        <ShieldAlert color="#b4c5ff" size={24} />
                      </View>
                      <View className="flex-col min-w-0">
                        <Text className="text-[11px] uppercase tracking-wider text-[#8d90a0]">Denunciante</Text>
                        <Text className="text-[14px] font-semibold text-[#dfe2ee]" numberOfLines={1}>{item.denunciante_nome}</Text>
                      </View>
                    </View>

                    <View className="w-8 h-8 rounded-full bg-[#262a33] items-center justify-center">
                      <ArrowRight color="#a4c9ff" size={16} />
                    </View>

                    <View className="flex-row items-center gap-4 flex-1 min-w-[150px]">
                      <View className="w-12 h-12 rounded-xl bg-[#2563eb]/20 items-center justify-center">
                        <UserSearch color="#dfe2ee" size={24} />
                      </View>
                      <View className="flex-col min-w-0">
                        <Text className="text-[11px] uppercase tracking-wider text-[#ffb4ab]">Alvo ({item.tipo_alvo})</Text>
                        <Text className="text-[14px] font-bold text-[#dfe2ee]" numberOfLines={1}>{item.alvo_nome || item.alvo_id}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Detail Block */}
                  <View className="flex-col gap-2 bg-[#1c2028]/60 rounded-xl p-4">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[11px] text-[#8d90a0]">Motivo da notificação:</Text>
                      <Text className="text-[13px] font-semibold text-[#b4c5ff]">{item.motivo}</Text>
                    </View>
                    <View className="flex-col gap-1 mt-2">
                      <Text className="text-[11px] text-[#8d90a0]">Descrição relatada:</Text>
                      <View className="bg-[#0a0e16]/90 rounded-lg p-4">
                        <Text className="text-[14px] text-[#dfe2ee] leading-5">{item.descricao || "Sem descrição"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row flex-wrap items-center justify-between gap-3 mt-2 border-t border-[#31353e]/40 pt-4">
                    <View>
                      {item.tipo_alvo === "usuario" && (
                        <Pressable onPress={() => router.push(`/usuario/${item.alvo_id}`)} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#262a33] active:bg-[#353942]">
                          <UserSearch color="#a4c9ff" size={16} />
                          <Text className="text-[13px] text-[#dfe2ee] font-semibold">Ver Perfil Completo</Text>
                        </Pressable>
                      )}
                    </View>

                    <View className="flex-row flex-wrap items-center gap-2 ml-auto">
                      <Pressable onPress={() => marcarResolvida(item.id)} disabled={processando === item.id} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#262a33] active:bg-[#31353e]">
                        <CheckCircle2 color="#8d90a0" size={16} />
                        <Text className="text-[13px] text-[#c3c6d7] font-semibold">Ignorar / Resolver</Text>
                      </Pressable>
                      {item.tipo_alvo === "usuario" && (
                        <Pressable onPress={() => setBloqueandoId(bloqueandoId === item.id ? null : item.id)} disabled={processando === item.id} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#262a33] active:bg-[#353942]">
                          <Lock color="#a4c9ff" size={16} />
                          <Text className="text-[13px] text-[#dfe2ee] font-semibold">Bloquear</Text>
                        </Pressable>
                      )}
                      {item.tipo_alvo === "usuario" && (
                        <Pressable onPress={() => banirUsuario(item)} disabled={processando === item.id} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#93000a] active:bg-[#ffb4ab]">
                          <Ban color="#ffdad6" size={16} />
                          <Text className="text-[13px] text-[#ffdad6] font-bold">Banir Infrator</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Block Input */}
                  {bloqueandoId === item.id && (
                     <View className="mt-3 bg-[#0a0e16] border border-[#31353e] rounded-xl p-4">
                       <Text className="text-[#dfe2ee] text-sm font-semibold mb-2">Bloquear até quando?</Text>
                       <TextInput
                         placeholder="DD/MM/AAAA"
                         placeholderTextColor="#8d90a0"
                         value={dataFimBloqueio}
                         onChangeText={(t) => setDataFimBloqueio(maskDate(t))}
                         keyboardType="numeric"
                         className="border border-[#31353e] rounded-xl bg-[#1c2028] px-4 py-3 text-[#dfe2ee] mb-2"
                       />
                       {erroBloqueio && <Text className="text-[#ffb4ab] text-xs mb-2">{erroBloqueio}</Text>}
                       <Pressable
                         onPress={() => bloquearUsuario(item)}
                         disabled={processando === item.id}
                         className="bg-[#2563eb] rounded-xl py-3 items-center"
                       >
                         <Text className="text-[#eeefff] font-bold text-[13px]">Confirmar bloqueio</Text>
                       </Pressable>
                     </View>
                   )}
                </View>
              ))
            )}
          </View>

          {/* Chamados de Suporte */}
          <View className="flex-col gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="items-center justify-center w-7 h-7 rounded-lg bg-[#2563eb]/20">
                  <LifeBuoy color="#b4c5ff" size={16} />
                </View>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-[20px] font-semibold text-[#dfe2ee]">Chamados de Suporte</Text>
                  <View className="px-2 py-0.5 rounded-full bg-[#2563eb]/30">
                    <Text className="text-[11px] font-bold text-[#b4c5ff]">{chamados.length}</Text>
                  </View>
                </View>
              </View>
            </View>

            {chamados.length === 0 && !carregando && (
               <Text className="text-[#8d90a0] text-sm">Nenhum chamado aberto.</Text>
            )}

            {chamados.map((item) => (
              <View key={item.id} className="relative overflow-hidden rounded-xl bg-[#181c24] p-6 shadow-xl flex-col gap-4">
                <View className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563eb]" />
                
                <View className="flex-col justify-between gap-3">
                  <View className="flex-row items-start gap-4">
                    <View className="w-10 h-10 rounded-xl bg-[#2563eb]/15 items-center justify-center">
                      <MessageSquareText color="#b4c5ff" size={20} />
                    </View>
                    <View className="flex-col flex-1 pr-12">
                      <Text className="text-[20px] font-bold text-[#dfe2ee] leading-snug">{item.assunto}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-[11px] text-[#c3c6d7]">De: <Text className="font-semibold text-[#dfe2ee]">{item.usuario_nome}</Text></Text>
                        <Text className="text-[#8d90a0]">•</Text>
                        <View className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0267b8]/40">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#a4c9ff]" />
                          <Text className="text-[11px] font-medium text-[#d6e5ff]">status: {item.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className="absolute right-0 top-0 flex-row items-center gap-1.5">
                    <Clock color="#8d90a0" size={14} />
                    <Text className="text-[13px] text-[#c3c6d7]">{formatarData(item.criado_em)}</Text>
                  </View>
                </View>

                <View className="bg-[#0a0e16]/80 rounded-xl p-4 flex-col gap-2">
                  <Text className="text-[11px] text-[#8d90a0]">Mensagem enviada pelo usuário:</Text>
                  <Text className="text-[14px] text-[#dfe2ee] leading-relaxed">{item.descricao}</Text>
                </View>

                <View className="flex-row flex-wrap items-center justify-between gap-3 pt-2">
                  <View className="flex-row items-center gap-2 bg-[#1c2028]/50 px-3 py-1.5 rounded-lg">
                    <Text className="text-[11px] text-[#c3c6d7]">Ticket vinculado à conta</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {item.status === "aberto" && (
                      <Pressable onPress={() => atualizarChamado(item.id, "em_andamento")} disabled={processando === item.id} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#262a33] active:bg-[#353942]">
                        <Text className="text-[13px] text-[#dfe2ee] font-semibold">Assumir Chamado</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => atualizarChamado(item.id, "resolvido")} disabled={processando === item.id} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-[#2563eb] active:bg-[#0053db]">
                      <CheckCircle2 color="#eeefff" size={16} />
                      <Text className="text-[13px] text-[#eeefff] font-semibold">Marcar Resolvido</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>



        </View>
      </ScrollView>
    </View>
  );
}