"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Users, Calendar, CheckCircle, ArrowRight, Search, Plus } from "lucide-react"
import type { ClubMeetData, PlayerData } from "@/lib/types"
import QuickAddStudentForm from "./QuickAddStudentForm"
import { clientAuthService } from "@/lib/clientAuth"

interface QuickStartMeetProps {
  allPlayers: PlayerData[]
  onComplete: (meetId: string) => void
  onCancel: () => void
  onCreateMeet: (meetData: { meetDate: string; meetName?: string; notes?: string }) => Promise<string>
  onAddAttendance: (meetId: string, playerIds: string[]) => Promise<void>
  onRefreshPlayers?: () => Promise<PlayerData[]>
}

type Step = 'create' | 'attendance'

export default function QuickStartMeet({
  allPlayers,
  onComplete,
  onCancel,
  onCreateMeet,
  onAddAttendance,
  onRefreshPlayers
}: QuickStartMeetProps) {
  const [step, setStep] = useState<Step>('create')
  const [meetId, setMeetId] = useState<string>("")
  const [meetDate, setMeetDate] = useState(new Date().toISOString().split('T')[0])
  const [meetName, setMeetName] = useState("")
  const [meetNotes, setMeetNotes] = useState("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false)
  const [players, setPlayers] = useState<PlayerData[]>(allPlayers)

  // Sync players when allPlayers prop changes
  useEffect(() => {
    setPlayers(allPlayers)
  }, [allPlayers])

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.grade.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleQuickAddSuccess = async () => {
    setShowQuickAddPlayer(false)
    // Refresh players list
    if (onRefreshPlayers) {
      const refreshedPlayers = await onRefreshPlayers()
      setPlayers(refreshedPlayers)
    } else {
      // Fallback: reload from allPlayers prop if no refresh function provided
      const session = clientAuthService.getCurrentParentSession()
      const userEmail = session?.email || 'dev@example.com'
      try {
        const response = await fetch('/api/members')
        if (response.ok) {
          const membersData = await response.json()
          const playersData = membersData.map((member: any) => ({
            id: member.id,
            name: member.playerName,
            grade: member.playerGrade,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            points: 0,
            rank: 0,
            lastActive: member.timestamp || new Date().toISOString(),
            email: member.parentEmail || '',
            isSystemPlayer: member.isSystemPlayer || false
          }))
          setPlayers(playersData)
        }
      } catch (err) {
        console.error('Error refreshing players:', err)
      }
    }
  }

  const togglePlayerSelection = (playerId: string) => {
    const newSet = new Set(selectedPlayerIds)
    if (newSet.has(playerId)) {
      newSet.delete(playerId)
    } else {
      newSet.add(playerId)
    }
    setSelectedPlayerIds(newSet)
  }

  const handleCreateMeet = async () => {
    if (!meetDate) {
      setError('Meet date is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const id = await onCreateMeet({
        meetDate,
        meetName: meetName || undefined,
        notes: meetNotes || undefined
      })

      setMeetId(id)
      setStep('attendance')
    } catch (err) {
      console.error('Error creating meet:', err)
      setError(err instanceof Error ? err.message : 'Failed to create meet')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddAttendance = async () => {
    if (selectedPlayerIds.size === 0) {
      setError('Please select at least one player')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await onAddAttendance(meetId, Array.from(selectedPlayerIds))
      
      // Complete the flow after adding attendance
      onComplete(meetId)
    } catch (err) {
      console.error('Error adding attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to add attendance')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="pb-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Quick Start Meet</CardTitle>
              <CardDescription className="mt-1">
                {step === 'create' && 'Create a new meet and record attendance'}
                {step === 'attendance' && 'Mark who attended today'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-2 ${step === 'create' ? 'text-[--color-primary] font-semibold' : step === 'attendance' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'create' ? 'border-[--color-primary] bg-[--color-primary]/10' : 
                step === 'attendance' ? 'border-green-600 bg-green-50' : 
                'border-gray-300'
              }`}>
                {step === 'attendance' ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-sm">Create Meet</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-2 ${step === 'attendance' ? 'text-[--color-primary] font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'attendance' ? 'border-[--color-primary] bg-[--color-primary]/10' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="text-sm">Attendance</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Create Meet */}
          {step === 'create' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Meet Date *
                </label>
                <input
                  type="date"
                  value={meetDate}
                  onChange={(e) => setMeetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Meet Name (optional)
                </label>
                <input
                  type="text"
                  value={meetName}
                  onChange={(e) => setMeetName(e.target.value)}
                  placeholder="e.g., Weekly Club Meet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={meetNotes}
                  onChange={(e) => setMeetNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  disabled={submitting}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMeet}
                  disabled={submitting || !meetDate}
                  variant="outline"
                >
                  {submitting ? 'Creating...' : 'Create Meet & Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Add Attendance */}
          {step === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">{meetName || new Date(meetDate).toLocaleDateString()}</p>
                    <p className="text-sm">{new Date(meetDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[--color-text-primary]">
                    Select Players Who Attended ({selectedPlayerIds.size} selected)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickAddPlayer(true)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Quick Add Player
                  </Button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  />
                </div>
                <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                  {filteredPlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No players found</div>
                  ) : (
                    <div className="divide-y">
                      {filteredPlayers.map((player) => (
                        <label
                          key={player.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlayerIds.has(player.id || '')}
                            onChange={() => togglePlayerSelection(player.id || '')}
                            className="mr-3 h-5 w-5 rounded border-gray-300 text-[--color-primary] focus:ring-[--color-primary]"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-[--color-text-primary]">{player.name}</div>
                            <div className="text-sm text-gray-500">Grade {player.grade}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('create')}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleAddAttendance}
                  disabled={submitting || selectedPlayerIds.size === 0}
                  variant="outline"
                >
                  {submitting ? 'Adding...' : `Add ${selectedPlayerIds.size} Player${selectedPlayerIds.size !== 1 ? 's' : ''} & Complete`}
                </Button>
              </div>
            </div>
          )}

          {/* Quick Add Player Modal */}
          {showQuickAddPlayer && (
            <QuickAddStudentForm
              onSuccess={handleQuickAddSuccess}
              onCancel={() => setShowQuickAddPlayer(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

