-- Clienti: motivazione (obbligatoria nel portale) e data della disattivazione.
-- Alla riattivazione i due campi tornano vuoti; lo storico resta nei Logs.
--
-- Da eseguire dopo 0018_aggancio_cliente.sql.
-- Si può rieseguire senza errori.

alter table public.profiles
  add column if not exists deactivation_reason text,
  add column if not exists deactivated_at timestamptz;
