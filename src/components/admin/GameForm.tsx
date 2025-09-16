"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Save, Gamepad2 } from "lucide-react"
import type { GameFormData, PlayerData } from "@/lib/types"

interface GameFormProps {
  players: PlayerData[]
  onSubmit: (gameData: GameFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<GameFormData>
}

export default function GameForm({ 
  players, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: GameFormProps) {
  const [formData, setFormData] = useState<GameFormData>({
    player1Id: initialData?.player1Id || '',
    player2Id: initialData?.player2Id || '',
    result: initialData?.result || '',
    gameDate: initialData?.gameDate || new Date().toISOString().split('T')[0],
    gameTime: initialData?.gameTime || 0,
    gameType: initialData?.gameType || 'ladder',
    eventId: initialData?.eventId || '',
    notes: initialData?.notes || '',
    opening: initialData?.opening || '',
    endgame: initialData?.endgame || '',
    recordedBy: 'admin'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.player1Id) {
      newErrors.player1Id = 'Player 1 is required'
    }
    if (!formData.player2Id) {
      newErrors.player2Id = 'Player 2 is required'
    }
    if (formData.player1Id === formData.player2Id) {
      newErrors.player2Id = 'Players must be different'
    }
    if (!formData.result) {
      newErrors.result = 'Game result is required'
    }
    if (formData.gameTime < 0) {
      newErrors.gameTime = 'Game time cannot be negative'
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
      console.error('Error submitting game:', error)
    }
  }

  const handleInputChange = (field: keyof GameFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : ''
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-[--color-primary]" />
              <CardTitle className="text-lg sm:text-xl">Record New Game</CardTitle>
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
            Enter the details for the chess game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Players */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Player 1 *
                </label>
                <select
                  value={formData.player1Id}
                  onChange={(e) => handleInputChange('player1Id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.player1Id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Select Player 1</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.grade})
                    </option>
                  ))}
                </select>
                {errors.player1Id && (
                  <p className="text-red-500 text-sm mt-1">{errors.player1Id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Player 2 *
                </label>
                <select
                  value={formData.player2Id}
                  onChange={(e) => handleInputChange('player2Id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.player2Id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Select Player 2</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.grade})
                    </option>
                  ))}
                </select>
                {errors.player2Id && (
                  <p className="text-red-500 text-sm mt-1">{errors.player2Id}</p>
                )}
              </div>
            </div>

            {/* Game Result */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Game Result *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'player1', label: `${getPlayerName(formData.player1Id)} wins` },
                  { value: 'player2', label: `${getPlayerName(formData.player2Id)} wins` },
                  { value: 'draw', label: 'Draw' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('result', option.value)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      formData.result === option.value
                        ? 'bg-[--color-primary] text-white border-[--color-primary]'
                        : 'bg-white text-[--color-text-primary] border-gray-300 hover:bg-gray-50'
                    } ${errors.result ? 'border-red-500' : ''}`}
                    disabled={isLoading || !formData.player1Id || !formData.player2Id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.result && (
                <p className="text-red-500 text-sm mt-1">{errors.result}</p>
              )}
            </div>

            {/* Game Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Game Date
                </label>
                <input
                  type="date"
                  value={formData.gameDate}
                  onChange={(e) => handleInputChange('gameDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Game Duration (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.gameTime}
                  onChange={(e) => handleInputChange('gameTime', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${
                    errors.gameTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.gameTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.gameTime}</p>
                )}
              </div>
            </div>

            {/* Game Type */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Game Type
              </label>
              <select
                value={formData.gameType}
                onChange={(e) => handleInputChange('gameType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                disabled={isLoading}
              >
                <option value="ladder">Ladder Game</option>
                <option value="tournament">Tournament</option>
                <option value="friendly">Friendly</option>
                <option value="practice">Practice</option>
              </select>
            </div>

            {/* Event ID */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Event ID (optional)
              </label>
              <input
                type="text"
                value={formData.eventId}
                onChange={(e) => handleInputChange('eventId', e.target.value)}
                placeholder="Enter event ID if this game is part of a tournament"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                disabled={isLoading}
              />
            </div>

            {/* Opening */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Opening (optional)
              </label>
              <input
                type="text"
                value={formData.opening}
                onChange={(e) => handleInputChange('opening', e.target.value)}
                placeholder="e.g., Sicilian Defense, King's Gambit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                disabled={isLoading}
              />
            </div>

            {/* Endgame */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Endgame (optional)
              </label>
              <input
                type="text"
                value={formData.endgame}
                onChange={(e) => handleInputChange('endgame', e.target.value)}
                placeholder="e.g., King and Pawn, Rook and King"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about the game..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                disabled={isLoading}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
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
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Game'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
