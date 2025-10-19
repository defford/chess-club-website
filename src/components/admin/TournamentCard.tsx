"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TournamentData } from "@/lib/types"
import { 
  Calendar, 
  Users, 
  Trophy, 
  Clock, 
  MoreVertical,
  Play,
  Pause,
  CheckCircle,
  XCircle
} from "lucide-react"

interface TournamentCardProps {
  tournament: TournamentData
  onDelete?: (tournamentId: string) => void
  onUpdate?: (tournamentId: string, updates: Partial<TournamentData>) => void
}

export default function TournamentCard({ tournament, onDelete, onUpdate }: TournamentCardProps) {
  const router = useRouter()
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50'
      case 'active': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-4 w-4" />
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleViewTournament = () => {
    router.push(`/admin/games/tournaments/${tournament.id}`)
  }

  const handleStartTournament = () => {
    if (onUpdate) {
      onUpdate(tournament.id, { status: 'active' })
    }
  }

  const handleCompleteTournament = () => {
    if (onUpdate) {
      onUpdate(tournament.id, { status: 'completed' })
    }
  }

  const handleCancelTournament = () => {
    if (onUpdate) {
      onUpdate(tournament.id, { status: 'cancelled' })
    }
  }

  const handleDeleteTournament = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      onDelete(tournament.id)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewTournament}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-[--color-accent]">
              {tournament.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {tournament.description || 'No description provided'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tournament.status)}`}>
              {getStatusIcon(tournament.status)}
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </span>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
                  <div className="py-1">
                    {tournament.status === 'upcoming' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartTournament()
                          setShowActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Start Tournament
                      </button>
                    )}
                    
                    {tournament.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteTournament()
                          setShowActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Complete Tournament
                      </button>
                    )}
                    
                    {(tournament.status === 'upcoming' || tournament.status === 'active') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelTournament()
                          setShowActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel Tournament
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTournament()
                        setShowActions(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                      Delete Tournament
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium">Start Date</div>
              <div className="text-gray-500">{formatDate(tournament.startDate)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium">Players</div>
              <div className="text-gray-500">{tournament.playerIds.length}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium">Rounds</div>
              <div className="text-gray-500">
                {tournament.currentRound} / {tournament.totalRounds}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium">Created</div>
              <div className="text-gray-500">{formatDate(tournament.createdAt)}</div>
            </div>
          </div>
        </div>
        
        {tournament.status === 'active' && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Round {tournament.currentRound} of {tournament.totalRounds}
              </span>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewTournament()
                }}
                className="bg-[--color-primary] hover:bg-[--color-primary]/90"
              >
                Manage Tournament
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
