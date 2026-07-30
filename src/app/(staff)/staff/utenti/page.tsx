import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStaffContext, requireOwner } from "@/lib/data/staff-context";
import type { Profile, Project } from "@/lib/types";
import { CreateAccountForm } from "./create-account-form";
import { toggleActive } from "./actions";

export default async function UtentiPage() {
  const { supabase, profile } = await getStaffContext();
  await requireOwner(profile);

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("display_name"),
    supabase.from("projects").select("*").eq("is_archived", false).order("client_label"),
  ]);

  const all = (profiles ?? []) as Profile[];
  const staffAndOwner = all.filter((p) => p.role !== "client");
  const clients = all.filter((p) => p.role === "client");
  const projectLabelById = new Map(((projects ?? []) as Project[]).map((p) => [p.id, p.client_label]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuovo account</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateAccountForm projects={(projects ?? []) as Project[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Le Nuvole</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList profiles={staffAndOwner} currentProfileId={profile.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clienti ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList profiles={clients} currentProfileId={profile.id} projectLabelById={projectLabelById} />
        </CardContent>
      </Card>
    </div>
  );
}

function UserList({
  profiles,
  currentProfileId,
  projectLabelById,
}: {
  profiles: Profile[];
  currentProfileId: string;
  projectLabelById?: Map<string, string>;
}) {
  if (profiles.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun utente.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {profiles.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-medium">
              {p.display_name}
              {p.id === currentProfileId && <span className="ml-1 text-xs text-muted-foreground">(tu)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.role === "owner" ? "Titolare" : p.role === "staff" ? "Staff" : "Cliente"}
              {projectLabelById && p.project_id && ` · ${projectLabelById.get(p.project_id) ?? ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.active ? "green" : "red"}>{p.active ? "Attivo" : "Disattivato"}</Badge>
            {p.role !== "owner" && p.id !== currentProfileId && (
              <form action={toggleActive}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={(!p.active).toString()} />
                <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                  {p.active ? "Disattiva" : "Riattiva"}
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
