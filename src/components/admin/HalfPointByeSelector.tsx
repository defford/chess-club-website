"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { TournamentResultData } from "@/lib/types"
import { X, Plus, Users, AlertCircle, CheckCircle } from "lucide-react"

interface HalfPointByeSelectorProps {
  tournamentId: string
  roundNumber: number
  players: TournamentResultData[]
  onByesAssigned: () => void
  onCancel: () => void
  userEmail?: string
}

export default function HalfPointByeSelector({
  tournamentId,
  roundNumber,
  players,
  onByesAssigned,
  onCancel,
  userEmail = 'dev@example.com'
}: HalfPointByeSelectorProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter players based on search query and exclude those already with byes
  const filteredPlayers = players.filter(player =>
    player.playerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !player.byeRounds.includes(roundNumber) &&
    !selectedPlayers.includes(player.playerId)
  )

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayers(prev => [...prev, playerId])
    setSearchQuery("")
  }

  const handlePlayerRemove = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(id => id !== playerId))
  }

  const handleAssignByes = async () => {
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/tournaments/${tournamentId}/half-point-byes?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds: selectedPlayers,
          roundNumber
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign half-point byes')
      }

      const result = await response.json()
      console.log('Half-point byes assigned:', result)
      
      // Show success message
      alert(`Half-point byes assigned to ${result.affectedPlayers} players for Round ${roundNumber}`)
      
      // Call the callback to refresh data
      onByesAssigned()
    } catch (err) {
      console.error('Error assigning half-point byes:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign half-point byes')
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedPlayerNames = () => {
    return selectedPlayers.map(playerId => {
      const player = players.find(p => p.playerId === playerId)
      return player?.playerName || 'Unknown Player'
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[--color-primary]" />
          Assign Half-Point Byes
        </CardTitle>
        <CardDescription>
          Select players who are absent and should receive a half-point bye for Round {roundNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Players */}
        {selectedPlayers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[--color-text-primary]">
              Selected Players ({selectedPlayers.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {getSelectedPlayerNames().map((playerName, index) => (
                <div
                  key={selectedPlayers[index]}
                  className="flex items-center gap-2 bg-[--color-primary]/10 text-[--color-primary] px-3 py-1 rounded-full text-sm"
                >
                  <span>{playerName}</span>
                  <button
                    type="button"
                    onClick={() => handlePlayerRemove(selectedPlayers[index])}
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
          <label className="text-sm font-medium text-[--color-text-primary]">
            Add Players
          </label>
          <div className="relative">
            <Input
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {searchQuery && filteredPlayers.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
              {filteredPlayers.slice(0, 10).map((player) => (
                <button
                  key={player.playerId}
                  type="button"
                  onClick={() => handlePlayerSelect(player.playerId)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{player.playerName}</div>
                    <div className="text-sm text-gray-500">
                      {player.points} points • {player.gamesPlayed} games played
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && filteredPlayers.length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              No available players found matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Players Already with Byes */}
        {players.some(player => player.byeRounds.includes(roundNumber)) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Players Already with Byes
              </span>
            </div>
            <div className="text-sm text-yellow-700">
              {players
                .filter(player => player.byeRounds.includes(roundNumber))
                .map(player => player.playerName)
                .join(', ')}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssignByes}
            disabled={submitting || selectedPlayers.length === 0}
            variant="outline"
            className="bg-[--color-primary] hover:bg-[--color-primary]/90"
          >
            {submitting ? 'Assigning...' : `Assign Byes (${selectedPlayers.length})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
