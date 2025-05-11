import { createStore } from "zustand/vanilla"
import { hoist } from "zustand-hoist"
import { combine } from "zustand/middleware"
import { databaseSchema, type File, type FileServerEvent } from "./schema.ts"

export const createDatabase = () => {
  return hoist(createStore(initializer))
}

export type DbClient = ReturnType<typeof createDatabase>

const initializer = combine(databaseSchema.parse({}), (set, get) => ({
  upsertFile: (file: Omit<File, "file_id">, opts: { initiator?: string }) => {
    set((state) => {
      const existingFileIndex = state.files.findIndex(
        (f) => f.file_path === file.file_path,
      )
      const newFile = {
        ...file,
        file_id:
          existingFileIndex >= 0
            ? state.files[existingFileIndex].file_id
            : state.idCounter.toString(),
        created_at:
          existingFileIndex >= 0
            ? state.files[existingFileIndex].created_at
            : new Date().toISOString(),
      }

      const files =
        existingFileIndex >= 0
          ? state.files.map((f, i) => (i === existingFileIndex ? newFile : f))
          : [...state.files, newFile]

      return {
        files,
        idCounter:
          existingFileIndex >= 0 ? state.idCounter : state.idCounter + 1,
      }
    })

    // @ts-ignore
    get().createEvent({
      event_type: "FILE_UPDATED",
      file_path: file.file_path,
      created_at: new Date().toISOString(),
      initiator: opts.initiator,
    })

    return get().files.find((f) => f.file_path === file.file_path)!
  },

  getFile: (query: { file_id?: string; file_path?: string }) => {
    const state = get()
    return state.files.find(
      (f) =>
        (query.file_id && f.file_id === query.file_id) ||
        (query.file_path && f.file_path === query.file_path),
    )
  },

  getFileByPath: (file_path: string) => {
    const state = get()
    return state.files.find((f) => f.file_path === file_path)
  },

  renameFile: (
    old_file_path: string,
    new_file_path: string,
    opts: { initiator?: string },
  ) => {
    let renamedFile: File | undefined
    set((state) => {
      const fileIndex = state.files.findIndex(
        (f) => f.file_path === old_file_path,
      )
      if (fileIndex === -1) return state

      const file = state.files[fileIndex]
      renamedFile = {
        ...file,
        file_path: new_file_path,
      }

      const files = state.files.map((f, i) =>
        i === fileIndex ? renamedFile! : f,
      )

      return {
        ...state,
        files,
      }
    })

    if (renamedFile) {
      // @ts-ignore
      get().createEvent({
        event_type: "FILE_UPDATED",
        file_path: new_file_path,
        created_at: new Date().toISOString(),
        initiator: opts.initiator,
      })
    }

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
          (query.file_path && f.file_path === query.file_path)
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
        ...state,
        files,
      }
    })

    if (deletedFile) {
      // @ts-ignore
      get().createEvent({
        event_type: "FILE_DELETED",
        file_path: deletedFile.file_path,
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

  listEvents: (since?: string) => {
    const state = get()
    if (!since) return state.events
    return state.events.filter((e) => e.created_at > since)
  },

  resetEvents: () => {
    set((state) => ({
      ...state,
      events: [],
    }))
  },
}))
