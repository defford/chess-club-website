"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, X, RefreshCw, Clock } from "lucide-react"
import type { GameFormData, PlayerData, GameData } from "@/lib/types"

interface SimpleGameFormProps {
  players: PlayerData[]
  onSubmit: (gameData: GameFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  recentGames?: GameData[] // Optional: for showing recent players
  attendanceMeetId?: string // Optional: filter players by attendance meet
  initialData?: Partial<GameFormData> // Optional: initial data for editing
}

export default function SimpleGameForm({ 
  players, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  recentGames = [],
  attendanceMeetId,
  initialData
}: SimpleGameFormProps) {
  const isEdit = !!initialData
  
  // Find player names from IDs for initial values
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player?.name || ""
  }

  const [whitePlayerId, setWhitePlayerId] = useState(initialData?.player1Id || "")
  const [blackPlayerId, setBlackPlayerId] = useState(initialData?.player2Id || "")
  const [result, setResult] = useState<'white' | 'black' | 'draw' | ''>(
    initialData?.result === 'player1' ? 'white' : 
    initialData?.result === 'player2' ? 'black' : 
    initialData?.result === 'draw' ? 'draw' : ''
  )
  const [gameDate, setGameDate] = useState(initialData?.gameDate || new Date().toISOString().split('T')[0])
  const [whiteSearch, setWhiteSearch] = useState(initialData?.player1Id ? getPlayerName(initialData.player1Id) : "")
  const [blackSearch, setBlackSearch] = useState(initialData?.player2Id ? getPlayerName(initialData.player2Id) : "")
  const [showWhiteDropdown, setShowWhiteDropdown] = useState(false)
  const [showBlackDropdown, setShowBlackDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [whiteHighlightedIndex, setWhiteHighlightedIndex] = useState(-1)
  const [blackHighlightedIndex, setBlackHighlightedIndex] = useState(-1)

  // Refs for dropdown containers and inputs
  const whiteDropdownRef = useRef<HTMLDivElement>(null)
  const blackDropdownRef = useRef<HTMLDivElement>(null)
  const whiteInputRef = useRef<HTMLInputElement>(null)
  const blackInputRef = useRef<HTMLInputElement>(null)

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      const getPlayerName = (playerId: string) => {
        const player = players.find(p => p.id === playerId)
        return player?.name || ""
      }
      
      setWhitePlayerId(initialData.player1Id || "")
      setBlackPlayerId(initialData.player2Id || "")
      setResult(
        initialData.result === 'player1' ? 'white' : 
        initialData.result === 'player2' ? 'black' : 
        initialData.result === 'draw' ? 'draw' : ''
      )
      setGameDate(initialData.gameDate || new Date().toISOString().split('T')[0])
      setWhiteSearch(initialData.player1Id ? getPlayerName(initialData.player1Id) : "")
      setBlackSearch(initialData.player2Id ? getPlayerName(initialData.player2Id) : "")
    }
  }, [initialData, players])

  // Auto-focus on mount (only if not editing)
  useEffect(() => {
    if (!isEdit) {
      whiteInputRef.current?.focus()
    }
  }, [isEdit])

  // Get recent players from recent games
  const getRecentPlayerIds = (): string[] => {
    if (!recentGames || recentGames.length === 0) return []
    const recentPlayerIds = new Set<string>()
    recentGames.slice(0, 10).forEach(game => {
      if (game.player1Id) recentPlayerIds.add(game.player1Id)
      if (game.player2Id) recentPlayerIds.add(game.player2Id)
    })
    return Array.from(recentPlayerIds)
  }

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Close white dropdown if clicked outside
      if (showWhiteDropdown && whiteDropdownRef.current && !whiteDropdownRef.current.contains(target)) {
        setShowWhiteDropdown(false)
        setWhiteHighlightedIndex(-1)
      }
      
      // Close black dropdown if clicked outside
      if (showBlackDropdown && blackDropdownRef.current && !blackDropdownRef.current.contains(target)) {
        setShowBlackDropdown(false)
        setBlackHighlightedIndex(-1)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel
      if (e.key === 'Escape' && !showWhiteDropdown && !showBlackDropdown) {
        onCancel()
      }
      // Enter to submit when form is complete
      if (e.key === 'Enter' && e.ctrlKey && whitePlayerId && blackPlayerId && result) {
        e.preventDefault()
        const form = document.querySelector('form')
        if (form) form.requestSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [whitePlayerId, blackPlayerId, result, showWhiteDropdown, showBlackDropdown, onCancel])

  // Get recent player IDs
  const recentPlayerIds = getRecentPlayerIds()

  // Filter and sort players: recent first, then by search
  const filterAndSortPlayers = (search: string, excludeId: string, isWhite: boolean) => {
    const filtered = players.filter(player => 
      player.name.toLowerCase().includes(search.toLowerCase()) &&
      player.id !== excludeId
    )
    
    // Sort: recent players first, then alphabetically
    return filtered.sort((a, b) => {
      const aIsRecent = recentPlayerIds.includes(a.id || '')
      const bIsRecent = recentPlayerIds.includes(b.id || '')
      if (aIsRecent && !bIsRecent) return -1
      if (!aIsRecent && bIsRecent) return 1
      return a.name.localeCompare(b.name)
    })
  }

  const filteredWhitePlayers = filterAndSortPlayers(whiteSearch, blackPlayerId, true)
  const filteredBlackPlayers = filterAndSortPlayers(blackSearch, whitePlayerId, false)

  // Swap players
  const swapPlayers = () => {
    const tempId = whitePlayerId
    const tempName = whiteSearch
    setWhitePlayerId(blackPlayerId)
    setWhiteSearch(blackSearch)
    setBlackPlayerId(tempId)
    setBlackSearch(tempName)
    const tempResult = result === 'white' ? 'black' : result === 'black' ? 'white' : result
    setResult(tempResult)
  }

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
      gameDate: gameDate,
      gameType: initialData?.gameType || 'ladder',
      notes: initialData?.notes || '',
      eventId: initialData?.eventId
    }

    try {
      await onSubmit(gameFormData)
      // Reset form after successful submission (only if not editing)
      if (!isEdit) {
        setWhitePlayerId("")
        setBlackPlayerId("")
        setWhiteSearch("")
        setBlackSearch("")
        setResult('')
        setGameDate(new Date().toISOString().split('T')[0])
        whiteInputRef.current?.focus()
      }
    } catch (error) {
      console.error('Error submitting game:', error)
    }
  }

  const selectPlayer = (playerId: string, playerName: string, isWhite: boolean) => {
    if (isWhite) {
      setWhitePlayerId(playerId)
      setWhiteSearch(playerName)
      setShowWhiteDropdown(false)
      setWhiteHighlightedIndex(-1)
      // Auto-focus black input after selecting white
      setTimeout(() => blackInputRef.current?.focus(), 100)
    } else {
      setBlackPlayerId(playerId)
      setBlackSearch(playerName)
      setShowBlackDropdown(false)
      setBlackHighlightedIndex(-1)
    }
    
    // Clear errors when players are selected
    if (errors.whitePlayer || errors.blackPlayer) {
      setErrors(prev => ({ ...prev, whitePlayer: '', blackPlayer: '' }))
    }
  }

  // Handle result selection
  const handleResultSelect = (selectedResult: 'white' | 'black' | 'draw') => {
    setResult(selectedResult)
    if (errors.result) {
      setErrors(prev => ({ ...prev, result: '' }))
    }
  }

  // Auto-submit when all fields are complete
  useEffect(() => {
    if (autoSubmit && whitePlayerId && blackPlayerId && result && !isLoading) {
      const timer = setTimeout(() => {
        const form = document.querySelector('form') as HTMLFormElement
        if (form && form.requestSubmit) {
          form.requestSubmit()
        }
      }, 300) // Small delay to ensure UI updates
      
      return () => clearTimeout(timer)
    }
  }, [autoSubmit, whitePlayerId, blackPlayerId, result, isLoading])

  // Handle keyboard navigation in dropdowns
  const handleWhiteKeyDown = (e: React.KeyboardEvent) => {
    if (!showWhiteDropdown) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setWhiteHighlightedIndex(prev => 
        prev < filteredWhitePlayers.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setWhiteHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && whiteHighlightedIndex >= 0) {
      e.preventDefault()
      const player = filteredWhitePlayers[whiteHighlightedIndex]
      if (player) selectPlayer(player.id || '', player.name, true)
    } else if (e.key === 'Tab') {
      setShowWhiteDropdown(false)
      setWhiteHighlightedIndex(-1)
    }
  }

  const handleBlackKeyDown = (e: React.KeyboardEvent) => {
    if (!showBlackDropdown) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setBlackHighlightedIndex(prev => 
        prev < filteredBlackPlayers.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setBlackHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && blackHighlightedIndex >= 0) {
      e.preventDefault()
      const player = filteredBlackPlayers[blackHighlightedIndex]
      if (player) selectPlayer(player.id || '', player.name, false)
    } else if (e.key === 'Tab') {
      setShowBlackDropdown(false)
      setBlackHighlightedIndex(-1)
    }
  }



  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">{isEdit ? 'Edit Game' : 'Add Game'}</CardTitle>
          </div>
          <Button
            variant="outline"
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
          {attendanceMeetId && (
            <span className="ml-2 text-xs text-blue-600 font-medium">Filtered by attendance</span>
          )}
          <span className="hidden sm:inline ml-2 text-xs text-gray-500">Press Ctrl+Enter to submit, Esc to cancel</span>
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
                  ref={whiteInputRef}
                  type="text"
                  placeholder="Type to search or click to browse..."
                  value={whiteSearch}
                  onChange={(e) => {
                    setWhiteSearch(e.target.value)
                    setShowWhiteDropdown(true)
                    setWhiteHighlightedIndex(-1)
                  }}
                  onFocus={() => setShowWhiteDropdown(true)}
                  onKeyDown={handleWhiteKeyDown}
                  className={`w-full pl-10 pr-4 py-4 sm:py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base sm:text-sm ${
                    errors.whitePlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showWhiteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[60vh] sm:max-h-48 overflow-y-auto">
                    {filteredWhitePlayers.length > 0 ? (
                      <>
                        {recentPlayerIds.length > 0 && filteredWhitePlayers.some(p => recentPlayerIds.includes(p.id || '')) && (
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b sticky top-0">
                            Recent Players
                          </div>
                        )}
                        {filteredWhitePlayers.map((player, index) => {
                          const isRecent = recentPlayerIds.includes(player.id || '')
                          const isHighlighted = index === whiteHighlightedIndex
                          return (
                            <button
                              key={player.id || player.name}
                              type="button"
                              onClick={() => selectPlayer(player.id || '', player.name, true)}
                              className={`w-full text-left px-4 py-3 sm:py-2 min-h-[44px] sm:min-h-0 flex items-center focus:outline-none touch-manipulation ${
                                isHighlighted 
                                  ? 'bg-blue-100' 
                                  : isRecent 
                                    ? 'bg-gray-50 active:bg-gray-100' 
                                    : 'active:bg-gray-100'
                              }`}
                            >
                              <div className="font-medium flex items-center gap-2">
                                {player.name}
                                {player.eloRating !== undefined && (
                                  <span className="text-xs font-normal text-gray-500">({player.eloRating})</span>
                                )}
                                {(player as any).isSystemPlayer && ' [System]'}
                                {isRecent && !whiteSearch && (
                                  <Clock className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Grade {player.grade}
                                {(player as any).isSystemPlayer && ' - For incomplete games'}
                              </div>
                            </button>
                          )
                        })}
                      </>
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
              
              {/* Swap Players Button */}
              {whitePlayerId && blackPlayerId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={swapPlayers}
                  disabled={isLoading}
                  className="text-xs"
                  title="Swap players"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Swap
                </Button>
              )}
              
              {/* Result Buttons - Chess Notation Style - Horizontal Layout */}
              <div className="flex flex-row gap-2 justify-center">
                {/* White Wins - 1-0 */}
                <button
                  type="button"
                  onClick={() => handleResultSelect('white')}
                  className={`px-3 py-2 border-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center touch-manipulation ${
                    result === 'white'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 active:border-gray-400 text-gray-700'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  1-0
                </button>

                {/* Draw - ½-½ */}
                <button
                  type="button"
                  onClick={() => handleResultSelect('draw')}
                  className={`px-3 py-2 border-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center touch-manipulation ${
                    result === 'draw'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-300 active:border-gray-400 text-gray-700'
                  } ${errors.result ? 'border-red-500' : ''}`}
                  disabled={isLoading || !whitePlayerId || !blackPlayerId}
                >
                  ½-½
                </button>

                {/* Black Wins - 0-1 */}
                <button
                  type="button"
                  onClick={() => handleResultSelect('black')}
                  className={`px-3 py-2 border-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center touch-manipulation ${
                    result === 'black'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 active:border-gray-400 text-gray-700'
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
                  ref={blackInputRef}
                  type="text"
                  placeholder="Type to search or click to browse..."
                  value={blackSearch}
                  onChange={(e) => {
                    setBlackSearch(e.target.value)
                    setShowBlackDropdown(true)
                    setBlackHighlightedIndex(-1)
                  }}
                  onFocus={() => setShowBlackDropdown(true)}
                  onKeyDown={handleBlackKeyDown}
                  className={`w-full pl-10 pr-4 py-4 sm:py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-base sm:text-sm ${
                    errors.blackPlayer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {showBlackDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[60vh] sm:max-h-48 overflow-y-auto">
                    {filteredBlackPlayers.length > 0 ? (
                      <>
                        {recentPlayerIds.length > 0 && filteredBlackPlayers.some(p => recentPlayerIds.includes(p.id || '')) && (
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b sticky top-0">
                            Recent Players
                          </div>
                        )}
                        {filteredBlackPlayers.map((player, index) => {
                          const isRecent = recentPlayerIds.includes(player.id || '')
                          const isHighlighted = index === blackHighlightedIndex
                          return (
                            <button
                              key={player.id || player.name}
                              type="button"
                              onClick={() => selectPlayer(player.id || '', player.name, false)}
                              className={`w-full text-left px-4 py-3 sm:py-2 min-h-[44px] sm:min-h-0 flex items-center focus:outline-none touch-manipulation ${
                                isHighlighted 
                                  ? 'bg-blue-100' 
                                  : isRecent 
                                    ? 'bg-gray-50 active:bg-gray-100' 
                                    : 'active:bg-gray-100'
                              }`}
                            >
                              <div className="font-medium flex items-center gap-2">
                                {player.name}
                                {player.eloRating !== undefined && (
                                  <span className="text-xs font-normal text-gray-500">({player.eloRating})</span>
                                )}
                                {(player as any).isSystemPlayer && ' [System]'}
                                {isRecent && !blackSearch && (
                                  <Clock className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Grade {player.grade}
                                {(player as any).isSystemPlayer && ' - For incomplete games'}
                              </div>
                            </button>
                          )
                        })}
                      </>
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

          {/* Game Date Section - Hidden when attendanceMeetId is provided (date set by meet) */}
          {!attendanceMeetId && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-xs">
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2 text-center">
                  Game Date
                </label>
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-center text-base sm:text-sm min-h-[44px]"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          
          {/* Auto-submit toggle */}
          <div className="flex flex-col items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-0">
              <input
                type="checkbox"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="rounded w-5 h-5 sm:w-4 sm:h-4"
                disabled={isLoading}
              />
              <span>Auto-submit when complete</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto order-2 sm:order-1 min-h-[48px] sm:min-h-0 touch-manipulation text-base sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2 min-h-[48px] sm:min-h-0 touch-manipulation text-base sm:text-sm font-semibold"
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Game' : 'Add Game'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
