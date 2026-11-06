import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditOperation } from "@/lib/types";
import type { AuditEvent } from "@/lib/audit";

/**
 * Registra nel Logs un'azione che il database non vede con l'utenza giusta:
 * operazioni fatte con la chiave di servizio (clienti, account) e eventi di
 * accesso (login, uscita, cambio password). Va chiamata con il client
 * dell'utente (non quello admin), così l'azione risulta a suo nome.
 * Best effort: un errore del registro non blocca mai l'azione.
 */
export async function logEvent(
  supabase: SupabaseClient,
  event: AuditEvent,
  options: { table?: string; recordId?: string | null; operation?: AuditOperation; data?: Record<string, unknown> } = {},
) {
  try {
    await supabase.rpc("log_event", {
      p_table: options.table ?? "auth",
      p_record_id: options.recordId ?? null,
      p_operation: options.operation ?? "insert",
      p_data: { event, ...options.data },
    });
  } catch {
    // Il registro non deve mai far fallire l'azione principale.
  }
}
