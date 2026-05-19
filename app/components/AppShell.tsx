'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { useFamily } from '../context/FamilyContext'
import { useNotifications } from '../context/NotificationsContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeMember } = useFamily()
  const { permission, urgentCount, requestPermission } = useNotifications()

  return (
    <div className="flex h-full">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content area — offset by sidebar width on desktop */}
      <div className="flex min-h-full flex-1 flex-col lg:pl-64">
        {/* Top bar — mobile shows hamburger + logo; desktop shows bell + member only */}
        <header
          className="sticky top-0 z-40 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}
        >
          {/* Hamburger + logo — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900">Raju Family</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <button
              onClick={requestPermission}
              title={permission === 'granted' ? 'Reminders on' : permission === 'denied' ? 'Reminders blocked' : 'Enable reminders'}
              className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              {permission === 'granted' ? (
                <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              )}
              {urgentCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {urgentCount > 9 ? '9+' : urgentCount}
                </span>
              )}
            </button>

            {activeMember && (
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${activeMember.colors.bg}`}>
                {activeMember.initials}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
