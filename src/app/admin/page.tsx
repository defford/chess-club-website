"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, logout, refreshSession } from "@/lib/auth"
import { getMemberStats } from "@/lib/members"
import { Users, Calendar, Trophy, Settings, LogOut } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [memberStats, setMemberStats] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsLoading(false)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else {
        // Refresh session timestamp
        refreshSession()
        // Load member stats
        setMemberStats(getMemberStats())
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null // Will redirect to login
  }

  const adminCards = [
    {
      title: "Member Management",
      description: "View, add, edit, and manage club members",
      icon: Users,
      href: "/admin/members",
      count: `${memberStats?.total || 0} members`
    },
    {
      title: "Events",
      description: "Manage upcoming events and tournaments",
      icon: Calendar,
      href: "/admin/events",
      count: "Coming soon",
    },
    {
      title: "Rankings",
      description: "Update player rankings and ladder positions",
      icon: Trophy,
      href: "/admin/rankings",
      count: "Manage games",
    },
    {
      title: "Settings",
      description: "Configure club settings and preferences",
      icon: Settings,
      href: "/admin/settings",
      count: "Coming soon",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[--color-accent]">
              Admin Dashboard
            </h1>
            <p className="text-[--color-text-primary] mt-1">
              Central NL Scholastic Chess Club Administration
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Total Members
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">0</p>
              </div>
              <Users className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">
                  {memberStats?.active || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  Ranked Players
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">0</p>
              </div>
              <Trophy className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  This Month
                </p>
                <p className="text-2xl font-bold text-[--color-accent]">
                  {new Date().toLocaleDateString('en-US', { month: 'long' })}
                </p>
              </div>
              <Settings className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminCards.map((card) => {
            const IconComponent = card.icon
            return (
              <Link key={card.title} href={card.href}>
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[--color-primary]/10 rounded-lg">
                      <IconComponent className="h-6 w-6 text-[--color-primary]" />
                    </div>
                    <h3 className="font-semibold text-[--color-accent]">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[--color-text-primary] mb-3">
                    {card.description}
                  </p>
                  <p className="text-xs text-[--color-primary] font-medium">
                    {card.count}
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
