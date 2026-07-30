import { redirect } from "next/navigation";

// Se arriviamo qui l'utente non è autenticato: il proxy (src/proxy.ts)
// intercetta e redirige già chi ha una sessione valida verso la propria home.
export default function RootPage() {
  redirect("/login");
}
