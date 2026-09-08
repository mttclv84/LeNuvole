import { getStaffContext } from "@/lib/data/staff-context";
import { withEmails } from "@/lib/data/backfill-emails";
import type { Profile, Project } from "@/lib/types";

// Esportazione CSV (non un vero .xlsx) per non introdurre una dipendenza di
// terze parti solo per generare un file Excel: le librerie disponibili per
// scrivere .xlsx (xlsx, exceljs) portano tutte una CVE senza fix o una
// dipendenza transitiva vulnerabile. Il CSV con BOM UTF-8 e separatore ";"
// (quello atteso da Excel in locale italiana) si apre in Excel identico a un
// vero foglio di calcolo.
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// ="..." forza Excel a trattare il valore come testo anche da CSV, cosi'
// non perde lo zero iniziale del telefono trattandolo come un numero.
function csvPhone(value: string): string {
  return csvCell(`="${value}"`);
}

export async function GET() {
  const { supabase } = await getStaffContext();

  const [{ data: clientsData }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "client").order("last_name"),
    supabase.from("projects").select("*"),
  ]);
  const clients = await withEmails((clientsData ?? []) as Profile[]);
  const projectLabelById = new Map(((projects ?? []) as Project[]).map((p) => [p.id, p.client_label]));

  const header = ["Nome", "Email", "Telefono", "Indirizzo", "Cantiere", "Stato", "Note"];
  const rows = clients.map((c) => [
    csvCell(c.display_name ?? ""),
    csvCell(c.email ?? ""),
    c.phone ? csvPhone(c.phone) : csvCell(""),
    csvCell(c.address ?? ""),
    csvCell((c.project_id && projectLabelById.get(c.project_id)) || ""),
    csvCell(c.active ? "Attivo" : "Disattivato"),
    csvCell(c.notes ?? ""),
  ]);

  const csv = [header.map(csvCell).join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  const BOM = String.fromCharCode(0xfeff);
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clienti-le-nuvole-${date}.csv"`,
    },
  });
}
