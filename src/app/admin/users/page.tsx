"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { isAdminAuthenticated } from "@/lib/adminAuth"
import { ArrowLeft, Users, Shield, ShieldCheck, Mail, Search, AlertCircle } from "lucide-react"
import Link from "next/link"

interface ParentAccount {
  id: string
  email: string
  createdDate: string
  lastLogin: string
  isActive: boolean
  isSelfRegistered: boolean
  registrationType?: 'parent' | 'self'
  isAdmin: boolean
}

export default function AdminUsers() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [users, setUsers] = useState<ParentAccount[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ParentAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      const adminAuthenticated = isAdminAuthenticated()
      
      setIsAuth(authenticated)
      setIsLoading(false)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else if (!adminAuthenticated) {
        router.push("/parent/dashboard")
      } else {
        refreshSession()
        loadUsers()
      }
    }

    checkAuth()
  }, [router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get email from localStorage for admin auth
      const session = typeof window !== 'undefined' 
        ? localStorage.getItem('chess-club-parent-auth')
        : null
      
      const email = session ? JSON.parse(session).email : null
      
      if (!email) {
        setError('No email found in session')
        return
      }

      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have admin privileges')
        } else {
          throw new Error('Failed to fetch users')
        }
        return
      }
      
      const usersList = await response.json()
      setUsers(usersList)
      setFilteredUsers(usersList)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase()
      const filtered = users.filter((user) =>
        user.email.toLowerCase().includes(lowercaseQuery) ||
        user.id.toLowerCase().includes(lowercaseQuery)
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }

  const toggleAdminStatus = async (parentId: string, currentStatus: boolean) => {
    try {
      setUpdating(prev => new Set(prev).add(parentId))
      
      // Get email from localStorage for admin auth
      const session = typeof window !== 'undefined' 
        ? localStorage.getItem('chess-club-parent-auth')
        : null
      
      const email = session ? JSON.parse(session).email : null
      
      if (!email) {
        setError('No email found in session')
        return
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email,
        },
        body: JSON.stringify({
          parentId,
          isAdmin: !currentStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update admin status')
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === parentId ? { ...user, isAdmin: !currentStatus } : user
        )
      )
      setFilteredUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === parentId ? { ...user, isAdmin: !currentStatus } : user
        )
      )

      // Reload to ensure consistency
      await loadUsers()
    } catch (err: any) {
      console.error('Error updating admin status:', err)
      setError(err.message || 'Failed to update admin status')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(parentId)
        return newSet
      })
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  const adminCount = users.filter(u => u.isAdmin).length
  const totalCount = users.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[--color-accent]">
                Admin User Management
              </h1>
              <p className="text-[--color-text-primary] mt-1">
                Grant or revoke admin access to parent accounts
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-text-primary]">Total Users</p>
                <p className="text-2xl font-bold text-[--color-accent]">{totalCount}</p>
              </div>
              <Users className="h-8 w-8 text-[--color-primary]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-text-primary]">Admin Users</p>
                <p className="text-2xl font-bold text-green-600">{adminCount}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email or ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
            />
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {/* Users List */}
        <div className="space-y-1">
          {filteredUsers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[--color-accent] mb-2">
                {searchQuery ? "No users found" : "No users yet"}
              </h3>
              <p className="text-[--color-text-primary]">
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "No parent accounts found in the system"
                }
              </p>
            </Card>
          ) : (
            <div className="bg-white rounded-lg border">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    index === filteredUsers.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {user.isAdmin ? (
                          <ShieldCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[--color-accent]">
                              {user.email}
                            </span>
                            {user.isAdmin && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              ID: {user.id}
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.registrationType === 'self' ? 'Self-registered' : 'Parent'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                        disabled={updating.has(user.id)}
                        className={user.isAdmin 
                          ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
                          : "bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
                        }
                      >
                        {updating.has(user.id) ? (
                          "Updating..."
                        ) : user.isAdmin ? (
                          "Revoke Admin"
                        ) : (
                          "Grant Admin"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

