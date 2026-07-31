import { Building2, Users } from "lucide-react";
import { AppNav, type NavLink } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { getStaffContext } from "@/lib/data/staff-context";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getStaffContext();

  const links: NavLink[] = [{ href: "/staff", label: "Cantieri", icon: <Building2 className="h-4 w-4" /> }];
  if (profile.role === "owner") {
    links.push({ href: "/staff/utenti", label: "Utenti", icon: <Users className="h-4 w-4" /> });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <div className="sm:w-56 sm:shrink-0">
        <AppNav links={links} />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader title="Pannello Le Nuvole" subtitle={`${profile.display_name} · ${profile.role === "owner" ? "Titolare" : "Staff"}`} />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
