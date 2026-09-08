-- Abilita gli eventi realtime sulle tabelle che alimentano il componente
-- LiveRefresh (src/components/live-refresh.tsx): senza questo, i canali
-- postgres_changes restano sottoscritti ma non ricevono mai nulla, perche'
-- Supabase Realtime invia solo le tabelle esplicitamente aggiunte a questa
-- pubblicazione (stesso motivo per cui messages e notifications sono state
-- aggiunte nelle migration 0003 e 0004).
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.work_items;
alter publication supabase_realtime add table public.budget_items;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.media;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.profiles;
