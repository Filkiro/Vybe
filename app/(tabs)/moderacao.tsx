import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
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
  MessageSquareText
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

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

  if (usuario && usuario.tipo_conta !== "moderador" && usuario.tipo_conta !== "adm") {
    return <Redirect href="/(tabs)/home" />;
  }

  const [denuncias, setDenuncias] = useState<DenunciaCompleta[]>([]);
  const [chamados, setChamados] = useState<ChamadoSuporte[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

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

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom }}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={colors.primary} />}
    >
      <View className="px-4 pt-6 md:px-10 max-w-4xl mx-auto w-full">
        <View className="mb-6 md:mb-8">
          <Text className="text-2xl md:text-3xl font-bold text-textDark mb-1">Central de Moderação</Text>
          <Text className="text-muted text-sm">Analise e tome decisões sobre denúncias da comunidade.</Text>
        </View>

        <View className="flex-row items-center gap-2 mb-4">
          <TriangleAlert color={colors.primary} size={20} />
          <Text className="text-lg font-bold text-textDark">
            Fila de Análise {denuncias.length > 0 && `(${denuncias.length})`}
          </Text>
        </View>

        {!carregando && denuncias.length === 0 && (
          <View className="bg-card items-center justify-center p-10 rounded-3xl border border-border mt-4">
            <CheckCircle2 color={colors.success} size={48} className="mb-4 opacity-80" />
            <Text className="text-textDark font-bold text-lg mb-1">Tudo limpo por aqui!</Text>
            <Text className="text-muted text-center">Nenhuma denúncia pendente no momento. Bom trabalho.</Text>
          </View>
        )}

        {denuncias.map((item) => (
          <View key={item.id} className="bg-card rounded-2xl border border-border mb-4 overflow-hidden">
            {/* Cabeçalho do Card */}
            <View className="bg-surface/50 px-4 py-3 flex-row justify-between items-center border-b border-border">
              <View className="flex-row items-center flex-1 mr-4">
                <ShieldAlert color={colors.danger} size={16} />
                <Text className="text-textDark font-bold uppercase text-xs ml-2 tracking-wider">
                  Denúncia de {item.tipo_alvo}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Clock color={colors.muted} size={12} />
                <Text className="text-muted text-xs ml-1">{formatarData(item.data)}</Text>
              </View>
            </View>

            <View className="p-4">
              {/* Box de Envolvidos (Evita quebra de layout com numberOfLines) */}
              <View className="flex-row items-center bg-background rounded-xl border border-border p-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-0.5 font-medium">Denunciante</Text>
                  <Text className="text-textDark font-bold text-sm" numberOfLines={1}>
                    {item.denunciante_nome}
                  </Text>
                </View>
                
                <View className="px-2">
                  <ArrowRight color={colors.muted} size={16} />
                </View>
                
                <View className="flex-1 items-end">
                  <Text className="text-xs text-muted mb-0.5 font-medium">Alvo ({item.tipo_alvo})</Text>
                  <Text className="text-textDark font-bold text-sm" numberOfLines={1}>
                    {item.alvo_nome || item.alvo_id}
                  </Text>
                </View>
              </View>

              {/* Informações da Denúncia */}
              <View className="mb-4">
                <Text className="text-textDark text-base font-semibold mb-1">
                  Motivo: {item.motivo}
                </Text>
                {item.descricao ? (
                  <Text className="text-muted text-sm">{item.descricao}</Text>
                ) : (
                  <Text className="text-muted/50 text-sm italic">Sem descrição adicional.</Text>
                )}
              </View>

              {/* Ações */}
              <View className="flex-row flex-wrap justify-between gap-2 border-t border-border/50 pt-4 mt-2">
                
                {/* Botão de Ver Perfil/Conteúdo */}
<Pressable
  onPress={() => {
    if (item.tipo_alvo === "usuario") {
      router.push(`/usuario/${item.alvo_id}`); // Ajustado para a sua rota
    }
  }}
  className="bg-primary/10 px-3 py-2 rounded-xl flex-row items-center"
>
  <UserSearch color={colors.primary} size={16} />
  <Text className="text-primary font-bold text-xs ml-2">Ver Perfil</Text>
</Pressable>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => marcarResolvida(item.id)}
                    disabled={processando === item.id}
                    className="bg-surface px-4 py-2 rounded-xl flex-row items-center border border-border"
                    style={{ opacity: processando === item.id ? 0.5 : 1 }}
                  >
                    <CheckCircle2 color={colors.textDark} size={16} />
                    <Text className="text-textDark font-bold text-xs ml-2">Ignorar / Resolver</Text>
                  </Pressable>

                  {item.tipo_alvo === "usuario" && (
                    <Pressable
                      onPress={() => banirUsuario(item)}
                      disabled={processando === item.id}
                      className="bg-red-500/15 px-4 py-2 rounded-xl flex-row items-center"
                      style={{ opacity: processando === item.id ? 0.5 : 1 }}
                    >
                      <Ban color={colors.danger} size={16} />
                      <Text className="text-red-500 font-bold text-xs ml-2">Banir Infrator</Text>
                    </Pressable>
                  )}
                </View>

              </View>
            </View>
          </View>
        ))}

        <View className="flex-row items-center gap-2 mb-4 mt-4">
          <LifeBuoy color={colors.primary} size={20} />
          <Text className="text-lg font-bold text-textDark">
            Chamados de Suporte {chamados.length > 0 && `(${chamados.length})`}
          </Text>
        </View>

        {!carregando && chamados.length === 0 && (
          <View className="bg-card items-center justify-center p-10 rounded-3xl border border-border mb-4">
            <CheckCircle2 color={colors.success} size={40} className="mb-3 opacity-80" />
            <Text className="text-muted text-center">Nenhum chamado em aberto.</Text>
          </View>
        )}

        {chamados.map((item) => (
          <View key={item.id} className="bg-card rounded-2xl border border-border mb-4 p-4">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1 mr-2">
                <MessageSquareText color={colors.primary} size={16} />
                <Text className="text-textDark font-bold ml-2 flex-1" numberOfLines={1}>{item.assunto}</Text>
              </View>
              <Text className="text-muted text-xs">{formatarData(item.criado_em)}</Text>
            </View>
            <Text className="text-muted text-xs mb-2">De: {item.usuario_nome} · status: {item.status}</Text>
            {item.descricao && <Text className="text-textDark text-sm mb-3">{item.descricao}</Text>}

            <View className="flex-row gap-2 flex-wrap">
              {item.status === "aberto" && (
                <Pressable
                  onPress={() => atualizarChamado(item.id, "em_andamento")}
                  disabled={processando === item.id}
                  className="bg-surface px-3 py-2 rounded-xl border border-border"
                >
                  <Text className="text-textDark font-bold text-xs">Assumir</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => atualizarChamado(item.id, "resolvido")}
                disabled={processando === item.id}
                className="bg-primary/10 px-3 py-2 rounded-xl"
              >
                <Text className="text-primary font-bold text-xs">Marcar resolvido</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}