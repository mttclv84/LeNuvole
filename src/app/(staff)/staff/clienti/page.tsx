import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleTabs } from "@/components/simple-tabs";
import { getStaffContext } from "@/lib/data/staff-context";
import { withEmails } from "@/lib/data/backfill-emails";
import type { Profile, Project } from "@/lib/types";
import { CreateClientForm } from "./create-client-form";
import { EditClientModal } from "./edit-client-modal";
import { toggleClientActive } from "./actions";

export default async function ClientiPage() {
  const { supabase } = await getStaffContext();

  const [{ data: clientsData }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "client").order("last_name"),
    supabase.from("projects").select("*").eq("is_archived", false).order("client_label"),
  ]);
  const clients = await withEmails((clientsData ?? []) as Profile[]);
  const projectList = (projects ?? []) as Project[];
  const projectLabelById = new Map(projectList.map((p) => [p.id, p.client_label]));

  const registered = clients.filter((c) => !c.project_id);
  const managed = clients.filter((c) => c.project_id);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuovo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClientForm projects={projectList} />
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
                projectLabelById={projectLabelById}
                projects={projectList}
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
                projectLabelById={projectLabelById}
                projects={projectList}
                emptyLabel="Nessun cliente con un cantiere abbinato ancora."
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
  projectLabelById,
  projects,
  emptyLabel,
}: {
  clients: Profile[];
  projectLabelById: Map<string, string>;
  projects: Project[];
  emptyLabel: string;
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
                    Cantiere:{" "}
                    {c.project_id && projectLabelById.get(c.project_id) ? (
                      <span className="text-foreground">{projectLabelById.get(c.project_id)}</span>
                    ) : (
                      "nessuno assegnato"
                    )}
                  </p>
                  {c.notes && <p className="mt-1 text-xs italic text-muted-foreground">{c.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={c.active ? "green" : "red"}>{c.active ? "Attivo" : "Disattivato"}</Badge>
                  <EditClientModal client={c} projects={projects} />
                  <form action={toggleClientActive}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={(!c.active).toString()} />
                    <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                      {c.active ? "Disattiva" : "Riattiva"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
