"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TournamentResultData } from "@/lib/types"
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"

interface StandingsTableProps {
  standings: TournamentResultData[]
  tournamentId: string
  onExport?: () => void
}

type SortField = 'rank' | 'playerName' | 'points' | 'buchholzScore' | 'gamesPlayed' | 'wins' | 'losses' | 'draws'
type SortDirection = 'asc' | 'desc'

export default function StandingsTable({ 
  standings, 
  tournamentId, 
  onExport 
}: StandingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-[--color-primary]" /> : 
      <ArrowDown className="h-4 w-4 text-[--color-primary]" />
  }

  const sortedStandings = [...standings].sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'rank':
        comparison = a.rank - b.rank
        break
      case 'playerName':
        comparison = a.playerName.localeCompare(b.playerName)
        break
      case 'points':
        comparison = a.points - b.points
        break
      case 'buchholzScore':
        comparison = a.buchholzScore - b.buchholzScore
        break
      case 'gamesPlayed':
        comparison = a.gamesPlayed - b.gamesPlayed
        break
      case 'wins':
        comparison = a.wins - b.wins
        break
      case 'losses':
        comparison = a.losses - b.losses
        break
      case 'draws':
        comparison = a.draws - b.draws
        break
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2: return <Medal className="h-5 w-5 text-gray-400" />
      case 3: return <Medal className="h-5 w-5 text-amber-600" />
      default: return <span className="text-sm font-medium text-gray-500">#{rank}</span>
    }
  }

  const getPointsColor = (points: number) => {
    if (points >= 8) return 'text-green-600 bg-green-50'
    if (points >= 6) return 'text-blue-600 bg-blue-50'
    if (points >= 4) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const exportStandings = () => {
    const csvContent = [
      ['Rank', 'Player Name', 'Games Played', 'Wins', 'Losses', 'Draws', 'Points', 'Buchholz Score'],
      ...sortedStandings.map(player => [
        player.rank,
        player.playerName,
        player.gamesPlayed,
        player.wins,
        player.losses,
        player.draws,
        player.points,
        player.buchholzScore
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tournament-${tournamentId}-standings.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[--color-primary]" />
              Tournament Standings
            </CardTitle>
            <CardDescription>
              Current rankings with Buchholz tiebreaker
            </CardDescription>
          </div>
          <Button
            onClick={exportStandings}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th 
                  className="text-left py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-2">
                    Rank
                    {getSortIcon('rank')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('playerName')}
                >
                  <div className="flex items-center gap-2">
                    Player
                    {getSortIcon('playerName')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('gamesPlayed')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Played
                    {getSortIcon('gamesPlayed')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('wins')}
                >
                  <div className="flex items-center justify-center gap-2">
                    W
                    {getSortIcon('wins')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('losses')}
                >
                  <div className="flex items-center justify-center gap-2">
                    L
                    {getSortIcon('losses')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('draws')}
                >
                  <div className="flex items-center justify-center gap-2">
                    D
                    {getSortIcon('draws')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('points')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Points
                    {getSortIcon('points')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-medium text-[--color-text-primary] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('buchholzScore')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Buchholz
                    {getSortIcon('buchholzScore')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((player, index) => (
                <tr 
                  key={player.playerId} 
                  className={`border-b hover:bg-gray-50 ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(player.rank)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[--color-text-primary]">
                      {player.playerName}
                    </div>
                    {player.byeRounds.length > 0 && (
                      <div className="text-xs text-orange-600">
                        Byes: Rounds {player.byeRounds.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-[--color-text-primary]">
                    {player.gamesPlayed}
                  </td>
                  <td className="py-3 px-4 text-center text-[--color-text-primary]">
                    <span className="text-green-600 font-medium">{player.wins}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-[--color-text-primary]">
                    <span className="text-red-600 font-medium">{player.losses}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-[--color-text-primary]">
                    <span className="text-yellow-600 font-medium">{player.draws}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getPointsColor(player.points)}`}>
                      {player.points}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-[--color-text-primary]">
                    <span className="text-sm font-mono">{player.buchholzScore.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {standings.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No standings available yet</p>
            <p className="text-sm text-gray-500">Standings will appear after the first round</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
