"use client"

export interface Member {
  id: string
  childName: string
  parentName: string
  email: string
  phone: string
  grade: string
  age: number
  joinDate: string
  isActive: boolean
  notes?: string
}

const MEMBERS_KEY = "chess-club-members"

export function getMembers(): Member[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(MEMBERS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveMember(member: Omit<Member, "id" | "joinDate">): Member {
  const members = getMembers()
  const newMember: Member = {
    ...member,
    id: generateId(),
    joinDate: new Date().toISOString().split('T')[0],
  }
  
  members.push(newMember)
  saveMembers(members)
  return newMember
}

export function updateMember(id: string, updates: Partial<Member>): Member | null {
  const members = getMembers()
  const index = members.findIndex(m => m.id === id)
  
  if (index === -1) return null
  
  members[index] = { ...members[index], ...updates }
  saveMembers(members)
  return members[index]
}

export function deleteMember(id: string): boolean {
  const members = getMembers()
  const filteredMembers = members.filter(m => m.id !== id)
  
  if (filteredMembers.length === members.length) return false
  
  saveMembers(filteredMembers)
  return true
}

export function getMemberById(id: string): Member | null {
  const members = getMembers()
  return members.find(m => m.id === id) || null
}

export function searchMembers(query: string): Member[] {
  const members = getMembers()
  const lowercaseQuery = query.toLowerCase()
  
  return members.filter(member =>
    member.childName.toLowerCase().includes(lowercaseQuery) ||
    member.parentName.toLowerCase().includes(lowercaseQuery) ||
    member.email.toLowerCase().includes(lowercaseQuery) ||
    member.grade.toLowerCase().includes(lowercaseQuery)
  )
}

export function getMemberStats() {
  const members = getMembers()
  const activeMembers = members.filter(m => m.isActive)
  
  const gradeDistribution = members.reduce((acc, member) => {
    acc[member.grade] = (acc[member.grade] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    total: members.length,
    active: activeMembers.length,
    inactive: members.length - activeMembers.length,
    gradeDistribution,
  }
}

function saveMembers(members: Member[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members))
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
