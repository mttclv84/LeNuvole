import { LayoutDashboard, Image as ImageIcon, FileText, MessageCircle, Settings } from "lucide-react";
import type { NavLink } from "@/components/app-nav";
import { ClientAppNav } from "@/components/client-app-nav";
import { AppHeader } from "@/components/app-header";
import { NotificationBell } from "@/components/notification-bell";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { getClientContext } from "@/lib/data/client-context";
import type { Notification } from "@/lib/types";
import { selectClientProject } from "./actions";

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Il mio progetto", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/foto", label: "Foto", icon: <ImageIcon className="h-4 w-4" /> },
  { href: "/documenti", label: "Documenti", icon: <FileText className="h-4 w-4" /> },
  { href: "/chat", label: "Messaggi", icon: <MessageCircle className="h-4 w-4" /> },
  { href: "/impostazioni", label: "Impostazioni", icon: <Settings className="h-4 w-4" /> },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, project, projects } = await getClientContext();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const notificationList = (notifications ?? []) as Notification[];

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <div className="sm:w-56 sm:shrink-0">
        <ClientAppNav links={LINKS} profileId={profile.id} initialNotifications={notificationList} />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader
          title={project.client_label}
          subtitle="Stato del tuo progetto"
          actions={<NotificationBell profileId={profile.id} initialNotifications={notificationList} />}
        />
        {projects.length > 1 && (
          // Più cantieri: si sceglie quale consultare, il resto del portale segue.
          <form action={selectClientProject} className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 sm:px-6">
            <label htmlFor="client_project_switch" className="text-sm text-muted-foreground">
              Cantiere
            </label>
            <AutoSubmitSelect
              key={project.id}
              id="client_project_switch"
              name="project_id"
              defaultValue={project.id}
              options={projects.map((p) => ({ value: p.id, label: p.is_archived ? `${p.client_label} (concluso)` : p.client_label }))}
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2 text-sm sm:max-w-xs"
            />
          </form>
        )}
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
