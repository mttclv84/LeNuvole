"use client";

import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/utils";

const BUCKET = "project-files";
// Limite per singolo file del piano free di Supabase Storage.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type UploadResult = { file: File; path: string } | { file: File; error: string };

// Carica i file uno dopo l'altro direttamente su Storage (dal browser), nella
// cartella indicata. Uno alla volta: avanzamento chiaro e nessun picco di
// banda da telefono in cantiere. Un file che fallisce non blocca gli altri.
export async function uploadFilesToStorage(
  files: File[],
  folder: string,
  onProgress: (done: number, total: number) => void,
): Promise<UploadResult[]> {
  const supabase = createClient();
  const results: UploadResult[] = [];
  onProgress(0, files.length);
  for (const [i, file] of files.entries()) {
    if (file.size > MAX_FILE_BYTES) {
      results.push({ file, error: "supera i 50 MB" });
    } else {
      const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      results.push(error ? { file, error: "caricamento non riuscito" } : { file, path });
    }
    onProgress(i + 1, files.length);
  }
  return results;
}

// Nome del file senza estensione, usato come titolo di default.
export function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}
