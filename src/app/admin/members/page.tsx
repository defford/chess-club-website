"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronUp,
  Edit,
  Heart,
  Info,
  Merge,
  Plus,
  Search,
  Shield,
  UserRound,
  Users,
  XCircle,
} from "lucide-react"

import type { MemberData } from "@/app/api/members/route"
import EditMemberForm from "@/components/admin/EditMemberForm"
import QuickAddStudentForm from "@/components/admin/QuickAddStudentForm"
import { Button } from "@/components/ui/button"
import { isAuthenticated, refreshSession } from "@/lib/auth"

const isSystemPlayer = (member: MemberData) =>
  Boolean((member as MemberData & { isSystemPlayer?: boolean }).isSystemPlayer)

const safeText = (value: unknown) => String(value ?? "").trim()

const initialsFor = (name: string) => {
  const parts = safeText(name).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

export default function MemberManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [members, setMembers] = useState<MemberData[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const [showQuickAddForm, setShowQuickAddForm] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberData | null>(null)
  const router = useRouter()

  const visibleMemberCount = useMemo(
    () => members.filter((member) => !isSystemPlayer(member)).length,
    [members]
  )

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsLoading(false)

      if (!authenticated) {
        router.push("/admin/login")
        return
      }

      refreshSession()
      loadMembers()
    }

    checkAuth()
  }, [router])

  const loadMembers = async (bypassCache = false) => {
    try {
      setLoading(true)
      const url = bypassCache
        ? `/api/members?nocache=${Date.now()}`
        : "/api/members"

      const response = await fetch(url, {
        cache: bypassCache ? "no-store" : "default",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch members")
      }

      const membersList: MemberData[] = await response.json()
      const visibleMembers = membersList.filter((member) => !isSystemPlayer(member))

      setMembers(membersList)
      setFilteredMembers(visibleMembers)
      setSearchQuery("")
      setError(null)
    } catch (err) {
      console.error("Error fetching members:", err)
      setError("Failed to load members")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const normalizedQuery = query.trim().toLowerCase()
    const visibleMembers = members.filter((member) => !isSystemPlayer(member))

    if (!normalizedQuery) {
      setFilteredMembers(visibleMembers)
      return
    }

    setFilteredMembers(
      visibleMembers.filter((member) =>
        [
          member.playerName,
          member.playerAge,
          member.playerGrade,
          member.parentName,
          member.parentEmail,
        ].some((value) => safeText(value).toLowerCase().includes(normalizedQuery))
      )
    )
  }

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers((previous) => {
      const next = new Set(previous)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[--color-primary]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading members...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link href="/admin" className="inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 gap-2 rounded-xl px-2 text-slate-600 hover:bg-white hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="heading text-2xl font-bold tracking-tight text-[--color-accent] sm:text-3xl">
                  Member Management
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {visibleMemberCount} {visibleMemberCount === 1 ? "member" : "members"}
                </span>
              </div>
              <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                Find students, review registration details, and manage member records.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
              <Button
                onClick={() => setShowQuickAddForm(true)}
                className="col-span-2 h-11 gap-2 rounded-xl bg-[--color-primary] px-4 text-white hover:bg-blue-700 sm:order-3 sm:col-auto sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Student
              </Button>

              <Link href="/admin/members/missing-players" className="min-w-0">
                <Button
                  variant="outline"
                  className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 sm:w-auto"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Missing</span>
                </Button>
              </Link>

              <Link href="/admin/members/merge" className="min-w-0">
                <Button
                  variant="outline"
                  className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 sm:w-auto"
                >
                  <Merge className="h-4 w-4 shrink-0" />
                  <span className="truncate">Merge Players</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              inputMode="search"
              placeholder="Search by student, parent, email, age, or grade"
              value={searchQuery}
              onChange={(event) => handleSearch(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
            <span>
              {searchQuery
                ? `${filteredMembers.length} matching ${filteredMembers.length === 1 ? "member" : "members"}`
                : "All active member records"}
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-600" />
            <h2 className="font-semibold text-red-900">Couldn&apos;t load members</h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <Button
              onClick={() => loadMembers(true)}
              variant="outline"
              className="mt-4 rounded-xl border-red-200 bg-white"
            >
              Try Again
            </Button>
          </div>
        )}

        {!error && filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900">
              {searchQuery ? "No members found" : "No members yet"}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {searchQuery
                ? "Try a different name, email, age, or grade."
                : "Registrations will appear here once they are added."}
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            {filteredMembers.map((member) => {
              const memberId = member.id || ""
              const isExpanded = expandedMembers.has(memberId)
              const hasEmergencyInfo = Boolean(member.emergencyContact && member.emergencyPhone)
              const hasMedicalInfo = Boolean(member.medicalInfo?.trim())
              const grade = safeText(member.playerGrade)
              const parentName = safeText(member.parentName)
              const parentEmail = safeText(member.parentEmail)
              const parentPhone = safeText(member.parentPhone)

              return (
                <article
                  key={memberId || member.playerName}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 sm:h-12 sm:w-12">
                        {initialsFor(member.playerName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold leading-tight text-[--color-accent]">
                          {member.playerName}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          {safeText(member.playerAge) && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                              Age {member.playerAge}
                            </span>
                          )}
                          {grade && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                              {grade}
                            </span>
                          )}
                          {!hasEmergencyInfo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Emergency info missing
                            </span>
                          )}
                          {hasMedicalInfo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                              <Shield className="h-3 w-3" />
                              Medical note
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-expanded={isExpanded}
                        onClick={() => toggleMemberExpansion(memberId)}
                        className="h-10 min-w-0 gap-1.5 rounded-xl border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <Info className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{isExpanded ? "Hide" : "Details"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMember(member)}
                        className="h-10 min-w-0 gap-1.5 rounded-xl border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:text-sm"
                      >
                        <Edit className="h-4 w-4 shrink-0" />
                        <span className="truncate">Edit</span>
                      </Button>

                      <Link href={`/admin/members/${member.id}`} className="min-w-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-full min-w-0 gap-1.5 rounded-xl border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white sm:text-sm"
                        >
                          <BarChart3 className="h-4 w-4 shrink-0" />
                          <span className="truncate">Stats</span>
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <UserRound className="h-4 w-4 text-blue-600" />
                            Parent / Guardian
                          </h3>
                          <dl className="mt-3 space-y-3">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</dt>
                              <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">
                                {parentName || "Not provided"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
                              <dd className="mt-0.5 break-all text-sm text-slate-700">
                                {parentEmail || "Not provided"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</dt>
                              <dd className="mt-0.5 text-sm text-slate-700">
                                {parentPhone || "Not provided"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                              <Shield className="h-4 w-4 text-blue-600" />
                              Emergency Contact
                            </h3>
                            {!hasEmergencyInfo && (
                              <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                                Incomplete
                              </span>
                            )}
                          </div>
                          <dl className="mt-3 space-y-3">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Contact</dt>
                              <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">
                                {safeText(member.emergencyContact) || "Not provided"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</dt>
                              <dd className="mt-0.5 text-sm text-slate-700">
                                {safeText(member.emergencyPhone) || "Not provided"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Heart className="h-4 w-4 text-blue-600" />
                            Interests & Preferences
                          </h3>
                          <dl className="mt-3 space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-sm text-slate-500">Provincial competitions</dt>
                              <dd className="text-right text-sm font-semibold text-slate-800">
                                {safeText(member.provincialInterest) || "Not specified"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-sm text-slate-500">Volunteer interest</dt>
                              <dd className="text-right text-sm font-semibold text-slate-800">
                                {safeText(member.volunteerInterest) || "Not specified"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-sm text-slate-500">Newsletter</dt>
                              <dd className="text-right text-sm font-semibold text-slate-800">
                                {member.newsletter ? "Subscribed" : "Not subscribed"}
                              </dd>
                            </div>
                            {member.hearAboutUs && (
                              <div className="border-t border-slate-100 pt-2.5">
                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                  Heard about us
                                </dt>
                                <dd className="mt-1 text-sm text-slate-700">{member.hearAboutUs}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Shield className="h-4 w-4 text-blue-600" />
                            Medical & Consent
                          </h3>

                          {hasMedicalInfo && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                                <p className="text-sm text-amber-900">{member.medicalInfo}</p>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 space-y-2.5">
                            {[
                              ["General consent", member.consent],
                              ["Photo consent", member.photoConsent],
                              ["Values acknowledgment", member.valuesAcknowledgment],
                            ].map(([label, accepted]) => (
                              <div key={String(label)} className="flex items-center justify-between gap-3">
                                <span className="text-sm text-slate-500">{String(label)}</span>
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                    accepted ? "text-emerald-700" : "text-red-700"
                                  }`}
                                >
                                  {accepted ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                  {accepted ? "Yes" : "No"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </main>

      {showQuickAddForm && (
        <QuickAddStudentForm
          onSuccess={() => {
            setShowQuickAddForm(false)
            loadMembers(true)
          }}
          onCancel={() => setShowQuickAddForm(false)}
        />
      )}

      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onSuccess={() => {
            setEditingMember(null)
            loadMembers(true)
          }}
          onCancel={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}
