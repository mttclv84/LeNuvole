-- Tre cambiamenti collegati:
--
-- 1. Un cliente può avere PIÙ cantieri; un cantiere ha UN solo cliente.
--    Il legame si sposta da profiles.project_id (un cantiere per cliente)
--    a projects.client_id. Le regole di accesso del cliente (RLS e storage)
--    passano da "il mio cantiere" a "uno dei miei cantieri".
--
-- 2. Timing del cantiere: ore previste per Progetto / Preventivazione /
--    Cantiere (tabella project_timing, solo staff). Lo staff le salva una
--    volta; da lì sono definitive e solo il Super User (info@) le modifica.
--
-- 3. Tempi: le voci di tempo si registrano su un cantiere (project_id), non
--    più su una "commessa" separata. La tabella time_jobs viene eliminata.
--
-- Da eseguire dopo 0011_time_people.sql, in un'unica esecuzione.

-- ============================================================================
-- CONTROLLO PRELIMINARE: nessuna voce di tempo deve andare persa
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from public.time_entries e
    join public.time_jobs j on j.id = e.job_id
    where j.project_id is null
  ) then
    raise exception 'Ci sono voci di tempo su commesse non collegate a un cantiere: migrazione interrotta per non perderle. Se sono solo prove, eliminale prima (vedi istruzioni).';
  end if;
end $$;

-- ============================================================================
-- 1. CLIENTE -> PIÙ CANTIERI
-- ============================================================================

alter table public.projects
  add column client_id uuid references public.profiles (id) on delete set null;

create index on public.projects (client_id);

-- Riporta gli abbinamenti esistenti.
update public.projects pr
set client_id = p.id
from public.profiles p
where p.project_id = pr.id and p.role = 'client';

-- Il cliente di un cantiere deve essere un profilo cliente (non staff).
create or replace function public.check_project_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.profiles where id = new.client_id and role = 'client'
  ) then
    raise exception 'Il cliente del cantiere deve essere un profilo cliente.';
  end if;
  return new;
end;
$$;

create trigger check_project_client
  before insert or update of client_id on public.projects
  for each row execute function public.check_project_client();

-- "È uno dei cantieri del cliente collegato?" (security definer: legge
-- projects senza ricadere nella RLS di projects stessa).
create or replace function public.is_my_project(pid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects pr
    join public.profiles p on p.id = pr.client_id
    where pr.id = pid and p.id = auth.uid() and p.role = 'client'
  );
$$;

-- Stessa cosa per le cartelle dello storage ({project_id}/...).
create or replace function public.is_my_project_folder(folder text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects pr
    join public.profiles p on p.id = pr.client_id
    where pr.id::text = folder and p.id = auth.uid() and p.role = 'client'
  );
$$;

-- Policy riscritte: stesso significato, ma su tutti i cantieri del cliente.
drop policy "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (public.is_staff() or public.is_my_project(id));

drop policy "budget_items_select" on public.budget_items;
create policy "budget_items_select" on public.budget_items
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "work_items_select" on public.work_items;
create policy "work_items_select" on public.work_items
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "timeline_steps_select" on public.timeline_steps;
create policy "timeline_steps_select" on public.timeline_steps
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "media_select" on public.media;
create policy "media_select" on public.media
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert
  with check (
    sender_profile_id = auth.uid()
    and (public.is_staff() or public.is_my_project(project_id))
  );

drop policy "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (public.is_staff() or public.is_my_project(project_id));

drop policy "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert
  with check (
    created_by = auth.uid()
    and (public.is_staff() or public.is_my_project(project_id))
  );

drop policy "project_files_select" on storage.objects;
create policy "project_files_select" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and (
      public.is_staff()
      or public.is_my_project_folder((storage.foldername(name))[1])
    )
  );

drop policy "project_files_insert" on storage.objects;
create policy "project_files_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'project-files'
    and (
      public.is_staff()
      or (
        public.is_my_project_folder((storage.foldername(name))[1])
        and (storage.foldername(name))[2] = 'chat'
      )
    )
  );

-- Notifiche al cliente: il destinatario è il cliente del cantiere.
create or replace function public.notify_on_staff_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_role <> 'client' then
    insert into public.notifications (project_id, recipient_profile_id, type, title, body)
    select new.project_id, p.id, 'message', 'Nuovo messaggio da Le Nuvole',
           left(coalesce(new.body, 'Ti hanno inviato una foto.'), 140)
    from public.projects pr
    join public.profiles p on p.id = pr.client_id
    where pr.id = new.project_id and p.role = 'client' and p.active = true;
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (project_id, recipient_profile_id, type, title, body)
  select new.project_id, p.id, 'media', 'Nuovo file caricato', new.caption
  from public.projects pr
  join public.profiles p on p.id = pr.client_id
  where pr.id = new.project_id and p.role = 'client' and p.active = true;
  return new;
end;
$$;

create or replace function public.notify_on_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (project_id, recipient_profile_id, type, title, body)
  select new.project_id, p.id, 'document', 'Nuovo documento disponibile', new.title
  from public.projects pr
  join public.profiles p on p.id = pr.client_id
  where pr.id = new.project_id and p.role = 'client' and p.active = true;
  return new;
end;
$$;

-- Il vecchio legame non serve più.
drop function public.my_project_id();
alter table public.profiles drop column project_id;

-- ============================================================================
-- 2. TIMING DEL CANTIERE
-- ============================================================================

create table public.project_timing (
  -- id serve al registro (log_audit_event legge NEW.id).
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  -- Ore previste intere (il menu propone da 0 a 100).
  est_design_h integer not null default 0 check (est_design_h between 0 and 100),
  est_quoting_h integer not null default 0 check (est_quoting_h between 0 and 100),
  est_site_h integer not null default 0 check (est_site_h between 0 and 100),
  saved_by uuid references public.profiles (id) on delete set null,
  saved_at timestamptz not null default now()
);

alter table public.project_timing enable row level security;

-- Solo staff: i clienti non vedono le ore previste.
create policy "project_timing_select_staff" on public.project_timing
  for select using (public.is_staff());

-- Primo salvataggio: tutto lo staff. project_id è unico, quindi si può
-- inserire una sola volta per cantiere.
create policy "project_timing_insert_staff" on public.project_timing
  for insert with check (public.is_staff());

-- Dopo il primo salvataggio le ore sono definitive: le cambia solo il Super User.
create policy "project_timing_update_owner" on public.project_timing
  for update using (public.is_owner()) with check (public.is_owner());

create policy "project_timing_delete_owner" on public.project_timing
  for delete using (public.is_owner());

create trigger audit_project_timing after insert or update or delete on public.project_timing
  for each row execute function public.log_audit_event();

alter publication supabase_realtime add table public.project_timing;

-- ============================================================================
-- 3. TEMPI SUI CANTIERI
-- ============================================================================

alter table public.time_entries
  add column project_id uuid references public.projects (id) on delete cascade;

update public.time_entries e
set project_id = j.project_id
from public.time_jobs j
where j.id = e.job_id;

alter table public.time_entries alter column project_id set not null;
alter table public.time_entries drop column job_id;

create index on public.time_entries (project_id);
create index on public.time_entries (started_at desc);

drop table public.time_jobs;
