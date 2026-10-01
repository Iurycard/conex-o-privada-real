import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

const SIGNED_URL_TTL_SECONDS = 55 * 60;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

type R2Config = {
  bucket: string;
  client: S3Client;
};

let r2Config: R2Config | undefined;

function getR2Config(): R2Config {
  if (r2Config) return r2Config;

  const accountId = process.env["CLOUDFLARE_R2_ACCOUNT_ID"];
  const accessKeyId = process.env["CLOUDFLARE_R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["CLOUDFLARE_R2_SECRET_ACCESS_KEY"];
  const bucket = process.env["CLOUDFLARE_R2_BUCKET_NAME"];

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 server environment is incomplete");
  }

  r2Config = {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  return r2Config;
}

async function getAuthenticatedSupabase() {
  const authorization = getRequestHeader("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Authentication required");

  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is incomplete");

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid or expired authentication session");

  return { supabase, user: data.user };
}

function assertR2Key(key: string, userId: string, ownerOnly = false) {
  const [ownerId, kind, marker, filename, ...extra] = key.split("/");
  const validFilename = /^[a-zA-Z0-9-]+\.(webp|mp4|mov|webm)$/i.test(filename ?? "");

  if (
    extra.length > 0
    || !ownerId
    || !["public", "private"].includes(kind ?? "")
    || marker !== "r2"
    || !validFilename
    || (ownerOnly && ownerId !== userId)
  ) {
    throw new Error("Invalid or unauthorized R2 object path");
  }

  return { ownerId, kind };
}

export async function createR2UploadUrl(input: {
  key: string;
  contentType: string;
  size: number;
}) {
  const { user } = await getAuthenticatedSupabase();
  const { kind } = assertR2Key(input.key, user.id, true);
  const isWebp = input.contentType === "image/webp";
  const isVideo = /^video\/[a-z0-9.+-]+$/i.test(input.contentType);

  if ((!isWebp && !isVideo) || input.size < 1 || input.size > MAX_UPLOAD_BYTES) {
    throw new Error("Unsupported media type or file size");
  }
  if (kind === "private" && input.contentType !== "image/webp") {
    throw new Error("Only WebP images can be uploaded to the private album");
  }

  const { bucket, client } = getR2Config();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 10 * 60 });
  return { url, headers: { "Content-Type": input.contentType } };
}

export async function createR2ReadUrls(paths: string[]) {
  const { supabase, user } = await getAuthenticatedSupabase();
  const { bucket, client } = getR2Config();
  const urls: Record<string, string> = {};
  const approvalCache = new Map<string, boolean>();

  for (const key of [...new Set(paths)]) {
    const { ownerId, kind } = assertR2Key(key, user.id);
    if (kind === "private" && ownerId !== user.id) {
      let approved = approvalCache.get(ownerId);
      if (approved === undefined) {
        const { data, error } = await supabase
          .from("album_access_requests")
          .select("id")
          .eq("requester_id", user.id)
          .eq("owner_id", ownerId)
          .eq("status", "approved")
          .maybeSingle();
        if (error) throw new Error(`Could not verify private album access: ${error.message}`);
        approved = Boolean(data);
        approvalCache.set(ownerId, approved);
      }

      if (!approved) {
        const { data: attachment, error } = await supabase
          .from("message_attachments")
          .select("id")
          .eq("storage_path", key)
          .maybeSingle();
        if (error) throw new Error(`Could not verify shared photo access: ${error.message}`);
        if (!attachment) throw new Error("Not authorized to view this private media");
      }
    }

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseCacheControl: "private, max-age=3300",
    });
    urls[key] = await getSignedUrl(client, getCommand, { expiresIn: SIGNED_URL_TTL_SECONDS });
  }

  return { urls };
}

export async function deleteR2Object(key: string) {
  const { user } = await getAuthenticatedSupabase();
  assertR2Key(key, user.id, true);
  const { bucket, client } = getR2Config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return { deleted: true };
}
