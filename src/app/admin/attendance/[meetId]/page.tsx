"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { ArrowLeft, LogOut, Users, Plus, X, Search, CheckCircle, Gamepad2, Edit, Trash2 } from "lucide-react"
import type { MeetWithAttendance, PlayerData, AttendanceData, GameFormData, GameData } from "@/lib/types"
import QuickAddStudentForm from "@/components/admin/QuickAddStudentForm"
import SimpleGameForm from "@/components/admin/SimpleGameForm"

export default function AttendanceDetailPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [meet, setMeet] = useState<MeetWithAttendance | null>(null)
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [showAddPlayers, setShowAddPlayers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false)
  const [showAddGame, setShowAddGame] = useState(false)
  const [attendancePlayers, setAttendancePlayers] = useState<PlayerData[]>([])
  const [games, setGames] = useState<GameData[]>([])
  const [editingGame, setEditingGame] = useState<GameData | null>(null)
  const router = useRouter()
  const params = useParams()
  const meetId = params?.meetId as string

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
        loadData()
      }
    }

    checkAuth()
  }, [router, meetId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      // First fetch meet and players data
      const [meetResponse, playersResponse] = await Promise.all([
        fetch(`/api/attendance/meets/${meetId}?email=${encodeURIComponent(userEmail)}`),
        fetch('/api/members')
      ])

      if (!meetResponse.ok) {
        throw new Error('Failed to fetch meet')
      }

      if (!playersResponse.ok) {
        throw new Error('Failed to fetch players')
      }

      const meetData = await meetResponse.json()
      const membersData = await playersResponse.json()

      // Fetch games filtered by the meet's date (since meet IDs aren't stored as event_id)
      // Format meet date as YYYY-MM-DD for filtering
      const meetDateStr = meetData.meetDate ? new Date(meetData.meetDate).toISOString().split('T')[0] : null
      let gamesData: GameData[] = []
      
      if (meetDateStr) {
        try {
          const gamesResponse = await fetch(
            `/api/games?dateFrom=${meetDateStr}&dateTo=${meetDateStr}&email=${encodeURIComponent(userEmail)}`
          )
          if (gamesResponse.ok) {
            gamesData = await gamesResponse.json()
          }
        } catch (err) {
          console.error('Error fetching games:', err)
          // Continue without games data
        }
      }

      // Transform members data to PlayerData format
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

      setMeet(meetData)
      setAllPlayers(playersData)
      setGames(gamesData)
      
      // Load attendance players for game form
      if (meetData.players && meetData.players.length > 0) {
        const attendancePlayerIds = new Set(meetData.players.map((p: AttendanceData) => p.playerId))
        const attPlayers = playersData.filter((p: PlayerData) => attendancePlayerIds.has(p.id || ''))
        setAttendancePlayers(attPlayers)
      } else {
        setAttendancePlayers([])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayers = async () => {
    if (selectedPlayerIds.size === 0) {
      setError('Please select at least one player')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/attendance/meets/${meetId}/attendance?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayerIds)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add players')
      }

      await loadData()
      setSelectedPlayerIds(new Set())
      setShowAddPlayers(false)
      setSearchQuery("")
    } catch (err) {
      console.error('Error adding players:', err)
      setError(err instanceof Error ? err.message : 'Failed to add players')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    try {
      setLoading(true)
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(
        `/api/attendance/meets/${meetId}/attendance?playerId=${playerId}&email=${encodeURIComponent(userEmail)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to remove player')
      }

      await loadData()
    } catch (err) {
      console.error('Error removing player:', err)
      setError('Failed to remove player')
      setLoading(false)
    }
  }

  const togglePlayerSelection = (playerId: string) => {
    const newSet = new Set(selectedPlayerIds)
    if (newSet.has(playerId)) {
      newSet.delete(playerId)
    } else {
      newSet.add(playerId)
    }
    setSelectedPlayerIds(newSet)
  }

  const handleQuickAddSuccess = async () => {
    setShowQuickAddPlayer(false)
    // Refresh players list
    await loadData()
  }

  const handleGameSubmit = async (gameData: GameFormData) => {
    try {
      setSubmitting(true)
      setError(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      // Use meet date for the game and set eventId
      const finalGameData = { 
        ...gameData, 
        gameDate: meet?.meetDate || gameData.gameDate,
        eventId: meetId
      }

      const isEdit = !!editingGame
      const url = isEdit 
        ? `/api/games/${editingGame.id}?email=${encodeURIComponent(userEmail)}`
        : `/api/games?email=${encodeURIComponent(userEmail)}`
      
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalGameData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${isEdit ? 'update' : 'add'} game`)
      }

      // Refresh games list
      await loadData()
      
      // Reset editing state
      if (isEdit) {
        setEditingGame(null)
        setShowAddGame(false)
      }
      // Game added successfully - keep form open for adding more games
      // The form will reset itself
    } catch (err) {
      console.error('Error submitting game:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit game')
      throw err // Re-throw so form can handle it
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/games/${gameId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete game')
      }

      // Refresh games list
      await loadData()
    } catch (err) {
      console.error('Error deleting game:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete game')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditGame = (game: GameData) => {
    setEditingGame(game)
    setShowAddGame(true)
  }

  const handleCancelEdit = () => {
    setEditingGame(null)
    setShowAddGame(false)
  }

  const getResultLabel = (result: string, game: GameData) => {
    switch (result) {
      case "player1": return `${game.player1Name} wins`
      case "player2": return `${game.player2Name} wins`
      case "draw": return "Draw"
      default: return "Unknown"
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case "player1": return "text-green-600 bg-green-50"
      case "player2": return "text-green-600 bg-green-50"
      case "draw": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
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

  if (!isAuth || !isAdmin || !meet) {
    return null
  }

  // Filter players who are already in attendance
  const attendancePlayerIds = new Set(meet.players.map(p => p.playerId))
  const availablePlayers = allPlayers.filter(p => !attendancePlayerIds.has(p.id || ''))
  const filteredPlayers = availablePlayers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.grade.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                {meet.meetName || new Date(meet.meetDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                {new Date(meet.meetDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin/attendance")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Meets
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Total Attendees</p>
                  <p className="text-2xl font-bold text-[--color-accent]">{meet.attendanceCount}</p>
                </div>
                <Users className="h-8 w-8 text-[--color-primary]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Available Players</p>
                  <p className="text-2xl font-bold text-[--color-accent]">{availablePlayers.length}</p>
                </div>
                <Plus className="h-8 w-8 text-[--color-primary]" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Games Section */}
        {attendancePlayers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Games</CardTitle>
                  <CardDescription>
                    {games.length} game{games.length !== 1 ? 's' : ''} recorded for this meet
                    {attendancePlayers.length > 0 && ` • ${attendancePlayers.length} players available`}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    if (showAddGame) {
                      setEditingGame(null)
                      setShowAddGame(false)
                    } else {
                      setEditingGame(null)
                      setShowAddGame(true)
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {showAddGame ? 'Cancel' : 'Add Game'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddGame && (
                <div className="mb-6">
                  <SimpleGameForm
                    players={attendancePlayers}
                    onSubmit={handleGameSubmit}
                    onCancel={handleCancelEdit}
                    isLoading={submitting}
                    attendanceMeetId={meetId}
                    recentGames={games.slice(0, 20)}
                    initialData={editingGame ? {
                      player1Id: editingGame.player1Id,
                      player2Id: editingGame.player2Id,
                      result: editingGame.result,
                      gameDate: editingGame.gameDate,
                      gameType: editingGame.gameType,
                      eventId: editingGame.eventId,
                      notes: editingGame.notes,
                    } : undefined}
                  />
                </div>
              )}
              {games.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No games recorded yet</p>
                  <p className="text-sm text-gray-500 mt-2">Click the plus button above to add a game</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="font-medium text-[--color-text-primary]">
                            {game.player1Name} vs {game.player2Name}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                            {getResultLabel(game.result, game)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(game.gameDate).toLocaleDateString()}
                          </span>
                        </div>
                        {game.notes && (
                          <div className="text-sm text-gray-500 italic mt-1">{game.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleEditGame(game)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={submitting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteGame(game.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={submitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Players Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Add Players</CardTitle>
                <CardDescription>Select players to add to attendance</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowQuickAddPlayer(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Register Player
                </Button>
                <Button
                  onClick={() => setShowAddPlayers(!showAddPlayers)}
                  variant="outline"
                  size="sm"
                >
                  {showAddPlayers ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2">{showAddPlayers ? 'Cancel' : 'Add Players'}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          {showAddPlayers && (
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredPlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchQuery ? 'No players found matching your search' : 'All players are already in attendance'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredPlayers.map((player) => (
                        <label
                          key={player.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlayerIds.has(player.id || '')}
                            onChange={() => togglePlayerSelection(player.id || '')}
                            className="mr-3 h-4 w-4 rounded border-gray-300 text-[--color-primary] focus:ring-[--color-primary]"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-[--color-text-primary]">{player.name}</div>
                            <div className="text-sm text-gray-500">Grade {player.grade}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddPlayers}
                    disabled={submitting || selectedPlayerIds.size === 0}
                    variant="outline"
                  >
                    {submitting ? 'Adding...' : `Add ${selectedPlayerIds.size} Player${selectedPlayerIds.size !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Attendance List */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance List</CardTitle>
            <CardDescription>
              {meet.attendanceCount} player{meet.attendanceCount !== 1 ? 's' : ''} attended
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meet.players.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No attendance recorded yet</p>
                <p className="text-sm text-gray-500 mt-2">Add players above to start tracking attendance</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meet.players.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-[--color-text-primary]">{attendance.playerName}</div>
                      <div className="text-sm text-gray-500">
                        Checked in: {new Date(attendance.checkedInAt).toLocaleString()}
                      </div>
                      {attendance.notes && (
                        <div className="text-sm text-gray-500 italic mt-1">{attendance.notes}</div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRemovePlayer(attendance.playerId)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Register Player Modal */}
        {showQuickAddPlayer && (
          <QuickAddStudentForm
            onSuccess={handleQuickAddSuccess}
            onCancel={() => setShowQuickAddPlayer(false)}
          />
        )}
      </div>
    </div>
  )
}

