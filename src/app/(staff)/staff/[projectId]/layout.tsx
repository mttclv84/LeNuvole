import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { StatusLightDot } from "@/components/status-light";

const TABS = [
  { suffix: "", label: "Panoramica" },
  { suffix: "/foto", label: "Foto" },
  { suffix: "/documenti", label: "Documenti" },
  { suffix: "/chat", label: "Messaggi" },
];

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase } = await getStaffContext();
  const project = await getStaffProject(supabase, projectId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/staff" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Tutti i cantieri
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <StatusLightDot status={project.status_light} />
          <h2 className="text-xl font-semibold">{project.client_label}</h2>
          {project.is_archived && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archiviato</span>
          )}
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.suffix}
            href={`/staff/${projectId}${tab.suffix}`}
            className="rounded-t-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
