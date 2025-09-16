"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import { ArrowLeft, LogOut, Gamepad2 } from "lucide-react"
import type { GameData, PlayerData, GameFormData } from "@/lib/types"
import SimpleGameForm from "@/components/admin/SimpleGameForm"

export default function QuickGamePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
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
        loadPlayers()
      }
    }

    checkAuth()
  }, [router])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the students API to get all players from students sheet
      const response = await fetch('/api/students')

      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }

      const responseData = await response.json()

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to fetch students')
      }

      const students = responseData.students || []

      // Convert students to player format for the game form
      const playersData: PlayerData[] = students.map((student: any) => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        wins: 0, // Default values since these are from students
        losses: 0,
        points: 0,
        rank: 999,
        lastActive: student.timestamp || new Date().toISOString(),
        email: '' // Students don't have direct email
      }))

      setPlayers(playersData)
    } catch (err) {
      console.error('Error loading players:', err)
      setError('Failed to load players')
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
      setSuccess(false)

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

      setSuccess(true)
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push('/admin/games')
      }, 2000)
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setSubmitting(false)
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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
                Game Added Successfully!
              </h2>
              <p className="text-[--color-text-secondary] mb-4">
                Redirecting to games list...
              </p>
              <Button onClick={() => router.push('/admin/games')}>
                Go to Games List
              </Button>
            </div>
          </CardContent>
        </Card>
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
                Quick Add Game
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Record a chess game quickly and easily
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

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
            <p className="mt-2 text-[--color-text-primary]">Loading players...</p>
          </div>
        ) : (
          <SimpleGameForm
            players={players}
            onSubmit={handleGameSubmit}
            onCancel={() => router.push('/admin/games')}
            isLoading={submitting}
          />
        )}
      </div>
    </div>
  )
}
