import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { StatusLightDot } from "@/components/status-light";
import { ProjectTabsNav } from "@/components/project-tabs-nav";
import { formatDate } from "@/lib/utils";

const TAB_SUFFIXES = [
  { suffix: "", label: "Panoramica" },
  { suffix: "/foto", label: "Foto" },
  { suffix: "/documenti", label: "Documenti" },
  { suffix: "/chat", label: "Messaggi" },
  { suffix: "/timing", label: "Timing" },
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

  const tabs = TAB_SUFFIXES.map((tab) => ({
    href: `/staff/${projectId}${tab.suffix}`,
    label: tab.label,
  }));

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
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Disattivato</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Firma contratto: {project.contract_signed_date ? formatDate(project.contract_signed_date) : "—"} · Inizio
          lavori: {project.work_start_date ? formatDate(project.work_start_date) : "—"}
        </p>
      </div>

      <ProjectTabsNav tabs={tabs} />

      {children}
    </div>
  );
}
