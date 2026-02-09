-- Add system player for bonus points / unknown opponent games
-- This allows the "Unknown Opponent" to be used in attendance and games

-- First, add the system parent
INSERT INTO parents (
  id,
  name,
  email,
  phone,
  consent,
  photo_consent,
  values_acknowledgment,
  newsletter,
  registration_type,
  is_admin
) VALUES (
  'system_parent',
  'System',
  'system@chessclub.local',
  'N/A',
  true,
  false,
  true,
  false,
  'self',
  false
) ON CONFLICT (id) DO NOTHING;

-- Then, add the unknown opponent student
INSERT INTO students (
  id,
  parent_id,
  name,
  age,
  grade,
  emergency_contact,
  emergency_phone,
  medical_info
) VALUES (
  'unknown_opponent',
  'system_parent',
  'Unknown Opponent',
  'N/A',
  'Unknown',
  'N/A',
  'N/A',
  'System player for bonus points and games with unknown opponents'
) ON CONFLICT (id) DO NOTHING;
