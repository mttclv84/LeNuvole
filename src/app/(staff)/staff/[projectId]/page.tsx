import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { WorkTimeline } from "@/components/work-timeline";
import { HouseProgress } from "@/components/house-progress";
import { LiveRefresh } from "@/components/live-refresh";
import { ClientWallet, PaymentsHistory } from "@/components/client-wallet";
import { ProjectStatusForm } from "./project-status-form";
import { ProjectKeyDataForm } from "./project-key-data-form";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { formatDate } from "@/lib/utils";
import {
  BUDGET_KIND_LABEL,
  WORK_ITEM_STATUS_LABEL,
  computeWorkProgress,
  type BudgetItem,
  type BudgetKind,
  type Profile,
  type ProjectKeyDataUnlock,
  type WorkItem,
} from "@/lib/types";
import {
  addBudgetItem,
  addWorkItem,
  archiveProject,
  deleteBudgetItem,
  deleteWorkItem,
  reactivateProject,
  setInvoicePaid,
  updateWorkItemStatus,
} from "../actions";

// Sfondi leggeri nel menu a tendina, per riconoscere lo stato a colpo
// d'occhio senza dover aprire la scheda del cliente.
const WORK_STATUS_OPTION_COLOR: Partial<Record<WorkItem["status"], string>> = {
  in_progress: "#e2f2e9",
  postponed: "#fbf1e2",
  cancelled: "#fee6e6",
};

const WORK_STATUS_OPTIONS = (Object.keys(WORK_ITEM_STATUS_LABEL) as WorkItem["status"][]).map((value) => ({
  value,
  label: WORK_ITEM_STATUS_LABEL[value],
  optionColor: WORK_STATUS_OPTION_COLOR[value],
}));

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase } = await getStaffContext();
  const project = await getStaffProject(supabase, projectId);

  const [{ data: budgetItems }, { data: workItems }, { data: clients }, { data: unlocksData }, { data: staffData }] =
    await Promise.all([
      supabase.from("budget_items").select("*").eq("project_id", projectId).order("created_at"),
      supabase.from("work_items").select("*").eq("project_id", projectId).order("start_date"),
      supabase.from("profiles").select("id, display_name, active").eq("role", "client").order("display_name"),
      supabase
        .from("project_key_data_unlocks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name").in("role", ["owner", "staff"]),
    ]);
  const staffNameById = new Map(((staffData ?? []) as Pick<Profile, "id" | "display_name">[]).map((p) => [p.id, p.display_name]));
  const unlocks = ((unlocksData ?? []) as ProjectKeyDataUnlock[]).map((u) => ({
    ...u,
    unlocked_by_name: u.unlocked_by ? (staffNameById.get(u.unlocked_by) ?? null) : null,
  }));
  const wallet = (budgetItems ?? []) as BudgetItem[];
  // Nel menu: clienti attivi, più quello attuale anche se disattivato.
  const clientOptions = ((clients ?? []) as Pick<Profile, "id" | "display_name" | "active">[]).filter(
    (c) => c.active || c.id === project.client_id,
  );

  const items = (workItems ?? []) as WorkItem[];
  const progress = computeWorkProgress(items);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel={`staff-project-${projectId}`}
        subscriptions={[
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "work_items", filter: `project_id=eq.${projectId}` },
          { table: "budget_items", filter: `project_id=eq.${projectId}` },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Stato lavori</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectStatusForm project={project} projectId={projectId} clients={clientOptions} />

          <div className="mt-4 border-t border-border pt-4">
            {!project.is_archived ? (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  Alla disattivazione: la chat resta consultabile, viene creato in automatico un promemoria
                  interno per ricontattare il cliente tra 4-6 mesi.
                </p>
                <ConfirmWordDialog
                  triggerLabel="Disattiva cantiere"
                  triggerClassName="inline-flex h-8 items-center rounded-md border border-status-red px-3 text-xs font-medium text-status-red hover:bg-status-red/10"
                  title="Disattiva cantiere"
                  description="Il cantiere passerà tra i disattivati: resta consultabile ma non compare più tra quelli attivi."
                  word="DISATTIVAZIONE"
                  action={archiveProject}
                  hiddenFields={{ project_id: projectId }}
                />
              </>
            ) : (
              <form action={reactivateProject}>
                <input type="hidden" name="project_id" value={projectId} />
                <Button type="submit" variant="outline" size="sm">
                  Riattiva cantiere
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dati contrattuali</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectKeyDataForm project={project} unlocks={unlocks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lavorazioni previste</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={addWorkItem} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Lavorazione"><Input name="title" required className="w-48" /></Field>
            <Field label="Data inizio"><Input name="start_date" type="date" required className="w-40" /></Field>
            <Field label="Data fine"><Input name="end_date" type="date" required className="w-40" /></Field>
            <Button type="submit" size="sm">Aggiungi</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Le date inserite qui generano in automatico la sezione &quot;Avanzamento&quot; qui sotto, in ordine
            cronologico.
          </p>

          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.start_date)}
                    {item.end_date && ` – ${formatDate(item.end_date)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateWorkItemStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <AutoSubmitSelect key={item.status} name="status" defaultValue={item.status} options={WORK_STATUS_OPTIONS} />
                  </form>
                  <DeleteButton action={deleteWorkItem} id={item.id} projectId={projectId} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Avanzamento</CardTitle>
          <HouseProgress donePercent={progress.donePercent} inProgressPercent={progress.inProgressPercent} />
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Calcolato in automatico dalle lavorazioni: le &quot;Completata&quot; contano per intero, le &quot;In
            corso&quot; contano ma in tono più chiaro (avviate, non ancora concluse).
          </p>
          <WorkTimeline items={items} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portafoglio cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form action={addBudgetItem} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Tipo">
              <select
                name="kind"
                defaultValue="conferma_ordine"
                className="h-10 rounded-md border border-border bg-card px-3 text-sm"
              >
                {(Object.keys(BUDGET_KIND_LABEL) as BudgetKind[]).map((k) => (
                  <option key={k} value={k}>
                    {BUDGET_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrizione (facoltativa)"><Input name="label" className="w-48" /></Field>
            <Field label="Importo €"><Input name="amount" type="number" step="0.01" min="0.01" required className="w-32" /></Field>
            <Button type="submit" size="sm">Aggiungi</Button>
          </form>
          <p className="-mt-2 text-xs text-muted-foreground">
            La conferma d&apos;ordine è il totale che il cliente deve pagare. Le fatture compaiono &quot;da saldare&quot;:
            con l&apos;icona dei soldi diventano &quot;SALDATA&quot; con la data di oggi ed entrano nello storico. Il
            cliente vede tutto, senza poter modificare.
          </p>
          <ClientWallet items={wallet} staff={{ projectId, setInvoicePaid, deleteItem: deleteBudgetItem }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico pagamenti</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsHistory items={wallet} emptyLabel="Nessuna fattura saldata ancora." />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DeleteButton({
  action,
  id,
  projectId,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  projectId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="project_id" value={projectId} />
      <button type="submit" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-status-red" aria-label="Elimina">
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
