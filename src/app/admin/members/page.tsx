"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { isAuthenticated, refreshSession } from "@/lib/auth"
import type { MemberData } from "@/app/api/members/route"
import { 
  Search, 
  ArrowLeft, 
  Users,
  Mail,
  Phone,
  Calendar,
  Shield,
  Heart,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Eye
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
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
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

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/members')
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      const membersList = await response.json()
      setMembers(membersList)
      setFilteredMembers(membersList)
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
      const filtered = members.filter(member =>
        member.playerName.toLowerCase().includes(lowercaseQuery) ||
        member.parentName.toLowerCase().includes(lowercaseQuery) ||
        member.parentEmail.toLowerCase().includes(lowercaseQuery) ||
        member.playerGrade.toLowerCase().includes(lowercaseQuery)
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(members)
    }
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

  // Render list card for member
  const renderMemberCard = (member: MemberData) => {
    const memberId = member.id || member.playerName
    const hasConsent = member.consent && member.valuesAcknowledgment
    const hasEmergencyInfo = member.emergencyContact && member.emergencyPhone
    const hasMedicalInfo = member.medicalInfo && member.medicalInfo.trim() !== ''

    return (
      <div key={memberId} className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-[--color-accent]">
              {member.playerName}
            </h3>
            <span className="text-sm text-gray-500">Grade {member.playerGrade}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{member.parentName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{member.parentEmail}</span>
            <span>•</span>
            <span>{member.parentPhone}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {hasConsent ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            {hasEmergencyInfo ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            {hasMedicalInfo ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMember(member)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        </div>
      </div>
    )
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
                View registered members from the registration system
              </p>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              onClick={loadMembers}
              className="flex items-center gap-2 bg-black text-white"
            >
              <Search className="h-4 w-4 text-white" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
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

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl text-[--color-text-secondary] mb-4">⚠️</div>
            <h3 className="font-semibold text-xl text-[--color-text-primary] mb-2">
              Error loading members
            </h3>
            <p className="text-[--color-text-secondary] mb-4">{error}</p>
            <Button onClick={loadMembers}>Try Again</Button>
          </Card>
        )}

        {/* Members List */}
        <div className="bg-white rounded-lg border">
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
            filteredMembers.map((member) => renderMemberCard(member))
          )}
        </div>

        {/* Modal for List View Details */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[--color-accent]">
                    {selectedMember.playerName} - Full Details
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMember(null)}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contact Information
                    </h3>
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{selectedMember.parentName}</p>
                          <p className="text-xs text-gray-500">Parent/Guardian</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{selectedMember.parentEmail}</p>
                          <p className="text-xs text-gray-500">Primary Email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{selectedMember.parentPhone}</p>
                          <p className="text-xs text-gray-500">Primary Phone</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Emergency Contact
                    </h3>
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className={`font-medium ${!selectedMember.emergencyContact ? 'text-gray-400' : ''}`}>
                            {selectedMember.emergencyContact || 'Not provided'}
                          </p>
                          <p className="text-xs text-gray-500">Emergency Contact</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className={`font-medium ${!selectedMember.emergencyPhone ? 'text-gray-400' : ''}`}>
                            {selectedMember.emergencyPhone || 'Not provided'}
                          </p>
                          <p className="text-xs text-gray-500">Emergency Phone</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interests & Preferences */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Interests & Preferences
                    </h3>
                    <div className="space-y-2 pl-6">
                      <div className="flex justify-between text-sm">
                        <span>Provincial Interest:</span>
                        <span className={selectedMember.provincialInterest?.toLowerCase() === 'yes' ? 'text-green-600' : 'text-gray-500'}>
                          {selectedMember.provincialInterest || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Volunteer Interest:</span>
                        <span className={selectedMember.volunteerInterest?.toLowerCase() === 'yes' ? 'text-green-600' : 'text-gray-500'}>
                          {selectedMember.volunteerInterest || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Newsletter:</span>
                        <span className={selectedMember.newsletter ? 'text-green-600' : 'text-gray-500'}>
                          {selectedMember.newsletter ? 'Subscribed' : 'Not subscribed'}
                        </span>
                      </div>
                      {selectedMember.hearAboutUs && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500 mb-1">How they heard about us:</p>
                          <p className="text-sm">{selectedMember.hearAboutUs}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Medical & Consent */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Medical & Consent
                    </h3>
                    <div className="space-y-3 pl-6">
                      {selectedMember.medicalInfo && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-xs text-yellow-700 font-medium mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Medical Information:
                          </p>
                          <p className="text-sm text-yellow-800">{selectedMember.medicalInfo}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">General Consent:</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            selectedMember.consent ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {selectedMember.consent ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {selectedMember.consent ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Photo Consent:</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            selectedMember.photoConsent ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {selectedMember.photoConsent ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {selectedMember.photoConsent ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Values Acknowledgment:</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            selectedMember.valuesAcknowledgment ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {selectedMember.valuesAcknowledgment ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {selectedMember.valuesAcknowledgment ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
