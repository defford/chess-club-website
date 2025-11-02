"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { Gamepad2, Plus, Search, LogOut, ArrowLeft, Users, Calendar, X, Edit, Rocket } from "lucide-react"
import type { ClubMeetData } from "@/lib/types"
import QuickStartMeet from "@/components/admin/QuickStartMeet"
import type { PlayerData } from "@/lib/types"

export default function AttendancePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [meets, setMeets] = useState<ClubMeetData[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const [newMeetDate, setNewMeetDate] = useState(new Date().toISOString().split('T')[0])
  const [newMeetName, setNewMeetName] = useState("")
  const [newMeetNotes, setNewMeetNotes] = useState("")

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      const adminAuthenticated = isAdminAuthenticated()
      
      setIsAuth(authenticated)
      setIsAdmin(adminAuthenticated)
      setIsLoading(false)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else if (!adminAuthenticated) {
        router.push("/parent/dashboard")
      } else {
        refreshSession()
        loadMeets()
      }
    }

    checkAuth()
  }, [router])

  const loadMeets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const [meetsResponse, playersResponse] = await Promise.all([
        fetch(`/api/attendance/meets?email=${encodeURIComponent(userEmail)}`),
        fetch('/api/members').catch(() => null)
      ])

      if (!meetsResponse.ok) {
        throw new Error('Failed to fetch meets')
      }

      const meetsData = await meetsResponse.json()
      
      // Get attendance counts for each meet
      const meetsWithCounts = await Promise.all(
        meetsData.map(async (meet: ClubMeetData) => {
          try {
            const attResponse = await fetch(`/api/attendance/meets/${meet.id}/attendance?email=${encodeURIComponent(userEmail)}`)
            if (attResponse.ok) {
              const attendance = await attResponse.json()
              return { ...meet, attendanceCount: attendance.length }
            }
          } catch (err) {
            console.error(`Error fetching attendance for meet ${meet.id}:`, err)
          }
          return { ...meet, attendanceCount: 0 }
        })
      )

      setMeets(meetsWithCounts)

      // Load players if available
      if (playersResponse?.ok) {
        const membersData = await playersResponse.json()
        const playersData = membersData.map((member: any) => ({
          id: member.id,
          name: member.playerName,
          grade: member.playerGrade,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          points: 0,
          rank: 0,
          lastActive: member.timestamp || new Date().toISOString(),
          email: member.parentEmail || '',
          isSystemPlayer: member.isSystemPlayer || false
        }))
        setAllPlayers(playersData)
      }
    } catch (err) {
      console.error('Error loading meets:', err)
      setError('Failed to load meets')
    } finally {
      setLoading(false)
    }
  }

  const loadPlayers = async () => {
    const playersResponse = await fetch('/api/members')
    if (playersResponse?.ok) {
      const membersData = await playersResponse.json()
      const playersData = membersData.map((member: any) => ({
        id: member.id,
        name: member.playerName,
        grade: member.playerGrade,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        points: 0,
        rank: 0,
        lastActive: member.timestamp || new Date().toISOString(),
        email: member.parentEmail || '',
        isSystemPlayer: member.isSystemPlayer || false
      }))
      setAllPlayers(playersData)
      return playersData
    }
    return allPlayers
  }

  const handleQuickStartComplete = async (meetId: string) => {
    await loadMeets()
    setShowQuickStart(false)
  }

  const handleCreateMeet = async (meetData: { meetDate: string; meetName?: string; notes?: string }): Promise<string> => {
    const session = clientAuthService.getCurrentParentSession()
    const userEmail = session?.email || 'dev@example.com'

    const response = await fetch(`/api/attendance/meets?email=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create meet')
    }

    const result = await response.json()
    return result.meetId
  }

  const handleAddAttendance = async (meetId: string, playerIds: string[]): Promise<void> => {
    const session = clientAuthService.getCurrentParentSession()
    const userEmail = session?.email || 'dev@example.com'

    const response = await fetch(`/api/attendance/meets/${meetId}/attendance?email=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerIds })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add attendance')
    }
  }

  const handleCreateMeetForm = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      setError(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/attendance/meets?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetDate: newMeetDate,
          meetName: newMeetName || undefined,
          notes: newMeetNotes || undefined,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create meet')
      }

      await loadMeets()
      setShowCreateForm(false)
      setNewMeetDate(new Date().toISOString().split('T')[0])
      setNewMeetName("")
      setNewMeetNotes("")
    } catch (err) {
      console.error('Error creating meet:', err)
      setError(err instanceof Error ? err.message : 'Failed to create meet')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMeet = async (meetId: string) => {
    if (!confirm('Are you sure you want to delete this meet? This will also delete all attendance records.')) {
      return
    }

    try {
      setLoading(true)
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/attendance/meets/${meetId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete meet')
      }

      await loadMeets()
    } catch (err) {
      console.error('Error deleting meet:', err)
      setError('Failed to delete meet')
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuth || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                Club Meet Attendance
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Manage attendance for club meets
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Start Meet Flow */}
        {showQuickStart && (
          <QuickStartMeet
            allPlayers={allPlayers}
            onComplete={handleQuickStartComplete}
            onCancel={() => setShowQuickStart(false)}
            onCreateMeet={handleCreateMeet}
            onAddAttendance={handleAddAttendance}
            onRefreshPlayers={loadPlayers}
          />
        )}

        {/* Create Meet Button */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowQuickStart(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Rocket className="h-4 w-4" />
            Quick Start Meet
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Meet
          </Button>
        </div>

        {/* Create Meet Form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Club Meet</CardTitle>
              <CardDescription>Record a new club meet for attendance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMeetForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Meet Date *
                  </label>
                  <input
                    type="date"
                    value={newMeetDate}
                    onChange={(e) => setNewMeetDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Meet Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newMeetName}
                    onChange={(e) => setNewMeetName(e.target.value)}
                    placeholder="e.g., Weekly Club Meet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newMeetNotes}
                    onChange={(e) => setNewMeetNotes(e.target.value)}
                    placeholder="Any additional notes about this meet..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    variant="outline"
                  >
                    {submitting ? 'Creating...' : 'Create Meet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewMeetDate(new Date().toISOString().split('T')[0])
                      setNewMeetName("")
                      setNewMeetNotes("")
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Meets List */}
        <Card>
          <CardHeader>
            <CardTitle>Club Meets</CardTitle>
            <CardDescription>
              {meets.length} meet{meets.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
                <p className="mt-2 text-[--color-text-primary]">Loading meets...</p>
              </div>
            ) : meets.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No meets found</p>
                <p className="text-sm text-gray-500 mt-2">Create your first meet to start tracking attendance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meets.map((meet) => (
                  <div
                    key={meet.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 mb-3 sm:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold text-[--color-text-primary]">
                          {meet.meetName || new Date(meet.meetDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-600 ml-6">
                        <div>Date: {new Date(meet.meetDate).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          <span>{(meet as any).attendanceCount || 0} attendees</span>
                        </div>
                        {meet.notes && (
                          <div className="mt-1 text-gray-500 italic">{meet.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4">
                      <Button
                        onClick={() => router.push(`/admin/attendance/${meet.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Manage</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      <Button
                        onClick={() => handleDeleteMeet(meet.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

