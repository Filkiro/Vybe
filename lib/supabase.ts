import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// IMPORTANTE: nunca comitar a service_role key aqui — essa é a
// "anon key" pública, protegida pelas Policies de RLS que já
// criamos no banco (veja /sql/*.sql). A service_role key só vive
// nas Edge Functions (/supabase/functions), nunca no app.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Adaptador de storage "seguro" para SSR: no Expo Router web, o bundle
// de servidor roda em Node (sem `window`) antes de chegar no navegador.
// Em native (iOS/Android) usamos o AsyncStorage normalmente; em web só
// tocamos em localStorage se `window` realmente existir.
const SSRSafeStorage = {
  getItem: (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return Promise.resolve(null);
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return Promise.resolve();
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return Promise.resolve();
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SSRSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tipo do usuário, espelhando a tabela "usuario" do banco
export type TipoConta = "musico" | "organizador" | "moderador" | "adm";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo_conta: TipoConta;
  status: "ativo" | "bloqueado" | "banido";
  criado_em: string;
};

// Espelham perfil_musico e perfil_organizador — só existem quando
// usuario.tipo_conta é "musico" ou "organizador" respectivamente.
// moderador/administrador não têm tabela de perfil própria ainda.
export type PerfilMusico = {
  id: string;
  usuario_id: string;
  apelido: string | null;
  foto_url: string | null;
  contato_externo: string | null;
  descricao: string | null;
  genero_musical: string | null;
  localizacao: string | null;
  disponivel: boolean;
};

export type PerfilOrganizador = {
  id: string;
  usuario_id: string;
  localizacao: string | null;
  descricao: string | null;
  contato: string | null;
  nicho_trabalho: string | null;
};

// Espelha a tabela "denuncia" — usada nas telas de Moderação e no
// botão "Denunciar" do perfil de outras pessoas.
export type Denuncia = {
  id: string;
  denunciante_id: string;
  tipo_alvo: "usuario" | "post" | "musica" | "album";
  alvo_id: string;
  motivo: string;
  descricao: string | null;
  status: "pendente" | "analisada" | "resolvida";
  data: string;
  moderador_id: string | null;
};

// Espelha "conversa" e "mensagem" — usadas na tela de Conversas/Chat.
export type Conversa = {
  id: string;
  usuario_id1: string;
  usuario_id2: string;
};

export type Mensagem = {
  id: string;
  conversa_id: string;
  remetente_id: string;
  conteudo: string;
  data_hora: string;
  lida: boolean;
};
