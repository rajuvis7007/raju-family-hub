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

// ── File size limits ──────────────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES: Record<AttachmentMediaType, number> = {
  image: 20  * 1024 * 1024,  // 20 MB
  video: 200 * 1024 * 1024,  // 200 MB
  audio: 20  * 1024 * 1024,  // 20 MB
  pdf:   20  * 1024 * 1024,  // 20 MB
}

export function validateAttachmentSize(file: File, mediaType: AttachmentMediaType): string | null {
  const limit = MAX_ATTACHMENT_BYTES[mediaType]
  if (file.size > limit) {
    const mb = Math.round(limit / 1024 / 1024)
    return `"${file.name}" exceeds the ${mb} MB limit for ${mediaType} files`
  }
  return null
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const TASK_ATTACHMENTS_BUCKET = 'task-attachments'
const DONE_PAGE_SIZE = 20

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
    id:        row.id as string,
    title:     row.title as string,
    memberId:  row.member_id as string,
    dueDate:   (row.due_date as string | null) ?? null,
    done:      row.done as boolean,
    createdAt: row.created_at as string,
    attachments,
  }
}

// ── Upload helper (shared by addTask / addAttachments) ────────────────────────

async function uploadAttachmentFiles(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  taskId: string,
  memberId: string,
  files: AttachmentFile[],
): Promise<{ attachments: TaskAttachment[]; failedNames: string[] }> {
  const attachments: TaskAttachment[] = []
  const failedNames: string[] = []

  for (const { file, mediaType } of files) {
    const path = buildAttachmentPath(taskId, file)

    const { error: storageErr } = await supabase.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (storageErr) { failedNames.push(file.name); continue }

    const { data: { publicUrl } } = supabase.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .getPublicUrl(path)

    const { data: attachRow, error: dbErr } = await supabase
      .from('task_attachments')
      .insert({
        task_id:               taskId,
        storage_url:           publicUrl,
        file_name:             file.name,
        media_type:            mediaType,
        uploaded_by_member_id: memberId,
      })
      .select()
      .single()

    if (dbErr || !attachRow) { failedNames.push(file.name); continue }

    attachments.push(rowToAttachment(attachRow as AnyRow))
  }

  return { attachments, failedNames }
}

// ── Context ───────────────────────────────────────────────────────────────────

type ContextValue = {
  tasks: Task[]
  isLoading: boolean
  hasMoreDone: boolean
  isLoadingMore: boolean
  addTask: (input: AddTaskInput, files: AttachmentFile[]) => Promise<{ failedNames: string[] }>
  addAttachments: (taskId: string, memberId: string, files: AttachmentFile[]) => Promise<{ failedNames: string[] }>
  loadMoreDone: () => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

const TasksContext = createContext<ContextValue>({} as ContextValue)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks]               = useState<Task[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [hasMoreDone, setHasMoreDone]   = useState(false)
  const [doneOffset, setDoneOffset]     = useState(DONE_PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) { setIsLoading(false); return }

    // All open tasks + first page of done tasks
    const [openRes, doneRes, countRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, task_attachments(*)')
        .eq('done', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*, task_attachments(*)')
        .eq('done', true)
        .order('created_at', { ascending: false })
        .range(0, DONE_PAGE_SIZE - 1),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('done', true),
    ])

    const toTask = (row: AnyRow) => {
      const attachRows = (row.task_attachments as AnyRow[] | undefined) ?? []
      return rowToTask(row, attachRows.map(rowToAttachment))
    }

    const open = ((openRes.data ?? []) as AnyRow[]).map(toTask)
    const done = ((doneRes.data ?? []) as AnyRow[]).map(toTask)
    const doneTotal = countRes.count ?? 0

    setTasks([...open, ...done])
    setHasMoreDone(doneTotal > DONE_PAGE_SIZE)
    setDoneOffset(DONE_PAGE_SIZE)
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── loadMoreDone ──────────────────────────────────────────────────────────

  const loadMoreDone = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase || isLoadingMore) return
    setIsLoadingMore(true)

    const [res, countRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, task_attachments(*)')
        .eq('done', true)
        .order('created_at', { ascending: false })
        .range(doneOffset, doneOffset + DONE_PAGE_SIZE - 1),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('done', true),
    ])

    const toTask = (row: AnyRow) => {
      const attachRows = (row.task_attachments as AnyRow[] | undefined) ?? []
      return rowToTask(row, attachRows.map(rowToAttachment))
    }

    const more = ((res.data ?? []) as AnyRow[]).map(toTask)
    const doneTotal = countRes.count ?? 0

    setTasks((prev) => [...prev, ...more])
    setDoneOffset((prev) => prev + DONE_PAGE_SIZE)
    setHasMoreDone(doneOffset + DONE_PAGE_SIZE < doneTotal)
    setIsLoadingMore(false)
  }, [doneOffset, isLoadingMore])

  // ── addTask ───────────────────────────────────────────────────────────────

  const addTask = useCallback(async (
    input: AddTaskInput,
    files: AttachmentFile[],
  ): Promise<{ failedNames: string[] }> => {
    const supabase = getSupabaseClient()
    if (!supabase) return { failedNames: [] }

    const { data: taskRow, error } = await supabase
      .from('tasks')
      .insert({ title: input.title, member_id: input.memberId, due_date: input.dueDate ?? null })
      .select()
      .single()

    if (error || !taskRow) return { failedNames: [] }

    const taskId = (taskRow as AnyRow).id as string
    const { attachments, failedNames } = await uploadAttachmentFiles(
      supabase, taskId, input.memberId, files,
    )

    setTasks((prev) => [rowToTask(taskRow as AnyRow, attachments), ...prev])
    return { failedNames }
  }, [])

  // ── addAttachments ────────────────────────────────────────────────────────

  const addAttachments = useCallback(async (
    taskId: string,
    memberId: string,
    files: AttachmentFile[],
  ): Promise<{ failedNames: string[] }> => {
    const supabase = getSupabaseClient()
    if (!supabase) return { failedNames: [] }

    const { attachments, failedNames } = await uploadAttachmentFiles(
      supabase, taskId, memberId, files,
    )

    if (attachments.length > 0) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id !== taskId ? t : { ...t, attachments: [...t.attachments, ...attachments] }
        )
      )
    }

    return { failedNames }
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
    <TasksContext.Provider value={{
      tasks, isLoading, hasMoreDone, isLoadingMore,
      addTask, addAttachments, loadMoreDone, toggleDone, deleteTask,
    }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  return useContext(TasksContext)
}
