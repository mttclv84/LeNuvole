import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStaffContext, requireOwner } from "@/lib/data/staff-context";
import { withEmails } from "@/lib/data/backfill-emails";
import { ROLE_LABEL, type Profile } from "@/lib/types";
import { CreateAccountForm } from "./create-account-form";
import { EditAccountModal } from "./edit-account-modal";
import { toggleActive } from "./actions";

export default async function UtentiPage() {
  const { supabase, profile } = await getStaffContext();
  await requireOwner(profile);

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["owner", "staff"])
    .order("role")
    .order("display_name");
  const profiles = await withEmails((data ?? []) as Profile[]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Qui si registra chi può accedere al pannello Le Nuvole e con che livello di autorizzazione. Per
        l&apos;anagrafica clienti vai su &quot;Clienti&quot;.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo account</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateAccountForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Le Nuvole</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList profiles={profiles} currentProfileId={profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function UserList({ profiles, currentProfileId }: { profiles: Profile[]; currentProfileId: string }) {
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
              {ROLE_LABEL[p.role]}
              {p.email && ` · ${p.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.active ? "green" : "red"}>{p.active ? "Attivo" : "Disattivato"}</Badge>
            <EditAccountModal account={p} />
            {p.id !== currentProfileId && (
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
