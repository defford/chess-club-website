"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Trophy, Calendar, Settings, LogOut, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PlayerWithRanking {
  playerId: string
  playerName: string
  playerAge: string
  playerGrade: string
  playerEmail: string
  ranking?: {
    rank: number
    points: number
    wins: number
    losses: number
    lastActive: string
  } | null
}

interface ParentSession {
  parentId: string
  email: string
  loginTime: number
}

// Client-safe session management
const getParentSession = (): ParentSession | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('chess-club-parent-auth')
    if (!stored) return null
    
    return JSON.parse(stored) as ParentSession
  } catch {
    return null
  }
}

const clearParentSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('chess-club-parent-auth')
  }
}

export default function ParentDashboard() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerWithRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [parentEmail, setParentEmail] = useState("")

  useEffect(() => {
    // Check authentication
    const session = getParentSession()
    if (!session) {
      router.push('/parent/login')
      return
    }

    setParentEmail(session.email)
    loadPlayers(session.email)
  }, [router])

  const loadPlayers = async (email: string) => {
    try {
      const response = await fetch('/api/parent/players', {
        headers: {
          'x-parent-email': email
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load players')
      }

      const result = await response.json()
      setPlayers(result.players)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearParentSession()
    router.push('/')
  }

  const getRankDisplay = (ranking: PlayerWithRanking['ranking']) => {
    if (!ranking) return 'Not ranked yet'
    return `#${ranking.rank} (${ranking.points} pts)`
  }

  const getRecordDisplay = (ranking: PlayerWithRanking['ranking']) => {
    if (!ranking) return 'No games played'
    return `${ranking.wins}W - ${ranking.losses}L`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
              <p className="text-gray-600">{parentEmail}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Club Home
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="w-8 h-8 text-[--color-primary]" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{players.length}</p>
                  <p className="text-gray-600">Players</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {players.filter(player => player.ranking?.rank && player.ranking.rank <= 10).length}
                  </p>
                  <p className="text-gray-600">Top 10 Rankings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {players.reduce((total, player) => total + (player.ranking?.wins || 0), 0)}
                  </p>
                  <p className="text-gray-600">Total Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Players Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Players</h2>
          <Link href="/parent/player/claim">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Claim Player
            </Button>
          </Link>
        </div>

        {players.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players claimed yet</h3>
              <p className="text-gray-600 mb-6">
                Claim your player's account to view their chess progress and register for events.
              </p>
              <Link href="/parent/player/claim">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Claim Your First Player
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <Card key={player.playerId} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/parent/player/${player.playerId}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{player.playerName}</CardTitle>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <CardDescription>
                      Age {player.playerAge} • Grade {player.playerGrade}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Rank:</span>
                        <span className="font-medium">{getRankDisplay(player.ranking)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Record:</span>
                        <span className="font-medium">{getRecordDisplay(player.ranking)}</span>
                      </div>
                      
                      {player.ranking && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Points:</span>
                          <span className="font-medium">{player.ranking.points}</span>
                        </div>
                      )}
                    </div>

                    {player.ranking?.rank && player.ranking.rank <= 10 && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <Trophy className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="text-sm font-medium text-yellow-800">Top 10 Player!</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/parent/player/events">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="w-6 h-6 text-blue-500 mr-3" />
                    <div>
                      <h3 className="font-medium">View Player Events</h3>
                      <p className="text-sm text-gray-600">Register for tournaments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/parent/player/rankings">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Trophy className="w-6 h-6 text-yellow-500 mr-3" />
                    <div>
                      <h3 className="font-medium">View Player Rankings</h3>
                      <p className="text-sm text-gray-600">See club leaderboard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/parent/player/claim">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Plus className="w-6 h-6 text-green-500 mr-3" />
                    <div>
                      <h3 className="font-medium">Claim Another Player</h3>
                      <p className="text-sm text-gray-600">Add another player</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
