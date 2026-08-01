-- Pagamenti auto-dichiarati dal cliente (acconto/saldo): il cliente registra
-- quanto ha pagato tramite l'icona portafoglio sulla propria dashboard; lo
-- staff vede l'elenco e il residuo (totale confermato - pagato) nel pannello.

create type public.payment_type as enum ('acconto', 'saldo');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.payment_type not null,
  amount numeric(12, 2) not null,
  payment_date date not null,
  comment text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on public.payments (project_id, payment_date);

alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select using (public.is_staff() or project_id = public.my_project_id());

-- Il cliente registra pagamenti solo sul proprio progetto e a proprio nome;
-- una volta inviato non è modificabile da parte sua (eventuali correzioni le
-- fa lo staff).
create policy "payments_insert" on public.payments
  for insert
  with check (
    created_by = auth.uid()
    and (public.is_staff() or project_id = public.my_project_id())
  );

create policy "payments_update_staff" on public.payments
  for update using (public.is_staff()) with check (public.is_staff());

create policy "payments_delete_staff" on public.payments
  for delete using (public.is_staff());
