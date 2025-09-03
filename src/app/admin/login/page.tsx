"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { authenticate, isAuthenticated } from "@/lib/auth"
import { Lock } from "lucide-react"

export default function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated()) {
      router.push("/admin")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 300))

    if (authenticate(password)) {
      router.push("/admin")
    } else {
      setError("Incorrect password. Please try again.")
      setPassword("")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[--color-primary] text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-[--color-accent]">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-[--color-text-primary]">
            Please enter the admin password to continue
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-[--color-text-primary] rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary] focus:z-10 sm:text-sm"
                placeholder="Enter admin password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Access Admin Panel"}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <a
            href="/"
            className="text-sm text-[--color-primary] hover:text-[--color-primary]/80"
          >
            ← Back to main site
          </a>
        </div>
      </div>
    </div>
  )
}
