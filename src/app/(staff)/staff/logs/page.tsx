import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/types";

const TABLE_LABEL: Record<string, string> = {
  projects: "Cantiere",
  budget_items: "Budget",
  work_items: "Lavorazione",
  timeline_steps: "Timeline",
  media: "Foto/Media",
  documents: "Documento",
  payments: "Pagamento",
  profiles: "Utente/Cliente",
  time_entries: "Voce di tempo",
  time_people: "Persona (tempi)",
  project_timing: "Timing cantiere",
};

const OPERATION_LABEL = { insert: "Creato", update: "Modificato", delete: "Eliminato" } as const;
const OPERATION_VARIANT = { insert: "green", update: "accent", delete: "red" } as const;

export default async function LogsPage() {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.viewLogs(profile.role));

  const { data: entries } = await supabase
    .from("audit_log")
    .select("*, actor:profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = AuditLogEntry & { actor: { display_name: string } | null };
  const rows = (entries ?? []) as unknown as Row[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro attività (ultime {rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna attività registrata ancora.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={OPERATION_VARIANT[entry.operation]}>{OPERATION_LABEL[entry.operation]}</Badge>
                  <span className="text-sm font-medium">{TABLE_LABEL[entry.table_name] ?? entry.table_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.actor?.display_name ?? "Sistema"} · {formatDateTime(entry.created_at)}
                  </span>
                </div>
                {entry.data && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-xs text-accent">Dettagli</summary>
                    <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
