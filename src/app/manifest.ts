import type { MetadataRoute } from "next";

// Icone e colori sono placeholder (vedi scripts/generate-placeholder-icons.py)
// da sostituire quando Bea fornisce il logo/brand definitivo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Nuvole Casa&Design — Il tuo progetto",
    short_name: "Le Nuvole",
    description: "Segui l'avanzamento del tuo progetto Le Nuvole Casa&Design in un unico posto.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#5b7fa6",
    lang: "it",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
