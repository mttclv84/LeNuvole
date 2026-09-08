"use client";

import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { GanttChart, type GanttRow } from "@/components/gantt-chart";
import { MonthCalendar } from "@/components/month-calendar";

// Coincide con il breakpoint "sm" di Tailwind usato in tutto il resto
// dell'app per distinguere mobile da desktop (vedi es. app-nav.tsx).
const MOBILE_QUERY = "(max-width: 639px)";

// Sul telefono il Gantt in pagina è troppo stretto per vedere bene un mese
// intero: tutta l'area diventa un tasto che apre un popup grande. Su mobile
// dentro il popup si mostra un vero calendario a mese (settimane in righe,
// scorrimento verticale) invece della stessa timeline orizzontale, molto
// più leggibile col dito; su desktop resta il Gantt, dove lo spazio in più
// basta già.
export function GanttPopup({ rows, emptyMessage }: { rows: GanttRow[]; emptyMessage?: string }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full rounded-md text-left"
        aria-label="Ingrandisci pianificazione lavori"
      >
        <GanttChart rows={rows} labelWidth={160} emptyMessage={emptyMessage} />
        <span className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-card/90 text-muted-foreground shadow-sm group-hover:text-foreground">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Pianificazione lavori" size="large">
        {isMobile ? (
          <MonthCalendar rows={rows} emptyMessage={emptyMessage} />
        ) : (
          <GanttChart rows={rows} labelWidth={180} emptyMessage={emptyMessage} />
        )}
      </Modal>
    </>
  );
}
