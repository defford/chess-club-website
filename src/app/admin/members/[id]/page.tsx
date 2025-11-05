"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import type { MemberData } from "@/app/api/members/route"
import type { GameData, PlayerGameStats, Achievement, AchievementType } from "@/lib/types"
import { AchievementService } from "@/lib/achievements"
import { 
  ArrowLeft, 
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Medal,
  CheckCircle,
  XCircle,
  Gamepad2
} from "lucide-react"
import Link from "next/link"

interface PlayerStatsData {
  member: MemberData;
  gameStats: PlayerGameStats;
  achievements: Achievement[];
  allAchievements: Array<{
    type: AchievementType;
    title: string;
    description: string;
    achieved: boolean;
    earnedAt?: string;
  }>;
}

export default function PlayerStatsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [playerData, setPlayerData] = useState<PlayerStatsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const playerId = params.id as string

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else {
        refreshSession()
        loadPlayerData()
      }
    }

    checkAuth()
  }, [router, playerId])

  const loadPlayerData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch member data
      const membersResponse = await fetch('/api/members')
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch members')
      }
      const members: MemberData[] = await membersResponse.json()
      const member = members.find(m => m.id === playerId)
      
      if (!member) {
        throw new Error('Player not found')
      }

      // Fetch games for this player
      const gamesResponse = await fetch(`/api/games?playerId=${playerId}`)
      if (!gamesResponse.ok) {
        throw new Error('Failed to fetch games')
      }
      const games: GameData[] = await gamesResponse.json()

      // Fetch all games and players for achievement calculation
      const allGamesResponse = await fetch('/api/games')
      if (!allGamesResponse.ok) {
        throw new Error('Failed to fetch all games')
      }
      const allGames: GameData[] = await allGamesResponse.json()

      // Fetch rankings to get all players data
      const rankingsResponse = await fetch('/api/rankings')
      if (!rankingsResponse.ok) {
        throw new Error('Failed to fetch rankings')
      }
      const allPlayers = await rankingsResponse.json()

      // Calculate game statistics
      const gameStats = calculatePlayerStats(member, games)

      // Get all possible achievements and check which ones are achieved using AchievementService
      const allAchievements = getAllPossibleAchievements()
      const achievedAchievements = await AchievementService.getPlayerAchievements(playerId, allGames, allPlayers)
      
      const achievementsWithStatus = allAchievements.map(achievement => {
        const achieved = achievedAchievements.find(a => a.type === achievement.type)
        return {
          ...achievement,
          achieved: !!achieved,
          earnedAt: achieved?.earnedAt
        }
      })

      setPlayerData({
        member,
        gameStats,
        achievements: achievedAchievements,
        allAchievements: achievementsWithStatus
      })
    } catch (err) {
      console.error('Error loading player data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load player data')
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePlayerStats = (member: MemberData, games: GameData[]): PlayerGameStats => {
    const playerGames = games.filter(g => 
      g.player1Id === member.id || g.player2Id === member.id
    )

    const wins = playerGames.filter(g => 
      (g.player1Id === member.id && g.result === 'player1') ||
      (g.player2Id === member.id && g.result === 'player2')
    ).length

    const losses = playerGames.filter(g => 
      (g.player1Id === member.id && g.result === 'player2') ||
      (g.player2Id === member.id && g.result === 'player1')
    ).length

    const draws = playerGames.filter(g => g.result === 'draw').length

    const winRate = playerGames.length > 0 ? Math.round((wins / playerGames.length) * 100) : 0

    // Calculate current streak
    const recentGames = playerGames
      .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
      .slice(0, 10)

    let currentStreak: { type: 'none' | 'win' | 'loss' | 'draw', count: number } = { type: 'none', count: 0 }
    if (recentGames.length > 0) {
      const lastResult = recentGames[0].result
      if (lastResult === 'draw') {
        currentStreak = { type: 'draw', count: 1 }
      } else {
        const playerWon = (recentGames[0].player1Id === member.id && lastResult === 'player1') ||
                         (recentGames[0].player2Id === member.id && lastResult === 'player2')
        currentStreak = { type: playerWon ? 'win' : 'loss', count: 1 }
        
        for (let i = 1; i < recentGames.length; i++) {
          const gameResult = recentGames[i].result
          const gameWon = (recentGames[i].player1Id === member.id && gameResult === 'player1') ||
                         (recentGames[i].player2Id === member.id && gameResult === 'player2')
          
          if ((currentStreak.type === 'win' && gameWon) || 
              (currentStreak.type === 'loss' && !gameWon && gameResult !== 'draw')) {
            currentStreak.count++
          } else {
            break
          }
        }
      }
    }

    return {
      playerId: member.id || '',
      playerName: member.playerName,
      totalGames: playerGames.length,
      wins,
      losses,
      draws,
      winRate,
      currentStreak,
      bestStreak: { type: 'win' as const, count: 0 }, // TODO: Calculate from all games
      recentGames: recentGames.slice(0, 5),
      monthlyStats: [] // Empty array to satisfy type requirement
    }
  }

  const getAllPossibleAchievements = () => {
    const achievementTypes: AchievementType[] = [
      'first_win', 'win_streak_3', 'win_streak_5', 'win_streak_10',
      'games_played_10', 'games_played_25', 'games_played_50',
      'perfect_week', 'comeback_king', 'giant_slayer', 'draw_master',
      'first_draw', 'undefeated_month'
    ]

    return achievementTypes.map(type => {
      const definition = AchievementService.getAchievementDefinition(type)
      return {
        type,
        title: definition.title,
        description: definition.description
      }
    })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading player statistics...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <Link href="/admin/members">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Members
              </Button>
            </Link>
          </div>
          <Card className="p-8 text-center">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading player data
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadPlayerData} variant="outline">Try Again</Button>
          </Card>
        </div>
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <Link href="/admin/members">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Members
              </Button>
            </Link>
          </div>
          <Card className="p-8 text-center">
            <div className="text-6xl text-[--color-text-secondary] mb-4">❓</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Player not found
            </h3>
            <p className="text-[--color-text-secondary] mb-4">The requested player could not be found.</p>
          </Card>
        </div>
      </div>
    )
  }

  const { member, gameStats, allAchievements } = playerData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <Link href="/admin/members">
            <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[--color-accent]">
              {member.playerName} - Player Statistics
            </h1>
            <p className="text-[--color-text-primary] mt-1">
              Grade {member.playerGrade} • Age {member.playerAge}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-text-primary]">Total Games</p>
                <p className="text-2xl font-bold text-[--color-accent]">{gameStats.totalGames}</p>
              </div>
              <Gamepad2 className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-text-primary]">Win Rate</p>
                <p className="text-2xl font-bold text-green-600">{gameStats.winRate}%</p>
                <p className="text-xs text-gray-500">{gameStats.wins}W / {gameStats.losses}L / {gameStats.draws}D</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-text-primary]">Current Streak</p>
                <p className="text-2xl font-bold text-blue-600">
                  {gameStats.currentStreak.count}
                  {gameStats.currentStreak.type === 'win' ? 'W' : 
                   gameStats.currentStreak.type === 'loss' ? 'L' : 
                   gameStats.currentStreak.type === 'draw' ? 'D' : ''}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Games */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-[--color-accent] flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Games
              </h3>
              <Link href={`/admin/games?playerId=${playerId}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-black hover:text-white">
                  <Gamepad2 className="h-4 w-4" />
                  View All Games
                </Button>
              </Link>
            </div>
            {gameStats.recentGames.length > 0 ? (
              <div className="space-y-3">
                {gameStats.recentGames.map((game, index) => {
                  const isPlayer1 = game.player1Id === member.id
                  const opponentName = isPlayer1 ? game.player2Name : game.player1Name
                  const result = isPlayer1 ? game.result : 
                                game.result === 'player1' ? 'player2' : 
                                game.result === 'player2' ? 'player1' : 'draw'
                  
                  return (
                    <div key={game.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-[--color-text-primary]">vs {opponentName}</p>
                        <p className="text-sm text-[--color-text-secondary]">
                          {new Date(game.gameDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result === 'player1' ? 'bg-green-100 text-green-800' :
                        result === 'player2' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result === 'player1' ? 'W' : result === 'player2' ? 'L' : 'D'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[--color-text-secondary] text-center py-4">No games played yet</p>
            )}
          </Card>

          {/* Achievements */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg text-[--color-accent] mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allAchievements.map((achievement, index) => (
                <div 
                  key={achievement.type} 
                  className={`flex items-center gap-3 p-3 rounded-md border ${
                    achievement.achieved 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    achievement.achieved ? 'text-yellow-600' : 'text-gray-400'
                  }`}>
                    {achievement.achieved ? (
                      <Award className="h-5 w-5" />
                    ) : (
                      <Medal className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      achievement.achieved ? 'text-[--color-text-primary]' : 'text-gray-500'
                    }`}>
                      {achievement.title}
                    </p>
                    <p className={`text-sm ${
                      achievement.achieved ? 'text-[--color-text-secondary]' : 'text-gray-400'
                    }`}>
                      {achievement.description}
                    </p>
                    {achievement.earnedAt && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {achievement.achieved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
