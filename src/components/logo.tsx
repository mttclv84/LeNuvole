import { cn } from "@/lib/utils";

// Costruzione da Brand Manual Le Nuvole (sezione "Logo", p. 6-10): wordmark
// su due righe, "LE NUVOLE" in peso leggero + triangolo rosso, "CASA &
// DESIGN" in grassetto sotto. Regola positivo/negativo: di default segue il
// colore del testo della pagina (--foreground, già chiaro/scuro secondo il
// tema); usare `tone` solo per forzare il colore su uno sfondo che non
// coincide con il tema generale della pagina (es. un pannello scuro dentro
// una pagina chiara).
function Triangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 8" className={className} aria-hidden="true">
      <path d="M0 0H10L5 8Z" fill="currentColor" />
    </svg>
  );
}

const TONE_CLASS = {
  auto: "text-foreground",
  light: "text-white",
  dark: "text-brand-black",
} as const;

export function Logo({
  tone = "auto",
  className,
}: {
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}) {
  const textClass = TONE_CLASS[tone];
  return (
    <div className={cn("inline-flex select-none flex-col leading-tight", className)}>
      <span className={cn("flex items-center gap-1.5 text-base font-light uppercase tracking-wide", textClass)}>
        Le Nuvole
        <Triangle className="h-2 w-2.5 text-brand-red" />
      </span>
      <span className={cn("text-lg font-extrabold uppercase tracking-tight", textClass)}>Casa &amp; Design</span>
    </div>
  );
}

export function Monogram({
  tone = "auto",
  className,
}: {
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}) {
  const textClass = TONE_CLASS[tone];
  return (
    <div className={cn("inline-flex select-none flex-col items-center leading-none", className)}>
      <Triangle className="h-2 w-2.5 text-brand-red" />
      <span className={cn("text-base font-extrabold", textClass)}>N</span>
    </div>
  );
}
