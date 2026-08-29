-- Policies de RLS pra permitir que o dono edite e apague suas
-- próprias músicas e álbuns (e os arquivos correspondentes no
-- Storage). Sem isso, o Supabase bloqueia UPDATE/DELETE em
-- silêncio: a operação "funciona" (sem erro), mas 0 linhas são
-- afetadas — é o comportamento padrão de RLS pra DELETE/UPDATE,
-- bem diferente de um erro de permissão comum.
--
-- Rode isso no SQL Editor do seu projeto Supabase. Se alguma
-- policy abaixo já existir com esse nome, apague a antiga primeiro
-- (DROP POLICY IF EXISTS ...) antes de rodar o CREATE de novo.

-- ---------------------------------------------------------------
-- Tabela musica
-- ---------------------------------------------------------------
alter table public.musica enable row level security;

drop policy if exists "musica_update_dono" on public.musica;
create policy "musica_update_dono"
on public.musica
for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "musica_delete_dono" on public.musica;
create policy "musica_delete_dono"
on public.musica
for delete
using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------
-- Tabela album
-- ---------------------------------------------------------------
alter table public.album enable row level security;

drop policy if exists "album_update_dono" on public.album;
create policy "album_update_dono"
on public.album
for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "album_delete_dono" on public.album;
create policy "album_delete_dono"
on public.album
for delete
using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------
-- Tabela album_musica (junção) — o dono do álbum precisa poder
-- inserir/apagar vínculos; também libera pro dono da música (ela
-- pode ser removida de um álbum que não é dela, mas isso já é
-- barrado na tela). Ajuste se preferir travar só pelo dono do álbum.
-- ---------------------------------------------------------------
alter table public.album_musica enable row level security;

drop policy if exists "album_musica_delete_dono" on public.album_musica;
create policy "album_musica_delete_dono"
on public.album_musica
for delete
using (
  exists (select 1 from public.album a where a.id = album_id and a.usuario_id = auth.uid())
  or exists (select 1 from public.musica m where m.id = musica_id and m.usuario_id = auth.uid())
);

drop policy if exists "album_musica_insert_dono" on public.album_musica;
create policy "album_musica_insert_dono"
on public.album_musica
for insert
with check (
  exists (select 1 from public.album a where a.id = album_id and a.usuario_id = auth.uid())
);

-- ---------------------------------------------------------------
-- Storage: capa_musica, musica_audio, capa_album
-- Cada objeto enviado por um usuário autenticado já sai com a
-- coluna "owner" preenchida com o auth.uid() de quem fez o upload
-- — não precisa de nenhuma pasta por usuário pra isso funcionar.
-- ---------------------------------------------------------------
drop policy if exists "storage_delete_dono_capa_musica" on storage.objects;
create policy "storage_delete_dono_capa_musica"
on storage.objects
for delete
using (bucket_id = 'capa_musica' and owner = auth.uid());

drop policy if exists "storage_update_dono_capa_musica" on storage.objects;
create policy "storage_update_dono_capa_musica"
on storage.objects
for update
using (bucket_id = 'capa_musica' and owner = auth.uid());

drop policy if exists "storage_delete_dono_musica_audio" on storage.objects;
create policy "storage_delete_dono_musica_audio"
on storage.objects
for delete
using (bucket_id = 'musica_audio' and owner = auth.uid());

drop policy if exists "storage_update_dono_musica_audio" on storage.objects;
create policy "storage_update_dono_musica_audio"
on storage.objects
for update
using (bucket_id = 'musica_audio' and owner = auth.uid());

drop policy if exists "storage_delete_dono_capa_album" on storage.objects;
create policy "storage_delete_dono_capa_album"
on storage.objects
for delete
using (bucket_id = 'capa_album' and owner = auth.uid());

drop policy if exists "storage_update_dono_capa_album" on storage.objects;
create policy "storage_update_dono_capa_album"
on storage.objects
for update
using (bucket_id = 'capa_album' and owner = auth.uid());
