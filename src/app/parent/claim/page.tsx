"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, User, Mail, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react"
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

export default function ClaimPlayer() {
  const router = useRouter()
  const [parentEmail, setParentEmail] = useState("")
  const [playerEmail, setPlayerEmail] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [claimStatus, setClaimStatus] = useState<'none' | 'success' | 'pending' | 'owned'>('none')

  useEffect(() => {
    // Check authentication
    const session = getParentSession()
    if (!session) {
      router.push('/parent/login')
      return
    }

    setParentEmail(session.email)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    setClaimStatus('none')

    try {
      const response = await fetch('/api/parent/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerEmail: playerEmail,
          playerName: playerName,
          parentEmail
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to claim player')
      }

      setMessage(result.message)
      
      if (result.requiresApproval) {
        setClaimStatus('pending')
      } else if (result.message.includes('already own')) {
        setClaimStatus('owned')
      } else {
        setClaimStatus('success')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim player')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPlayerEmail("")
    setPlayerName("")
    setMessage("")
    setError("")
    setClaimStatus('none')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/parent/dashboard" 
            className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Signed in as</p>
            <p className="font-medium">{parentEmail}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center">
              <User className="w-6 h-6 mr-3 text-[--color-primary]" />
              Claim Your Player
            </CardTitle>
            <CardDescription>
              Enter your player's information to link them to your parent account. 
              This allows you to view their rankings and register them for events.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Messages */}
            {claimStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-green-800">Player Claimed Successfully!</h4>
                    <p className="text-sm text-green-700 mt-1">{message}</p>
                    <Link href="/parent/dashboard">
                      <Button size="sm" className="mt-3">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {claimStatus === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Approval Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">{message}</p>
                    <p className="text-sm text-yellow-700 mt-2">
                      The current parent will receive an email with approval options. 
                      You'll be notified once they respond.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {claimStatus === 'owned' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-blue-800">Already Claimed</h4>
                    <p className="text-sm text-blue-700 mt-1">{message}</p>
                    <Link href="/parent/dashboard">
                      <Button size="sm" className="mt-3">
                        View in Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Claim Form */}
            {claimStatus === 'none' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">How to find your player's information:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Player Email:</strong> The email address used when registering your player for the chess club</li>
                    <li>• <strong>Player Name:</strong> Your player's full name as it appears in the registration</li>
                  </ul>
                </div>

                <div>
                  <label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Email Address
                  </label>
                  <input
                    type="email"
                    id="playerEmail"
                    value={playerEmail}
                    onChange={(e) => setPlayerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    placeholder="email@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the email address that was used to register your player for the chess club.
                  </p>
                </div>

                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Player's Full Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    placeholder="Enter your player's full name"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the name exactly as it appears in the chess club registration.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={loading || !playerEmail || !playerName}
                  >
                    {loading ? (
                      <>
                        <Search className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Claim Player
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            )}

            {/* Success Actions */}
            {(claimStatus === 'success' || claimStatus === 'owned') && (
              <div className="flex space-x-3">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Claim Another Player
                </Button>
                <Link href="/parent/dashboard" className="flex-1">
                  <Button className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}

            {claimStatus === 'pending' && (
              <div className="flex space-x-3">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Claim Another Player
                </Button>
                <Link href="/parent/dashboard" className="flex-1">
                  <Button className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}

            {/* Help Section */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-3">Need Help?</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Can't find your player?</strong> Make sure you're using the exact email 
                  address and name that was used during registration.
                </p>
                <p>
                  <strong>Registration not found?</strong> Your player may not be registered yet. 
                  <Link href="/register" className="text-[--color-primary] hover:underline ml-1">
                    Register them here first.
                  </Link>
                </p>
                <p>
                  <strong>Still having issues?</strong> Contact the chess club administrators 
                  at <a href="mailto:info@centralnlchess.ca" className="text-[--color-primary] hover:underline">
                    info@centralnlchess.ca
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
