-- =================================================================
-- RLS completo do Vybe — cobre TODAS as tabelas do schema, incluindo
-- as que ainda não têm nenhuma policy hoje.
-- Rode isso inteiro no SQL Editor do Supabase. É seguro rodar mais
-- de uma vez (todo DROP POLICY vem com IF EXISTS, e as funções usam
-- CREATE OR REPLACE) — se precisar ajustar algo depois, é só editar
-- e rodar de novo.
--
-- Antes de rodar, dá uma olhada em Authentication → Policies no
-- painel do Supabase: se alguma tabela já tiver uma policy com outro
-- nome que não os usados aqui, ela não é apagada automaticamente
-- (só apagamos pelo nome exato) — pode ficar duplicada com uma
-- liberação mais aberta do que deveria. Vale limpar manualmente.
-- =================================================================

-- -----------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER): permitem checar o
-- tipo_conta do usuário logado dentro de policies de OUTRAS tabelas
-- sem cair em recursão de RLS contra a própria tabela "usuario".
-- -----------------------------------------------------------------
create or replace function public.tipo_conta_atual()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select tipo_conta::text from public.usuario where id = auth.uid();
$$;

create or replace function public.eh_moderador_ou_adm()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.tipo_conta_atual() in ('moderador', 'adm'), false);
$$;

-- =================================================================
-- usuario
-- =================================================================
alter table public.usuario enable row level security;

-- Perfis são públicos (Home, Explorar e perfil de terceiros não
-- exigem login pra ver quem é quem).
drop policy if exists "usuario_select_publico" on public.usuario;
create policy "usuario_select_publico"
on public.usuario
for select
using (true);

-- Auto-cadastro: só cria a própria linha, e só como musico/organizador
-- — moderador/adm são promovidos à parte (Edge Function
-- create-moderator, que usa a service_role e ignora RLS).
drop policy if exists "usuario_insert_proprio_cadastro" on public.usuario;
create policy "usuario_insert_proprio_cadastro"
on public.usuario
for insert
to authenticated
with check (id = auth.uid() and tipo_conta in ('musico', 'organizador'));

-- Dono pode atualizar a própria linha; moderador/adm podem atualizar
-- qualquer uma (é assim que o banimento em Moderação funciona).
-- O gatilho abaixo impede que o próprio dono se auto-promova ou se
-- desbloqueie mudando tipo_conta/status por fora da tela de Moderação.
drop policy if exists "usuario_update_dono_ou_moderador" on public.usuario;
create policy "usuario_update_dono_ou_moderador"
on public.usuario
for update
using (auth.uid() = id or public.eh_moderador_ou_adm())
with check (auth.uid() = id or public.eh_moderador_ou_adm());

create or replace function public.usuario_bloquear_auto_privilegio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_moderador_ou_adm()
     and (new.tipo_conta is distinct from old.tipo_conta or new.status is distinct from old.status) then
    raise exception 'Você não tem permissão para alterar tipo_conta ou status.';
  end if;
  return new;
end;
$$;

drop trigger if exists usuario_impedir_auto_privilegio on public.usuario;
create trigger usuario_impedir_auto_privilegio
before update on public.usuario
for each row
execute function public.usuario_bloquear_auto_privilegio();

-- =================================================================
-- perfil_musico
-- =================================================================
alter table public.perfil_musico enable row level security;

drop policy if exists "perfil_musico_select_publico" on public.perfil_musico;
create policy "perfil_musico_select_publico"
on public.perfil_musico
for select
using (true);

drop policy if exists "perfil_musico_insert_proprio" on public.perfil_musico;
create policy "perfil_musico_insert_proprio"
on public.perfil_musico
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "perfil_musico_update_proprio" on public.perfil_musico;
create policy "perfil_musico_update_proprio"
on public.perfil_musico
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- =================================================================
-- perfil_organizador
-- =================================================================
alter table public.perfil_organizador enable row level security;

drop policy if exists "perfil_organizador_select_publico" on public.perfil_organizador;
create policy "perfil_organizador_select_publico"
on public.perfil_organizador
for select
using (true);

drop policy if exists "perfil_organizador_insert_proprio" on public.perfil_organizador;
create policy "perfil_organizador_insert_proprio"
on public.perfil_organizador
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "perfil_organizador_update_proprio" on public.perfil_organizador;
create policy "perfil_organizador_update_proprio"
on public.perfil_organizador
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- =================================================================
-- musica
-- =================================================================
alter table public.musica enable row level security;

-- Público vê só as ativas; o dono vê as próprias em qualquer status.
drop policy if exists "musica_select_ativa_ou_dono" on public.musica;
create policy "musica_select_ativa_ou_dono"
on public.musica
for select
using (status = 'ativo' or usuario_id = auth.uid());

