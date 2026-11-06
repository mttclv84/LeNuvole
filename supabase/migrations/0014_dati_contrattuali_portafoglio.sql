-- 1) Dati contrattuali del cantiere bloccati dopo il salvataggio
-- 2) Portafoglio cliente: conferme d'ordine + fatture "da saldare"/"saldata"
--
-- Da eseguire dopo 0013_timer_auto_stop.sql. Non cancella dati.

-- ============================================================================
-- 1) DATI CONTRATTUALI (colore Gantt, data firma contratto, data inizio lavori)
-- ============================================================================
-- Salvati tutti e tre, restano bloccati (key_data_locked_at valorizzato).
-- Per modificarli serve uno sblocco con giustificativo, che resta registrato;
-- dopo le modifiche si salva di nuovo e l'area torna bloccata.

alter table public.projects
  add column key_data_locked_at timestamptz;

create table public.project_key_data_unlocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  reason text not null check (length(trim(reason)) > 0),
  unlocked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.project_key_data_unlocks (project_id, created_at desc);

alter table public.project_key_data_unlocks enable row level security;

-- Solo lo staff legge lo storico degli sblocchi; si scrive solo tramite
-- unlock_project_key_data() qui sotto (nessuna policy di insert diretto).
create policy "key_data_unlocks_select_staff" on public.project_key_data_unlocks
  for select using (public.is_staff());

-- Difesa sul database: con l'area bloccata i tre campi non cambiano, da
-- qualunque parte arrivi la modifica; e lo sblocco passa solo dalla funzione.
create or replace function public.check_project_key_data_lock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.key_data_locked_at is not null then
    if new.key_data_locked_at is not null and (
      new.color is distinct from old.color
      or new.contract_signed_date is distinct from old.contract_signed_date
      or new.work_start_date is distinct from old.work_start_date
    ) then
      raise exception 'Dati contrattuali bloccati: sbloccarli con un giustificativo prima di modificarli.';
    end if;

    if new.key_data_locked_at is null
       and coalesce(current_setting('lenuvole.key_data_unlock', true), '') <> 'on' then
      raise exception 'Lo sblocco dei dati contrattuali richiede un giustificativo.';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_project_key_data_lock
  before update on public.projects
  for each row execute function public.check_project_key_data_lock();

create or replace function public.unlock_project_key_data(p_project_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Non autorizzato.';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Il giustificativo è obbligatorio.';
  end if;

  insert into public.project_key_data_unlocks (project_id, reason, unlocked_by)
  values (p_project_id, trim(p_reason), auth.uid());

  -- Valido solo dentro questa transazione: autorizza il trigger qui sopra.
  perform set_config('lenuvole.key_data_unlock', 'on', true);
  update public.projects set key_data_locked_at = null where id = p_project_id;
end;
$$;

revoke all on function public.unlock_project_key_data(uuid, text) from public;
grant execute on function public.unlock_project_key_data(uuid, text) to authenticated;

-- I cantieri che hanno già tutti e tre i dati partono bloccati.
update public.projects
set key_data_locked_at = now()
where color is not null and contract_signed_date is not null and work_start_date is not null;

-- ============================================================================
-- 2) PORTAFOGLIO CLIENTE
-- ============================================================================
-- Ogni voce ha un tipo:
--   conferma_ordine      -> importo che il cliente deve pagare (il "conto")
--   fattura_acconto / fattura_avanzamento / fattura_saldo
--                        -> fatture emesse: "da saldare" finché lo staff non
--                           le segna come saldate (paid_at = data del saldo)
-- Lo storico pagamenti è dato dalle fatture saldate. Solo lo staff modifica
-- (policy budget_items_write_staff già esistente); il cliente vede soltanto.

create type public.budget_kind as enum (
  'conferma_ordine',
  'fattura_acconto',
  'fattura_avanzamento',
  'fattura_saldo'
);

alter table public.budget_items
  add column kind public.budget_kind not null default 'conferma_ordine',
  add column paid_at date,
  add constraint budget_items_paid_only_invoices
    check (paid_at is null or kind <> 'conferma_ordine');

-- Le voci budget esistenti diventano conferme d'ordine (default della colonna).

-- I pagamenti non li dichiara più il cliente: tolto il permesso di inserirli.
-- La tabella payments e i dati già registrati restano (non più mostrati).
drop policy if exists "payments_insert" on public.payments;
