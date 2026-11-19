-- 1) Clienti: chi ha registrato il profilo (la data è già created_at).
--    Per i clienti esistenti si recupera dai Logs (evento "client_created");
--    se non c'è traccia resta vuoto.
-- 2) Preventivi: per ora usati alla disattivazione di un cliente per
--    registrare un preventivo presentato e non accettato. Lo stato prevede
--    già anche "inviato" e "accettato" per l'analisi futura dei preventivi.
--
-- Da eseguire dopo 0019_motivo_disattivazione_cliente.sql.
-- Si può rieseguire senza errori.

alter table public.profiles
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

update public.profiles p
set created_by = a.actor_profile_id
from (
  select distinct on (record_id) record_id, actor_profile_id
  from public.audit_log
  where table_name = 'profiles'
    and data ->> 'event' = 'client_created'
    and actor_profile_id is not null
  order by record_id, created_at
) a
where p.id = a.record_id
  and p.role = 'client'
  and p.created_by is null;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  -- Il preventivo resta anche se il cliente viene eliminato definitivamente:
  -- client_id torna vuoto ma il nome resta in client_name.
  client_id uuid references public.profiles (id) on delete set null,
  client_name text not null,
  subject text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'sent' check (status in ('sent', 'accepted', 'rejected')),
  reason text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists quotes_client_idx on public.quotes (client_id);
create index if not exists quotes_status_idx on public.quotes (status, created_at desc);

alter table public.quotes enable row level security;

drop policy if exists "quotes_staff_all" on public.quotes;
create policy "quotes_staff_all" on public.quotes
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists audit_quotes on public.quotes;
create trigger audit_quotes after insert or update or delete on public.quotes
  for each row execute function public.log_audit_event();
