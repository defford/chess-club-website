"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import type { EventData } from "@/lib/googleSheets"

export default function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [allEvents, setAllEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  const filteredEvents = selectedCategory === "all" 
    ? allEvents 
    : allEvents.filter(event => event.category === selectedCategory)

  const categories = [
    { value: "all", label: "All Events" },
    { value: "tournament", label: "Tournaments" },
    { value: "workshop", label: "Workshops" },
    { value: "training", label: "Training" },
    { value: "social", label: "Social" }
  ]

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

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
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
            <Button onClick={() => window.location.reload()}>Try Again</Button>
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
                  
                  <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{event.time}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{event.location}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-[--color-text-secondary]">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{event.participants}/{event.maxParticipants} registered</span>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-[--color-text-primary] mb-2">
                      Age Groups: {event.ageGroups}
                    </p>
                    
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      disabled={event.participants >= event.maxParticipants}
                    >
                      {event.participants >= event.maxParticipants ? "Event Full" : "Register for Event"}
                    </Button>
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
      </div>
    </div>
  )
}
