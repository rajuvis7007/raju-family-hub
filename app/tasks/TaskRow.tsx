'use client'

import type { Task } from '../context/TasksContext'
import type { FamilyMember } from '../context/FamilyContext'

type Props = {
  task: Task
  member: FamilyMember | undefined
  onToggle: () => void
  onDelete: () => void
}

type DueDateInfo = { label: string; className: string }

function getDueDateInfo(dueDate: string | null, done: boolean): DueDateInfo | null {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00') // local midnight, avoids UTC shift
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (done) return { label: formatted, className: 'bg-slate-100 text-slate-400' }
  if (diffDays < 0)  return { label: `Overdue · ${formatted}`, className: 'bg-red-50 text-red-500' }
  if (diffDays === 0) return { label: 'Today',    className: 'bg-amber-50 text-amber-600 font-semibold' }
  if (diffDays === 1) return { label: 'Tomorrow', className: 'bg-amber-50 text-amber-500' }
  return { label: formatted, className: 'bg-slate-100 text-slate-500' }
}

export function TaskRow({ task, member, onToggle, onDelete }: Props) {
  const dueDateInfo = getDueDateInfo(task.dueDate, task.done)

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 ${
        task.done ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-full"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150 ${
            task.done
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          {task.done && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </span>
      </button>

      {/* Title */}
      <span
        className={`min-w-0 flex-1 text-sm leading-relaxed ${
          task.done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'
        }`}
      >
        {task.title}
      </span>

      {/* Member badge — hidden on very small screens */}
      {member && (
        <span
          className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium sm:flex ${member.colors.bgLight} ${member.colors.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${member.colors.bg}`} />
          {member.name}
        </span>
      )}

      {/* Due date badge */}
      {dueDateInfo && (
        <span
          className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs sm:inline-flex ${dueDateInfo.className}`}
        >
          {dueDateInfo.label}
        </span>
      )}

      {/* Mobile: colored dot for member */}
      {member && (
        <span className={`sm:hidden h-2 w-2 shrink-0 rounded-full ${member.colors.bg}`} />
      )}

      {/* Delete — appears on hover */}
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-red-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  )
}
