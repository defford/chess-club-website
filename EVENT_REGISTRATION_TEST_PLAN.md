# Event Registration Flow - Test Plan

## Bugs Found & Fixed

### 1. Double Participant Increment (CRITICAL)
- **File**: `src/app/api/events/register/route.ts`
- **Issue**: `addEventRegistration()` already calls `incrementEventParticipants()` internally (in `supabaseService.ts:431`), but the API route was calling it again separately. Every registration incremented the count by 2.
- **Fix**: Removed the duplicate `incrementEventParticipants()` call from the API route.

### 2. Non-Authenticated Registration Field Mapping (BUG)
- **File**: `src/app/events/events-client.tsx`
- **Issue**: For non-authenticated users, the form spread `...registrationData` which sends `medicalInfo` but the API expects `additionalNotes`. The `additionalNotes` field would always be empty for non-authenticated registrations.
- **Fix**: Explicitly mapped form fields to API fields: `additionalNotes: registrationData.medicalInfo || ''`

### 3. player_school Column Insert Safety (DEFENSIVE FIX)
- **File**: `src/lib/supabaseService.ts`
- **Issue**: The `player_school` column was always sent in the insert, even if undefined. If the DB migration hasn't been applied, this would crash.
- **Fix**: Made the `player_school` field conditional in the insert - only included when present.

### 4. Register Button Only Visible to Authenticated Users (DESIGN NOTE)
- **File**: `src/app/events/events-client.tsx:343`
- **Observation**: The Register button is wrapped in `{isAuthenticated && (...)}`, so non-authenticated users cannot trigger the registration modal. The full non-authenticated registration form (lines 480-636) exists in the modal but is unreachable.
- **Status**: Not changed - may be intentional design decision. Worth reviewing.

## Programmatic Test Steps

### Test 1: API Registration (curl)
```bash
# Test successful registration
curl -s -X POST http://localhost:3000/api/events/register \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<EVENT_ID>","playerName":"Test Player","playerGrade":"5","playerSchool":"Test School","additionalNotes":"test notes"}'

# Expected: {"message":"Event registration successful"} with status 201

# Test missing required field
curl -s -X POST http://localhost:3000/api/events/register \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<EVENT_ID>","playerName":"Test Player"}'

# Expected: {"error":"Missing required field: playerGrade"} with status 400
```

### Test 2: Participant Count (single increment)
```bash
# Before registration
curl -s http://localhost:3000/api/events | python3 -c "import json,sys; events=json.load(sys.stdin); [print(f'{e[\"name\"]}: {e[\"participants\"]}') for e in events]"

# Register a player (see Test 1)

# After registration - participant count should increase by exactly 1
curl -s http://localhost:3000/api/events | python3 -c "import json,sys; events=json.load(sys.stdin); [print(f'{e[\"name\"]}: {e[\"participants\"]}') for e in events]"
```

### Test 3: Events Page Loads
```bash
curl -s http://localhost:3000/api/events | python3 -m json.tool
# Expected: JSON array of events with active events having correct fields
```

## Manual Test Steps

### Test A: Authenticated User Registration
1. Navigate to `/parent-login` and log in with a valid parent account
2. Navigate to `/events`
3. Verify active events are displayed with "Register Student" buttons
4. Click "Register Student" on an event
5. Verify the registration modal opens with student selection dropdown
6. Select a student from the dropdown
7. Fill in the School field (required)
8. Optionally add notes
9. Click "Register"
10. Verify success message appears
11. Verify the modal closes
12. Verify participant count updates on the event card

### Test B: Event Full State
1. Find or create an event where `participants >= maxParticipants`
2. Verify the Register button shows "Event Full" and is disabled

### Test C: Category Filtering
1. Navigate to `/events`
2. Click different category filters (All, Tournaments, Workshops, Training, Social)
3. Verify only events of the selected category are shown
4. Verify completed/cancelled events are filtered out

### Test D: Event Data Display
1. For each displayed event, verify:
   - Event name is shown
   - Date is displayed
   - Time is displayed (if present)
   - Location is displayed (if present)
   - Category badge is shown with correct color
   - Age groups are shown (if present)

### Test E: Non-Authenticated User View
1. Navigate to `/events` without being logged in
2. Verify events are displayed but no "Register Student" button appears
3. (Design decision: consider whether public registration should be enabled)
