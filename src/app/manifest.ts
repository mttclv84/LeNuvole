import type { MetadataRoute } from "next";

// Icone generate da scripts/generate-placeholder-icons.py a partire dal
// monogramma del Brand Manual (triangolo + "N"). Colori da Brand Manual Le
// Nuvole — vedi src/app/globals.css per la fonte dei valori.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Nuvole Casa&Design — Il tuo progetto",
    short_name: "Le Nuvole",
    description: "Segui l'avanzamento del tuo progetto Le Nuvole Casa&Design in un unico posto.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2f0",
    theme_color: "#1d1d1b",
    lang: "it",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
