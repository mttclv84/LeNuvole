-- Le persone dei tempi (Mattia, Federica, Lesly...) sono separate dagli
-- account di accesso: gli accessi restano info@, commerciale@ e interior@, e
-- chi registra il tempo sceglie dal menu la persona a cui attribuirlo.
--
-- Da eseguire dopo 0010_time_tracking.sql. Se esistessero già voci di tempo
-- la migration si ferma con un errore invece di cancellarle: la funzione non
-- è ancora in uso, quindi non dovrebbe succedere.

do $$
begin
  if exists (select 1 from public.time_entries) then
    raise exception 'time_entries contiene già voci: migrazione interrotta per non perdere dati. Contattare l''assistenza.';
  end if;
end $$;

-- ============================================================================
-- ELENCO PERSONE
-- ============================================================================

create table public.time_people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Chi non lavora più sulle commesse si disattiva (non si elimina): le sue
  -- ore passate restano nei totali.
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index time_people_name_unique on public.time_people (lower(name));

alter table public.time_people enable row level security;

create policy "time_people_select_staff" on public.time_people
  for select using (public.is_staff());

-- L'elenco lo gestisce solo il Super User.
create policy "time_people_insert_owner" on public.time_people
  for insert with check (public.is_owner());

create policy "time_people_update_owner" on public.time_people
  for update using (public.is_owner()) with check (public.is_owner());

insert into public.time_people (name, sort_order) values
  ('Mattia', 1),
  ('Federica', 2),
  ('Lesly', 3);

create trigger audit_time_people after insert or update or delete on public.time_people
  for each row execute function public.log_audit_event();

alter publication supabase_realtime add table public.time_people;

-- ============================================================================
-- VOCI DI TEMPO: ora appartengono a una persona, non a un account
-- ============================================================================

alter table public.time_entries
  add column person_id uuid not null references public.time_people (id) on delete restrict;

-- profile_id diventa "recorded_by": l'account con cui la voce è stata inserita.
-- Se l'account viene eliminato le ore restano (appartengono alla persona).
alter table public.time_entries rename column profile_id to recorded_by;
alter table public.time_entries alter column recorded_by drop not null;
alter table public.time_entries drop constraint if exists time_entries_profile_id_fkey;
alter table public.time_entries
  add constraint time_entries_recorded_by_fkey
  foreign key (recorded_by) references public.profiles (id) on delete set null;

create index on public.time_entries (person_id, started_at desc);

-- Un solo timer attivo per persona (non più per account: lo stesso accesso
-- può essere usato da persone diverse).
drop index if exists public.time_entries_one_running_per_profile;
create unique index time_entries_one_running_per_person
  on public.time_entries (person_id)
  where ended_at is null;

-- ============================================================================
-- POLICY: gli accessi sono condivisi, quindi le regole non si basano più su "chi sei"
-- ============================================================================

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_staff" on public.time_entries
  for insert with check (public.is_staff() and recorded_by = auth.uid());

-- Chiunque dello staff può fermare un timer in corso (anche partito da un altro
-- accesso); le voci già chiuse le corregge solo il Super User.
drop policy if exists "time_entries_update_own_or_owner" on public.time_entries;
create policy "time_entries_update_running_or_owner" on public.time_entries
  for update
  using ((public.is_staff() and ended_at is null) or public.is_owner())
  with check (public.is_staff() or public.is_owner());

-- Lo staff elimina solo le voci inserite con il proprio accesso; il Super User tutte.
drop policy if exists "time_entries_delete_own_or_owner" on public.time_entries;
create policy "time_entries_delete_recorder_or_owner" on public.time_entries
  for delete using ((public.is_staff() and recorded_by = auth.uid()) or public.is_owner());
