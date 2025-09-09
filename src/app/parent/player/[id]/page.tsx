"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Trophy, Calendar, TrendingUp, User, Mail, Phone, AlertCircle } from "lucide-react"
import Link from "next/link"

// Client-safe session management
const getParentSession = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('chess-club-parent-auth')
    if (!stored) return null
    
    return JSON.parse(stored)
  } catch {
    return null
  }
}

interface PlayerDetails {
  playerId: string
  playerName: string
  playerAge: string
  playerGrade: string
  parentName: string
  parentEmail: string
  parentPhone: string
  emergencyContact: string
  emergencyPhone: string
  medicalInfo: string
  ranking?: {
    rank: number
    points: number
    wins: number
    losses: number
    lastActive: string
  } | null
}

interface EventRegistration {
  eventId: string
  playerName: string
  playerGrade: string
  additionalNotes: string
  eventDetails?: {
    id: string
    name: string
    date: string
    time: string
    location: string
    participants: number
    maxParticipants: number
    description: string
    category: 'tournament' | 'workshop' | 'training' | 'social'
    ageGroups: string
    status?: 'active' | 'cancelled' | 'completed'
    lastUpdated?: string
  }
}

export default function PlayerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = params.id as string
  
  const [player, setPlayer] = useState<PlayerDetails | null>(null)
  const [events, setEvents] = useState<EventRegistration[]>([])
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
    loadPlayerDetails(session.email)
  }, [router, playerId])

  const loadPlayerDetails = async (email: string) => {
    try {
      // Load students from students sheet by parent email
      const studentsResponse = await fetch(`/api/parent/students?email=${encodeURIComponent(email)}`)

      if (!studentsResponse.ok) {
        throw new Error('Failed to load student details')
      }

      const studentsResult = await studentsResponse.json()
      
      if (!studentsResult.success) {
        throw new Error(studentsResult.error || 'Failed to load students')
      }

      const foundStudent = studentsResult.students.find((s: any) => s.id === playerId)
      
      if (!foundStudent) {
        throw new Error('Student not found or you do not have permission to view this student')
      }

      // Convert student format to match the expected player format
      const playerFromStudent: PlayerDetails = {
        playerId: foundStudent.id,
        playerName: foundStudent.name,
        playerAge: foundStudent.age,
        playerGrade: foundStudent.grade,
        parentName: foundStudent.parentName || '',
        parentEmail: email, // We have this from the session
        parentPhone: foundStudent.parentPhone || '',
        emergencyContact: foundStudent.emergencyContact || '',
        emergencyPhone: foundStudent.emergencyPhone || '',
        medicalInfo: foundStudent.medicalInfo || '',
        ranking: foundStudent.ranking
      }

      setPlayer(playerFromStudent)

      // Load event registrations for this player
      await loadEventRegistrations(playerFromStudent.playerName)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load player details')
    } finally {
      setLoading(false)
    }
  }

  const getWinRate = (ranking: PlayerDetails['ranking']) => {
    if (!ranking || (ranking.wins + ranking.losses) === 0) return 0
    return Math.round((ranking.wins / (ranking.wins + ranking.losses)) * 100)
  }

  const loadEventRegistrations = async (playerName: string) => {
    try {
      const response = await fetch(`/api/events/registrations/${encodeURIComponent(playerName)}`)
      if (!response.ok) {
        throw new Error('Failed to load event registrations')
      }
      const registrations = await response.json()
      setEvents(registrations)
    } catch (error) {
      console.error('Error loading event registrations:', error)
      // Don't set error state for this, just log it
      setEvents([])
    }
  }

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return 'Never'
    const date = new Date(lastActive)
    return date.toLocaleDateString()
  }

  const getEventStatus = (eventDetails?: EventRegistration['eventDetails']) => {
    if (!eventDetails) return 'Unknown'
    
    const eventDate = new Date(eventDetails.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (eventDetails.status === 'cancelled') return 'Cancelled'
    if (eventDetails.status === 'completed') return 'Completed'
    if (eventDate < today) return 'Completed'
    if (eventDate.toDateString() === today.toDateString()) return 'Today'
    return 'Upcoming'
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Today':
        return 'bg-blue-100 text-blue-800'
      case 'Upcoming':
        return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
          <p className="mt-4 text-gray-600">Loading player details...</p>
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link 
            href="/parent/dashboard" 
            className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Player Not Found</h3>
              <p className="text-gray-600 mb-6">{error || 'The requested player could not be found.'}</p>
              <Link href="/parent/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
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
            <div className="flex items-center">
              <Link 
                href="/parent/dashboard" 
                className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 transition-colors mr-4"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{player.playerName}</h1>
                <p className="text-gray-600">Age {player.playerAge} • Grade {player.playerGrade}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Parent</p>
              <p className="font-medium">{player.parentName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {player.ranking?.rank ? `#${player.ranking.rank}` : 'Unranked'}
                  </p>
                  <p className="text-gray-600">Current Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{player.ranking?.points || 0}</p>
                  <p className="text-gray-600">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  W
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{player.ranking?.wins || 0}</p>
                  <p className="text-gray-600">Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                  L
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{player.ranking?.losses || 0}</p>
                  <p className="text-gray-600">Losses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Stats */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Statistics</CardTitle>
                <CardDescription>Chess performance and activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {player.ranking ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Win Rate</h4>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${getWinRate(player.ranking)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{getWinRate(player.ranking)}%</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Games Played</h4>
                          <p className="text-2xl font-bold text-gray-900">
                            {(player.ranking.wins + player.ranking.losses)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                        <p className="text-sm text-gray-600">
                          Last active: {formatLastActive(player.ranking.lastActive)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">No Games Played Yet</h3>
                      <p className="text-gray-600">
                        {player.playerName} hasn't played any ranked games yet. 
                        They'll appear in the rankings after their first game.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event History */}
            <Card>
              <CardHeader>
                <CardTitle>Event History</CardTitle>
                <CardDescription>Tournament and event registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map((registration) => {
                      const status = getEventStatus(registration.eventDetails)
                      const event = registration.eventDetails
                      
                      return (
                        <div key={registration.eventId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {event?.name || 'Unknown Event'}
                                </h4>
                                {event?.category && (
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                                    {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                                  </span>
                                )}
                              </div>
                              
                              {event && (
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>{event.date} {event.time && `at ${event.time}`}</span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center">
                                      <span className="w-4 h-4 mr-2">📍</span>
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEventStatusColor(status)}`}>
                              {status}
                            </span>
                          </div>
                          
                          {registration.additionalNotes && (
                            <div className="border-t pt-3">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Notes:</span> {registration.additionalNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">No Events Yet</h3>
                    <p className="text-gray-600 mb-4">
                      {player.playerName} hasn't registered for any events yet.
                    </p>
                    <Link href="/events">
                      <Button>Browse Upcoming Events</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Registered contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <User className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Parent</p>
                    <p className="text-sm text-gray-600">{player.parentName}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{player.parentEmail}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{player.parentPhone}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Emergency Contact</p>
                      <p className="text-sm text-gray-600">{player.emergencyContact}</p>
                      <p className="text-sm text-gray-600">{player.emergencyPhone}</p>
                    </div>
                  </div>
                </div>

                {player.medicalInfo && (
                  <div className="border-t pt-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Medical Information</p>
                        <p className="text-sm text-gray-600">{player.medicalInfo}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/events">
                  <Button className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Register for Events
                  </Button>
                </Link>
                
                <Link href="/rankings">
                  <Button variant="outline" className="w-full justify-start">
                    <Trophy className="w-4 h-4 mr-2" />
                    View Full Rankings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
