"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

// L'evento beforeinstallprompt non e' nel lib.dom.d.ts di TypeScript.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "checking" | "installed" | "ios" | "prompt-ready" | "manual";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari non supporta display-mode: standalone, ha il suo flag.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppCard() {
  const [state, setState] = useState<InstallState>("checking");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Stato derivato da API disponibili solo lato client (window, UA):
    // va per forza calcolato in un effetto, non al render.
    if (isStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("installed");
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setState("ios");
      return;
    }

    // Su Android/Chrome l'evento arriva solo se il browser ritiene l'app
    // "installabile" (manifest + service worker validi): finche' non arriva
    // teniamo lo stato "manual" come ripiego, cosi' il cliente ha comunque
    // un'istruzione invece di una scheda vuota.
    setState("manual");
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setState("prompt-ready");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setState("installed");
    }
    setDeferredPrompt(null);
  }

  if (state === "checking" || state === "installed") return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Installa l&apos;app sul telefono</p>
      </div>

      {state === "prompt-ready" && (
        <>
          <p className="text-sm text-muted-foreground">
            Aggiungi Le Nuvole alla schermata Home per aprirla come un&apos;app, con la sua icona.
          </p>
          <Button size="sm" className="self-start" onClick={handleInstallClick}>
            Installa l&apos;app
          </Button>
        </>
      )}

      {state === "ios" && (
        <p className="text-sm text-muted-foreground">
          Tocca l&apos;icona <Share className="mx-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />{" "}
          <strong>Condividi</strong> nella barra di Safari, poi scegli{" "}
          <strong>&laquo;Aggiungi alla schermata Home&raquo;</strong>{" "}
          <SquarePlus className="mx-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />.
        </p>
      )}

      {state === "manual" && (
        <p className="text-sm text-muted-foreground">
          Apri il menu del browser (in genere l&apos;icona con i tre puntini) e cerca la voce{" "}
          <strong>&laquo;Installa app&raquo;</strong> o <strong>&laquo;Aggiungi a schermata Home&raquo;</strong>.
        </p>
      )}
    </div>
  );
}
