"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, ChevronUp, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import type { PlayerData } from "@/lib/googleSheets"

type SortField = "rank" | "name" | "grade" | "wins" | "losses" | "points"
type SortDirection = "asc" | "desc"

interface RankingsPageClientProps {
  initialPlayers?: PlayerData[];
}

export function RankingsPageClient({ initialPlayers = [] }: RankingsPageClientProps) {
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>(initialPlayers)
  const [loading, setLoading] = useState(initialPlayers.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (initialPlayers.length > 0) {
      return;
    }

    const fetchPlayers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rankings')
        if (!response.ok) {
          throw new Error('Failed to fetch rankings')
        }
        const players = await response.json()
        setAllPlayers(players)
        setError(null)
      } catch (err) {
        console.error('Error fetching rankings:', err)
        setError('Failed to load rankings')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [initialPlayers.length])

  const grades = ["all", "K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedPlayers = [...allPlayers]
    .filter(player => player.points > 0) // Only show players with more than 0 points
    .filter(player => !player.id?.startsWith('unknown_')) // Filter out system players
    .filter(player => selectedGrade === "all" || player.grade === selectedGrade)
    .sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === "name") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const getBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white"
      case 2:
        return "bg-gray-400 text-white"
      case 3:
        return "bg-orange-600 text-white"
      default:
        return "bg-[--color-neutral-light] text-[--color-text-primary]"
    }
  }

  const getBadgeIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className="h-3 w-3" />
    }
    return rank
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:text-[--color-primary] transition-colors"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === "asc" ? 
          <ChevronUp className="h-4 w-4" /> : 
          <ChevronDown className="h-4 w-4" />
      )}
    </button>
  )

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
            Club Rankings
          </h1>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Current ladder standings for all club members. Rankings are updated after each game and tournament.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">♟️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Loading rankings...
            </h3>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading rankings
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-[--color-primary] mb-1">
                  {allPlayers.length}
                </div>
                <div className="text-sm text-[--color-text-secondary]">Active Players</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-[--color-primary] mb-1">
                  {allPlayers.reduce((sum, player) => sum + player.wins + player.losses, 0)}
                </div>
                <div className="text-sm text-[--color-text-secondary]">Games Played</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-[--color-primary] mb-1">
                  K-12
                </div>
                <div className="text-sm text-[--color-text-secondary]">Grade Levels</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-[--color-primary] mb-1">
                  Live
                </div>
                <div className="text-sm text-[--color-text-secondary]">Updated</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grade Filter */}
        {!loading && !error && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
              Filter by Grade:
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
            >
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === "all" ? "All Grades" : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rankings Table */}
        {!loading && !error && (
          <Card>
          <CardHeader>
            <CardTitle>Current Ladder Standings</CardTitle>
            <CardDescription>
              Click column headers to sort. Points are calculated as: 1 point for playing + 1 point for winning (0.5 each for draw).
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[--color-neutral-light] border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="rank">Rank</SortButton>
                    </th>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="name">Player</SortButton>
                    </th>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="grade">Grade</SortButton>
                    </th>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="wins">Wins</SortButton>
                    </th>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="losses">Losses</SortButton>
                    </th>
                    <th className="text-left p-4 font-medium text-[--color-text-primary]">
                      <SortButton field="points">Points</SortButton>
                    </th>
                  </tr>
                </thead>
                
                <tbody className="divide-y">
                  {sortedPlayers.map((player, index) => (
                    <tr key={player.rank} className="hover:bg-[--color-neutral-light]/50 transition-colors">
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${getBadgeColor(player.rank || 0)}`}
                        >
                          {getBadgeIcon(player.rank || 0)}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[--color-text-primary]">
                        <div className="flex items-center gap-2">
                          <span>{player.name}</span>
                          {player.eloRating !== undefined && (
                            <span className="text-sm font-normal text-[--color-text-secondary]">
                              ({player.eloRating})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[--color-text-secondary]">
                        {player.grade}
                      </td>
                      <td className="p-4 font-medium text-green-600">
                        {player.wins}
                      </td>
                      <td className="p-4 font-medium text-red-600">
                        {player.losses}
                      </td>
                      <td className="p-4 font-medium text-[--color-primary]">
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No players found */}
        {!loading && !error && sortedPlayers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl text-[--color-text-secondary] mb-4">🏆</div>
            <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-2">
              No players found
            </h3>
            <p className="text-[--color-text-secondary]">
              Try selecting a different grade or check back later for rankings.
            </p>
          </div>
        )}

        {/* Call to Action */}
        {!loading && !error && (
          <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="font-heading font-semibold text-xl text-[--color-text-primary] mb-4">
                Want to Join the Ladder?
              </h3>
              <p className="text-[--color-text-secondary] mb-6">
                Register for the club and start playing to earn your place on the ladder. All skill levels welcome!
              </p>
              <Button variant="outline" size="lg">
                Register Now
              </Button>
            </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
