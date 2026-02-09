"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import type { EventData } from "@/lib/types"
import {
  Plus,
  Search,
  LogOut,
  ArrowLeft,
  CalendarDays,
  Calendar,
  MapPin,
  Users,
  Clock,
} from "lucide-react"

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
}

const CATEGORY_BADGE: Record<string, string> = {
  tournament: "bg-purple-100 text-purple-800",
  workshop: "bg-blue-100 text-blue-800",
  training: "bg-yellow-100 text-yellow-800",
  social: "bg-pink-100 text-pink-800",
}

export default function AdminEventsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<EventData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        loadEvents()
      }
    }

    checkAuth()
  }, [router])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/events")
      if (!response.ok) throw new Error("Failed to fetch events")

      const data = await response.json()
      setEvents(data)
    } catch (err) {
      console.error("Error loading events:", err)
      setError("Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleStatusChange = async (eventId: string, newStatus: EventData['status']) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update event status")
      await loadEvents()
    } catch (err) {
      console.error("Error updating event status:", err)
      setError("Failed to update event status")
    }
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === "" ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter
    const matchesCategory =
      categoryFilter === "all" || event.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusCounts = () => ({
    all: events.length,
    active: events.filter((e) => e.status === "active").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
    completed: events.filter((e) => e.status === "completed").length,
  })

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
                Event Management
              </h1>
              <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
                Create and manage chess club events
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Logout
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
                  Total Events
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.all}
                </p>
              </div>
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-[--color-primary]" />
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
                  Completed
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.completed}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[--color-text-primary]">
                  Cancelled
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[--color-accent]">
                  {statusCounts.cancelled}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
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
              placeholder="Search events by name, description, or location..."
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
                <option value="active">Active ({statusCounts.active})</option>
                <option value="completed">
                  Completed ({statusCounts.completed})
                </option>
                <option value="cancelled">
                  Cancelled ({statusCounts.cancelled})
                </option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base"
              >
                <option value="all">All Categories</option>
                <option value="tournament">Tournament</option>
                <option value="workshop">Workshop</option>
                <option value="training">Training</option>
                <option value="social">Social</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push("/admin/events/new")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {filteredEvents.length} of {events.length} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
                <p className="mt-2 text-[--color-text-primary]">
                  Loading events...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={loadEvents}
                  className="mt-4"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events found</p>
                <Button
                  onClick={() => router.push("/admin/events/new")}
                  className="mt-4"
                  variant="outline"
                >
                  Create First Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">
                          {event.name}
                        </CardTitle>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            STATUS_BADGE[event.status || "active"]
                          }`}
                        >
                          {event.status || "active"}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                          CATEGORY_BADGE[event.category]
                        }`}
                      >
                        {event.category}
                      </span>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-1.5 text-sm text-[--color-text-primary]">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>
                            {event.participants}/{event.maxParticipants}{" "}
                            participants
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Ages: {event.ageGroups}
                      </p>

                      {/* Quick status actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {event.status !== "completed" &&
                          event.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(event.id!, "completed")
                              }
                            >
                              Mark Completed
                            </Button>
                          )}
                        {event.status !== "cancelled" &&
                          event.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(event.id!, "cancelled")
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        {(event.status === "cancelled" ||
                          event.status === "completed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(event.id!, "active")
                            }
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
