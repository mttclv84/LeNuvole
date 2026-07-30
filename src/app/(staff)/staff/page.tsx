import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { StatusLightDot } from "@/components/status-light";
import { getStaffContext } from "@/lib/data/staff-context";
import { STATUS_LIGHT_LABEL, type Project } from "@/lib/types";
import { createProject } from "./actions";

export default async function StaffProjectsPage() {
  const { supabase } = await getStaffContext();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("is_archived")
    .order("created_at", { ascending: false });

  const items = (projects ?? []) as Project[];
  const active = items.filter((p) => !p.is_archived);
  const archived = items.filter((p) => p.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuovo cantiere</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client_label">Nome cliente</Label>
              <Input id="client_label" name="client_label" placeholder="es. CASA BIZZOTTO" required className="w-64" />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" /> Crea
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Cantieri attivi
        </h2>
        <ProjectGrid projects={active} />
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Archiviati
          </h2>
          <ProjectGrid projects={archived} />
        </section>
      )}
    </div>
  );
}

function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun cantiere qui.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link key={p.id} href={`/staff/${p.id}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <StatusLightDot status={p.status_light} />
                <p className="font-semibold">{p.client_label}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{STATUS_LIGHT_LABEL[p.status_light]}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
