"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { clientAuthService } from "@/lib/clientAuth"

interface ChildRegistrationForm {
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
}

export default function RegisterChildPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [parentEmail, setParentEmail] = useState("")
  const [formData, setFormData] = useState<ChildRegistrationForm>({
    playerName: "",
    playerAge: "",
    playerGrade: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalInfo: ""
  })

  useEffect(() => {
    // Check authentication using the same service as dashboard
    if (!clientAuthService.isParentAuthenticated()) {
      router.push('/parent/login')
      return
    }

    const session = clientAuthService.getCurrentParentSession()
    if (!session) {
      router.push('/parent/login')
      return
    }

    setParentEmail(session.email)
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/parent/register-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          parentEmail: parentEmail
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register child')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register child')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Child Registered Successfully!</h2>
            <p className="text-gray-600 mb-6">
              {formData.playerName} has been registered for the chess club. You should receive a confirmation email shortly.
            </p>
            <div className="space-y-3">
              <Link href="/parent/dashboard">
                <Button className="w-full" variant="outline">
                  Return to Dashboard
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={() => {
                setSuccess(false)
                setFormData({
                  playerName: "",
                  playerAge: "",
                  playerGrade: "",
                  emergencyContact: "",
                  emergencyPhone: "",
                  medicalInfo: ""
                })
              }}>
                Register Another Child
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link href="/parent/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">Register New Child</h1>
              <p className="text-gray-600">Add another child to your chess club account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Registration Failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Child Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    name="playerName"
                    required
                    value={formData.playerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    placeholder="Enter child's full name"
                  />
                </div>

                <div>
                  <label htmlFor="playerAge" className="block text-sm font-medium text-gray-700 mb-2">
                    Age *
                  </label>
                  <select
                    id="playerAge"
                    name="playerAge"
                    required
                    value={formData.playerAge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                  >
                    <option value="">Select age</option>
                    {Array.from({ length: 15 }, (_, i) => i + 4).map(age => (
                      <option key={age} value={age.toString()}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="playerGrade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grade/School Level *
                </label>
                <select
                  id="playerGrade"
                  name="playerGrade"
                  required
                  value={formData.playerGrade}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                >
                  <option value="">Select grade</option>
                  <option value="Pre-K">Pre-K</option>
                  <option value="Kindergarten">Kindergarten</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                    <option key={grade} value={`Grade ${grade}`}>Grade {grade}</option>
                  ))}
                  <option value="Post-Secondary">Post-Secondary</option>
                </select>
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Emergency Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Name *
                    </label>
                    <input
                      type="text"
                      id="emergencyContact"
                      name="emergencyContact"
                      required
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                      placeholder="Emergency contact full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Phone *
                    </label>
                    <input
                      type="tel"
                      id="emergencyPhone"
                      name="emergencyPhone"
                      required
                      value={formData.emergencyPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                      placeholder="(xxx) xxx-xxxx"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Medical Information</h3>
                <div>
                  <label htmlFor="medicalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Information / Allergies (Optional)
                  </label>
                  <textarea
                    id="medicalInfo"
                    name="medicalInfo"
                    rows={3}
                    value={formData.medicalInfo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    placeholder="Any medical conditions, allergies, or special needs we should be aware of..."
                  />
                </div>
              </div>

              {/* Parent Information Display */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Parent Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    This child will be registered under your existing parent account:
                  </p>
                  <p className="font-medium text-gray-900 mt-1">{parentEmail}</p>
                </div>
              </div>

              {/* Submit */}
              <div className="border-t pt-6">
                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                    variant="outline"
                  >
                    {loading ? 'Registering...' : 'Register Child'}
                  </Button>
                  <Link href="/parent/dashboard">
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">Registration Note</p>
              <p className="text-blue-700 text-sm mt-1">
                By registering this child, you agree to the same terms and conditions as your original registration. 
                The child will be added to your parent account and you'll receive a confirmation email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
