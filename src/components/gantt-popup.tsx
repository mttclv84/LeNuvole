"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { GanttChart, type GanttRow } from "@/components/gantt-chart";

// Sul telefono il Gantt in pagina è troppo stretto per vedere bene un mese
// intero: tutta l'area diventa un tasto che apre lo stesso grafico dentro un
// popup grande, dove c'è più spazio per scorrere e leggere le date.
export function GanttPopup({ rows, emptyMessage }: { rows: GanttRow[]; emptyMessage?: string }) {
  const [open, setOpen] = useState(false);

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
        <GanttChart rows={rows} labelWidth={180} emptyMessage={emptyMessage} />
      </Modal>
    </>
  );
}
