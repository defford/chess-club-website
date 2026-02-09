"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock, User } from "lucide-react"
import { useState, useEffect } from "react"
import type { EventData } from "@/lib/types"
import { clientAuthService } from "@/lib/clientAuth"
import type { ParentSession } from "@/lib/types"

interface EventsPageClientProps {
  initialEvents?: EventData[];
}

export function EventsPageClient({ initialEvents = [] }: EventsPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [allEvents, setAllEvents] = useState<EventData[]>(initialEvents)
  const [loading, setLoading] = useState(initialEvents.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationData, setRegistrationData] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    playerName: '',
    playerAge: '',
    playerGrade: '',
    playerSchool: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalInfo: '',
    createAccount: false
  })

  // Authentication and student management
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [parentSession, setParentSession] = useState<ParentSession | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authenticated = clientAuthService.isParentAuthenticated()
      const session = clientAuthService.getCurrentParentSession()
      setIsAuthenticated(authenticated)
      setParentSession(session)
    }

    checkAuth()

    // Listen for auth state changes
    const handleAuthChange = () => {
      checkAuth()
    }

    window.addEventListener('authStateChanged', handleAuthChange)
    return () => window.removeEventListener('authStateChanged', handleAuthChange)
  }, [])

  useEffect(() => {
    // Load students if authenticated
    if (isAuthenticated && parentSession) {
      loadStudents()
    }
  }, [isAuthenticated, parentSession])

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (initialEvents.length > 0) {
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        const events = await response.json()
        setAllEvents(events)
        setError(null)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [initialEvents.length])

  const loadStudents = async () => {
    if (!parentSession) return

    try {
      setStudentsLoading(true)
      const response = await fetch(`/api/parent/students?email=${encodeURIComponent(parentSession.email)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      const responseData = await response.json()
      
      // Handle the API response structure
      if (responseData.success && Array.isArray(responseData.students)) {
        setStudents(responseData.students)
      } else {
        console.error('Invalid students response:', responseData)
        setStudents([])
      }
    } catch (error) {
      console.error('Error loading students:', error)
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }

  const filteredEvents = (selectedCategory === "all" 
    ? allEvents 
    : allEvents.filter(event => event.category === selectedCategory)
  ).filter(event => !event.status || event.status === 'active')

  const categories = [
    { value: "all", label: "All Events" },
    { value: "tournament", label: "Tournaments" },
    { value: "workshop", label: "Workshops" },
    { value: "training", label: "Training" },
    { value: "social", label: "Social" }
  ]

  const handleRegisterClick = (event: EventData) => {
    setSelectedEvent(event)
    setSelectedStudent(null)
    setShowRegistrationModal(true)
  }

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) return

    // For authenticated users, require a student selection
    if (isAuthenticated && (!selectedStudent || !selectedStudent.id)) {
      alert('Please select a student to register.')
      return
    }

    setRegistrationLoading(true)
    try {
      const requestBody = isAuthenticated && selectedStudent
        ? {
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            playerName: selectedStudent.name,
            playerGrade: selectedStudent.grade,
            playerSchool: registrationData.playerSchool,
            parentEmail: parentSession?.email,
            additionalNotes: registrationData.medicalInfo || ''
          }
        : {
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            ...registrationData
          }

      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error('Failed to register for event')
      }

      // If user opted to create an account (non-authenticated users only)
      if (!isAuthenticated && registrationData.createAccount) {
        try {
          await fetch('/api/parent/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: registrationData.parentEmail
            }),
          })
        } catch (accountError) {
          console.error('Account creation error:', accountError)
          // Don't fail the event registration if account creation fails
        }
      }

      // Success - close modal and reset form
      setShowRegistrationModal(false)
      setSelectedStudent(null)
      setRegistrationData({
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        playerName: '',
        playerAge: '',
        playerGrade: '',
        playerSchool: '',
        emergencyContact: '',
        emergencyPhone: '',
        medicalInfo: '',
        createAccount: false
      })
      
      // Refresh events to show updated participant count
      const eventsResponse = await fetch('/api/events')
      if (eventsResponse.ok) {
        const updatedEvents = await eventsResponse.json()
        setAllEvents(updatedEvents)
      }
      
      alert('Successfully registered for the event!')
    } catch (error) {
      console.error('Registration error:', error)
      alert('Failed to register for event. Please try again.')
    } finally {
      setRegistrationLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setRegistrationData(prev => ({
      ...prev,
      [field]: value
    }))
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

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
            Club Events
          </h1>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Join us for tournaments, workshops, training sessions, and social events designed to improve your chess skills and connect with fellow players.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">♟️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Loading events...
            </h3>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading events
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
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
                  <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{event.date}</span>
                  </div>
                  
                  {event.time && (
                    <div className="flex items-center text-sm text-[--color-text-secondary]">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  
                  {event.location && (
                    <div className="flex items-center text-sm text-[--color-text-secondary]">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {/* <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <Users className="h-4 w-4 mr-2" />
                    <span>
                      {event.participants || 0}
                      {event.maxParticipants > 0 ? `/${event.maxParticipants}` : ''} registered
                    </span>
                  </div> */}

                  <div className="pt-2 border-t">
                    {event.ageGroups && (
                      <p className="text-sm font-medium text-[--color-text-primary] mb-2">
                        Age Groups: {event.ageGroups}
                      </p>
                    )}
                    
                    {isAuthenticated && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        disabled={event.maxParticipants > 0 && event.participants >= event.maxParticipants}
                        onClick={() => handleRegisterClick(event)}
                      >
                        {(event.maxParticipants > 0 && event.participants >= event.maxParticipants) ? "Event Full" : "Register Student"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">♟️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              No events found
            </h3>
            <p className="text-[--color-text-secondary]">
              Try selecting a different category or check back later for new events.
            </p>
          </div>
        )}

        {/* Registration Modal */}
        {showRegistrationModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading font-bold text-2xl text-[--color-accent]">
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
                  <div className="flex items-center text-sm text-[--color-text-secondary] mb-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{selectedEvent.date} at {selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>

                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  {isAuthenticated ? (
                    // Authenticated user form - show student selection
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Select Student to Register *
                        </label>
                        {studentsLoading ? (
                          <div className="text-center py-4">
                            <div className="text-sm text-[--color-text-secondary]">Loading students...</div>
                          </div>
                        ) : !Array.isArray(students) || students.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-sm text-[--color-text-secondary]">No students found under your account.</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedStudent?.id === student.id
                                    ? 'border-[--color-primary] bg-[--color-primary]/10'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onClick={() => setSelectedStudent(student)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-[--color-text-primary]">{student.name}</div>
                                    <div className="text-sm text-[--color-text-secondary]">
                                      Grade {student.grade} • Age {student.age}
                                    </div>
                                  </div>
                                  {selectedStudent?.id === student.id && (
                                    <div className="text-[--color-primary]">✓</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                          School *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                          value={registrationData.playerSchool}
                          onChange={(e) => handleInputChange('playerSchool', e.target.value)}
                          placeholder="e.g. Gander Elementary"
                        />
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          This is needed to record your player's performance for the Chess and Math Association
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                          placeholder="Any allergies, medical conditions, or special requirements..."
                          value={registrationData.medicalInfo}
                          onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    // Non-authenticated user form - show full registration form
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Parent/Guardian Name *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.parentName}
                            onChange={(e) => handleInputChange('parentName', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Parent Email *
                          </label>
                          <input
                            type="email"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.parentEmail}
                            onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Parent Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.parentPhone}
                            onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Player Name *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.playerName}
                            onChange={(e) => handleInputChange('playerName', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Player Age *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.playerAge}
                            onChange={(e) => handleInputChange('playerAge', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Player Grade *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.playerGrade}
                            onChange={(e) => handleInputChange('playerGrade', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            School *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.playerSchool}
                            onChange={(e) => handleInputChange('playerSchool', e.target.value)}
                            placeholder="e.g. Gander Elementary"
                          />
                          <p className="text-xs text-[--color-text-secondary] mt-1">
                            This is needed to record your player's performance for the Chess and Math Association
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Emergency Contact *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.emergencyContact}
                            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                            Emergency Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                            value={registrationData.emergencyPhone}
                            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                          Medical Information (Optional)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-secondary]"
                          placeholder="Any allergies, medical conditions, or special requirements..."
                          value={registrationData.medicalInfo}
                          onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
                        />
                      </div>

                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id="createAccountEvent"
                            checked={registrationData.createAccount}
                            onChange={(e) => handleInputChange('createAccount', e.target.checked)}
                            className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                          />
                          <div>
                            <label htmlFor="createAccountEvent" className="text-sm font-medium text-blue-800">
                              Create a parent account to track your player's progress
                            </label>
                            <p className="text-xs text-blue-600 mt-1">
                              With a parent account, you can view rankings, register for events, and track tournament performance. A link will be sent to your email.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

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
                      disabled={registrationLoading}
                    >
                      {registrationLoading ? 'Registering...' : 'Register'}
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
