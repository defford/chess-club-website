import { NextResponse } from 'next/server';

export async function GET() {
  // Debug endpoint to check environment variables in Vercel
  const envCheck = {
    hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasGoogleClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGooglePrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
    hasGoogleCloudProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
    hasGoogleSheetsId: !!process.env.GOOGLE_SHEETS_ID,
    hasGoogleClientX509CertUrl: !!process.env.GOOGLE_CLIENT_X509_CERT_URL,
    
    // Show first few chars of values for debugging (but not full values for security)
    googleClientEmailPrefix: process.env.GOOGLE_CLIENT_EMAIL?.substring(0, 10) + '...',
    googleSheetsIdPrefix: process.env.GOOGLE_SHEETS_ID?.substring(0, 10) + '...',
    googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    
    // Test Google Sheets connection
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  return NextResponse.json(envCheck);
}
