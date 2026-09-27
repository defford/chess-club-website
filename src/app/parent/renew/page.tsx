"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { clientAuthService } from "@/lib/clientAuth"

type Student = {
  id: string
  name: string
  age: string
  grade: string
  enrollment: { status: 'registered' | 'withdrawn' } | null
}

export default function RenewMembershipPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [seasonLabel, setSeasonLabel] = useState("2026–27")
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [participationConsent, setParticipationConsent] = useState(false)
  const [valuesAcknowledgment, setValuesAcknowledgment] = useState(false)
  const [photoConsent, setPhotoConsent] = useState(false)
  const [newsletter, setNewsletter] = useState(true)

  useEffect(() => {
    if (!clientAuthService.isParentAuthenticated()) {
      router.push('/parent/login?redirect=/parent/renew')
      return
    }

    const session = clientAuthService.getCurrentParentSession()
    if (!session) {
      router.push('/parent/login?redirect=/parent/renew')
      return
    }

    setEmail(session.email)
    fetch(`/api/season/enrollment?email=${encodeURIComponent(session.email)}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to load registration')
        return result
      })
      .then((result) => {
        setSeasonLabel(result.season.label)
        setStudents(result.students)
        setSelected(
          result.students
            .filter((student: Student) => student.enrollment?.status === 'registered')
            .map((student: Student) => student.id)
        )
        setPhotoConsent(Boolean(result.parent.photoConsent))
        setNewsletter(Boolean(result.parent.newsletter))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load registration'))
      .finally(() => setLoading(false))
  }, [router])

  const toggleStudent = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((studentId) => studentId !== id) : [...current, id]
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const response = await fetch('/api/season/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          studentIds: selected,
          participationConsent,
          valuesAcknowledgment,
          photoConsent,
          newsletter,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save registration')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save registration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Registration Confirmed</h1>
            <p className="text-gray-600 mb-6">Your selected players are registered for the {seasonLabel} CNLSCC season.</p>
            <Link href="/parent/dashboard"><Button variant="outline">Go to Member Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Returning Family Registration — {seasonLabel}</CardTitle>
          <CardDescription>
            Select the players returning this season. Their existing profiles and chess history will be kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-3">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="h-5 w-5"
                  />
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-600">Age {student.age} • Grade {student.grade}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="border-t pt-5 space-y-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" required checked={participationConsent} onChange={(e) => setParticipationConsent(e.target.checked)} className="mt-1" />
                <span className="text-sm">I consent to the selected player(s) participating in CNLSCC activities this season.</span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" required checked={valuesAcknowledgment} onChange={(e) => setValuesAcknowledgment(e.target.checked)} className="mt-1" />
                <span className="text-sm">I acknowledge the club's expectations for respectful behaviour and sportsmanship.</span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="mt-1" />
                <span className="text-sm">I consent to club photos that may include my player(s).</span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-1" />
                <span className="text-sm">Send me club announcements and updates.</span>
              </label>
            </div>

            <Button type="submit" variant="outline" size="lg" className="w-full" disabled={saving || selected.length === 0}>
              {saving ? 'Saving...' : `Confirm ${seasonLabel} Registration`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
