import { useEffect, useState } from "react";

const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 0.78;

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

/** Compresses and stores album photos through the authenticated R2 API. */
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
    const key = `${userId}/${kind}/r2/${filename}`;
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(`/api/media?key=${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: { "content-type": contentType },
          body: preparedFile,
          credentials: "same-origin",
        });
        break;
      } catch (error) {
        if (!(error instanceof TypeError) || attempt === 2) {
          console.error("Falha de conexão ao enviar foto:", error);
          throw new Error("A conexão com o servidor foi interrompida. Tente enviar a foto novamente.");
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    if (!response) throw new Error("Não foi possível enviar a foto");
    if (!response.ok) throw new Error(`Falha no upload R2 (${response.status})`);
    paths.push(key);
  }
  return paths;
}

export async function removeAlbumPhoto(path: string) {
  if (path.startsWith("http")) return;
  if (!isR2Path(path)) return;
  const response = await fetch(`/api/media?key=${encodeURIComponent(path)}`, { method: "DELETE", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Falha ao remover mídia (${response.status})`);
}

export async function resolveAlbumUrls(paths: string[], legacyPrefix?: string): Promise<(string | null)[]> {
  return paths.map((path) => {
    if (!path) return null;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    if (path.startsWith("/api/media?")) return path;
    if (isR2Path(path)) return `/api/media?key=${encodeURIComponent(path)}`;
    if (legacyPrefix && !path.includes("/")) {
      const migratedPath = `${legacyPrefix}/r2/${path}`;
      if (isR2Path(migratedPath)) return `/api/media?key=${encodeURIComponent(migratedPath)}`;
    }
    return null;
  });
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
