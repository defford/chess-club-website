"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { clientAuthService } from "@/lib/clientAuth"
import type { MuseIntent } from "@/lib/muse/types"

type MusePreviewResponse = {
  intent: MuseIntent
  summary: string
  resolvedPlayers: Array<{ query: string; id: string; name: string; grade?: string }>
  ambiguousPlayers: Array<{
    query: string
    candidates: Array<{ id: string; name: string; grade?: string }>
  }>
  missingPlayers: string[]
  canApply: boolean
}

type MuseApplyResponse = {
  actionId: string
  summary: string
  result: Record<string, unknown>
}

const examples = [
  "Lucas beat Ethan in a ladder game.",
  "Attendance: Ben, Sarah, Ethan and Noah are here.",
  "Sophie captained the Stockfish game tonight. They survived 27 moves.",
  "Give Emma credit for threat detection tonight.",
]

export default function MuseAdminPage() {
  const router = useRouter()
  const recognitionRef = useRef<any>(null)

  const [ready, setReady] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [preview, setPreview] = useState<MusePreviewResponse | null>(null)
  const [listening, setListening] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastActionId, setLastActionId] = useState<string | null>(null)

  useEffect(() => {
    const authenticated = isAuthenticated()
    const adminAuthenticated = isAdminAuthenticated()

    if (!authenticated) {
      router.push("/admin/login")
      return
    }

    if (!adminAuthenticated) {
      router.push("/parent/dashboard")
      return
    }

    refreshSession()
    setReady(true)

    return () => {
      try {
        recognitionRef.current?.stop?.()
      } catch {
        // Nothing to clean up.
      }
    }
  }, [router])

  const apiUrl = () => {
    const email = clientAuthService.getCurrentParentSession()?.email || "dev@example.com"
    return `/api/muse/events?email=${encodeURIComponent(email)}`
  }

  const resetMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const startListening = () => {
    resetMessages()
    setPreview(null)

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Voice recognition is not available in this browser. You can still type the note below.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-CA"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (event: any) => {
      setListening(false)
      setError(event?.error ? `Voice recognition error: ${event.error}` : "Voice recognition stopped.")
    }
    recognition.onresult = (event: any) => {
      let combined = ""
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        combined += event.results[index][0]?.transcript || ""
      }
      if (combined.trim()) setTranscript(combined.trim())
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop?.()
    setListening(false)
  }

  const handlePreview = async () => {
    if (!transcript.trim()) {
      setError("Say or type something for Muse to record.")
      return
    }

    resetMessages()
    setWorking(true)
    setPreview(null)

    try {
      const response = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          transcript: transcript.trim(),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Muse could not understand that.")
      }

      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Muse could not understand that.")
    } finally {
      setWorking(false)
    }
  }

  const handleApply = async () => {
    if (!preview?.canApply) return

    resetMessages()
    setWorking(true)

    try {
      const response = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          transcript: transcript.trim(),
          intent: preview.intent,
        }),
      })
      const data: MuseApplyResponse & { error?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Muse could not save that.")
      }

      setLastActionId(data.actionId)
      setSuccess(data.summary)
      setPreview(null)
      setTranscript("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Muse could not save that.")
    } finally {
      setWorking(false)
    }
  }

  const handleUndo = async () => {
    if (!lastActionId) return

    resetMessages()
    setWorking(true)

    try {
      const response = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          actionId: lastActionId,
        }),
      })
      const data: MuseApplyResponse & { error?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Muse could not undo that action.")
      }

      setSuccess("The last Muse action was undone.")
      setLastActionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Muse could not undo that action.")
    } finally {
      setWorking(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5">
          <Link href="/admin" className="inline-flex">
            <Button variant="ghost" size="sm" className="-ml-2 mb-3 gap-2 rounded-xl px-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Muse</h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Speak what happened. Muse will interpret it, show you the change, and only save after you confirm.
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">What happened?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 transition active:scale-95 ${
                listening
                  ? "border-red-200 bg-red-600 text-white shadow-lg shadow-red-100"
                  : "border-blue-100 bg-blue-600 text-white shadow-lg shadow-blue-100"
              }`}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff className="h-11 w-11" /> : <Mic className="h-11 w-11" />}
            </button>

            <p className="text-center text-sm font-medium text-slate-600">
              {listening ? "Listening…" : "Tap to speak"}
            </p>

            <textarea
              value={transcript}
              onChange={(event) => {
                setTranscript(event.target.value)
                setPreview(null)
                resetMessages()
              }}
              placeholder="Example: Lucas beat Ethan in a ladder game."
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            <Button
              onClick={handlePreview}
              disabled={working || !transcript.trim()}
              className="h-12 w-full rounded-2xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              {working ? "Thinking…" : "Preview what Muse understood"}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setTranscript(example)
                setPreview(null)
                resetMessages()
              }}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          </div>
        )}

        {preview && (
          <Card className="mt-5 rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Muse understood</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-2xl bg-slate-50 p-4 text-base font-medium leading-relaxed text-slate-900">
                {preview.summary}
              </p>

              {preview.resolvedPlayers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Players matched
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preview.resolvedPlayers.map((player) => (
                      <span
                        key={player.id}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800"
                      >
                        {player.name}{player.grade ? ` · ${player.grade}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preview.ambiguousPlayers.map((ambiguous) => (
                <div
                  key={ambiguous.query}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="text-sm font-semibold text-amber-900">
                    Which “{ambiguous.query}” did you mean?
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {ambiguous.candidates
                      .map((candidate) =>
                        candidate.grade ? `${candidate.name} (${candidate.grade})` : candidate.name
                      )
                      .join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-amber-700">
                    Edit the transcript with the full name, then preview again.
                  </p>
                </div>
              ))}

              {preview.missingPlayers.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  I could not match: {preview.missingPlayers.join(", ")}. Try the full name.
                </div>
              )}

              <Button
                onClick={handleApply}
                disabled={working || !preview.canApply}
                className="h-12 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Confirm and save
              </Button>
            </CardContent>
          </Card>
        )}

        {lastActionId && (
          <Button
            onClick={handleUndo}
            disabled={working}
            variant="outline"
            className="mt-5 h-11 w-full rounded-2xl border-slate-300 bg-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Undo last Muse action
          </Button>
        )}

        <p className="mx-auto mt-6 max-w-lg text-center text-xs leading-relaxed text-slate-500">
          Muse records facts and observations. Rankings, Elo, achievements, attendance, and development history are derived from those records rather than edited by hand.
        </p>
      </main>
    </div>
  )
}
