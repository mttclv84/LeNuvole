"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { MultiFileInput } from "@/components/ui/multi-file-input";
import { UploadErrors, UploadProgressButton } from "@/components/upload-progress-button";
import { uploadFilesToStorage } from "@/lib/upload-files";
import { registerMedia } from "../../actions";

// Caricamento di più foto/disegni/render insieme: stesso tipo e stessa
// didascalia (facoltativa) per tutti i file scelti.
export function UploadMediaForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [type, setType] = useState("photo");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || busy) return;
    setErrors([]);
    const results = await uploadFilesToStorage(files, `${projectId}/media`, (done, total) =>
      setProgress({ done, total }),
    );
    const paths = results.flatMap((r) => ("path" in r ? [r.path] : []));
    if (paths.length > 0) await registerMedia({ project_id: projectId, type, caption, paths });
    setErrors(results.flatMap((r) => ("error" in r ? [`${r.file.name} (${r.error})`] : [])));
    // Restano selezionati solo i file non riusciti, pronti per riprovare.
    setFiles(results.flatMap((r) => ("error" in r ? [r.file] : [])));
    if (paths.length > 0) setCaption("");
    setProgress(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={busy}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="photo">Foto</option>
          <option value="drawing">Disegno</option>
          <option value="render">Render</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="caption">Didascalia</Label>
        <Input
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={busy}
          className="w-56"
          placeholder="Facoltativa, uguale per tutti"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">File</Label>
        <MultiFileInput id="file" accept="image/*" files={files} onChange={setFiles} disabled={busy} />
      </div>
      <UploadProgressButton busy={busy} progress={progress} count={files.length} />
      <UploadErrors errors={errors} />
    </form>
  );
}
