import type { UserRole } from "@/lib/types";

// Un solo punto in cui si decide chi può fare cosa nel pannello.
//
//   owner = Super User: accesso totale. Uno solo (info@lenuvolecasaedesign.it).
//   staff = lavoro operativo (clienti, cantieri, tempi propri).
//
// Per spostare un confine basta cambiare la regola qui sotto: UI e server
// actions leggono da questo file. Le regole sui dati sono comunque difese
// anche dal database (RLS).

export const isOwner = (role: UserRole) => role === "owner";

export const permissions = {
  // Pagina Utenti: elenco account, creazione, modifica, blocco, eliminazione.
  accessUsersPage: (role: UserRole) => isOwner(role),

  // Registro delle modifiche (Logs).
  viewLogs: (role: UserRole) => isOwner(role),

  // Cancellazione definitiva di account, cantieri e commesse (non reversibile).
  deleteForever: (role: UserRole) => isOwner(role),

  // Modificare le ore previste (Timing) di un cantiere dopo il primo salvataggio.
  editSavedTiming: (role: UserRole) => isOwner(role),

  // Correggere o eliminare le voci di tempo di altre persone.
  correctOthersTime: (role: UserRole) => isOwner(role),

  // Può gestire (modificare, bloccare, reimpostare password) un account di questo livello?
  canManageAccount: (actor: UserRole, target: UserRole) => isOwner(actor) && target !== "client",
};
