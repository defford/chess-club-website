"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Mail, Loader2 } from "lucide-react"
import Link from "next/link"
import { clientAuthService } from "@/lib/clientAuth"

export default function ParentLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Check for existing session on component mount
  useEffect(() => {
    if (clientAuthService.isParentAuthenticated()) {
      router.push('/parent/dashboard')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch('/api/parent/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          preferSms: false
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send login link')
      }

      setMessage(`Link sent to your ${result.sentTo}! Check your ${result.sentTo === 'SMS' ? 'text messages' : 'inbox'} and click the link to sign in.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        {/* Back button */}
        <Link 
          href="/" 
          className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Member Sign In</CardTitle>
            <CardDescription>
              Enter your email to receive a secure sign-in link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              {/* SMS Option - Future feature */}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Login Link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Login Link
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                The login link will expire in 15 minutes for security.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-3">What you can do with a parent account:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[--color-primary] rounded-full mr-3"></div>
                  View players' chess rankings and progress
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[--color-primary] rounded-full mr-3"></div>
                  Register for tournaments and events
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[--color-primary] rounded-full mr-3"></div>
                  Track tournament performance history
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[--color-primary] rounded-full mr-3"></div>
                  Update contact information
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
