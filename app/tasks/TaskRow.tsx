'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import type { Task, TaskAttachment, AttachmentMediaType, AttachmentFile } from '../context/TasksContext'
import { validateAttachmentSize } from '../context/TasksContext'
import { useToast } from '../context/ToastContext'
import type { FamilyMember } from '../context/FamilyContext'

type Props = {
  task: Task
  member: FamilyMember | undefined
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  onAddAttachments: (files: AttachmentFile[]) => Promise<{ failedNames: string[] }>
}

function detectMediaType(file: File): AttachmentMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'pdf'
}

type DueDateInfo = { label: string; className: string }

function getDueDateInfo(dueDate: string | null, done: boolean): DueDateInfo | null {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (done)          return { label: formatted,             className: 'bg-slate-100 text-slate-400' }
  if (diffDays < 0)  return { label: `Overdue · ${formatted}`, className: 'bg-red-50 text-red-500' }
  if (diffDays === 0) return { label: 'Today',              className: 'bg-amber-50 text-amber-600 font-semibold' }
  if (diffDays === 1) return { label: 'Tomorrow',           className: 'bg-amber-50 text-amber-500' }
  return { label: formatted, className: 'bg-slate-100 text-slate-500' }
}

// ── Attachment chip ───────────────────────────────────────────────────────────

function AttachmentChip({ attachment }: { attachment: TaskAttachment }) {
  const { storageUrl, fileName, mediaType } = attachment

  if (mediaType === 'audio') {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
        <svg className="h-3.5 w-3.5 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
        <audio src={storageUrl} controls className="h-6 max-w-[180px]" />
      </div>
    )
  }

  if (mediaType === 'pdf') {
    return (
      <a
        href={storageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="max-w-[140px] truncate">{fileName}</span>
      </a>
    )
  }

  if (mediaType === 'image') {
    return (
      <a
        href={storageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 block hover:opacity-80 transition-opacity"
        title={fileName}
      >
        <Image
          src={storageUrl}
          alt={fileName}
          fill
          className="object-cover"
          sizes="40px"
        />
      </a>
    )
  }

  // video
  return (
    <a
      href={storageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 block hover:opacity-80 transition-opacity"
      title={fileName}
    >
      <video
        src={storageUrl}
        className="h-full w-full object-cover"
        muted
        preload="metadata"
        playsInline
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-black/50 p-1">
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </div>
      </div>
    </a>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

export function TaskRow({ task, member, onToggle, onDelete, onEdit, onAddAttachments }: Props) {
  const { addToast } = useToast()
  const dueDateInfo = getDueDateInfo(task.dueDate, task.done)
  const hasAttachments = task.attachments.length > 0
  const [isUploading, setIsUploading] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files: AttachmentFile[] = []
    for (const f of Array.from(fileList)) {
      const mediaType = detectMediaType(f)
      const err = validateAttachmentSize(f, mediaType)
      if (err) { addToast(err, 'error'); continue }
      files.push({ file: f, mediaType })
    }
    if (files.length === 0) return
    setIsUploading(true)
    const { failedNames } = await onAddAttachments(files)
    if (failedNames.length > 0) {
      addToast(`${failedNames.length} attachment${failedNames.length > 1 ? 's' : ''} failed to upload`, 'error')
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={`group flex gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 ${task.done ? 'opacity-60' : ''}`}>
      {/* Checkbox — large touch target via padding */}
      <button
        onClick={onToggle}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        className="-m-2 mt-[-0.125rem] shrink-0 rounded-full p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150 ${
          task.done
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
        }`}>
          {task.done && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </span>
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <span className={`min-w-0 flex-1 text-sm leading-relaxed ${
            task.done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'
          }`}>
            {task.title}
          </span>

          {member && (
            <span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium sm:flex ${member.colors.bgLight} ${member.colors.text}`}>
              <span className={`h-2 w-2 rounded-full ${member.colors.bg}`} />
              {member.name}
            </span>
          )}

          {dueDateInfo && (
            <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs sm:inline-flex ${dueDateInfo.className}`}>
              {dueDateInfo.label}
            </span>
          )}

          {member && (
            <span className={`sm:hidden h-2 w-2 shrink-0 rounded-full ${member.colors.bg}`} />
          )}

          {/* Mobile: ⋯ toggles actions. Desktop: actions shown on hover. */}
          <button
            onClick={() => setActionsOpen((v) => !v)}
            aria-label="More actions"
            className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-500 sm:hidden"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Attach button */}
          <button
            onClick={() => { fileInputRef.current?.click(); setActionsOpen(false) }}
            disabled={isUploading}
            aria-label="Attach file"
            className={`shrink-0 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-indigo-50 hover:text-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 ${actionsOpen ? 'opacity-100' : 'hidden sm:flex'}`}
          >
            {isUploading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <button
            onClick={() => { onEdit(); setActionsOpen(false) }}
            aria-label="Edit task"
            className={`shrink-0 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-300 sm:opacity-0 sm:group-hover:opacity-100 ${actionsOpen ? 'opacity-100' : 'hidden sm:flex'}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>

          <button
            onClick={() => { onDelete(); setActionsOpen(false) }}
            aria-label="Delete task"
            className={`shrink-0 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-red-50 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-300 sm:opacity-0 sm:group-hover:opacity-100 ${actionsOpen ? 'opacity-100' : 'hidden sm:flex'}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Attachments row */}
        {hasAttachments && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
