import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usageLabel, type AreaSummary, type UsageLevel } from "@/lib/time-tracking";

const BAR_COLOR: Record<UsageLevel, string> = {
  none: "bg-muted-foreground/40",
  ok: "bg-status-green",
  warning: "bg-status-orange",
  over: "bg-status-red",
};

const BADGE_VARIANT = { none: "default", ok: "default", warning: "orange", over: "red" } as const;

export function UsageBar({ summary, className }: { summary: AreaSummary; className?: string }) {
  const width = summary.percent === null ? (summary.usedMinutes > 0 ? 100 : 0) : Math.min(100, summary.percent);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full", BAR_COLOR[summary.level])} style={{ width: `${width}%` }} />
    </div>
  );
}

// Compare solo quando serve: oltre l'80% delle ore previste ("90% utilizzato")
// o quando si sfora ("+4h").
export function UsageBadge({ summary }: { summary: AreaSummary }) {
  const label = usageLabel(summary);
  if (!label) return null;
  return <Badge variant={BADGE_VARIANT[summary.level]}>{label}</Badge>;
}
