export interface BallState {
  id: number; x: number; y: number; z: number; vx: number; vy: number;
  active: boolean; radius: number; speed: number;
}
export interface GameSnapshot {
  ready: boolean; time: number; gameMode: number; paused: boolean;
  score: number; scoreBillions: number; ballCount: number; maxBallCount: number;
  ballNumber: number; currentPlayer: number; playerCount: number;
  playerScores: number[]; cheatsUsed: boolean; extraBalls: number;
  scoreMultiplier: number; tilted: boolean; plungerCharge: number;
  mission: string; info: string; balls: BallState[]; sounds: number[];
}
export interface PinballEngine {
  step(ms: number): void;
  getState(consumeSounds?: boolean): GameSnapshot;
  input(action: string, down: boolean): void;
  releaseInputs(): void;
  newGame(players?: number): GameSnapshot;
  pause(value: boolean): GameSnapshot;
  launch(): void;
  setMuted(value: boolean): void;
  testing: {
    setBall(ball: { x: number; y: number; z?: number; vx?: number; vy?: number }): GameSnapshot;
    endGame(): void;
    table: {
      CurrentPlayer: number; CurScore: number; CurScoreE9: number;
      PlayerScores: { Score: number; ScoreE9Part: number; ScoreStruct: { Score: number } }[];
    };
  };
}
export function createEngine(geometry: unknown): Promise<PinballEngine>;
