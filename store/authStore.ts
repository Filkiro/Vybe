import { create } from "zustand";
import { supabase, Usuario } from "../lib/supabase";

type TipoContaCadastro = "musico" | "organizador";

type AuthState = {
  usuario: Usuario | null;
  carregando: boolean;
  inicializar: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<{ error: string | null }>;
  cadastrar: (params: {
    nome: string;
    apelido: string;
    email: string;
    senha: string;
    tipoConta: TipoContaCadastro;
  }) => Promise<{ error: string | null }>;
  sair: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  carregando: true,

  inicializar: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { data: perfil } = await supabase
        .from("usuario")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      set({ usuario: perfil ?? null, carregando: false });
    } else {
      set({ usuario: null, carregando: false });
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

    // 4) IMPORTANTE: seta o usuário no store agora mesmo, aqui.
    // Não dá pra confiar só no listener onAuthStateChange pra isso:
    // o evento SIGNED_IN do signUp() dispara ANTES da linha "usuario"
    // acima existir, então o listener buscava um perfil que ainda não
    // tinha sido criado, recebia null e sobrescrevia o store com
    // usuario: null. Resultado: o _layout.tsx via usuario null fora da
    // aba (auth) e chutava o usuário de volta pra tela de login, mesmo
    // com o cadastro tendo funcionado — por isso não ia pra home.
    set({
      usuario: {
        id: data.user.id,
        nome,
        email,
        tipo_conta: tipoConta,
        status: "ativo",
        criado_em: new Date().toISOString(),
      },
    });

    return { error: null };
  },

  sair: async () => {
    await supabase.auth.signOut();
    set({ usuario: null });
  },
}));

// ---------------------------------------------------------------
// Checagens de tipo de conta centralizadas — usar estas funções em
// vez de comparar `tipo_conta === "algumTexto"` espalhado pelas
// telas. Evita o tipo de bug que já tivemos ('adm' vs
// 'administrador' divergindo em lugares diferentes): agora só
// existe UM lugar onde esses textos aparecem escritos na mão.
// ---------------------------------------------------------------
export function ehAdministrador(usuario: Usuario | null): boolean {
  return usuario?.tipo_conta === "adm";
}

export function ehModerador(usuario: Usuario | null): boolean {
  return usuario?.tipo_conta === "moderador" || ehAdministrador(usuario);
}

export function ehContaComum(usuario: Usuario | null): boolean {
  return usuario?.tipo_conta === "musico" || usuario?.tipo_conta === "organizador";
}
