import { LadderPageClient } from './ladder-client';

// ISR configuration - revalidate every 5 minutes
export const revalidate = 300;
export const dynamic = 'force-static';

export default function LadderPage() {
  return <LadderPageClient />;
}
