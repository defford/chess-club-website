"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { Trophy, Gamepad2, Users, Plus, LogOut } from "lucide-react"
import type { PlayerData } from "@/lib/googleSheets"

export default function AdminRankingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [showGameForm, setShowGameForm] = useState(false)
  const [player1Id, setPlayer1Id] = useState("")
  const [player2Id, setPlayer2Id] = useState("")
  const [gameResult, setGameResult] = useState<"player1" | "player2" | "draw" | "">("")
  const [submitting, setSubmitting] = useState(false)
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
        loadPlayers()
      }
    }

    checkAuth()
  }, [router])

  const loadPlayers = async () => {
    try {
      const response = await fetch('/api/rankings')
      if (response.ok) {
        const playersData = await response.json()
        setPlayers(playersData)
      }
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const resetGameForm = () => {
    setPlayer1Id("")
    setPlayer2Id("")
    setGameResult("")
    setShowGameForm(false)
  }

  const submitGameResult = async () => {
    if (!player1Id || !player2Id || !gameResult) {
      alert("Please select both players and a game result")
      return
    }

    if (player1Id === player2Id) {
      alert("Players must be different")
      return
    }

    setSubmitting(true)
    
    try {
      const response = await fetch('/api/rankings/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1Id,
          player2Id,
          result: gameResult
        })
      })

      if (response.ok) {
        alert("Game result recorded successfully!")
        resetGameForm()
        loadPlayers() // Refresh the rankings
        localStorage.setItem('gameAdded', Date.now().toString())
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to record game result'}`)
      }
    } catch (error) {
      console.error('Error submitting game result:', error)
      alert("Error recording game result")
    } finally {
      setSubmitting(false)
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case "player1": return players.find(p => p.id === player1Id)?.name + " wins"
      case "player2": return players.find(p => p.id === player2Id)?.name + " wins"
      case "draw": return "Draw"
      default: return "Select result"
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

  if (!isAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[--color-accent]">
              Rankings Management
            </h1>
            <p className="text-[--color-text-primary] mt-1">
              Record game results and manage player rankings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Active Players
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">{players.length}</p>
              </div>
              <Users className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Total Games
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">
                  {players.reduce((sum, player) => sum + player.wins + player.losses, 0)}
                </p>
              </div>
              <Gamepad2 className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Current Leader
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">
                  {players.find(p => p.rank === 1)?.name || "None"}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
        </div>

        {/* Game Recording Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Record New Game */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Record Game Result
              </CardTitle>
              <CardDescription>
                Each player gets 1 point for playing. Winner gets +1 additional point (0.5 points for draw).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showGameForm ? (
                <Button 
                  onClick={() => setShowGameForm(true)}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record New Game
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Player 1 Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Player 1
                    </label>
                    <select
                      value={player1Id}
                      onChange={(e) => setPlayer1Id(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    >
                      <option value="">Select Player 1</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} (Grade {player.grade})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Player 2 Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Player 2
                    </label>
                    <select
                      value={player2Id}
                      onChange={(e) => setPlayer2Id(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    >
                      <option value="">Select Player 2</option>
                      {players.filter(p => p.id !== player1Id).map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} (Grade {player.grade})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Game Result */}
                  <div>
                    <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Game Result
                    </label>
                    <select
                      value={gameResult}
                      onChange={(e) => setGameResult(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    >
                      <option value="">Select Result</option>
                      {player1Id && <option value="player1">{players.find(p => p.id === player1Id)?.name} wins</option>}
                      {player2Id && <option value="player2">{players.find(p => p.id === player2Id)?.name} wins</option>}
                      <option value="draw">Draw</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={submitGameResult}
                      disabled={!player1Id || !player2Id || !gameResult || submitting}
                      className="flex-1"
                    >
                      {submitting ? "Recording..." : "Record Game"}
                    </Button>
                    <Button
                      onClick={resetGameForm}
                      variant="outline"
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Rankings Display */}
          <Card>
            <CardHeader>
              <CardTitle>Current Rankings</CardTitle>
              <CardDescription>
                Live view of current player standings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-[--color-text-secondary] text-center py-4">
                    No players found
                  </p>
                ) : (
                  players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[--color-primary] min-w-[24px]">
                          #{player.rank}
                        </span>
                        <div>
                          <p className="font-medium text-[--color-text-primary]">
                            {player.name}
                          </p>
                          <p className="text-xs text-[--color-text-secondary]">
                            Grade {player.grade}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[--color-accent]">
                          {player.points} pts
                        </p>
                        <p className="text-xs text-[--color-text-secondary]">
                          {player.wins}W-{player.losses}L
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
