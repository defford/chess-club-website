import { getSupabaseClient } from './supabaseClient';
import { CURRENT_SEASON } from './config';

const supabase = getSupabaseClient(true);

export interface SeasonEnrollment {
  id: string;
  seasonKey: string;
  parentId: string;
  studentId: string;
  status: 'registered' | 'withdrawn';
  participationConsent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  registeredAt: string;
}

export async function getSeasonEnrollmentsForParent(parentId: string) {
  const { data, error } = await supabase
    .from('season_enrollments')
    .select('*')
    .eq('parent_id', parentId)
    .eq('season_key', CURRENT_SEASON.KEY);

  if (error) throw new Error(`Failed to load season enrollments: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    seasonKey: row.season_key,
    parentId: row.parent_id,
    studentId: row.student_id,
    status: row.status,
    participationConsent: row.participation_consent,
    photoConsent: row.photo_consent,
    valuesAcknowledgment: row.values_acknowledgment,
    newsletter: row.newsletter,
    registeredAt: row.registered_at,
  })) as SeasonEnrollment[];
}

export async function enrollStudentForCurrentSeason(input: {
  parentId: string;
  studentId: string;
  participationConsent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
}) {
  const { error } = await supabase
    .from('season_enrollments')
    .upsert({
      season_key: CURRENT_SEASON.KEY,
      parent_id: input.parentId,
      student_id: input.studentId,
      status: 'registered',
      participation_consent: input.participationConsent,
      photo_consent: input.photoConsent,
      values_acknowledgment: input.valuesAcknowledgment,
      newsletter: input.newsletter,
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'season_key,student_id',
    });

  if (error) throw new Error(`Failed to save season enrollment: ${error.message}`);
}

export async function withdrawStudentFromCurrentSeason(studentId: string) {
  const { error } = await supabase
    .from('season_enrollments')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('season_key', CURRENT_SEASON.KEY)
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to update season enrollment: ${error.message}`);
}
