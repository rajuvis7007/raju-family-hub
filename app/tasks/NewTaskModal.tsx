'use client'

import { useEffect, useRef, useState } from 'react'
import { useFamily } from '../context/FamilyContext'
import { useTasks, type AttachmentFile, type AttachmentMediaType, type Task, validateAttachmentSize } from '../context/TasksContext'
import { useToast } from '../context/ToastContext'

type Props = {
  onClose: () => void
  task?: Task
}

type PickedFile = { file: File; mediaType: AttachmentMediaType }

function detectMediaType(file: File): AttachmentMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'pdf'
}

function AttachmentIcon({ type }: { type: AttachmentMediaType }) {
  switch (type) {
    case 'image':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      )
    case 'video':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )
    case 'audio':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      )
    case 'pdf':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
  }
}

export function NewTaskModal({ onClose, task }: Props) {
  const { members } = useFamily()
  const { addTask, updateTask } = useTasks()
  const { addToast } = useToast()
  const isEditing = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [memberId, setMemberId] = useState<string | null>(task?.memberId ?? null)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [attachments, setAttachments] = useState<PickedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const canSubmit = title.trim().length > 0 && memberId !== null && !isSubmitting

  function handleBackdropKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  function pickFiles(files: FileList | null) {
    if (!files) return
    const picked: PickedFile[] = []
    for (const file of Array.from(files)) {
      const mediaType = detectMediaType(file)
      const err = validateAttachmentSize(file, mediaType)
      if (err) { addToast(err, 'error'); continue }
      picked.push({ file, mediaType })
    }
    setAttachments((prev) => [...prev, ...picked])
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    if (isEditing) {
      await updateTask(task!.id, { title: title.trim(), memberId: memberId!, dueDate: dueDate || null })
    } else {
      const files: AttachmentFile[] = attachments.map(({ file, mediaType }) => ({ file, mediaType }))
      const { failedNames } = await addTask({ title: title.trim(), memberId: memberId!, dueDate: dueDate || null }, files)
      if (failedNames.length > 0) {
        addToast(`${failedNames.length} attachment${failedNames.length > 1 ? 's' : ''} failed to upload`, 'error')
      }
    }
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleBackdropKeyDown}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-slate-900">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">Task</label>
            <input
              ref={titleRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Assign to */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Assign to</p>
            <div className="grid grid-cols-4 gap-2">
              {members.map((member) => {
                const selected = memberId === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setMemberId(selected ? null : member.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all ${
                      selected
                        ? `${member.colors.border} ${member.colors.bgLight} ${member.colors.text}`
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white ${member.colors.bg}`}>
                      {member.initials}
                    </span>
                    {member.name}
                    {selected && <span className={`-mt-1 h-1.5 w-1.5 rounded-full ${member.colors.bg}`} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label htmlFor="due-date" className="block text-sm font-medium text-slate-700">
              Due Date <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Attachments — only when creating */}
          {!isEditing && <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Attachments <span className="font-normal text-slate-400">(optional)</span>
            </p>

            {/* Picked files list */}
            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map(({ file, mediaType }, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-slate-400">
                      <AttachmentIcon type={mediaType} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-2.5 text-sm text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              {attachments.length > 0 ? 'Add more files…' : 'Attach files…'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => pickFiles(e.target.files)}
            />
          </div>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (isEditing ? 'Saving…' : 'Adding…') : (isEditing ? 'Save Changes' : 'Add Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
