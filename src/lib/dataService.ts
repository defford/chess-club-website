import { enhancedSupabaseService } from './supabaseServiceEnhanced';

/**
 * DataService - Re-exporting EnhancedSupabaseService directly
 * Since Google Sheets support has been removed, we no longer need the adapter layer.
 * This maintains the existing singleton export 'dataService' for backward compatibility.
 */
export const dataService = enhancedSupabaseService;
