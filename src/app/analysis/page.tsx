import { AnalysisBoardClient } from './analysis-client';

// Force dynamic rendering to avoid server-side issues with Stockfish
export const dynamic = 'force-dynamic';

export default function AnalysisPage() {
  return <AnalysisBoardClient />;
}
