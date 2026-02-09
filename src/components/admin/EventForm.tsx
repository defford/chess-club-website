"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { EventData } from "@/lib/types"

type EventFormData = Omit<EventData, 'id' | 'lastUpdated' | 'participants'>

interface EventFormProps {
  onSubmit: (data: EventFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<EventFormData>
}

const CATEGORY_OPTIONS: { value: EventData['category']; label: string }[] = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'training', label: 'Training' },
  { value: 'social', label: 'Social' },
]

export default function EventForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    name: initialData?.name || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData?.location || '',
    description: initialData?.description || '',
    category: initialData?.category || 'tournament',
    ageGroups: initialData?.ageGroups || '',
    maxParticipants: initialData?.maxParticipants || 0,
    status: initialData?.status || 'active',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof EventFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required'
    }
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    if (!formData.time.trim()) {
      newErrors.time = 'Time is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    if (!formData.ageGroups.trim()) {
      newErrors.ageGroups = 'Age groups is required'
    }
    if (formData.maxParticipants < 1) {
      newErrors.maxParticipants = 'Max participants must be at least 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting event form:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Event' : 'Create Event'}</CardTitle>
        <CardDescription>
          {initialData
            ? 'Update the details for this event'
            : 'Schedule a new chess club event'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Event Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter event name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  handleInputChange('category', e.target.value)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date *
              </label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="time" className="text-sm font-medium">
                Time *
              </label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className={errors.time ? 'border-red-500' : ''}
              />
              {errors.time && (
                <p className="text-sm text-red-600">{errors.time}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location *
            </label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter event location"
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && (
              <p className="text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                handleInputChange('description', e.target.value)
              }
              placeholder="Describe the event"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Age Groups and Max Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ageGroups" className="text-sm font-medium">
                Age Groups *
              </label>
              <Input
                id="ageGroups"
                value={formData.ageGroups}
                onChange={(e) =>
                  handleInputChange('ageGroups', e.target.value)
                }
                placeholder='e.g. "K-6" or "All ages"'
                className={errors.ageGroups ? 'border-red-500' : ''}
              />
              {errors.ageGroups && (
                <p className="text-sm text-red-600">{errors.ageGroups}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="maxParticipants" className="text-sm font-medium">
                Max Participants *
              </label>
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                value={formData.maxParticipants || ''}
                onChange={(e) =>
                  handleInputChange(
                    'maxParticipants',
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="Enter max participants"
                className={errors.maxParticipants ? 'border-red-500' : ''}
              />
              {errors.maxParticipants && (
                <p className="text-sm text-red-600">
                  {errors.maxParticipants}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} variant="outline">
              {isLoading
                ? initialData
                  ? 'Saving...'
                  : 'Creating...'
                : initialData
                  ? 'Save Changes'
                  : 'Create Event'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
