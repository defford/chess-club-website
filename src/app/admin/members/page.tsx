"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import { 
  getMembers, 
  saveMember, 
  updateMember, 
  deleteMember, 
  searchMembers,
  getMemberStats,
  type Member 
} from "@/lib/members"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Users,
  Mail,
  Phone,
  Calendar,
  GraduationCap
} from "lucide-react"
import Link from "next/link"

export default function MemberManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [stats, setStats] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsLoading(false)
      
      if (!authenticated) {
        router.push("/admin/login")
      } else {
        refreshSession()
        loadMembers()
      }
    }

    checkAuth()
  }, [router])

  const loadMembers = () => {
    const memberList = getMembers()
    setMembers(memberList)
    setStats(getMemberStats())
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setMembers(searchMembers(query))
    } else {
      setMembers(getMembers())
    }
  }

  const handleAddMember = (memberData: Omit<Member, "id" | "joinDate">) => {
    saveMember(memberData)
    loadMembers()
    setShowAddForm(false)
  }

  const handleUpdateMember = (id: string, updates: Partial<Member>) => {
    updateMember(id, updates)
    loadMembers()
    setEditingMember(null)
  }

  const handleDeleteMember = (id: string) => {
    if (confirm("Are you sure you want to delete this member?")) {
      deleteMember(id)
      loadMembers()
    }
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
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Back button and title */}
          <div className="flex flex-col gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit hover:bg-black hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[--color-accent]">
                Member Management
              </h1>
              <p className="text-[--color-text-primary] mt-1">
                Manage club member information and records
              </p>
            </div>
          </div>
          
          {/* Add Member Button - Always visible */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-black text-white"
            >
              <Plus className="h-4 w-4 text-white" />
              Add New Member
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Total Members</p>
                  <p className="text-2xl font-bold text-[--color-accent]">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-[--color-primary]" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Inactive</p>
                  <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
                </div>
                <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">This Month</p>
                  <p className="text-lg font-bold text-[--color-accent]">
                    {new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-[--color-primary]" />
              </div>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, parent, email, or grade..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
            />
          </div>
        </Card>

        {/* Members List */}
        <div className="space-y-4">
          {members.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[--color-accent] mb-2">
                {searchQuery ? "No members found" : "No members yet"}
              </h3>
              <p className="text-[--color-text-primary] mb-4">
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "Start by adding your first club member"
                }
              </p>
              {!searchQuery && (
                <Button className="bg-black text-white" onClick={() => setShowAddForm(true)}>
                  Add First Member
                </Button>
              )}
            </Card>
          ) : (
            members.map((member) => (
              <Card key={member.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-[--color-accent]">
                        {member.childName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Grade {member.grade}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-[--color-text-primary]">{member.parentName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-[--color-text-primary]">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-[--color-text-primary]">{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-[--color-text-primary]">
                          Joined {new Date(member.joinDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMember(member)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id)}
                      className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Member Modal */}
      {(showAddForm || editingMember) && (
        <MemberForm
          member={editingMember}
          onSave={editingMember ? 
            (data) => handleUpdateMember(editingMember.id, data) : 
            handleAddMember
          }
          onCancel={() => {
            setShowAddForm(false)
            setEditingMember(null)
          }}
        />
      )}
    </div>
  )
}

// Member Form Component
interface MemberFormProps {
  member?: Member | null
  onSave: (data: any) => void
  onCancel: () => void
}

function MemberForm({ member, onSave, onCancel }: MemberFormProps) {
  const [formData, setFormData] = useState({
    childName: member?.childName || "",
    parentName: member?.parentName || "",
    email: member?.email || "",
    phone: member?.phone || "",
    grade: member?.grade || "",
    age: member?.age || 6,
    isActive: member?.isActive ?? true,
    notes: member?.notes || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[--color-accent] mb-6">
            {member ? "Edit Member" : "Add New Member"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Child's Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Parent/Guardian Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Grade *
                </label>
                <select
                  required
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                >
                  <option value="">Select Grade</option>
                  <option value="K">Kindergarten</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Grade {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min="5"
                  max="18"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-[--color-primary] focus:ring-[--color-primary]"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-[--color-text-primary]">
                Active Member
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[--color-text-primary] mb-2">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                placeholder="Any additional notes about the member..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button className="border-white hover:border-black hover:text-black" type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="bg-black text-white hover:bg-white hover:text-black hover:border-black hover:border-2" type="submit">
                {member ? "Update Member" : "Add Member"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
