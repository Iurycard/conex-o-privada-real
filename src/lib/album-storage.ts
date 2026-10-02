import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createR2ReadUrls, createR2UploadUrl, deleteR2Object } from "@/lib/r2-functions";

export const ALBUM_BUCKET = "album";
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 0.78;
const SIGNED_URL_CACHE_MS = 54 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function isR2Path(path: string) {
  return path.split("/")[2] === "r2";
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar a imagem para upload");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a imagem")),
      "image/webp",
      WEBP_QUALITY,
    );
  });

  const name = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return new File([webp], `${name}.webp`, { type: "image/webp", lastModified: file.lastModified });
}

function uploadExtension(file: File) {
  if (file.type.startsWith("image/")) return "webp";
  throw new Error("Selecione uma foto para enviar");
}

/** Compresses images and stores public photos in Supabase and private photos in R2. */
export async function uploadAlbumPhotos(
  userId: string,
  kind: "public" | "private",
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const preparedFile = await compressImage(file);
    const extension = uploadExtension(preparedFile);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const contentType = preparedFile.type || "application/octet-stream";

    if (kind === "public") {
      const path = `${userId}/public/${filename}`;
      const { error } = await supabase.storage.from(ALBUM_BUCKET).upload(path, preparedFile, {
        contentType,
        upsert: false,
      });
      if (error) throw new Error(`Falha no upload Supabase: ${error.message}`);
      paths.push(path);
      continue;
    }

    const key = `${userId}/private/r2/${filename}`;
    const signedUpload = await createR2UploadUrl({
      data: { key, contentType, size: preparedFile.size },
    });
    let response: Response;
    try {
      response = await fetch(signedUpload.url, {
        method: "PUT",
        headers: signedUpload.headers,
        body: preparedFile,
      });
    } catch (error) {
      console.error("Falha de rede ou CORS no upload R2:", error);
      throw new Error("Falha de rede/CORS no upload R2. Verifique a política CORS do bucket e tente novamente.");
    }
    if (!response.ok) throw new Error(`Falha no upload R2 (${response.status})`);
    paths.push(key);
  }
  return paths;
}

export async function removeAlbumPhoto(path: string) {
  if (path.startsWith("http")) return;
  if (isR2Path(path)) {
    await deleteR2Object({ data: { key: path } });
    for (const key of signedUrlCache.keys()) {
      if (key.endsWith(`:${path}`)) signedUrlCache.delete(key);
    }
    return;
  }
  await supabase.storage.from(ALBUM_BUCKET).remove([path]);
}

export async function resolveAlbumUrls(paths: string[], legacyPrefix?: string): Promise<(string | null)[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const cacheKey = (path: string) => `${user?.id ?? "anonymous"}:${path}`;
  const r2Paths = [...new Set(paths.filter((path) => path && isR2Path(path)))];
  const missingR2Paths = r2Paths.filter((path) => (signedUrlCache.get(cacheKey(path))?.expiresAt ?? 0) <= Date.now());

  for (let index = 0; index < missingR2Paths.length; index += 50) {
    const batch = missingR2Paths.slice(index, index + 50);
    try {
      const { urls } = await createR2ReadUrls({ data: { paths: batch } });
      for (const [path, url] of Object.entries(urls)) {
        signedUrlCache.set(cacheKey(path), { url, expiresAt: Date.now() + SIGNED_URL_CACHE_MS });
      }
    } catch (error) {
      console.error("Erro ao gerar URL assinada do R2:", error);
    }
  }

  const out: (string | null)[] = [];
  for (const path of paths) {
    if (!path) {
      out.push(null);
      continue;
    }
    if (path.startsWith("http") || path.startsWith("data:")) {
      out.push(path);
      continue;
    }
    if (isR2Path(path)) {
      out.push(signedUrlCache.get(cacheKey(path))?.url ?? null);
      continue;
    }

    const candidates = [path];
    if (legacyPrefix && !path.includes("/")) candidates.push(`${legacyPrefix}/${path}`);

    let resolved: string | null = null;
    for (const candidate of candidates) {
      const { data } = await supabase.storage.from(ALBUM_BUCKET).createSignedUrl(candidate, 60 * 60);
      if (data?.signedUrl) {
        resolved = data.signedUrl;
        break;
      }
    }

    out.push(resolved);
    if (!resolved) console.error("Erro ao resolver foto do álbum:", path);
  }
  return out;
}

/** Turns stored album entries (URLs or storage paths) into displayable URLs. */
export function useAlbumUrls(paths: string[] | undefined, legacyPrefix?: string) {
  const key = (paths ?? []).join("|");
  const [urls, setUrls] = useState<(string | null)[]>(() => (paths ?? []).map((path) => path.startsWith("http") ? path : null));

  useEffect(() => {
    let active = true;
    void resolveAlbumUrls(key ? key.split("|") : [], legacyPrefix).then((next) => {
      if (active) setUrls(next);
    });
    return () => {
      active = false;
    };
  }, [key, legacyPrefix]);

  return urls;
}
