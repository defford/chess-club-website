"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Check, 
  X, 
  AlertTriangle,
  Clock,
  Trophy
} from "lucide-react"

interface Player {
  playerId: string;
  playerName: string;
}

interface CurrentPlayer extends Player {
  withdrawn: boolean;
  withdrawnAt?: string;
}

interface TournamentInfo {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  totalRounds: number;
}

interface PlayerManagerProps {
  tournamentId: string;
  onPlayersUpdated: () => void;
  onClose: () => void;
}

export default function PlayerManager({ tournamentId, onPlayersUpdated, onClose }: PlayerManagerProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Tournament data
  const [tournament, setTournament] = useState<TournamentInfo | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [currentPlayers, setCurrentPlayers] = useState<CurrentPlayer[]>([])
  
  // Add players state
  const [selectedPlayersToAdd, setSelectedPlayersToAdd] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedByeRounds, setSelectedByeRounds] = useState<number[]>([])
  
  // Remove players state
  const [selectedPlayersToRemove, setSelectedPlayersToRemove] = useState<string[]>([])
  const [removeCompletely, setRemoveCompletely] = useState(false)
  
  // Confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState<any>(null)

  useEffect(() => {
    loadPlayerData()
  }, [tournamentId])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the user email for authentication
      const userEmail = 'dev@example.com' // In a real app, this would come from the session
      
      const response = await fetch(`/api/tournaments/${tournamentId}/players?email=${encodeURIComponent(userEmail)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load player data')
      }
      
      const data = await response.json()
      setTournament(data.tournament)
      setAvailablePlayers(data.availablePlayers)
      setCurrentPlayers(data.currentPlayers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayers = () => {
    if (selectedPlayersToAdd.length === 0) {
      setError('Please select at least one player to add')
      return
    }

    const selectedPlayerNames = availablePlayers
      .filter(p => selectedPlayersToAdd.includes(p.playerId))
      .map(p => p.playerName)

    setConfirmationData({
      action: 'add',
      players: selectedPlayerNames,
      byeRounds: selectedByeRounds,
      tournament: tournament
    })
    setShowConfirmation(true)
  }

  const handleRemovePlayers = () => {
    if (selectedPlayersToRemove.length === 0) {
      setError('Please select at least one player to remove')
      return
    }

    const selectedPlayerNames = currentPlayers
      .filter(p => selectedPlayersToRemove.includes(p.playerId))
      .map(p => p.playerName)

    setConfirmationData({
      action: 'remove',
      players: selectedPlayerNames,
      removeCompletely,
      tournament: tournament
    })
    setShowConfirmation(true)
  }

  const executePlayerAction = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const { action, players, byeRounds, removeCompletely } = confirmationData
      const playerIds = action === 'add' 
        ? selectedPlayersToAdd 
        : selectedPlayersToRemove

      // Get the user email for authentication
      const userEmail = 'dev@example.com' // In a real app, this would come from the session
      
      const response = await fetch(`/api/tournaments/${tournamentId}/players?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          playerIds,
          byeRounds: action === 'add' ? byeRounds : undefined,
          removeCompletely: action === 'remove' ? removeCompletely : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update players')
      }

      const result = await response.json()
      setSuccess(result.message)
      
      // Reset form
      setSelectedPlayersToAdd([])
      setSelectedPlayersToRemove([])
      setSelectedByeRounds([])
      setRemoveCompletely(false)
      
      // Reload data
      await loadPlayerData()
      onPlayersUpdated()
      
      setShowConfirmation(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update players')
    } finally {
      setLoading(false)
    }
  }

  const filteredAvailablePlayers = availablePlayers.filter(player =>
    player.playerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const generateByeRoundOptions = () => {
    if (!tournament) return []
    const options = []
    for (let i = 1; i <= tournament.currentRound; i++) {
      options.push(i)
    }
    return options
  }

  const handleByeRoundToggle = (round: number) => {
    setSelectedByeRounds(prev => 
      prev.includes(round) 
        ? prev.filter(r => r !== round)
        : [...prev, round]
    )
  }

  if (loading && !tournament) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto mb-4"></div>
          <p>Loading player data...</p>
        </div>
      </div>
    )
  }

  if (showConfirmation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Confirm Player Changes</h3>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  {confirmationData.action === 'add' ? 'Adding Players:' : 'Removing Players:'}
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {confirmationData.players.map((name: string) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>

              {confirmationData.action === 'add' && confirmationData.byeRounds.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Bye Rounds Assigned:</h4>
                  <p className="text-sm text-gray-600">
                    Rounds {confirmationData.byeRounds.join(', ')} (0.5 points each)
                  </p>
                </div>
              )}

              {confirmationData.action === 'remove' && (
                <div>
                  <h4 className="font-medium mb-2">Removal Type:</h4>
                  <p className="text-sm text-gray-600">
                    {confirmationData.removeCompletely 
                      ? 'Complete removal (all data deleted)' 
                      : 'Withdrawal (data preserved, marked as withdrawn)'
                    }
                  </p>
                </div>
              )}

              {confirmationData.tournament.status === 'active' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Active Tournament</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Current round pairings will be cleared and need to be regenerated.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={executePlayerAction}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : 'Confirm Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowConfirmation(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[--color-text-primary]">Manage Players</h2>
          <p className="text-gray-600">{tournament?.name}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="h-4 w-4" />
            <span className="font-medium">Success</span>
          </div>
          <p className="text-sm text-green-700 mt-1">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'add'
              ? 'border-[--color-primary] text-[--color-primary]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserPlus className="h-4 w-4 inline mr-2" />
          Add Players
        </button>
        <button
          onClick={() => setActiveTab('remove')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'remove'
              ? 'border-[--color-primary] text-[--color-primary]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserMinus className="h-4 w-4 inline mr-2" />
          Remove Players
        </button>
      </div>

      {/* Add Players Tab */}
      {activeTab === 'add' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Players to Tournament
              </CardTitle>
              <CardDescription>
                Select players to add to the tournament. You can assign bye rounds for missed rounds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Available Players */}
              <div className="space-y-2">
                <h4 className="font-medium">Available Players ({filteredAvailablePlayers.length})</h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredAvailablePlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchQuery ? 'No players found matching your search' : 'No available players'}
                    </div>
                  ) : (
                    filteredAvailablePlayers.map((player) => (
                      <label
                        key={player.playerId}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayersToAdd.includes(player.playerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlayersToAdd(prev => [...prev, player.playerId])
                            } else {
                              setSelectedPlayersToAdd(prev => prev.filter(id => id !== player.playerId))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1">{player.playerName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Bye Rounds Selection */}
              {selectedPlayersToAdd.length > 0 && tournament && tournament.currentRound > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Assign Bye Rounds (Optional)</h4>
                  <p className="text-sm text-gray-600">
                    Select rounds to give bye points (0.5 points each) for missed rounds:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generateByeRoundOptions().map(round => (
                      <label
                        key={round}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedByeRounds.includes(round)}
                          onChange={() => handleByeRoundToggle(round)}
                          className="rounded border-gray-300"
                        />
                        <span>Round {round}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddPlayers}
                disabled={selectedPlayersToAdd.length === 0 || loading}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add {selectedPlayersToAdd.length} Player{selectedPlayersToAdd.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remove Players Tab */}
      {activeTab === 'remove' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Remove Players from Tournament
              </CardTitle>
              <CardDescription>
                Select players to remove from the tournament. Choose whether to completely remove their data or mark them as withdrawn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Players */}
              <div className="space-y-2">
                <h4 className="font-medium">Current Players ({currentPlayers.length})</h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {currentPlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No players in tournament</div>
                  ) : (
                    currentPlayers.map((player) => (
                      <label
                        key={player.playerId}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          player.withdrawn ? 'bg-gray-50 opacity-75' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayersToRemove.includes(player.playerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlayersToRemove(prev => [...prev, player.playerId])
                            } else {
                              setSelectedPlayersToRemove(prev => prev.filter(id => id !== player.playerId))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={player.withdrawn ? 'line-through text-gray-500' : ''}>
                              {player.playerName}
                            </span>
                            {player.withdrawn && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                Withdrawn
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Removal Type */}
              <div className="space-y-2">
                <h4 className="font-medium">Removal Type</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="removalType"
                      checked={!removeCompletely}
                      onChange={() => setRemoveCompletely(false)}
                      className="border-gray-300"
                    />
                    <div>
                      <div className="font-medium">Withdraw (Recommended)</div>
                      <div className="text-sm text-gray-600">
                        Preserve all game data and opponent statistics. Player is marked as withdrawn.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="removalType"
                      checked={removeCompletely}
                      onChange={() => setRemoveCompletely(true)}
                      className="border-gray-300"
                    />
                    <div>
                      <div className="font-medium">Complete Removal</div>
                      <div className="text-sm text-gray-600">
                        Delete all player data completely. This may affect opponent statistics.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleRemovePlayers}
                disabled={selectedPlayersToRemove.length === 0 || loading}
                variant="destructive"
                className="w-full"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {removeCompletely ? 'Remove' : 'Withdraw'} {selectedPlayersToRemove.length} Player{selectedPlayersToRemove.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
