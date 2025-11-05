"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { ArrowLeft, LogOut, Edit, Trash2, Calendar, Users, Trophy, FileText, Gamepad2 } from "lucide-react"
import type { GameData } from "@/lib/types"

export default function GameDetailPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [game, setGame] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const gameId = params.id as string

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
        loadGame()
      }
    }

    checkAuth()
  }, [router, gameId])

  const loadGame = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/games/${gameId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Game not found')
        }
        throw new Error('Failed to fetch game')
      }

      const gameData = await response.json()
      setGame(gameData)
    } catch (err) {
      console.error('Error loading game:', err)
      setError(err instanceof Error ? err.message : 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleDelete = async () => {
    if (!game || !confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete game')
      }

      // Redirect to games list after successful deletion
      router.push('/admin/games')
    } catch (err) {
      console.error('Error deleting game:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete game')
    } finally {
      setDeleting(false)
    }
  }

  const getResultLabel = (result: string) => {
    if (!game) return 'Unknown'
    switch (result) {
      case "player1": return `${game.player1Name} wins`
      case "player2": return `${game.player2Name} wins`
      case "draw": return "Draw"
      default: return "Unknown"
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case "player1": return "text-green-600 bg-green-50 border-green-200"
      case "player2": return "text-green-600 bg-green-50 border-green-200"
      case "draw": return "text-yellow-600 bg-yellow-50 border-yellow-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getGameTypeColor = (type: string) => {
    switch (type) {
      case "ladder": return "text-blue-600 bg-blue-50 border-blue-200"
      case "tournament": return "text-purple-600 bg-purple-50 border-purple-200"
      case "friendly": return "text-green-600 bg-green-50 border-green-200"
      case "practice": return "text-orange-600 bg-orange-50 border-orange-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
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
          <p className="mt-2 text-[--color-text-primary]">Loading game details...</p>
        </div>
      </div>
    )
  }

  if (error || !game) {
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
              <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Game Not Found</h3>
              <p className="text-gray-600 mb-6">{error || 'The requested game could not be found.'}</p>
              <Button onClick={() => router.push('/admin/games')} variant="outline">
                Return to Games List
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
                Game Details
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                View and manage game information
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
          {/* Main Game Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Overview */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Game Overview</CardTitle>
                    <CardDescription>
                      Basic game information and result
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Players */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[--color-primary]" />
                    <span className="font-medium text-[--color-text-primary]">Players:</span>
                  </div>
                  <div className="text-[--color-text-primary]">
                    <span className="font-medium">{game.player1Name}</span>
                    <span className="mx-2 text-gray-400">vs</span>
                    <span className="font-medium">{game.player2Name}</span>
                  </div>
                </div>

                {/* Result */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[--color-primary]" />
                    <span className="font-medium text-[--color-text-primary]">Result:</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getResultColor(game.result)}`}>
                    {getResultLabel(game.result)}
                  </span>
                </div>

                {/* Game Type */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-[--color-primary]" />
                    <span className="font-medium text-[--color-text-primary]">Type:</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getGameTypeColor(game.gameType)}`}>
                    {game.gameType}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Game Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Game Details</CardTitle>
                <CardDescription>
                  Additional game information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[--color-primary]" />
                    <span className="font-medium text-[--color-text-primary]">Date:</span>
                  </div>
                  <span className="text-[--color-text-primary]">
                    {new Date(game.gameDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Event ID */}
                {game.eventId && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[--color-primary]" />
                      <span className="font-medium text-[--color-text-primary]">Event ID:</span>
                    </div>
                    <span className="text-[--color-text-primary] font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {game.eventId}
                    </span>
                  </div>
                )}

                {/* Opening */}
                {game.opening && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[--color-primary]" />
                      <span className="font-medium text-[--color-text-primary]">Opening:</span>
                    </div>
                    <span className="text-[--color-text-primary]">
                      {game.opening}
                    </span>
                  </div>
                )}

                {/* Endgame */}
                {game.endgame && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[--color-primary]" />
                      <span className="font-medium text-[--color-text-primary]">Endgame:</span>
                    </div>
                    <span className="text-[--color-text-primary]">
                      {game.endgame}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {game.notes && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[--color-primary]" />
                      <span className="font-medium text-[--color-text-primary]">Notes:</span>
                    </div>
                    <p className="text-[--color-text-primary] leading-relaxed">
                      {game.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[--color-accent]">
                    {new Date(game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm text-[--color-text-secondary]">Date</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-[--color-accent] capitalize">
                    {game.gameType}
                  </div>
                  <div className="text-sm text-[--color-text-secondary]">Type</div>
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
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Game
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete Game'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/games')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Games
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


