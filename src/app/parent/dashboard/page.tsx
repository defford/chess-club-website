"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Trophy, Calendar, Settings, LogOut, ChevronRight, MapPin, Clock, Users } from "lucide-react"
import Link from "next/link"
import type { EventData } from "@/lib/types"
import { clientAuthService } from "@/lib/clientAuth"

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

export default function ParentDashboard() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerWithRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [isSelfRegistered, setIsSelfRegistered] = useState(false)
  const [events, setEvents] = useState<EventData[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithRanking | null>(null)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationData, setRegistrationData] = useState({
    additionalNotes: ''
  })

  useEffect(() => {
    // Check authentication using the same service as login page
    if (!clientAuthService.isParentAuthenticated()) {
      router.push('/parent/login')
      return
    }

    const session = clientAuthService.getCurrentParentSession()
    if (!session) {
      router.push('/parent/login')
      return
    }

    setParentEmail(session.email)
    setIsSelfRegistered(session.isSelfRegistered || false)
    loadPlayers(session.email)
    loadEvents()
  }, [router])

  const loadPlayers = async (email: string) => {
    try {
      // Now pulling directly from students sheet by parent email
      const response = await fetch(`/api/parent/students?email=${encodeURIComponent(email)}`)

      if (!response.ok) {
        throw new Error('Failed to load students')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load students')
      }

      // Convert students format to match the expected players format
      const playersFromStudents = result.students.map((student: any) => ({
        playerId: student.id,
        playerName: student.name,
        playerAge: student.age,
        playerGrade: student.grade,
        parentId: student.parentId,
        ranking: student.ranking
      }))

      setPlayers(playersFromStudents)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    try {
      setEventsLoading(true)
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to load events')
      }
      const eventsData = await response.json()
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleRegisterClick = (event: EventData) => {
    setSelectedEvent(event)
    setShowRegistrationModal(true)
  }

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent || !selectedPlayer) return

    setRegistrationLoading(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          playerName: selectedPlayer.playerName,
          playerGrade: selectedPlayer.playerGrade,
          additionalNotes: registrationData.additionalNotes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to register for event')
      }

      // Success - close modal and reset form
      setShowRegistrationModal(false)
      setSelectedPlayer(null)
      setRegistrationData({
        additionalNotes: ''
      })
      
      // Refresh events to show updated participant count
      loadEvents()
      
      alert('Successfully registered for the event!')
    } catch (error) {
      console.error('Registration error:', error)
      alert('Failed to register for event. Please try again.')
    } finally {
      setRegistrationLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setRegistrationData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLogout = () => {
    clientAuthService.logoutParent()
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "tournament":
        return "bg-red-100 text-red-800"
      case "workshop":
        return "bg-blue-100 text-blue-800"
      case "training":
        return "bg-green-100 text-green-800"
      case "social":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
              <h1 className="text-2xl font-bold text-gray-900">
                {isSelfRegistered ? 'Player Dashboard' : 'Parent Dashboard'}
              </h1>
              <p className="text-gray-600">{parentEmail}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Club Home
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
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

        {/* Quick Stats
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
        </div> */}

        {/* Players Section
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Players</h2>
          <div className="flex space-x-3">
            <Link href="/parent/register-child">
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Register New Child
              </Button>
            </Link>
            <Link href="/parent/player/claim">
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Claim Player
              </Button>
            </Link>
          </div>
        </div> */}
        {players.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isSelfRegistered ? 'No player data yet' : 'No players yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {isSelfRegistered 
                  ? 'Your player account is being set up. You\'ll be able to view your chess progress and register for events once it\'s ready.'
                  : 'Register your player\'s account to view their chess progress and register for events.'
                }
              </p>
              {!isSelfRegistered && (
                <Link href="/parent/register-child">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Your First Player
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Floating Action Button */}
            <div className="absolute top-0 right-0 z-10">
              <Link href="/parent/register-child">
                <Button variant="outline" size="sm" className="shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Student
                </Button>
              </Link>
            </div>
            
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
                        <span className="text-sm text-gray-600">
                          {isSelfRegistered ? 'My Rank:' : 'Current Rank:'}
                        </span>
                        <span className="font-medium">{getRankDisplay(player.ranking)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {isSelfRegistered ? 'My Record:' : 'Record:'}
                        </span>
                        <span className="font-medium">{getRecordDisplay(player.ranking)}</span>
                      </div>
                      
                      {player.ranking && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {isSelfRegistered ? 'My Points:' : 'Points:'}
                          </span>
                          <span className="font-medium">{player.ranking.points}</span>
                        </div>
                      )}
                      </div>

                      {player.ranking?.rank && player.ranking.rank <= 10 && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <Trophy className="w-4 h-4 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-800">
                              {isSelfRegistered ? 'You\'re in the Top 10!' : 'Top 10 Player!'}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Events Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/events">
              <Button variant="outline" size="sm">
                View All Events
              </Button>
            </Link>
          </div>

          {eventsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events available</h3>
                <p className="text-gray-600">Check back later for upcoming tournaments and workshops.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                        {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                      </span>
                      <div className="text-[--color-secondary] text-2xl">♙</div>
                    </div>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{event.date}</span>
                      </div>
                      
                      {event.time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{event.time}</span>
                        </div>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.ageGroups && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>Age Groups: {event.ageGroups}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          disabled={players.length === 0}
                          onClick={() => handleRegisterClick(event)}
                        >
                          {players.length === 0 
                            ? (isSelfRegistered ? "Player Data Loading..." : "Register a Player First") 
                            : (isSelfRegistered ? "Register" : "Register for Event")
                          }
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {/* <div className="mt-12">
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

            <Link href="/parent/register-child">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Plus className="w-6 h-6 text-green-500 mr-3" />
                    <div>
                      <h3 className="font-medium">Register New Child</h3>
                      <p className="text-sm text-gray-600">Add a new child to chess club</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div> */}

        {/* Registration Modal */}
        {showRegistrationModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Register for {selectedEvent.name}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegistrationModal(false)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{selectedEvent.date} at {selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>

                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  {/* Player Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSelfRegistered ? 'Register for Event *' : 'Select Player to Register *'}
                    </label>
                    <div className="space-y-2">
                      {players.map((player) => (
                        <div
                          key={player.playerId}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPlayer?.playerId === player.playerId
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{player.playerName}</p>
                              <p className="text-sm text-gray-600">
                                Age {player.playerAge} • Grade {player.playerGrade}
                              </p>
                            </div>
                            {selectedPlayer?.playerId === player.playerId && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
{/* 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parent/Guardian Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationData.parentName}
                        onChange={(e) => handleInputChange('parentName', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parent Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationData.parentPhone}
                        onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationData.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationData.emergencyPhone}
                        onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Information (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any allergies, medical conditions, or special requirements..."
                      value={registrationData.medicalInfo}
                      onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
                    />
                  </div> */}

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requirements, dietary restrictions, or other notes..."
                      value={registrationData.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowRegistrationModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      className="flex-1"
                      disabled={registrationLoading || !selectedPlayer}
                    >
                      {registrationLoading ? 'Registering...' : ('Register')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
