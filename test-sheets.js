const { google } = require('googleapis');

async function testSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      projectId: 'poetic-chariot-470917-k3',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1UXg4FVsE33IBmk6SkwfvZSV1XlDJ_5csihhye90IVac';

    console.log('Testing Google Sheets access...');
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    console.log('Spreadsheet title:', response.data.properties.title);
    console.log('Available sheets:');
    response.data.sheets.forEach(sheet => {
      console.log('- Sheet name:', sheet.properties.title);
    });

    console.log('Success! Can access Google Sheets.');
    
  } catch (error) {
    console.error('Error accessing Google Sheets:', error.message);
  }
}

testSheets();
