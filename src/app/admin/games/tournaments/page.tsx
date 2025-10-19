"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import type { TournamentData, RegistrationData } from "@/lib/types"
import TournamentForm from "@/components/admin/TournamentForm"
import TournamentCard from "@/components/admin/TournamentCard"
import { 
  Plus, 
  Search, 
  Filter, 
  LogOut, 
  ArrowLeft, 
  Trophy,
  Calendar,
  Users,
  Clock
} from "lucide-react"

export default function TournamentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tournaments, setTournaments] = useState<TournamentData[]>([])
  const [members, setMembers] = useState<RegistrationData[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
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
      
      const [tournamentsResponse, membersResponse] = await Promise.all([
        fetch(`/api/tournaments?email=${encodeURIComponent(userEmail)}`),
        fetch('/api/members')
      ])

      if (!tournamentsResponse.ok || !membersResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [tournamentsData, membersData] = await Promise.all([
        tournamentsResponse.json(),
        membersResponse.json()
      ])

      setTournaments(tournamentsData)
      setMembers(membersData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load tournaments and members')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleCreateTournament = async (tournamentData: any) => {
    try {
      setSubmitting(true)
      setError(null)

      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/tournaments?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tournament')
      }

      // Refresh the tournaments list
      await loadData()
      setShowCreateForm(false)
      
    } catch (err) {
      console.error('Error creating tournament:', err)
      setError(err instanceof Error ? err.message : 'Failed to create tournament')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateTournament = async (tournamentId: string, updates: Partial<TournamentData>) => {
    try {
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/tournaments/${tournamentId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tournament')
      }

      // Refresh the tournaments list
      await loadData()
    } catch (err) {
      console.error('Error updating tournament:', err)
      setError(err instanceof Error ? err.message : 'Failed to update tournament')
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'

      const response = await fetch(`/api/tournaments/${tournamentId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete tournament')
      }

      // Refresh the tournaments list
      await loadData()
    } catch (err) {
      console.error('Error deleting tournament:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete tournament')
    }
  }

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = searchQuery === "" || 
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournament.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    return {
      all: tournaments.length,
      upcoming: tournaments.filter(t => t.status === 'upcoming').length,
      active: tournaments.filter(t => t.status === 'active').length,
      completed: tournaments.filter(t => t.status === 'completed').length,
      cancelled: tournaments.filter(t => t.status === 'cancelled').length
    }
  }

  const statusCounts = getStatusCounts()

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
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                Tournament Management
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Create and manage Swiss tournaments
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 md:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Total Tournaments
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.all}
                </p>
              </div>
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Active
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.active}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Upcoming
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.upcoming}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Completed
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.completed}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tournaments by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent text-base"
            />
          </div>
          
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base"
              >
                <option value="all">All Status ({statusCounts.all})</option>
                <option value="upcoming">Upcoming ({statusCounts.upcoming})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="completed">Completed ({statusCounts.completed})</option>
                <option value="cancelled">Cancelled ({statusCounts.cancelled})</option>
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[--color-primary] hover:bg-[--color-primary]/90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Tournament</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tournament Creation Form */}
        {showCreateForm && (
          <div className="mb-6">
            <TournamentForm
              onSubmit={handleCreateTournament}
              onCancel={() => setShowCreateForm(false)}
              isLoading={submitting}
              members={members}
            />
          </div>
        )}

        {/* Tournaments Display */}
        <Card>
          <CardHeader>
            <CardTitle>Tournaments</CardTitle>
            <CardDescription>
              {filteredTournaments.length} of {tournaments.length} tournaments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
                <p className="mt-2 text-[--color-text-primary]">Loading tournaments...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button onClick={loadData} className="mt-4" variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tournaments found</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4"
                  variant="outline"
                >
                  Create First Tournament
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onUpdate={handleUpdateTournament}
                    onDelete={handleDeleteTournament}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
