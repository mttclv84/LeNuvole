"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { MultiFileInput } from "@/components/ui/multi-file-input";
import { UploadErrors, UploadProgressButton } from "@/components/upload-progress-button";
import { baseName, uploadFilesToStorage } from "@/lib/upload-files";
import { registerDocuments } from "../../actions";

// Caricamento di più documenti insieme, nella stessa cartella. Titolo:
// con un solo file quello scritto (o il nome del file se vuoto); con più
// file ognuno prende il proprio nome, preceduto dal titolo se indicato.
export function UploadDocumentsForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress !== null;

  function titleFor(file: File) {
    const t = title.trim();
    if (files.length === 1) return t || baseName(file.name);
    return t ? `${t} – ${baseName(file.name)}` : baseName(file.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || busy) return;
    setErrors([]);
    const results = await uploadFilesToStorage(files, `${projectId}/documents`, (done, total) =>
      setProgress({ done, total }),
    );
    const uploaded = results.flatMap((r) => ("path" in r ? [{ title: titleFor(r.file), path: r.path }] : []));
    if (uploaded.length > 0) {
      await registerDocuments({
        project_id: projectId,
        category,
        requires_signature: requiresSignature,
        files: uploaded,
      });
    }
    setErrors(results.flatMap((r) => ("error" in r ? [`${r.file.name} (${r.error})`] : [])));
    // Restano selezionati solo i file non riusciti, pronti per riprovare.
    setFiles(results.flatMap((r) => ("error" in r ? [r.file] : [])));
    if (uploaded.length > 0) setTitle("");
    setProgress(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titolo</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          className="w-56"
          placeholder="Vuoto = nome del file"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Cartelle</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="order_confirmation">Conferma d&apos;ordine</option>
          <option value="crew">Maestranze</option>
          <option value="manual">Manuale</option>
          <option value="other">Altro</option>
        </select>
      </div>
      <label className="mt-[26px] flex h-10 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requiresSignature}
          onChange={(e) => setRequiresSignature(e.target.checked)}
          disabled={busy}
        />
        Richiede firma cliente
      </label>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">File</Label>
        <MultiFileInput id="file" files={files} onChange={setFiles} disabled={busy} />
      </div>
      <UploadProgressButton busy={busy} progress={progress} count={files.length} />
      <UploadErrors errors={errors} />
    </form>
  );
}
