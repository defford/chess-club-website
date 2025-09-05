"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { useState, useEffect } from "react"
import type { PlayerData } from "@/lib/googleSheets"

export function RankingsPreview() {
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rankings')
        if (response.ok) {
          const playersData = await response.json()
          // Filter players with points > 0 and take top 8
          const filteredPlayers = playersData
            .filter((player: PlayerData) => player.points > 0)
            .slice(0, 8)
          setPlayers(filteredPlayers)
        }
      } catch (error) {
        console.error('Error loading players:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

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

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[--color-accent] mb-4">
            Current Club Ladder
          </h2>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            See how our members are performing in our ongoing ladder competition. Rankings are updated after each game.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-[--color-neutral-light] px-6 py-3 border-b">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-[--color-text-primary]">
                <div>Rank</div>
                <div>Player</div>
                <div>Grade</div>
                <div>Wins</div>
                <div>Losses</div>
              </div>
            </div>
            
            <div className="divide-y">
              {loading ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-2xl text-[--color-text-secondary] mb-2">♟️</div>
                  <p className="text-[--color-text-secondary]">Loading rankings...</p>
                </div>
              ) : players.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-2xl text-[--color-text-secondary] mb-2">🏆</div>
                  <p className="text-[--color-text-secondary]">No active players yet</p>
                </div>
              ) : (
                players.map((player) => (
                  <div key={player.rank} className="px-6 py-4 hover:bg-[--color-neutral-light]/50 transition-colors">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${getBadgeColor(player.rank || 0)}`}
                        >
                          {getBadgeIcon(player.rank || 0)}
                        </span>
                      </div>
                      <div className="font-medium text-[--color-text-primary]">
                        {player.name}
                      </div>
                      <div className="text-[--color-text-secondary]">
                        {player.grade}
                      </div>
                      <div className="font-medium text-green-600">
                        {player.wins}
                      </div>
                      <div className="font-medium text-red-600">
                        {player.losses}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/rankings">
              <Button variant="outline" size="lg">
                View Full Rankings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
