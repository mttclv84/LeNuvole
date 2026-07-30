import { cn } from "@/lib/utils";
import { STATUS_LIGHT_LABEL, type StatusLight } from "@/lib/types";

const DOT_CLASS: Record<StatusLight, string> = {
  green: "bg-status-green",
  orange: "bg-status-orange",
  red: "bg-status-red",
};

export function StatusLightDot({ status, className }: { status: StatusLight; className?: string }) {
  return <span className={cn("inline-block h-3 w-3 rounded-full", DOT_CLASS[status], className)} />;
}

export function StatusLightCard({
  status,
  reason,
}: {
  status: StatusLight;
  reason: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-5">
      <StatusLightDot status={status} className="mt-1 h-4 w-4 shrink-0" />
      <div>
        <p className="text-base font-semibold">{STATUS_LIGHT_LABEL[status]}</p>
        {reason ? (
          <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nessuna nota da parte dello studio.</p>
        )}
      </div>
    </div>
  );
}
