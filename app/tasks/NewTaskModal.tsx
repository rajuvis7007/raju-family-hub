'use client'

import { useState, useEffect, useRef } from 'react'
import { useFamily } from '../context/FamilyContext'
import { useTasks } from '../context/TasksContext'

type Props = {
  onClose: () => void
}

export function NewTaskModal({ onClose }: Props) {
  const { members } = useFamily()
  const { addTask } = useTasks()

  const [title, setTitle] = useState('')
  const [memberId, setMemberId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)

  // Focus first field and lock body scroll
  useEffect(() => {
    titleRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Local YYYY-MM-DD for the min attribute on the date input
  const todayMin = new Date().toLocaleDateString('en-CA')

  const canSubmit = title.trim().length > 0 && memberId !== null

  function handleBackdropKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    addTask({
      title: title.trim(),
      memberId: memberId!,
      dueDate: dueDate || null,
      done: false,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleBackdropKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-slate-900">
            New Task
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Task title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">
              Task
            </label>
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
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white ${member.colors.bg}`}
                    >
                      {member.initials}
                    </span>
                    {member.name}
                    {selected && (
                      <span className={`-mt-1 h-1.5 w-1.5 rounded-full ${member.colors.bg}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label htmlFor="due-date" className="block text-sm font-medium text-slate-700">
              Due Date{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={todayMin}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

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
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
