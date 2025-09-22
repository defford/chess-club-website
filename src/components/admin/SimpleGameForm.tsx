"use client"

import { useState, useEffect, useRef } from "react"
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

  // Refs for dropdown containers
  const whiteDropdownRef = useRef<HTMLDivElement>(null)
  const blackDropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Close white dropdown if clicked outside
      if (showWhiteDropdown && whiteDropdownRef.current && !whiteDropdownRef.current.contains(target)) {
        setShowWhiteDropdown(false)
      }
      
      // Close black dropdown if clicked outside
      if (showBlackDropdown && blackDropdownRef.current && !blackDropdownRef.current.contains(target)) {
        setShowBlackDropdown(false)
      }
    }

    // Add event listener when dropdowns are open
    if (showWhiteDropdown || showBlackDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWhiteDropdown, showBlackDropdown])

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



  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Add Game</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-sm">
          Select players and result to record a chess game ({players.length} players available)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battle Layout: White Player | VS | Black Player */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
            {/* White Player Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl">♔</div>
                <label className="text-sm font-medium text-[--color-text-primary]">
                  White Player *
                </label>
              </div>
              <div className="relative" ref={whiteDropdownRef}>
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
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.whitePlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showWhiteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredWhitePlayers.length > 0 ? (
                      filteredWhitePlayers.map(player => (
                        <button
                          key={player.id || player.name}
                          type="button"
                          onClick={() => selectPlayer(player.id || '', player.name, true)}
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

            {/* VS Section with Result Buttons */}
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600 mb-2">VS</div>
                <div className="text-xs text-gray-500">Game Result</div>
              </div>
              
              {/* Result Buttons - Chess Notation Style */}
              <div className="flex flex-col gap-2 w-full max-w-32">
                {/* White Wins - 1-0 */}
                <button
                  type="button"
                  onClick={() => setResult('white')}
                  className={`px-4 py-2 border-2 rounded-md transition-colors text-sm font-medium ${
                    result === 'white'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  1-0
                </button>

                {/* Draw - ½-½ */}
                <button
                  type="button"
                  onClick={() => setResult('draw')}
                  className={`px-4 py-2 border-2 rounded-md transition-colors text-sm font-medium ${
                    result === 'draw'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  ½-½
                </button>

                {/* Black Wins - 0-1 */}
                <button
                  type="button"
                  onClick={() => setResult('black')}
                  className={`px-4 py-2 border-2 rounded-md transition-colors text-sm font-medium ${
                    result === 'black'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  0-1
                </button>
              </div>
              
              {errors.result && (
                <p className="text-red-500 text-xs text-center">{errors.result}</p>
              )}
            </div>

            {/* Black Player Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl">♚</div>
                <label className="text-sm font-medium text-[--color-text-primary]">
                  Black Player *
                </label>
              </div>
              <div className="relative" ref={blackDropdownRef}>
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
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.blackPlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showBlackDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredBlackPlayers.length > 0 ? (
                      filteredBlackPlayers.map(player => (
                        <button
                          key={player.id || player.name}
                          type="button"
                          onClick={() => selectPlayer(player.id || '', player.name, false)}
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2"
            >
              {isLoading ? 'Saving...' : 'Add Game'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
