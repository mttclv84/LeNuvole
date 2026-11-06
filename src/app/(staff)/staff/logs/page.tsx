import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { auditEntryNote, auditEntrySubject, describeAuditEntry } from "@/lib/audit";
import type { AuditLogEntry, Profile } from "@/lib/types";

// Registro di tutte le azioni sulla piattaforma: sempre e solo le ultime 50,
// filtrabili per giorno e per utenza.
const LIMIT = 50;

const OPERATION_VARIANT = { insert: "green", update: "accent", delete: "red" } as const;

// Inizio e fine di un giorno (YYYY-MM-DD) secondo l'ora italiana, in ISO.
function italianDayRange(day: string) {
  const offsetAt = (iso: string) => {
    // Differenza tra ora italiana e UTC in quel momento (gestisce l'ora legale).
    const d = new Date(iso);
    const rome = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return rome.getTime() - utc.getTime();
  };
  const startUtc = new Date(`${day}T00:00:00Z`);
  const start = new Date(startUtc.getTime() - offsetAt(startUtc.toISOString()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string; utenza?: string }>;
}) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.viewLogs(profile.role));

  const { giorno, utenza } = await searchParams;
  const day = giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : "";
  const userId = utenza && /^[0-9a-f-]{36}$/i.test(utenza) ? utenza : "";

  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(LIMIT);
  if (day) {
    const { from, to } = italianDayRange(day);
    query = query.gte("created_at", from).lt("created_at", to);
  }
  if (userId) query = query.eq("actor_profile_id", userId);

  const [{ data: entries }, { data: profiles }, { data: projects }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, display_name, role, email").order("display_name"),
    supabase.from("projects").select("id, client_label"),
  ]);

  const rows = (entries ?? []) as AuditLogEntry[];
  const users = (profiles ?? []) as Pick<Profile, "id" | "display_name" | "role" | "email">[];
  const userById = new Map(users.map((u) => [u.id, u]));
  const projectNameById = new Map(
    ((projects ?? []) as { id: string; client_label: string }[]).map((p) => [p.id, p.client_label]),
  );
  const staffUsers = users.filter((u) => u.role !== "client");
  const clientUsers = users.filter((u) => u.role === "client");
  const filtered = Boolean(day || userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro attività (ultime {LIMIT})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="giorno">Giorno</Label>
            <Input id="giorno" name="giorno" type="date" defaultValue={day} className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="utenza">Utenza</Label>
            <select
              id="utenza"
              name="utenza"
              defaultValue={userId}
              className="h-10 w-60 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">Tutte</option>
              <optgroup label="Staff">
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                    {u.email ? ` (${u.email})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Clienti">
                {clientUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <Button type="submit" size="sm">
            Filtra
          </Button>
          {filtered && (
            <Link href="/staff/logs" className="text-sm text-accent hover:underline">
              Togli filtri
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filtered ? "Nessuna azione con questi filtri." : "Nessuna attività registrata ancora."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((entry) => {
              const actor = entry.actor_profile_id ? userById.get(entry.actor_profile_id) : undefined;
              const subject = auditEntrySubject(entry, projectNameById);
              const note = auditEntryNote(entry);
              return (
                <li key={entry.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={OPERATION_VARIANT[entry.operation]}>{describeAuditEntry(entry)}</Badge>
                    {subject && <span className="text-sm font-medium">{subject}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)} · {actor?.display_name ?? "Sistema"}
                    {actor?.role === "client" && " (cliente)"}
                  </p>
                  {note && <p className="text-xs italic text-muted-foreground">&ldquo;{note}&rdquo;</p>}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
