import { CheckCircle2, Download, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext } from "@/lib/data/staff-context";
import { formatDate } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";
import { deleteDocument, markDocumentSigned } from "../../actions";
import { UploadDocumentsForm } from "./upload-documents-form";

const BUCKET = "project-files";
const SIGNED_URL_TTL = 60 * 10;

export default async function StaffDocumentiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase } = await getStaffContext();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const items = (documents ?? []) as DocumentItem[];
  const paths = items.map((d) => d.storage_path);
  let signedUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    signedUrlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  }

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel={`staff-documenti-${projectId}`}
        subscriptions={[{ table: "documents", filter: `project_id=eq.${projectId}` }]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Carica documento</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDocumentsForm projectId={projectId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivio ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun documento caricato.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {items.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {signedUrlByPath.get(doc.storage_path) && (
                      <a href={signedUrlByPath.get(doc.storage_path)} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-accent" aria-label="Apri">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {doc.requires_signature && !doc.signed_at && (
                      <form action={markDocumentSigned}>
                        <input type="hidden" name="id" value={doc.id} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <button type="submit" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-status-green hover:bg-status-green/10">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Segna firmato
                        </button>
                      </form>
                    )}
                    {doc.signed_at && (
                      <span className="flex items-center gap-1 text-xs text-status-green">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Firmato
                      </span>
                    )}
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={doc.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="storage_path" value={doc.storage_path} />
                      <button type="submit" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-status-red" aria-label="Elimina">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