drop policy if exists "musica_insert_dono" on public.musica;
create policy "musica_insert_dono"
on public.musica
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "musica_update_dono_ou_moderador" on public.musica;
create policy "musica_update_dono_ou_moderador"
on public.musica
for update
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm())
with check (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "musica_delete_dono_ou_moderador" on public.musica;
create policy "musica_delete_dono_ou_moderador"
on public.musica
for delete
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

-- =================================================================
-- album
-- =================================================================
alter table public.album enable row level security;

drop policy if exists "album_select_ativo_ou_dono" on public.album;
create policy "album_select_ativo_ou_dono"
on public.album
for select
using (status = 'ativo' or usuario_id = auth.uid());

drop policy if exists "album_insert_dono" on public.album;
create policy "album_insert_dono"
on public.album
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "album_update_dono_ou_moderador" on public.album;
create policy "album_update_dono_ou_moderador"
on public.album
for update
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm())
with check (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "album_delete_dono_ou_moderador" on public.album;
create policy "album_delete_dono_ou_moderador"
on public.album
for delete
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

-- =================================================================
-- album_musica (tabela de junção)
-- =================================================================
alter table public.album_musica enable row level security;

-- Público precisa ler pra tela do álbum (app/album/[id].tsx) funcionar
-- sem login.
drop policy if exists "album_musica_select_publico" on public.album_musica;
create policy "album_musica_select_publico"
on public.album_musica
for select
using (true);

-- Só o dono do álbum pode adicionar faixas a ele.
drop policy if exists "album_musica_insert_dono_album" on public.album_musica;
create policy "album_musica_insert_dono_album"
on public.album_musica
for insert
to authenticated
with check (
  exists (select 1 from public.album a where a.id = album_id and a.usuario_id = auth.uid())
);

-- O dono do álbum OU o dono da música pode remover o vínculo (cobre
-- excluir a música inteira e também um futuro "remover do álbum").
drop policy if exists "album_musica_delete_dono" on public.album_musica;
create policy "album_musica_delete_dono"
on public.album_musica
for delete
using (
  exists (select 1 from public.album a where a.id = album_id and a.usuario_id = auth.uid())
  or exists (select 1 from public.musica m where m.id = musica_id and m.usuario_id = auth.uid())
);

-- =================================================================
-- publicacao (ainda não usada na UI, mas protegida do mesmo jeito)
-- =================================================================
alter table public.publicacao enable row level security;

drop policy if exists "publicacao_select_publico" on public.publicacao;
create policy "publicacao_select_publico"
on public.publicacao
for select
using (true);

drop policy if exists "publicacao_insert_dono" on public.publicacao;
create policy "publicacao_insert_dono"
on public.publicacao
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "publicacao_update_dono" on public.publicacao;
create policy "publicacao_update_dono"
on public.publicacao
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists "publicacao_delete_dono_ou_moderador" on public.publicacao;
create policy "publicacao_delete_dono_ou_moderador"
on public.publicacao
for delete
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

-- =================================================================
-- curtida (ainda não usada na UI)
-- =================================================================
alter table public.curtida enable row level security;

drop policy if exists "curtida_select_publico" on public.curtida;
create policy "curtida_select_publico"
on public.curtida
for select
using (true);

drop policy if exists "curtida_insert_proprio" on public.curtida;
create policy "curtida_insert_proprio"
on public.curtida
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "curtida_delete_proprio" on public.curtida;
create policy "curtida_delete_proprio"
on public.curtida
for delete
using (usuario_id = auth.uid());

-- =================================================================
-- conversa
-- =================================================================
alter table public.conversa enable row level security;

drop policy if exists "conversa_select_participante" on public.conversa;
create policy "conversa_select_participante"
on public.conversa
for select
using (auth.uid() = usuario_id1 or auth.uid() = usuario_id2);

drop policy if exists "conversa_insert_participante" on public.conversa;
create policy "conversa_insert_participante"
on public.conversa
for insert
to authenticated
with check (auth.uid() = usuario_id1 or auth.uid() = usuario_id2);

-- =================================================================
-- mensagem
-- =================================================================
alter table public.mensagem enable row level security;

drop policy if exists "mensagem_select_participante" on public.mensagem;
create policy "mensagem_select_participante"
on public.mensagem
for select
using (
  exists (
    select 1 from public.conversa c
    where c.id = conversa_id
      and (auth.uid() = c.usuario_id1 or auth.uid() = c.usuario_id2)
  )
);

drop policy if exists "mensagem_insert_participante" on public.mensagem;
create policy "mensagem_insert_participante"
on public.mensagem
for insert
to authenticated
with check (
  remetente_id = auth.uid()
  and exists (
    select 1 from public.conversa c
    where c.id = conversa_id
      and (auth.uid() = c.usuario_id1 or auth.uid() = c.usuario_id2)
  )
);

-- =================================================================
-- evento
-- =================================================================
alter table public.evento enable row level security;

drop policy if exists "evento_select_publico" on public.evento;
create policy "evento_select_publico"
on public.evento
for select
using (true);

drop policy if exists "evento_insert_organizador_dono" on public.evento;
create policy "evento_insert_organizador_dono"
on public.evento
for insert
to authenticated
with check (organizador_id = auth.uid());

drop policy if exists "evento_update_dono_ou_moderador" on public.evento;
create policy "evento_update_dono_ou_moderador"
on public.evento
for update
using (organizador_id = auth.uid() or public.eh_moderador_ou_adm())
with check (organizador_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "evento_delete_dono_ou_moderador" on public.evento;
create policy "evento_delete_dono_ou_moderador"
on public.evento
for delete
using (organizador_id = auth.uid() or public.eh_moderador_ou_adm());

-- =================================================================
-- avaliacao (ainda não usada na UI)
-- =================================================================
alter table public.avaliacao enable row level security;

drop policy if exists "avaliacao_select_publico" on public.avaliacao;
create policy "avaliacao_select_publico"
on public.avaliacao
for select
using (true);

drop policy if exists "avaliacao_insert_contratante" on public.avaliacao;
create policy "avaliacao_insert_contratante"
on public.avaliacao
for insert
to authenticated
with check (contratante_id = auth.uid() and contratante_id <> musico_id);

drop policy if exists "avaliacao_update_dono" on public.avaliacao;
create policy "avaliacao_update_dono"
on public.avaliacao
for update
using (contratante_id = auth.uid())
with check (contratante_id = auth.uid());

drop policy if exists "avaliacao_delete_dono_ou_moderador" on public.avaliacao;
create policy "avaliacao_delete_dono_ou_moderador"
on public.avaliacao
for delete
using (contratante_id = auth.uid() or public.eh_moderador_ou_adm());

-- =================================================================
-- denuncia
-- =================================================================
alter table public.denuncia enable row level security;

-- Quem denunciou vê as próprias denúncias; moderador/adm veem todas
-- (Central de Moderação).
drop policy if exists "denuncia_select_proprio_ou_moderador" on public.denuncia;
create policy "denuncia_select_proprio_ou_moderador"
on public.denuncia
for select
using (denunciante_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "denuncia_insert_proprio" on public.denuncia;
create policy "denuncia_insert_proprio"
on public.denuncia
for insert
to authenticated
with check (denunciante_id = auth.uid());

-- Só moderador/adm resolvem denúncias (marcar resolvida, banir etc.).
drop policy if exists "denuncia_update_moderador" on public.denuncia;
create policy "denuncia_update_moderador"
on public.denuncia
for update
using (public.eh_moderador_ou_adm())
with check (public.eh_moderador_ou_adm());

-- =================================================================
-- restricao
-- =================================================================
alter table public.restricao enable row level security;

-- O próprio usuário restringido pode ver o motivo; moderador/adm veem
-- tudo.
drop policy if exists "restricao_select_proprio_ou_moderador" on public.restricao;
create policy "restricao_select_proprio_ou_moderador"
on public.restricao
for select
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "restricao_insert_moderador" on public.restricao;
create policy "restricao_insert_moderador"
on public.restricao
for insert
to authenticated
with check (public.eh_moderador_ou_adm() and moderador_id = auth.uid());

drop policy if exists "restricao_update_moderador" on public.restricao;
create policy "restricao_update_moderador"
on public.restricao
for update
using (public.eh_moderador_ou_adm())
with check (public.eh_moderador_ou_adm());

-- =================================================================
-- suporte (ainda não usada na UI)
-- =================================================================
alter table public.suporte enable row level security;

drop policy if exists "suporte_select_proprio_ou_moderador" on public.suporte;
create policy "suporte_select_proprio_ou_moderador"
on public.suporte
for select
using (usuario_id = auth.uid() or public.eh_moderador_ou_adm());

drop policy if exists "suporte_insert_proprio" on public.suporte;
create policy "suporte_insert_proprio"
on public.suporte
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "suporte_update_moderador" on public.suporte;
create policy "suporte_update_moderador"
on public.suporte
for update
using (public.eh_moderador_ou_adm())
with check (public.eh_moderador_ou_adm());

-- =================================================================
-- Storage: capa_musica, musica_audio, capa_album, foto_perfil
-- Cada objeto enviado por um usuário autenticado já sai com a
-- coluna "owner" preenchida com o auth.uid() de quem fez o upload —
-- não precisa de pasta por usuário pra isso funcionar.
-- =================================================================
drop policy if exists "storage_select_publico" on storage.objects;
create policy "storage_select_publico"
on storage.objects
for select
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil'));

drop policy if exists "storage_insert_autenticado" on storage.objects;
create policy "storage_insert_autenticado"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil'));

drop policy if exists "storage_update_dono" on storage.objects;
create policy "storage_update_dono"
on storage.objects
for update
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil') and owner = auth.uid());

drop policy if exists "storage_delete_dono" on storage.objects;
create policy "storage_delete_dono"
on storage.objects
for delete
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil') and owner = auth.uid());
