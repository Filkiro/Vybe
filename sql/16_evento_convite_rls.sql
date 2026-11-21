-- =================================================================
-- 16_evento_convite_rls.sql
-- Políticas de RLS para a tabela "evento_convite"
-- Permite que organizadores criem convites, músicos os visualizem
-- e respondam (aceito/recusado), e ambos visualizem o histórico.
-- =================================================================

alter table public.evento_convite enable row level security;

-- 1. SELECT: Músico convidado ou organizador do evento (ou moderação)
drop policy if exists "evento_convite_select_participantes" on public.evento_convite;
create policy "evento_convite_select_participantes"
on public.evento_convite
for select
using (
  auth.uid() = musico_id
  or exists (
    select 1 from public.evento e
    where e.id = evento_id and e.organizador_id = auth.uid()
  )
  or public.eh_moderador_ou_adm()
);

-- 2. INSERT: Apenas o organizador dono do evento
drop policy if exists "evento_convite_insert_organizador" on public.evento_convite;
create policy "evento_convite_insert_organizador"
on public.evento_convite
for insert
to authenticated
with check (
  exists (
    select 1 from public.evento e
    where e.id = evento_id and e.organizador_id = auth.uid()
  )
);

-- 3. UPDATE: Músico convidado (para responder) ou organizador (para cancelar)
drop policy if exists "evento_convite_update_participantes" on public.evento_convite;
create policy "evento_convite_update_participantes"
on public.evento_convite
for update
using (
  auth.uid() = musico_id
  or exists (
    select 1 from public.evento e
    where e.id = evento_id and e.organizador_id = auth.uid()
  )
  or public.eh_moderador_ou_adm()
)
with check (
  auth.uid() = musico_id
  or exists (
    select 1 from public.evento e
    where e.id = evento_id and e.organizador_id = auth.uid()
  )
  or public.eh_moderador_ou_adm()
);

-- 4. DELETE: Organizador dono do evento
drop policy if exists "evento_convite_delete_organizador" on public.evento_convite;
create policy "evento_convite_delete_organizador"
on public.evento_convite
for delete
using (
  exists (
    select 1 from public.evento e
    where e.id = evento_id and e.organizador_id = auth.uid()
  )
  or public.eh_moderador_ou_adm()
);
