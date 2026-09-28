"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserAuthClient } from "@/lib/browserAuth"
import { clientAuthService } from "@/lib/clientAuth"

type Mode = 'signin' | 'signup'

export default function ParentLogin() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [redirectPath, setRedirectPath] = useState("/parent/dashboard")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedRedirect = params.get('redirect')
    const safeRedirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/parent/dashboard'
    setRedirectPath(safeRedirect)

    const requestedMode = params.get('mode')
    if (requestedMode === 'signup') setMode('signup')

    const requestedEmail = params.get('email')
    if (requestedEmail) setEmail(requestedEmail)

    getBrowserAuthClient()
      .then((supabase) => supabase.auth.getSession())
      .then(async ({ data }) => {
        if (!data.session) return

        const response = await fetch('/api/auth/family', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: 'no-store',
        })
        const result = await response.json()
        if (!response.ok) return

        clientAuthService.setParentSession({
          parentId: result.family.primaryParentId,
          email: result.family.email,
          loginTime: Date.now(),
          isSelfRegistered: result.family.isSelfRegistered,
          registrationType: result.family.isSelfRegistered ? 'self' : 'parent',
        })

        router.push(safeRedirect)
      })
      .catch(() => {
        // The form will surface configuration errors if the user submits.
      })
  }, [router])

  const syncFamilyAndContinue = async (accessToken: string) => {
    const response = await fetch('/api/auth/family', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    const result = await response.json()

    if (!response.ok) {
      if (result.code === 'FAMILY_NOT_FOUND') {
        throw new Error('No existing club registration was found for this email. Please complete New Member registration first.')
      }
      throw new Error(result.error || 'Unable to connect this login to your family registration')
    }

    clientAuthService.setParentSession({
      parentId: result.family.primaryParentId,
      email: result.family.email,
      loginTime: Date.now(),
      isSelfRegistered: result.family.isSelfRegistered,
      registrationType: result.family.isSelfRegistered ? 'self' : 'parent',
    })

    router.push(redirectPath)
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const supabase = await getBrowserAuthClient()

      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('Sign in did not return a session')
        await syncFamilyAndContinue(data.session.access_token)
        return
      }

      if (password.length < 8) {
        throw new Error('Use a password with at least 8 characters.')
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      const callback = `${window.location.origin}/parent/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback },
      })

      if (error) throw error

      if (data.session) {
        await syncFamilyAndContinue(data.session.access_token)
      } else {
        setMessage('Account created. Check your email once to confirm your address, then you can sign in normally with your password.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    setError("")

    try {
      const supabase = await getBrowserAuthClient()
      const callback = `${window.location.origin}/parent/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback },
      })
      if (error) throw error
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : `Unable to sign in with ${provider}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Link href="/" className="flex items-center text-[--color-primary] hover:text-[--color-primary]/80 mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Member Account</CardTitle>
            <CardDescription>
              Sign in to manage registration, players, events and chess progress.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(""); setMessage("") }}
                className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'signin' ? 'bg-[#1c1F33] text-white' : 'text-gray-600'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(""); setMessage("") }}
                className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-[#1c1F33] text-white' : 'text-gray-600'}`}
              >
                Create Account
              </button>
            </div>

            {message && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}
            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working...</> : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {mode === 'signin' && (
              <div className="text-center">
                <Link href="/parent/forgot-password" className="text-sm text-[--color-primary] hover:underline">
                  Forgot your password?
                </Link>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs uppercase text-gray-500">or continue with</span></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => handleSocial('google')} disabled={loading}>
                Google
              </Button>
              <Button type="button" variant="outline" onClick={() => handleSocial('facebook')} disabled={loading}>
                Facebook
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Use the same email address that is on your chess club registration so your existing player records can be linked automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
