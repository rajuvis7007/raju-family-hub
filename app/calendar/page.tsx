'use client'

import { useMemo, useState } from 'react'
import { useFamily } from '../context/FamilyContext'
import { useCalendar, type CalendarEvent } from '../context/CalendarContext'
import { useTasks, type Task } from '../context/TasksContext'
import type { FamilyMember } from '../context/FamilyContext'

// ── Utilities ─────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function generateCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay() // 0 = Sunday
  const origin = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) =>
    new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + i)
  )
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── EventChip (in day cell) ───────────────────────────────────────────────────

function EventChip({ event, member }: { event: CalendarEvent; member: FamilyMember | undefined }) {
  return (
    <div className={`truncate rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${member?.colors.bg ?? 'bg-slate-400'}`}>
      {event.startTime && (
        <span className="mr-0.5 opacity-80">{formatTime(event.startTime)}</span>
      )}
      {event.title}
    </div>
  )
}

// ── TaskChip (in day cell) ────────────────────────────────────────────────────

function TaskChip({ task, member }: { task: Task; member: FamilyMember | undefined }) {
  return (
    <div className={`flex items-center gap-1 truncate rounded px-2 py-0.5 text-[10px] ${
      task.done
        ? 'bg-slate-100 text-slate-400 line-through'
        : `${member?.colors.bgLight ?? 'bg-slate-100'} ${member?.colors.text ?? 'text-slate-600'}`
    }`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${task.done ? 'bg-slate-300' : (member?.colors.bg ?? 'bg-slate-400')}`} />
      <span className="truncate">{task.title}</span>
    </div>
  )
}

// ── DayCell ───────────────────────────────────────────────────────────────────

type DayCellProps = {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  tasks: Task[]
  memberById: Record<string, FamilyMember | undefined>
  onClick: () => void
}

function DayCell({ date, isCurrentMonth, isToday, events, tasks, memberById, onClick }: DayCellProps) {
  const allItems = [
    ...events.map((e) => ({ kind: 'event' as const, data: e })),
    ...tasks.map((t)  => ({ kind: 'task'  as const, data: t })),
  ]
  const shown    = allItems.slice(0, 3)
  const overflow = allItems.length - shown.length

  return (
    <div
      onClick={isCurrentMonth ? onClick : undefined}
      className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 transition-colors ${
        isCurrentMonth
          ? 'cursor-pointer hover:bg-indigo-50/50'
          : 'bg-slate-50/50 cursor-default'
      }`}
    >
      {/* Day number */}
      <div className="mb-1">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isToday
            ? 'bg-indigo-600 text-white'
            : isCurrentMonth
              ? 'text-slate-700'
              : 'text-slate-300'
        }`}>
          {date.getDate()}
        </span>
      </div>

      {/* Chips */}
      {isCurrentMonth && (
        <div className="space-y-0.5 overflow-hidden">
          {shown.map((item, i) =>
            item.kind === 'event' ? (
              <EventChip key={i} event={item.data} member={memberById[item.data.memberId]} />
            ) : (
              <TaskChip key={i} task={item.data} member={memberById[item.data.memberId]} />
            )
          )}
          {overflow > 0 && (
            <p className="pl-1 text-[10px] text-slate-400">+{overflow} more</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── DayDetailModal ────────────────────────────────────────────────────────────

type DayDetailProps = {
  dateStr: string
  events: CalendarEvent[]
  tasks: Task[]
  memberById: Record<string, FamilyMember | undefined>
  onAddEvent: () => void
  onDeleteEvent: (id: string) => void
  onClose: () => void
}

function DayDetailModal({ dateStr, events, tasks, memberById, onAddEvent, onDeleteEvent, onClose }: DayDetailProps) {
  const { toggleDone } = useTasks()
  const isEmpty = events.length === 0 && tasks.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{formatDisplayDate(dateStr)}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddEvent}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Event
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isEmpty && (
            <p className="py-6 text-center text-sm text-slate-400">Nothing scheduled — add an event!</p>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Events</p>
              {events.map((ev) => {
                const member = memberById[ev.memberId]
                return (
                  <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${member?.colors.bg ?? 'bg-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{ev.title}</p>
                      {(ev.startTime || ev.endTime) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatTime(ev.startTime)}
                          {ev.endTime && ` – ${formatTime(ev.endTime)}`}
                        </p>
                      )}
                      {ev.description && (
                        <p className="mt-1 text-xs text-slate-400">{ev.description}</p>
                      )}
                      {member && (
                        <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${member.colors.bgLight} ${member.colors.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.colors.bg}`} />
                          {member.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteEvent(ev.id)}
                      className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400"
                      aria-label="Delete event"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tasks due */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Tasks Due</p>
              {tasks.map((task) => {
                const member = memberById[task.memberId]
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <button onClick={() => toggleDone(task.id)} className="shrink-0">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
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
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
                        {task.title}
                      </p>
                      {member && (
                        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${member.colors.bgLight} ${member.colors.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.colors.bg}`} />
                          {member.name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CreateEventModal ──────────────────────────────────────────────────────────

type CreateEventProps = {
  defaultDate: string
  onClose: () => void
}

function CreateEventModal({ defaultDate, onClose }: CreateEventProps) {
  const { members } = useFamily()
  const { createEvent } = useCalendar()

  const [title, setTitle]           = useState('')
  const [eventDate, setEventDate]   = useState(defaultDate)
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [description, setDescription] = useState('')
  const [memberId, setMemberId]     = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = title.trim().length > 0 && eventDate.length > 0 && memberId !== null && !isSubmitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    await createEvent({
      title:       title.trim(),
      description: description.trim() || null,
      eventDate,
      startTime:   startTime || null,
      endTime:     endTime   || null,
      memberId:    memberId!,
    })
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Event</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Event</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening?"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Date + start + end */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Start <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  End <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details…"
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Member picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">For</p>
            <div className="grid grid-cols-4 gap-2">
              {members.map((m) => {
                const sel = memberId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemberId(sel ? null : m.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs font-medium transition-all ${
                      sel
                        ? `${m.colors.border} ${m.colors.bgLight} ${m.colors.text}`
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${m.colors.bg}`}>
                      {m.initials}
                    </span>
                    {m.name}
                  </button>
                )
              })}
            </div>
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
              {isSubmitting ? 'Saving…' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CalendarPage ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { members }                                  = useFamily()
  const { events, isLoading: eventsLoading, eventsError, deleteEvent } = useCalendar()
  const { tasks }                                    = useTasks()

  const [viewDate, setViewDate]       = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [createForDate, setCreateForDate] = useState('')

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayYMD = toYMD(new Date())

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  )

  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.eventDate]) map[ev.eventDate] = []
      map[ev.eventDate].push(ev)
    }
    return map
  }, [events])

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of tasks) {
      if (task.dueDate) {
        if (!map[task.dueDate]) map[task.dueDate] = []
        map[task.dueDate].push(task)
      }
    }
    return map
  }, [tasks])

  function openCreate(dateStr: string) {
    setCreateForDate(dateStr)
    setSelectedDay(null)
    setShowCreate(true)
  }

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []
  const selectedTasks  = selectedDay ? (tasksByDate[selectedDay]  ?? []) : []

  // Member color legend entries (only members with events/tasks this month)
  const activeMemberIds = useMemo(() => {
    const ids = new Set<string>()
    calendarDays.forEach((date) => {
      if (date.getMonth() !== month) return
      const ymd = toYMD(date)
      eventsByDate[ymd]?.forEach((e) => ids.add(e.memberId))
      tasksByDate[ymd]?.forEach((t)  => ids.add(t.memberId))
    })
    return ids
  }, [calendarDays, eventsByDate, tasksByDate, month])

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4">
        {eventsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Failed to load events: {eventsError}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendar</h1>

            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Previous month"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="min-w-[150px] text-center text-sm font-semibold text-slate-700">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Next month"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button
                onClick={() => setViewDate(new Date())}
                className="ml-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                Today
              </button>
            </div>
          </div>

          <button
            onClick={() => openCreate(todayYMD)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Event
          </button>
        </div>

        {/* Calendar grid */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {eventsLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-400">
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((date, i) => {
                const ymd = toYMD(date)
                const isCurrentMonth = date.getMonth() === month
                return (
                  <DayCell
                    key={i}
                    date={date}
                    isCurrentMonth={isCurrentMonth}
                    isToday={ymd === todayYMD}
                    events={isCurrentMonth ? (eventsByDate[ymd] ?? []) : []}
                    tasks={isCurrentMonth  ? (tasksByDate[ymd]  ?? []) : []}
                    memberById={memberById}
                    onClick={() => setSelectedDay(ymd)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Member legend */}
        {activeMemberIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-1">
            {members.filter((m) => activeMemberIds.has(m.id)).map((m) => (
              <span key={m.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-full ${m.colors.bg}`} />
                {m.name}
              </span>
            ))}
            <span className="text-xs text-slate-400">· click any day for details</span>
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay}
          events={selectedEvents}
          tasks={selectedTasks}
          memberById={memberById}
          onAddEvent={() => openCreate(selectedDay)}
          onDeleteEvent={deleteEvent}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Create event modal */}
      {showCreate && (
        <CreateEventModal
          defaultDate={createForDate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
