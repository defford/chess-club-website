"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { TournamentPairing } from "@/lib/types"
import { Trophy, User, UserCheck } from "lucide-react"

interface PairingEntryProps {
  pairing: TournamentPairing
  onResultChange: (pairingId: string, result: string) => void
  isSubmitted?: boolean
}

export default function PairingEntry({ 
  pairing, 
  onResultChange, 
  isSubmitted = false 
}: PairingEntryProps) {
  const [selectedResult, setSelectedResult] = useState(pairing.result || '')

  const handleResultChange = (result: string) => {
    setSelectedResult(result)
    onResultChange(pairing.id, result)
  }

  const getResultOptions = () => [
    { value: '', label: 'Select result...' },
    { value: 'player1', label: `${pairing.player1Name} wins` },
    { value: 'player2', label: `${pairing.player2Name} wins` },
    { value: 'draw', label: 'Draw' },
    { value: 'half-bye-p1', label: `${pairing.player1Name} half-bye (absent)` },
    { value: 'half-bye-p2', label: `${pairing.player2Name} half-bye (absent)` }
  ]

  const getResultColor = (result: string) => {
    switch (result) {
      case 'player1': return 'text-green-600 bg-green-50'
      case 'player2': return 'text-green-600 bg-green-50'
      case 'draw': return 'text-yellow-600 bg-yellow-50'
      case 'half-bye-p1':
      case 'half-bye-p2': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Players */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-[--color-text-primary]">
                {pairing.player1Name}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-400">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">vs</span>
              <Trophy className="h-4 w-4" />
            </div>
            
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-[--color-text-primary]">
                {pairing.player2Name}
              </span>
            </div>
          </div>

          {/* Result Selection */}
          <div className="flex items-center gap-3">
            <select
              value={selectedResult}
              onChange={(e) => handleResultChange(e.target.value)}
              disabled={isSubmitted}
              className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] text-sm min-w-48 ${
                isSubmitted ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
            >
              {getResultOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {selectedResult && (
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(selectedResult)}`}>
                {getResultOptions().find(opt => opt.value === selectedResult)?.label}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
