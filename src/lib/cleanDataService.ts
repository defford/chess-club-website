import { googleSheetsService } from './googleSheets';

// Clean, normalized interfaces for the new structure
export interface CleanMemberData {
  memberId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  hearAboutUs: string;
  provincialInterest: string;
  volunteerInterest: string;
  consent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  createAccount: boolean;
  registrationDate: string;
  isActive: boolean;
  parentLoginEnabled: boolean;
}

export interface ParentSession {
  sessionId: string;
  parentEmail: string;
  createdDate: string;
  lastLogin: string;
  isActive: boolean;
}

export interface PlayerWithRanking extends CleanMemberData {
  ranking?: {
    rank: number;
    points: number;
    wins: number;
    losses: number;
    lastActive: string;
  } | null;
}

export class CleanDataService {
  
  // Initialize the new clean structure
  async initializeCleanStructure(): Promise<void> {
    try {
      // Create members sheet
      await this.createMembersSheet();
      
      // Create parent sessions sheet  
      await this.createParentSessionsSheet();
      
      console.log('✅ Clean data structure initialized');
    } catch (error) {
      console.error('❌ Failed to initialize clean structure:', error);
      throw error;
    }
  }

  // Helper to get sheets instance
  private getSheetsInstance() {
    // Access the sheets instance through the service
    return (googleSheetsService as any).sheets;
  }

  // Create the consolidated members sheet
  private async createMembersSheet(): Promise<void> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');

    const sheets = this.getSheetsInstance();
    
