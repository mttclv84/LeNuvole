import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// Font ufficiale di brand "Metropolis" non disponibile come file (non è su
// Google Fonts): in attesa dei file reali da Le Nuvole, Plus Jakarta Sans è
// il sostituto più vicino per forma (geometrico, stessa gamma di pesi
// Light/SemiBold usata nel manuale). Basta sostituire questo file quando
// arrivano i file di Metropolis.
// I font sono nel progetto (src/app/fonts, licenza OFL) e non scaricati da
// Google Fonts in fase di build: su Render quel download falliva e bloccava
// il deploy ("next/font/google queries have exactly one entry").
const brandSans = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-brand-sans",
  weight: "200 800",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-400-normal.woff2",
  variable: "--font-geist-mono",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Le Nuvole Casa&Design — Il tuo progetto",
  description: "Segui l'avanzamento del tuo progetto Le Nuvole Casa&Design in un unico posto.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Le Nuvole",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d1d1b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${brandSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
