export interface StockfishMessage {
  type: 'evaluation' | 'bestmove' | 'ready' | 'error';
  data?: any;
}

export interface EvaluationData {
  score: number;
  mate?: number;
  depth: number;
  bestMove?: string;
  pv?: string[];
  sideToMove?: 'w' | 'b';
}

export class StockfishWorker {
  private worker: Worker | null = null;
  private onMessage: (message: StockfishMessage) => void;
  private isReady: boolean = false;
  private currentAnalysis: string | null = null;
  private currentSideToMove: 'w' | 'b' = 'w';

  constructor(onMessage: (message: StockfishMessage) => void) {
    this.onMessage = onMessage;
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker('/stockfish-worker.js');
      this.worker.onmessage = (e) => {
        this.handleEngineMessage(e.data);
      };
      this.worker.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        this.onMessage({ type: 'error', data: error });
      };
      this.worker.postMessage('init');
    } catch (error) {
      console.error('Failed to create Stockfish worker:', error);
      this.onMessage({ type: 'error', data: error });
    }
  }


  private handleEngineMessage(line: string) {
    console.log('Stockfish:', line);

    if (line === 'uciok') {
      // Engine is ready
      this.worker?.postMessage('isready');
    }

    if (line === 'readyok') {
      this.isReady = true;
      this.onMessage({ type: 'ready' });
    }

    // Parse evaluation - more flexible regex to handle different formats
    if (line.startsWith('info depth')) {
      const parts = line.split(' ');
      let score: number | null = null;
      let mate: number | null = null;
      let depth: number = 0;
      let pv: string[] | undefined;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'depth' && parts[i + 1]) {
          depth = parseInt(parts[i + 1]);
        }
        if (parts[i] === 'score') {
          if (parts[i + 1] === 'cp' && parts[i + 2]) {
            score = parseInt(parts[i + 2]) / 100; // Convert centipawns to decimal
          } else if (parts[i + 1] === 'mate' && parts[i + 2]) {
            mate = parseInt(parts[i + 2]);
          }
        }
        if (parts[i] === 'pv') {
          pv = parts.slice(i + 1);
        }
      }

      if (score !== null || mate !== null) {
        let finalScore: number;
        let finalMate: number | undefined;

        if (mate !== null) {
          // For mate scores, flip based on side to move
          finalMate = this.currentSideToMove === 'w' ? mate : -mate;
          finalScore = finalMate > 0 ? 1000 : -1000;
        } else {
          // For regular scores, flip if it's black's turn
          finalScore = this.currentSideToMove === 'w' ? (score || 0) : -(score || 0);
        }

        const evaluation: EvaluationData = {
          score: finalScore,
          mate: finalMate,
          depth,
          pv,
          sideToMove: this.currentSideToMove
        };

        this.onMessage({
          type: 'evaluation',
          data: evaluation
        });
      }
    }

    // Parse best move
    const bestMoveMatch = line.match(/bestmove (\w+)/);
    if (bestMoveMatch) {
      this.onMessage({
        type: 'bestmove',
        data: { move: bestMoveMatch[1] }
      });
    }
  }

  public setPosition(fen: string) {
    if (!this.isReady || !this.worker) return;
    
    this.currentAnalysis = fen;
    // Extract side to move from FEN (6th field, 1-indexed)
    const fenParts = fen.split(' ');
    this.currentSideToMove = fenParts[1] as 'w' | 'b';
    this.worker.postMessage(`position fen ${fen}`);
  }

  public startAnalysis(depth: number = 18) {
    if (!this.isReady || !this.currentAnalysis || !this.worker) return;
    
    this.worker.postMessage(`go depth ${depth}`);
  }

  public stopAnalysis() {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  public isEngineReady(): boolean {
    return this.isReady && typeof window !== 'undefined' && !!this.worker;
  }
}
