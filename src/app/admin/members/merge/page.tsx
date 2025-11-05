"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { clientAuthService } from "@/lib/clientAuth"
import { 
  ArrowLeft, 
  Search,
  Users,
  Merge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface PlayerFromGames {
  id: string
  name: string
  gameCount: number
  isInStudents: boolean
}

interface MergePreview {
  sourcePlayer: PlayerFromGames
  targetPlayer: PlayerFromGames
  gamesToUpdate: number
}

export default function MergePlayersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [players, setPlayers] = useState<PlayerFromGames[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerFromGames[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeSuccess, setMergeSuccess] = useState(false)
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
      setLoading(true)
      setError(null)
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const response = await fetch(`/api/admin/merge-players?action=list&email=${encodeURIComponent(userEmail)}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch players')
      }
      const data = await response.json()
      setPlayers(data.players || [])
      setFilteredPlayers(data.players || [])
    } catch (err) {
      console.error('Error fetching players:', err)
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase()
      const filtered = players.filter((player) =>
        player.name.toLowerCase().includes(lowercaseQuery) ||
        player.id.toLowerCase().includes(lowercaseQuery)
      )
      setFilteredPlayers(filtered)
    } else {
      setFilteredPlayers(players)
    }
  }

  const handleSelectSource = (playerId: string) => {
    if (selectedTarget === playerId) {
      setSelectedTarget(null)
    }
    setSelectedSource(playerId)
    setMergePreview(null)
    setMergeError(null)
    setMergeSuccess(false)
  }

  const handleSelectTarget = (playerId: string) => {
    if (selectedSource === playerId) {
      return // Can't merge a player with itself
    }
    setSelectedTarget(playerId)
    setMergeError(null)
    setMergeSuccess(false)
    updateMergePreview(playerId)
  }

  const updateMergePreview = async (targetId: string) => {
    if (!selectedSource) return

    const sourcePlayer = players.find(p => p.id === selectedSource)
    const targetPlayer = players.find(p => p.id === targetId)

    if (!sourcePlayer || !targetPlayer) return

    try {
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const response = await fetch(
        `/api/admin/merge-players?action=preview&sourceId=${encodeURIComponent(selectedSource)}&targetId=${encodeURIComponent(targetId)}&email=${encodeURIComponent(userEmail)}`
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get merge preview')
      }
      const data = await response.json()
      setMergePreview({
        sourcePlayer,
        targetPlayer,
        gamesToUpdate: data.gamesToUpdate || 0
      })
    } catch (err) {
      console.error('Error getting merge preview:', err)
      setMergeError(err instanceof Error ? err.message : 'Failed to get merge preview')
    }
  }

  const handleMerge = async () => {
    if (!selectedSource || !selectedTarget || !mergePreview) return

    if (!confirm(
      `Are you sure you want to merge "${mergePreview.sourcePlayer.name}" into "${mergePreview.targetPlayer.name}"?\n\n` +
      `This will update ${mergePreview.gamesToUpdate} game(s) and cannot be undone.`
    )) {
      return
    }

    try {
      setIsMerging(true)
      setMergeError(null)
      setMergeSuccess(false)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch('/api/admin/merge-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          sourcePlayerId: selectedSource,
          targetPlayerId: selectedTarget,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to merge players')
      }

      setMergeSuccess(true)
      setSelectedSource(null)
      setSelectedTarget(null)
      setMergePreview(null)
      
      // Reload players after a short delay
      setTimeout(() => {
        loadPlayers()
      }, 1000)
    } catch (err) {
      console.error('Error merging players:', err)
      setMergeError(err instanceof Error ? err.message : 'Failed to merge players')
    } finally {
      setIsMerging(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading players...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  const orphanedPlayers = players.filter(p => !p.isInStudents)
  const registeredPlayers = players.filter(p => p.isInStudents)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <Link href="/admin/members">
            <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[--color-accent]">
              Merge Players
            </h1>
            <p className="text-[--color-text-primary] mt-1">
              Merge duplicate players from games into registered students
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                How merging works
              </p>
              <p className="text-sm text-blue-800">
                Select a player from games (source) to merge into a registered student (target). 
                All games referencing the source player will be updated to use the target player's ID and name. 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading players
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadPlayers} variant="outline">Try Again</Button>
          </Card>
        )}

        {!error && (
          <>
            {/* Search */}
            <Card className="p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players by name or ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
            </Card>

            {/* Merge Instructions */}
            {selectedSource && (
              <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Source selected:</strong> {players.find(p => p.id === selectedSource)?.name}
                  <br />
                  Now select a <strong>target player</strong> to merge into (must be a registered student).
                </p>
              </Card>
            )}

            {/* Merge Preview */}
            {mergePreview && (
              <Card className="p-6 mb-6 bg-green-50 border-green-200">
                <h3 className="font-semibold text-lg text-green-900 mb-4 flex items-center gap-2">
                  <Merge className="h-5 w-5" />
                  Merge Preview
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Source Player:</span>
                    <span className="font-medium text-green-900">{mergePreview.sourcePlayer.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Target Player:</span>
                    <span className="font-medium text-green-900">{mergePreview.targetPlayer.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Games to update:</span>
                    <span className="font-medium text-green-900">{mergePreview.gamesToUpdate}</span>
                  </div>
                </div>
                <Button
                  onClick={handleMerge}
                  disabled={isMerging}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Merge className="h-4 w-4 mr-2" />
                      Confirm Merge
                    </>
                  )}
                </Button>
                {mergeError && (
                  <p className="text-sm text-red-600 mt-2">{mergeError}</p>
                )}
                {mergeSuccess && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Players merged successfully!
                  </p>
                )}
              </Card>
            )}

            {/* Orphaned Players Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-[--color-accent] mb-4">
                Players in Games (Not in Students) - {orphanedPlayers.length}
              </h2>
              {orphanedPlayers.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-[--color-text-primary]">
                    All players in games are registered in the students table!
                  </p>
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="space-y-2">
                    {filteredPlayers
                      .filter(p => !p.isInStudents)
                      .map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                            selectedSource === player.id
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-[--color-text-primary]">{player.name}</p>
                              <p className="text-xs text-[--color-text-secondary]">ID: {player.id}</p>
                            </div>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              {player.gameCount} game(s)
                            </span>
                          </div>
                          <Button
                            variant={selectedSource === player.id ? "primary" : "outline"}
                            size="sm"
                            onClick={() => handleSelectSource(player.id)}
                            disabled={!!selectedTarget}
                          >
                            {selectedSource === player.id ? "Selected as Source" : "Select as Source"}
                          </Button>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Registered Players Section */}
            <div>
              <h2 className="text-xl font-semibold text-[--color-accent] mb-4">
                Registered Students - {registeredPlayers.length}
              </h2>
              <Card className="p-4">
                <div className="space-y-2">
                  {filteredPlayers
                    .filter(p => p.isInStudents)
                    .map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                          selectedTarget === player.id
                            ? 'bg-green-100 border-green-300'
                            : selectedSource === player.id
                            ? 'bg-gray-50 border-gray-200 opacity-50'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-[--color-text-primary]">{player.name}</p>
                            <p className="text-xs text-[--color-text-secondary]">ID: {player.id}</p>
                          </div>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {player.gameCount} game(s)
                          </span>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <Button
                          variant={selectedTarget === player.id ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleSelectTarget(player.id)}
                          disabled={!selectedSource || selectedSource === player.id}
                          className={selectedTarget === player.id ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {selectedTarget === player.id ? "Selected as Target" : "Select as Target"}
                        </Button>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

