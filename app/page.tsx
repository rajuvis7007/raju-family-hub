'use client'

import Link from 'next/link'
import { useFamily } from './context/FamilyContext'
import { useTasks } from './context/TasksContext'

function TodayDate() {
  const today = new Date()
  return (
    <span>
      {today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </span>
  )
}

const PLACEHOLDER_EVENTS = [
  { id: 1, title: "Amrita's recital", date: 'Sat, May 18', emoji: '🎵' },
  { id: 2, title: 'Family dinner', date: 'Sun, May 19', emoji: '🍽️' },
  { id: 3, title: "Shreya's exam", date: 'Mon, May 20', emoji: '📝' },
]

export default function DashboardPage() {
  const { members, activeMember, setActiveMember } = useFamily()
  const { tasks } = useTasks()

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))
  const recentOpenTasks = tasks.filter((t) => !t.done).slice(0, 4)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          <TodayDate />
        </p>
      </div>

      {/* Family Members */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Family Members
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {members.map((member) => {
            const isActive = activeMember?.id === member.id
            return (
              <button
                key={member.id}
                onClick={() => setActiveMember(isActive ? null : member)}
                className={`group flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all duration-200 hover:shadow-md ${
                  isActive
                    ? `${member.colors.bgLight} ${member.colors.border} shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm ring-4 ring-white transition-transform duration-200 group-hover:scale-105 ${member.colors.bg}`}
                >
                  {member.initials}
                </span>
                <span
                  className={`text-sm font-semibold transition-colors ${
                    isActive ? member.colors.text : 'text-slate-700'
                  }`}
                >
                  {member.name}
                </span>
                {isActive && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${member.colors.bgLight} ${member.colors.text}`}
                  >
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Tasks
            </h2>
            <Link
              href="/tasks"
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {tasks.filter((t) => !t.done).length} open →
            </Link>
          </div>
          {recentOpenTasks.length === 0 ? (
            <p className="text-sm text-slate-400">All tasks complete!</p>
          ) : (
            <ul className="space-y-3">
              {recentOpenTasks.map((task) => {
                const member = memberById[task.memberId]
                return (
                  <li key={task.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${member?.colors.bg ?? 'bg-slate-400'}`}
                    >
                      {member?.initials ?? '?'}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{task.title}</span>
                    {task.dueDate && (
                      <span className="text-xs text-slate-400">
                        {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Upcoming Events */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Coming Up
            </h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
              {PLACEHOLDER_EVENTS.length} events
            </span>
          </div>
          <ul className="space-y-3">
            {PLACEHOLDER_EVENTS.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-xl">{event.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500">{event.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
