"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { clientAuthService } from "@/lib/clientAuth"
import type { TournamentData, TournamentResultData, TournamentPairing } from "@/lib/types"
import PairingEntry from "@/components/admin/PairingEntry"
import StandingsTable from "@/components/admin/StandingsTable"
import HalfPointByeSelector from "@/components/admin/HalfPointByeSelector"
import { 
  ArrowLeft, 
  LogOut, 
  Trophy, 
  Users, 
  Calendar, 
  Clock,
  Play,
  CheckCircle,
  Settings,
  BarChart3,
  Gamepad2,
  AlertCircle
} from "lucide-react"

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
}

export default function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tournament, setTournament] = useState<TournamentData | null>(null)
  const [standings, setStandings] = useState<TournamentResultData[]>([])
  const [currentPairings, setCurrentPairings] = useState<TournamentPairing[]>([])
  const [forcedByes, setForcedByes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'pairings' | 'standings' | 'settings'>('pairings')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pairingResults, setPairingResults] = useState<Record<string, string>>({})
  const [showHalfPointByeSelector, setShowHalfPointByeSelector] = useState(false)
  const [pairingsJustGenerated, setPairingsJustGenerated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { id } = await params
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
        setPairingsJustGenerated(false) // Reset flag on initial load
        loadTournamentData(id)
      }
    }

    checkAuth()
  }, [router, params])

  const loadTournamentData = async (tournamentId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const [tournamentResponse, standingsResponse] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}?email=${encodeURIComponent(userEmail)}`),
        fetch(`/api/tournaments/${tournamentId}/standings?email=${encodeURIComponent(userEmail)}`)
      ])

      if (!tournamentResponse.ok) {
        throw new Error('Failed to fetch tournament')
      }

      const tournamentData = await tournamentResponse.json()
      setTournament(tournamentData)

      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json()
        setStandings(standingsData.results || [])
      }

      // Load current round pairings if tournament is active and pairings weren't just generated
      if (tournamentData.status === 'active' && tournamentData.currentRound >= 1 && !pairingsJustGenerated) {
        await loadCurrentRoundPairings(tournamentId)
      }
    } catch (err) {
      console.error('Error loading tournament data:', err)
      setError('Failed to load tournament data')
    } finally {
      setLoading(false)
    }
  }

  const loadTournamentDataWithoutPairings = async (tournamentId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const [tournamentResponse, standingsResponse] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}?email=${encodeURIComponent(userEmail)}`),
        fetch(`/api/tournaments/${tournamentId}/standings?email=${encodeURIComponent(userEmail)}`)
      ])

      if (!tournamentResponse.ok) {
        throw new Error('Failed to fetch tournament')
      }

      const tournamentData = await tournamentResponse.json()
      setTournament(tournamentData)

      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json()
        setStandings(standingsData.results || [])
      }

      // Reset the flag after a short delay to allow for future reloads
      setTimeout(() => setPairingsJustGenerated(false), 1000)
    } catch (err) {
      console.error('Error loading tournament data:', err)
      setError('Failed to load tournament data')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentRoundPairings = async (tournamentId: string) => {
    try {
      console.log('Loading current round pairings for tournament:', tournamentId)
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const response = await fetch(`/api/tournaments/${tournamentId}/rounds?email=${encodeURIComponent(userEmail)}`)
      console.log('Rounds API response status:', response.status)
      
      if (response.ok) {
        const roundsData = await response.json()
        console.log('Loaded round data:', roundsData)
        console.log('Number of pairings:', roundsData.pairings?.length || 0)
        console.log('Forced byes:', roundsData.forcedByes)
        console.log('Half-point byes:', roundsData.halfPointByes)
        
        // Use the actual data from the API
        setCurrentPairings(roundsData.pairings || [])
        setForcedByes(roundsData.forcedByes || [])
        
        console.log('Set current pairings:', roundsData.pairings || [])
        console.log('Set forced byes:', roundsData.forcedByes || [])
      } else {
        console.error('Failed to load round pairings:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('Error loading round pairings:', err)
    }
  }

  const handleGeneratePairings = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const { id } = await params
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const response = await fetch(`/api/tournaments/${id}/rounds?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundNumber: tournament?.currentRound || 1
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate pairings')
      }

      const result = await response.json()
      console.log('Pairings generated:', result)
      console.log('Number of pairings:', result.pairings?.length || 0)
      console.log('Forced byes:', result.forcedByes)
      console.log('Half-point byes:', result.halfPointByes)
      setCurrentPairings(result.pairings || [])
      setForcedByes(result.forcedByes || [])
      setPairingsJustGenerated(true)
      
      // Show success message
      alert(`Round ${tournament?.currentRound} pairings generated successfully!`)
      
      // Refresh tournament data without reloading pairings (they're already set)
      const { id: tournamentId } = await params
      await loadTournamentDataWithoutPairings(tournamentId)
    } catch (err) {
      console.error('Error generating pairings:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate pairings')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResultChange = (pairingId: string, result: string) => {
    setPairingResults(prev => ({
      ...prev,
      [pairingId]: result
    }))
  }

  const handleSubmitResults = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const { id } = await params
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      
      const roundResults = Object.entries(pairingResults).map(([pairingId, result]) => ({
        pairingId,
        result
      }))

      const response = await fetch(`/api/tournaments/${id}/pairings?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundResults
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit results')
      }

      const result = await response.json()
      console.log('Results submitted successfully:', result)

      // Clear all pairing-related state
      setPairingResults({})
      setCurrentPairings([])
      setForcedByes([])
      setPairingsJustGenerated(false)
      
      // Refresh tournament data to get updated standings and tournament info
      const { id: tournamentId } = await params
      await loadTournamentDataWithoutPairings(tournamentId)
      
      // Show success message
      alert('Round results submitted successfully!')
    } catch (err) {
      console.error('Error submitting results:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit results')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleHalfPointByesAssigned = async () => {
    setShowHalfPointByeSelector(false)
    // Refresh tournament data to show updated standings
    const { id } = await params
    await loadTournamentData(id)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50'
      case 'active': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-4 w-4" />
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Tournament not found</p>
          <Button onClick={() => router.push('/admin/games/tournaments')} className="mt-4">
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
                {tournament.name}
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                {tournament.description || 'No description provided'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin/games/tournaments")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Tournaments</span>
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

        {/* Tournament Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[--color-primary]" />
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tournament.status)}`}>
                  {getStatusIcon(tournament.status)}
                  {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                </span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">Players</p>
                <p className="text-lg font-bold text-[--color-accent]">{tournament.playerIds.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">Round</p>
                <p className="text-lg font-bold text-[--color-accent]">
                  {tournament.currentRound} / {tournament.totalRounds}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">Start Date</p>
                <p className="text-sm font-bold text-[--color-accent]">{formatDate(tournament.startDate)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pairings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pairings'
                    ? 'border-[--color-primary] text-[--color-primary]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Pairings
                </div>
              </button>
              <button
                onClick={() => setActiveTab('standings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'standings'
                    ? 'border-[--color-primary] text-[--color-primary]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Standings
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-[--color-primary] text-[--color-primary]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'pairings' && (
          <div className="space-y-6">
            {/* Half-Point Bye Selector Modal */}
            {showHalfPointByeSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <HalfPointByeSelector
                  tournamentId={tournament.id}
                  roundNumber={tournament.currentRound}
                  players={standings}
                  onByesAssigned={handleHalfPointByesAssigned}
                  onCancel={() => setShowHalfPointByeSelector(false)}
                  userEmail={clientAuthService.getCurrentParentSession()?.email || 'dev@example.com'}
                />
              </div>
            )}

            {tournament.status === 'upcoming' && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">
                    Tournament Not Started
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This tournament hasn't started yet. You can start it from the tournaments list.
                  </p>
                  <Button
                    onClick={() => router.push('/admin/games/tournaments')}
                    variant="outline"
                  >
                    Back to Tournaments
                  </Button>
                </CardContent>
              </Card>
            )}

            {tournament.status === 'active' && (
              <div className="space-y-6">
                {currentPairings.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">
                        No Pairings Generated
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Generate pairings for Round {tournament.currentRound} to begin.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={() => setShowHalfPointByeSelector(true)}
                          variant="outline"
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          Assign Half-Point Byes
                        </Button>
                        <Button
                          onClick={handleGeneratePairings}
                          disabled={submitting}
                          variant="outline"
                        >
                          {submitting ? 'Generating...' : `Generate Round ${tournament.currentRound} Pairings`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[--color-text-primary]">
                        Round {tournament.currentRound} Pairings
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSubmitResults}
                          disabled={submitting || Object.keys(pairingResults).length === 0}
                          variant="outline"
                        >
                          {submitting ? 'Submitting...' : 'Submit Results'}
                        </Button>
                      </div>
                    </div>

                    {currentPairings.length > 0 ? (
                      currentPairings.map((pairing) => (
                        <PairingEntry
                          key={pairing.id}
                          pairing={pairing}
                          onResultChange={handleResultChange}
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No pairings generated yet. Click "Generate Round {tournament?.currentRound} Pairings" to create pairings.
                      </div>
                    )}

                    {forcedByes.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-orange-600">Forced Byes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            The following players received a bye (1 point): {forcedByes.join(', ')}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Show players with half-point byes */}
                    {standings.some(player => player.byeRounds.includes(tournament.currentRound)) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-600">Half-Point Byes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            The following players received half-point byes (0.5 points): {
                              standings
                                .filter(player => player.byeRounds.includes(tournament.currentRound))
                                .map(player => player.playerName)
                                .join(', ')
                            }
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {tournament.status === 'completed' && (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">
                    Tournament Completed
                  </h3>
                  <p className="text-gray-600">
                    This tournament has been completed. View the final standings in the Standings tab.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <StandingsTable
            standings={standings}
            tournamentId={tournament.id}
          />
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Tournament Settings</CardTitle>
              <CardDescription>
                Manage tournament settings and options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={tournament.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Description
                  </label>
                  <textarea
                    value={tournament.description}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tournament.startDate}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Total Rounds
                    </label>
                    <input
                      type="number"
                      value={tournament.totalRounds}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Tournament settings cannot be modified after creation. 
                    Contact the system administrator if changes are needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
