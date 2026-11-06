-- Portafoglio cliente: una voce si elimina solo con una motivazione, che
-- finisce nel registro Logs insieme ai dati della voce eliminata.
--
-- Da eseguire dopo 0016_logs_completi.sql. Si può rieseguire senza errori.

-- Il registro aggiunge la motivazione (se presente nella transazione) ai
-- dati registrati, sotto la chiave "_reason".
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
  v_reason text := nullif(current_setting('lenuvole.reason', true), '');
begin
  -- Chiave di servizio: l'azione la registra il portale con log_event().
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

  if v_reason is not null then
    v_data := v_data || jsonb_build_object('_reason', v_reason);
  end if;

  insert into public.audit_log (table_name, record_id, operation, actor_profile_id, data, old_data)
  values (TG_TABLE_NAME, v_record_id, lower(TG_OP)::public.audit_operation, auth.uid(), v_data, v_old);

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Difesa sul database: niente eliminazione di voci senza motivazione
-- (vale per lo staff dal portale; la chiave di servizio resta libera, es.
-- cancellazione definitiva di un cantiere con tutti i suoi dati).
create or replace function public.require_budget_item_delete_reason()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and nullif(current_setting('lenuvole.reason', true), '') is null
     and exists (select 1 from public.projects where id = OLD.project_id) then
    raise exception 'Per eliminare una voce del portafoglio serve una motivazione.';
  end if;
  return OLD;
end;
$$;

drop trigger if exists require_budget_item_delete_reason on public.budget_items;
create trigger require_budget_item_delete_reason
  before delete on public.budget_items
  for each row execute function public.require_budget_item_delete_reason();

create or replace function public.delete_budget_item(p_id uuid, p_reason text)
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
    raise exception 'La motivazione è obbligatoria.';
  end if;

  -- Valida solo dentro questa transazione: la leggono i due trigger.
  perform set_config('lenuvole.reason', trim(p_reason), true);
  delete from public.budget_items where id = p_id;
end;
$$;

revoke all on function public.delete_budget_item(uuid, text) from public;
grant execute on function public.delete_budget_item(uuid, text) to authenticated;
