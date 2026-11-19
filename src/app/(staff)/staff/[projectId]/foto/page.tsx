import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext } from "@/lib/data/staff-context";
import { formatDate } from "@/lib/utils";
import type { Media, MediaType } from "@/lib/types";
import { deleteMedia } from "../../actions";
import { UploadMediaForm } from "./upload-media-form";

const BUCKET = "project-files";
const SIGNED_URL_TTL = 60 * 10;

const TYPE_LABEL: Record<MediaType, string> = { photo: "Foto", drawing: "Disegno", render: "Render" };

export default async function StaffFotoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase } = await getStaffContext();

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const items = (media ?? []) as Media[];
  const paths = items.map((m) => m.storage_path);
  let signedUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    signedUrlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  }

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel={`staff-foto-${projectId}`}
        subscriptions={[{ table: "media", filter: `project_id=eq.${projectId}` }]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Carica foto, disegno o render</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadMediaForm projectId={projectId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivio ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun file caricato.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const url = signedUrlByPath.get(item.storage_path);
                return (
                  <figure key={item.id} className="overflow-hidden rounded-md border border-border">
                    <div className="relative aspect-square bg-muted">
                      {url && <Image src={url} alt={item.caption ?? "media"} fill className="object-cover" />}
                    </div>
                    <figcaption className="flex items-center justify-between gap-1 p-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {TYPE_LABEL[item.type]} · {formatDate(item.created_at)}
                      </span>
                      <form action={deleteMedia}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="storage_path" value={item.storage_path} />
                        <button type="submit" className="shrink-0 hover:text-status-red" aria-label="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
