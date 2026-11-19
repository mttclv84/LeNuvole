import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Nome file sicuro per Supabase Storage: le chiavi accettano solo caratteri
// ASCII "semplici", quindi accenti, apostrofi e simboli (es. "Preventivo
// Dal Santo – città.pdf") farebbero fallire l'upload.
// Data di oggi in Italia (YYYY-MM-DD), anche se il server gira in UTC.
export function todayInItaly() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "file";
}

// Importo scritto a mano in formato italiano o semplice: "25.000", "25.000,50",
// "25000,5", "25000.50", "€ 25 000". NaN se non è un numero.
export function parseEuroAmount(input: string) {
  const s = input.replace(/[€\s]/g, "");
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return Number(s);
}
