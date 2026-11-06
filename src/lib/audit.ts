import { BUDGET_KIND_LABEL, type AuditLogEntry, type BudgetKind } from "@/lib/types";

// Descrizione breve (circa tre parole) di ogni azione del registro Logs.

// Eventi registrati direttamente dal portale (vedi lib/data/log-event.ts).
export type AuditEvent =
  | "login"
  | "logout"
  | "link_login"
  | "password_changed"
  | "client_created"
  | "client_updated"
  | "client_temp_password"
  | "client_deleted"
  | "staff_created"
  | "staff_updated"
  | "staff_password"
  | "staff_deleted";

const EVENT_LABEL: Record<AuditEvent, string> = {
  login: "Accesso al portale",
  logout: "Uscita dal portale",
  link_login: "Accesso tramite link",
  password_changed: "Password cambiata",
  client_created: "Cliente creato",
  client_updated: "Anagrafica cliente modificata",
  client_temp_password: "Password temporanea impostata",
  client_deleted: "Cliente eliminato definitivamente",
  staff_created: "Account staff creato",
  staff_updated: "Account staff modificato",
  staff_password: "Password account reimpostata",
  staff_deleted: "Account staff eliminato",
};

type Row = Record<string, unknown>;

const changed = (d: Row, o: Row | null, key: string) => o !== null && JSON.stringify(d[key]) !== JSON.stringify(o[key]);
const MEDIA_UPLOADED: Record<string, string> = { photo: "Foto caricata", drawing: "Disegno caricato", render: "Render caricato" };
const MEDIA_DELETED: Record<string, string> = { photo: "Foto eliminata", drawing: "Disegno eliminato", render: "Render eliminato" };
const INVOICE_SHORT: Record<string, string> = {
  fattura_acconto: "Fattura acconto",
  fattura_avanzamento: "Fattura avanzamento",
  fattura_saldo: "Fattura saldo",
};

export function describeAuditEntry(entry: AuditLogEntry): string {
  const d = (entry.data ?? {}) as Row;
  const o = (entry.old_data ?? null) as Row | null;
  const op = entry.operation;

  if (typeof d.event === "string" && d.event in EVENT_LABEL) {
    return EVENT_LABEL[d.event as AuditEvent];
  }

  switch (entry.table_name) {
    case "projects":
      if (op === "insert") return "Cantiere creato";
      if (op === "delete") return "Cantiere eliminato definitivamente";
      if (changed(d, o, "is_archived")) return d.is_archived ? "Cantiere disattivato" : "Cantiere riattivato";
      if (changed(d, o, "key_data_locked_at")) {
        return d.key_data_locked_at ? "Dati contrattuali salvati" : "Dati contrattuali sbloccati";
      }
      if (changed(d, o, "client_id")) return "Cliente cantiere cambiato";
      if (changed(d, o, "status_light") || changed(d, o, "status_reason")) return "Stato lavori aggiornato";
      return "Cantiere modificato";

    case "project_key_data_unlocks":
      return "Giustificativo sblocco registrato";

    case "budget_items": {
      const kind = String(d.kind ?? "conferma_ordine");
      const isOrder = kind === "conferma_ordine";
      const name = isOrder ? "Conferma d'ordine" : (INVOICE_SHORT[kind] ?? BUDGET_KIND_LABEL[kind as BudgetKind] ?? "Voce");
      if (op === "insert") return isOrder ? "Conferma d'ordine aggiunta" : `${name} emessa`;
      if (op === "delete") return isOrder ? "Conferma d'ordine eliminata" : `${name} eliminata`;
      if (changed(d, o, "paid_at")) return d.paid_at ? "Fattura segnata saldata" : "Saldo fattura annullato";
      return "Voce portafoglio modificata";
    }

    case "work_items":
      if (op === "insert") return "Lavorazione aggiunta";
      if (op === "delete") return "Lavorazione eliminata";
      if (changed(d, o, "status")) return "Stato lavorazione cambiato";
      return "Lavorazione modificata";

    case "media":
      return op === "delete"
        ? (MEDIA_DELETED[String(d.type)] ?? "Foto eliminata")
        : (MEDIA_UPLOADED[String(d.type)] ?? "Foto caricata");

    case "documents":
      if (op === "insert") return "Documento caricato";
      if (op === "delete") return "Documento eliminato";
      if (changed(d, o, "signed_at")) return "Documento segnato firmato";
      return "Documento modificato";

    case "messages":
      if (op === "delete") return "Messaggio chat eliminato";
      return d.attachment_path ? "Foto in chat" : "Messaggio in chat";

    case "profiles": {
      const who = d.role === "client" ? "Cliente" : "Account staff";
      if (op === "insert") return `${who} creato`;
      if (op === "delete") return `${who} eliminato`;
      if (changed(d, o, "active")) return d.active ? `${who} riattivato` : `${who} disattivato`;
      return `${who} modificato`;
    }

    case "time_entries":
      if (op === "insert") return d.ended_at ? "Tempo inserito manualmente" : "Timer avviato";
      if (op === "delete") return "Voce tempo eliminata";
      if (changed(d, o, "ended_at") && d.ended_at) return "Timer fermato";
      return "Voce tempo modificata";

    case "time_people":
      if (op === "insert") return "Persona tempi aggiunta";
      if (op === "delete") return "Persona tempi eliminata";
      if (changed(d, o, "is_active")) return d.is_active ? "Persona tempi riattivata" : "Persona tempi disattivata";
      return "Persona tempi modificata";

    case "project_timing":
      return op === "insert" ? "Ore previste salvate" : "Ore previste modificate";

    case "payments":
      return op === "insert" ? "Pagamento dichiarato cliente" : "Pagamento cliente modificato";

    default: {
      const verb = op === "insert" ? "creato" : op === "delete" ? "eliminato" : "modificato";
      return `${entry.table_name} ${verb}`;
    }
  }
}

// A cosa si riferisce l'azione: cantiere, cliente o persona coinvolta.
export function auditEntrySubject(entry: AuditLogEntry, projectNameById: Map<string, string>): string | null {
  const d = (entry.data ?? {}) as Row;
  if (entry.table_name === "projects" && typeof d.client_label === "string") return d.client_label;
  if (typeof d.project_id === "string") {
    const name = projectNameById.get(d.project_id);
    if (name) return name;
  }
  if (typeof d.name === "string") return d.name;
  if (typeof d.display_name === "string") return d.display_name;
  if (typeof d.title === "string") return d.title;
  return null;
}

// Dettaglio utile da mostrare sotto la descrizione (es. il giustificativo).
export function auditEntryNote(entry: AuditLogEntry): string | null {
  const d = (entry.data ?? {}) as Row;
  if (entry.table_name === "project_key_data_unlocks" && typeof d.reason === "string") return d.reason;
  return null;
}
