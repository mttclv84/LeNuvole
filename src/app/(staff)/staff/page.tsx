import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { StatusLightDot } from "@/components/status-light";
import { LiveRefresh } from "@/components/live-refresh";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { SimpleTabs } from "@/components/simple-tabs";
import { getStaffContext } from "@/lib/data/staff-context";
import { formatDate } from "@/lib/utils";
import { STATUS_LIGHT_LABEL, type Profile, type Project } from "@/lib/types";
import { archiveProject, createProject, deleteProjectPermanently } from "./actions";

export default async function StaffProjectsPage() {
  const { supabase } = await getStaffContext();

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "client"),
  ]);

  const items = (projects ?? []) as Project[];
  const active = items.filter((p) => !p.is_archived);
  const archived = items.filter((p) => p.is_archived);
  const allClients = (clients ?? []) as Profile[];
  const unassignedClients = allClients.filter((c) => !c.project_id);
  const clientNameByProjectId = new Map(
    allClients.filter((c) => c.project_id).map((c) => [c.project_id as string, c.display_name]),
  );

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel="staff-cantieri"
        subscriptions={[{ table: "projects" }, { table: "profiles", filter: "role=eq.client" }]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Nuovo cantiere</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client_label">Nome cantiere</Label>
              <Input id="client_label" name="client_label" placeholder="es. CASA BIZZOTTO" required className="w-56" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client_id">Nome cliente</Label>
              <select
                id="client_id"
                name="client_id"
                required
                className="h-10 w-56 rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="">Seleziona…</option>
                {unassignedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract_signed_date">Data firma contratto</Label>
              <Input id="contract_signed_date" name="contract_signed_date" type="date" className="w-44" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="work_start_date">Data inizio lavori</Label>
              <Input id="work_start_date" name="work_start_date" type="date" className="w-44" />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" /> Crea
            </Button>
          </form>
          {unassignedClients.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Nessun cliente registrato disponibile: registrane uno da &quot;Clienti&quot; prima di creare il cantiere.
            </p>
          )}
        </CardContent>
      </Card>

      <SimpleTabs
        tabs={[
          {
            key: "attivi",
            label: `Attivi (${active.length})`,
            content: <ProjectGrid projects={active} clientNameByProjectId={clientNameByProjectId} showDeactivate />,
          },
          {
            key: "disattivati",
            label: `Disattivati (${archived.length})`,
            content: <ProjectGrid projects={archived} clientNameByProjectId={clientNameByProjectId} showDelete />,
          },
        ]}
      />
    </div>
  );
}

function ProjectGrid({
  projects,
  clientNameByProjectId,
  showDeactivate,
  showDelete,
}: {
  projects: Project[];
  clientNameByProjectId: Map<string, string>;
  showDeactivate?: boolean;
  showDelete?: boolean;
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun cantiere qui.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const clientName = clientNameByProjectId.get(p.id);
        const card = (
          <Card className="flex h-full flex-1 flex-col">
            <Link href={`/staff/${p.id}`} className="flex-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <StatusLightDot status={p.status_light} />
                  <p className="font-semibold">{p.client_label}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{STATUS_LIGHT_LABEL[p.status_light]}</p>
                <p className="mt-2 text-sm">
                  {clientName ?? <span className="italic text-muted-foreground">Cliente da aggiungere</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Firma: {p.contract_signed_date ? formatDate(p.contract_signed_date) : "—"} · Inizio:{" "}
                  {p.work_start_date ? formatDate(p.work_start_date) : "—"}
                </p>
              </CardContent>
            </Link>
            {showDeactivate && (
              <div className="border-t border-border p-3">
                <ConfirmWordDialog
                  triggerLabel="Disattiva"
                  triggerClassName="text-xs font-medium text-status-red hover:underline"
                  title="Disattiva cantiere"
                  description={`Il cantiere "${p.client_label}" passerà tra i disattivati: resta consultabile ma non compare più tra quelli attivi.`}
                  word="DISATTIVAZIONE"
                  action={archiveProject}
                  hiddenFields={{ project_id: p.id }}
                />
              </div>
            )}
          </Card>
        );

        if (!showDelete) {
          return <div key={p.id}>{card}</div>;
        }

        return (
          <div key={p.id} className="flex items-start gap-2">
            {card}
            <ConfirmWordDialog
              triggerLabel={<Trash2 className="h-4 w-4" />}
              triggerAriaLabel="Cancella definitivamente"
              triggerClassName="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-status-red text-status-red hover:bg-status-red/10"
              title="Cancella definitivamente"
              description={`Il cantiere "${p.client_label}" e tutti i suoi dati (budget, foto, documenti, pagamenti, chat) verranno eliminati per sempre. L'operazione non è reversibile.`}
              word="CANCELLA DEFINITIVAMENTE"
              action={deleteProjectPermanently}
              hiddenFields={{ project_id: p.id }}
            />
          </div>
        );
      })}
    </div>
  );
}
