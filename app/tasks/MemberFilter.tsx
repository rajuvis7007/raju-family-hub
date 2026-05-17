'use client'

import { useFamily } from '../context/FamilyContext'
import { useTasks } from '../context/TasksContext'

type Props = {
  activeFilter: string | null
  onChange: (memberId: string | null) => void
}

export function MemberFilter({ activeFilter, onChange }: Props) {
  const { members } = useFamily()
  const { tasks } = useTasks()

  const allOpenCount = tasks.filter((t) => !t.done).length

  return (
    <div className="flex flex-wrap gap-2">
      {/* All pill */}
      <button
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          activeFilter === null
            ? 'bg-slate-900 text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        All
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
            activeFilter === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {allOpenCount}
        </span>
      </button>

      {/* Per-member pills */}
      {members.map((member) => {
        const active = activeFilter === member.id
        const count = tasks.filter((t) => !t.done && t.memberId === member.id).length
        return (
          <button
            key={member.id}
            onClick={() => onChange(active ? null : member.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? `${member.colors.bg} text-white shadow-sm`
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : `${member.colors.bg} text-white`
              }`}
            >
              {member.initials}
            </span>
            {member.name}
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                  active
                    ? 'bg-white/20 text-white'
                    : `${member.colors.bgLight} ${member.colors.text}`
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
