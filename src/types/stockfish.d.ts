declare module 'stockfish.js' {
  export class Stockfish {
    constructor();
    postMessage(message: string): void;
    onmessage: ((line: string) => void) | null;
    terminate(): void;
  }
}



