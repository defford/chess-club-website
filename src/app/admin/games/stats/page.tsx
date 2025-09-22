"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { ArrowLeft, LogOut, BarChart3, TrendingUp, Users, Calendar, Trophy, Gamepad2 } from "lucide-react"
import type { GameData } from "@/lib/types"

interface GameStats {
  totalGames: number
  gamesThisMonth: number
  gamesThisWeek: number
  ladderGames: number
  tournamentGames: number
  friendlyGames: number
  practiceGames: number
  averageGameTime: number
  mostActivePlayer: string
  recentGames: GameData[]
}

export default function GameStatsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        loadStats()
      }
    }

    checkAuth()
  }, [router])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/games/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch game statistics')
      }

      const statsData = await response.json()
      setStats(statsData)
    } catch (err) {
      console.error('Error loading stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              onClick={() => router.push("/admin/games")}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Statistics Unavailable</h3>
              <p className="text-gray-600 mb-6">{error || 'Unable to load game statistics.'}</p>
              <Button onClick={loadStats}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header - Mobile Responsive */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                Game Statistics
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Comprehensive game analytics and insights
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin/games")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Games</span>
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Statistics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                      Total Games
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                      {stats.totalGames}
                    </p>
                  </div>
                  <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-[--color-primary]" />
                </div>
              </Card>
              
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                      This Month
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                      {stats.gamesThisMonth}
                    </p>
                  </div>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </Card>
              
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                      This Week
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                      {stats.gamesThisWeek}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </Card>
              
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                      Avg Duration
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                      {stats.averageGameTime}m
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Game Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Game Types</CardTitle>
                <CardDescription>
                  Distribution of games by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.ladderGames}
                    </div>
                    <div className="text-sm text-[--color-text-secondary]">Ladder</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.tournamentGames}
                    </div>
                    <div className="text-sm text-[--color-text-secondary]">Tournament</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.friendlyGames}
                    </div>
                    <div className="text-sm text-[--color-text-secondary]">Friendly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.practiceGames}
                    </div>
                    <div className="text-sm text-[--color-text-secondary]">Practice</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Recent Games</CardTitle>
                <CardDescription>
                  Latest game activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentGames.length === 0 ? (
                  <div className="text-center py-8">
                    <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent games</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentGames.slice(0, 5).map((game) => (
                      <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[--color-text-primary] truncate">
                            {game.player1Name} vs {game.player2Name}
                          </p>
                          <p className="text-sm text-[--color-text-secondary]">
                            {new Date(game.gameDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGameTypeColor(game.gameType)}`}>
                            {game.gameType}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(game.result)}`}>
                            {game.result === 'player1' ? `${game.player1Name} wins` : 
                             game.result === 'player2' ? `${game.player2Name} wins` : 'Draw'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Most Active Player */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Active Player</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Users className="h-12 w-12 text-[--color-primary] mx-auto mb-4" />
                  <div className="text-xl font-bold text-[--color-accent]">
                    {stats.mostActivePlayer || 'N/A'}
                  </div>
                  <div className="text-sm text-[--color-text-secondary]">Most games played</div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push('/admin/games')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Add New Game
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/games')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  View All Games
                </Button>
                <Button
                  variant="outline"
                  onClick={loadStats}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Refresh Stats
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


