"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"
import { useState, useEffect } from "react"
import type { EventData } from "@/lib/types"

interface EventsPreviewClientProps {
  initialEvents?: EventData[];
}

export function EventsPreviewClient({ initialEvents = [] }: EventsPreviewClientProps) {
  const [events, setEvents] = useState<EventData[]>(initialEvents)
  const [loading, setLoading] = useState(initialEvents.length === 0)

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (initialEvents.length > 0) {
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events')
        if (response.ok) {
          const eventsData = await response.json()
          // Filter for upcoming/active events and take top 3
          const upcomingEvents = eventsData
            .filter((event: EventData) => !event.status || event.status === 'active')
            .slice(0, 3)
          setEvents(upcomingEvents)
        }
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [initialEvents.length])

  return (
    <section className="relative py-16 bg-gradient-to-br from-blue-800 to-[#1C1F33] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">
            What's Coming Up
          </h2>
          <p className="text-lg text-white max-w-2xl mx-auto">
            Join us for exciting tournaments, workshops, and social events designed to improve your chess skills and have fun.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl text-white mb-4">♟️</div>
              <h3 className="font-heading font-semibold text-xl text-white mb-2">
                Loading events...
              </h3>
            </div>
          ) : events.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl text-white mb-4">📅</div>
              <h3 className="font-heading font-semibold text-xl text-white mb-2">
                No upcoming events
              </h3>
              <p className="text-[--color-text-secondary]">
                Check back soon for new events and tournaments!
              </p>
            </div>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{event.name}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </div>
                    <div className="ml-3 text-[--color-secondary] text-2xl">♙</div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-[--color-text-secondary]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{event.date}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-[--color-text-secondary]">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{event.location}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-[--color-text-secondary]">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        {event.participants || 0}
                        {event.maxParticipants > 0 ? `/${event.maxParticipants}` : ''} registered
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm font-medium text-[--color-text-primary]">
                        {event.time}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="text-center">
          <Link href="/events">
            <Button variant="outline" size="lg" className="text-white hover:bg-white hover:text-[#1C1F33]">
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
