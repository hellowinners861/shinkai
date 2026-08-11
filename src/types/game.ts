export type GamePhase =
  | "title"
  | "playing"
  | "paused"
  | "cleared"
  | "gameOver";

export interface GameSession {
  phase: GamePhase;
  depth: number;
  fuel: number;
  score: number;
  caughtFish: Record<string, number>;
  discoveredFish: Set<string>;
  elapsedSeconds: number;
}
