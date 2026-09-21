// app/(tabs)/admin.tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import {
  ShieldHalf,
  Users,
  TriangleAlert,
  Settings,
  ShieldAlert,
  UserCog,
  Music,
  Save,
  Search,
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

type ModalConfig = {
  titulo: string;
  mensagem: string;
  tipo: 'aviso' | 'confirmacao';
  aoConfirmar?: () => void;
};

let showAdminModal: (config: ModalConfig | null) => void = () => {};

function avisar(titulo: string, mensagem: string) {
  showAdminModal({ titulo, mensagem, tipo: 'aviso' });
}

function confirmar(titulo: string, mensagem: string, aoConfirmar: () => void) {
  showAdminModal({ titulo, mensagem, tipo: 'confirmacao', aoConfirmar });
}

type AbaAdmin = "metricas" | "equipe" | "auditoria" | "configuracoes";

export default function AdminScreen() {
  const usuario = useAuthStore((s) => s.usuario);
  const paddingBottom = usePlayerAwarePadding(140);
  const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>("metricas");
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  useEffect(() => {
    showAdminModal = setModalConfig;
  }, []);

  if (usuario && usuario.tipo_conta !== "adm") {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View className="flex-1 bg-[#0B101E]">
      <ScrollView contentContainerStyle={{ paddingBottom }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl mx-auto px-4 md:px-10 pt-6 md:pt-8">
          
          {/* Header do Painel */}
          <View className="flex-row items-center mb-6">
            <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center mr-3">
              <ShieldHalf color={colors.primary} size={24} />
            </View>
            <View>
              <Text className="text-2xl md:text-3xl font-bold text-textDark">Painel de Controle</Text>
              <Text className="text-muted text-sm">Gestão global e moderação do sistema</Text>
            </View>
          </View>

          {/* Navegação Interna (Tabs) */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            <AbaMenu titulo="Métricas" icone={Users} ativa={abaAtiva === "metricas"} aoClicar={() => setAbaAtiva("metricas")} />
            <AbaMenu titulo="Equipe" icone={UserCog} ativa={abaAtiva === "equipe"} aoClicar={() => setAbaAtiva("equipe")} />
            <AbaMenu titulo="Auditoria" icone={ShieldAlert} ativa={abaAtiva === "auditoria"} aoClicar={() => setAbaAtiva("auditoria")} />
            <AbaMenu titulo="Configurações" icone={Settings} ativa={abaAtiva === "configuracoes"} aoClicar={() => setAbaAtiva("configuracoes")} />
          </View>

          {/* Renderização condicional das seções */}
          {abaAtiva === "metricas" && <SecaoMetricas />}
          {abaAtiva === "equipe" && <SecaoEquipe />}
          {abaAtiva === "auditoria" && <SecaoAuditoria />}
          {abaAtiva === "configuracoes" && <SecaoConfiguracoes />}

        </View>
      </ScrollView>

      {/* Modal de Alerta / Confirmação */}
      <Modal visible={!!modalConfig} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl p-6 border border-border">
            <Text className="text-xl font-bold text-textDark mb-2">{modalConfig?.titulo}</Text>
            <Text className="text-muted text-base mb-6">{modalConfig?.mensagem}</Text>

            <View className="flex-row justify-end gap-3">
              {modalConfig?.tipo === 'confirmacao' && (
                <Pressable
                  className="px-4 py-2 rounded-xl bg-surface border border-border"
                  onPress={() => setModalConfig(null)}
                >
                  <Text className="text-textDark font-semibold">Cancelar</Text>
                </Pressable>
              )}
              
              <Pressable
                className={`px-4 py-2 rounded-xl ${modalConfig?.tipo === 'confirmacao' ? 'bg-red-500' : 'bg-primary'}`}
                onPress={() => {
                  if (modalConfig?.tipo === 'confirmacao' && modalConfig.aoConfirmar) {
                    modalConfig.aoConfirmar();
                  }
                  setModalConfig(null);
                }}
              >
                <Text className="text-white font-semibold">
                  {modalConfig?.tipo === 'confirmacao' ? 'Confirmar' : 'OK'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------------
// COMPONENTES DAS SEÇÕES
// ------------------------------------------------------------------

function SecaoMetricas() {
  const [metricas, setMetricas] = useState({ usuarios: 0, denuncias: 0, musicas: 0 });

  useFocusEffect(
    useCallback(() => {
      async function carregarMetricas() {
        const [{ count: users }, { count: reports }, { count: songs }] = await Promise.all([
          supabase.from("usuario").select("id", { count: "exact", head: true }),
          supabase.from("denuncia").select("id", { count: "exact", head: true }).eq("status", "pendente"),
          supabase.from("musica").select("id", { count: "exact", head: true })
        ]);
        setMetricas({ usuarios: users ?? 0, denuncias: reports ?? 0, musicas: songs ?? 0 });
      }
      carregarMetricas();
    }, [])
  );

  return (
    <View className="flex-row flex-wrap gap-4">
      <CardMetrica titulo="Total de Usuários" valor={metricas.usuarios} Icone={Users} cor={colors.primary} />
      <CardMetrica titulo="Músicas Publicadas" valor={metricas.musicas} Icone={Music} cor="#8B5CF6" />
      <CardMetrica titulo="Denúncias Ativas" valor={metricas.denuncias} Icone={TriangleAlert} cor={colors.danger} />
    </View>
  );
}

function SecaoEquipe() {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarCriacao, setMostrarCriacao] = useState(false);

  const carregarUsuarios = async () => {
    let query = supabase.from("usuario").select("id, nome, email, tipo_conta, perfil_musico(usuario_id), perfil_organizador(usuario_id)").limit(20);
    
    if (busca) {
      // Quando estiver buscando, mostra apenas usuários comuns ("musico" ou "organizador")
      query = query.ilike('email', `%${busca}%`).not('tipo_conta', 'in', '("moderador","adm")');
    } else {
      // Sem busca, mostra a equipe atual
      query = query.in('tipo_conta', ['moderador', 'adm']);
    }
    
    const { data } = await query;
    if (data) setUsuarios(data);
  };

  useEffect(() => { carregarUsuarios(); }, [busca]);

  type CargoAlvo = "musico" | "organizador" | "moderador" | "adm";

  const alterarCargo = async (id: string, novoTipo: CargoAlvo) => {
    const { data, error } = await supabase
      .from("usuario")
      .update({ tipo_conta: novoTipo })
      .eq("id", id)
      .select("id"); // permite detectar quando o RLS bloqueia sem dar erro

    if (error) {
      avisar("Erro", error.message);
      return;
    }
    if (!data || data.length === 0) {
      avisar("Não foi possível alterar", "Nenhuma linha foi atualizada. Provavelmente uma policy de RLS está bloqueando.");
      return;
    }
    avisar("Sucesso", "Nível de acesso alterado.");
    carregarUsuarios();
  };

  const confirmarPromocaoAdm = (u: any) => {
    confirmar(
      "Tornar administrador?",
      `${u.nome} terá acesso total ao painel, incluindo a promoção de outros ADMs.`,
      () => alterarCargo(u.id, "adm")
    );
  };

  const confirmarRebaixamento = (u: any, cargo: CargoAlvo, nomeCargo: string) => {
    confirmar(
      `Rebaixar para ${nomeCargo}?`,
      `Você perderá seus acessos de Administrador e voltará a ser ${nomeCargo}. Deseja continuar?`,
      () => alterarCargo(u.id, cargo)
    );
  };

  return (
    <View className="bg-card p-4 md:p-6 rounded-2xl border border-border">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-lg font-bold text-textDark">Gerenciamento de Equipe</Text>
        <Pressable 
          onPress={() => setMostrarCriacao(!mostrarCriacao)}
          className={`px-3 py-2 rounded-xl flex-row items-center ${mostrarCriacao ? 'bg-surface' : 'bg-primary/20'}`}
        >
          {mostrarCriacao ? (
            <Text className="text-textDark font-bold text-xs">Voltar à Lista</Text>
          ) : (
            <>
              <UserPlus color={colors.primary} size={16} />
              <Text className="text-primary font-bold ml-2 text-xs">Nova Conta de Equipe</Text>
            </>
          )}
        </Pressable>
      </View>
      
      {mostrarCriacao ? (
        <FormularioCriarModerador />
      ) : (
        <>
          <View className="flex-row items-center border border-border rounded-xl px-3 bg-background mb-4">
            <Search color={colors.muted} size={18} />
            <TextInput 
              placeholder="Buscar usuário por email..."
              placeholderTextColor={colors.muted}
              className="flex-1 text-textDark py-3 ml-2"
              value={busca}
              onChangeText={setBusca}
            />
          </View>

          {usuarios.map(u => (
            <View key={u.id} className="flex-col py-3 border-b border-border/50">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-textDark font-bold">{u.nome}</Text>
                  <Text className="text-muted text-xs">{u.email}</Text>
                </View>
                
                {u.tipo_conta === "adm" ? (
                  <Text className="text-primary font-bold text-xs uppercase">Admin</Text>
                ) : (
                  <View className="flex-row gap-2">
                    {u.tipo_conta === "moderador" ? (
                      <Pressable onPress={() => {
                        const ehMusico = u.perfil_musico && (Array.isArray(u.perfil_musico) ? u.perfil_musico.length > 0 : true);
                        const novoCargo = ehMusico ? "musico" : "organizador";
                        alterarCargo(u.id, novoCargo);
                      }} className="bg-red-500/15 px-3 py-1.5 rounded-lg">
                        <Text className="text-red-400 text-xs font-bold">Remover Mod</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => alterarCargo(u.id, "moderador")} className="bg-primary/20 px-3 py-1.5 rounded-lg">
                        <Text className="text-primary text-xs font-bold">Tornar Mod</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => confirmarPromocaoAdm(u)} className="bg-purple-500/20 px-3 py-1.5 rounded-lg">
                      <Text className="text-purple-300 text-xs font-bold">Tornar ADM</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Botões de rebaixamento para o próprio ADM */}
              {u.tipo_conta === "adm" && usuarioLogado?.id === u.id && (
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-white/5">
                  <Pressable onPress={() => confirmarRebaixamento(u, "moderador", "Moderador")} className="bg-surface px-3 py-1.5 rounded-lg border border-border">
                    <Text className="text-textDark text-xs font-bold">Virar Mod</Text>
                  </Pressable>
                  
                  {u.perfil_musico && (Array.isArray(u.perfil_musico) ? u.perfil_musico.length > 0 : true) && (
                    <Pressable onPress={() => confirmarRebaixamento(u, "musico", "Músico")} className="bg-surface px-3 py-1.5 rounded-lg border border-border">
                      <Text className="text-textDark text-xs font-bold">Virar Músico</Text>
                    </Pressable>
                  )}

                  {u.perfil_organizador && (Array.isArray(u.perfil_organizador) ? u.perfil_organizador.length > 0 : true) && (
                    <Pressable onPress={() => confirmarRebaixamento(u, "organizador", "Organizador")} className="bg-surface px-3 py-1.5 rounded-lg border border-border">
                      <Text className="text-textDark text-xs font-bold">Virar Organizador</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function SecaoAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function carregarAuditoria() {
      const { data } = await supabase
        .from("restricao")
        .select("id, tipo, motivo, data_inicio, moderador:moderador_id(nome), alvo:usuario_id(nome)")
        .order("data_inicio", { ascending: false })
        .limit(10);
      if (data) setLogs(data);
    }
    carregarAuditoria();
  }, []);

  return (
    <View className="bg-card p-4 md:p-6 rounded-2xl border border-border">
      <Text className="text-lg font-bold text-textDark mb-4">Histórico de Moderação</Text>
      
      {logs.length === 0 && <Text className="text-muted text-sm">Nenhuma ação registrada recentemente.</Text>}

      {logs.map(log => (
        <View key={log.id} className="mb-4 bg-background p-3 rounded-xl border border-border">
          <View className="flex-row justify-between mb-1">
            <Text className="text-red-400 font-bold uppercase text-xs">{log.tipo}</Text>
            <Text className="text-muted text-xs">{new Date(log.data_inicio).toLocaleDateString('pt-BR')}</Text>
          </View>
          <Text className="text-textDark text-sm">
            O moderador <Text className="font-bold">{log.moderador?.nome}</Text> puniu <Text className="font-bold">{log.alvo?.nome}</Text>.
          </Text>
          <Text className="text-muted text-xs mt-1">Motivo: {log.motivo}</Text>
        </View>
      ))}
    </View>
  );
}

function SecaoConfiguracoes() {
  const [uploadLimit, setUploadLimit] = useState("15");
  
  const salvarConfiguracoes = () => {
    avisar("Salvo", "Configurações globais atualizadas com sucesso.");
  };

  return (
    <View className="bg-card p-4 md:p-6 rounded-2xl border border-border">
      <Text className="text-lg font-bold text-textDark mb-4">Parâmetros do Sistema</Text>
      
      <View className="mb-4">
        <Text className="text-xs font-semibold text-muted mb-1.5">Limite de Upload (MB)</Text>
        <TextInput 
          value={uploadLimit}
          onChangeText={setUploadLimit}
          keyboardType="numeric"
          className="border border-border rounded-xl bg-background px-3 py-3 text-textDark"
        />
      </View>

      <Pressable onPress={salvarConfiguracoes} className="bg-primary flex-row items-center justify-center py-3 rounded-xl mt-2">
        <Save color="#fff" size={18} />
        <Text className="text-white font-bold ml-2">Salvar Alterações</Text>
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------------
// WIDGETS AUXILIARES E FORMULÁRIOS
// ------------------------------------------------------------------

function FormularioCriarModerador() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [cargo, setCargo] = useState<"moderador" | "adm">("moderador");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  async function criarModerador() {
    setMensagem(null);
    if (!nome || !email || senhaTemporaria.length < 6) {
      setMensagem({ tipo: "erro", texto: "Preencha nome, email e uma senha temporária com 6+ caracteres." });
      return;
    }

    setEnviando(true);
    const { data, error } = await supabase.functions.invoke("create-moderator", {
      body: { nome, email, senhaTemporaria, tipoConta: cargo },
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      console.error("MESSAGE:", error.message);
      console.error("CONTEXT:", error.context);
      setMensagem({ tipo: "erro", texto: "Falha ao criar o moderador. Verifique os logs." });
      setEnviando(false);
      return;
    }

    setMensagem({ tipo: "sucesso", texto: `${cargo === "adm" ? "Administrador" : "Moderador"} ${nome} criado! Avise a senha temporária por um canal seguro.` });
    setNome("");
    setEmail("");
    setSenhaTemporaria("");
    setEnviando(false);
  }

  return (
    <View className="mt-2">
      <Text className="text-muted text-sm mb-5">
        A conta é criada com uma senha temporária — oriente a pessoa a trocá-la no primeiro acesso.
      </Text>

      <View className="md:flex-row md:gap-4">
        <View className="md:flex-1">
          <CampoAdmin label="Nome" value={nome} onChangeText={setNome} placeholder="Nome completo" Icone={User} />
        </View>
        <View className="md:flex-1">
          <CampoAdmin
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@exemplo.com"
            Icone={Mail}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-xs font-semibold text-muted mb-1.5 ml-0.5">Nível de acesso</Text>
        <View className="flex-row gap-2">
          {(["moderador", "adm"] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCargo(c)}
              className={`flex-1 py-3 rounded-xl border items-center ${cargo === c ? "bg-primary/20 border-primary" : "bg-background border-border"}`}
            >
              <Text className={`font-semibold text-sm ${cargo === c ? "text-primary" : "text-muted"}`}>
                {c === "moderador" ? "Moderador" : "Administrador"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <CampoAdmin
        label="Senha temporária"
        value={senhaTemporaria}
        onChangeText={setSenhaTemporaria}
        secureTextEntry
        placeholder="mínimo 6 caracteres"
        Icone={Lock}
      />

      {mensagem && (
        <View className={`flex-row items-start gap-2 rounded-xl px-3.5 py-3 mb-4 ${mensagem.tipo === "erro" ? "bg-red-500/15" : "bg-green-500/15"}`}>
          {mensagem.tipo === "erro" ? (
            <AlertCircle color={colors.danger} size={16} style={{ marginTop: 1 }} />
          ) : (
            <CheckCircle2 color={colors.success} size={16} style={{ marginTop: 1 }} />
          )}
          <Text className={`text-sm flex-1 ${mensagem.tipo === "erro" ? "text-red-400" : "text-green-400"}`}>
            {mensagem.texto}
          </Text>
        </View>
      )}

      <Pressable onPress={criarModerador} disabled={enviando}>
        {({ pressed }) => (
          <View
            className="bg-primary rounded-xl py-3.5 items-center flex-row justify-center"
            style={{ opacity: enviando ? 0.7 : pressed ? 0.9 : 1 }}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <UserPlus color="#fff" size={18} />
                <Text className="text-white font-bold ml-2">Finalizar Criação</Text>
              </>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

function CampoAdmin(props: React.ComponentProps<typeof TextInput> & { label: string; Icone?: typeof User }) {
  const { label, Icone, secureTextEntry, onFocus, onBlur, ...rest } = props;
  const [focado, setFocado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const ehSenha = !!secureTextEntry;

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-muted mb-1.5 ml-0.5">{label}</Text>
      <View className={`flex-row items-center border rounded-xl bg-background px-3.5 ${focado ? "border-primary" : "border-border"}`}>
        {Icone && <Icone color={focado ? colors.primary : "#9CA3AF"} size={18} />}
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={`flex-1 text-textDark py-3 ${Icone ? "ml-2.5" : ""}`}
          secureTextEntry={ehSenha && !mostrarSenha}
          onFocus={(e) => { setFocado(true); onFocus?.(e); }}
          onBlur={(e) => { setFocado(false); onBlur?.(e); }}
          {...rest}
        />
        {ehSenha && (
          <Pressable onPress={() => setMostrarSenha((v) => !v)} hitSlop={8}>
            {mostrarSenha ? <EyeOff color="#9CA3AF" size={18} /> : <Eye color="#9CA3AF" size={18} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AbaMenu({ titulo, icone: Icone, ativa, aoClicar }: { titulo: string, icone: any, ativa: boolean, aoClicar: () => void }) {
  return (
    <Pressable 
      onPress={aoClicar}
      className={`flex-row items-center px-4 py-2.5 rounded-xl border ${ativa ? 'bg-primary/20 border-primary/30' : 'bg-card border-border'}`}
    >
      <Icone color={ativa ? colors.primary : colors.muted} size={16} />
      <Text className={`ml-2 font-semibold text-sm ${ativa ? 'text-primary' : 'text-muted'}`}>{titulo}</Text>
    </Pressable>
  );
}

function CardMetrica({ titulo, valor, Icone, cor }: { titulo: string, valor: number | null, Icone: any, cor: string }) {
  return (
    <View className="flex-1 min-w-[140px] bg-card p-4 rounded-2xl border border-border flex-row items-center gap-3">
      <View className="w-11 h-11 rounded-xl items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cor}1A` }}>
        <Icone color={cor} size={20} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold text-textDark">{valor ?? "…"}</Text>
        <Text className="text-muted text-xs" numberOfLines={1}>{titulo}</Text>
      </View>
    </View>
  );
}
