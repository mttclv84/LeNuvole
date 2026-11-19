import { ChevronRight, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleTabs } from "@/components/simple-tabs";
import { LiveRefresh } from "@/components/live-refresh";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { DeactivateClientDialog } from "@/components/deactivate-client-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { withEmails } from "@/lib/data/backfill-emails";
import { LEAD_SOURCE_LABEL, type Profile, type Project, type Quote } from "@/lib/types";
import { CreateClientForm } from "./create-client-form";
import { EditClientModal } from "./edit-client-modal";
import { deleteClientPermanently, toggleClientActive } from "./actions";

export default async function ClientiPage() {
  const { supabase, profile } = await getStaffContext();
  const canDeleteForever = permissions.deleteForever(profile.role);

  const [{ data: clientsData }, { data: projects }, { data: staffData }, { data: quotesData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "client").order("last_name"),
    supabase.from("projects").select("*").order("client_label"),
    supabase.from("profiles").select("id, display_name").neq("role", "client"),
    supabase.from("quotes").select("*").eq("status", "rejected").order("created_at", { ascending: false }),
  ]);
  // Nome di chi ha registrato ogni cliente (solo account staff).
  const staffNameById = new Map(((staffData ?? []) as Pick<Profile, "id" | "display_name">[]).map((s) => [s.id, s.display_name]));
  const rejectedQuotes = ((quotesData ?? []) as Quote[]).map((q) => ({ ...q, amount: Number(q.amount) }));
  const clients = await withEmails((clientsData ?? []) as Profile[]);
  const projectList = (projects ?? []) as Project[];

  // Un cliente può avere più cantieri, un cantiere ha un solo cliente.
  const projectLabelsByClient = new Map<string, string[]>();
  for (const p of projectList) {
    if (!p.client_id) continue;
    projectLabelsByClient.set(p.client_id, [...(projectLabelsByClient.get(p.client_id) ?? []), p.client_label]);
  }

  const active = clients.filter((c) => c.active);
  const registered = active.filter((c) => !projectLabelsByClient.has(c.id));
  const managed = active.filter((c) => projectLabelsByClient.has(c.id));
  const deactivated = clients.filter((c) => !c.active);

  // Nel modulo "Nuovo cliente" si può abbinare subito un cantiere ancora senza cliente.
  const unassignedProjects = projectList.filter((p) => !p.client_id && !p.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel="staff-clienti"
        subscriptions={[{ table: "profiles", filter: "role=eq.client" }, { table: "projects" }]}
      />
      <div className="flex justify-end">
        <a
          href="/staff/clienti/export"
          download
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-xs font-medium hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Esporta Excel
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClientForm projects={unassignedProjects} />
        </CardContent>
      </Card>

      <SimpleTabs
        tabs={[
          {
            key: "gestiti",
            label: `Attivi (${managed.length})`,
            // Sfondo verde fisso, testo bianco.
            labelClassName: "raised bg-status-green text-white hover:bg-status-green hover:text-white",
            content: (
              <ClientList
                clients={managed}
                staffNameById={staffNameById}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente con un cantiere abbinato ancora."
              />
            ),
          },
          {
            key: "registrati",
            label: `Registrati (${registered.length})`,
            content: (
              <ClientList
                clients={registered}
                staffNameById={staffNameById}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente registrato senza cantiere."
              />
            ),
          },
          {
            key: "disattivati",
            label: `Disattivati (${deactivated.length})`,
            labelClassName: "ml-6 sm:ml-12 text-status-red",
            content: (
              <ClientList
                header={<RejectedQuotesSummary quotes={rejectedQuotes} />}
                clients={deactivated}
                staffNameById={staffNameById}
                projectLabelsByClient={projectLabelsByClient}
                emptyLabel="Nessun cliente disattivato."
                showDelete={canDeleteForever}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

// Riepilogo apribile dei preventivi non accettati, in cima ai Disattivati:
// chiuso mostra subito numero e valore totale, aperto il dettaglio.
function RejectedQuotesSummary({ quotes }: { quotes: Quote[] }) {
  const total = quotes.reduce((s, q) => s + q.amount, 0);
  return (
    <details className="group mb-4 rounded-md border border-border bg-muted/50 open:bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-medium">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          Preventivi non accettati
          <span className="text-xs font-normal text-muted-foreground">({quotes.length})</span>
        </span>
        <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
      </summary>
      <div className="border-t border-border px-4 py-3">
        {quotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nessuno ancora: si registrano dal popup &quot;Disattiva&quot; di un cliente.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {quotes.map((q) => (
              <li key={q.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">
                    <span className="font-medium">{q.subject}</span>
                    <span className="text-muted-foreground"> · {q.client_name}</span>
                  </p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(q.amount)}</span>
                </div>
                {q.reason && <p className="text-xs text-status-red">Motivo: {q.reason}</p>}
                <p className="text-[10px] text-muted-foreground">{formatDate(q.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function ClientList({
  header,
  clients,
  staffNameById,
  projectLabelsByClient,
  emptyLabel,
  showDelete,
}: {
  header?: React.ReactNode;
  clients: Profile[];
  staffNameById: Map<string, string>;
  projectLabelsByClient: Map<string, string[]>;
  emptyLabel: string;
  showDelete?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        {header}
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {clients.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{c.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.email}
                    {c.phone && ` · ${c.phone}`}
                  </p>
                  {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                  <p className="text-xs text-muted-foreground">
                    Aggancio:{" "}
                    {c.lead_source ? (
                      <span className="text-foreground">{LEAD_SOURCE_LABEL[c.lead_source]}</span>
                    ) : (
                      <span className="italic">da indicare</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(projectLabelsByClient.get(c.id)?.length ?? 0) > 1 ? "Cantieri" : "Cantiere"}:{" "}
                    {projectLabelsByClient.has(c.id) ? (
                      <span className="text-foreground">{projectLabelsByClient.get(c.id)!.join(", ")}</span>
                    ) : (
                      "nessuno assegnato"
                    )}
                  </p>
                  {c.notes && <p className="mt-1 text-xs italic text-muted-foreground">{c.notes}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    Registrato il {formatDate(c.created_at)}
                    {c.created_by && staffNameById.has(c.created_by) && ` da ${staffNameById.get(c.created_by)}`}
                  </p>
                  {!c.active && c.deactivation_reason && (
                    <p className="mt-1 text-xs text-status-red">
                      Disattivato{c.deactivated_at && ` il ${formatDate(c.deactivated_at)}`}: {c.deactivation_reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={c.active ? "green" : "red"}>{c.active ? "Attivo" : "Disattivato"}</Badge>
                  <EditClientModal client={c} />
                  {c.active ? (
                    <DeactivateClientDialog clientId={c.id} clientName={c.display_name} action={toggleClientActive} />
                  ) : (
                    <form action={toggleClientActive}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value="true" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                        Riattiva
                      </button>
                    </form>
                  )}
                  {showDelete && !c.active && (
                    <ConfirmWordDialog
                      triggerLabel={<Trash2 className="h-4 w-4" />}
                      triggerAriaLabel="Elimina definitivamente"
                      triggerClassName="flex h-7 w-7 items-center justify-center rounded-md border border-status-red text-status-red hover:bg-status-red/10"
                      title="Elimina definitivamente"
                      description={`Il cliente "${c.display_name}" verrà eliminato per sempre: account di accesso, anagrafica, messaggi in chat e pagamenti dichiarati. I suoi cantieri restano, senza cliente abbinato. L'operazione non è reversibile.`}
                      word="ELIMINA DEFINITIVAMENTE"
                      action={deleteClientPermanently}
                      hiddenFields={{ id: c.id }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
