export interface SoundMetadata { id: number; duration?: number }
export class GameAudio {
  constructor(sounds?: SoundMetadata[]);
  enabled: boolean;
  setEnabled(enabled: boolean): Promise<void>;
  play(events: number[]): void;
  dispose(): void;
}
