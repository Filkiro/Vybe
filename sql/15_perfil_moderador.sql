-- =================================================================
-- 15_perfil_moderador.sql
-- Permite que usuários com perfil de Moderador (e ADM) tenham foto de perfil.
-- A coluna é foto_url e o bucket de storage é o mesmo do músico: foto_perfil.
-- =================================================================

-- 1. Cria a tabela perfil_moderador caso deseje uma tabela dedicada
create table if not exists public.perfil_moderador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuario(id) on delete cascade,
  foto_url text,
  banner_url text,
  criado_em timestamptz default now()
);

-- 2. Habilita Row Level Security (RLS)
alter table public.perfil_moderador enable row level security;

-- 3. Leitura pública (para exibir avatar e foto de moderadores nas telas do app)
drop policy if exists "perfil_moderador_select_publico" on public.perfil_moderador;
create policy "perfil_moderador_select_publico"
on public.perfil_moderador
for select
using (true);

-- 4. Inserção pelo próprio moderador autenticado
drop policy if exists "perfil_moderador_insert_proprio" on public.perfil_moderador;
create policy "perfil_moderador_insert_proprio"
on public.perfil_moderador
for insert
to authenticated
with check (usuario_id = auth.uid());

-- 5. Atualização pelo próprio moderador autenticado
drop policy if exists "perfil_moderador_update_proprio" on public.perfil_moderador;
create policy "perfil_moderador_update_proprio"
on public.perfil_moderador
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- 6. Concede privilégios aos roles do Supabase
grant select, insert, update on public.perfil_moderador to authenticated;
grant select on public.perfil_moderador to anon;

-- Observação: O bucket utilizado é o "foto_perfil", cujas policies de
-- upload e leitura já foram configuradas em 11_rls_completo.sql.
