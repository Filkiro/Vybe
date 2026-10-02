import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, Usuario } from "../lib/supabase";

type TipoContaCadastro = "musico" | "organizador";

type AuthState = {
  usuario: Usuario | null;
  carregando: boolean;
  inicializar: () => Promise<void>;
  restricaoAtiva: { tipo: string; motivo: string | null; data_fim: string | null } | null;
  entrar: (email: string, senha: string) => Promise<{ error: string | null }>;
  cadastrar: (params: {
    nome: string;
    apelido: string;
    email: string;
    senha: string;
    tipoConta: TipoContaCadastro;
  }) => Promise<{ error: string | null }>;
  sair: () => Promise<void>;
  setCarregando: (val: boolean) => void;
};

async function carregarRestricao(usuarioId: string, set: any) {
  const { data } = await supabase
    .from("restricao")
    .select("tipo, motivo, data_fim")
    .eq("usuario_id", usuarioId)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  set({ restricaoAtiva: data ?? null });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  usuario: null,
  carregando: true,
  setCarregando: (val: boolean) => set({ carregando: val }),
  restricaoAtiva: null,

  inicializar: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { data: perfil } = await supabase
        .from("usuario")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      set({ usuario: perfil ?? null });
      if (get().carregando) set({ carregando: false });
    } else {
      set({ usuario: null });
      if (get().carregando) set({ carregando: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: perfil } = await supabase
          .from("usuario")
          .select("*")
          .eq("id", session.user.id)
          .single();
        set({ usuario: perfil ?? null });
      } else {
        set({ usuario: null });
      }
    });
  },

  entrar: async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      return { error: error?.message ?? "Erro ao entrar" };
    }

    // IMPORTANTE: busca e seta `usuario` AQUI, na hora — não dá pra
    // confiar só no listener onAuthStateChange pra isso, porque ele
    // é assíncrono e podia chegar DEPOIS da tela já ter navegado
    // pras Tabs. Nesse intervalo, o _layout.tsx via `usuario` ainda
    // null, achava que ninguém estava logado, e chutava a pessoa de
    // volta pro login — mesmo com o login tendo funcionado (esse
    // era o motivo do Admin/Moderador "não carregar": a conta
    // logava, mas era jogada de volta antes da tela aparecer).
    const { data: perfil } = await supabase.from("usuario").select("*").eq("id", data.user.id).single();
    set({ usuario: perfil ?? null });

    if (!perfil) {
      return { error: "Login feito, mas não encontramos seu cadastro na tabela usuario." };
    }
    return { error: null };
  },

  cadastrar: async ({ nome, apelido, email, senha, tipoConta }) => {
    // 1) Cria a conta no Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error || !data.user) {
      return { error: error?.message ?? "Erro ao criar conta" };
    }

    // Se a confirmação de email estiver ativada no projeto Supabase,
    // o signUp não retorna uma sessão ativa. Sem sessão, o RLS bloqueia
    // os inserts abaixo (auth.uid() vem nulo) e o cadastro não pode
    // continuar até o usuário confirmar o email.
    if (!data.session) {
      return {
        error:
          "Conta criada! Confirme seu email antes de entrar (verifique sua caixa de entrada).",
      };
    }

    // 2) Cria a linha em "usuario" com o tipo de conta escolhido na tela
    const { error: usuarioError } = await supabase.from("usuario").insert({
      id: data.user.id,
      nome,
      email,
      tipo_conta: tipoConta,
    });
    if (usuarioError) return { error: usuarioError.message };

    // 3) Cria o perfil específico do tipo de conta.
    // moderador/administrador não são criados por auto-cadastro — essas
    // contas são promovidas depois por um administrador, então não
    // entram nesse fluxo público.
    if (tipoConta === "musico") {
      const { error: perfilError } = await supabase.from("perfil_musico").insert({
        usuario_id: data.user.id,
        apelido,
      });
      if (perfilError) return { error: perfilError.message };
    } else {
      const { error: perfilError } = await supabase.from("perfil_organizador").insert({
        usuario_id: data.user.id,
      });
      if (perfilError) return { error: perfilError.message };
    }

    // 4) Desloga o usuário imediatamente para forçar o login manual
    // conforme o requisito: "Ao cadastrar tem que levar para o login".
    await supabase.auth.signOut();
    set({ usuario: null });

    return { error: null };
  },

  sair: async () => {
    await supabase.auth.signOut();
    set({ usuario: null });
  },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ usuario: state.usuario }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setCarregando(false);
      },
    }
  )
);


export function ehBanido(usuario: Usuario | null) {
  return usuario?.status === "banido";
}

export function ehContaComum(u: Usuario | null) {
  return u?.tipo_conta === "musico" || u?.tipo_conta === "organizador";
}

export function ehModerador(u: Usuario | null) {
  return u?.tipo_conta === "moderador" || u?.tipo_conta === "adm";
}

export function ehAdministrador(u: Usuario | null) {
  return u?.tipo_conta === "adm";
}

export function bloqueioAtivo(
  usuario: Usuario | null,
  restricao: { tipo: string; data_fim: string | null } | null
): boolean {
  if (usuario?.status !== "bloqueado") return false;
  if (!restricao || restricao.tipo !== "bloqueio") return true;
  if (!restricao.data_fim) return true;
  return new Date(restricao.data_fim) > new Date();
}
