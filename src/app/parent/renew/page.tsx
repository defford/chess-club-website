"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authFetch, getBrowserAuthClient } from "@/lib/browserAuth"

type Student = {
  id: string
  name: string
  age: string
  grade: string
  emergencyContact: string
  emergencyPhone: string
  medicalInfo: string
  enrollment: { status: 'registered' | 'withdrawn' } | null
}

const grades = [
  ['K', 'Kindergarten'],
  ...Array.from({ length: 12 }, (_, index) => {
    const grade = String(index + 1)
    return [grade, `Grade ${grade}`]
  }),
]

export default function RenewMembershipPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [parentPhone, setParentPhone] = useState("")
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
    let cancelled = false

    const load = async () => {
      try {
        const supabase = await getBrowserAuthClient()
        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          router.push('/parent/login?redirect=/parent/renew')
          return
        }

        if (!cancelled) {
          setEmail(data.session.user.email || "")
        }

        const response = await authFetch('/api/season/enrollment', { cache: 'no-store' })
        const result = await response.json()

        if (response.status === 401) {
          router.push('/parent/login?redirect=/parent/renew')
          throw new Error('Please sign in again to continue.')
        }

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load registration')
        }

        if (cancelled) return

        setSeasonLabel(result.season.label)
        setStudents(result.students)
        setSelected(
          result.students
            .filter((student: Student) => student.enrollment?.status === 'registered')
            .map((student: Student) => student.id)
        )
        setParentPhone(result.parent.phone || "")
        setPhotoConsent(Boolean(result.parent.photoConsent))
        setNewsletter(Boolean(result.parent.newsletter))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load registration')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [router])

  const toggleStudent = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((studentId) => studentId !== id) : [...current, id]
    )
  }

  const updateStudent = (id: string, field: keyof Student, value: string) => {
    setStudents((current) =>
      current.map((student) => student.id === id ? { ...student, [field]: value } : student)
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const response = await authFetch('/api/season/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPhone,
          studentIds: selected,
          students: students.filter((student) => selected.includes(student.id)),
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Registration Confirmed</h1>
            <p className="text-gray-600 mb-6">
              Your selected players are registered for the {seasonLabel} CNLSCC season, and their updated information has been saved.
            </p>
            <Link href="/parent/dashboard">
              <Button variant="outline">Go to Member Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Returning Member Registration — {seasonLabel}</CardTitle>
          <CardDescription>
            Choose who is returning, review their information, and update anything that changed. Existing player IDs, ladder history, and game records stay intact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-7">
            <div>
              <label htmlFor="parentPhone" className="block text-sm font-medium mb-2">
                Parent/Guardian Phone Number *
              </label>
              <input
                id="parentPhone"
                type="tel"
                required
                value={parentPhone}
                onChange={(event) => setParentPhone(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Signed in as {email}. Contact Daniel if the account email itself needs to change.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Returning Players</h2>
                <p className="text-sm text-gray-600">Select each player who will participate this season.</p>
              </div>

              {students.length === 0 && (
                <div className="rounded-lg border bg-white p-5">
                  <p className="text-gray-700">No player profiles are currently linked to this account.</p>
                  <Link href="/parent/register-child" className="inline-block mt-3">
                    <Button type="button" variant="outline">Add a Player</Button>
                  </Link>
                </div>
              )}

              {students.map((student) => {
                const isSelected = selected.includes(student.id)

                return (
                  <div key={student.id} className={`rounded-lg border p-5 ${isSelected ? 'border-[#2D5BE3] bg-blue-50/40' : 'bg-white'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(student.id)}
                        className="h-5 w-5 mt-1"
                      />
                      <div>
                        <div className="font-semibold">{student.name}</div>
                        <div className="text-sm text-gray-600">
                          {isSelected ? 'Returning this season — review the details below.' : 'Not currently selected for this season.'}
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Player Name *</label>
                          <input
                            type="text"
                            required
                            value={student.name}
                            onChange={(event) => updateStudent(student.id, 'name', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Age *</label>
                          <input
                            type="number"
                            min="4"
                            max="18"
                            required
                            value={student.age}
                            onChange={(event) => updateStudent(student.id, 'age', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Grade *</label>
                          <select
                            required
                            value={student.grade}
                            onChange={(event) => updateStudent(student.id, 'grade', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select grade</option>
                            {grades.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Emergency Contact *</label>
                          <input
                            type="text"
                            required
                            value={student.emergencyContact}
                            onChange={(event) => updateStudent(student.id, 'emergencyContact', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Emergency Phone *</label>
                          <input
                            type="tel"
                            required
                            value={student.emergencyPhone}
                            onChange={(event) => updateStudent(student.id, 'emergencyPhone', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Medical Information / Allergies</label>
                          <textarea
                            rows={3}
                            value={student.medicalInfo || ""}
                            onChange={(event) => updateStudent(student.id, 'medicalInfo', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Update anything we should know for this season."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-5 space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={participationConsent}
                  onChange={(event) => setParticipationConsent(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I consent to the selected player(s) participating in CNLSCC activities during the {seasonLabel} season.
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={valuesAcknowledgment}
                  onChange={(event) => setValuesAcknowledgment(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I acknowledge the club&apos;s expectations for respectful behaviour and sportsmanship.
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={(event) => setPhotoConsent(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">I consent to club photos that may include my player(s).</span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(event) => setNewsletter(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">Send me club announcements and updates.</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={saving || selected.length === 0}
            >
              {saving ? 'Saving...' : `Confirm ${seasonLabel} Registration`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
