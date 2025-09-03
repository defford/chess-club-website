"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export function RegistrationPreview() {
  const [formData, setFormData] = useState({
    parentName: "",
    childName: "",
    childAge: "",
    email: "",
    phone: "",
    consent: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would submit to an API
    console.log("Registration submitted:", formData)
    alert("Thank you for registering! We'll be in touch soon.")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  return (
    <section className="py-16 bg-[--color-neutral-light]">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-[--color-accent] mb-4">
              Ready to Join?
            </h2>
            <p className="text-lg text-[--color-text-secondary]">
              Register your child today and let them grow through strategy, confidence, and fun.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Club Registration</CardTitle>
              <CardDescription>
                Fill out the form below to register your child for the Central NL Scholastic Chess Club.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="parentName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                    Parent/Guardian Name *
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="childName" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Child's Name *
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
                      Child's Age *
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[--color-text-primary] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                    />
                  </div>
                </div>

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
                    I consent to my child participating in chess club activities and acknowledge that I have read and agree to the club's policies. *
                  </label>
                </div>

                <Button type="submit" variant="secondary" size="xl" className="w-full">
                  Register Now
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
