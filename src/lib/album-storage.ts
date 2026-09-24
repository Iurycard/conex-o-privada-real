import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ALBUM_BUCKET = "album";

/** Uploads files to `<userId>/<public|private>/<name>` and returns the storage paths. */
export async function uploadAlbumPhotos(
  userId: string,
  kind: "public" | "private",
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(ALBUM_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function removeAlbumPhoto(path: string) {
  if (path.startsWith("http")) return;
  await supabase.storage.from(ALBUM_BUCKET).remove([path]);
}

export async function resolveAlbumUrls(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    if (!path) continue;
    if (path.startsWith("http") || path.startsWith("data:")) {
      out.push(path);
      continue;
    }
    const { data, error } = await supabase.storage.from(ALBUM_BUCKET).createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) out.push(data.signedUrl);
    else if (error) console.error("Erro ao resolver foto do álbum:", path, error.message);
  }
  return out;
}

/** Turns stored album entries (URLs or storage paths) into displayable URLs. */
export function useAlbumUrls(paths: string[] | undefined) {
  const key = (paths ?? []).join("|");
  const [urls, setUrls] = useState<string[]>(() => (paths ?? []).filter((p) => p.startsWith("http")));

  useEffect(() => {
    let active = true;
    void resolveAlbumUrls(key ? key.split("|") : []).then((next) => {
      if (active) setUrls(next);
    });
    return () => {
      active = false;
    };
  }, [key]);

  return urls;
}
