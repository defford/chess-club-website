"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Users, Calendar, Trophy, DollarSign, Plus, X } from "lucide-react"
import Image from "next/image"

interface Student {
  id: string;
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
}

function RegisterPageContent() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [registrationType, setRegistrationType] = useState<'parent' | 'self' | null>(null)
  const [parentData, setParentData] = useState({
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    hearAboutUs: "",
    provincialInterest: "",
    volunteerInterest: "",
    consent: false,
    photoConsent: false,
    valuesAcknowledgment: false,
    newsletter: true,
    createAccount: false
  })
  
  const [selfRegistrationData, setSelfRegistrationData] = useState({
    playerName: "",
    playerAge: "",
    playerGrade: "",
    playerEmail: "",
    playerPhone: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalInfo: "",
    hearAboutUs: "",
    provincialInterest: "",
    volunteerInterest: "",
    consent: false,
    photoConsent: false,
    valuesAcknowledgment: false,
    newsletter: true,
    createAccount: false
  })
  
  const [students, setStudents] = useState<Student[]>([])
  const [currentStudent, setCurrentStudent] = useState<Student>({
    id: "",
    playerName: "",
    playerAge: "",
    playerGrade: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalInfo: ""
  })

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [parentId, setParentId] = useState("")

  // Pre-fill email from URL params if coming from parent login
  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      setParentData(prev => ({
        ...prev,
        parentEmail: email,
        createAccount: true // Auto-check create account since they came from parent login
      }))
    }
  }, [searchParams])

  const handleRegistrationTypeSelect = (type: 'parent' | 'self') => {
    setRegistrationType(type)
    if (type === 'self') {
      setCurrentStep(2) // Skip to self-registration form
    } else {
      setCurrentStep(2) // Go to parent form
    }
  }

  const handleSelfRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate age for self-registration
    const age = parseInt(selfRegistrationData.playerAge)
    if (age <= 12) {
      setError("You must be 13 or older to register yourself. Please have a parent or guardian register for you.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/register/self', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selfRegistrationData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit self-registration')
      }

      setSubmitted(true)

      // If user opted to create an account, send magic link
      if (selfRegistrationData.createAccount) {
        try {
          const authResponse = await fetch('/api/parent/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: selfRegistrationData.playerEmail
            }),
          })

          if (!authResponse.ok) {
            console.error('Failed to create parent account, but registration was successful')
          }
        } catch (accountError) {
          console.error('Account creation error:', accountError)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit self-registration')
    } finally {
      setLoading(false)
    }
  }

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/register/parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parentData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit parent registration')
      }

      setParentId(result.parentId)
      setCurrentStep(3) // Move to student addition step

      // If user opted to create an account, send magic link
      if (parentData.createAccount) {
        try {
          const authResponse = await fetch('/api/parent/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: parentData.parentEmail
            }),
          })

          if (!authResponse.ok) {
            console.error('Failed to create parent account, but registration was successful')
          }
        } catch (accountError) {
          console.error('Account creation error:', accountError)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit parent registration')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/register/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentStudent,
          parentId: parentId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add student')
      }

      // Add student to the list
      const newStudent = { ...currentStudent, id: result.studentId }
      setStudents(prev => [...prev, newStudent])

      // Reset current student form
      setCurrentStudent({
        id: "",
        playerName: "",
        playerAge: "",
        playerGrade: "",
        emergencyContact: "",
        emergencyPhone: "",
        medicalInfo: ""
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRegistration = () => {
    setSubmitted(true)
  }

  const handleUseSameContact = () => {
    setCurrentStudent(prev => ({
      ...prev,
      emergencyContact: parentData.parentName,
      emergencyPhone: parentData.parentPhone
    }))
  }

  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setParentData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentStudent(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelfRegistrationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setSelfRegistrationData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const removeStudent = (studentId: string) => {
    setStudents(prev => prev.filter(student => student.id !== studentId))
  }

  const benefits = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Expert Instruction",
      description: "Learn from certified chess instructors and experienced players"
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Regular Sessions",
      description: "Weekly meetings with tournaments and special events"
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "Competitions",
      description: "Participate in local and regional tournaments"
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Affordable Rates",
      description: "Low cost membership with family discounts available"
    }
  ]

  if (submitted) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8">
              <div className="text-green-500 text-6xl mb-4">
                <CheckCircle className="mx-auto h-16 w-16" />
              </div>
              <h1 className="font-heading font-bold text-3xl text-[--color-accent] mb-4">
                Registration Successful!
              </h1>
              <p className="text-lg text-[--color-text-secondary] mb-6">
                {registrationType === 'self' 
                  ? `Thank you for registering yourself for the Central NL Scholastic Chess Club. We'll be in touch within 24 hours with next steps and schedule information.`
                  : `Thank you for registering ${students.length} student${students.length !== 1 ? 's' : ''} for the Central NL Scholastic Chess Club. We'll be in touch within 24 hours with next steps and schedule information.`
                }
              </p>
              
              {((registrationType === 'parent' && parentData.createAccount) || (registrationType === 'self' && selfRegistrationData.createAccount)) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-800 mb-2">🔐 Account Created!</h3>
                  <p className="text-sm text-blue-700">
                    A login link has been sent to <strong>{registrationType === 'self' ? selfRegistrationData.playerEmail : parentData.parentEmail}</strong>. 
                    Click the link in your email to access your {registrationType === 'self' ? 'player' : 'parent'} dashboard and track your {registrationType === 'self' ? 'progress' : 'players\' progress'}.
                  </p>
                </div>
              )}
              
              <div className="space-y-2 text-sm text-[--color-text-secondary]">
                <p>📧 A confirmation email with all the details has been sent to {registrationType === 'self' ? selfRegistrationData.playerEmail : parentData.parentEmail}</p>
                <p>📋 Your registration has been recorded in our system</p>
                {((registrationType === 'parent' && parentData.createAccount) || (registrationType === 'self' && selfRegistrationData.createAccount)) && (
                  <p>🔑 Check your email for the {registrationType === 'self' ? 'player' : 'parent'} account login link</p>
                )}
                <p>❓ Questions? Contact us at daniel@cnlscc.com</p>
              </div>
              <div className="mt-6">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setSubmitted(false)
                    setCurrentStep(1)
                    setRegistrationType(null)
                    setStudents([])
                    setParentId("")
                    setSelfRegistrationData({
                      playerName: "",
                      playerAge: "",
                      playerGrade: "",
                      playerEmail: "",
                      playerPhone: "",
                      emergencyContact: "",
                      emergencyPhone: "",
                      medicalInfo: "",
                      hearAboutUs: "",
                      provincialInterest: "",
                      volunteerInterest: "",
                      consent: false,
                      photoConsent: false,
                      valuesAcknowledgment: false,
                      newsletter: true,
                      createAccount: false
                    })
                  }}
                >
                  Register Again
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="relative h-16 w-16">
              <Image
                src="/Logo.png"
                alt="Central NL Scholastic Chess Club Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent]">
              Join Our Chess Club
            </h1>
            <div className="relative h-16 w-16">
              <Image
                src="/Logo.png"
                alt="Central NL Scholastic Chess Club Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Register today for an exciting journey into the world of chess. All skill levels welcome!
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-[--color-primary]' : 'text-gray-400'}`}>
              {/* <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-[#1c1F33] text-white' : 'bg-gray-200'}`}>
                1
              </div> */}
              {/* <span className="text-sm font-medium">
                {registrationType === 'self' ? '' : registrationType === 'parent' ? 'Registration Type' : 'Registration Type'}
              </span> */}
            </div>
            {registrationType === 'parent' && (
              <>
                <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-[--color-primary]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-[--color-primary]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-[#1c1F33] text-white' : 'bg-gray-200'}`}>
                    1
                  </div>
                  <span className="text-sm font-medium">Parent Info</span>
                </div>
                <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-[--color-primary]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-[--color-primary]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-[#1c1F33] text-white' : 'bg-gray-200'}`}>
                    2
                  </div>
                  <span className="text-sm font-medium">Add Students</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && !registrationType && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Registration Type</CardTitle>
                <CardDescription>
                  Please select how you would like to register for the chess club.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div 
                    className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-[--color-primary] hover:bg-blue-50 transition-colors"
                    onClick={() => handleRegistrationTypeSelect('parent')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full border-2 border-[--color-primary] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[--color-primary]"></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-[--color-text-primary]">Registering for my child</h3>
                        <p className="text-sm text-[--color-text-secondary]">
                          I am a parent or guardian registering my child for the chess club.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-[--color-primary] hover:bg-blue-50 transition-colors"
                    onClick={() => handleRegistrationTypeSelect('self')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full border-2 border-[--color-primary] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[--color-primary]"></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-[--color-text-primary]">Registering for myself</h3>
                        <p className="text-sm text-[--color-text-secondary]">
                          I am 13 or older and want to register myself for the chess club.
                        </p>
                        <p className="text-xs text-amber-900 mt-1">
                          ⚠️ You must be 13 or older to register yourself. Students 12 and under must be registered by a parent or guardian.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && registrationType === 'parent' && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Parent Information</CardTitle>
                <CardDescription>
                  Please provide your information and consent to continue with student registration.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleParentSubmit} className="space-y-6">
                  {/* Parent Information */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Parent/Guardian Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parentName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="parentName"
                          name="parentName"
                          required
                          value={parentData.parentName}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="parentEmail" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="parentEmail"
                          name="parentEmail"
                          required
                          value={parentData.parentEmail}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="parentPhone" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          id="parentPhone"
                          name="parentPhone"
                          required
                          value={parentData.parentPhone}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="hearAboutUs" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          How did you hear about our chess club?
                        </label>
                        <select
                          id="hearAboutUs"
                          name="hearAboutUs"
                          value={parentData.hearAboutUs}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="school">School announcement</option>
                          <option value="friend">Friend or family</option>
                          <option value="social-media">Social media</option>
                          <option value="website">Website search</option>
                          <option value="flyer">Flyer or poster</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="provincialInterest" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Are you interested in travelling to compete provincially this scholastic year?
                        </label>
                        <select
                          id="provincialInterest"
                          name="provincialInterest"
                          value={parentData.provincialInterest}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="yes">Yes, very interested</option>
                          <option value="maybe">Maybe, tell me more</option>
                          <option value="no">No, local events only</option>
                        </select>
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          Provincial competitions are open to new players! Travel expenses are at your own cost. Contact Daniel Efford for more information.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="volunteerInterest" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Are you interested in volunteering with the chess club?
                        </label>
                        <select
                          id="volunteerInterest"
                          name="volunteerInterest"
                          value={parentData.volunteerInterest}
                          onChange={handleParentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="yes">Yes, I'd like to help</option>
                          <option value="maybe">Maybe, contact me with details</option>
                          <option value="no">No, not at this time</option>
                        </select>
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          This chess club is a community effort supported by volunteers, parents, and players.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Consent Checkboxes */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="consent"
                        name="consent"
                        required
                        checked={parentData.consent}
                        onChange={handleParentChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="consent" className="text-sm text-[--color-text-secondary]">
                        I consent to my player participating in chess club activities and acknowledge the club&apos;s policies and waiver of liability. I understand that parents or guardians are required to attend if the player is under grade 7 to help facilitate a focused environment. *
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="valuesAcknowledgment"
                        name="valuesAcknowledgment"
                        required
                        checked={parentData.valuesAcknowledgment}
                        onChange={handleParentChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="valuesAcknowledgment" className="text-sm text-[--color-text-secondary]">
                        I understand that Chess Club is a place to practice good sportsmanship, focus, and learn & teach. *
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="photoConsent"
                        name="photoConsent"
                        checked={parentData.photoConsent}
                        onChange={handleParentChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="photoConsent" className="text-sm text-[--color-text-secondary]">
                        I consent to photos/videos of my player being taken during chess events and used for club promotional materials and social media. (Consent can be revoked at any time by contacting daniel@cnlscc.com)
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="newsletter"
                        name="newsletter"
                        checked={parentData.newsletter}
                        onChange={handleParentChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="newsletter" className="text-sm text-[--color-text-secondary]">
                        Subscribe to our newsletter for club updates, event announcements, and chess tips.
                      </label>
                    </div>

                    <div className="border border-[--color-primary]/20 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="createAccount"
                          name="createAccount"
                          checked={parentData.createAccount}
                          onChange={handleParentChange}
                          className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                        />
                        <div>
                          <label htmlFor="createAccount" className="text-sm font-medium text-[--color-primary]">
                            Create a parent account to track your players' progress
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            With a parent account, you can view rankings, register for events, and track tournament performance. A magic link will be sent to your email.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="outline" 
                    size="xl" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Continue to Add Students"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && registrationType === 'self' && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Your Information</CardTitle>
                <CardDescription>
                  Please provide your information to register for the chess club. You must be 13 or older to register yourself.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSelfRegistrationSubmit} className="space-y-6">
                  {/* Player Information */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Your Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="playerName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="playerName"
                          name="playerName"
                          required
                          value={selfRegistrationData.playerName}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="playerAge" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Age *
                        </label>
                        <input
                          type="number"
                          id="playerAge"
                          name="playerAge"
                          required
                          min="13"
                          max="18"
                          value={selfRegistrationData.playerAge}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />

                      </div>
                      
                      <div>
                        <label htmlFor="playerGrade" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Grade *
                        </label>
                        <select
                          id="playerGrade"
                          name="playerGrade"
                          required
                          value={selfRegistrationData.playerGrade}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select Grade</option>
                          <option value="7">Grade 7</option>
                          <option value="8">Grade 8</option>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                          <option value="12">Grade 12</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="playerEmail" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="playerEmail"
                          name="playerEmail"
                          required
                          value={selfRegistrationData.playerEmail}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="playerPhone" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          id="playerPhone"
                          name="playerPhone"
                          required
                          value={selfRegistrationData.playerPhone}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emergencyContact" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Emergency Contact Name *
                        </label>
                        <input
                          type="text"
                          id="emergencyContact"
                          name="emergencyContact"
                          required
                          value={selfRegistrationData.emergencyContact}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="emergencyPhone" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Emergency Phone *
                        </label>
                        <input
                          type="tel"
                          id="emergencyPhone"
                          name="emergencyPhone"
                          required
                          value={selfRegistrationData.emergencyPhone}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div>
                    <label htmlFor="medicalInfo" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Medical Information or Allergies
                    </label>
                    <textarea
                      id="medicalInfo"
                      name="medicalInfo"
                      rows={3}
                      value={selfRegistrationData.medicalInfo}
                      onChange={handleSelfRegistrationChange}
                      placeholder="Please list any allergies, medical conditions, or special needs we should be aware of..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    />
                    <p className="text-xs text-[--color-text-secondary] mt-1">
                      Note: It is up to all players and guardians to ensure their own safety surrounding allergies.
                    </p>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="hearAboutUs" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          How did you hear about our chess club?
                        </label>
                        <select
                          id="hearAboutUs"
                          name="hearAboutUs"
                          value={selfRegistrationData.hearAboutUs}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="school">School announcement</option>
                          <option value="friend">Friend or family</option>
                          <option value="social-media">Social media</option>
                          <option value="website">Website search</option>
                          <option value="flyer">Flyer or poster</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="provincialInterest" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Are you interested in travelling to compete provincially this scholastic year?
                        </label>
                        <select
                          id="provincialInterest"
                          name="provincialInterest"
                          value={selfRegistrationData.provincialInterest}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="yes">Yes, very interested</option>
                          <option value="maybe">Maybe, tell me more</option>
                          <option value="no">No, local events only</option>
                        </select>
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          Provincial competitions are open to new players! Travel expenses are at your own cost. Contact Daniel Efford for more information.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="volunteerInterest" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Are you interested in volunteering with the chess club?
                        </label>
                        <select
                          id="volunteerInterest"
                          name="volunteerInterest"
                          value={selfRegistrationData.volunteerInterest}
                          onChange={handleSelfRegistrationChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        >
                          <option value="">Select an option</option>
                          <option value="yes">Yes, I'd like to help</option>
                          <option value="maybe">Maybe, contact me with details</option>
                          <option value="no">No, not at this time</option>
                        </select>
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          This chess club is a community effort supported by volunteers, parents, and players.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Consent Checkboxes */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="consent"
                        name="consent"
                        required
                        checked={selfRegistrationData.consent}
                        onChange={handleSelfRegistrationChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="consent" className="text-sm text-[--color-text-secondary]">
                        I consent to participating in chess club activities and acknowledge the club&apos;s policies and waiver of liability. I understand that parents or guardians are required to attend if the player is under grade 7 to help facilitate a focused environment. *
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="valuesAcknowledgment"
                        name="valuesAcknowledgment"
                        required
                        checked={selfRegistrationData.valuesAcknowledgment}
                        onChange={handleSelfRegistrationChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="valuesAcknowledgment" className="text-sm text-[--color-text-secondary]">
                        I understand that Chess Club is a place to practice good sportsmanship, focus, and learn & teach. *
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="photoConsent"
                        name="photoConsent"
                        checked={selfRegistrationData.photoConsent}
                        onChange={handleSelfRegistrationChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="photoConsent" className="text-sm text-[--color-text-secondary]">
                        I consent to photos/videos of me being taken during chess events and used for club promotional materials and social media. (Consent can be revoked at any time by contacting daniel@cnlscc.com)
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="newsletter"
                        name="newsletter"
                        checked={selfRegistrationData.newsletter}
                        onChange={handleSelfRegistrationChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="newsletter" className="text-sm text-[--color-text-secondary]">
                        Subscribe to our newsletter for club updates, event announcements, and chess tips.
                      </label>
                    </div>

                    <div className="border border-[--color-primary]/20 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="createAccount"
                          name="createAccount"
                          checked={selfRegistrationData.createAccount}
                          onChange={handleSelfRegistrationChange}
                          className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                        />
                        <div>
                          <label htmlFor="createAccount" className="text-sm font-medium text-[--color-primary]">
                            Create a player account to track your progress
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            With a player account, you can view rankings, register for events, and track tournament performance. A magic link will be sent to your email.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit"             
                    variant="outline"
                    size="xl" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Complete Registration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && registrationType === 'parent' && (
            <div className="space-y-6">
              {/* Students List */}
              {students.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Registered Students</CardTitle>
                    <CardDescription>
                      Students you have successfully registered.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{student.playerName}</h4>
                            <p className="text-sm text-gray-600">Age: {student.playerAge} | Grade: {student.playerGrade}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeStudent(student.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Student Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add a Student</CardTitle>
                  <CardDescription>
                    Add your player's information to register them for the chess club.
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleAddStudent} className="space-y-6">
                    {/* Student Information */}
                    <div>
                      <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                        Student Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="playerName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                            Player&apos;s Full Name *
                          </label>
                          <input
                            type="text"
                            id="playerName"
                            name="playerName"
                            required
                            value={currentStudent.playerName}
                            onChange={handleStudentChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="playerAge" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                            Age *
                          </label>
                          <input
                            type="number"
                            id="playerAge"
                            name="playerAge"
                            required
                            min="5"
                            max="18"
                            value={currentStudent.playerAge}
                            onChange={handleStudentChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="playerGrade" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                            Grade *
                          </label>
                          <select
                            id="playerGrade"
                            name="playerGrade"
                            required
                            value={currentStudent.playerGrade}
                            onChange={handleStudentChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                          >
                            <option value="">Select Grade</option>
                            <option value="K">Kindergarten</option>
                            <option value="1">Grade 1</option>
                            <option value="2">Grade 2</option>
                            <option value="3">Grade 3</option>
                            <option value="4">Grade 4</option>
                            <option value="5">Grade 5</option>
                            <option value="6">Grade 6</option>
                            <option value="7">Grade 7</option>
                            <option value="8">Grade 8</option>
                            <option value="9">Grade 9</option>
                            <option value="10">Grade 10</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                      <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                        Emergency Contact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="emergencyContact" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                            Emergency Contact Name *
                          </label>
                          <input
                            type="text"
                            id="emergencyContact"
                            name="emergencyContact"
                            required
                            value={currentStudent.emergencyContact}
                            onChange={handleStudentChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="emergencyPhone" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                            Emergency Phone *
                          </label>
                          <input
                            type="tel"
                            id="emergencyPhone"
                            name="emergencyPhone"
                            required
                            value={currentStudent.emergencyPhone}
                            onChange={handleStudentChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Use Same Contact Button */}
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleUseSameContact}
                          className="text-[--color-primary] border-[--color-primary] hover:bg-[#1c1F33] hover:text-white"
                        >
                          Use the same contact information as this account
                        </Button>
                      </div>
                    </div>

                    {/* Medical Information */}
                    <div>
                      <label htmlFor="medicalInfo" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                        Medical Information or Allergies
                      </label>
                      <textarea
                        id="medicalInfo"
                        name="medicalInfo"
                        rows={3}
                        value={currentStudent.medicalInfo}
                        onChange={handleStudentChange}
                        placeholder="Please list any allergies, medical conditions, or special needs we should be aware of..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                      />
                      <p className="text-xs text-[--color-text-secondary] mt-1">
                        Note: It is up to all players and guardians to ensure their own safety surrounding allergies.
                      </p>
                    </div>

                    <div className="flex space-x-4">
                      <Button 
                        type="submit" 
                        variant="outline" 
                        size="lg" 
                        className="flex-1"
                        disabled={loading}
                      >
                        {loading ? "Adding..." : "Add Student"}
                      </Button>
                      
                      {students.length > 0 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="lg" 
                          onClick={handleCompleteRegistration}
                          className="flex-1"
                        >
                          Complete Registration
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
              Join Our Chess Club
            </h1>
            <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
              Loading registration form...
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
