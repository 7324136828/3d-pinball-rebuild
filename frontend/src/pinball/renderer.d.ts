import type { GameSnapshot } from './engine.js';
export class ModernTableRenderer {
  constructor(canvas: HTMLCanvasElement, geometry: unknown);
  update(state: GameSnapshot, dt?: number): void;
  resize(width: number, height: number): void;
  setCamera(mode: 'cabinet' | 'overhead'): void;
  dispose(): void;
}
