import { LayoutDashboard, Image as ImageIcon, FileText, MessageCircle, Settings } from "lucide-react";
import { AppNav, type NavLink } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { getClientContext } from "@/lib/data/client-context";

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Il mio progetto", icon: LayoutDashboard },
  { href: "/foto", label: "Foto", icon: ImageIcon },
  { href: "/documenti", label: "Documenti", icon: FileText },
  { href: "/chat", label: "Messaggi", icon: MessageCircle },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { project } = await getClientContext();

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <div className="sm:w-56 sm:shrink-0">
        <AppNav links={LINKS} />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader title={project.client_label} subtitle="Stato del tuo progetto" />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
