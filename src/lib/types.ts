// Tipi applicativi allineati allo schema definito in supabase/migrations/0001_init.sql
// Se lo schema cambia, aggiornare questo file di conseguenza.

export type UserRole = "owner" | "staff" | "client";
export type StatusLight = "green" | "orange" | "red";
export type BudgetStatus = "confirmed" | "pending";
export type WorkItemStatus = "planned" | "in_progress" | "postponed" | "cancelled" | "done";
export type MediaType = "photo" | "drawing" | "render";
export type DocumentCategory = "crew" | "manual" | "order_confirmation" | "other";
export type InvoiceStatus = "paid" | "due";
export type NotificationType = "message" | "media" | "document";
export type PaymentType = "acconto" | "saldo";
export type AuditOperation = "insert" | "update" | "delete";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  active: boolean;
  project_id: string | null;
  created_at: string;
  // Campi CRM, popolati solo per i profili cliente (sezione Clienti).
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface Project {
  id: string;
  client_label: string;
  status_light: StatusLight;
  status_reason: string | null;
  // Colonna storica: l'avanzamento non è più inserito a mano, si calcola da
  // computeWorkProgress() sulle lavorazioni previste. Non più letta/scritta.
  progress_percent: number;
  contract_signed_date: string | null;
  work_start_date: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  // Colore assegnato dallo staff, usato per distinguere i clienti nel
  // Gantt multi-cantiere (vedi CLIENT_COLOR_PALETTE).
  color: string;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  label: string;
  amount: number;
  status: BudgetStatus;
  created_at: string;
}

export interface WorkItem {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: WorkItemStatus;
  created_at: string;
}

export interface Media {
  id: string;
  project_id: string;
  type: MediaType;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  category: DocumentCategory;
  title: string;
  storage_path: string;
  requires_signature: boolean;
  signed_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  label: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  storage_path: string | null;
}

export interface Message {
  id: string;
  project_id: string;
  sender_profile_id: string;
  sender_role: UserRole;
  body: string | null;
  attachment_path: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  recipient_profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  type: PaymentType;
  amount: number;
  payment_date: string;
  comment: string | null;
  created_by: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string | null;
  operation: AuditOperation;
  actor_profile_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface StaffReminder {
  id: string;
  project_id: string;
  due_date: string;
  note: string;
  done: boolean;
}

export const STATUS_LIGHT_LABEL: Record<StatusLight, string> = {
  green: "Tutto ok",
  orange: "In attesa di qualcosa",
  red: "Fermo",
};

// Le "lavorazioni previste" alimentano anche la vista "Avanzamento": stessa
// etichetta e stesso colore ovunque venga mostrato uno stato, lato staff e
// lato cliente. "done" ha un trattamento a parte (barrato + badge dedicato,
// vedi work-timeline.tsx e la lista lavorazioni), non un colore.
export const WORK_ITEM_STATUS_LABEL: Record<WorkItemStatus, string> = {
  planned: "Da iniziare",
  in_progress: "In corso",
  postponed: "Posticipo",
  cancelled: "Cancellazione",
  done: "Completata",
};

const WORK_ITEM_STATUS_COLOR: Record<Exclude<WorkItemStatus, "done">, "default" | "green" | "orange" | "red"> = {
  planned: "default",
  in_progress: "green",
  postponed: "orange",
  cancelled: "red",
};

// "done" è sempre verde (completata): niente indicizzazione diretta su
// WORK_ITEM_STATUS_COLOR per evitare la chiave mancante a livello di tipi.
export function workItemStatusColor(status: WorkItemStatus): "default" | "green" | "orange" | "red" {
  if (status === "done") return "green";
  return WORK_ITEM_STATUS_COLOR[status];
}

// Avanzamento cantiere = automatico dalle lavorazioni previste, non più un
// valore inserito a mano: le "Completata" riempiono la percentuale, le "In
// corso" contano anche loro ma in un tono più leggero (lavoro avviato, non
// ancora concluso); Posticipo/Cancellazione/Da iniziare non contribuiscono.
export function computeWorkProgress(items: Pick<WorkItem, "status">[]): {
  donePercent: number;
  inProgressPercent: number;
} {
  const total = items.length;
  if (total === 0) return { donePercent: 0, inProgressPercent: 0 };
  const done = items.filter((i) => i.status === "done").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  return {
    donePercent: Math.round((done / total) * 100),
    inProgressPercent: Math.round((inProgress / total) * 100),
  };
}

// Colori selezionabili dallo staff per un cantiere (task/scheda cliente):
// tonalità sature/fluo, scelte per restare distinguibili a colpo d'occhio
// tra loro anche in un Gantt affollato. Niente giallo/verde/rosso: sono già
// i colori del semaforo di stato (status_light) e delle lavorazioni, non
// devono confondersi con quelli.
export const CLIENT_COLOR_PALETTE = [
  "#FF6D00", // arancio vivo
  "#00E5FF", // ciano fluo
  "#2979FF", // blu elettrico
  "#3D5AFE", // indaco fluo
  "#7C3AED", // viola vivo
  "#AA00FF", // viola magenta
  "#D500F9", // magenta fluo
  "#FF3D7F", // fucsia vivo
  "#F50057", // rosa acceso
] as const;

export const STAFF_DISPLAY_NAME = "Team Le Nuvole";

// "owner" resta il valore a database (RLS, funzioni is_owner/is_staff): qui
// si rinomina solo l'etichetta mostrata in interfaccia.
// owner = Super User (accesso totale, uno solo); staff = lavoro operativo.
// (vedi src/lib/permissions.ts).
export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Super User",
  staff: "Staff",
  client: "Cliente",
};

// ---------------------------------------------------------------------------
// Gestione tempi clienti (vedi supabase/migrations/0010_time_tracking.sql)
// ---------------------------------------------------------------------------

export type TimeArea = "design" | "quoting" | "site";
export type TimeEntrySource = "timer" | "manual";

export const TIME_AREAS: TimeArea[] = ["design", "quoting", "site"];

export const TIME_AREA_LABEL: Record<TimeArea, string> = {
  design: "Progetto",
  quoting: "Preventivazione",
  site: "Cantiere",
};

export interface TimeJob {
  id: string;
  client_name: string;
  title: string;
  opened_on: string;
  notes: string | null;
  est_design_h: number;
  est_quoting_h: number;
  est_site_h: number;
  project_id: string | null;
  is_closed: boolean;
  created_by: string | null;
  created_at: string;
}

// Persona a cui si attribuisce il tempo (Mattia, Federica, Lesly...). Non è
// un account di accesso: gli accessi sono condivisi e la persona si sceglie dal menu.
export interface TimePerson {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  // A chi è attribuito il tempo.
  person_id: string;
  // L'account con cui la voce è stata inserita (null se poi eliminato).
  recorded_by: string | null;
  area: TimeArea;
  started_at: string;
  // null finché il timer è in corso.
  ended_at: string | null;
  minutes: number | null;
  note: string | null;
  source: TimeEntrySource;
  created_at: string;
}
