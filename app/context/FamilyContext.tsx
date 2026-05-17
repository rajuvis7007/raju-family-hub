'use client'

import { createContext, useContext, useState } from 'react'

export type FamilyMember = {
  id: string
  name: string
  initials: string
  colors: {
    bg: string
    bgLight: string
    text: string
    border: string
    ring: string
  }
}

const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'raju',
    name: 'Raju',
    initials: 'R',
    colors: {
      bg: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      ring: 'ring-indigo-500',
    },
  },
  {
    id: 'joshna',
    name: 'Joshna',
    initials: 'J',
    colors: {
      bg: 'bg-rose-500',
      bgLight: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-200',
      ring: 'ring-rose-500',
    },
  },
  {
    id: 'amrita',
    name: 'Amrita',
    initials: 'Am',
    colors: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      ring: 'ring-emerald-500',
    },
  },
  {
    id: 'shreya',
    name: 'Shreya',
    initials: 'Sh',
    colors: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      ring: 'ring-amber-500',
    },
  },
]

type FamilyContextType = {
  members: FamilyMember[]
  activeMember: FamilyMember | null
  setActiveMember: (member: FamilyMember | null) => void
}

const FamilyContext = createContext<FamilyContextType>({
  members: FAMILY_MEMBERS,
  activeMember: null,
  setActiveMember: () => {},
})

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null)

  return (
    <FamilyContext.Provider value={{ members: FAMILY_MEMBERS, activeMember, setActiveMember }}>
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamily() {
  return useContext(FamilyContext)
}
