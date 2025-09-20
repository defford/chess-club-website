import { KVCacheService } from '@/lib/kv';
import { EventsPageClient } from './events-client';

// ISR configuration - revalidate every 5 minutes
export const revalidate = 300;
export const dynamic = 'force-static';

export default async function EventsPage() {
  // Fetch events data on the server
  const events = await KVCacheService.getEvents();
  
  // Pass the pre-fetched data to the client component
  return <EventsPageClient initialEvents={events} />;
}
