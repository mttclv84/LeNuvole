"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installazione non critica: l'app resta pienamente utilizzabile da browser
      });
    }
  }, []);
  return null;
}
