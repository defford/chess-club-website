/**
 * Google Apps Script for Chess Club Website
 * 
 * This script sends webhook notifications to your Vercel app whenever
 * data in the spreadsheet is modified.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheets
 * 2. Click Extensions → Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Update the configuration below with your values
 * 5. Save the project (Ctrl+S or Cmd+S)
 * 6. Click "Deploy" → "New Deployment"
 * 7. Choose "Web app" as the type
 * 8. Set "Execute as" to "Me"
 * 9. Set "Who has access" to "Anyone"
 * 10. Click "Deploy" and authorize the script
 * 11. Set up the trigger by running setupTrigger() function once
 */

// CONFIGURATION - Update these values
const CONFIG = {
  // Your Vercel app URL (without trailing slash)
  WEBHOOK_URL: 'https://your-app.vercel.app/api/webhook/sheets-update',
  
  // Your webhook secret (must match WEBHOOK_SECRET env var in Vercel)
  WEBHOOK_SECRET: 'your-webhook-secret-here',
  
  // Sheets to monitor for changes
  MONITORED_SHEETS: ['events', 'event registrations', 'rankings', 'parents', 'students', 'games'],
  
  // Debounce time in milliseconds (to batch rapid changes)
  DEBOUNCE_MS: 2000
};

// Cache tag mapping
const SHEET_TO_CACHE_TAG = {
  'events': 'events',
  'event registrations': 'event-registrations',
  'rankings': 'rankings',
  'parents': 'members',
  'students': 'members',
  'games': 'rankings'  // Games affect rankings
};

// Global variable to track pending changes
let pendingChanges = {};
let debounceTimer = null;

/**
 * Function to set up the onChange trigger
 * Run this function ONCE after pasting the script
 */
function setupTrigger() {
  // Remove any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new onChange trigger
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();
  
  // Test the webhook
  testWebhook();
  
  Logger.log('Trigger setup complete!');
}

/**
 * Main function called when spreadsheet changes
 */
function onSheetChange(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Only process monitored sheets
    if (!CONFIG.MONITORED_SHEETS.includes(sheetName)) {
      return;
    }
    
    // Get the range that was edited
    const range = sheet.getActiveRange();
    const rangeA1 = range ? range.getA1Notation() : 'Unknown';
    
    // Add to pending changes
    pendingChanges[sheetName] = {
      sheetName: sheetName,
      cacheTag: SHEET_TO_CACHE_TAG[sheetName] || 'unknown',
      editedRange: rangeA1,
      timestamp: new Date().toISOString()
    };
    
    // Clear existing timer
    if (debounceTimer) {
      Utilities.sleep(10); // Small delay to ensure timer is cleared
    }
    
    // Set new timer to send webhook after debounce period
    debounceTimer = Utilities.newTimer()
      .after(CONFIG.DEBOUNCE_MS)
      .call(sendPendingWebhooks);
      
  } catch (error) {
    console.error('Error in onSheetChange:', error);
  }
}

/**
 * Send all pending webhooks
 */
function sendPendingWebhooks() {
  const changes = Object.values(pendingChanges);
  if (changes.length === 0) return;
  
  // Clear pending changes
  pendingChanges = {};
  debounceTimer = null;
  
  // Send webhook for each unique sheet that changed
  changes.forEach(change => {
    sendWebhook(change);
  });
}

/**
 * Send webhook to Vercel app
 */
function sendWebhook(payload) {
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.WEBHOOK_SECRET}`
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      Logger.log(`Webhook sent successfully for ${payload.sheetName}`);
    } else {
      Logger.log(`Webhook failed with status ${responseCode}: ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    Logger.log(`Webhook error: ${error.toString()}`);
  }
}

/**
 * Test webhook connection
 */
function testWebhook() {
  const testPayload = {
    sheetName: 'test',
    cacheTag: 'test',
    editedRange: 'A1',
    timestamp: new Date().toISOString()
  };
  
  Logger.log('Testing webhook connection...');
  sendWebhook(testPayload);
}

/**
 * Manual function to force refresh all caches
 */
function forceRefreshAllCaches() {
  CONFIG.MONITORED_SHEETS.forEach(sheetName => {
    const payload = {
      sheetName: sheetName,
      cacheTag: SHEET_TO_CACHE_TAG[sheetName] || 'unknown',
      editedRange: 'Manual Refresh',
      timestamp: new Date().toISOString()
    };
    sendWebhook(payload);
    Utilities.sleep(100); // Small delay between requests
  });
  Logger.log('Force refresh completed for all sheets');
}

/**
 * Get webhook status (for debugging)
 */
function getWebhookStatus() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.WEBHOOK_SECRET}`
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    Logger.log(`Webhook status: ${response.getContentText()}`);
    return response.getContentText();
  } catch (error) {
    Logger.log(`Webhook status check failed: ${error.toString()}`);
    return null;
  }
}
