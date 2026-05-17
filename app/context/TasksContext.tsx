'use client'

import { createContext, useContext, useState } from 'react'

export type Task = {
  id: string
  title: string
  memberId: string
  dueDate: string | null  // YYYY-MM-DD
  done: boolean
  createdAt: string       // YYYY-MM-DD
}

type TasksContextType = {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void
  toggleDone: (id: string) => void
  deleteTask: (id: string) => void
}

const SEED_TASKS: Task[] = [
  { id: '1', title: 'Grocery run',              memberId: 'joshna', dueDate: '2026-05-16', done: false, createdAt: '2026-05-15' },
  { id: '2', title: 'Pick up dry cleaning',     memberId: 'raju',   dueDate: '2026-05-17', done: false, createdAt: '2026-05-15' },
  { id: '3', title: 'Doctor appointment',       memberId: 'raju',   dueDate: '2026-05-14', done: false, createdAt: '2026-05-13' },
  { id: '4', title: 'School project submission',memberId: 'amrita', dueDate: '2026-05-20', done: false, createdAt: '2026-05-14' },
  { id: '5', title: 'Music class practice',     memberId: 'shreya', dueDate: '2026-05-22', done: false, createdAt: '2026-05-14' },
  { id: '6', title: 'Order birthday cake',      memberId: 'joshna', dueDate: '2026-05-25', done: false, createdAt: '2026-05-15' },
  { id: '7', title: 'Plan weekend outing',      memberId: 'raju',   dueDate: '2026-05-18', done: true,  createdAt: '2026-05-10' },
  { id: '8', title: 'Library book return',      memberId: 'amrita', dueDate: '2026-05-13', done: true,  createdAt: '2026-05-10' },
]

const TasksContext = createContext<TasksContextType>({
  tasks: [],
  addTask: () => {},
  toggleDone: () => {},
  deleteTask: () => {},
})

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS)

  function addTask(task: Omit<Task, 'id' | 'createdAt'>) {
    const today = new Date()
    const createdAt = today.toLocaleDateString('en-CA') // YYYY-MM-DD, local time
    setTasks((prev) => [{ ...task, id: crypto.randomUUID(), createdAt }, ...prev])
  }

  function toggleDone(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <TasksContext.Provider value={{ tasks, addTask, toggleDone, deleteTask }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  return useContext(TasksContext)
}
