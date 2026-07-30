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

## 2. Installare ed eseguire in locale

```bash
npm install
npm run dev
```

App su [http://localhost:3000](http://localhost:3000) — reindirizza a `/login`.

## 3. Popolare dati demo (opzionale ma consigliato)

Crea un cantiere fittizio "CASA BIZZOTTO" con 3 utenti demo (owner, staff,
cliente), utile per la revisione visiva prima di collegare dati reali:

```bash
npm run seed
```

Le credenziali stampate a console vanno cambiate al primo accesso (sezione
Impostazioni per il cliente, l'owner può gestire lo staff da "Utenti").

## Struttura

- `src/app/(auth)/login` — login email/password.
- `src/app/(client)/*` — area cliente: dashboard, foto, documenti, chat,
  impostazioni. Sola consultazione tranne la chat.
- `src/app/(staff)/staff/*` — pannello staff: elenco cantieri, dettaglio
  cantiere (stato, budget, lavorazioni, timeline), foto, documenti, chat;
  `staff/utenti` è riservato all'owner (creazione account, blocco staff).
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

Pensato per [Vercel](https://vercel.com): collega il repository, imposta le
stesse variabili d'ambiente di `.env.local` nelle impostazioni del progetto
Vercel, deploy. Nessun'altra configurazione richiesta (Proxy/Node runtime
supportato nativamente).
