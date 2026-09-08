import Image from "next/image";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { getClientContext } from "@/lib/data/client-context";
import { formatDate } from "@/lib/utils";
import type { Media } from "@/lib/types";

const BUCKET = "project-files";
const SIGNED_URL_TTL = 60 * 10; // 10 minuti

export default async function FotoPage() {
  const { supabase, project } = await getClientContext();

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "photo")
    .order("created_at", { ascending: false });

  const items = (media ?? []) as Media[];
  const paths = items.map((m) => m.storage_path);

  let signedUrlByPath = new Map<string, string>();
  let downloadUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const [{ data: signed }, { data: signedDownload }] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL),
      supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL, { download: true }),
    ]);
    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((s) => s.signedUrl)
        .map((s) => [s.path ?? "", s.signedUrl as string]),
    );
    downloadUrlByPath = new Map(
      (signedDownload ?? [])
        .filter((s) => s.signedUrl)
        .map((s) => [s.path ?? "", s.signedUrl as string]),
    );
  }

  return (
    <>
      <LiveRefresh
        channel={`foto-${project.id}`}
        subscriptions={[{ table: "media", filter: `project_id=eq.${project.id}` }]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Foto del cantiere</CardTitle>
        </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Non ci sono ancora foto caricate. Le troverai qui non appena lo studio le pubblicherà.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const url = signedUrlByPath.get(item.storage_path);
              const downloadUrl = downloadUrlByPath.get(item.storage_path);
              return (
                <figure key={item.id} className="overflow-hidden rounded-md border border-border">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="relative block aspect-square bg-muted">
                      <Image src={url} alt={item.caption ?? "Foto del cantiere"} fill className="object-cover" />
                    </a>
                  ) : (
                    <div className="relative aspect-square bg-muted" />
                  )}
                  <figcaption className="flex items-center justify-between gap-1 p-2 text-xs text-muted-foreground">
                    <span className="min-w-0 flex-1">
                      {item.caption && <span className="block truncate text-foreground">{item.caption}</span>}
                      {formatDate(item.created_at)}
                    </span>
                    {downloadUrl && (
                      <a href={downloadUrl} className="shrink-0 rounded p-1 hover:bg-muted hover:text-accent" aria-label="Scarica foto">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </CardContent>
      </Card>
    </>
  );
}
