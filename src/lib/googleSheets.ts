import { google } from 'googleapis';
import type {
  RegistrationData,
  EventData,
  EventRegistrationData,
  PlayerData,
  ParentAccount,
  PlayerOwnership,
  PlayerOwnershipData,
  ParentRegistrationData,
  StudentRegistrationData,
  SelfRegistrationData,
  ParentData,
  StudentData
} from './types';

export class GoogleSheetsService {
  private sheets;
  private auth;
  private lastApiCall: number = 0;
  private readonly API_CALL_DELAY = 100; // 100ms delay between API calls

  constructor() {
    // Initialize Google Sheets API with service account credentials for reliable authentication
    if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
      // Use service account credentials (recommended for production and reliable development)
      const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY
          .replace(/\\n/g, '\n')  // Convert literal \n to actual newlines
          .replace(/\\\\/g, '\\') // Handle escaped backslashes
          .trim(),                // Remove extra whitespace
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      };

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      // Fallback to Application Default Credentials (ADC) - less reliable
      console.warn('Service account credentials not found, falling back to ADC. Consider setting up service account for reliable authentication.');
      this.auth = new google.auth.GoogleAuth({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'poetic-chariot-470917-k3',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  // Rate limiting helper to prevent API quota exceeded errors
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.API_CALL_DELAY) {
      const delay = this.API_CALL_DELAY - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastApiCall = Date.now();
  }

  // Helper method to get spreadsheet ID - now uses single spreadsheet with multiple sheets
  private getSpreadsheetId(type: 'registrations' | 'events' | 'rankings'): string {
    // Use single spreadsheet ID for all data types
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_REGISTRATIONS_ID || '';
    
    if (!spreadsheetId) {
      throw new Error(`Google Sheets ID not configured. Please set GOOGLE_SHEETS_ID in your environment variables.`);
    }
    
    return spreadsheetId;
  }

  // @deprecated Use addParentRegistration + addStudentRegistration instead
  async addRegistration(data: RegistrationData): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Convert form data to row format
    const timestamp = new Date().toISOString();
    const values = [
      [
        timestamp,
        data.parentName,
        data.parentEmail,
        data.parentPhone,
        data.playerName,
        data.playerAge,
        data.playerGrade,
        data.emergencyContact,
        data.emergencyPhone,
        data.medicalInfo,
        data.hearAboutUs,
        data.provincialInterest,
        data.volunteerInterest,
        data.consent ? 'Yes' : 'No',
        data.photoConsent ? 'Yes' : 'No',
        data.valuesAcknowledgment ? 'Yes' : 'No',
        data.newsletter ? 'Yes' : 'No'
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'registrations!A:Q', // Using the actual sheet name
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      throw new Error('Failed to save registration to Google Sheets');
    }
  }

  async addParentRegistration(data: ParentRegistrationData): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Generate a unique parent ID
    const parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Create parent data object
    const parentData: ParentData = {
      id: parentId,
      name: data.parentName,
      email: data.parentEmail,
      phone: data.parentPhone,
      hearAboutUs: data.hearAboutUs,
      provincialInterest: data.provincialInterest,
      volunteerInterest: data.volunteerInterest,
      consent: data.consent,
      photoConsent: data.photoConsent,
      valuesAcknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter,
      createAccount: data.createAccount || false,
      timestamp: timestamp
    };

    // Write to parents sheet
    const values = [
      [
        parentData.id,
        parentData.name,
        parentData.email,
        parentData.phone,
        parentData.hearAboutUs,
        parentData.provincialInterest,
        parentData.volunteerInterest,
        parentData.consent ? 'Yes' : 'No',
        parentData.photoConsent ? 'Yes' : 'No',
        parentData.valuesAcknowledgment ? 'Yes' : 'No',
        parentData.newsletter ? 'Yes' : 'No',
        parentData.createAccount ? 'Yes' : 'No',
        parentData.timestamp,
        data.registrationType || 'parent' // Registration Type
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'parents!A:N',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      
      return parentId;
    } catch (error) {
      console.error('Error writing parent registration to Google Sheets:', error);
      throw new Error('Failed to save parent registration to Google Sheets');
    }
  }

  async addStudentRegistration(data: StudentRegistrationData): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Generate a unique student ID
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Create student data object
    const studentData: StudentData = {
      id: studentId,
      parentId: data.parentId,
      name: data.playerName,
      age: data.playerAge,
      grade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo,
      timestamp: timestamp
    };

    // Write to students sheet
    const values = [
      [
        studentData.id,
        studentData.parentId,
        studentData.name,
        studentData.age,
        studentData.grade,
        studentData.emergencyContact,
        studentData.emergencyPhone,
        studentData.medicalInfo,
        studentData.timestamp
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'students!A:I',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      
      return studentId;
    } catch (error) {
      console.error('Error writing student registration to Google Sheets:', error);
      throw new Error('Failed to save student registration to Google Sheets');
    }
  }

  async addSelfRegistration(data: SelfRegistrationData): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Generate a unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Create self-registration data object
    const selfRegistrationData = {
      id: playerId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      playerEmail: data.playerEmail,
      playerPhone: data.playerPhone,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo,
      hearAboutUs: data.hearAboutUs,
      provincialInterest: data.provincialInterest,
      volunteerInterest: data.volunteerInterest,
      consent: data.consent,
      photoConsent: data.photoConsent,
      valuesAcknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter,
      createAccount: data.createAccount || false,
      timestamp: timestamp
    };

    // Write to registrations sheet (same as regular registrations)
    const values = [
      [
        selfRegistrationData.id,
        selfRegistrationData.playerName, // parentName field
        selfRegistrationData.playerEmail, // parentEmail field  
        selfRegistrationData.playerPhone, // parentPhone field
        selfRegistrationData.playerName, // playerName field
        selfRegistrationData.playerAge, // playerAge field
        selfRegistrationData.playerGrade, // playerGrade field
        selfRegistrationData.emergencyContact, // emergencyContact field
        selfRegistrationData.emergencyPhone, // emergencyPhone field
        selfRegistrationData.medicalInfo, // medicalInfo field
        selfRegistrationData.hearAboutUs, // hearAboutUs field
        selfRegistrationData.provincialInterest, // provincialInterest field
        selfRegistrationData.volunteerInterest, // volunteerInterest field
        selfRegistrationData.consent, // consent field
        selfRegistrationData.photoConsent, // photoConsent field
        selfRegistrationData.valuesAcknowledgment, // valuesAcknowledgment field
        selfRegistrationData.newsletter, // newsletter field
        selfRegistrationData.timestamp // timestamp field
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'registrations!A:Q',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      
      return playerId;
    } catch (error) {
      console.error('Error writing self-registration to Google Sheets:', error);
      throw new Error('Failed to save self-registration to Google Sheets');
    }
  }

  async getParentRegistration(parentId: string): Promise<ParentRegistrationData | null> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:N',
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return null;
      }

