# Portale Le Nuvole Casa&Design

Portale cliente per seguire l'andamento del proprio progetto (ristrutturazione /
interior design) senza cercare tra mail, WhatsApp e chiavette. Vedi
`../DOCUMENTO PER APP LE NUVOLE CASA (002).pdf` per i requisiti originali e
il piano concordato in `C:\Users\matti\.claude\plans\hazy-launching-tiger.md`.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, backend Supabase
(Postgres + Auth + Storage + Realtime), PWA installabile.

## 1. Creare il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), crea un nuovo progetto (regione EU).
2. In **Project Settings → API** copia `Project URL`, `anon public key` e
   `service_role key`.
3. Copia `.env.local.example` in `.env.local` e compila le tre variabili.
4. Nel **SQL Editor** del progetto, esegui in ordine:
   - `supabase/migrations/0001_init.sql` (tabelle + Row Level Security)
   - `supabase/migrations/0002_storage.sql` (bucket file + policy)
   - `supabase/migrations/0003_realtime.sql` (chat in tempo reale)
   - poi tutte le successive (`0004` … `0012`) in ordine numerico, ciascuna come
     esecuzione separata. La `0010` aggiunge la gestione tempi (sezione "Tempi"
     del pannello staff), la `0011` l'elenco delle persone tra cui si sceglie nel
     menu quando si registra il tempo (Mattia, Federica, Lesly), la `0012` permette
     più cantieri per cliente, aggiunge la sezione Timing del cantiere e lega i
     tempi ai cantieri.

## 2. Installare ed eseguire in locale

```bash
npm install
npm run dev
```

App su [http://localhost:3000](http://localhost:3000) — reindirizza a `/login`.

## 3. Account veri

Gli accessi reali sono tre: **info@lenuvolecasaedesign.it** (Super User, accesso
totale: Logs, eliminazioni, correzione dei record di tutti) e
**commerciale@** / **interior@lenuvolecasaedesign.it** (Staff). Si creano con:

```bash
npm run setup:accounts
```

Lo script stampa per ogni account nuovo un link di primo accesso (uso singolo,
scade presto) con cui la persona sceglie la propria password: nessuna password
viaggia in chiaro. `--links` ne rigenera di nuovi per gli account già esistenti.

Dopo il primo accesso del Super User, per eliminare gli eventuali account demo:

```bash
npm run setup:accounts -- --delete-demo          # simulazione, mostra cosa verrebbe eliminato
npm run setup:accounts -- --delete-demo --yes    # elimina davvero
```

Lo script elimina solo se il Super User esiste ed è attivo. Il cantiere demo
"CASA BIZZOTTO", se presente, va eliminato a mano dal pannello.

### Dati demo (solo database di prova)

`npm run seed` crea un cantiere fittizio "CASA BIZZOTTO" con 3 utenti demo, utile
per la revisione visiva. Su un database reale **non va usato**: per questo si rifiuta
di partire se non si imposta `ALLOW_DEMO_SEED=1`. La password degli account demo è
casuale e viene stampata una sola volta a fine esecuzione (oppure la imposti tu con
`SEED_PASSWORD`).

## Struttura

- `src/app/(auth)/login` — login email/password.
- `src/app/(client)/*` — area cliente: dashboard, foto, documenti, chat,
  impostazioni. Sola consultazione tranne la chat.
- `src/app/(staff)/staff/*` — pannello staff: elenco cantieri, dettaglio
  cantiere (stato, budget, lavorazioni, timeline), foto, documenti, chat;
  `staff/utenti` è riservato al Super User (creazione, blocco ed eliminazione
  degli account staff); `staff/[projectId]/timing` le ore previste del cantiere,
  `staff/tempi` la registrazione dei tempi, `staff/monitor` storico e riepiloghi; i permessi
  stanno tutti in `src/lib/permissions.ts`.
- `src/proxy.ts` + `src/lib/supabase/proxy.ts` — rinfresca la sessione e
  instrada ogni richiesta in base al ruolo (cliente / staff / owner) e allo
  stato dell'account.
- `supabase/migrations/*.sql` — schema e sicurezza (RLS): un cliente non può
  mai leggere dati di un altro progetto, verificato a livello di database e
  non solo di interfaccia.
- `scripts/seed.ts` — dati demo. `scripts/generate-placeholder-icons.py` —
  rigenera le icone PWA placeholder (vedi sotto).

## Nota su brand e grafica

Colori, font e icone sono **placeholder** (vedi `src/app/globals.css`,
variabili `--accent` ecc., e `scripts/generate-placeholder-icons.py`).
Da sostituire quando Bea fornisce logo e palette definitivi — tutto è
centralizzato in un unico punto, non serve toccare i componenti.

## Cosa manca rispetto al documento originale (rimandato a Fase 2)

Conferme d'ordine con firma digitale, sezioni Disegni/Render distinte dalla
sezione Foto, sezione Manuali dedicata, sezione Fatture (tabella già pronta
nello schema, manca solo l'interfaccia), promemoria interno post-cantiere
(il trigger DB che lo crea è già attivo, manca la UI per consultarlo),
disattivazione della chat a fine cantiere, notifiche push reali, sblocco
biometrico. Vedi il piano per il dettaglio.

## Deploy

Hosting scelto: **Render** (Web Service Node.js), backend su **Supabase**.
Nessuna modifica al codice richiesta per Render: `src/proxy.ts` gira di
default su runtime Node.js, compatibile con un Web Service Render standard.

Passi indicativi su Render:

1. New → Web Service → collega il repository GitHub.
2. Build command: `npm install && npm run build` — Start command: `npm start`.
3. Imposta come variabili d'ambiente le stesse tre di `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy.

(Vercel resta comunque un'alternativa valida senza differenze di codice, nel
caso si preferisca in futuro.)
