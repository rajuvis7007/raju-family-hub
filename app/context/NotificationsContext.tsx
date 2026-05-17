'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useTasks } from './TasksContext'
import { useCalendar } from './CalendarContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PREFIX = 'rfdb_notif_'

function todayYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function minutesUntil(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 60_000)
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function hasFired(key: string): boolean {
  try { return localStorage.getItem(PREFIX + key) === '1' } catch { return false }
}

function markFired(key: string) {
  try { localStorage.setItem(PREFIX + key, '1') } catch { /* ignore */ }
}

function pruneOldKeys(today: string) {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX) && !k.includes(today)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
}

// Deterministic numeric ID from a string key (LocalNotifications requires a number id)
function numericId(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 2_000_000_000
}

// ── Platform-aware fire function ──────────────────────────────────────────────

async function fire(title: string, body: string, key: string) {
  // Dynamic import keeps Capacitor out of the SSR/web bundle path entirely
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions()
        if (req.display !== 'granted') return
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: numericId(key),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) }, // fire immediately
        }],
      })
      return
    }
  } catch { /* not in Capacitor context — fall through to web */ }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico' })
}

// ── Context ───────────────────────────────────────────────────────────────────

type ContextValue = {
  permission: NotificationPermission | 'unsupported'
  urgentCount: number
  requestPermission: () => Promise<void>
}

const NotificationsContext = createContext<ContextValue>({
  permission: 'default',
  urgentCount: 0,
  requestPermission: async () => {},
})

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { tasks } = useTasks()
  const { events } = useCalendar()

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )

  const requestPermission = useCallback(async () => {
    // Native: request via LocalNotifications plugin
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const result = await LocalNotifications.requestPermissions()
        setPermission(result.display === 'granted' ? 'granted' : 'denied')
        return
      }
    } catch { /* not native */ }

    // Web: use browser Notification API
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }, [])

  // Auto-request on first load
  useEffect(() => {
    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm = await LocalNotifications.checkPermissions()
          if (perm.display === 'prompt') {
            const req = await LocalNotifications.requestPermissions()
            setPermission(req.display === 'granted' ? 'granted' : 'denied')
          } else {
            setPermission(perm.display === 'granted' ? 'granted' : 'denied')
          }
          return
        }
      } catch { /* not native */ }

      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission)
      }
    }
    init()
  }, [])

  const checkNotifications = useCallback(() => {
    const today = todayYMD()
    pruneOldKeys(today)

    // ── Tasks ─────────────────────────────────────────────────────────
    for (const task of tasks) {
      if (task.done || !task.dueDate) continue

      if (task.dueDate < today) {
        const key = `task_overdue_${task.id}_${today}`
        if (!hasFired(key)) {
          fire('Overdue task', `"${task.title}" was due on ${task.dueDate}`, key)
          markFired(key)
        }
      } else if (task.dueDate === today) {
        const key = `task_today_${task.id}_${today}`
        if (!hasFired(key)) {
          fire('Due today', `"${task.title}" is due today`, key)
          markFired(key)
        }
      }
    }

    // ── Events ────────────────────────────────────────────────────────
    for (const event of events) {
      if (event.eventDate !== today) continue

      const keyToday = `event_today_${event.id}_${today}`
      if (!hasFired(keyToday)) {
        const suffix = event.startTime ? ` at ${formatTime(event.startTime)}` : ''
        fire('Event today', `"${event.title}"${suffix}`, keyToday)
        markFired(keyToday)
      }

      if (event.startTime) {
        const mins = minutesUntil(event.startTime)
        if (mins >= 0 && mins <= 30) {
          const keySoon = `event_soon_${event.id}_${today}`
          if (!hasFired(keySoon)) {
            const msg = mins === 0
              ? `"${event.title}" is starting now`
              : `"${event.title}" starts in ${mins} minute${mins === 1 ? '' : 's'}`
            fire('Starting soon', msg, keySoon)
            markFired(keySoon)
          }
        }
      }
    }
  }, [tasks, events])

  // Run on mount and every 60 s
  useEffect(() => {
    checkNotifications()
    const id = setInterval(checkNotifications, 60_000)
    return () => clearInterval(id)
  }, [checkNotifications])

  // Badge count: open tasks due today or overdue + events today
  const today = todayYMD()
  const urgentCount =
    tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= today).length +
    events.filter((e) => e.eventDate === today).length

  return (
    <NotificationsContext.Provider value={{ permission, urgentCount, requestPermission }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
