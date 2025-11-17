"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { Gamepad2, Plus, Search, LogOut, ArrowLeft, BarChart3, Trophy, Users, Calendar, Edit, Trash2, X, RefreshCw } from "lucide-react"
import type { GameData, PlayerData, GameFormData, ClubMeetData } from "@/lib/types"
import GameForm from "@/components/admin/GameForm"
import SimpleGameForm from "@/components/admin/SimpleGameForm"
import QuickStartMeet from "@/components/admin/QuickStartMeet"

function AdminGamesPageContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [games, setGames] = useState<GameData[]>([])
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [meets, setMeets] = useState<ClubMeetData[]>([])
  const [selectedAttendanceMeetId, setSelectedAttendanceMeetId] = useState<string>("")
  const [showGameForm, setShowGameForm] = useState(false)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [editingGame, setEditingGame] = useState<GameData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterResult, setFilterResult] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filteredPlayerName, setFilteredPlayerName] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const filteredPlayerId = searchParams.get('playerId')

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
  }, [router, filteredPlayerId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      // Build games API URL with optional playerId filter
      const gamesUrl = filteredPlayerId 
        ? `/api/games?email=${encodeURIComponent(userEmail)}&playerId=${encodeURIComponent(filteredPlayerId)}`
        : `/api/games?email=${encodeURIComponent(userEmail)}`
      
      const [gamesResponse, playersResponse, meetsResponse] = await Promise.all([
        fetch(gamesUrl),
        fetch('/api/members'),
        fetch(`/api/attendance/meets?email=${encodeURIComponent(userEmail)}`).catch(() => null)
      ])

      // Check for errors and extract error messages
      if (!gamesResponse.ok) {
        const errorData = await gamesResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch games: ${gamesResponse.status} ${gamesResponse.statusText}`)
      }
      
      if (!playersResponse.ok) {
        const errorData = await playersResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch players: ${playersResponse.status} ${playersResponse.statusText}`)
      }

      const [gamesData, membersData, meetsData] = await Promise.all([
        gamesResponse.json(),
        playersResponse.json(),
        meetsResponse?.ok ? meetsResponse.json() : Promise.resolve([])
      ])

      // Validate that membersData is an array
      if (!Array.isArray(membersData)) {
        console.error('Invalid members data format:', membersData)
        throw new Error('Invalid members data format: expected array')
      }

      // Transform members data to PlayerData format for the game form
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
        isSystemPlayer: member.isSystemPlayer || false // Preserve system player flag
      }))

      setGames(gamesData)
      setPlayers(playersData)
      setMeets(meetsData || [])
      
      // Set filtered player name if filtering by playerId
      if (filteredPlayerId) {
        const filteredPlayer = playersData.find((p: PlayerData) => p.id === filteredPlayerId)
        setFilteredPlayerName(filteredPlayer?.name || null)
      } else {
        setFilteredPlayerName(null)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load games and players'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadPlayersForAttendance = async (meetId: string) => {
    try {
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const response = await fetch(`/api/attendance/meets/${meetId}/players?email=${encodeURIComponent(userEmail)}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance players')
      }
      
      const attendancePlayers = await response.json()
      setPlayers(attendancePlayers)
    } catch (err) {
      console.error('Error loading attendance players:', err)
      setError('Failed to load attendance players')
    }
  }

  const handleAttendanceFilterChange = async (meetId: string) => {
    setSelectedAttendanceMeetId(meetId)
    if (meetId) {
      await loadPlayersForAttendance(meetId)
    } else {
      // Reload all players
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      const playersResponse = await fetch('/api/members')
      if (playersResponse.ok) {
        const membersData = await playersResponse.json()
        
        // Validate that membersData is an array
        if (!Array.isArray(membersData)) {
          console.error('Invalid members data format:', membersData)
          setError('Invalid members data format: expected array')
          return
        }
        
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
        setPlayers(playersData)
      }
    }
  }

  const loadPlayers = async () => {
    try {
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      const playersResponse = await fetch('/api/members')
      
      if (!playersResponse.ok) {
        const errorData = await playersResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch players: ${playersResponse.status}`)
      }
      
      const membersData = await playersResponse.json()
      
      // Validate that membersData is an array
      if (!Array.isArray(membersData)) {
        console.error('Invalid members data format:', membersData)
        throw new Error('Invalid members data format: expected array')
      }
      
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
      setPlayers(playersData)
      return playersData
    } catch (err) {
      console.error('Error loading players:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load players'
      setError(errorMessage)
      return players
    }
  }

  const handleQuickStartComplete = async (meetId: string) => {
    await loadData()
    setShowQuickStart(false)
    // Optionally show message or redirect
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

  // Find today's meet
  const todayMeet = meets.find(meet => meet.meetDate === new Date().toISOString().split('T')[0])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleGameSubmit = async (gameData: GameFormData) => {
    try {
      setSubmitting(true)
      setError(null)

      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

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
        body: JSON.stringify(gameData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${isEdit ? 'update' : 'create'} game`)
      }

      // Refresh the games list
      await loadData()
      setShowGameForm(false)
      setShowQuickForm(false)
      setEditingGame(null)
      
      // Dispatch event to notify other components that a game was added/updated
      localStorage.setItem('gameAdded', Date.now().toString())
    } catch (err) {
      console.error(`Error ${editingGame ? 'updating' : 'creating'} game:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${editingGame ? 'update' : 'create'} game`)
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

      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/games/${gameId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete game')
      }

      // Refresh the games list
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
    setShowGameForm(true)
  }

  const handleCancelEdit = () => {
    setEditingGame(null)
    setShowGameForm(false)
  }

  const filteredGames = games.filter(game => {
    const matchesSearch = searchQuery === "" || 
      game.player1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.player2Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === "all" || game.gameType === filterType
    const matchesResult = filterResult === "all" || game.result === filterResult
    
    return matchesSearch && matchesType && matchesResult
  })

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

  const getGameTypeColor = (type: string) => {
    switch (type) {
      case "ladder": return "text-blue-600 bg-blue-50"
      case "tournament": return "text-purple-600 bg-purple-50"
      case "friendly": return "text-green-600 bg-green-50"
      case "practice": return "text-orange-600 bg-orange-50"
      default: return "text-gray-600 bg-gray-50"
    }
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
        {/* Header - Mobile Responsive */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                Game Management
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Record and manage chess games
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

        {/* Player Filter Indicator */}
        {filteredPlayerId && filteredPlayerName && (
          <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-[--color-text-primary]">
                  Showing games for: <span className="font-semibold text-blue-600">{filteredPlayerName}</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/games")}
                className="flex items-center gap-2 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
                Clear Filter
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Stats - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 md:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Total Games
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {games.length}
                </p>
              </div>
              <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Ladder Games
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {games.filter(g => g.gameType === 'ladder').length}
                </p>
              </div>
              <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Tournament
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {games.filter(g => g.gameType === 'tournament').length}
                </p>
              </div>
              <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  This Month
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {games.filter(g => {
                    const gameDate = new Date(g.gameDate)
                    const now = new Date()
                    return gameDate.getMonth() === now.getMonth() && 
                           gameDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
              <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Controls - Mobile Responsive */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search games by player name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent text-base"
            />
          </div>
          
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base"
              >
                <option value="all">All Types</option>
                <option value="ladder">Ladder</option>
                <option value="tournament">Tournament</option>
                <option value="friendly">Friendly</option>
                <option value="practice">Practice</option>
              </select>
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base"
              >
                <option value="all">All Results</option>
                <option value="player1">Player 1 Wins</option>
                <option value="player2">Player 2 Wins</option>
                <option value="draw">Draws</option>
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setShowQuickStart(true)}
                className="flex items-center gap-2 bg-[--color-primary] text-white hover:bg-[--color-primary]/90"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Start Meet</span>
                <span className="sm:hidden">Quick Start</span>
              </Button>
              <Button
                onClick={() => setShowQuickForm(!showQuickForm)}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Add Game</span>
                <span className="sm:hidden">Quick Add</span>
              </Button>
              <Button
                onClick={() => setShowGameForm(true)}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">Full Game Form</span>
                <span className="sm:hidden">Full</span>
              </Button>
              <Button
                onClick={() => router.push("/admin/games/tournaments")}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Tournaments</span>
                <span className="sm:hidden">Tournaments</span>
              </Button>
              <Button
                onClick={() => router.push("/admin/games/stats")}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Statistics</span>
                <span className="sm:hidden">Stats</span>
              </Button>
              <Button
                onClick={() => router.push("/admin/games/batch-update")}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Batch Update</span>
                <span className="sm:hidden">Batch</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Start Meet Flow */}
        {showQuickStart && (
          <QuickStartMeet
            allPlayers={players}
            onComplete={handleQuickStartComplete}
            onCancel={() => setShowQuickStart(false)}
            onCreateMeet={handleCreateMeet}
            onAddAttendance={handleAddAttendance}
            onRefreshPlayers={loadPlayers}
          />
        )}

        {/* Quick Game Form - Dropdown Section */}
        {showQuickForm && (
          <div className="mb-6">
            {/* Attendance Filter */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-[--color-text-primary]">
                      Filter Players:
                    </label>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={selectedAttendanceMeetId === "" ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => handleAttendanceFilterChange("")}
                      className={selectedAttendanceMeetId === "" ? "border-[--color-primary] bg-[--color-primary]/10" : ""}
                    >
                      All Players
                    </Button>
                    {todayMeet && (
                      <Button
                        type="button"
                        variant={selectedAttendanceMeetId === todayMeet.id ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => handleAttendanceFilterChange(todayMeet.id)}
                        className={selectedAttendanceMeetId === todayMeet.id ? "border-[--color-primary] bg-[--color-primary]/10" : ""}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Today's Attendance
                      </Button>
                    )}
                    {meets.slice(0, 5).map((meet) => (
                      meet.id !== todayMeet?.id && (
                        <Button
                          key={meet.id}
                          type="button"
                          variant={selectedAttendanceMeetId === meet.id ? "outline" : "ghost"}
                          size="sm"
                          onClick={() => handleAttendanceFilterChange(meet.id)}
                          className={selectedAttendanceMeetId === meet.id ? "border-[--color-primary] bg-[--color-primary]/10" : ""}
                        >
                          {new Date(meet.meetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Button>
                      )
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin/attendance")}
                    className="text-[--color-primary] hover:text-[--color-primary] hover:bg-[--color-primary]/10"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Manage Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>
            <SimpleGameForm
              players={players}
              onSubmit={handleGameSubmit}
              onCancel={() => {
                setShowQuickForm(false)
                setSelectedAttendanceMeetId("")
                loadData()
              }}
              isLoading={submitting}
              recentGames={games.slice(0, 20)}
              attendanceMeetId={selectedAttendanceMeetId || undefined}
            />
          </div>
        )}

        {/* Games Display - Mobile Responsive */}
        <Card>
          <CardHeader>
            <CardTitle>Game History</CardTitle>
            <CardDescription>
              {filteredGames.length} of {games.length} games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
                <p className="mt-2 text-[--color-text-primary]">Loading games...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button onClick={loadData} className="mt-4" variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No games found</p>
                <Button 
                  onClick={() => setShowQuickForm(true)}
                  className="mt-4"
                  variant="outline"
                >
                  Add First Game
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Players</th>
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Result</th>
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Notes</th>
                        <th className="text-right py-3 px-4 font-medium text-[--color-text-primary]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGames.map((game) => (
                        <tr 
                          key={game.id} 
                          className="border-b hover:bg-gray-50"
                        >
                          <td 
                            className="py-3 px-4 text-[--color-text-primary] cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            {new Date(game.gameDate).toLocaleDateString()}
                          </td>
                          <td 
                            className="py-3 px-4 text-[--color-text-primary] cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            <div className="font-medium">
                              {game.player1Name} vs {game.player2Name}
                            </div>
                          </td>
                          <td 
                            className="py-3 px-4 cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                              {getResultLabel(game.result, game)}
                            </span>
                          </td>
                          <td 
                            className="py-3 px-4 cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGameTypeColor(game.gameType)}`}>
                              {game.gameType}
                            </span>
                          </td>
                          <td 
                            className="py-3 px-4 text-[--color-text-primary] cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            {game.notes ? (
                              <span className="truncate max-w-xs block" title={game.notes}>
                                {game.notes}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditGame(game)
                                }}
                                className="h-8 w-8 p-0"
                                disabled={submitting}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteGame(game.id)
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={submitting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredGames.map((game) => (
                    <Card 
                      key={game.id} 
                      className="p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-3">
                        {/* Header with Date and Type */}
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            <p className="text-sm font-medium text-[--color-text-primary]">
                              {new Date(game.gameDate).toLocaleDateString()}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGameTypeColor(game.gameType)}`}>
                              {game.gameType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                              {getResultLabel(game.result, game)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditGame(game)
                              }}
                              className="h-8 w-8 p-0"
                              disabled={submitting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteGame(game.id)
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={submitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Players */}
                        <div 
                          className="cursor-pointer"
                          onClick={() => router.push(`/admin/games/${game.id}`)}
                        >
                          <p className="font-medium text-[--color-text-primary]">
                            {game.player1Name} vs {game.player2Name}
                          </p>
                        </div>

                        {/* Game Details */}
                        {game.notes && (
                          <div 
                            className="text-sm text-[--color-text-secondary] cursor-pointer"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            <span className="truncate max-w-32" title={game.notes}>
                              {game.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Form Modal */}
        {showGameForm && (
          <GameForm
            players={players}
            onSubmit={handleGameSubmit}
            onCancel={handleCancelEdit}
            isLoading={submitting}
            initialData={editingGame ? {
              player1Id: editingGame.player1Id,
              player2Id: editingGame.player2Id,
              result: editingGame.result,
              gameDate: editingGame.gameDate,
              gameType: editingGame.gameType,
              eventId: editingGame.eventId,
              notes: editingGame.notes,
              opening: editingGame.opening,
              endgame: editingGame.endgame,
            } : undefined}
          />
        )}
      </div>
    </div>
  )
}

export default function AdminGamesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminGamesPageContent />
    </Suspense>
  )
}
