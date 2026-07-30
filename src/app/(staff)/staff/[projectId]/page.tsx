import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetItem, TimelineStep, WorkItem } from "@/lib/types";
import {
  addBudgetItem,
  addTimelineStep,
  addWorkItem,
  archiveProject,
  deleteBudgetItem,
  deleteTimelineStep,
  deleteWorkItem,
  toggleBudgetItemStatus,
  updateProjectStatus,
  updateTimelineStepStatus,
  updateWorkItemStatus,
} from "../actions";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase } = await getStaffContext();
  const project = await getStaffProject(supabase, projectId);

  const [{ data: budgetItems }, { data: workItems }, { data: timelineSteps }] = await Promise.all([
    supabase.from("budget_items").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("work_items").select("*").eq("project_id", projectId).order("week_start_date", { ascending: false }),
    supabase.from("timeline_steps").select("*").eq("project_id", projectId).order("order_index"),
  ]);

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
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Salva
              </Button>
            </div>
          </form>

          {!project.is_archived && (
            <form action={archiveProject} className="mt-4 border-t border-border pt-4">
              <input type="hidden" name="project_id" value={projectId} />
              <p className="mb-2 text-xs text-muted-foreground">
                A chiusura cantiere: la chat resta consultabile, viene creato in automatico un promemoria
                interno per ricontattare il cliente tra 4-6 mesi.
              </p>
              <Button type="submit" variant="outline" size="sm">
                Segna cantiere come concluso
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Differenze budget</CardTitle>
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
          <CardTitle>Lavorazioni della settimana</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={addWorkItem} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Lavorazione"><Input name="title" required className="w-48" /></Field>
            <Field label="Settimana del"><Input name="week_start_date" type="date" required /></Field>
            <Field label="Stato">
              <select name="status" defaultValue="planned" className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                <option value="planned">In programma</option>
                <option value="in_progress">In corso</option>
                <option value="done">Completata</option>
              </select>
            </Field>
            <Button type="submit" size="sm">Aggiungi</Button>
          </form>

          <ul className="flex flex-col divide-y divide-border">
            {((workItems ?? []) as WorkItem[]).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">Settimana del {formatDate(item.week_start_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateWorkItemStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={item.status}
                      options={[
                        { value: "planned", label: "In programma" },
                        { value: "in_progress", label: "In corso" },
                        { value: "done", label: "Completata" },
                      ]}
                    />
                  </form>
                  <DeleteButton action={deleteWorkItem} id={item.id} projectId={projectId} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avanzamento (timeline)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={addTimelineStep} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Fase"><Input name="label" required className="w-56" placeholder="Es. Pavimenti e rivestimenti" /></Field>
            <Button type="submit" size="sm">Aggiungi fase</Button>
          </form>

          <ul className="flex flex-col divide-y divide-border">
            {((timelineSteps ?? []) as TimelineStep[]).map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-3 py-2">
                <p className="text-sm font-medium">{step.label}</p>
                <div className="flex items-center gap-2">
                  <form action={updateTimelineStepStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={step.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={step.status}
                      options={[
                        { value: "upcoming", label: "Da iniziare" },
                        { value: "in_progress", label: "In corso" },
                        { value: "done", label: "Completata" },
                      ]}
                    />
                  </form>
                  <DeleteButton action={deleteTimelineStep} id={step.id} projectId={projectId} />
                </div>
              </li>
            ))}
          </ul>
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
