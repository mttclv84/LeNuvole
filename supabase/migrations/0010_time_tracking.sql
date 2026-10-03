-- Gestione tempi clienti (uso interno staff): commesse con ore previste per
-- area (Progetto / Preventivazione / Cantiere) e registrazione del tempo
-- reale per persona, via timer o inserimento manuale.
--
-- Una "commessa" (time_jobs) è separata dai cantieri (projects): progetto e
-- preventivazione avvengono prima che il cantiere esista. Il collegamento a
-- un cantiere è facoltativo (project_id).
--
-- I clienti del portale non vedono mai queste tabelle: tutte le policy
-- richiedono is_staff().

create type public.time_area as enum ('design', 'quoting', 'site');
create type public.time_entry_source as enum ('timer', 'manual');

-- ============================================================================
-- TABELLE
-- ============================================================================

create table public.time_jobs (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  title text not null,
  opened_on date not null default current_date,
  notes text,
  -- Ore previste, in ore (decimali ammessi: 7.5 = 7h30). Non divise per persona.
  est_design_h numeric(7, 2) not null default 0 check (est_design_h >= 0),
  est_quoting_h numeric(7, 2) not null default 0 check (est_quoting_h >= 0),
  est_site_h numeric(7, 2) not null default 0 check (est_site_h >= 0),
  project_id uuid references public.projects (id) on delete set null,
  is_closed boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.time_jobs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  area public.time_area not null,
  started_at timestamptz not null,
  -- ended_at e minutes sono null finché il timer è in corso.
  ended_at timestamptz,
  minutes integer check (minutes >= 0),
  note text,
  source public.time_entry_source not null default 'manual',
  created_at timestamptz not null default now(),
  constraint time_entry_running_or_done check (
    (ended_at is null and minutes is null)
    or (ended_at is not null and minutes is not null)
  )
);

create index on public.time_entries (job_id);
create index on public.time_entries (profile_id, started_at desc);
create index on public.time_jobs (created_at desc);

-- Un solo timer attivo per persona: avviarne un secondo richiede di fermare il primo.
create unique index time_entries_one_running_per_profile
  on public.time_entries (profile_id)
  where ended_at is null;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.time_jobs enable row level security;
alter table public.time_entries enable row level security;

-- Commesse: tutto lo staff le vede, le crea e le modifica; solo il Super User le elimina.
create policy "time_jobs_select_staff" on public.time_jobs
  for select using (public.is_staff());

create policy "time_jobs_insert_staff" on public.time_jobs
  for insert with check (public.is_staff());

create policy "time_jobs_update_staff" on public.time_jobs
  for update using (public.is_staff()) with check (public.is_staff());

create policy "time_jobs_delete_owner" on public.time_jobs
  for delete using (public.is_owner());

-- Voci di tempo: tutto lo staff le legge (serve per i totali per persona).
create policy "time_entries_select_staff" on public.time_entries
  for select using (public.is_staff());

-- Ognuno registra solo a proprio nome.
create policy "time_entries_insert_own" on public.time_entries
  for insert with check (public.is_staff() and profile_id = auth.uid());

-- Ognuno corregge/elimina le proprie voci; il Super User anche quelle altrui.
create policy "time_entries_update_own_or_owner" on public.time_entries
  for update
  using ((public.is_staff() and profile_id = auth.uid()) or public.is_owner())
  with check ((public.is_staff() and profile_id = auth.uid()) or public.is_owner());

create policy "time_entries_delete_own_or_owner" on public.time_entries
  for delete using ((public.is_staff() and profile_id = auth.uid()) or public.is_owner());

-- ============================================================================
-- AUDIT LOG (stesso trigger di 0006)
-- ============================================================================

create trigger audit_time_jobs after insert or update or delete on public.time_jobs
  for each row execute function public.log_audit_event();

-- Per le voci di tempo si registrano solo correzioni ed eliminazioni di voci
-- già chiuse: avvio e stop del timer non devono riempire il registro.
create trigger audit_time_entries after update or delete on public.time_entries
  for each row
  when (old.ended_at is not null)
  execute function public.log_audit_event();

-- ============================================================================
-- REALTIME (per LiveRefresh: timer e totali aggiornati su più dispositivi)
-- ============================================================================

alter publication supabase_realtime add table public.time_jobs;
alter publication supabase_realtime add table public.time_entries;
