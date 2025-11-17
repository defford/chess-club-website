"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { clientAuthService } from "@/lib/clientAuth"
import type { MemberData } from "@/app/api/members/route"
import { Edit, X, User, Phone, AlertTriangle } from "lucide-react"

interface EditMemberFormProps {
  member: MemberData;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
}

export default function EditMemberForm({ member, onSuccess, onCancel }: EditMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    playerName: member.playerName || '',
    playerAge: member.playerAge || '',
    playerGrade: member.playerGrade || '',
    emergencyContact: member.emergencyContact || '',
    emergencyPhone: member.emergencyPhone || '',
    medicalInfo: member.medicalInfo || ''
  });

  useEffect(() => {
    // Update form data if member changes
    setFormData({
      playerName: member.playerName || '',
      playerAge: member.playerAge || '',
      playerGrade: member.playerGrade || '',
      emergencyContact: member.emergencyContact || '',
      emergencyPhone: member.emergencyPhone || '',
      medicalInfo: member.medicalInfo || ''
    });
  }, [member]);

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
      
      const memberId = member.studentId || member.id;
      if (!memberId) {
        throw new Error('Member ID not found');
      }

      const response = await fetch(`/api/members/${memberId}?email=${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update member');
      }

      // Success - refresh the members list and close form
      onSuccess();
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
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
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[--color-accent]">
                  Edit Member Information
                </h2>
                <p className="text-sm text-[--color-text-secondary]">
                  Update student and emergency contact information
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
              </div>

              <div>
                <label className="block text-sm font-medium text-[--color-text-primary] mb-1">
                  Medical Information
                </label>
                <textarea
                  value={formData.medicalInfo}
                  onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[--color-primary] focus:border-[--color-primary]"
                  placeholder="Any medical conditions or allergies"
                  rows={3}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[--color-accent] flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact
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
                variant="outline"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Member
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





