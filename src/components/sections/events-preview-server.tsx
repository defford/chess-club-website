import { KVCacheService } from '@/lib/kv';
import { EventsPreviewClient } from './events-preview-client';

export async function EventsPreview() {
  // Fetch events data on the server
  const allEvents = await KVCacheService.getEvents();
  
  // Filter for upcoming/active events and take top 3
  const upcomingEvents = allEvents
    .filter(event => event.status === 'active')
    .slice(0, 3);
  
  return <EventsPreviewClient initialEvents={upcomingEvents} />;
}
