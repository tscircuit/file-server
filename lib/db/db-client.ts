import { createStore } from "zustand/vanilla"
import { hoist } from "zustand-hoist"
import { combine } from "zustand/middleware"
import { databaseSchema, type File, type FileServerEvent } from "./schema.ts"
import { normalizePath } from "../utils/normalize-path"

export const createDatabase = () => {
  return hoist(createStore(initializer))
}

export type DbClient = ReturnType<typeof createDatabase>

const initializer = combine(databaseSchema.parse({}), (set, get) => ({
  upsertFile: (file: Omit<File, "file_id">, opts: { initiator?: string }) => {
    const file_path = normalizePath(file.file_path)
    set((state) => {
      const existingFileIndex = state.files.findIndex(
        (f) => normalizePath(f.file_path) === file_path,
      )
      const newFile = {
        ...file,
        file_path,
        file_id:
          existingFileIndex >= 0
            ? state.files[existingFileIndex].file_id
            : state.idCounter.toString(),
        created_at:
          existingFileIndex >= 0
            ? state.files[existingFileIndex].created_at
            : new Date().toISOString(),
      }

      let files
      if (existingFileIndex >= 0) {
        files = [
          ...state.files.slice(0, existingFileIndex),
          newFile,
          ...state.files.slice(existingFileIndex + 1),
        ]
      } else {
        files = [...state.files, newFile]
      }

      return {
        files,
        idCounter:
          existingFileIndex >= 0 ? state.idCounter : state.idCounter + 1,
      }
    })

    // @ts-ignore
    get().createEvent({
      event_type: "FILE_UPDATED",
      file_path,
      created_at: new Date().toISOString(),
      initiator: opts.initiator,
    })

    return get().files.find((f) => normalizePath(f.file_path) === file_path)!
  },

  getFile: (query: { file_id?: string; file_path?: string }) => {
    const state = get()
    return state.files.find(
      (f) =>
        (query.file_id && f.file_id === query.file_id) ||
        (query.file_path &&
          normalizePath(f.file_path) === normalizePath(query.file_path!)),
    )
  },

  getFileByPath: (file_path: string) => {
    const state = get()
    const norm = normalizePath(file_path)
    return state.files.find((f) => normalizePath(f.file_path) === norm)
  },

  renameFile: (
    old_file_path: string,
    new_file_path: string,
    opts: { initiator?: string },
  ) => {
    let renamedFile: File | undefined
    const normOld = normalizePath(old_file_path)
    const normNew = normalizePath(new_file_path)
    set((state) => {
      const fileIndex = state.files.findIndex(
        (f) => normalizePath(f.file_path) === normOld,
      )
      if (fileIndex === -1) return state

      const file = state.files[fileIndex]
      renamedFile = {
        ...file,
        file_path: normNew,
      }

      const files = [
        ...state.files.slice(0, fileIndex),
        renamedFile,
        ...state.files.slice(fileIndex + 1),
      ]

      // Emit FILE_CREATED for new path
      state.events.push({
        event_id: (state.idCounter + 0).toString(),
        event_type: "FILE_CREATED",
        file_path: normNew,
        created_at: new Date().toISOString(),
        initiator: opts.initiator,
      })
      // Emit FILE_DELETED for old path
      state.events.push({
        event_id: (state.idCounter + 1).toString(),
        event_type: "FILE_DELETED",
        file_path: normOld,
        created_at: new Date().toISOString(),
        initiator: opts.initiator,
      })

      return {
        files,
        events: state.events,
        idCounter: state.idCounter + 2,
      }
    })

    return renamedFile
  },

  deleteFile: (
    query: { file_id?: string; file_path?: string },
    opts: { initiator?: string },
  ) => {
    let deletedFile: File | undefined
    set((state) => {
      const initialLength = state.files.length
      const files = state.files.filter((f) => {
        const match =
          (query.file_id && f.file_id === query.file_id) ||
          (query.file_path &&
            normalizePath(f.file_path) === normalizePath(query.file_path!))
        if (match) {
          deletedFile = f
        }
        return !match
      })

      if (files.length === initialLength) {
        // No file was deleted
        return state
      }

      return {
        files,
      }
    })

    if (deletedFile) {
      // @ts-ignore
      get().createEvent({
        event_type: "FILE_DELETED",
        file_path: normalizePath(deletedFile.file_path),
        created_at: new Date().toISOString(),
        initiator: opts.initiator,
      })
    }

    return deletedFile
  },

  createEvent: (event: Omit<FileServerEvent, "event_id">) => {
    set((state) => ({
      events: [
        ...state.events,
        { ...event, event_id: state.idCounter.toString() },
      ],
      idCounter: state.idCounter + 1,
    }))
    return get().events[get().events.length - 1]
  },

  listEvents: (params?: { since?: string; event_type?: string }) => {
    const state = get()
    const { since, event_type } = params ?? {}

    let events = state.events

    if (since) {
      events = events.filter((e) => e.created_at > since)
    }

    if (event_type) {
      events = events.filter((e) => e.event_type === event_type)
    }

    return events
  },

  resetEvents: () => {
    set((state) => ({
      ...state,
      events: [],
    }))
  },
}))
