import Image from "next/image";
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
    <div className={cn("inline-flex select-none items-center gap-3", className)}>
      <AppMark size={48} />
      <div className="flex flex-col leading-tight">
        <span className={cn("text-xl font-extrabold tracking-tight", textClass)}>ZeroCasìn App</span>
        <span className={cn("flex items-center gap-1 text-[11px] font-light tracking-wide opacity-70", textClass)}>
          by LeNuvole Casa&amp;Design
          <Triangle className="h-1.5 w-2 text-brand-red" />
        </span>
      </div>
    </div>
  );
}

// Marchio dell'app (logo CSN, 2026-11-20): stessa immagine delle icone
// installate sul telefono (public/icons, generate dal logo fornito).
export function AppMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icons/app-logo.png"
      alt="Logo"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 select-none rounded-[22%] shadow-elev-1", className)}
    />
  );
}

export function Monogram({ className }: { className?: string }) {
  return <AppMark size={36} className={className} />;
}
