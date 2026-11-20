import type { MetadataRoute } from "next";

// Icone generate dal logo CSN (2026-11-20). "?v=2" forza i telefoni a
// riscaricarle dopo il cambio di logo.
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
      { src: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
