-- Fatture saldate: due date distinte.
--   paid_at           -> data effettiva del pagamento, scelta dallo staff
--                        (proposta: oggi, modificabile nel popup)
--   paid_recorded_at  -> quando lo staff l'ha registrato, automatica
--
-- Da eseguire dopo 0014_dati_contrattuali_portafoglio.sql.

alter table public.budget_items
  add column if not exists paid_recorded_at timestamptz;

-- Fatture già segnate come saldate: la registrazione coincide con il saldo.
update public.budget_items
set paid_recorded_at = paid_at::timestamptz
where paid_at is not null and paid_recorded_at is null;
