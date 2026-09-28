"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getBrowserAuthClient } from "@/lib/browserAuth"
import { clientAuthService } from "@/lib/clientAuth"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const finish = async () => {
      try {
        const requested = new URLSearchParams(window.location.search).get('redirect')
        const redirectPath = requested?.startsWith('/') && !requested.startsWith('//')
          ? requested
          : '/parent/dashboard'

        const supabase = await getBrowserAuthClient()
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session) throw new Error('We could not complete your sign-in. Please try again.')

        const response = await fetch('/api/auth/family', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: 'no-store',
        })
        const result = await response.json()

        if (!response.ok) {
          if (result.code === 'FAMILY_NOT_FOUND') {
            router.replace(`/register?email=${encodeURIComponent(data.session.user.email || '')}`)
            return
          }
          throw new Error(result.error || 'Unable to connect your account to your registration')
        }

        clientAuthService.setParentSession({
          parentId: result.family.primaryParentId,
          email: result.family.email,
          loginTime: Date.now(),
          isSelfRegistered: result.family.isSelfRegistered,
          registrationType: result.family.isSelfRegistered ? 'self' : 'parent',
        })

        router.replace(redirectPath)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    void finish()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {error ? (
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Sign-in problem</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Finishing your sign-in...</p>
        </div>
      )}
    </div>
  )
}
