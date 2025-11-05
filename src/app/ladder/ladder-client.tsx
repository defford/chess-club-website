"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronUp, ChevronDown, Crown, Medal, Award, Gamepad2, ChevronRight } from "lucide-react"
import { clientAuthService } from "@/lib/clientAuth"
import { isAuthenticated as isAdminAuthenticated } from "@/lib/auth"
import { useRouter } from "next/navigation"
import type { LadderPlayerData, GameData } from "@/lib/types"

type SortField = "rank" | "name" | "grade" | "gamesPlayed" | "wins" | "losses" | "draws" | "points" | "overallPoints" | "overallRank"
type SortDirection = "asc" | "desc"

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
  const [showPlayersWithoutDailyPoints, setShowPlayersWithoutDailyPoints] = useState(true)
  
  // Date-based ladder state
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [, setDateLoading] = useState(false)
  
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
        // Check both admin authentication and parent authentication
        const isAdminAuth = isAdminAuthenticated()
        const isParentAuth = clientAuthService.isParentAuthenticated()
        const authenticated = isAdminAuth || isParentAuth
        
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
  const fetchLadderData = async (date?: string) => {
    try {
      setLoading(true)
      let url = '/api/ladder'
      if (date) {
        url += `?date=${date}`
      }
      
      // Get current parent session for authentication (only if parent is authenticated)
      const parentSession = clientAuthService.getCurrentParentSession()
      const headers: Record<string, string> = {}
      
      if (parentSession?.email) {
        headers['x-user-email'] = parentSession.email
      }
      // Note: Admin users don't need headers as the ladder API doesn't require authentication
      
      const response = await fetch(url, { headers })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/parent/login?redirect=/ladder')
          return
        }
        throw new Error('Failed to fetch ladder data')
      }
      const data = await response.json()
      
      setSelectedDate(data.date || new Date().toISOString().split('T')[0])
      setLadderPlayers(data.players || [])
      setError(null)
      
      // Background load all player games after ladder data is loaded
      backgroundLoadAllPlayerGames(data.players || [])
    } catch (err) {
      console.error('Error fetching ladder data:', err)
      setError('Failed to load ladder data')
    } finally {
      setLoading(false)
    }
  }

  // Generate available dates (last 30 days + any dates with games)
  const fetchAvailableDates = async () => {
    try {
      setDateLoading(true)
      
      // Get current parent session for authentication (only if parent is authenticated)
      const parentSession = clientAuthService.getCurrentParentSession()
      const headers: Record<string, string> = {}
      
      if (parentSession?.email) {
        headers['x-user-email'] = parentSession.email
      }
      // Note: Admin users don't need headers as the games API doesn't require authentication
      
      // Generate last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const today = new Date().toISOString().split('T')[0]
      
      const last30Days: string[] = []
      for (let i = 0; i < 30; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        last30Days.push(date.toISOString().split('T')[0])
      }
      
      // Get games from the last 30 days to find additional dates with games
      const response = await fetch(`/api/games?dateFrom=${thirtyDaysAgo.toISOString().split('T')[0]}&dateTo=${today}&gameType=ladder`, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }
      const games = await response.json()
      
      // Extract unique dates from games
      const gameDates = [...new Set(games.map((game: GameData) => game.gameDate))].sort().reverse() as string[]
      console.log('Game dates found:', gameDates)
      console.log('Sample games:', games.slice(0, 3).map((g: GameData) => ({ date: g.gameDate, type: g.gameType })))
      
      // Combine last 30 days with game dates and remove duplicates
      const allDates = [...new Set([...last30Days, ...gameDates])].sort().reverse()
      setAvailableDates(allDates)
      
      // If no date is currently selected, load the most recent date with games
      if (!selectedDate) {
        // Find the most recent date with games (first in the sorted array)
        const mostRecentDateWithGames = allDates.length > 0 ? allDates[0] : today
        console.log('Auto-loading most recent date with games:', mostRecentDateWithGames)
        await fetchLadderData(mostRecentDateWithGames)
      }
    } catch (err) {
      console.error('Error fetching available dates:', err)
    } finally {
      setDateLoading(false)
    }
  }

  // Navigate to a different date
  const navigateToDate = async (date: string) => {
    // Don't clear cached player games since we show all games regardless of date
    await fetchLadderData(date)
  }

  // Initial data fetch
  useEffect(() => {
    if (!isAuthenticated) return
    
    // First fetch available dates, then load the most recent date with games
    const initializeLadder = async () => {
      await fetchAvailableDates()
      // After dates are loaded, fetch the most recent date (first in the sorted array)
      // This will be handled by the fetchAvailableDates function setting the first date
    }
    
    initializeLadder()
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


  // Fetch player games when expanding (all games, not filtered by date)
  const fetchPlayerGames = async (searchTerm: string, storageKey: string, isBackgroundLoad = false) => {
    // Use player ID as cache key since we want all games regardless of date
    const cacheKey = storageKey
    if (playerGames[cacheKey]) return // Already loaded

    if (!isBackgroundLoad) {
      setLoadingGames(prev => ({ ...prev, [storageKey]: true }))
    }
    
    try {
      // Get current parent session for authentication (only if parent is authenticated)
      const parentSession = clientAuthService.getCurrentParentSession()
      const headers: Record<string, string> = {}
      
      if (parentSession?.email) {
        headers['x-user-email'] = parentSession.email
      }
      // Note: Admin users don't need headers as the games API doesn't require authentication
      
      // Fetch all games for the player (no date filtering)
      const url = `/api/games/player/${encodeURIComponent(searchTerm)}`
      
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch player games')
      }
      const games = await response.json()
      // Filter out games against "Unknown Opponent"
      const filteredGames = games.filter((game: GameData) => 
        game.player1Name !== 'Unknown Opponent' && game.player2Name !== 'Unknown Opponent'
      )
      setPlayerGames(prev => ({ ...prev, [cacheKey]: filteredGames }))
    } catch (error) {
      console.error('Error fetching player games:', error)
    } finally {
      if (!isBackgroundLoad) {
        setLoadingGames(prev => ({ ...prev, [storageKey]: false }))
      }
    }
  }

  // Background load all player games
  const backgroundLoadAllPlayerGames = async (players: LadderPlayerData[]) => {
    const loadPromises = players.map(player => 
      fetchPlayerGames(player.name, player.id || '', true)
    )
    
    try {
      await Promise.allSettled(loadPromises)
    } catch (error) {
      console.error('Error in background loading player games:', error)
    }
  }

  const handlePlayerClick = (playerId: string, playerName: string) => {
    if (expandedPlayer === playerId) {
      setExpandedPlayer(null)
    } else {
      setExpandedPlayer(playerId)
      // Games should already be loaded in background, but fetch if not
      if (!playerGames[playerId]) {
        fetchPlayerGames(playerName, playerId)
      }
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

  // Helper function to get display stats based on toggle state
  const getDisplayStats = (player: LadderPlayerData) => {
    if (showPlayersWithoutDailyPoints) {
      // When showing players without daily points, show overall stats
      return {
        gamesPlayed: player.overallGamesPlayed || 0,
        wins: player.overallWins || 0,
        draws: player.overallDraws || 0,
        losses: player.overallLosses || 0,
        points: player.overallPoints || 0,
        rank: player.overallRank || 999
      }
    } else {
      // When not showing players without daily points, show daily stats
      return {
        gamesPlayed: player.gamesPlayed || 0,
        wins: player.wins || 0,
        draws: player.draws || 0,
        losses: player.losses || 0,
        points: player.points || 0,
        rank: player.rank || 999
      }
    }
  }

  const sortedPlayers = [...ladderPlayers]
    .filter(player => !player.id?.startsWith('unknown_')) // Filter out system players
    .filter(player => selectedGrade === "all" || player.grade === selectedGrade)
    .filter(player => showPlayersWithoutDailyPoints || player.points > 0) // Toggle filter for daily points
    .sort((a, b) => {
      let aValue: string | number | undefined
      let bValue: string | number | undefined

      // Handle the new overall fields
      if (sortField === "overallPoints") {
        aValue = a.overallPoints
        bValue = b.overallPoints
      } else if (sortField === "overallRank") {
        aValue = a.overallRank
        bValue = b.overallRank
      } else if (sortField === "wins" || sortField === "losses" || sortField === "draws" || sortField === "gamesPlayed" || sortField === "points" || sortField === "rank") {
        // Use getDisplayStats for fields that depend on the toggle state
        const aStats = getDisplayStats(a)
        const bStats = getDisplayStats(b)
        aValue = aStats[sortField as keyof typeof aStats]
        bValue = bStats[sortField as keyof typeof bStats]
      } else {
        const aFieldValue = a[sortField as keyof LadderPlayerData]
        const bFieldValue = b[sortField as keyof LadderPlayerData]
        aValue = aFieldValue === null ? undefined : aFieldValue as string | number | undefined
        bValue = bFieldValue === null ? undefined : bFieldValue as string | number | undefined
      }

      if (sortField === "name") {
        aValue = (aValue as string)?.toLowerCase() || ""
        bValue = (bValue as string)?.toLowerCase() || ""
      }

      if (sortDirection === "asc") {
        return (aValue || 0) < (bValue || 0) ? -1 : (aValue || 0) > (bValue || 0) ? 1 : 0
      } else {
        return (aValue || 0) > (bValue || 0) ? -1 : (aValue || 0) < (bValue || 0) ? 1 : 0
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

  const formatGameDate = (dateString: string) => {
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

  // Date navigation helpers
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }


  const handleDateChange = (date: string) => {
    navigateToDate(date)
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
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto mb-6">
            Chess ladder showing all players with overall points &gt; 0. Daily stats are shown for the selected date. Use the toggle to show/hide players without daily points.
          </p>
          
          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-4 mb-6">
          
            
            {/* Manual Date Input */}
            <div className="flex items-center gap-2">
              <input
                id="manual-date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1 border border-[--color-neutral-light] rounded-md bg-white text-[--color-text-primary]"
              />
            </div>
          </div>
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
            <Button onClick={() => fetchLadderData()} variant="outline">
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
              
              <div className="flex items-center gap-2">
                <label htmlFor="show-no-daily-toggle" className="text-sm font-medium text-[--color-text-primary]">
                  Show players without daily points:
                </label>
                <input
                  id="show-no-daily-toggle"
                  type="checkbox"
                  checked={showPlayersWithoutDailyPoints}
                  onChange={(e) => setShowPlayersWithoutDailyPoints(e.target.checked)}
                  className="w-4 h-4 text-[--color-accent] bg-gray-100 border-gray-300 rounded focus:ring-[--color-accent] focus:ring-2"
                />
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
                  {sortedPlayers.length} active player{sortedPlayers.length !== 1 ? 's' : ''} with overall points &gt; 0
                  {selectedDate && ` • ${showPlayersWithoutDailyPoints ? 'All games stats' : `Daily stats for ${formatDate(selectedDate)}`}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl text-[--color-text-secondary] mb-4">🏆</div>
                    <p className="text-[--color-text-secondary]">
                      {selectedGrade === "all" 
                        ? `No ladder games were played on ${selectedDate ? formatDate(selectedDate) : 'this date'}.` 
                        : `No players in grade ${selectedGrade} played ladder games on ${selectedDate ? formatDate(selectedDate) : 'this date'}.`}
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
                              {showPlayersWithoutDailyPoints ? "All Games Points" : "Daily Points"}
                              {sortField === "points" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("overallPoints")}
                          >
                            <div className="flex items-center gap-1">
                              Overall Points
                              {sortField === "overallPoints" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-4 cursor-pointer hover:bg-[--color-neutral-light] transition-colors"
                            onClick={() => handleSort("overallRank")}
                          >
                            <div className="flex items-center gap-1">
                              Overall Rank
                              {sortField === "overallRank" && (
                                sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPlayers.map((player) => {
                          const displayStats = getDisplayStats(player)
                          return (
                          <React.Fragment key={player.id}>
                            <tr className="border-b border-[--color-neutral-light] hover:bg-[--color-neutral-light] transition-colors">
                              <td className="py-3 px-4">
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${getRankColor(displayStats.rank)}`}>
                                  {getRankIcon(displayStats.rank)}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium text-[--color-text-primary]">
                                <div className="flex items-center gap-2">
                                  <span>{player.name}</span>
                                  {player.eloRating !== undefined && (
                                    <span className="text-sm font-normal text-[--color-text-secondary]">
                                      ({player.eloRating})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-[--color-text-secondary]">
                                {player.grade}
                              </td>
                              <td className="py-3 px-4 text-[--color-text-secondary]">
                                {displayStats.gamesPlayed}
                              </td>
                              <td className="py-3 px-4 text-green-600 font-medium">
                                {displayStats.wins}
                              </td>
                              <td className="py-3 px-4 text-blue-600 font-medium">
                                {displayStats.draws}
                              </td>
                              <td className="py-3 px-4 text-red-600 font-medium">
                                {displayStats.losses}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[--color-text-primary]">
                                {displayStats.points}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[--color-accent]">
                                {player.overallPoints}
                              </td>
                              <td className="py-3 px-4 text-[--color-text-secondary]">
                                #{player.overallRank}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePlayerClick(player.id || '', player.name)}
                                  className="flex items-center gap-1"
                                >
                                  {expandedPlayer === player.id ? 'Hide Games' : 'View Games'}
                                  <ChevronRight className={`h-3 w-3 transition-transform ${expandedPlayer === player.id ? 'rotate-90' : ''}`} />
                                </Button>
                              </td>
                            </tr>
                            {/* Expanded Game History Row */}
                            {expandedPlayer === player.id && (
                              <tr>
                                <td colSpan={11} className="p-0">
                                  <div className="bg-[--color-neutral-light] border-b border-[--color-neutral-light]">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-[--color-text-primary] text-sm">
                                          All Games for {player.name}
                                        </h3>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setExpandedPlayer(null)}
                                          className="text-xs px-2 py-1"
                                        >
                                          Close
                                        </Button>
                                      </div>
                                      {loadingGames[player.id || ''] ? (
                                        <div className="text-center py-4">
                                          <p className="text-[--color-text-secondary] text-sm">Loading games...</p>
                                        </div>
                                      ) : playerGames[player.id || ''] && playerGames[player.id || ''].length > 0 ? (
                                        <div className="space-y-1">
                                          {playerGames[player.id || ''].map((game, index) => (
                                            <div key={game.id} className={`flex items-center justify-between py-2 px-3 hover:bg-white/50 rounded text-sm ${getGameResultColor(game, player.name)}`}>
                                              <div className="flex items-center gap-3">
                                                <span className="font-medium text-[--color-text-primary] min-w-[80px]">
                                                  vs {getOpponentName(game, player.name)}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${getGameTypeColor(game.gameType)}`}>
                                                  {game.gameType}
                                                </span>
                                                <span className="text-[--color-text-secondary]">
                                                  {formatGameDate(game.gameDate)}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {getResultIcon(game, player.name)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4">
                                          <p className="text-[--color-text-secondary] text-sm">No games found for this player.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </div>
  )
}
