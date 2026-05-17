'use client'

import { useMemo, useState } from 'react'
import { useFamily } from '../context/FamilyContext'
import { useTasks } from '../context/TasksContext'
import { MemberFilter } from './MemberFilter'
import { TaskRow } from './TaskRow'
import { NewTaskModal } from './NewTaskModal'

export default function TasksPage() {
  const { members } = useFamily()
  const { tasks, toggleDone, deleteTask } = useTasks()

  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  )

  const filtered = useMemo(
    () => (filterMemberId ? tasks.filter((t) => t.memberId === filterMemberId) : tasks),
    [tasks, filterMemberId]
  )

  // Incomplete tasks sorted by due date (nulls last), then completed tasks
  const { open, done } = useMemo(() => {
    const open = filtered
      .filter((t) => !t.done)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    const done = filtered.filter((t) => t.done)
    return { open, done }
  }, [filtered])

  const totalOpen = tasks.filter((t) => !t.done).length
  const totalDone = tasks.filter((t) => t.done).length
  const isEmpty = open.length === 0 && done.length === 0

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {totalOpen} open · {totalDone} completed
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Task
          </button>
        </div>

        {/* Filter bar */}
        <MemberFilter activeFilter={filterMemberId} onChange={setFilterMemberId} />

        {/* Task list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-7 w-7 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">All clear!</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {filterMemberId
                    ? `No tasks assigned to ${memberById[filterMemberId]?.name ?? 'this member'}`
                    : 'No tasks yet — add one to get started'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add a task
              </button>
            </div>
          ) : (
            <>
              {/* Open section */}
              {open.length > 0 && (
                <section>
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Open · {open.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {open.map((task) => (
                      <li key={task.id}>
                        <TaskRow
                          task={task}
                          member={memberById[task.memberId]}
                          onToggle={() => toggleDone(task.id)}
                          onDelete={() => deleteTask(task.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Completed section */}
              {done.length > 0 && (
                <section className={open.length > 0 ? 'border-t border-slate-200' : ''}>
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Completed · {done.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {done.map((task) => (
                      <li key={task.id}>
                        <TaskRow
                          task={task}
                          member={memberById[task.memberId]}
                          onToggle={() => toggleDone(task.id)}
                          onDelete={() => deleteTask(task.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && <NewTaskModal onClose={() => setShowModal(false)} />}
    </>
  )
}
