import { FileText, Eye, Download, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { getClientContext } from "@/lib/data/client-context";
import { formatDate } from "@/lib/utils";
import type { DocumentCategory, DocumentItem } from "@/lib/types";

const BUCKET = "project-files";
const SIGNED_URL_TTL = 60 * 10;

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  crew: "Documenti maestranze",
  order_confirmation: "Conferme d'ordine",
  manual: "Manuali e libretti",
  other: "Altri documenti",
};

const CATEGORY_ORDER: DocumentCategory[] = ["order_confirmation", "crew", "manual", "other"];

export default async function DocumentiPage() {
  const { supabase, project } = await getClientContext();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const items = (documents ?? []) as DocumentItem[];
  const paths = items.map((d) => d.storage_path);

  let signedUrlByPath = new Map<string, string>();
  let downloadUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const [{ data: signed }, { data: signedDownload }] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL),
      supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL, { download: true }),
    ]);
    signedUrlByPath = new Map(
      (signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]),
    );
    downloadUrlByPath = new Map(
      (signedDownload ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]),
    );
  }

  const byCategory = new Map<DocumentCategory, DocumentItem[]>();
  for (const doc of items) {
    byCategory.set(doc.category, [...(byCategory.get(doc.category) ?? []), doc]);
  }

  const liveRefresh = (
    <LiveRefresh
      channel={`documenti-${project.id}`}
      subscriptions={[{ table: "documents", filter: `project_id=eq.${project.id}` }]}
    />
  );

  if (items.length === 0) {
    return (
      <>
        {liveRefresh}
        <Card>
          <CardHeader>
            <CardTitle>Documenti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Non ci sono ancora documenti caricati. Li troverai qui non appena lo studio li pubblicherà.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {liveRefresh}
      {CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABEL[category]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {byCategory.get(category)!.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                        {doc.requires_signature && doc.signed_at && (
                          <span className="flex items-center gap-1 text-status-green">
                            <CheckCircle2 className="h-3 w-3" /> firmato
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {signedUrlByPath.get(doc.storage_path) && (
                      <a
                        href={signedUrlByPath.get(doc.storage_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-accent hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" /> Apri
                      </a>
                    )}
                    {downloadUrlByPath.get(doc.storage_path) && (
                      <a
                        href={downloadUrlByPath.get(doc.storage_path)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-accent hover:bg-muted"
                      >
                        <Download className="h-4 w-4" /> Scarica
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
