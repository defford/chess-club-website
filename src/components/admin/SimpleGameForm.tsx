"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, X, ArrowLeft, ArrowRight, Minus } from "lucide-react"
import type { GameFormData, PlayerData } from "@/lib/types"

interface SimpleGameFormProps {
  players: PlayerData[]
  onSubmit: (gameData: GameFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function SimpleGameForm({ 
  players, 
  onSubmit, 
  onCancel, 
  isLoading = false
}: SimpleGameFormProps) {
  const [whitePlayerId, setWhitePlayerId] = useState("")
  const [blackPlayerId, setBlackPlayerId] = useState("")
  const [result, setResult] = useState<'white' | 'black' | 'draw' | ''>('')
  const [whiteSearch, setWhiteSearch] = useState("")
  const [blackSearch, setBlackSearch] = useState("")
  const [showWhiteDropdown, setShowWhiteDropdown] = useState(false)
  const [showBlackDropdown, setShowBlackDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter players based on search
  const filteredWhitePlayers = players.filter(player => 
    player.name.toLowerCase().includes(whiteSearch.toLowerCase()) &&
    player.id !== blackPlayerId
  )

  const filteredBlackPlayers = players.filter(player => 
    player.name.toLowerCase().includes(blackSearch.toLowerCase()) &&
    player.id !== whitePlayerId
  )

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!whitePlayerId) {
      newErrors.whitePlayer = 'White player is required'
    }
    if (!blackPlayerId) {
      newErrors.blackPlayer = 'Black player is required'
    }
    if (whitePlayerId === blackPlayerId) {
      newErrors.blackPlayer = 'Players must be different'
    }
    if (!result) {
      newErrors.result = 'Game result is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Convert to the format expected by the API
    const gameFormData: GameFormData = {
      player1Id: whitePlayerId,
      player2Id: blackPlayerId,
      result: result === 'white' ? 'player1' : result === 'black' ? 'player2' : 'draw',
      gameDate: new Date().toISOString().split('T')[0],
      gameTime: 30, // Default 30 minutes
      gameType: 'ladder',
      notes: ''
    }

    try {
      await onSubmit(gameFormData)
    } catch (error) {
      console.error('Error submitting game:', error)
    }
  }

  const selectPlayer = (playerId: string, playerName: string, isWhite: boolean) => {
    if (isWhite) {
      setWhitePlayerId(playerId)
      setWhiteSearch(playerName)
      setShowWhiteDropdown(false)
    } else {
      setBlackPlayerId(playerId)
      setBlackSearch(playerName)
      setShowBlackDropdown(false)
    }
    
    // Clear errors when players are selected
    if (errors.whitePlayer || errors.blackPlayer) {
      setErrors(prev => ({ ...prev, whitePlayer: '', blackPlayer: '' }))
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : ''
  }

  const getWhitePlayerName = () => getPlayerName(whitePlayerId)
  const getBlackPlayerName = () => getPlayerName(blackPlayerId)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Add Game</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Select players and result to record a chess game
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Players Selection with Result in Between */}
          <div className="space-y-6">
            {/* White Player */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                ⚪ White Player *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search for white player..."
                  value={whiteSearch}
                  onChange={(e) => {
                    setWhiteSearch(e.target.value)
                    setShowWhiteDropdown(true)
                  }}
                  onFocus={() => setShowWhiteDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.whitePlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showWhiteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredWhitePlayers.length > 0 ? (
                      filteredWhitePlayers.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => selectPlayer(player.id, player.name, true)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500">Grade {player.grade}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No players found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.whitePlayer && (
                <p className="text-red-500 text-sm mt-1">{errors.whitePlayer}</p>
              )}
            </div>

            {/* Result Selection - Between Players */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-3">
                Game Result *
              </label>
              <div className="flex items-center justify-center gap-4">
                {/* White Wins */}
                <button
                  type="button"
                  onClick={() => setResult('white')}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-colors ${
                    result === 'white'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  <ArrowRight className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">
                    {getWhitePlayerName() || 'White'} Wins
                  </span>
                </button>

                {/* Draw */}
                <button
                  type="button"
                  onClick={() => setResult('draw')}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-colors ${
                    result === 'draw'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  <Minus className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">Draw</span>
                </button>

                {/* Black Wins */}
                <button
                  type="button"
                  onClick={() => setResult('black')}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-colors ${
                    result === 'black'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  <ArrowLeft className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">
                    {getBlackPlayerName() || 'Black'} Wins
                  </span>
                </button>
              </div>
              {errors.result && (
                <p className="text-red-500 text-sm mt-2 text-center">{errors.result}</p>
              )}
            </div>

            {/* Black Player */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                ⚫ Black Player *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search for black player..."
                  value={blackSearch}
                  onChange={(e) => {
                    setBlackSearch(e.target.value)
                    setShowBlackDropdown(true)
                  }}
                  onFocus={() => setShowBlackDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.blackPlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showBlackDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredBlackPlayers.length > 0 ? (
                      filteredBlackPlayers.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => selectPlayer(player.id, player.name, false)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500">Grade {player.grade}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No players found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.blackPlayer && (
                <p className="text-red-500 text-sm mt-1">{errors.blackPlayer}</p>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
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
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? 'Saving...' : 'Add Game'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
