-- Banner de perfil: músico e organizador podem definir uma imagem de
-- capa própria, usada como fundo no modal de prévia de perfil e no
-- topo do perfil completo (/usuario/[id]).
alter table public.perfil_musico
  add column if not exists banner_url text;

alter table public.perfil_organizador
  add column if not exists banner_url text;

-- Storage: novo bucket "banner_perfil" (crie-o manualmente como
-- público no painel do Supabase, ou via API, antes de rodar isto).
-- As policies seguem o mesmo padrão do bucket "foto_perfil" em
-- 11_rls_completo.sql: leitura pública, escrita só de quem é dono do
-- objeto.
drop policy if exists "storage_select_publico" on storage.objects;
create policy "storage_select_publico"
on storage.objects
for select
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil', 'banner_perfil'));

drop policy if exists "storage_insert_autenticado" on storage.objects;
create policy "storage_insert_autenticado"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil', 'banner_perfil'));

drop policy if exists "storage_update_dono" on storage.objects;
create policy "storage_update_dono"
on storage.objects
for update
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil', 'banner_perfil') and owner = auth.uid());

drop policy if exists "storage_delete_dono" on storage.objects;
create policy "storage_delete_dono"
on storage.objects
for delete
using (bucket_id in ('capa_musica', 'musica_audio', 'capa_album', 'foto_perfil', 'banner_perfil') and owner = auth.uid());
