-- Le "lavorazioni previste" diventano la fonte unica anche per
-- l'"avanzamento": ogni voce ha ora un intervallo di date (inizio/fine)
-- invece della sola settimana, e due nuovi stati (Posticipo, Cancellazione)
-- oltre a In corso/Completata. La vista "Avanzamento" (client e staff) si
-- genera in automatico da queste voci ordinate per data, non più da una
-- lista gestita a mano (la vecchia tabella timeline_steps resta nello
-- schema per compatibilità ma non è più usata dall'app).

alter table public.work_items rename column week_start_date to start_date;
alter table public.work_items add column end_date date;

alter type public.work_item_status add value 'postponed';
alter type public.work_item_status add value 'cancelled';
