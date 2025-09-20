import { KVCacheService } from '@/lib/kv';
import { RankingsPageClient } from './rankings-client';

// ISR configuration - revalidate every 5 minutes
export const revalidate = 300;
export const dynamic = 'force-static';

export default async function RankingsPage() {
  // Fetch rankings data on the server
  const players = await KVCacheService.getRankings();
  
  // Pass the pre-fetched data to the client component
  return <RankingsPageClient initialPlayers={players} />;
}
