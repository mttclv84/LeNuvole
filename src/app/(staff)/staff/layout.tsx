import { BarChart3, Building2, CalendarClock, ScrollText, Timer, UserCog, Users } from "lucide-react";
import { AppNav, type NavLink } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/types";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getStaffContext();

  const links: NavLink[] = [
    { href: "/staff/clienti", label: "Clienti", icon: <Users className="h-4 w-4" /> },
    { href: "/staff", label: "Cantieri", icon: <Building2 className="h-4 w-4" />, emphasis: true },
    { href: "/staff/management-cantieri", label: "Management Cantieri", icon: <CalendarClock className="h-4 w-4" /> },
    { href: "/staff/tempi", label: "Tempi", icon: <Timer className="h-4 w-4" /> },
    { href: "/staff/monitor", label: "Monitor", icon: <BarChart3 className="h-4 w-4" /> },
  ];
  const canSeeUsers = permissions.accessUsersPage(profile.role);
  if (canSeeUsers) {
    links.push({ href: "/staff/utenti", label: "Utenti", icon: <UserCog className="h-4 w-4" />, separatorBefore: true });
  }
  if (permissions.viewLogs(profile.role)) {
    links.push({
      href: "/staff/logs",
      label: "Logs",
      icon: <ScrollText className="h-4 w-4" />,
      separatorBefore: !canSeeUsers,
    });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <div className="sm:w-56 sm:shrink-0">
        <AppNav links={links} />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader title="Pannello Le Nuvole" subtitle={`${profile.display_name} · ${ROLE_LABEL[profile.role]}`} />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
