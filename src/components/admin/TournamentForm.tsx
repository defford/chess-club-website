"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { TournamentFormData, RegistrationData } from "@/lib/types"
import { X, Plus, Users } from "lucide-react"

interface TournamentFormProps {
  onSubmit: (data: TournamentFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<TournamentFormData>
  members: RegistrationData[]
}

export default function TournamentForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  members
}: TournamentFormProps) {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    totalRounds: initialData?.totalRounds || 5,
    playerIds: initialData?.playerIds || []
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<RegistrationData[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize selected players from initial data
  useEffect(() => {
    if (initialData?.playerIds && initialData.playerIds.length > 0) {
      const players = members.filter(member => 
        initialData.playerIds!.includes(member.studentId || member.rowIndex?.toString() || '')
      )
      setSelectedPlayers(players)
    }
  }, [initialData, members])

  const filteredMembers = members.filter(member =>
    member.playerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedPlayers.some(selected => selected.studentId === member.studentId)
  )

  const handleInputChange = (field: keyof TournamentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handlePlayerSelect = (member: RegistrationData) => {
    const playerId = member.studentId || member.rowIndex?.toString() || ''
    if (!playerId) return

    setSelectedPlayers(prev => [...prev, member])
    setFormData(prev => ({
      ...prev,
      playerIds: [...prev.playerIds, playerId]
    }))
    setSearchQuery("")
  }

  const handlePlayerRemove = (member: RegistrationData) => {
    const playerId = member.studentId || member.rowIndex?.toString() || ''
    if (!playerId) return

    setSelectedPlayers(prev => prev.filter(p => p.studentId !== member.studentId))
    setFormData(prev => ({
      ...prev,
      playerIds: prev.playerIds.filter(id => id !== playerId)
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      // Parse the date string directly to avoid timezone issues
      const [year, month, day] = formData.startDate.split('-').map(Number)
      const startDate = new Date(year, month - 1, day) // month is 0-indexed
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past'
      }
    }

    if (formData.totalRounds < 1 || formData.totalRounds > 20) {
      newErrors.totalRounds = 'Total rounds must be between 1 and 20'
    }

    if (formData.playerIds.length < 4) {
      newErrors.players = 'At least 4 players are required for a Swiss tournament'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting tournament form:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Tournament</CardTitle>
        <CardDescription>
          Set up a new Swiss tournament with automatic pairings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Tournament Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter tournament name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date *
              </label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter tournament description (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="totalRounds" className="text-sm font-medium">
              Total Rounds *
            </label>
            <Input
              id="totalRounds"
              type="number"
              min="1"
              max="20"
              value={formData.totalRounds}
              onChange={(e) => handleInputChange('totalRounds', parseInt(e.target.value) || 1)}
              className={errors.totalRounds ? 'border-red-500' : ''}
            />
            {errors.totalRounds && (
              <p className="text-sm text-red-600">{errors.totalRounds}</p>
            )}
            <p className="text-xs text-gray-500">
              Recommended: 5-7 rounds for most tournaments
            </p>
          </div>

          {/* Player Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[--color-primary]" />
              <h3 className="text-lg font-semibold">Select Players</h3>
              <span className="text-sm text-gray-500">
                ({selectedPlayers.length} selected)
              </span>
            </div>

            {errors.players && (
              <p className="text-sm text-red-600">{errors.players}</p>
            )}

            {/* Selected Players */}
            {selectedPlayers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Players</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((member) => (
                    <div
                      key={member.studentId || member.rowIndex}
                      className="flex items-center gap-2 bg-[--color-primary]/10 text-[--color-primary] px-3 py-1 rounded-full text-sm"
                    >
                      <span>{member.playerName}</span>
                      <button
                        type="button"
                        onClick={() => handlePlayerRemove(member)}
                        className="hover:bg-[--color-primary]/20 rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Players</label>
              <div className="relative">
                <Input
                  placeholder="Search players by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {searchQuery && filteredMembers.length > 0 && (
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                  {filteredMembers.slice(0, 10).map((member) => (
                    <button
                      key={member.studentId || member.rowIndex}
                      type="button"
                      onClick={() => handlePlayerSelect(member)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{member.playerName}</div>
                        <div className="text-sm text-gray-500">
                          Grade {member.playerGrade} • {member.parentName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && filteredMembers.length === 0 && (
                <p className="text-sm text-gray-500 py-2">
                  No players found matching "{searchQuery}"
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || selectedPlayers.length < 4}
              variant="outline"
            >
              {isLoading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
