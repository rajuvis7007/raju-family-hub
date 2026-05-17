'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttachmentMediaType = 'image' | 'video' | 'audio' | 'pdf'

export type TaskAttachment = {
  id: string
  taskId: string
  storageUrl: string
  fileName: string
  mediaType: AttachmentMediaType
  uploadedBy: string
  createdAt: string
}

export type Task = {
  id: string
  title: string
  memberId: string
  dueDate: string | null  // YYYY-MM-DD
  done: boolean
  createdAt: string
  attachments: TaskAttachment[]
}

export type AttachmentFile = {
  file: File
  mediaType: AttachmentMediaType
}

type AddTaskInput = {
  title: string
  memberId: string
  dueDate: string | null
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const TASK_ATTACHMENTS_BUCKET = 'task-attachments'

function buildAttachmentPath(taskId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const slug = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
  return `tasks/${taskId}/${Date.now()}_${slug}.${ext}`
}

// ── Row mappers ───────────────────────────────────────────────────────────────

type AnyRow = Record<string, unknown>

function rowToAttachment(row: AnyRow): TaskAttachment {
  return {
    id:         row.id as string,
    taskId:     row.task_id as string,
    storageUrl: row.storage_url as string,
    fileName:   row.file_name as string,
    mediaType:  row.media_type as AttachmentMediaType,
    uploadedBy: row.uploaded_by_member_id as string,
    createdAt:  row.created_at as string,
  }
}

function rowToTask(row: AnyRow, attachments: TaskAttachment[]): Task {
  return {
    id:          row.id as string,
    title:       row.title as string,
    memberId:    row.member_id as string,
    dueDate:     (row.due_date as string | null) ?? null,
    done:        row.done as boolean,
    createdAt:   row.created_at as string,
    attachments,
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

type ContextValue = {
  tasks: Task[]
  isLoading: boolean
  addTask: (input: AddTaskInput, files: AttachmentFile[]) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

const TasksContext = createContext<ContextValue>({} as ContextValue)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) { setIsLoading(false); return }

    const { data } = await supabase
      .from('tasks')
      .select('*, task_attachments(*)')
      .order('created_at', { ascending: false })

    const loaded = ((data ?? []) as AnyRow[]).map((row) => {
      const attachRows = (row.task_attachments as AnyRow[] | undefined) ?? []
      return rowToTask(row, attachRows.map(rowToAttachment))
    })

    setTasks(loaded)
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── addTask ───────────────────────────────────────────────────────────────

  const addTask = useCallback(async (input: AddTaskInput, files: AttachmentFile[]) => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    const { data: taskRow, error } = await supabase
      .from('tasks')
      .insert({ title: input.title, member_id: input.memberId, due_date: input.dueDate ?? null })
      .select()
      .single()

    if (error || !taskRow) return

    const taskId = (taskRow as AnyRow).id as string
    const attachments: TaskAttachment[] = []

    for (const { file, mediaType } of files) {
      const path = buildAttachmentPath(taskId, file)

      const { error: storageErr } = await supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (storageErr) continue

      const { data: { publicUrl } } = supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .getPublicUrl(path)

      const { data: attachRow } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          storage_url: publicUrl,
          file_name: file.name,
          media_type: mediaType,
          uploaded_by_member_id: input.memberId,
        })
        .select()
        .single()

      if (attachRow) attachments.push(rowToAttachment(attachRow as AnyRow))
    }

    setTasks((prev) => [rowToTask(taskRow as AnyRow, attachments), ...prev])
  }, [])

  // ── toggleDone ────────────────────────────────────────────────────────────

  const toggleDone = useCallback(async (id: string) => {
    const supabase = getSupabaseClient()

    let newDone = false
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t
      newDone = !t.done
      return { ...t, done: newDone }
    }))

    if (supabase) await supabase.from('tasks').update({ done: newDone }).eq('id', id)
  }, [])

  // ── deleteTask ────────────────────────────────────────────────────────────

  const deleteTask = useCallback(async (id: string) => {
    const supabase = getSupabaseClient()
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (supabase) await supabase.from('tasks').delete().eq('id', id)
  }, [])

  return (
    <TasksContext.Provider value={{ tasks, isLoading, addTask, toggleDone, deleteTask }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  return useContext(TasksContext)
}
