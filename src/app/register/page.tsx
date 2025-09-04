"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { CheckCircle, Users, Calendar, Trophy, DollarSign } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    childName: "",
    childAge: "",
    childGrade: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalInfo: "",
    hearAboutUs: "",
    provincialInterest: "",
    volunteerInterest: "",
    consent: false,
    photoConsent: false,
    valuesAcknowledgment: false,
    newsletter: true
  })

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit registration')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit registration')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
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
                Thank you for registering {formData.childName} for the Central NL Scholastic Chess Club. 
                We&apos;ll be in touch within 24 hours with next steps and schedule information.
              </p>
              <div className="space-y-2 text-sm text-[--color-text-secondary]">
                <p>📧 A confirmation email with all the details has been sent to {formData.parentEmail}</p>
                <p>📋 Your registration has been recorded in our system</p>
                <p>🕐 You&apos;ll receive schedule information within 24-48 hours</p>
                <p>❓ Questions? Contact us at info@centralnlchess.ca</p>
              </div>
              <div className="mt-6">
                <Button 
                  variant="primary" 
                  onClick={() => setSubmitted(false)}
                >
                  Register Another Child
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
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
            Join Our Chess Club
          </h1>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            Register your child today for an exciting journey into the world of chess. All skill levels welcome!
          </p>
        </div>

        <div>
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Registration Form</CardTitle>
                <CardDescription>
                  Please fill out all required fields to register your child for the chess club.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
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
                          value={formData.parentName}
                          onChange={handleChange}
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
                          value={formData.parentEmail}
                          onChange={handleChange}
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
                          value={formData.parentPhone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Child Information */}
                  <div>
                    <h3 className="font-semibold text-lg text-[--color-text-primary] mb-4">
                      Player Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="childName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Player&apos;s Full Name *
                        </label>
                        <input
                          type="text"
                          id="childName"
                          name="childName"
                          required
                          value={formData.childName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="childAge" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Age *
                        </label>
                        <input
                          type="number"
                          id="childAge"
                          name="childAge"
                          required
                          min="5"
                          max="18"
                          value={formData.childAge}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="childGrade" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                          Grade *
                        </label>
                        <select
                          id="childGrade"
                          name="childGrade"
                          required
                          value={formData.childGrade}
                          onChange={handleChange}
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
                          value={formData.emergencyContact}
                          onChange={handleChange}
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
                          value={formData.emergencyPhone}
                          onChange={handleChange}
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
                      value={formData.medicalInfo}
                      onChange={handleChange}
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
                          value={formData.hearAboutUs}
                          onChange={handleChange}
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
                          value={formData.provincialInterest}
                          onChange={handleChange}
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
                          value={formData.volunteerInterest}
                          onChange={handleChange}
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
                        checked={formData.consent}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="consent" className="text-sm text-[--color-text-secondary]">
                        I consent to my child participating in chess club activities and acknowledge the club&apos;s policies and waiver of liability. I understand that parents or guardians are required to attend if the player is under grade 7 to help facilitate a focused environment. *
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="valuesAcknowledgment"
                        name="valuesAcknowledgment"
                        required
                        checked={formData.valuesAcknowledgment}
                        onChange={handleChange}
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
                        checked={formData.photoConsent}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="photoConsent" className="text-sm text-[--color-text-secondary]">
                        I consent to photos/videos of my child being taken during chess events and used for club promotional materials and social media. (Consent can be revoked at any time by contacting daniel@cnlscc.com)
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="newsletter"
                        name="newsletter"
                        checked={formData.newsletter}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-[--color-primary] focus:ring-[--color-primary] border-gray-300 rounded"
                      />
                      <label htmlFor="newsletter" className="text-sm text-[--color-text-secondary]">
                        Subscribe to our newsletter for club updates, event announcements, and chess tips.
                      </label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="secondary" 
                    size="xl" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Complete Registration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
