-- Date contrattuali sul progetto, campi anagrafici sui profili cliente
-- (per la nuova sezione Clienti) e registro di controllo (audit log) per
-- il Super User: traccia in automatico creazioni/modifiche/cancellazioni
-- sulle tabelle "di sostanza" del portale.

alter table public.projects
  add column contract_signed_date date,
  add column work_start_date date;

-- Campi CRM: popolati solo per i profili cliente creati dalla sezione
-- Clienti. `email` è una copia di comodo (la fonte di verità resta
-- auth.users) per poterla elencare senza richiamare l'Admin API.
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column email text,
  add column phone text,
  add column address text,
  add column notes text;

-- La policy esistente "profiles_update_owner" resta per ruolo/blocco dello
-- staff (riservato al Super User, come da brief originale). Qui si apre
-- solo la gestione dei profili cliente (creazione/attivazione) a tutto lo
-- staff, coerente con la nuova sezione Clienti aperta a tutti.
create policy "profiles_update_staff_clients" on public.profiles
  for update using (public.is_staff() and role = 'client')
  with check (public.is_staff() and role = 'client');

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

create type public.audit_operation as enum ('insert', 'update', 'delete');

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  operation public.audit_operation not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  data jsonb,
  created_at timestamptz not null default now()
);

create index on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Solo il Super User (owner) consulta il registro.
create policy "audit_log_select_owner" on public.audit_log
  for select using (public.is_owner());

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_data jsonb;
begin
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_data := to_jsonb(OLD);
  else
    v_record_id := NEW.id;
    v_data := to_jsonb(NEW);
  end if;

  -- actor_profile_id resta null quando l'operazione arriva dalla service
  -- role (es. creazione utenti dal pannello): in quel contesto auth.uid()
  -- non esiste. La UI mostra "Sistema" in quel caso.
  insert into public.audit_log (table_name, record_id, operation, actor_profile_id, data)
  values (TG_TABLE_NAME, v_record_id, lower(TG_OP)::public.audit_operation, auth.uid(), v_data);

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger audit_projects after insert or update or delete on public.projects
  for each row execute function public.log_audit_event();
create trigger audit_budget_items after insert or update or delete on public.budget_items
  for each row execute function public.log_audit_event();
create trigger audit_work_items after insert or update or delete on public.work_items
  for each row execute function public.log_audit_event();
create trigger audit_timeline_steps after insert or update or delete on public.timeline_steps
  for each row execute function public.log_audit_event();
create trigger audit_media after insert or update or delete on public.media
  for each row execute function public.log_audit_event();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function public.log_audit_event();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.log_audit_event();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.log_audit_event();
