-- Registro attività (Logs) completo: ogni azione con l'utenza che l'ha fatta.
--
--  * old_data: com'era la riga prima di una modifica, per descrivere l'azione
--    (es. "Fattura segnata saldata", "Cantiere disattivato").
--  * Nuove tabelle registrate: chat (messages), avvio timer (insert su
--    time_entries), giustificativi di sblocco dei dati contrattuali.
--  * Le operazioni fatte con la chiave di servizio (auth.uid() nullo) non
--    vengono più registrate come "Sistema": il portale le registra da sé,
--    con l'utenza vera, tramite log_event().
--  * log_event() registra anche accessi, uscite e cambi password.
--
-- Da eseguire dopo 0015_data_registrazione_pagamento.sql. Si può rieseguire
-- senza errori (tutte le istruzioni sono idempotenti).

alter table public.audit_log
  add column if not exists old_data jsonb;

create index if not exists audit_log_actor_created_idx on public.audit_log (actor_profile_id, created_at desc);

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_data jsonb;
  v_old jsonb;
begin
  -- Chiave di servizio (pannello: creazione clienti/account, ecc.): l'azione
  -- la registra il portale stesso con log_event(), con l'utenza corretta.
  if auth.uid() is null then
    if TG_OP = 'DELETE' then return OLD; end if;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_data := to_jsonb(OLD);
  else
    v_record_id := NEW.id;
    v_data := to_jsonb(NEW);
    if TG_OP = 'UPDATE' then
      v_old := to_jsonb(OLD);
    end if;
  end if;

  insert into public.audit_log (table_name, record_id, operation, actor_profile_id, data, old_data)
  values (TG_TABLE_NAME, v_record_id, lower(TG_OP)::public.audit_operation, auth.uid(), v_data, v_old);

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Avvio timer: prima si registravano solo modifiche/eliminazioni.
drop trigger if exists audit_time_entries on public.time_entries;
create trigger audit_time_entries after insert or update or delete on public.time_entries
  for each row execute function public.log_audit_event();

drop trigger if exists audit_messages on public.messages;
create trigger audit_messages after insert or update or delete on public.messages
  for each row execute function public.log_audit_event();

drop trigger if exists audit_project_key_data_unlocks on public.project_key_data_unlocks;
create trigger audit_project_key_data_unlocks after insert on public.project_key_data_unlocks
  for each row execute function public.log_audit_event();

-- Evento registrato direttamente dal portale. Lo staff può registrare
-- qualsiasi evento; gli altri utenti (clienti) solo accessi/uscite/password.
create or replace function public.log_event(
  p_table text,
  p_record_id uuid,
  p_operation public.audit_operation,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not public.is_staff() and p_table <> 'auth' then
    raise exception 'Non autorizzato.';
  end if;

  insert into public.audit_log (table_name, record_id, operation, actor_profile_id, data)
  values (p_table, p_record_id, p_operation, auth.uid(), p_data);
end;
$$;

revoke all on function public.log_event(text, uuid, public.audit_operation, jsonb) from public;
grant execute on function public.log_event(text, uuid, public.audit_operation, jsonb) to authenticated;

-- ============================================================================
-- Portafoglio cliente: chi ha registrato ogni voce e chi l'ha segnata saldata
-- ============================================================================

alter table public.budget_items
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  add column if not exists paid_by uuid references public.profiles (id) on delete set null;

-- Voci già esistenti: si ricostruisce l'utenza dal registro attività.
update public.budget_items b
set created_by = (
  select a.actor_profile_id from public.audit_log a
  where a.table_name = 'budget_items' and a.record_id = b.id and a.operation = 'insert'
  order by a.created_at limit 1
)
where b.created_by is null;

update public.budget_items b
set paid_by = (
  select a.actor_profile_id from public.audit_log a
  where a.table_name = 'budget_items' and a.record_id = b.id and a.operation = 'update'
    and a.data ->> 'paid_at' is not null
  order by a.created_at desc limit 1
)
where b.paid_at is not null and b.paid_by is null;
