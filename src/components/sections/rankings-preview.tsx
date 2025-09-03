import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trophy } from "lucide-react"

// Mock data - in a real app this would come from a database or API
const topPlayers = [
  { rank: 1, name: "Emily Chen", grade: "8th", wins: 15, losses: 2 },
  { rank: 2, name: "Marcus Johnson", grade: "7th", wins: 13, losses: 4 },
  { rank: 3, name: "Sofia Rodriguez", grade: "9th", wins: 12, losses: 3 },
  { rank: 4, name: "Alex Thompson", grade: "6th", wins: 11, losses: 5 },
  { rank: 5, name: "Jordan Lee", grade: "8th", wins: 10, losses: 4 },
  { rank: 6, name: "Maya Patel", grade: "7th", wins: 9, losses: 6 },
  { rank: 7, name: "Ryan O'Connor", grade: "9th", wins: 8, losses: 5 },
  { rank: 8, name: "Zoe Williams", grade: "6th", wins: 8, losses: 7 }
]

export function RankingsPreview() {
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
              {topPlayers.map((player) => (
                <div key={player.rank} className="px-6 py-4 hover:bg-[--color-neutral-light]/50 transition-colors">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${getBadgeColor(player.rank)}`}
                      >
                        {getBadgeIcon(player.rank)}
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
              ))}
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