    try {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'members',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 21
                }
              }
            }
          }]
        }
      });

      // Add headers
      const headers = [
        'Member ID',
        'Parent Name', 
        'Parent Email',
        'Parent Phone',
        'Player Name',
        'Player Age',
        'Player Grade', 
        'Emergency Contact',
        'Emergency Phone',
        'Medical Info',
        'Hear About Us',
        'Provincial Interest',
        'Volunteer Interest',
        'Consent',
        'Photo Consent',
        'Values Acknowledgment',
        'Newsletter',
        'Create Account',
        'Registration Date',
        'Is Active',
        'Parent Login Enabled'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'members!A1:U1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      console.log('✅ Members sheet created');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️ Members sheet already exists');
      } else {
        throw error;
      }
    }
  }

  // Create the simplified parent sessions sheet
  private async createParentSessionsSheet(): Promise<void> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');

    const sheets = this.getSheetsInstance();
    
    try {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'parent_sessions',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 5
                }
              }
            }
          }]
        }
      });

      // Add headers
      const headers = [
        'Session ID',
        'Parent Email',
        'Created Date', 
        'Last Login',
        'Is Active'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'parent_sessions!A1:E1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      console.log('✅ Parent sessions sheet created');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️ Parent sessions sheet already exists');
      } else {
        throw error;
      }
    }
  }

  // Populate members sheet from registrations (SAFE - read-only)
  async populateMembersFromRegistrations(): Promise<void> {
    try {
      console.log('📖 Reading from registrations sheet...');
      
      // Get all registration data (our source of truth)
      const registrations = await googleSheetsService.getRegistrations();
      
      console.log(`📊 Found ${registrations.length} registrations to process`);

      // Convert to clean member format
      const cleanMembers: CleanMemberData[] = registrations.map((reg, index) => ({
        memberId: `member_${reg.rowIndex || index + 1}`,
        parentName: reg.parentName || '',
        parentEmail: reg.parentEmail || '',
        parentPhone: reg.parentPhone || '',
        playerName: reg.playerName || '',
        playerAge: reg.playerAge || '',
        playerGrade: reg.playerGrade || '',
        emergencyContact: reg.emergencyContact || '',
        emergencyPhone: reg.emergencyPhone || '',
        medicalInfo: reg.medicalInfo || '',
        hearAboutUs: reg.hearAboutUs || '',
        provincialInterest: reg.provincialInterest || '',
        volunteerInterest: reg.volunteerInterest || '',
        consent: reg.consent || false,
        photoConsent: reg.photoConsent || false,
        valuesAcknowledgment: reg.valuesAcknowledgment || false,
        newsletter: reg.newsletter || false,
        createAccount: false, // Default for migrated data
        registrationDate: this.parseRegistrationDate(reg.timestamp),
        isActive: true,
        parentLoginEnabled: false
      }));

      // Write to members sheet
      await this.writeMembersData(cleanMembers);
      
      console.log(`✅ Successfully populated ${cleanMembers.length} members`);
    } catch (error) {
      console.error('❌ Failed to populate members:', error);
      throw error;
    }
  }

  // Write clean member data to the members sheet (replaces all data)
  private async writeMembersData(members: CleanMemberData[]): Promise<void> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');

    const sheets = this.getSheetsInstance();

    // Convert to rows
    const rows = members.map(member => [
      member.memberId,
      member.parentName,
      member.parentEmail, 
      member.parentPhone,
      member.playerName,
      member.playerAge,
      member.playerGrade,
      member.emergencyContact,
      member.emergencyPhone,
      member.medicalInfo,
      member.hearAboutUs,
      member.provincialInterest,
      member.volunteerInterest,
      member.consent ? 'TRUE' : 'FALSE',
      member.photoConsent ? 'TRUE' : 'FALSE',
      member.valuesAcknowledgment ? 'TRUE' : 'FALSE',
      member.newsletter ? 'TRUE' : 'FALSE',
      member.createAccount ? 'TRUE' : 'FALSE',
      member.registrationDate,
      member.isActive ? 'TRUE' : 'FALSE',
      member.parentLoginEnabled ? 'TRUE' : 'FALSE'
    ]);

    // Clear existing data (except headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'members!A2:U1000'
    });

    // Write new data
    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `members!A2:U${rows.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });
    }
  }

  // Add a single new member to the clean structure
  async addMemberToCleanStructure(member: CleanMemberData): Promise<void> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');

    const sheets = this.getSheetsInstance();

    // Convert member to row format
    const row = [
      member.memberId,
      member.parentName,
      member.parentEmail, 
      member.parentPhone,
      member.playerName,
      member.playerAge,
      member.playerGrade,
      member.emergencyContact,
      member.emergencyPhone,
      member.medicalInfo,
      member.hearAboutUs,
      member.provincialInterest,
      member.volunteerInterest,
      member.consent ? 'TRUE' : 'FALSE',
      member.photoConsent ? 'TRUE' : 'FALSE',
      member.valuesAcknowledgment ? 'TRUE' : 'FALSE',
      member.newsletter ? 'TRUE' : 'FALSE',
      member.createAccount ? 'TRUE' : 'FALSE',
      member.registrationDate,
      member.isActive ? 'TRUE' : 'FALSE',
      member.parentLoginEnabled ? 'TRUE' : 'FALSE'
    ];

    try {
      // Append to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'members!A:U',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [row]
        }
      });
    } catch (error) {
      console.error('❌ Failed to add member to clean structure:', error);
      throw error;
    }
  }

  // Get clean member data with rankings
  async getMembersWithRankings(): Promise<PlayerWithRanking[]> {
    try {
      // Get members and rankings in parallel
      const [members, rankings] = await Promise.all([
        this.getCleanMembers(),
        googleSheetsService.getPlayers()
      ]);

      // Create rankings lookup map
      const rankingsMap = new Map(
        rankings.map(ranking => [
          ranking.name.toLowerCase().trim(),
          ranking
        ])
      );

      // Combine members with rankings
      return members.map(member => {
        const ranking = rankingsMap.get(member.playerName.toLowerCase().trim());
        
        return {
          ...member,
          ranking: ranking ? {
            rank: ranking.rank || 999,
            points: ranking.points || 0,
            wins: ranking.wins || 0,
            losses: ranking.losses || 0,
            lastActive: ranking.lastActive || ''
          } : null
        };
      });
    } catch (error) {
      console.error('❌ Failed to get members with rankings:', error);
      throw error;
    }
  }

  // Get clean member data
  async getCleanMembers(): Promise<CleanMemberData[]> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) throw new Error('Spreadsheet ID not configured');

    const sheets = this.getSheetsInstance();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'members!A:U'
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      return rows.slice(1).map(row => ({
        memberId: row[0] || '',
        parentName: row[1] || '',
        parentEmail: row[2] || '',
        parentPhone: row[3] || '',
        playerName: row[4] || '',
        playerAge: row[5] || '',
        playerGrade: row[6] || '',
        emergencyContact: row[7] || '',
        emergencyPhone: row[8] || '',
        medicalInfo: row[9] || '',
        hearAboutUs: row[10] || '',
        provincialInterest: row[11] || '',
        volunteerInterest: row[12] || '',
        consent: row[13] === 'TRUE',
        photoConsent: row[14] === 'TRUE',
        valuesAcknowledgment: row[15] === 'TRUE',
        newsletter: row[16] === 'TRUE',
        createAccount: row[17] === 'TRUE',
        registrationDate: row[18] || '',
        isActive: row[19] === 'TRUE',
        parentLoginEnabled: row[20] === 'TRUE'
      })).filter(member => member.playerName); // Only include valid members
    } catch (error) {
      console.error('❌ Failed to get clean members:', error);
      throw error;
    }
  }

  // Get members by parent email
  async getMembersByParentEmail(parentEmail: string): Promise<PlayerWithRanking[]> {
    const allMembers = await this.getMembersWithRankings();
    return allMembers.filter(member => 
      member.parentEmail.toLowerCase() === parentEmail.toLowerCase()
    );
  }

  // Utility: Parse registration date
  private parseRegistrationDate(timestamp?: string): string {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 
        new Date().toISOString().split('T')[0] : 
        date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }
}

export const cleanDataService = new CleanDataService();
