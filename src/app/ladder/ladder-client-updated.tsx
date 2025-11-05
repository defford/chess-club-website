"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronUp, ChevronDown, Crown, Medal, Award, Calendar, Clock, Gamepad2, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { clientAuthService } from "@/lib/clientAuth"
import { useRouter } from "next/navigation"
import type { PlayerData, GameData } from "@/lib/types"

type SortField = "rank" | "name" | "grade" | "gamesPlayed" | "wins" | "losses" | "draws" | "points"
type SortDirection = "asc" | "desc"

interface LadderPlayerData extends PlayerData {
  draws: number;
}

export function LadderPageClient() {
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [ladderPlayers, setLadderPlayers] = useState<LadderPlayerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [playerGames, setPlayerGames] = useState<Record<string, GameData[]>>({})
  const [loadingGames, setLoadingGames] = useState<Record<string, boolean>>({})
  const router = useRouter()

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check authentication on mount
  useEffect(() => {
    if (!isClient) return

    const checkAuth = () => {
      try {
        const authenticated = clientAuthService.isParentAuthenticated()
        setIsAuthenticated(authenticated)
        
        if (!authenticated) {
          router.push('/parent/login?redirect=/ladder')
          return
        }
      } catch (error) {
        console.error('Authentication check failed:', error)
        setIsAuthenticated(false)
        router.push('/parent/login?redirect=/ladder')
      }
    }

    checkAuth()
    
    // Listen for auth state changes
    const handleAuthStateChange = () => {
      checkAuth()
    }
    
    window.addEventListener('authStateChanged', handleAuthStateChange)
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange)
    }
  }, [router, isClient])

  // Fetch ladder data function
  const fetchLadderData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ladder')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/parent/login?redirect=/ladder')
          return
        }
        throw new Error('Failed to fetch ladder data')
      }
      const players = await response.json()
      setLadderPlayers(players)
      setError(null)
    } catch (err) {
      console.error('Error fetching ladder data:', err)
      setError('Failed to load ladder data')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (!isAuthenticated) return
    fetchLadderData()
  }, [isAuthenticated, router])

  // Listen for cross-tab updates via localStorage
  useEffect(() => {
    if (!isAuthenticated) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gameAdded' && e.newValue) {
        // A game was added in another tab, refresh data
        fetchLadderData()
        // Clear the flag
        localStorage.removeItem('gameAdded')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isAuthenticated])

  // Fallback polling every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      fetchLadderData()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Fetch player games when expanding
  const fetchPlayerGames = async (searchTerm: string, storageKey: string) => {
    if (playerGames[storageKey]) return // Already loaded

    setLoadingGames(prev => ({ ...prev, [storageKey]: true }))
    
    try {
      const response = await fetch(`/api/games/player/${encodeURIComponent(searchTerm)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch player games')
      }
      const games = await response.json()
      setPlayerGames(prev => ({ ...prev, [storageKey]: games }))
    } catch (error) {
      console.error('Error fetching player games:', error)
    } finally {
      setLoadingGames(prev => ({ ...prev, [storageKey]: false }))
    }
  }

  const handlePlayerClick = async (playerId: string, playerName: string) => {
    if (expandedPlayer === playerId) {
      setExpandedPlayer(null)
    } else {
      setExpandedPlayer(playerId)
      // Try with player name first since it's more reliable
      // Store games using playerId as key but fetch using playerName
      await fetchPlayerGames(playerName, playerId)
    }
  }

  const grades = ["all", "K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedPlayers = [...ladderPlayers]
    .filter(player => player.points > 0)
    .filter(player => !player.id?.startsWith('unknown_')) // Filter out system players
    .filter(player => selectedGrade === "all" || player.grade === selectedGrade)
    .sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === "name") {
        aValue = aValue?.toLowerCase() || ""
        bValue = bValue?.toLowerCase() || ""
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white"
      case 2:
        return "bg-gray-400 text-white"
      case 3:
        return "bg-orange-600 text-white"
      default:
        return "bg-[--color-neutral-light] text-[--color-text-primary]"
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Crown className="h-3 w-3" />
    } else if (rank === 2) {
      return <Medal className="h-3 w-3" />
    } else if (rank === 3) {
      return <Award className="h-3 w-3" />
    }
    return rank
  }

  const getResultIcon = (game: GameData, playerName: string) => {
    const isPlayer1 = game.player1Name === playerName
    const isPlayer2 = game.player2Name === playerName

    if (game.result === 'draw') {
      return <span className="text-blue-600 font-medium">D</span>
    } else if (
      (game.result === 'player1' && isPlayer1) ||
      (game.result === 'player2' && isPlayer2)
    ) {
      return <span className="text-green-600 font-medium">W</span>
    } else {
      return <span className="text-red-600 font-medium">L</span>
    }
  }

  const getOpponentName = (game: GameData, playerName: string) => {
    return game.player1Name === playerName ? game.player2Name : game.player1Name
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }


  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case 'ladder':
        return 'bg-blue-100 text-blue-800'
      case 'tournament':
        return 'bg-purple-100 text-purple-800'
      case 'friendly':
        return 'bg-green-100 text-green-800'
      case 'practice':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getGameResultColor = (game: GameData, playerName: string) => {
    const isPlayer1 = game.player1Name === playerName
    const isPlayer2 = game.player2Name === playerName

    if (game.result === 'draw') {
      return 'bg-blue-100' // Medium shade for draws
    } else if (
      (game.result === 'player1' && isPlayer1) ||
      (game.result === 'player2' && isPlayer2)
    ) {
      return 'bg-green-200' // Darker color for wins
    } else {
      return '' // No background for losses
    }
  }

  if (!isClient) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl text-[--color-text-secondary] mb-4">♟️</div>
          <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
            Loading...
          </h3>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl text-[--color-text-secondary] mb-4">🔐</div>
          <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
            Authentication Required
          </h3>
          <p className="text-[--color-text-secondary] mb-6">
            Please log in to view the chess ladder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
            Chess Ladder
          </h1>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Current ladder standings for active players. Rankings are updated automatically after each game.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">♟️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Loading ladder...
            </h3>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading ladder
            </h3>
            <p className="text-[--color-text-secondary] mb-6">{error}</p>
            <Button onClick={fetchLadderData} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Ladder Content */}
        {!loading && !error && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <div className="flex items-center gap-2">
                <label htmlFor="grade-filter" className="text-sm font-medium text-[--color-text-primary]">
                  Grade:
                </label>
                <select
                  id="grade-filter"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-3 py-1 border border-[--color-neutral-light] rounded-md bg-white text-[--color-text-primary]"
                >
                  {grades.map(grade => (
                    <option key={grade} value={grade}>
                      {grade === "all" ? "All Grades" : grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ladder Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Ladder Standings
                </CardTitle>
                <CardDescription>
                  {sortedPlayers.length} active player{sortedPlayers.length !== 1 ? 's' : ''} with games played
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl text-[--color-text-secondary] mb-4">🏆</div>
                    <p className="text-[--color-text-secondary]">
                      {selectedGrade === "all" 
                        ? "No players have played games yet." 
                        : `No players in grade ${selectedGrade} have played games yet.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[--color-neutral-light]">
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("rank")}
                          >
                            <div className="flex items-center gap-1">
                              Rank
                              {sortField === "rank" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-1">
                              Player
                              {sortField === "name" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("grade")}
                          >
                            <div className="flex items-center gap-1">
                              Grade
                              {sortField === "grade" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("gamesPlayed")}
                          >
                            <div className="flex items-center gap-1">
                              Games
                              {sortField === "gamesPlayed" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("wins")}
                          >
                            <div className="flex items-center gap-1">
                              W
                              {sortField === "wins" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("draws")}
                          >
                            <div className="flex items-center gap-1">
                              D
                              {sortField === "draws" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("losses")}
                          >
                            <div className="flex items-center gap-1">
                              L
                              {sortField === "losses" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("points")}
                          >
                            <div className="flex items-center gap-1">
                              Points
                              {sortField === "points" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPlayers.map((player) => (
                          <tr key={player.id} className="border-b border-[--color-neutral-light] hover:bg-[--color-neutral-light] transition-colors">
                            <td className="py-3 px-4">
                              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${getRankColor(player.rank || 999)}`}>
                                {getRankIcon(player.rank || 999)}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-[--color-text-primary]">
                              {player.name}
                            </td>
                            <td className="py-3 px-4 text-[--color-text-secondary]">
                              {player.grade}
                            </td>
                            <td className="py-3 px-4 text-[--color-text-secondary]">
                              {player.gamesPlayed}
                            </td>
                            <td className="py-3 px-4 text-green-600 font-medium">
                              {player.wins}
                            </td>
                            <td className="py-3 px-4 text-blue-600 font-medium">
                              {player.draws}
                            </td>
                            <td className="py-3 px-4 text-red-600 font-medium">
                              {player.losses}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[--color-text-primary]">
                              {player.points}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePlayerClick(player.id || '', player.name)}
                                className="flex items-center gap-1"
                              >
                                View Games
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expanded Player Games */}
            {expandedPlayer && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Games for {ladderPlayers.find(p => p.id === expandedPlayer)?.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedPlayer(null)}
                    >
                      Close
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingGames[expandedPlayer] ? (
                    <div className="text-center py-8">
                      <div className="text-4xl text-[--color-text-secondary] mb-4">♟️</div>
                      <p className="text-[--color-text-secondary]">Loading games...</p>
                    </div>
                  ) : playerGames[expandedPlayer] && playerGames[expandedPlayer].length > 0 ? (
                    <div className="space-y-4">
                      {playerGames[expandedPlayer].map((game) => (
                        <div key={game.id} className={`border border-[--color-neutral-light] rounded-lg p-4 ${getGameResultColor(game, ladderPlayers.find(p => p.id === expandedPlayer)?.name || '')}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[--color-text-primary]">
                                vs {getOpponentName(game, ladderPlayers.find(p => p.id === expandedPlayer)?.name || '')}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGameTypeColor(game.gameType)}`}>
                                {game.gameType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getResultIcon(game, ladderPlayers.find(p => p.id === expandedPlayer)?.name || '')}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[--color-text-secondary]">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(game.gameDate)}
                            </div>
                          </div>
                          {game.notes && (
                            <div className="mt-2 text-sm text-[--color-text-secondary]">
                              <strong>Notes:</strong> {game.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl text-[--color-text-secondary] mb-4">📝</div>
                      <p className="text-[--color-text-secondary]">No games found for this player.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
