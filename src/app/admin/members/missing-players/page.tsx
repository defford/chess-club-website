"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { 
  ArrowLeft, 
  Users,
  Edit,
  Save,
  X,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface MissingPlayer {
  id: string
  name: string
}

interface Parent {
  id: string
  name: string
  email: string
}

interface StudentFormData {
  playerId: string
  playerName: string
  playerAge: string
  playerGrade: string
  emergencyContact: string
  emergencyPhone: string
  medicalInfo: string
  parentId: string
  createNewParent: boolean
  parentName: string
  parentEmail: string
  parentPhone: string
}

export default function MissingPlayersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [missingPlayers, setMissingPlayers] = useState<MissingPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [parents, setParents] = useState<Parent[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [formDataMap, setFormDataMap] = useState<Map<string, StudentFormData>>(new Map())
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsLoading(false)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else {
        refreshSession()
        loadMissingPlayers()
        loadParents()
      }
    }

    checkAuth()
  }, [router])

  const loadMissingPlayers = async () => {
    try {
      setLoading(true)
      
      // Try to get email from parent auth session first
      let email: string | null = null
      const parentSession = typeof window !== 'undefined' 
        ? localStorage.getItem('chess-club-parent-auth')
        : null
      
      if (parentSession) {
        try {
          const parsed = JSON.parse(parentSession)
          email = parsed.email || null
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // If no email found and in development, use dev email
      if (!email && process.env.NODE_ENV === 'development') {
        email = 'dev@example.com'
      }
      
      // If still no email, check if admin auth exists (simple password auth)
      if (!email) {
        const adminAuth = typeof window !== 'undefined'
          ? localStorage.getItem('chess-club-admin-auth')
          : null
        
        if (adminAuth) {
          // For admin password auth, use dev email in dev mode, or request from user
          if (process.env.NODE_ENV === 'development') {
            email = 'dev@example.com'
          } else {
            setError('Admin email required. Please contact support.')
            return
          }
        } else {
          setError('No email found in session. Please log in again.')
          return
        }
      }

      const response = await fetch(`/api/admin/missing-players?email=${encodeURIComponent(email)}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch missing players' }))
        if (response.status === 401 || response.status === 403) {
          setError(errorData.error || 'You do not have admin privileges')
        } else {
          throw new Error(errorData.error || 'Failed to fetch missing players')
        }
        return
      }
      
      const data = await response.json()
      setMissingPlayers(data.missingPlayers || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching missing players:', err)
      setError(err instanceof Error ? err.message : 'Failed to load missing players')
    } finally {
      setLoading(false)
    }
  }

  const loadParents = async () => {
    try {
      // Try to get email from parent auth session first
      let email: string | null = null
      const parentSession = typeof window !== 'undefined' 
        ? localStorage.getItem('chess-club-parent-auth')
        : null
      
      if (parentSession) {
        try {
          const parsed = JSON.parse(parentSession)
          email = parsed.email || null
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // If no email found and in development, use dev email
      if (!email && process.env.NODE_ENV === 'development') {
        email = 'dev@example.com'
      }
      
      // If still no email, check if admin auth exists
      if (!email) {
        const adminAuth = typeof window !== 'undefined'
          ? localStorage.getItem('chess-club-admin-auth')
          : null
        
        if (adminAuth && process.env.NODE_ENV === 'development') {
          email = 'dev@example.com'
        } else {
          return
        }
      }

      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch parents')
      }
      const data = await response.json()
      // Transform parent data to match our interface
      // Note: ParentAccount only has id and email, so we'll use email as name
      const parentsList = (Array.isArray(data) ? data : []).map((p: any) => ({
        id: p.id,
        name: p.email, // ParentAccount doesn't have name, use email
        email: p.email
      }))
      setParents(parentsList)
    } catch (err) {
      console.error('Error fetching parents:', err)
    }
  }

  const getInitialFormData = (player: MissingPlayer): StudentFormData => {
    return {
      playerId: player.id,
      playerName: player.name,
      playerAge: '',
      playerGrade: '',
      emergencyContact: '',
      emergencyPhone: '',
      medicalInfo: '',
      parentId: '',
      createNewParent: false,
      parentName: '',
      parentEmail: '',
      parentPhone: ''
    }
  }

  const getFormData = (playerId: string): StudentFormData => {
    if (!formDataMap.has(playerId)) {
      const player = missingPlayers.find(p => p.id === playerId)
      if (player) {
        const initialData = getInitialFormData(player)
        setFormDataMap(prev => new Map(prev).set(playerId, initialData))
        return initialData
      }
    }
    return formDataMap.get(playerId) || getInitialFormData({ id: playerId, name: '' })
  }

  const updateFormData = (playerId: string, updates: Partial<StudentFormData>) => {
    setFormDataMap(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(playerId) || getInitialFormData({ id: playerId, name: '' })
      newMap.set(playerId, { ...current, ...updates })
      return newMap
    })
  }

  const handleSave = async (playerId: string, formData: StudentFormData) => {
    try {
      setSaving(playerId)
      
      // Validate required fields
      if (!formData.playerName || !formData.playerAge || !formData.playerGrade || 
          !formData.emergencyContact || !formData.emergencyPhone) {
        alert('Please fill in all required fields')
        return
      }

      if (formData.createNewParent) {
        if (!formData.parentName || !formData.parentEmail || !formData.parentPhone) {
          alert('Please fill in all parent information when creating a new parent')
          return
        }
      } else if (!formData.parentId) {
        alert('Please select a parent or choose to create a new one')
        return
      }

      // Try to get email from parent auth session first
      let email: string | null = null
      const parentSession = typeof window !== 'undefined' 
        ? localStorage.getItem('chess-club-parent-auth')
        : null
      
      if (parentSession) {
        try {
          const parsed = JSON.parse(parentSession)
          email = parsed.email || null
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // If no email found and in development, use dev email
      if (!email && process.env.NODE_ENV === 'development') {
        email = 'dev@example.com'
      }
      
      // If still no email, check if admin auth exists
      if (!email) {
        const adminAuth = typeof window !== 'undefined'
          ? localStorage.getItem('chess-club-admin-auth')
          : null
        
        if (adminAuth && process.env.NODE_ENV === 'development') {
          email = 'dev@example.com'
        } else {
          alert('No email found in session. Please log in again.')
          return
        }
      }

      const response = await fetch('/api/admin/add-missing-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email,
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add student')
      }

      // Remove the player from the list
      setMissingPlayers(prev => prev.filter(p => p.id !== playerId))
      setEditingPlayer(null)
      alert('Student added successfully!')
    } catch (err) {
      console.error('Error saving student:', err)
      alert(err instanceof Error ? err.message : 'Failed to save student')
    } finally {
      setSaving(null)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading missing players...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col gap-4">
            <Link href="/admin/members">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Members
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[--color-accent]">
                Missing Players
              </h1>
              <p className="text-[--color-text-primary] mt-1">
                Players found in games table but not in students table
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading missing players
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadMissingPlayers} variant="outline">Try Again</Button>
          </Card>
        )}

        {/* Missing Players List */}
        {!error && missingPlayers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[--color-accent] mb-2">
              No Missing Players
            </h3>
            <p className="text-[--color-text-primary] mb-4">
              All players in the games table are already in the students table.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {missingPlayers.map((player) => {
              const isEditing = editingPlayer === player.id
              const formData = getFormData(player.id)

              return (
                <Card key={player.id} className="p-6">
                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[--color-accent]">
                          {player.name}
                        </h3>
                        <p className="text-sm text-gray-600">ID: {player.id}</p>
                      </div>
                      <Button
                        onClick={() => setEditingPlayer(player.id)}
                        className="flex items-center gap-2"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                        Add to Students
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[--color-accent]">
                          Adding: {player.name}
                        </h3>
                        <Button
                          onClick={() => {
                            setEditingPlayer(null)
                            const currentPlayer = missingPlayers.find(p => p.id === player.id)
                            if (currentPlayer) {
                              updateFormData(player.id, getInitialFormData(currentPlayer))
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Player Name *
                          </label>
                          <input
                            type="text"
                            value={formData.playerName}
                            onChange={(e) => updateFormData(player.id, { playerName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Age *
                          </label>
                          <input
                            type="number"
                            min="4"
                            max="18"
                            value={formData.playerAge}
                            onChange={(e) => updateFormData(player.id, { playerAge: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Grade *
                          </label>
                          <input
                            type="text"
                            value={formData.playerGrade}
                            onChange={(e) => updateFormData(player.id, { playerGrade: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Emergency Contact *
                          </label>
                          <input
                            type="text"
                            value={formData.emergencyContact}
                            onChange={(e) => updateFormData(player.id, { emergencyContact: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Emergency Phone *
                          </label>
                          <input
                            type="tel"
                            value={formData.emergencyPhone}
                            onChange={(e) => updateFormData(player.id, { emergencyPhone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Medical Info
                          </label>
                          <textarea
                            value={formData.medicalInfo}
                            onChange={(e) => updateFormData(player.id, { medicalInfo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Parent Selection */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="checkbox"
                            id={`createNew-${player.id}`}
                            checked={formData.createNewParent}
                            onChange={(e) => updateFormData(player.id, { createNewParent: e.target.checked, parentId: '' })}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`createNew-${player.id}`} className="text-sm font-medium text-gray-700">
                            Create new parent
                          </label>
                        </div>

                        {formData.createNewParent ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parent Name *
                              </label>
                              <input
                                type="text"
                                value={formData.parentName}
                                onChange={(e) => updateFormData(player.id, { parentName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parent Email *
                              </label>
                              <input
                                type="email"
                                value={formData.parentEmail}
                                onChange={(e) => updateFormData(player.id, { parentEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parent Phone *
                              </label>
                              <input
                                type="tel"
                                value={formData.parentPhone}
                                onChange={(e) => updateFormData(player.id, { parentPhone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                                required
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Parent *
                            </label>
                            <select
                              value={formData.parentId}
                              onChange={(e) => updateFormData(player.id, { parentId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                              required
                            >
                              <option value="">Select a parent...</option>
                              {parents.map((parent) => (
                                <option key={parent.id} value={parent.id}>
                                  {parent.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          onClick={() => {
                            setEditingPlayer(null)
                            const currentPlayer = missingPlayers.find(p => p.id === player.id)
                            if (currentPlayer) {
                              updateFormData(player.id, getInitialFormData(currentPlayer))
                            }
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSave(player.id, formData)}
                          disabled={saving === player.id}
                          className="flex items-center gap-2"
                        >
                          {saving === player.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Student
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

