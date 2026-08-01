import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { WORK_ITEM_STATUS_LABEL, workItemStatusColor, type WorkItem } from "@/lib/types";

const DOT_CLASS = {
  default: "bg-border",
  green: "bg-status-green",
  orange: "bg-status-orange",
  red: "bg-status-red",
} as const;

// "Avanzamento": generato in automatico dalle lavorazioni previste, in
// ordine cronologico di data di inizio — non è più una lista gestita a
// parte (vedi staff/actions.ts::addWorkItem).
export function WorkTimeline({ items }: { items: WorkItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna lavorazione pianificata ancora.</p>;
  }

  const sorted = [...items].sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <ol className="flex flex-col">
      {sorted.map((item, i) => {
        const isLast = i === sorted.length - 1;
        const isDone = item.status === "done";
        return (
          <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn("absolute left-[5px] top-4 h-full w-px", isDone ? "bg-status-green" : "bg-border")}
              />
            )}
            <span
              className={cn(
                "z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full",
                isDone ? "bg-status-green" : DOT_CLASS[workItemStatusColor(item.status)],
              )}
            />
            <div className="flex-1">
              <p className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}>
                {item.title}
                {isDone && (
                  <Badge variant="green" className="ml-2 align-middle no-underline">
                    COMPLETATA
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.start_date)}
                {item.end_date && ` – ${formatDate(item.end_date)}`}
              </p>
              {!isDone && <p className="mt-0.5 text-xs text-muted-foreground">{WORK_ITEM_STATUS_LABEL[item.status]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
