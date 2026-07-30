-- Portale Le Nuvole Casa&Design — schema iniziale + Row Level Security
-- Da eseguire nel SQL Editor del progetto Supabase (o via `supabase db push`).

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM
-- ============================================================================
create type public.user_role as enum ('owner', 'staff', 'client');
create type public.status_light as enum ('green', 'orange', 'red');
create type public.budget_status as enum ('confirmed', 'pending');
create type public.work_item_status as enum ('planned', 'in_progress', 'done');
create type public.timeline_step_status as enum ('done', 'in_progress', 'upcoming');
create type public.media_type as enum ('photo', 'drawing', 'render');
create type public.document_category as enum ('crew', 'manual', 'order_confirmation', 'other');
create type public.invoice_status as enum ('paid', 'due');

-- ============================================================================
-- TABELLE
-- ============================================================================

-- Un progetto = un cantiere = un cliente (es. "CASA BIZZOTTO")
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_label text not null,
  status_light public.status_light not null default 'green',
  status_reason text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Estende auth.users: ruolo, nome visualizzato, stato attivo, progetto associato (se cliente).
-- Le righe vengono create dal pannello staff tramite Service Role (mai da RLS pubblica).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  display_name text not null,
  active boolean not null default true,
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null,
  status public.budget_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  week_start_date date not null,
  status public.work_item_status not null default 'planned',
  created_at timestamptz not null default now()
);

-- Sostituto leggibile del Gantt: sequenza di step con stato.
create table public.timeline_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  order_index integer not null default 0,
  status public.timeline_step_status not null default 'upcoming'
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.media_type not null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category public.document_category not null default 'other',
  title text not null,
  storage_path text not null,
  requires_signature boolean not null default false,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null,
  status public.invoice_status not null default 'due',
  due_date date,
  storage_path text,
  created_at timestamptz not null default now()
);

-- Chat: unico canale per progetto. Il mittente reale è sender_profile_id,
-- ma lato UI cliente lo staff viene sempre mostrato come "Team Le Nuvole"
-- (vedi STAFF_DISPLAY_NAME in src/lib/types.ts) — non un dato di sicurezza,
-- solo una scelta di presentazione.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_profile_id uuid not null references public.profiles (id) on delete cascade,
  sender_role public.user_role not null,
  body text,
  attachment_path text,
  created_at timestamptz not null default now(),
  constraint message_has_content check (body is not null or attachment_path is not null)
);

-- Task interno staff, mai visibile al cliente: promemoria di ricontattarlo
-- 4-6 mesi dopo la chiusura del cantiere.
create table public.staff_reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  due_date date not null,
  note text not null,
  done boolean not null default false
);

create index on public.profiles (project_id);
create index on public.budget_items (project_id);
create index on public.work_items (project_id);
create index on public.timeline_steps (project_id, order_index);
create index on public.media (project_id);
create index on public.documents (project_id);
create index on public.invoices (project_id);
create index on public.messages (project_id, created_at);
create index on public.staff_reminders (project_id);

-- ============================================================================
-- FUNZIONI HELPER (SECURITY DEFINER per evitare ricorsione nelle policy)
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'staff') and active = true
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and active = true
  );
$$;

create or replace function public.my_project_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select project_id from public.profiles
  where id = auth.uid() and role = 'client';
$$;

-- ============================================================================
-- TRIGGER: alla chiusura di un cantiere, crea in automatico il promemoria
-- interno "richiama il cliente" a 5 mesi (via di mezzo del range 4-6 mesi).
-- ============================================================================

create or replace function public.handle_project_archived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_archived = true and old.is_archived = false then
    new.archived_at := now();
    insert into public.staff_reminders (project_id, due_date, note)
    values (new.id, (now() + interval '5 months')::date,
            'Ricontattare il cliente per un check-up post cantiere.');
  end if;
  return new;
end;
$$;

create trigger on_project_archived
  before update on public.projects
  for each row
  execute function public.handle_project_archived();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.projects enable row level security;
alter table public.profiles enable row level security;
alter table public.budget_items enable row level security;
alter table public.work_items enable row level security;
alter table public.timeline_steps enable row level security;
alter table public.media enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.messages enable row level security;
alter table public.staff_reminders enable row level security;

-- profiles: ognuno vede la propria riga; owner/staff vedono tutti i profili.
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

-- Solo l'owner può modificare ruolo / stato attivo / progetto assegnato di un profilo.
create policy "profiles_update_owner" on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

-- projects: staff/owner vedono tutti i cantieri, il cliente solo il proprio.
create policy "projects_select" on public.projects
  for select using (public.is_staff() or id = public.my_project_id());

create policy "projects_write_staff" on public.projects
  for all using (public.is_staff()) with check (public.is_staff());

-- Tabelle "di sola lettura per il cliente" con lo stesso pattern.
create policy "budget_items_select" on public.budget_items
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "budget_items_write_staff" on public.budget_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy "work_items_select" on public.work_items
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "work_items_write_staff" on public.work_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy "timeline_steps_select" on public.timeline_steps
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "timeline_steps_write_staff" on public.timeline_steps
  for all using (public.is_staff()) with check (public.is_staff());

create policy "media_select" on public.media
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "media_write_staff" on public.media
  for all using (public.is_staff()) with check (public.is_staff());

create policy "documents_select" on public.documents
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "documents_write_staff" on public.documents
  for all using (public.is_staff()) with check (public.is_staff());

create policy "invoices_select" on public.invoices
  for select using (public.is_staff() or project_id = public.my_project_id());
create policy "invoices_write_staff" on public.invoices
  for all using (public.is_staff()) with check (public.is_staff());

-- messages: lettura come le altre tabelle; scrittura permessa anche al
-- cliente (solo a nome proprio) perché la chat è l'unica sezione dove può agire.
create policy "messages_select" on public.messages
  for select using (public.is_staff() or project_id = public.my_project_id());

create policy "messages_insert" on public.messages
  for insert
  with check (
    sender_profile_id = auth.uid()
    and (public.is_staff() or project_id = public.my_project_id())
  );

-- staff_reminders: mai visibile al cliente.
create policy "staff_reminders_all_staff" on public.staff_reminders
  for all using (public.is_staff()) with check (public.is_staff());
