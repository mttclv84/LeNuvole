-- Avanzamento a percentuale (impostato manualmente dallo staff, stesso
-- pattern di status_light/status_reason) + notifiche cliente generate
-- automaticamente da trigger quando arriva un messaggio dallo staff o viene
-- caricato un file (foto/disegno/render/documento) sul progetto.

alter table public.projects
  add column progress_percent integer not null default 0
  check (progress_percent between 0 and 100);

create type public.notification_type as enum ('message', 'media', 'document');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.notifications (recipient_profile_id, created_at);

alter table public.notifications enable row level security;

create policy "notifications_select" on public.notifications
  for select using (recipient_profile_id = auth.uid() or public.is_staff());

-- Il destinatario può solo segnare le proprie notifiche come lette.
create policy "notifications_update_own" on public.notifications
  for update using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- ============================================================================
-- TRIGGER: creano automaticamente le notifiche (security definer, stesso
-- pattern di handle_project_archived in 0001_init.sql) — così nessuna Server
-- Action deve "ricordarsi" di notificare il cliente.
-- ============================================================================

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
    from public.profiles p
    where p.project_id = new.project_id and p.role = 'client' and p.active = true;
  end if;
  return new;
end;
$$;

create trigger on_staff_message_notify
  after insert on public.messages
  for each row
  execute function public.notify_on_staff_message();

create or replace function public.notify_on_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (project_id, recipient_profile_id, type, title, body)
  select new.project_id, p.id, 'media', 'Nuovo file caricato', new.caption
  from public.profiles p
  where p.project_id = new.project_id and p.role = 'client' and p.active = true;
  return new;
end;
$$;

create trigger on_media_notify
  after insert on public.media
  for each row
  execute function public.notify_on_media();

create or replace function public.notify_on_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (project_id, recipient_profile_id, type, title, body)
  select new.project_id, p.id, 'document', 'Nuovo documento disponibile', new.title
  from public.profiles p
  where p.project_id = new.project_id and p.role = 'client' and p.active = true;
  return new;
end;
$$;

create trigger on_document_notify
  after insert on public.documents
  for each row
  execute function public.notify_on_document();

alter publication supabase_realtime add table public.notifications;
