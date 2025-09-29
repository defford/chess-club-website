#!/usr/bin/env node

/**
 * Ladder Debug Test Script
 * 
 * This script tests the ladder functionality and compares results between environments.
 * Run this script to diagnose ladder issues in production vs development.
 * 
 * Usage:
 *   node scripts/test-ladder-debug.js [environment] [date]
 * 
 * Examples:
 *   node scripts/test-ladder-debug.js dev 2024-01-15
 *   node scripts/test-ladder-debug.js prod 2024-01-15
 *   node scripts/test-ladder-debug.js dev  # Uses today's date
 */

const https = require('https');
const http = require('http');

// Configuration
const ENVIRONMENTS = {
  dev: 'http://localhost:3000',
  prod: 'https://cnlscc.com' // Your actual production URL
};

const TEST_ENDPOINTS = [
  '/api/debug-sheets',
  '/api/debug-games',
  '/api/debug-ladder',
  '/api/ladder'
];

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            parseError: error.message
          });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
    
    // Add timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests(environment, date) {
  const baseUrl = ENVIRONMENTS[environment];
  if (!baseUrl) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.log('Available environments:', Object.keys(ENVIRONMENTS));
    process.exit(1);
  }

  console.log(`🔍 Testing ${environment.toUpperCase()} environment`);
  console.log(`📅 Target date: ${date}`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log('=' .repeat(60));

  const results = {};

  for (const endpoint of TEST_ENDPOINTS) {
    const url = `${baseUrl}${endpoint}${date ? `?date=${date}` : ''}`;
    console.log(`\n📡 Testing: ${endpoint}`);
    
    try {
      const result = await makeRequest(url);
      results[endpoint] = result;
      
      if (result.status === 200) {
        console.log(`✅ Status: ${result.status}`);
        
        // Show key information based on endpoint
        if (endpoint === '/api/debug-sheets') {
          console.log(`   Environment: ${result.data.environment}`);
          console.log(`   Raw Sheets Access: ${result.data.tests?.rawSheetsAccess?.success ? '✅' : '❌'}`);
          console.log(`   Games Structure: ${result.data.tests?.gamesStructure?.success ? '✅' : '❌'}`);
          console.log(`   Total Games: ${result.data.tests?.gamesStructure?.totalGames || 0}`);
          console.log(`   Ladder Games: ${result.data.tests?.gamesStructure?.gameTypes?.ladder || 0}`);
        } else if (endpoint === '/api/debug-games') {
          console.log(`   Direct Service: ${result.data.tests?.directService?.success ? '✅' : '❌'}`);
          console.log(`   Enhanced Service: ${result.data.tests?.enhancedService?.success ? '✅' : '❌'}`);
          console.log(`   Games Found: ${result.data.tests?.directService?.count || 0}`);
        } else if (endpoint === '/api/debug-ladder') {
          console.log(`   Rankings: ${result.data.tests?.rankings?.success ? '✅' : '❌'}`);
          console.log(`   Players Count: ${result.data.tests?.rankings?.playersCount || 0}`);
          console.log(`   Ladder Players: ${result.data.tests?.ladderSimulation?.ladderPlayersCount || 0}`);
        } else if (endpoint === '/api/ladder') {
          console.log(`   Ladder Players: ${result.data.players?.length || 0}`);
          console.log(`   Games: ${result.data.games?.length || 0}`);
        }
      } else {
        console.log(`❌ Status: ${result.status}`);
        if (result.status === 302) {
          console.log(`   Redirect detected - likely authentication or routing issue`);
        }
        if (result.data.error) {
          console.log(`   Error: ${result.data.error}`);
        }
        if (result.data.message) {
          console.log(`   Message: ${result.data.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      results[endpoint] = { error: error.message };
    }
  }

  return results;
}

async function compareEnvironments(date) {
  console.log('🔄 Comparing DEV vs PROD environments...\n');
  
  const [devResults, prodResults] = await Promise.all([
    runTests('dev', date),
    runTests('prod', date)
  ]);

  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON SUMMARY');
  console.log('='.repeat(60));

  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n🔍 ${endpoint}:`);
    
    const dev = devResults[endpoint];
    const prod = prodResults[endpoint];
    
    if (dev?.status === 200 && prod?.status === 200) {
      // Compare key metrics
      if (endpoint === '/api/ladder') {
        const devPlayers = dev.data.players?.length || 0;
        const prodPlayers = prod.data.players?.length || 0;
        const devGames = dev.data.games?.length || 0;
        const prodGames = prod.data.games?.length || 0;
        
        console.log(`   Players: DEV=${devPlayers}, PROD=${prodPlayers} ${devPlayers === prodPlayers ? '✅' : '❌'}`);
        console.log(`   Games: DEV=${devGames}, PROD=${prodGames} ${devGames === prodGames ? '✅' : '❌'}`);
        
        if (devPlayers !== prodPlayers || devGames !== prodGames) {
          console.log(`   ⚠️  MISMATCH DETECTED!`);
        }
      }
    } else {
      console.log(`   DEV: ${dev?.status || 'ERROR'}`);
      console.log(`   PROD: ${prod?.status || 'ERROR'}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0];
  const date = args[1] || new Date().toISOString().split('T')[0];

  if (!environment) {
    console.log('🔍 Running comprehensive comparison test...\n');
    await compareEnvironments(date);
  } else {
    await runTests(environment, date);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch(console.error);
