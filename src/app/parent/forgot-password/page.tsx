"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserAuthClient } from "@/lib/browserAuth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const supabase = await getBrowserAuthClient()
      const redirectTo = `${window.location.origin}/parent/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setMessage('If an account exists for that email, a password reset email has been sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your member email and we will send a one-time password reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {message && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/parent/login" className="text-sm text-[--color-primary] hover:underline">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
