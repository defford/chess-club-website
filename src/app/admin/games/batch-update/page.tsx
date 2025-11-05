"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { 
  ArrowLeft, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Database
} from "lucide-react"
import Link from "next/link"

interface GameUpdatePreview {
  gameId: string
  player1Current: { id: string; name: string }
  player1New: { id: string; name: string } | null
  player2Current: { id: string; name: string }
  player2New: { id: string; name: string } | null
  gameDate: string
}

interface PreviewResponse {
  totalGames: number
  gamesToUpdate: number
  preview: GameUpdatePreview[]
  totalPreviewCount: number
}

interface BatchUpdateResult {
  gamesUpdated: number
  player1Updates: number
  player2Updates: number
  gamesNotChanged: number
}

export default function BatchUpdateGamesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeResult, setExecuteResult] = useState<BatchUpdateResult | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set())
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
        loadPreview()
      }
    }

    checkAuth()
  }, [router])

  const loadPreview = async () => {
    try {
      setLoading(true)
      setError(null)
      setExecuteResult(null)
      setExecuteError(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(
        `/api/admin/batch-update-games?action=preview&email=${encodeURIComponent(userEmail)}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load preview')
      }

      const data = await response.json()
      setPreview(data)
      // Initialize selection: all games selected by default
      if (data.preview) {
        setSelectedGameIds(new Set(data.preview.map((item: GameUpdatePreview) => item.gameId)))
      }
    } catch (err) {
      console.error('Error loading preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!preview || selectedGameIds.size === 0) {
      return
    }

    if (!confirm(
      `Are you sure you want to update ${selectedGameIds.size} selected game(s)?\n\n` +
      `This will update player IDs and names to match the students table based on first name matching. ` +
      `This action cannot be undone.`
    )) {
      return
    }

    try {
      setIsExecuting(true)
      setExecuteError(null)
      setExecuteResult(null)

      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch('/api/admin/batch-update-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          gameIds: Array.from(selectedGameIds),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute batch update')
      }

      const data = await response.json()
      setExecuteResult(data.result)
      
      // Clear selection after successful update
      setSelectedGameIds(new Set())
      
      // Reload preview to show updated state
      setTimeout(() => {
        loadPreview()
      }, 1000)
    } catch (err) {
      console.error('Error executing batch update:', err)
      setExecuteError(err instanceof Error ? err.message : 'Failed to execute batch update')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleToggleGame = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (!preview) return
    setSelectedGameIds(new Set(preview.preview.map((item) => item.gameId)))
  }

  const handleDeselectAll = () => {
    setSelectedGameIds(new Set())
  }

  const selectedCount = selectedGameIds.size

  if (isLoading || loading) {
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
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <Link href="/admin/games">
            <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[--color-accent]">
              Batch Update Games
            </h1>
            <p className="text-[--color-text-primary] mt-1">
              Update player IDs and names in games table to match students table
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                How batch update works
              </p>
              <p className="text-sm text-blue-800">
                This tool matches players in games to students by first name (case-insensitive). 
                When a match is found, both the player ID and name in the game record are updated 
                to match the student's ID and full name from the students table. Games with players 
                that don't match any student are left unchanged.
              </p>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading preview
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadPreview} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        )}

        {/* Preview Section */}
        {!error && preview && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[--color-text-primary]">
                      Total Games
                    </p>
                    <p className="text-2xl font-bold text-[--color-accent]">
                      {preview.totalGames}
                    </p>
                  </div>
                  <Database className="h-8 w-8 text-[--color-primary]" />
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[--color-text-primary]">
                      Selected for Update
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedCount} / {preview.gamesToUpdate}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[--color-text-primary]">
                      Games Unchanged
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {preview.totalGames - preview.gamesToUpdate}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
            </div>

            {/* Execute Button */}
            {preview.gamesToUpdate > 0 && (
              <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-yellow-900 mb-2">
                        Ready to Update
                      </h3>
                      <p className="text-sm text-yellow-800">
                        {selectedCount} of {preview.gamesToUpdate} game(s) selected. Review the preview below, then click Execute to proceed.
                      </p>
                    </div>
                    <Button
                      onClick={handleExecute}
                      disabled={isExecuting || selectedCount === 0}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Execute Update ({selectedCount})
                        </>
                      )}
                    </Button>
                  </div>
                  {preview.preview.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSelectAll}
                        variant="outline"
                        size="sm"
                        className="text-sm"
                      >
                        Select All ({preview.preview.length})
                      </Button>
                      <Button
                        onClick={handleDeselectAll}
                        variant="outline"
                        size="sm"
                        className="text-sm"
                      >
                        Deselect All
                      </Button>
                    </div>
                  )}
                </div>
                {executeError && (
                  <p className="text-sm text-red-600 mt-4">{executeError}</p>
                )}
                {executeResult && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Update completed successfully!
                    </p>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• {executeResult.gamesUpdated} game(s) updated</p>
                      <p>• {executeResult.player1Updates} player 1 record(s) updated</p>
                      <p>• {executeResult.player2Updates} player 2 record(s) updated</p>
                      <p>• {executeResult.gamesNotChanged} game(s) unchanged</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* No Updates Needed */}
            {preview.gamesToUpdate === 0 && (
              <Card className="p-8 text-center mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-xl text-green-900 mb-2">
                  All games are up to date!
                </h3>
                <p className="text-green-800">
                  All player records in the games table match the students table.
                </p>
              </Card>
            )}

            {/* Preview Table */}
            {preview.preview.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Preview of Changes</CardTitle>
                      <CardDescription>
                        Showing first {preview.preview.length} of {preview.totalPreviewCount} games that will be updated
                      </CardDescription>
                    </div>
                    <Button
                      onClick={loadPreview}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-[--color-text-primary] w-12">
                            <input
                              type="checkbox"
                              checked={preview.preview.length > 0 && selectedGameIds.size === preview.preview.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSelectAll()
                                } else {
                                  handleDeselectAll()
                                }
                              }}
                              className="w-4 h-4 text-[--color-primary] border-gray-300 rounded focus:ring-[--color-primary]"
                            />
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Player 1</th>
                          <th className="text-left py-3 px-4 font-medium text-[--color-text-primary]">Player 2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map((item) => (
                          <tr 
                            key={item.gameId} 
                            className={`border-b hover:bg-gray-50 ${selectedGameIds.has(item.gameId) ? 'bg-blue-50' : ''}`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedGameIds.has(item.gameId)}
                                onChange={() => handleToggleGame(item.gameId)}
                                className="w-4 h-4 text-[--color-primary] border-gray-300 rounded focus:ring-[--color-primary]"
                              />
                            </td>
                            <td className="py-3 px-4 text-[--color-text-primary]">
                              {new Date(item.gameDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              {item.player1New ? (
                                <div>
                                  <div className="text-sm text-gray-500 line-through">
                                    {item.player1Current.name} ({item.player1Current.id})
                                  </div>
                                  <div className="text-sm font-medium text-green-600">
                                    → {item.player1New.name} ({item.player1New.id})
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-[--color-text-primary]">
                                  {item.player1Current.name} ({item.player1Current.id})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {item.player2New ? (
                                <div>
                                  <div className="text-sm text-gray-500 line-through">
                                    {item.player2Current.name} ({item.player2Current.id})
                                  </div>
                                  <div className="text-sm font-medium text-green-600">
                                    → {item.player2New.name} ({item.player2New.id})
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-[--color-text-primary]">
                                  {item.player2Current.name} ({item.player2Current.id})
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

