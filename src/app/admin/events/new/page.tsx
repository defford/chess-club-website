"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import EventForm from "@/components/admin/EventForm"
import type { EventData } from "@/lib/types"
import { ArrowLeft } from "lucide-react"

type EventFormData = Omit<EventData, 'id' | 'lastUpdated' | 'participants'>

export default function NewEventPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (formData: EventFormData) => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create event")
      }

      router.push("/admin/events")
    } catch (err) {
      console.error("Error creating event:", err)
      setError(err instanceof Error ? err.message : "Failed to create event")
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Button
            onClick={() => router.push("/admin/events")}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold text-[--color-accent]">
            Create New Event
          </h1>
          <p className="text-[--color-text-primary] mt-1 text-sm sm:text-base">
            Fill in the details below to schedule a new chess club event
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <EventForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/events")}
          isLoading={submitting}
        />
      </div>
    </div>
  )
}
