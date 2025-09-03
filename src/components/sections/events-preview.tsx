import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"

// Mock data - in a real app this would come from a database or API
const upcomingEvents = [
  {
    id: 1,
    name: "Fallen Pawns Challenge",
    date: "October 12, 2025",
    time: "1:00 PM - 4:00 PM",
    location: "Exploits Valley Intermediate School",
    participants: 24,
    description: "First tournament of the new school year to bring in the autumn season"
  }
]

export function EventsPreview() {
  return (
    <section className="py-16 bg-[--color-neutral-light]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[--color-accent] mb-4">
            What's Coming Up
          </h2>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Join us for exciting tournaments, workshops, and social events designed to improve your chess skills and have fun.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {upcomingEvents.map((event) => (
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
                    <span>{event.participants} registered</span>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm font-medium text-[--color-text-primary]">
                      {event.time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/events">
            <Button variant="outline" size="lg">
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
