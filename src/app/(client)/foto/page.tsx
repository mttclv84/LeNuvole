import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((s) => s.signedUrl)
        .map((s) => [s.path ?? "", s.signedUrl as string]),
    );
  }

  return (
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
              return (
                <figure key={item.id} className="overflow-hidden rounded-md border border-border">
                  <div className="relative aspect-square bg-muted">
                    {url && (
                      <Image src={url} alt={item.caption ?? "Foto del cantiere"} fill className="object-cover" />
                    )}
                  </div>
                  <figcaption className="p-2 text-xs text-muted-foreground">
                    {item.caption && <span className="block truncate text-foreground">{item.caption}</span>}
                    {formatDate(item.created_at)}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
