import { z } from "zod"

export const fileSchema = z.object({
  file_id: z.string(),
  file_path: z.string(),
  text_content: z.string(),
  created_at: z.string(),
})
export type File = z.infer<typeof fileSchema>

export const eventSchema = z.object({
  event_id: z.string(),
  event_type: z.literal("FILE_UPDATED"),
  file_path: z.string(),
  created_at: z.string(),
})
export type FileServerEvent = z.infer<typeof eventSchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(0),
  files: z.array(fileSchema).default([]),
  events: z.array(eventSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