      // Find the parent registration by parent ID
      const parentRow = rows.find(row => row[0] === parentId); // Column A contains parent ID
      
      if (!parentRow) {
        return null;
      }

      return {
        parentName: parentRow[1] || '',
        parentEmail: parentRow[2] || '',
        parentPhone: parentRow[3] || '',
        hearAboutUs: parentRow[4] || '',
        provincialInterest: parentRow[5] || '',
        volunteerInterest: parentRow[6] || '',
        consent: parentRow[7] === 'Yes',
        photoConsent: parentRow[8] === 'Yes',
        valuesAcknowledgment: parentRow[9] === 'Yes',
        newsletter: parentRow[10] === 'Yes',
        createAccount: parentRow[11] === 'Yes',
        registrationType: (parentRow[13] as 'parent' | 'self') || 'parent'
      };
    } catch (error) {
      console.error('Error reading parent registration from Google Sheets:', error);
      throw new Error('Failed to retrieve parent registration from Google Sheets');
    }
  }


  // Events Management Methods
  async getEvents(): Promise<EventData[]> {
    const spreadsheetId = this.getSpreadsheetId('events');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets events ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'events!A:K',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // Skip header row and convert to EventData objects
      return rows.slice(1).map((row, index) => ({
        id: row[0] || String(index + 1),
        name: row[1] || '',
        date: row[2] || '',
        time: row[3] || '',
        location: row[4] || '',
        participants: parseInt(row[5]) || 0,
        maxParticipants: parseInt(row[6]) || 0,
        description: row[7] || '',
        category: (row[8] as 'tournament' | 'workshop' | 'training' | 'social') || 'social',
        ageGroups: row[9] || '',
        status: (row[10] as 'active' | 'cancelled' | 'completed') || 'active',
        lastUpdated: row[11] || new Date().toISOString(),
      })).filter(event => event.name); // Filter out empty rows
    } catch (error) {
      console.error('Error reading events from Google Sheets:', error);
      throw new Error('Failed to retrieve events from Google Sheets');
    }
  }

  async addEvent(event: Omit<EventData, 'id' | 'lastUpdated'>): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('events');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets events ID not configured');
    }

    const timestamp = new Date().toISOString();
    const eventId = `evt_${Date.now()}`;
    
    const values = [
      [
        eventId,
        event.name,
        event.date,
        event.time,
        event.location,
        event.participants,
        event.maxParticipants,
        event.description,
        event.category,
        event.ageGroups,
        event.status || 'active',
        timestamp
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'events!A:L',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      return eventId;
    } catch (error) {
      console.error('Error adding event to Google Sheets:', error);
      throw new Error('Failed to add event to Google Sheets');
    }
  }

  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('events');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets events ID not configured');
    }

    try {
      // First, find the row with this event ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'events!A:A',
      });

      const rows = response.data.values;
      if (!rows) {
        throw new Error('No events found');
      }

      const rowIndex = rows.findIndex(row => row[0] === eventId);
      if (rowIndex === -1) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      // Get current event data
      const currentEventResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `events!A${rowIndex + 1}:L${rowIndex + 1}`,
      });

      const currentRow = currentEventResponse.data.values?.[0] || [];
      
      // Merge updates with current data
      const updatedRow = [
        eventId, // ID stays the same
        updates.name ?? currentRow[1],
        updates.date ?? currentRow[2],
        updates.time ?? currentRow[3],
        updates.location ?? currentRow[4],
        updates.participants ?? currentRow[5],
        updates.maxParticipants ?? currentRow[6],
        updates.description ?? currentRow[7],
        updates.category ?? currentRow[8],
        updates.ageGroups ?? currentRow[9],
        updates.status ?? currentRow[10],
        new Date().toISOString() // Always update timestamp
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `events!A${rowIndex + 1}:L${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRow],
        },
      });
    } catch (error) {
      console.error('Error updating event in Google Sheets:', error);
      throw new Error('Failed to update event in Google Sheets');
    }
  }


  // Rankings/Ladder Management Methods
  async getPlayers(): Promise<PlayerData[]> {
    // Now calculate rankings dynamically from games sheet
    return await this.calculateRankingsFromGames();
  }

  async addPlayer(player: Omit<PlayerData, 'id' | 'rank'>): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets rankings ID not configured');
    }

    const playerId = `plr_${Date.now()}`;
    
    // Calculate rank (get current player count + 1)
    const currentPlayers = await this.getPlayers();
    const newRank = currentPlayers.length + 1;
    
    const values = [
      [
        playerId,
        player.name,
        player.grade,
        player.gamesPlayed,
        player.wins,
        player.draws || 0,
        player.losses,
        player.points,
        newRank,
        player.lastActive,
        player.email || ''
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'rankings!A:K',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      return playerId;
    } catch (error) {
      console.error('Error adding player to Google Sheets:', error);
      throw new Error('Failed to add player to Google Sheets');
    }
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets rankings ID not configured');
    }

    try {
      // Find the row with this player ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'rankings!A:A',
      });

      const rows = response.data.values;
      if (!rows) {
        throw new Error('No players found');
      }

      const rowIndex = rows.findIndex(row => row[0] === playerId);
      if (rowIndex === -1) {
        throw new Error(`Player with ID ${playerId} not found`);
      }

      // Get current player data
      const currentPlayerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `rankings!A${rowIndex + 1}:K${rowIndex + 1}`,
      });

      const currentRow = currentPlayerResponse.data.values?.[0] || [];
      
      // Merge updates with current data
      const updatedRow = [
        playerId, // ID stays the same
        updates.name ?? currentRow[1],
        updates.grade ?? currentRow[2],
        updates.gamesPlayed ?? currentRow[3],
        updates.wins ?? currentRow[4],
        updates.draws ?? currentRow[5],
        updates.losses ?? currentRow[6],
        updates.points ?? currentRow[7],
        updates.rank ?? currentRow[8],
        updates.lastActive ?? new Date().toISOString(),
        updates.email ?? currentRow[10]
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `rankings!A${rowIndex + 1}:K${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRow],
        },
      });
    } catch (error) {
      console.error('Error updating player in Google Sheets:', error);
      throw new Error('Failed to update player in Google Sheets');
    }
  }


  // Members/Registration Management Methods
  // @deprecated Use getMembersFromParentsAndStudents instead
  async getRegistrations(): Promise<RegistrationData[]> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'registrations!A:Q',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // Skip header row and convert to RegistrationData objects
      return rows.slice(1).map((row, index) => {
        // Helper function to parse boolean values more flexibly
        const parseBoolean = (value: any) => {
          if (value === undefined || value === null || value === '') return false;
          
          // Handle boolean true directly
          if (value === true || value === 'TRUE' || value === 'True') return true;
          
          const normalized = value.toString().toLowerCase().trim();
          // Handle various possible true values from Google Forms/Sheets
          return normalized === 'yes' || 
                 normalized === 'true' || 
                 normalized === '1' ||
                 normalized === 'on' ||
                 normalized === 'checked' ||
                 normalized === '✓' ||
                 normalized === 'x' ||
                 normalized === 'i understand';
        };

        return {
          // Corrected mapping based on actual spreadsheet structure
          parentName: row[1] || '',        // Column B
          parentEmail: row[2] || '',       // Column C
          parentPhone: row[3] || '',       // Column D
          playerName: row[4] || '',         // Column E
          playerAge: row[5] || '',          // Column F
          playerGrade: row[6] || '',        // Column G
          emergencyContact: row[7] || '',  // Column H
          emergencyPhone: row[8] || '',    // Column I
          medicalInfo: row[9] || '',       // Column J
          hearAboutUs: row[10] || '',      // Column K
          provincialInterest: row[11] || '', // Column L
          volunteerInterest: row[12] || '', // Column M
          consent: parseBoolean(row[13]),      // Column N - "Consent to policies"
          valuesAcknowledgment: parseBoolean(row[14]), // Column O - "Agree to values?"
          photoConsent: parseBoolean(row[15]), // Column P - "Media clearance?" (was swapped)
          newsletter: parseBoolean(row[16]),   // Column Q - "Subscribe to email?"
          // Add metadata for better tracking
          timestamp: row[0] || '',         // Column A - Registration timestamp
          rowIndex: index + 2,             // Actual row number in spreadsheet (accounting for header)
        };
      }).filter(registration => registration.playerName); // Only include registrations with player names
    } catch (error) {
      console.error('Error reading registrations from Google Sheets:', error);
      throw new Error('Failed to retrieve registrations from Google Sheets');
    }
  }

  // Event Registration Methods
  async addEventRegistration(data: EventRegistrationData): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Convert form data to row format for event registrations sheet
    const timestamp = new Date().toISOString();
    const values = [
      [
        data.eventId,
        data.playerName,
        data.playerGrade,
        data.additionalNotes || ''
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'event registrations!A:D', // Updated range for new format
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('Error writing event registration to Google Sheets:', error);
      throw new Error('Failed to save event registration to Google Sheets');
    }
  }

  async incrementEventParticipants(eventId: string): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('events');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets events ID not configured');
    }

    try {
      // Find the event and increment participants count
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'events!A:F',
      });

      const rows = response.data.values;
      if (!rows) {
        throw new Error('No events found');
      }

      const rowIndex = rows.findIndex(row => row[0] === eventId);
      if (rowIndex === -1) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      // Get current participant count and increment it
      const currentParticipants = parseInt(rows[rowIndex][5]) || 0;
      const newParticipants = currentParticipants + 1;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `events!F${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newParticipants]],
        },
      });
    } catch (error) {
      console.error('Error updating event participants:', error);
      throw new Error('Failed to update event participants count');
    }
  }


  // Get event registrations for a specific player
  async getEventRegistrationsByPlayer(playerName: string): Promise<Array<{
    eventId: string;
    playerName: string;
    playerGrade: string;
    additionalNotes: string;
    eventDetails?: EventData;
  }>> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'event registrations!A:D',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // Skip header row and filter by player name
      const playerRegistrations = rows.slice(1)
        .filter(row => row[1] === playerName) // Column B is player name
        .map(row => ({
          eventId: row[0] || '',
          playerName: row[1] || '',
          playerGrade: row[2] || '',
          additionalNotes: row[3] || ''
        }));

      // Get event details for each registration
      const events = await this.getEvents();
      const eventMap = new Map(events.map(event => [event.id, event]));

      return playerRegistrations.map(registration => ({
        ...registration,
        eventDetails: eventMap.get(registration.eventId)
      }));
    } catch (error) {
      console.error('Error reading event registrations from Google Sheets:', error);
      throw new Error('Failed to retrieve event registrations from Google Sheets');
    }
  }

  // Calculate rankings dynamically from games sheet
  async calculateRankingsFromGames(): Promise<PlayerData[]> {
    try {
      // Get all games
      const games = await this.getGames();
      
      // Get all registered players from members data
      const registrations = await this.getMembersFromParentsAndStudents();
      const members = registrations.map((registration, index) => ({
        ...registration,
        id: registration.rowIndex ? `reg_row_${registration.rowIndex}` : `member_${index + 1}`
      }));

      // Initialize player stats
      const playerStats = new Map<string, {
        id: string;
        name: string;
        grade: string;
        gamesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        points: number;
        rank?: number;
        lastActive: string;
        email: string;
      }>();

      // Initialize all registered players
      members.forEach(member => {
        playerStats.set(member.id, {
          id: member.id,
          name: member.playerName,
          grade: member.playerGrade,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          lastActive: member.timestamp || new Date().toISOString(),
          email: member.parentEmail || ''
        });
      });

      // Process each game to calculate stats
      games.forEach(game => {
        const player1Stats = playerStats.get(game.player1Id);
        const player2Stats = playerStats.get(game.player2Id);

        if (player1Stats && player2Stats) {
          // Both players played a game
          player1Stats.gamesPlayed += 1;
          player2Stats.gamesPlayed += 1;
          
          // Update last active
          const gameDate = new Date(game.gameDate);
          const player1LastActive = new Date(player1Stats.lastActive);
          const player2LastActive = new Date(player2Stats.lastActive);
          
          if (gameDate > player1LastActive) {
            player1Stats.lastActive = game.gameDate;
          }
          if (gameDate > player2LastActive) {
            player2Stats.lastActive = game.gameDate;
          }

          // Calculate points and stats based on result
          if (game.result === 'player1') {
            // Player 1 wins
            player1Stats.points += 2; // 1 for playing + 1 for winning
            player2Stats.points += 1; // 1 for playing
            player1Stats.wins += 1;
            player2Stats.losses += 1;
          } else if (game.result === 'player2') {
            // Player 2 wins
            player2Stats.points += 2; // 1 for playing + 1 for winning
            player1Stats.points += 1; // 1 for playing
            player2Stats.wins += 1;
            player1Stats.losses += 1;
          } else if (game.result === 'draw') {
            // Draw
            player1Stats.points += 1.5; // 1 for playing + 0.5 for drawing
            player2Stats.points += 1.5; // 1 for playing + 0.5 for drawing
            player1Stats.draws += 1;
            player2Stats.draws += 1;
          }
        }
      });

      // Convert to array and sort by points (descending), then wins (descending)
      const players = Array.from(playerStats.values()).sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.wins - a.wins;
      });

      // Assign ranks
      players.forEach((player, index) => {
        player.rank = index + 1;
      });

      return players;
    } catch (error) {
      console.error('Error calculating rankings from games:', error);
      throw new Error('Failed to calculate rankings from games');
    }
  }

  // Helper method to recalculate all player rankings based on points
  async recalculateRankings(): Promise<void> {
    // This method is now deprecated - rankings are calculated dynamically
    // Keeping for backward compatibility but it's a no-op
    console.log('recalculateRankings() called - rankings are now calculated dynamically from games');
  }

  // Batch update player ranks to reduce API calls
  async batchUpdatePlayerRanks(rankUpdates: Array<{id: string, rank: number}>): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Apply rate limiting
      await this.rateLimit();
      
      // Get all current player data in one call
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'rankings!A:K',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return;
      }

      // Create a map of player updates for quick lookup
      const updateMap = new Map(rankUpdates.map(update => [update.id, update.rank]));

      // Prepare batch update data
      const batchUpdates = [];
      const currentTime = new Date().toISOString();

      for (let i = 1; i < rows.length; i++) { // Skip header row
        const row = rows[i];
        const playerId = row[0];
        
        if (updateMap.has(playerId)) {
          const newRank = updateMap.get(playerId)!;
          
          // Update the rank and lastActive timestamp
          const updatedRow = [
            row[0], // ID
            row[1], // Name
            row[2], // Grade
            row[3], // Wins
            row[4], // Losses
            row[5], // Points
            newRank, // Rank (updated)
            currentTime, // Last Active (updated)
            row[8]  // Email
          ];

          batchUpdates.push({
            range: `rankings!A${i + 1}:I${i + 1}`,
            values: [updatedRow]
          });
        }
      }

      // Perform batch update if there are updates to make
      if (batchUpdates.length > 0) {
        // Apply rate limiting before batch update
        await this.rateLimit();
        
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: batchUpdates
          }
        });

        console.log(`✅ Batch updated ${batchUpdates.length} player rankings`);
      }
    } catch (error) {
      console.error('Error batch updating player ranks:', error);
      throw new Error('Failed to batch update player rankings');
    }
  }

  // Parent Account Management Methods
  async getParentAccount(email: string): Promise<ParentAccount | null> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:O',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return null;
      }

      // Find account by email (email is in column C, index 2)
      const accountRow = rows.slice(1).find(row => 
        row[2] && row[2].toLowerCase() === email.toLowerCase()
      );
      if (!accountRow) {
        return null;
      }

      // Get registration type from column N (index 13), fallback to inferring from other data
      let registrationType: 'parent' | 'self' = 'parent';
      let isSelfRegistered = false;
      
      if (accountRow[13]) {
        // Use explicit registration type if available
        registrationType = accountRow[13] as 'parent' | 'self';
        isSelfRegistered = registrationType === 'self';
      } else {
        // Fallback to old logic for existing data
        try {
          const students = await this.getStudentsByParentEmail(email);
          const parentName = accountRow[1] || ''; // Parent name is in column B, index 1
          isSelfRegistered = students.some(student => 
            student.name.toLowerCase() === parentName.toLowerCase()
          );
          registrationType = isSelfRegistered ? 'self' : 'parent';
        } catch (error) {
          console.error('Error checking if self-registered:', error);
          // Fallback to the createAccount column if we can't determine from student data
          isSelfRegistered = accountRow[11] === 'true';
          registrationType = isSelfRegistered ? 'self' : 'parent';
        }
      }

      return {
        id: accountRow[0] || '',
        email: accountRow[2] || '',
        createdDate: accountRow[12] || new Date().toISOString(), // Timestamp column
        lastLogin: new Date().toISOString(), // Will be updated on login
        isActive: true, // Assume active if exists in parents sheet
        isSelfRegistered,
        registrationType,
        isAdmin: accountRow[14] === 'true' || false // Column O (index 14) for admin status
      };
    } catch (error) {
      console.error('Error reading parent account from Google Sheets:', error);
      return null;
    }
  }

  async addParentAccount(account: ParentAccount): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    // Add row to parents sheet with the structure: ID, Name, Email, Phone, Hear About Us, Provincial Interest, 
    // Volunteer Interest, Consent, Photo Consent, Values Acknowledgment, Newsletter, Create Account, Timestamp, Registration Type, Is Admin
    const values = [
      [
        account.id,                    // ID
        '',                           // Name (empty for self-registered)
        account.email,                // Email
        '',                           // Phone (empty for self-registered)
        '',                           // Hear About Us (empty for self-registered)
        '',                           // Provincial Interest (empty for self-registered)
        '',                           // Volunteer Interest (empty for self-registered)
        '',                           // Consent (empty for self-registered)
        '',                           // Photo Consent (empty for self-registered)
        '',                           // Values Acknowledgment (empty for self-registered)
        '',                           // Newsletter (empty for self-registered)
        account.isSelfRegistered ? 'true' : 'false', // Create Account
        account.createdDate,          // Timestamp
        account.registrationType || (account.isSelfRegistered ? 'self' : 'parent'), // Registration Type
        account.isAdmin ? 'true' : 'false' // Is Admin
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'parents!A:O',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('Error adding parent account to Google Sheets:', error);
      throw new Error('Failed to add parent account to Google Sheets');
    }
  }

  async updateParentAccount(parentId: string, updates: Partial<ParentAccount>): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:N',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        throw new Error('Parent account not found');
      }

      // Find the row to update
      const rowIndex = rows.slice(1).findIndex(row => row[0] === parentId);
      if (rowIndex === -1) {
        throw new Error('Parent account not found');
      }

      const actualRowIndex = rowIndex + 2; // Account for header row and 0-based index
      const currentRow = rows[rowIndex + 1];

      // Apply updates to the parents sheet structure
      // Structure: ID, Name, Email, Phone, Hear About Us, Provincial Interest, 
      // Volunteer Interest, Consent, Photo Consent, Values Acknowledgment, Newsletter, Create Account, Timestamp, Registration Type
      const updatedRow = [
        currentRow[0], // ID (never changes)
        currentRow[1], // Name (unchanged)
        updates.email !== undefined ? updates.email : currentRow[2], // Email
        currentRow[3], // Phone (unchanged)
        currentRow[4], // Hear About Us (unchanged)
        currentRow[5], // Provincial Interest (unchanged)
        currentRow[6], // Volunteer Interest (unchanged)
        currentRow[7], // Consent (unchanged)
        currentRow[8], // Photo Consent (unchanged)
        currentRow[9], // Values Acknowledgment (unchanged)
        currentRow[10], // Newsletter (unchanged)
        updates.isSelfRegistered !== undefined ? (updates.isSelfRegistered ? 'true' : 'false') : (currentRow[11] || 'false'), // Create Account
        updates.createdDate !== undefined ? updates.createdDate : currentRow[12], // Timestamp
        updates.registrationType !== undefined ? updates.registrationType : (currentRow[13] || 'parent') // Registration Type
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `parents!A${actualRowIndex}:N${actualRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRow],
        },
      });
    } catch (error) {
      console.error('Error updating parent account in Google Sheets:', error);
      throw new Error('Failed to update parent account in Google Sheets');
    }
  }


  async getStudentsByParentId(parentId: string): Promise<StudentData[]> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'students!A:I',
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      return rows.slice(1)
        .filter(row => row[1] === parentId) // parentId matches
        .map(row => ({
          id: row[0] || '',
          parentId: row[1] || '',
          name: row[2] || '',
          age: row[3] || '',
          grade: row[4] || '',
          emergencyContact: row[5] || '',
          emergencyPhone: row[6] || '',
          medicalInfo: row[7] || '',
          timestamp: row[8] || ''
        }));
    } catch (error) {
      console.error('Error getting students by parent ID from Google Sheets:', error);
      throw new Error('Failed to get students by parent ID from Google Sheets');
    }
  }

  async getAllStudents(): Promise<StudentData[]> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'students!A:I',
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      const students = rows.slice(1).map(row => ({
        id: row[0] || '',
        parentId: row[1] || '',
        name: row[2] || '',
        age: row[3] || '',
        grade: row[4] || '',
        emergencyContact: row[5] || '',
        emergencyPhone: row[6] || '',
        medicalInfo: row[7] || '',
        timestamp: row[8] || ''
      }));

      // Deduplicate students by ID, keeping the most recent entry (highest timestamp)
      const studentMap = new Map<string, StudentData>();
      
      for (const student of students) {
        if (!student.id) continue; // Skip students without IDs
        
        const existing = studentMap.get(student.id);
        if (!existing || (student.timestamp && student.timestamp > existing.timestamp)) {
          studentMap.set(student.id, student);
        }
      }

      return Array.from(studentMap.values());
    } catch (error) {
      console.error('Error getting all students from Google Sheets:', error);
      throw new Error('Failed to get all students from Google Sheets');
    }
  }

  async getStudentsByParentEmail(parentEmail: string): Promise<StudentData[]> {
    try {
      // First, get the parent by email to find their ID
      const parent = await this.getParentByEmail(parentEmail);
      if (!parent) {
        return []; // No parent found with this email
      }

      // Then get students using the parent ID
      return await this.getStudentsByParentId(parent.id);
    } catch (error) {
      console.error('Error getting students by parent email from Google Sheets:', error);
      throw new Error('Failed to get students by parent email from Google Sheets');
    }
  }

  async getParentByEmail(email: string): Promise<ParentData | null> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:N',
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return null;
      }

      // Find parent by email
      const parentRow = rows.slice(1).find(row => 
        row[2] && row[2].toLowerCase() === email.toLowerCase()
      );
      
      if (!parentRow) {
        return null;
      }

      return {
        id: parentRow[0] || '',
        name: parentRow[1] || '',
        email: parentRow[2] || '',
        phone: parentRow[3] || '',
        hearAboutUs: parentRow[4] || '',
        provincialInterest: parentRow[5] || '',
        volunteerInterest: parentRow[6] || '',
        consent: parentRow[7] === 'Yes',
        photoConsent: parentRow[8] === 'Yes',
        valuesAcknowledgment: parentRow[9] === 'Yes',
        newsletter: parentRow[10] === 'Yes',
        createAccount: parentRow[11] === 'Yes',
        timestamp: parentRow[12] || '',
        registrationType: (parentRow[13] as 'parent' | 'self') || 'parent'
      };
    } catch (error) {
      console.error('Error getting parent by email from Google Sheets:', error);
      throw new Error('Failed to get parent by email from Google Sheets');
    }
  }

  async getParentPlayers(parentAccountId: string): Promise<PlayerOwnershipData[]> {
    // Get all players owned by this parent account
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    try {
      const ownershipResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'player_ownership!A:G',
      });

      const ownershipRows = ownershipResponse.data.values;
      if (!ownershipRows || ownershipRows.length <= 1) {
        return [];
      }

      // Find all players owned by this parent account
      const ownedPlayers = ownershipRows.slice(1)
        .filter(row => row[3] === parentAccountId) // ownerParentId matches parent account ID
        .map(row => ({
          playerId: row[0],
          playerName: row[1],
          parentEmail: row[2]
        }));

      if (ownedPlayers.length === 0) {
        return [];
      }

      // Get student data for these players from the students sheet
      const studentsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'students!A:I',
      });

      const studentRows = studentsResponse.data.values;
      if (!studentRows || studentRows.length < 2) {
        return [];
      }

      // Map student data by player ID
      const studentDataMap = new Map();
      studentRows.slice(1).forEach(row => {
        if (row[0]) { // playerId
          studentDataMap.set(row[0], {
            id: row[0],
            parentId: row[1],
            name: row[2],
            age: row[3],
            grade: row[4],
            emergencyContact: row[5],
            emergencyPhone: row[6],
            medicalInfo: row[7],
            timestamp: row[8]
          });
        }
      });

      // Combine ownership data with student data
      return ownedPlayers
        .map(ownedPlayer => {
          const studentData = studentDataMap.get(ownedPlayer.playerId);
          if (!studentData) {
            console.warn(`Student data not found for player ${ownedPlayer.playerId}`);
            return null;
          }

          return {
            parentName: '', // Will be filled from parent data if needed
            parentEmail: ownedPlayer.parentEmail,
            parentPhone: '', // Will be filled from parent data if needed
            playerName: studentData.name,
            playerAge: studentData.age,
            playerGrade: studentData.grade,
            emergencyContact: studentData.emergencyContact,
            emergencyPhone: studentData.emergencyPhone,
            medicalInfo: studentData.medicalInfo,
            hearAboutUs: '', // Will be filled from parent data if needed
            provincialInterest: '', // Will be filled from parent data if needed
            volunteerInterest: '', // Will be filled from parent data if needed
            consent: false, // Will be filled from parent data if needed
            photoConsent: false, // Will be filled from parent data if needed
            valuesAcknowledgment: false, // Will be filled from parent data if needed
            newsletter: false, // Will be filled from parent data if needed
            timestamp: studentData.timestamp,
            playerId: studentData.id,
            parentAccountId: parentAccountId
          };
        })
        .filter(player => player !== null);
    } catch (error) {
      console.error('Error getting parent players from Google Sheets:', error);
      throw new Error('Failed to get parent players from Google Sheets');
    }
  }



  // Initialize parent account and player ownership sheets

  // Game Management Methods
  async addGame(gameData: any): Promise<string> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const gameRow = [
        gameId,
        gameData.player1Id,
        gameData.player1Name,
        gameData.player2Id,
        gameData.player2Name,
        gameData.result,
        gameData.gameDate,
        gameData.gameTime,
        gameData.gameType,
        gameData.eventId || '',
        gameData.notes || '',
        gameData.recordedBy,
        gameData.recordedAt,
        gameData.opening || '',
        gameData.endgame || '',
        gameData.ratingChange ? JSON.stringify(gameData.ratingChange) : '',
        gameData.isVerified,
        gameData.verifiedBy || '',
        gameData.verifiedAt || ''
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'games!A:S',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [gameRow]
        }
      });

      console.log('✅ Game added successfully:', gameId);
      return gameId;
    } catch (error) {
      console.error('❌ Failed to add game:', error);
      throw error;
    }
  }

  async getGames(filters?: any): Promise<any[]> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'games!A:S',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // Skip header row and convert to GameData objects
      let games = rows.slice(1).map((row, index) => ({
        id: row[0] || `game_${index}`,
        player1Id: row[1] || '',
        player1Name: row[2] || '',
        player2Id: row[3] || '',
        player2Name: row[4] || '',
        result: row[5] as 'player1' | 'player2' | 'draw',
        gameDate: row[6] || '',
        gameTime: parseInt(row[7]) || 0,
        gameType: row[8] as 'ladder' | 'tournament' | 'friendly' | 'practice',
        eventId: row[9] || undefined,
        notes: row[10] || undefined,
        recordedBy: row[11] || '',
        recordedAt: row[12] || '',
        opening: row[13] || undefined,
        endgame: row[14] || undefined,
        ratingChange: row[15] ? JSON.parse(row[15]) : undefined,
        isVerified: row[16] === 'true',
        verifiedBy: row[17] || undefined,
        verifiedAt: row[18] || undefined
      })).filter(game => game.id);

      // Apply filters if provided
      if (filters) {
        if (filters.playerId) {
          games = games.filter(game => 
            game.player1Id === filters.playerId || game.player2Id === filters.playerId
          );
        }
        if (filters.gameType) {
          games = games.filter(game => game.gameType === filters.gameType);
        }
        if (filters.dateFrom) {
          games = games.filter(game => game.gameDate >= filters.dateFrom);
        }
        if (filters.dateTo) {
          games = games.filter(game => game.gameDate <= filters.dateTo);
        }
        if (filters.result) {
          games = games.filter(game => game.result === filters.result);
        }
        if (filters.eventId) {
          games = games.filter(game => game.eventId === filters.eventId);
        }
        if (filters.isVerified !== undefined) {
          games = games.filter(game => game.isVerified === filters.isVerified);
        }
      }

      // Sort by date (newest first)
      return games.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
    } catch (error) {
      console.error('Error reading games from Google Sheets:', error);
      throw new Error('Failed to retrieve games from Google Sheets');
    }
  }

  async getPlayerGames(playerId: string): Promise<any[]> {
    return this.getGames({ playerId });
  }

  async updateGame(gameId: string, updates: any): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Get all games to find the row number
      const games = await this.getGames();
      const gameIndex = games.findIndex(game => game.id === gameId);
      
      if (gameIndex === -1) {
        throw new Error('Game not found');
      }

      // Convert updates to array format for Google Sheets
      const gameRow = [
        gameId,
        updates.player1Id || '',
        updates.player1Name || '',
        updates.player2Id || '',
        updates.player2Name || '',
        updates.result || '',
        updates.gameDate || '',
        updates.gameTime || 0,
        updates.gameType || '',
        updates.eventId || '',
        updates.notes || '',
        updates.recordedBy || '',
        updates.recordedAt || '',
        updates.opening || '',
        updates.endgame || '',
        updates.ratingChange ? JSON.stringify(updates.ratingChange) : '',
        updates.isVerified || false,
        updates.verifiedBy || '',
        updates.verifiedAt || ''
      ];

      // Update the specific row (add 2 to account for header row and 0-based indexing)
      const rowNumber = gameIndex + 2;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `games!A${rowNumber}:S${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [gameRow]
        }
      });

      console.log('✅ Game updated successfully:', gameId);
    } catch (error) {
      console.error('❌ Failed to update game:', error);
      throw error;
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Get all games to find the row number
      const games = await this.getGames();
      const gameIndex = games.findIndex(game => game.id === gameId);
      
      if (gameIndex === -1) {
        throw new Error('Game not found');
      }

      // Delete the specific row (add 2 to account for header row and 0-based indexing)
      const rowNumber = gameIndex + 2;
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming games sheet is the first sheet
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber
              }
            }
          }]
        }
      });

      console.log('✅ Game deleted successfully:', gameId);
    } catch (error) {
      console.error('❌ Failed to delete game:', error);
      throw error;
    }
  }

  async getGameStats(): Promise<any> {
    try {
      const games = await this.getGames();
      
      if (games.length === 0) {
        return {
          totalGames: 0,
          gamesThisMonth: 0,
          gamesThisWeek: 0,
          ladderGames: 0,
          tournamentGames: 0,
          friendlyGames: 0,
          practiceGames: 0,
          averageGameTime: 0,
          mostActivePlayer: 'N/A',
          recentGames: []
        };
      }

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calculate statistics
      const totalGames = games.length;
      const gamesThisMonth = games.filter(game => new Date(game.gameDate) >= thisMonth).length;
      const gamesThisWeek = games.filter(game => new Date(game.gameDate) >= thisWeek).length;
      
      const ladderGames = games.filter(game => game.gameType === 'ladder').length;
      const tournamentGames = games.filter(game => game.gameType === 'tournament').length;
      const friendlyGames = games.filter(game => game.gameType === 'friendly').length;
      const practiceGames = games.filter(game => game.gameType === 'practice').length;
      
      const totalGameTime = games.reduce((sum, game) => sum + (game.gameTime || 0), 0);
      const averageGameTime = totalGames > 0 ? Math.round(totalGameTime / totalGames) : 0;

      // Find most active player
      const playerGameCounts: { [key: string]: number } = {};
      games.forEach(game => {
        if (game.player1Name) {
          playerGameCounts[game.player1Name] = (playerGameCounts[game.player1Name] || 0) + 1;
        }
        if (game.player2Name) {
          playerGameCounts[game.player2Name] = (playerGameCounts[game.player2Name] || 0) + 1;
        }
      });
      
      const mostActivePlayer = Object.keys(playerGameCounts).reduce((a, b) => 
        playerGameCounts[a] > playerGameCounts[b] ? a : b, 'N/A'
      );

      // Get recent games (already sorted by date in getGames)
      const recentGames = games.slice(0, 10);

      return {
        totalGames,
        gamesThisMonth,
        gamesThisWeek,
        ladderGames,
        tournamentGames,
        friendlyGames,
        practiceGames,
        averageGameTime,
        mostActivePlayer,
        recentGames
      };
    } catch (error) {
      console.error('Error calculating game stats:', error);
      throw new Error('Failed to calculate game statistics');
    }
  }

  async getPlayerGameStats(playerId: string): Promise<any> {
    try {
      const playerGames = await this.getPlayerGames(playerId);
      
      if (playerGames.length === 0) {
        return {
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          gamesThisMonth: 0,
          gamesThisWeek: 0,
          ladderGames: 0,
          tournamentGames: 0,
          friendlyGames: 0,
          practiceGames: 0,
          averageGameTime: 0,
          recentGames: []
        };
      }

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calculate player-specific statistics
      const totalGames = playerGames.length;
      const gamesThisMonth = playerGames.filter(game => new Date(game.gameDate) >= thisMonth).length;
      const gamesThisWeek = playerGames.filter(game => new Date(game.gameDate) >= thisWeek).length;
      
      const ladderGames = playerGames.filter(game => game.gameType === 'ladder').length;
      const tournamentGames = playerGames.filter(game => game.gameType === 'tournament').length;
      const friendlyGames = playerGames.filter(game => game.gameType === 'friendly').length;
      const practiceGames = playerGames.filter(game => game.gameType === 'practice').length;
      
      const totalGameTime = playerGames.reduce((sum, game) => sum + (game.gameTime || 0), 0);
      const averageGameTime = totalGames > 0 ? Math.round(totalGameTime / totalGames) : 0;

      // Calculate wins, losses, draws
      let wins = 0, losses = 0, draws = 0;
      playerGames.forEach(game => {
        if (game.result === 'draw') {
          draws++;
        } else if (
          (game.result === 'player1' && game.player1Id === playerId) ||
          (game.result === 'player2' && game.player2Id === playerId)
        ) {
          wins++;
        } else {
          losses++;
        }
      });

      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      // Get recent games (already sorted by date in getGames)
      const recentGames = playerGames.slice(0, 10);

      return {
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        gamesThisMonth,
        gamesThisWeek,
        ladderGames,
        tournamentGames,
        friendlyGames,
        practiceGames,
        averageGameTime,
        recentGames
      };
    } catch (error) {
      console.error('Error calculating player game stats:', error);
      throw new Error('Failed to calculate player game statistics');
    }
  }

  async setupParentsAdminColumn(): Promise<{ message: string; headers: string[]; rowsUpdated: number }> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Check if admin column already exists by reading the headers
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!1:1',
      });

      const headers = response.data.values?.[0] || [];
      const hasAdminColumn = headers.includes('Is Admin');

      if (hasAdminColumn) {
        return {
          message: 'Admin column already exists in parents sheet',
          headers: headers,
          rowsUpdated: 0
        };
      }

      // Add the admin column header
      const updatedHeaders = [...headers, 'Is Admin'];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'parents!1:1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedHeaders]
        }
      });

      // Add 'false' to all existing rows for the admin column
      const allRowsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:O',
      });

      const rows = allRowsResponse.data.values || [];
      let rowsUpdated = 0;
      
      if (rows.length > 1) {
        // Update existing rows to add 'false' for admin column
        const updatePromises = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 15) { // If row doesn't have admin column yet
            const updatedRow = [...row, 'false'];
            updatePromises.push(
            this.sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `parents!A${i + 1}:O${i + 1}`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [updatedRow]
              }
            })
            );
            rowsUpdated++;
          }
        }
        
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }

      console.log('✅ Admin column added to parents sheet');
      return {
        message: 'Admin column added successfully to parents sheet',
        headers: updatedHeaders,
        rowsUpdated
      };
    } catch (error) {
      console.error('❌ Failed to setup admin column:', error);
      throw error;
    }
  }

  async initializeGamesSheet(): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Check if games sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      const gamesSheetExists = spreadsheet.data.sheets?.some(
        sheet => sheet.properties?.title === 'games'
      );

      if (!gamesSheetExists) {
        // Create games sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'games',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 19
                  }
                }
              }
            }]
          }
        });

        // Add headers
        const headers = [
          'Game ID',
          'Player 1 ID',
          'Player 1 Name',
          'Player 2 ID',
          'Player 2 Name',
          'Result',
          'Game Date',
          'Game Time (min)',
          'Game Type',
          'Event ID',
          'Notes',
          'Recorded By',
          'Recorded At',
          'Opening',
          'Endgame',
          'Rating Change',
          'Is Verified',
          'Verified By',
          'Verified At'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'games!A1:S1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });

        console.log('✅ Games sheet initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize games sheet:', error);
      throw error;
    }
  }

  // NEW CONSOLIDATED METHOD: Get members data from parents and students sheets
  async getMembersFromParentsAndStudents(): Promise<RegistrationData[]> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets ID not configured');
    }

    try {
      // Get all parents and students data in parallel
      const [parentsResponse, studentsResponse] = await Promise.all([
        this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'parents!A:N',
        }),
        this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'students!A:I',
        })
      ]);

      const parentRows = parentsResponse.data.values;
      const studentRows = studentsResponse.data.values;

      if (!parentRows || parentRows.length < 2 || !studentRows || studentRows.length < 2) {
        return [];
      }

      // Create parent lookup map
      const parentMap = new Map();
      parentRows.slice(1).forEach(row => {
        if (row[0]) { // parent ID
          parentMap.set(row[0], {
            id: row[0],
            name: row[1] || '',
            email: row[2] || '',
            phone: row[3] || '',
            hearAboutUs: row[4] || '',
            provincialInterest: row[5] || '',
            volunteerInterest: row[6] || '',
            consent: row[7] === 'Yes',
            photoConsent: row[8] === 'Yes',
            valuesAcknowledgment: row[9] === 'Yes',
            newsletter: row[10] === 'Yes',
            createAccount: row[11] === 'Yes',
            timestamp: row[12] || '',
            registrationType: (row[13] as 'parent' | 'self') || 'parent'
          });
        }
      });

      // Convert students to RegistrationData format by joining with parent data
      const members: RegistrationData[] = [];
      studentRows.slice(1).forEach((row, index) => {
        if (row[0] && row[1]) { // student ID and parent ID
          const parent = parentMap.get(row[1]);
          if (parent) {
            members.push({
              parentName: parent.name,
              parentEmail: parent.email,
              parentPhone: parent.phone,
              playerName: row[2] || '',
              playerAge: row[3] || '',
              playerGrade: row[4] || '',
              emergencyContact: row[5] || '',
              emergencyPhone: row[6] || '',
              medicalInfo: row[7] || '',
              hearAboutUs: parent.hearAboutUs,
              provincialInterest: parent.provincialInterest,
              volunteerInterest: parent.volunteerInterest,
              consent: parent.consent,
              photoConsent: parent.photoConsent,
              valuesAcknowledgment: parent.valuesAcknowledgment,
              newsletter: parent.newsletter,
              timestamp: row[8] || parent.timestamp,
              rowIndex: index + 2 // Approximate row number
            });
          }
        }
      });

      return members.filter(member => member.playerName); // Only include valid members
    } catch (error) {
      console.error('Error reading members from parents and students sheets:', error);
      throw new Error('Failed to retrieve members from parents and students sheets');
    }
  }

}

export const googleSheetsService = new GoogleSheetsService();

// Re-export types for backward compatibility
export type { 
  RegistrationData, 
  EventData, 
  EventRegistrationData, 
  PlayerData, 
  ParentAccount, 
  PlayerOwnership, 
  PlayerOwnershipData,
  ParentRegistrationData,
  StudentRegistrationData,
  SelfRegistrationData,
  ParentData,
  StudentData
} from './types';
