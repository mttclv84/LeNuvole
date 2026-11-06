-- Clienti: "Aggancio", cioè come il cliente è arrivato a Le Nuvole.
-- Obbligatorio per i nuovi clienti (lo richiede il portale); i clienti già
-- registrati restano vuoti finché non vengono modificati.
--
-- Da eseguire dopo 0017_elimina_voce_portafoglio_motivazione.sql.
-- Si può rieseguire senza errori.

alter table public.profiles
  add column if not exists lead_source text;

alter table public.profiles
  drop constraint if exists profiles_lead_source_check;

alter table public.profiles
  add constraint profiles_lead_source_check check (
    lead_source is null or lead_source in (
      'passaparola', 'online', 'social', 'giornale', 'cartellone',
      'fiera', 'volantino', 'evento', 'professionista'
    )
  );
