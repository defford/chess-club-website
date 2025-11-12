"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import type { MemberData } from "@/app/api/members/route"
import QuickAddStudentForm from "@/components/admin/QuickAddStudentForm"
import EditMemberForm from "@/components/admin/EditMemberForm"
import { 
  Search, 
  ArrowLeft, 
  Users,
  Mail,
  Phone,
  Shield,
  Heart,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Plus,
  Info,
  BarChart3,
  Edit,
  Merge
} from "lucide-react"
import Link from "next/link"

export default function MemberManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [members, setMembers] = useState<MemberData[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const [showQuickAddForm, setShowQuickAddForm] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberData | null>(null)
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

  const loadMembers = async (bypassCache = false) => {
    try {
      setLoading(true)
      // Add cache-busting parameter to bypass HTTP cache when needed
      const url = bypassCache 
        ? `/api/members?nocache=${Date.now()}`
        : '/api/members'
      const response = await fetch(url, {
        cache: bypassCache ? 'no-store' : 'default'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      const membersList = await response.json()
      setMembers(membersList)
      setFilteredMembers(membersList.filter((member: any) => !member.isSystemPlayer)) // Filter out system players
      setError(null)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase()
      const filtered = members
        .filter((member: any) => !member.isSystemPlayer) // Filter out system players
        .filter((member: any) =>
          member.playerName.toLowerCase().includes(lowercaseQuery) ||
          member.parentName.toLowerCase().includes(lowercaseQuery) ||
          member.parentEmail.toLowerCase().includes(lowercaseQuery) ||
          member.playerGrade.toLowerCase().includes(lowercaseQuery)
        )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(members.filter((member: any) => !member.isSystemPlayer)) // Filter out system players
    }
  }

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  // Calculate enhanced stats from loaded members
  const getMemberStats = () => {
    const fullyConsented = members.filter(m => m.consent && m.valuesAcknowledgment)
    const hasEmergencyInfo = members.filter(m => m.emergencyContact && m.emergencyPhone)
    const interestedInProvincial = members.filter(m => m.provincialInterest?.toLowerCase() === 'yes')
    const willingToVolunteer = members.filter(m => m.volunteerInterest?.toLowerCase() === 'yes')
    const photoConsent = members.filter(m => m.photoConsent)
    const subscribedToNewsletter = members.filter(m => m.newsletter)
    const hasMedicalInfo = members.filter(m => m.medicalInfo && m.medicalInfo.trim() !== '')
    
    const gradeDistribution = members.reduce((acc, member) => {
      const grade = member.playerGrade || 'Unknown'
      acc[grade] = (acc[grade] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      total: members.length,
      fullyConsented: fullyConsented.length,
      hasEmergencyInfo: hasEmergencyInfo.length,
      interestedInProvincial: interestedInProvincial.length,
      willingToVolunteer: willingToVolunteer.length,
      subscribedToNewsletter: subscribedToNewsletter.length,
      hasMedicalInfo: hasMedicalInfo.length,
      photoConsent: photoConsent.length,
      gradeDistribution,
      // Calculate completion percentage
      completionRate: Math.round((fullyConsented.length / members.length) * 100) || 0,
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary] mx-auto"></div>
          <p className="mt-2 text-[--color-text-primary]">Loading members...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  // Get current stats
  const stats = getMemberStats()


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
                View registered members from the registration system
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Link href="/admin/members/missing-players">
              <Button
                className="flex items-center gap-2 bg-[--color-primary] text-black hover:bg-black hover:text-white"
                variant="outline"
              >
                <AlertTriangle className="h-4 w-4" />
                Missing Players
              </Button>
            </Link>
            <Link href="/admin/members/merge">
              <Button
                className="flex items-center gap-2 bg-[--color-primary] text-black hover:bg-black hover:text-white"
                variant="outline"
              >
                <Merge className="h-4 w-4" />
                Merge Players
              </Button>
            </Link>
            <Button
              onClick={() => setShowQuickAddForm(true)}
              className="flex items-center gap-2 bg-[--color-primary] text-black hover:bg-black hover:text-white"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Quick Add Student
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Total Registrations</p>
                  <p className="text-2xl font-bold text-[--color-accent]">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-[--color-primary]" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Fully Consented</p>
                  <p className="text-2xl font-bold text-green-600">{stats.fullyConsented}</p>
                  <p className="text-xs text-gray-500">{stats.completionRate}% complete</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Emergency Info</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.hasEmergencyInfo}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round((stats.hasEmergencyInfo / stats.total) * 100)}% provided
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Medical Alerts</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.hasMedicalInfo}</p>
                  <p className="text-xs text-gray-500">require attention</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Provincial Interest</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.interestedInProvincial}</p>
                  <p className="text-xs text-gray-500">want to compete</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Volunteers</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.willingToVolunteer}</p>
                  <p className="text-xs text-gray-500">willing to help</p>
                </div>
                <Heart className="h-8 w-8 text-indigo-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Newsletter</p>
                  <p className="text-2xl font-bold text-teal-600">{stats.subscribedToNewsletter}</p>
                  <p className="text-xs text-gray-500">subscribed</p>
                </div>
                <Mail className="h-8 w-8 text-teal-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-primary]">Updated</p>
                  <p className="text-lg font-bold text-[--color-accent]">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">last refresh</p>
                </div>
                <Clock className="h-8 w-8 text-[--color-primary]" />
              </div>
            </Card>
          </div>
        )} */}

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

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading members
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadMembers} variant="outline">Try Again</Button>
          </Card>
        )}

        {/* Members List */}
        <div className="space-y-1">
          {!error && filteredMembers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[--color-accent] mb-2">
                {searchQuery ? "No members found" : "No members yet"}
              </h3>
              <p className="text-[--color-text-primary] mb-4">
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "No registrations found in the system"
                }
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              {filteredMembers.map((member, index) => {
                const registrationDate = member.joinDate ? new Date(member.joinDate) : null;
                const hasConsent = member.consent && member.valuesAcknowledgment;
                const hasEmergencyInfo = member.emergencyContact && member.emergencyPhone;
                const isExpanded = expandedMembers.has(member.id || '');
                
                return (
                  <div key={member.id}>
                    {/* List Item - Always Visible */}
                    <div 
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index === filteredMembers.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-[--color-accent]">
                            {member.playerName}
                          </span>
                          <span className="text-sm text-gray-600">
                            Age {member.playerAge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMemberExpansion(member.id || '')
                            }}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Info className="h-3 w-3" />
                            Info
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingMember(member)
                            }}
                            className="flex items-center gap-1 text-xs hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Link href={`/admin/members/${member.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-xs hover:bg-black hover:text-white"
                            >
                              <BarChart3 className="h-3 w-3" />
                              Stats
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Only visible when expanded */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-200">
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Primary Contact Information */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-[--color-accent] flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Parent/Guardian Information
                              </h4>
                              <div className="space-y-3 pl-6">
                                <div className="flex items-center gap-3">
                                  <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-[--color-text-primary]">{member.parentName}</p>
                                    <p className="text-xs text-[--color-text-secondary]">Parent/Guardian</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-[--color-text-primary]">{member.parentEmail}</p>
                                    <p className="text-xs text-[--color-text-secondary]">Primary Email</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-[--color-text-primary]">{member.parentPhone}</p>
                                    <p className="text-xs text-[--color-text-secondary]">Primary Phone</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Emergency Contact Information */}
                            <div className="space-y-4">
                              <h4 className={`font-semibold flex items-center gap-2 ${
                                hasEmergencyInfo ? 'text-[--color-accent]' : 'text-gray-400'
                              }`}>
                                <Shield className="h-4 w-4" />
                                Emergency Contact
                                {!hasEmergencyInfo && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                    Missing Info
                                  </span>
                                )}
                              </h4>
                              <div className="space-y-3 pl-6">
                                <div className="flex items-center gap-3">
                                  <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className={`font-medium ${
                                      member.emergencyContact ? 'text-[--color-text-primary]' : 'text-gray-400'
                                    }`}>
                                      {member.emergencyContact || 'Not provided'}
                                    </p>
                                    <p className="text-xs text-[--color-text-secondary]">Emergency Contact</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className={`${
                                      member.emergencyPhone ? 'text-[--color-text-primary]' : 'text-gray-400'
                                    }`}>
                                      {member.emergencyPhone || 'Not provided'}
                                    </p>
                                    <p className="text-xs text-[--color-text-secondary]">Emergency Phone</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Additional Information */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                            {/* Interests & Preferences */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-[--color-accent] flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                Interests & Preferences
                              </h4>
                              <div className="space-y-2 pl-6">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-[--color-text-secondary]">Provincial Competitions:</span>
                                  <span className={`text-sm font-medium ${
                                    member.provincialInterest?.toLowerCase() === 'yes' 
                                      ? 'text-green-600' 
                                      : member.provincialInterest?.toLowerCase() === 'no'
                                      ? 'text-gray-500'
                                      : 'text-yellow-600'
                                  }`}>
                                    {member.provincialInterest || 'Not specified'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-[--color-text-secondary]">Volunteer Interest:</span>
                                  <span className={`text-sm font-medium ${
                                    member.volunteerInterest?.toLowerCase() === 'yes' 
                                      ? 'text-green-600' 
                                      : member.volunteerInterest?.toLowerCase() === 'no'
                                      ? 'text-gray-500'
                                      : 'text-yellow-600'
                                  }`}>
                                    {member.volunteerInterest || 'Not specified'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-[--color-text-secondary]">Newsletter:</span>
                                  <span className={`text-sm font-medium ${
                                    member.newsletter ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    {member.newsletter ? 'Subscribed' : 'Not subscribed'}
                                  </span>
                                </div>
                                {member.hearAboutUs && (
                                  <div className="pt-2">
                                    <p className="text-xs text-[--color-text-secondary] mb-1">How they heard about us:</p>
                                    <p className="text-sm text-[--color-text-primary]">{member.hearAboutUs}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Medical & Consent Information */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-[--color-accent] flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Medical & Consent
                              </h4>
                              <div className="space-y-3 pl-6">
                                {member.medicalInfo && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                    <p className="text-xs text-yellow-700 font-medium mb-1 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Medical Information:
                                    </p>
                                    <p className="text-sm text-yellow-800">{member.medicalInfo}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-[--color-text-secondary]">General Consent:</span>
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                      member.consent ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {member.consent ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {member.consent ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-[--color-text-secondary]">Photo Consent:</span>
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                      member.photoConsent ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {member.photoConsent ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {member.photoConsent ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-[--color-text-secondary]">Values Acknowledgment:</span>
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                      member.valuesAcknowledgment ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {member.valuesAcknowledgment ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {member.valuesAcknowledgment ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Quick Add Student Form Modal */}
      {showQuickAddForm && (
        <QuickAddStudentForm
          onSuccess={() => {
            setShowQuickAddForm(false);
            // Bypass cache to ensure we get the newly added student
            loadMembers(true); // Refresh the members list with cache bypass
          }}
          onCancel={() => setShowQuickAddForm(false)}
        />
      )}

      {/* Edit Member Form Modal */}
      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onSuccess={() => {
            setEditingMember(null);
            // Bypass cache to ensure we get the updated member data
            loadMembers(true); // Refresh the members list with cache bypass
          }}
          onCancel={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}
