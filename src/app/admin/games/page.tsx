"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { Gamepad2, Plus, Search, Filter, Download, LogOut, ArrowLeft, BarChart3 } from "lucide-react"
import type { GameData, PlayerData, GameFormData } from "@/lib/types"
import GameForm from "@/components/admin/GameForm"
import SimpleGameForm from "@/components/admin/SimpleGameForm"

export default function AdminGamesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [games, setGames] = useState<GameData[]>([])
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [showGameForm, setShowGameForm] = useState(false)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterResult, setFilterResult] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

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
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const [gamesResponse, playersResponse] = await Promise.all([
        fetch(`/api/games?email=${encodeURIComponent(userEmail)}`),
        fetch('/api/members')
      ])

      if (!gamesResponse.ok || !playersResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [gamesData, membersData] = await Promise.all([
        gamesResponse.json(),
        playersResponse.json()
      ])

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
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load games and players')
    } finally {
      setLoading(false)
    }
  }

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

      const response = await fetch(`/api/games?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create game')
      }

      // Refresh the games list
      await loadData()
      setShowGameForm(false)
      setShowQuickForm(false)
      
      // Dispatch event to notify other components that a game was added
      localStorage.setItem('gameAdded', Date.now().toString())
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setSubmitting(false)
    }
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
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Advanced Form</span>
                <span className="sm:hidden">Advanced</span>
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
            </div>
          </div>
        </div>

        {/* Quick Game Form - Dropdown Section */}
        {showQuickForm && (
          <div className="mb-6">
            <SimpleGameForm
              players={players}
              onSubmit={handleGameSubmit}
              onCancel={() => setShowQuickForm(false)}
              isLoading={submitting}
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
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Duration</th>
                        <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGames.map((game) => (
                        <tr 
                          key={game.id} 
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/admin/games/${game.id}`)}
                        >
                          <td className="py-3 px-4 text-[--color-text-primary]">
                            {new Date(game.gameDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-[--color-text-primary]">
                            <div className="font-medium">
                              {game.player1Name} vs {game.player2Name}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                              {getResultLabel(game.result, game)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGameTypeColor(game.gameType)}`}>
                              {game.gameType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[--color-text-primary]">
                            {game.gameTime > 0 ? `${game.gameTime} min` : '-'}
                          </td>
                          <td className="py-3 px-4 text-[--color-text-primary]">
                            {game.notes ? (
                              <span className="truncate max-w-xs block" title={game.notes}>
                                {game.notes}
                              </span>
                            ) : '-'}
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
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/admin/games/${game.id}`)}
                    >
                      <div className="space-y-3">
                        {/* Header with Date and Type */}
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-[--color-text-primary]">
                              {new Date(game.gameDate).toLocaleDateString()}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGameTypeColor(game.gameType)}`}>
                              {game.gameType}
                            </span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                            {getResultLabel(game.result, game)}
                          </span>
                        </div>

                        {/* Players */}
                        <div>
                          <p className="font-medium text-[--color-text-primary]">
                            {game.player1Name} vs {game.player2Name}
                          </p>
                        </div>

                        {/* Game Details */}
                        <div className="flex justify-between items-center text-sm text-[--color-text-secondary]">
                          <span>
                            {game.gameTime > 0 ? `${game.gameTime} min` : 'No duration'}
                          </span>
                          {game.notes && (
                            <span className="truncate max-w-32" title={game.notes}>
                              {game.notes}
                            </span>
                          )}
                        </div>
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
            onCancel={() => setShowGameForm(false)}
            isLoading={submitting}
          />
        )}
      </div>
    </div>
  )
}
