"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function ParentVerify() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState("")
  const [isApproval, setIsApproval] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'deny' | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const action = searchParams.get('action') as 'approve' | 'deny' | null

    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    // If action is provided, this is likely an approval request
    if (action) {
      setIsApproval(true)
      setApprovalAction(action)
      handleApproval(token, action)
      return
    }

    // Otherwise, handle regular verification
    handleVerification(token, action)
  }, [searchParams])

  const handleVerification = async (token: string, action?: string | null) => {
    try {
      const response = await fetch('/api/parent/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed')
      }

      // Check if this is an approval request based on server response
      if (result.isApprovalRequest && !action) {
        setIsApproval(true)
        setStatus('loading') // Keep loading to show approval buttons
        return
      }

      setStatus('success')
      
      if (result.needsRegistration) {
        // Email not found in registrations - redirect to registration form
        setMessage('Email not found in our registrations. Redirecting to registration form...')
        setTimeout(() => {
          // Pass the email as a query parameter to pre-fill the form
          router.push(`/register?email=${encodeURIComponent(result.email)}`)
        }, 2000)
      } else if (result.session) {
        // Login successful - store session in localStorage
        const sessionData = {
          parentId: result.session.parentId,
          email: result.session.email,
          loginTime: Date.now()
        }
        localStorage.setItem('chess-club-parent-auth', JSON.stringify(sessionData))
        
        setMessage('Successfully signed in! Redirecting to your dashboard...')
        setTimeout(() => {
          router.push('/parent/dashboard')
        }, 2000)
      } else if (result.action) {
        // Approval action completed
        setMessage(`Player claim ${result.action}d successfully!`)
      } else {
        setMessage('Verification successful!')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Verification failed')
    }
  }

  const handleApproval = async (token: string, action: 'approve' | 'deny') => {
    try {
      const response = await fetch('/api/parent/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Approval failed')
      }

      setStatus('success')
      setMessage(`Player claim ${action}d successfully! The requesting parent has been notified.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Approval failed')
    }
  }

  const handleApprovalClick = (action: 'approve' | 'deny') => {
    const token = searchParams.get('token')
    if (token) {
      setApprovalAction(action)
      handleApproval(token, action)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Link 
          href="/" 
          className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isApproval ? 'Player Claim Request' : 'Verification'}
            </CardTitle>
            <CardDescription>
              {isApproval 
                ? 'Someone has requested to claim your player'
                : 'Verifying your magic link...'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" />
                <p className="text-gray-600">
                  {isApproval && !approvalAction ? 'Loading request details...' : 'Verifying...'}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-gray-800">{message}</p>
                
                {!isApproval && (
                  <Button 
                    onClick={() => router.push('/parent/dashboard')}
                    className="mt-4"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="w-12 h-12 text-red-500" />
                <p className="text-red-800">{message}</p>
                <Button 
                  onClick={() => router.push('/parent/login')}
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            )}

            {isApproval && status === 'loading' && !approvalAction && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Please review this request carefully. If you approve, the requesting parent will gain access to your player's information.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => handleApprovalClick('approve')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleApprovalClick('deny')}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Deny
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
