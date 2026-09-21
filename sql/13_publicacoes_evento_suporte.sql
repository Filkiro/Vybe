-- publicacao ganha um vínculo opcional com evento: o organizador cria
-- uma publicação e liga a um evento dele (o evento continua existindo
-- como registro próprio; a publicação é só a "divulgação" dele no feed).
alter table public.publicacao
  add column if not exists evento_id uuid references public.evento(id) on delete set null;

-- índice pra listar rápido as publicações de um evento / evitar full scan
create index if not exists publicacao_evento_id_idx on public.publicacao(evento_id);

-- reaplica a policy de insert de publicacao garantindo que, quando
-- evento_id vier preenchido, o evento também pertença a quem está
-- publicando (senão alguém poderia divulgar evento de outro organizador).
drop policy if exists "publicacao_insert_dono" on public.publicacao;
create policy "publicacao_insert_dono"
on public.publicacao
for insert
to authenticated
with check (
  usuario_id = auth.uid()
  and (
    evento_id is null
    or exists (select 1 from public.evento e where e.id = evento_id and e.organizador_id = auth.uid())
  )
);

drop policy if exists "publicacao_update_dono" on public.publicacao;
create policy "publicacao_update_dono"
on public.publicacao
for update
using (usuario_id = auth.uid())
with check (
  usuario_id = auth.uid()
  and (
    evento_id is null
    or exists (select 1 from public.evento e where e.id = evento_id and e.organizador_id = auth.uid())
  )
);

NOTIFY pgrst, 'reload schema';
