import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { WorkTimeline } from "@/components/work-timeline";
import { HouseProgress } from "@/components/house-progress";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORK_ITEM_STATUS_LABEL, computeWorkProgress, type BudgetItem, type Payment, type WorkItem } from "@/lib/types";
import {
  addBudgetItem,
  addWorkItem,
  archiveProject,
  deleteBudgetItem,
  deleteWorkItem,
  reactivateProject,
  toggleBudgetItemStatus,
  updateProjectStatus,
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

  const [{ data: budgetItems }, { data: workItems }, { data: payments }] = await Promise.all([
    supabase.from("budget_items").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("work_items").select("*").eq("project_id", projectId).order("start_date"),
    supabase.from("payments").select("*").eq("project_id", projectId).order("payment_date", { ascending: false }),
  ]);

  const items = (workItems ?? []) as WorkItem[];
  const progress = computeWorkProgress(items);
  const confirmedTotal = ((budgetItems ?? []) as BudgetItem[])
    .filter((i) => i.status === "confirmed")
    .reduce((sum, i) => sum + i.amount, 0);
  const paidTotal = ((payments ?? []) as Payment[]).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Stato lavori</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProjectStatus} className="flex flex-col gap-3">
            <input type="hidden" name="project_id" value={projectId} />
            <div className="flex flex-wrap gap-4">
              {(["green", "orange", "red"] as const).map((light) => (
                <label key={light} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="status_light" value={light} defaultChecked={project.status_light === light} />
                  {light === "green" ? "Verde · tutto ok" : light === "orange" ? "Arancio · in attesa" : "Rosso · fermo"}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status_reason">Motivo (visibile al cliente)</Label>
              <Textarea
                id="status_reason"
                name="status_reason"
                defaultValue={project.status_reason ?? ""}
                placeholder="Es. in attesa di conferma serramenti"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contract_signed_date">Data firma contratto</Label>
                <Input
                  id="contract_signed_date"
                  name="contract_signed_date"
                  type="date"
                  defaultValue={project.contract_signed_date ?? ""}
                  className="w-44"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work_start_date">Data inizio lavori</Label>
                <Input
                  id="work_start_date"
                  name="work_start_date"
                  type="date"
                  defaultValue={project.work_start_date ?? ""}
                  className="w-44"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Salva
              </Button>
            </div>
          </form>

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
          <CardTitle>Voci budget</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={addBudgetItem} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Voce"><Input name="label" required className="w-48" /></Field>
            <Field label="Importo €"><Input name="amount" type="number" step="0.01" required className="w-32" /></Field>
            <Field label="Stato">
              <select name="status" defaultValue="pending" className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                <option value="pending">Da confermare</option>
                <option value="confirmed">Confermata</option>
              </select>
            </Field>
            <Button type="submit" size="sm">Aggiungi</Button>
          </form>

          <ul className="flex flex-col divide-y divide-border">
            {((budgetItems ?? []) as BudgetItem[]).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={toggleBudgetItemStatus}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="status" value={item.status === "confirmed" ? "pending" : "confirmed"} />
                    <button type="submit">
                      <Badge variant={item.status === "confirmed" ? "green" : "orange"}>
                        {item.status === "confirmed" ? "Confermata" : "Da confermare"}
                      </Badge>
                    </button>
                  </form>
                  <DeleteButton action={deleteBudgetItem} id={item.id} projectId={projectId} />
                </div>
              </li>
            ))}
          </ul>
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
          <CardTitle>Storico pagamenti</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-6 rounded-md bg-muted px-4 py-3 text-sm">
            <p>
              Totale confermato <span className="block font-semibold">{formatCurrency(confirmedTotal)}</span>
            </p>
            <p>
              Pagato <span className="block font-semibold text-status-green">{formatCurrency(paidTotal)}</span>
            </p>
            <p>
              Residuo{" "}
              <span
                className={`block font-semibold ${confirmedTotal - paidTotal > 0 ? "text-status-orange" : "text-status-green"}`}
              >
                {formatCurrency(confirmedTotal - paidTotal)}
              </span>
            </p>
          </div>

          {((payments ?? []) as Payment[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">Il cliente non ha ancora registrato pagamenti.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {((payments ?? []) as Payment[]).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Badge variant={p.type === "saldo" ? "accent" : "default"}>
                        {p.type === "saldo" ? "Saldo" : "Acconto"}
                      </Badge>
                      {formatDate(p.payment_date)}
                    </p>
                    {p.comment && <p className="mt-1 text-xs text-muted-foreground">{p.comment}</p>}
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
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
