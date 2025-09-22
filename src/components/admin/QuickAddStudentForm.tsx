"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { clientAuthService } from "@/lib/clientAuth"
import { Plus, X, User, Phone, Mail, AlertTriangle } from "lucide-react"

interface QuickAddStudentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  playerName: string;
  playerAge: string;
  playerGrade: string;
}

export default function QuickAddStudentForm({ onSuccess, onCancel }: QuickAddStudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    playerName: '',
    playerAge: '',
    playerGrade: ''
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get the current user's email for admin authentication
      const session = clientAuthService.getCurrentParentSession();
      const userEmail = session?.email || 'dev@example.com';
      
      const response = await fetch(`/api/admin/quick-add-student?email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add student');
      }

      // Success - refresh the members list and close form
      onSuccess();
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[--color-primary] rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[--color-accent]">
                  Quick Add Student
                </h2>
                <p className="text-sm text-[--color-text-secondary]">
                  Add a student with minimal information
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Information
              </h3>
              <p className="text-sm text-[--color-text-secondary]">
                Only essential information is required. Parent and emergency contact details will be added later.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.playerName}
                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Enter student name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min="4"
                    max="18"
                    value={formData.playerAge}
                    onChange={(e) => handleInputChange('playerAge', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Enter age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Grade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.playerGrade}
                    onChange={(e) => handleInputChange('playerGrade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="e.g., Grade 5"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Medical Information
                  </label>
                  <input
                    type="text"
                    value={formData.medicalInfo}
                    onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Any medical conditions or allergies"
                  />
                </div> */}
              </div>
            </div>

            {/* Emergency Contact
            <div className="space-y-4">
              <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact *
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Emergency Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Emergency phone number"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information (Optional) */}
            {/* <div className="space-y-4">
              <h3 className="font-semibold text-[--color-text-secondary] flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Parent Information (Optional)
              </h3>
              <p className="text-sm text-[--color-text-secondary]">
                Leave blank to use default values. Can be updated later.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => handleInputChange('parentName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Parent/guardian name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Parent email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                    Parent Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                    placeholder="Parent phone"
                  />
                </div>
              </div>
            </div> */}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[--color-primary] text-black"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
