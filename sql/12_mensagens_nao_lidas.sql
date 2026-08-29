-- Adiciona o controle de "mensagem lida" — usado pelo balãozinho de
-- não lidas na aba Conversas. Sem essa coluna não tem como saber
-- quais mensagens a pessoa já viu.
--
-- Rode isso no SQL Editor do seu projeto Supabase.

alter table public.mensagem
  add column if not exists lida boolean not null default false;

-- Acelera a contagem de não lidas (feita toda vez que o balãozinho
-- atualiza): filtra por lida = false, então um índice parcial ajuda
-- bastante conforme o histórico de mensagens cresce.
create index if not exists mensagem_nao_lidas_idx
  on public.mensagem (conversa_id)
  where lida = false;

-- =================================================================
-- mensagem — permitir marcar como lida
-- =================================================================
-- Sem essa policy, o UPDATE de "lida" cai no mesmo silêncio que
-- vimos com exclusão de música/álbum: RLS bloqueia sem erro nenhum,
-- só que 0 linhas são afetadas.
--
-- Quem pode marcar uma mensagem como lida: só quem RECEBEU ela —
-- participante da conversa que NÃO é o remetente (não faz sentido a
-- pessoa "ler a própria mensagem", e isso evita que o remetente
-- mexa no status da própria mensagem).
drop policy if exists "mensagem_update_marcar_lida" on public.mensagem;
create policy "mensagem_update_marcar_lida"
on public.mensagem
for update
to authenticated
using (
  remetente_id <> auth.uid()
  and exists (
    select 1 from public.conversa c
    where c.id = conversa_id
      and (auth.uid() = c.usuario_id1 or auth.uid() = c.usuario_id2)
  )
)
with check (
  remetente_id <> auth.uid()
  and exists (
    select 1 from public.conversa c
    where c.id = conversa_id
      and (auth.uid() = c.usuario_id1 or auth.uid() = c.usuario_id2)
  )
);
