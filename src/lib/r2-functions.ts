import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uploadSchema = z.object({
  key: z.string().min(1).max(512),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive().max(100 * 1024 * 1024),
});

const readSchema = z.object({
  paths: z.array(z.string().min(1).max(512)).max(100),
});

const deleteSchema = z.object({
  key: z.string().min(1).max(512),
});

export const createR2UploadUrl = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(async ({ data }) => {
    const { createR2UploadUrl: signUpload } = await import("./r2-server");
    return signUpload(data);
  });

export const createR2ReadUrls = createServerFn({ method: "POST" })
  .validator(readSchema)
  .handler(async ({ data }) => {
    const { createR2ReadUrls: signReads } = await import("./r2-server");
    return signReads(data.paths);
  });

export const deleteR2Object = createServerFn({ method: "POST" })
  .validator(deleteSchema)
  .handler(async ({ data }) => {
    const { deleteR2Object: removeObject } = await import("./r2-server");
    return removeObject(data.key);
  });
