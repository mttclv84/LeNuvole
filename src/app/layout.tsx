import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// Font ufficiale di brand "Metropolis" non disponibile come file (non è su
// Google Fonts): in attesa dei file reali da Le Nuvole, Plus Jakarta Sans è
// il sostituto più vicino per forma (geometrico, stessa gamma di pesi
// Light/SemiBold usata nel manuale). Basta sostituire questo import quando
// arrivano i file di Metropolis.
const brandSans = Plus_Jakarta_Sans({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
