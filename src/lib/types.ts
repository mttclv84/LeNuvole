// Tipi applicativi allineati allo schema definito in supabase/migrations/0001_init.sql
// Se lo schema cambia, aggiornare questo file di conseguenza.

export type UserRole = "owner" | "staff" | "client";
export type StatusLight = "green" | "orange" | "red";
export type BudgetStatus = "confirmed" | "pending";
export type WorkItemStatus = "planned" | "in_progress" | "done";
export type TimelineStepStatus = "done" | "in_progress" | "upcoming";
export type MediaType = "photo" | "drawing" | "render";
export type DocumentCategory = "crew" | "manual" | "order_confirmation" | "other";
export type InvoiceStatus = "paid" | "due";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  active: boolean;
  project_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  client_label: string;
  status_light: StatusLight;
  status_reason: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
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
  week_start_date: string;
  status: WorkItemStatus;
  created_at: string;
}

export interface TimelineStep {
  id: string;
  project_id: string;
  label: string;
  order_index: number;
  status: TimelineStepStatus;
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

export const STAFF_DISPLAY_NAME = "Team Le Nuvole";
