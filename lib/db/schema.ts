import { z } from "zod"

export const fileSchema = z
  .object({
    file_id: z.string(),
    file_path: z.string(),
    text_content: z.string().optional(),
    binary_content_b64: z.string().optional(),
    created_at: z.string(),
  })
  .refine(
    (data) =>
      (data.text_content !== undefined) !==
      (data.binary_content_b64 !== undefined),
    {
      message: "Provide either text_content or binary_content_b64",
      path: ["text_content"],
    },
  )
export type File = z.infer<typeof fileSchema>

export const eventSchema = z.object({
  event_id: z.string(),
  event_type: z.union([
    z.literal("FILE_UPDATED"),
    z.literal("FILE_DELETED"),
    z.literal("FILE_CREATED"),
  ]),
  file_path: z.string(),
  created_at: z.string(),
  initiator: z.string().optional(),
})
export type FileServerEvent = z.infer<typeof eventSchema>

export const fileProxySchema = z.discriminatedUnion("proxy_type", [
  z.object({
    file_proxy_id: z.string(),
    proxy_type: z.literal("disk"),
    disk_path: z.string(),
    matching_pattern: z.string(),
    created_at: z.string(),
  }),
  z.object({
    file_proxy_id: z.string(),
    proxy_type: z.literal("http"),
    http_target_url: z.string(),
    matching_pattern: z.string(),
    created_at: z.string(),
  }),
])
export type FileProxy = z.infer<typeof fileProxySchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(0),
  files: z.array(fileSchema).default([]),
  events: z.array(eventSchema).default([]),
  file_proxies: z.array(fileProxySchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
