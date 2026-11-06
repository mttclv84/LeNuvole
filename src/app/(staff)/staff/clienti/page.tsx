import { Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleTabs } from "@/components/simple-tabs";
import { LiveRefresh } from "@/components/live-refresh";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { withEmails } from "@/lib/data/backfill-emails";
import type { Profile, Project } from "@/lib/types";
import { CreateClientForm } from "./create-client-form";
import { EditClientModal } from "./edit-client-modal";
import { deleteClientPermanently, toggleClientActive } from "./actions";

export default async function ClientiPage() {
  const { supabase, profile } = await getStaffContext();
  const canDeleteForever = permissions.deleteForever(profile.role);

  const [{ data: clientsData }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "client").order("last_name"),
    supabase.from("projects").select("*").order("client_label"),
  ]);
  const clients = await withEmails((clientsData ?? []) as Profile[]);
  const projectList = (projects ?? []) as Project[];

  // Un cliente può avere più cantieri, un cantiere ha un solo cliente.
  const projectLabelsByClient = new Map<string, string[]>();
  for (const p of projectList) {
    if (!p.client_id) continue;
    projectLabelsByClient.set(p.client_id, [...(projectLabelsByClient.get(p.client_id) ?? []), p.client_label]);
  }

  const active = clients.filter((c) => c.active);
  const registered = active.filter((c) => !projectLabelsByClient.has(c.id));
  const managed = active.filter((c) => projectLabelsByClient.has(c.id));
  const deactivated = clients.filter((c) => !c.active);

  // Nel modulo "Nuovo cliente" si può abbinare subito un cantiere ancora senza cliente.
  const unassignedProjects = projectList.filter((p) => !p.client_id && !p.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel="staff-clienti"
        subscriptions={[{ table: "profiles", filter: "role=eq.client" }, { table: "projects" }]}
      />
      <div className="flex justify-end">
        <a
          href="/staff/clienti/export"
          download
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-xs font-medium hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Esporta Excel
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClientForm projects={unassignedProjects} />
        </CardContent>
      </Card>

      <SimpleTabs
        tabs={[
          {
            key: "registrati",
            label: `Registrati (${registered.length})`,
            content: (
              <ClientList
                clients={registered}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente registrato senza cantiere."
              />
            ),
          },
          {
            key: "gestiti",
            label: `Gestiti (${managed.length})`,
            content: (
              <ClientList
                clients={managed}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente con un cantiere abbinato ancora."
              />
            ),
          },
          {
            key: "disattivati",
            label: `Disattivati (${deactivated.length})`,
            labelClassName: "ml-6 sm:ml-12 text-status-red",
            content: (
              <ClientList
                clients={deactivated}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente disattivato."
                showDelete={canDeleteForever}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function ClientList({
  clients,
  projectLabelsByClient,
  emptyLabel,
  showDelete,
}: {
  clients: Profile[];
  projectLabelsByClient: Map<string, string[]>;
  emptyLabel: string;
  showDelete?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {clients.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{c.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.email}
                    {c.phone && ` · ${c.phone}`}
                  </p>
                  {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(projectLabelsByClient.get(c.id)?.length ?? 0) > 1 ? "Cantieri" : "Cantiere"}:{" "}
                    {projectLabelsByClient.has(c.id) ? (
                      <span className="text-foreground">{projectLabelsByClient.get(c.id)!.join(", ")}</span>
                    ) : (
                      "nessuno assegnato"
                    )}
                  </p>
                  {c.notes && <p className="mt-1 text-xs italic text-muted-foreground">{c.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={c.active ? "green" : "red"}>{c.active ? "Attivo" : "Disattivato"}</Badge>
                  <EditClientModal client={c} />
                  <form action={toggleClientActive}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={(!c.active).toString()} />
                    <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                      {c.active ? "Disattiva" : "Riattiva"}
                    </button>
                  </form>
                  {showDelete && !c.active && (
                    <ConfirmWordDialog
                      triggerLabel={<Trash2 className="h-4 w-4" />}
                      triggerAriaLabel="Elimina definitivamente"
                      triggerClassName="flex h-7 w-7 items-center justify-center rounded-md border border-status-red text-status-red hover:bg-status-red/10"
                      title="Elimina definitivamente"
                      description={`Il cliente "${c.display_name}" verrà eliminato per sempre: account di accesso, anagrafica, messaggi in chat e pagamenti dichiarati. I suoi cantieri restano, senza cliente abbinato. L'operazione non è reversibile.`}
                      word="ELIMINA DEFINITIVAMENTE"
                      action={deleteClientPermanently}
                      hiddenFields={{ id: c.id }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
