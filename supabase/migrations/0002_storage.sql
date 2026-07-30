-- Bucket unico per tutti i file del progetto, organizzato per cartelle:
--   {project_id}/media/...      (foto, disegni, render)
--   {project_id}/documents/...  (documenti, conferme d'ordine, manuali, fatture)
--   {project_id}/chat/...       (allegati chat, anche caricati dal cliente)
--
-- Bucket privato: ogni file va servito con una signed URL generata lato server
-- (storage.createSignedUrl), mai con URL pubblico diretto.

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Lettura: staff/owner vedono tutto; il cliente vede solo i file del proprio progetto.
create policy "project_files_select" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.my_project_id()::text
    )
  );

-- Scrittura: lo staff carica ovunque; il cliente può caricare solo dentro
-- la propria cartella "chat" (unica azione consentita oltre alla consultazione).
create policy "project_files_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'project-files'
    and (
      public.is_staff()
      or (
        (storage.foldername(name))[1] = public.my_project_id()::text
        and (storage.foldername(name))[2] = 'chat'
      )
    )
  );

-- Modifica/eliminazione riservata allo staff (il cliente non deve poter
-- alterare o rimuovere ciò che carica lo studio).
create policy "project_files_update" on storage.objects
  for update using (public.is_staff() and bucket_id = 'project-files')
  with check (public.is_staff() and bucket_id = 'project-files');

create policy "project_files_delete" on storage.objects
  for delete using (public.is_staff() and bucket_id = 'project-files');
