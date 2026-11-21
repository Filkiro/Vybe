-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  tipo_conta USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ativo'::status_usuario,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_pkey PRIMARY KEY (id)
);
CREATE TABLE public.perfil_musico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE,
  apelido character varying,
  foto_url character varying,
  contato_externo character varying,
  descricao character varying,
  genero_musical character varying,
  localizacao character varying,
  disponivel boolean NOT NULL DEFAULT true,
  banner_url text,
  CONSTRAINT perfil_musico_pkey PRIMARY KEY (id),
  CONSTRAINT perfil_musico_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.perfil_organizador (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE,
  localizacao character varying,
  descricao character varying,
  contato character varying,
  nicho_trabalho character varying,
  banner_url text,
  foto_url text,
  CONSTRAINT perfil_organizador_pkey PRIMARY KEY (id),
  CONSTRAINT perfil_organizador_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.musica (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  nome character varying NOT NULL,
  descricao character varying,
  arquivo_url character varying,
  capa_url character varying,
  genero character varying,
  data_lancamento date,
  status USER-DEFINED NOT NULL DEFAULT 'ativo'::status_conteudo,
  CONSTRAINT musica_pkey PRIMARY KEY (id),
  CONSTRAINT musica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.album (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  nome character varying NOT NULL,
  capa_url character varying,
  status USER-DEFINED NOT NULL DEFAULT 'ativo'::status_conteudo,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT album_pkey PRIMARY KEY (id),
  CONSTRAINT album_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.album_musica (
  album_id uuid NOT NULL,
  musica_id uuid NOT NULL,
  CONSTRAINT album_musica_pkey PRIMARY KEY (album_id, musica_id),
  CONSTRAINT album_musica_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.album(id),
  CONSTRAINT album_musica_musica_id_fkey FOREIGN KEY (musica_id) REFERENCES public.musica(id)
);
CREATE TABLE public.publicacao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  foto_url character varying,
  descricao character varying,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  evento_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'ativo'::status_conteudo,
  musica_id uuid,
  album_id uuid,
  CONSTRAINT publicacao_pkey PRIMARY KEY (id),
  CONSTRAINT publicacao_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.evento(id),
  CONSTRAINT publicacao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id),
  CONSTRAINT publicacao_musica_id_fkey FOREIGN KEY (musica_id) REFERENCES public.musica(id),
  CONSTRAINT publicacao_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.album(id)
);
CREATE TABLE public.curtida (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  publicacao_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  CONSTRAINT curtida_pkey PRIMARY KEY (id),
  CONSTRAINT curtida_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES public.publicacao(id),
  CONSTRAINT curtida_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.conversa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id1 uuid NOT NULL,
  usuario_id2 uuid NOT NULL,
  CONSTRAINT conversa_pkey PRIMARY KEY (id),
  CONSTRAINT conversa_usuario_id1_fkey FOREIGN KEY (usuario_id1) REFERENCES public.usuario(id),
  CONSTRAINT conversa_usuario_id2_fkey FOREIGN KEY (usuario_id2) REFERENCES public.usuario(id)
);
CREATE TABLE public.mensagem (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL,
  remetente_id uuid NOT NULL,
  conteudo text NOT NULL CHECK (length(conteudo) <= 4000),
  data_hora timestamp without time zone NOT NULL DEFAULT now(),
  lida boolean NOT NULL DEFAULT false,
  evento_convite_id uuid,
  CONSTRAINT mensagem_pkey PRIMARY KEY (id),
  CONSTRAINT mensagem_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.conversa(id),
  CONSTRAINT mensagem_remetente_id_fkey FOREIGN KEY (remetente_id) REFERENCES public.usuario(id),
  CONSTRAINT mensagem_evento_convite_id_fkey FOREIGN KEY (evento_convite_id) REFERENCES public.evento_convite(id)
);
CREATE TABLE public.evento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizador_id uuid NOT NULL,
  nome character varying NOT NULL,
  data date NOT NULL,
  horario time without time zone,
  localizacao character varying,
  genero_musical character varying,
  capacidade integer,
  status USER-DEFINED NOT NULL DEFAULT 'aberto'::status_evento,
  capa_url character varying,
  descricao text,
  CONSTRAINT evento_pkey PRIMARY KEY (id),
  CONSTRAINT evento_organizador_id_fkey FOREIGN KEY (organizador_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.denuncia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  denunciante_id uuid NOT NULL,
  tipo_alvo USER-DEFINED NOT NULL,
  alvo_id uuid NOT NULL,
  motivo character varying NOT NULL,
  descricao character varying,
  status USER-DEFINED NOT NULL DEFAULT 'pendente'::status_denuncia,
  data timestamp without time zone NOT NULL DEFAULT now(),
  moderador_id uuid,
  CONSTRAINT denuncia_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_denunciante_id_fkey FOREIGN KEY (denunciante_id) REFERENCES public.usuario(id),
  CONSTRAINT denuncia_moderador_id_fkey FOREIGN KEY (moderador_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.restricao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  moderador_id uuid NOT NULL,
  tipo USER-DEFINED NOT NULL,
  motivo character varying,
  data_inicio timestamp without time zone NOT NULL DEFAULT now(),
  data_fim timestamp without time zone,
  CONSTRAINT restricao_pkey PRIMARY KEY (id),
  CONSTRAINT restricao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id),
  CONSTRAINT restricao_moderador_id_fkey FOREIGN KEY (moderador_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.suporte (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  moderador_id uuid,
  assunto character varying NOT NULL,
  descricao character varying,
  status USER-DEFINED NOT NULL DEFAULT 'aberto'::status_suporte,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT suporte_pkey PRIMARY KEY (id),
  CONSTRAINT suporte_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id),
  CONSTRAINT suporte_moderador_id_fkey FOREIGN KEY (moderador_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.curtida_musica (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  musica_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT curtida_musica_pkey PRIMARY KEY (id),
  CONSTRAINT curtida_musica_musica_id_fkey FOREIGN KEY (musica_id) REFERENCES public.musica(id),
  CONSTRAINT curtida_musica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.evento_convite (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL,
  musico_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pendente'::status_convite,
  criado_em timestamp without time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT evento_convite_pkey PRIMARY KEY (id),
  CONSTRAINT evento_convite_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.evento(id),
  CONSTRAINT evento_convite_musico_id_fkey FOREIGN KEY (musico_id) REFERENCES public.usuario(id)
);
CREATE TABLE public.curtida_publicacao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  publicacao_id uuid NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT curtida_publicacao_pkey PRIMARY KEY (id),
  CONSTRAINT curtida_publicacao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT curtida_publicacao_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES public.publicacao(id)
);