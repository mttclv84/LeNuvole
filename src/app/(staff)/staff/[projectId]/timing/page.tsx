import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext } from "@/lib/data/staff-context";
import { getStaffProject } from "@/lib/data/staff-project";
import { permissions } from "@/lib/permissions";
import { formatMinutes, sumByArea, summarizeProject } from "@/lib/time-tracking";
import { formatDateTime } from "@/lib/utils";
import { TIME_AREAS, TIME_AREA_LABEL, type ProjectTiming, type TimeEntry } from "@/lib/types";
import { UsageBadge, UsageBar } from "../../tempi/usage";
import { TimingForm } from "./timing-form";

export default async function ProjectTimingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, profile } = await getStaffContext();
  await getStaffProject(supabase, projectId);

  const [{ data: timingData }, { data: entries }] = await Promise.all([
    supabase.from("project_timing").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("time_entries").select("area, minutes").eq("project_id", projectId),
  ]);

  const timing = timingData as ProjectTiming | null;
  const editable = !timing || permissions.editSavedTiming(profile.role);
  const summary = summarizeProject(timing, sumByArea((entries ?? []) as Pick<TimeEntry, "area" | "minutes">[]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <LiveRefresh
        channel={`staff-timing-${projectId}`}
        subscriptions={[
          { table: "project_timing", filter: `project_id=eq.${projectId}` },
          { table: "time_entries", filter: `project_id=eq.${projectId}` },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ore previste</CardTitle>
        </CardHeader>
        <CardContent>
          <TimingForm
            projectId={projectId}
            initial={{
              est_design_h: timing?.est_design_h ?? 0,
              est_quoting_h: timing?.est_quoting_h ?? 0,
              est_site_h: timing?.est_site_h ?? 0,
            }}
            editable={editable}
            alreadySaved={Boolean(timing)}
          />
          {timing && (
            <p className="mt-3 text-xs text-muted-foreground">Ultimo salvataggio: {formatDateTime(timing.saved_at)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ore utilizzate finora</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Area</th>
                  <th className="pb-2 text-right font-medium">Previste</th>
                  <th className="pb-2 text-right font-medium">Utilizzate</th>
                  <th className="pb-2 text-right font-medium">Residue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...TIME_AREAS.map((a) => ({ key: a, label: TIME_AREA_LABEL[a], s: summary.areas[a] })), { key: "total", label: "Totale", s: summary.total }].map(
                  ({ key, label, s }) => (
                    <tr key={key} className={key === "total" ? "font-semibold" : undefined}>
                      <td className="py-2.5 pr-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {label} <UsageBadge summary={s} />
                        </div>
                        <UsageBar summary={s} className="mt-1.5" />
                      </td>
                      <td className="py-2.5 text-right align-top tabular-nums">{formatMinutes(s.plannedMinutes)}</td>
                      <td className="py-2.5 text-right align-top tabular-nums">{formatMinutes(s.usedMinutes)}</td>
                      <td className={`py-2.5 text-right align-top tabular-nums ${s.remainingMinutes < 0 ? "text-status-red" : ""}`}>
                        {s.remainingMinutes < 0 ? `+${formatMinutes(-s.remainingMinutes)}` : formatMinutes(s.remainingMinutes)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
