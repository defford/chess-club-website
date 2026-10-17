"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserAuthClient } from "@/lib/browserAuth"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getBrowserAuthClient()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data }) => {
        if (!data.session) {
          setError('This password reset link is invalid or has expired.')
          return
        }
        setReady(true)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to verify password reset'))
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
      if (password !== confirmPassword) throw new Error('Passwords do not match.')

      const supabase = await getBrowserAuthClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      router.replace('/parent/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Choose a New Password</CardTitle>
          <CardDescription>Your new password must be at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">New Password</label>
              <input
                id="password"
                type="password"
                minLength={8}
                required
                disabled={!ready}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                minLength={8}
                required
                disabled={!ready}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!ready || loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
