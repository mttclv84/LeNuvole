import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/lib/types";

const ICON = {
  done: Check,
  in_progress: Clock,
  upcoming: Circle,
};

export function ProjectTimeline({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna fase pubblicata ancora.</p>;
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const Icon = ICON[step.status];
        const isLast = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-full w-px",
                  step.status === "done" ? "bg-status-green" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                step.status === "done" && "border-status-green bg-status-green text-white",
                step.status === "in_progress" && "border-accent bg-accent text-accent-foreground",
                step.status === "upcoming" && "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span
              className={cn(
                "pt-0.5 text-sm",
                step.status === "upcoming" ? "text-muted-foreground" : "font-medium",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
