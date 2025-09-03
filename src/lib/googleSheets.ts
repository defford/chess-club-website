import { google } from 'googleapis';

interface RegistrationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: string;
  childGrade: string;
  experience: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  consent: boolean;
  photoConsent: boolean;
  newsletter: boolean;
}

interface EventData {
  id?: string;
  name: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  maxParticipants: number;
  description: string;
  category: 'tournament' | 'workshop' | 'training' | 'social';
  ageGroups: string;
  status?: 'active' | 'cancelled' | 'completed';
  lastUpdated?: string;
}

interface PlayerData {
  id?: string;
  name: string;
  grade: string;
  wins: number;
  losses: number;
  points: number;
  rank?: number;
  lastActive: string;
  email?: string;
}

export class GoogleSheetsService {
  private sheets;
  private auth;

  constructor() {
    // Initialize Google Sheets API with Application Default Credentials (ADC)
    // This will use gcloud credentials or service account when deployed
    this.auth = new google.auth.GoogleAuth({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'poetic-chariot-470917-k3',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
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
        data.childName,
        data.childAge,
        data.childGrade,
        data.experience,
        data.emergencyContact,
        data.emergencyPhone,
        data.medicalInfo,
        data.consent ? 'Yes' : 'No',
        data.photoConsent ? 'Yes' : 'No',
        data.newsletter ? 'Yes' : 'No'
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'registrations!A:N', // Using the actual sheet name
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

  async initializeSheet(): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets registration ID not configured');
    }

    // Check if headers exist, if not, create them
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'registrations!A1:N1',
      });

      // If no data or wrong headers, set up the header row
      if (!response.data.values || response.data.values.length === 0) {
        const headers = [
          'Timestamp',
          'Parent Name',
          'Parent Email',
          'Parent Phone',
          'Child Name',
          'Child Age',
          'Child Grade',
          'Chess Experience',
          'Emergency Contact',
          'Emergency Phone',
          'Medical Info',
          'Participation Consent',
          'Photo Consent',
          'Newsletter Subscription'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'registrations!A1:N1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw new Error('Failed to initialize Google Sheets');
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

  async initializeEventsSheet(): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('events');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets events ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'events!A1:L1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        const headers = [
          'ID',
          'Name',
          'Date',
          'Time',
          'Location',
          'Participants',
          'Max Participants',
          'Description',
          'Category',
          'Age Groups',
          'Status',
          'Last Updated'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'events!A1:L1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      console.error('Error initializing events sheet:', error);
      throw new Error('Failed to initialize events sheet');
    }
  }

  // Rankings/Ladder Management Methods
  async getPlayers(): Promise<PlayerData[]> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets rankings ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'rankings!A:H',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // Skip header row and convert to PlayerData objects
      return rows.slice(1).map((row, index) => ({
        id: row[0] || String(index + 1),
        name: row[1] || '',
        grade: row[2] || '',
        wins: parseInt(row[3]) || 0,
        losses: parseInt(row[4]) || 0,
        points: parseInt(row[5]) || 0,
        rank: parseInt(row[6]) || index + 1,
        lastActive: row[7] || new Date().toISOString(),
        email: row[8] || '',
      })).filter(player => player.name).sort((a, b) => (a.rank || 999) - (b.rank || 999));
    } catch (error) {
      console.error('Error reading players from Google Sheets:', error);
      throw new Error('Failed to retrieve players from Google Sheets');
    }
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
        player.wins,
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
        range: 'rankings!A:I',
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
        range: `rankings!A${rowIndex + 1}:I${rowIndex + 1}`,
      });

      const currentRow = currentPlayerResponse.data.values?.[0] || [];
      
      // Merge updates with current data
      const updatedRow = [
        playerId, // ID stays the same
        updates.name ?? currentRow[1],
        updates.grade ?? currentRow[2],
        updates.wins ?? currentRow[3],
        updates.losses ?? currentRow[4],
        updates.points ?? currentRow[5],
        updates.rank ?? currentRow[6],
        updates.lastActive ?? new Date().toISOString(),
        updates.email ?? currentRow[8]
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `rankings!A${rowIndex + 1}:I${rowIndex + 1}`,
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

  async initializeRankingsSheet(): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId('rankings');
    
    if (!spreadsheetId) {
      throw new Error('Google Sheets rankings ID not configured');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'rankings!A1:I1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        const headers = [
          'ID',
          'Name',
          'Grade',
          'Wins',
          'Losses',
          'Points',
          'Rank',
          'Last Active',
          'Email'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'rankings!A1:I1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      console.error('Error initializing rankings sheet:', error);
      throw new Error('Failed to initialize rankings sheet');
    }
  }

  // Helper method to recalculate all player rankings based on points
  async recalculateRankings(): Promise<void> {
    const players = await this.getPlayers();
    
    // Sort by points (descending), then by wins (descending) for tiebreaker
    const sortedPlayers = players.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.wins - a.wins;
    });

    // Update rankings
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      if (player.id && player.rank !== i + 1) {
        await this.updatePlayer(player.id, { rank: i + 1 });
      }
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();

// Export interfaces for use in other files
export type { RegistrationData, EventData, PlayerData };
