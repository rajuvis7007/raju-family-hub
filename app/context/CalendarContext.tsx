'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  eventDate: string        // YYYY-MM-DD
  startTime: string | null // HH:MM
  endTime: string | null   // HH:MM
  memberId: string
  createdAt: string
}

export type CreateEventInput = {
  title: string
  description?: string | null
  eventDate: string
  startTime?: string | null
  endTime?: string | null
  memberId: string
}

// ── Row mapper ────────────────────────────────────────────────────────────────

type AnyRow = Record<string, unknown>

function rowToEvent(row: AnyRow): CalendarEvent {
  return {
    id:          row.id as string,
    title:       row.title as string,
    description: (row.description as string | null) ?? null,
    eventDate:   row.event_date as string,
    // Supabase returns time as "HH:MM:SS" — slice to "HH:MM"
    startTime:   row.start_time ? (row.start_time as string).slice(0, 5) : null,
    endTime:     row.end_time   ? (row.end_time   as string).slice(0, 5) : null,
    memberId:    row.member_id as string,
    createdAt:   row.created_at as string,
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

type ContextValue = {
  events: CalendarEvent[]
  isLoading: boolean
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent | null>
  deleteEvent: (id: string) => Promise<void>
}

const CalendarContext = createContext<ContextValue>({} as ContextValue)

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) { setIsLoading(false); return }

    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })

    setEvents(((data ?? []) as AnyRow[]).map(rowToEvent))
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const createEvent = useCallback(async (input: CreateEventInput): Promise<CalendarEvent | null> => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('events')
      .insert({
        title:       input.title,
        description: input.description ?? null,
        event_date:  input.eventDate,
        start_time:  input.startTime  ?? null,
        end_time:    input.endTime    ?? null,
        member_id:   input.memberId,
      })
      .select()
      .single()

    if (error || !data) return null

    const event = rowToEvent(data as AnyRow)
    setEvents((prev) =>
      [...prev, event].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    )
    return event
  }, [])

  const deleteEvent = useCallback(async (id: string) => {
    const supabase = getSupabaseClient()
    setEvents((prev) => prev.filter((e) => e.id !== id))
    if (supabase) await supabase.from('events').delete().eq('id', id)
  }, [])

  return (
    <CalendarContext.Provider value={{ events, isLoading, createEvent, deleteEvent }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  return useContext(CalendarContext)
}
