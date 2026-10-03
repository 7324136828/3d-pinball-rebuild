import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createEngine, type GameSnapshot, type PinballEngine } from '../pinball/engine.js';
import { ModernTableRenderer } from '../pinball/renderer.js';
import { GameAudio, type SoundMetadata } from '../pinball/audio.js';
import { apiRequest } from '../services/api';

const STEP_MS = 1000 / 120;
const actionKeys: Record<string, string> = {
  KeyZ: 'left', ArrowLeft: 'left', Slash: 'right', ArrowRight: 'right',
  Space: 'plunger', KeyX: 'nudge-left', Period: 'nudge-right', ArrowUp: 'nudge-bottom',
};
export interface PlayfieldControl {
  start(players: number): void;
  pause(value: boolean): void;
  input(action: string, held: boolean, source: string): void;
  sound(enabled: boolean): Promise<boolean>;
  camera(mode: 'cabinet' | 'overhead'): void;
}
interface Props {
  visible: boolean;
  onReady(ready: boolean): void;
  onState(snapshot: GameSnapshot): void;
  onGameOver(snapshot: GameSnapshot): void;
  onNewGame(): Promise<void>;
}
interface Runtime {
  engine: PinballEngine; renderer: ModernTableRenderer; audio: GameAudio;
  held: Map<string, string>; active: boolean; previousMode: number; accumulator: number;
}
interface TestHarness {
  state(): GameSnapshot | null;
  advance(seconds: number): GameSnapshot | null;
  setBall: PinballEngine['testing']['setBall'];
  finishGame(scores?: number[]): GameSnapshot | null;
  newGame(): Promise<void>;
  pause(value: boolean): void;
}
declare global { interface Window { __pinballTest?: TestHarness } }

export const Playfield = forwardRef<PlayfieldControl, Props>(function Playfield(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  function sample(dt = 0) {
    const runtime = runtimeRef.current;
    if (!runtime) return null;
    const snapshot = runtime.engine.getState();
    runtime.audio.play(snapshot.sounds);
    runtime.renderer.update(snapshot, dt);
    if (runtime.active && runtime.previousMode === 1 && snapshot.gameMode === 2) {
      runtime.active = false;
      callbacks.current.onGameOver(snapshot);
    }
    runtime.previousMode = snapshot.gameMode;
    return snapshot;
  }
  function release() {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.engine.releaseInputs();
    runtime.held.clear();
  }
  function pause(value: boolean) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    release();
    runtime.engine.pause(value);
    runtime.accumulator = 0;
    const state = sample();
    if (state) callbacks.current.onState(state);
  }
  function input(action: string, held: boolean, source: string) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (held) {
      if (!runtime.active || runtime.engine.getState(false).paused || runtime.held.has(source)) return;
      const alreadyDown = [...runtime.held.values()].includes(action);
      runtime.held.set(source, action);
      if (!alreadyDown) runtime.engine.input(action, true);
    } else {
      runtime.held.delete(source);
      if (![...runtime.held.values()].includes(action)) runtime.engine.input(action, false);
    }
  }
  useImperativeHandle(ref, () => ({
    start(players) {
      const runtime = runtimeRef.current;
      if (!runtime) throw new Error('The table is still loading.');
      release();
      runtime.engine.newGame(players);
      runtime.active = true;
      runtime.previousMode = 1;
      runtime.accumulator = 0;
      const state = sample();
      if (state) callbacks.current.onState(state);
      canvasRef.current?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 800px)').matches) {
        canvasRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    },
    pause, input,
    async sound(enabled) {
      const runtime = runtimeRef.current;
      if (!runtime) return false;
      await runtime.audio.setEnabled(enabled);
      runtime.engine.setMuted(!runtime.audio.enabled);
      return runtime.audio.enabled;
    },
    camera(mode) { runtimeRef.current?.renderer.setCamera(mode); },
  }));

  useEffect(() => {
    let disposed = false;
    let animation = 0;
    let lastFrame = 0;
    let lastHud = 0;
    const abort = new AbortController();
    const observer = new ResizeObserver(() => resize());
    const resize = () => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) runtimeRef.current?.renderer.resize(rect.width, rect.height);
    };
    setLoading(true);
    setError('');
    callbacks.current.onReady(false);

    function frame(now: number) {
      if (disposed) return;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
      lastFrame = now;
      const runtime = runtimeRef.current;
      if (runtime) {
        const state = runtime.engine.getState(false);
        if (runtime.active && !state.paused) {
          runtime.accumulator += dt * 1000;
          while (runtime.accumulator >= STEP_MS) {
            runtime.engine.step(STEP_MS);
            runtime.accumulator -= STEP_MS;
          }
        }
        const snapshot = sample(dt);
        if (snapshot && now - lastHud >= 70) { callbacks.current.onState(snapshot); lastHud = now; }
      }
      animation = requestAnimationFrame(frame);
    }

    const keyDown = (event: KeyboardEvent) => {
      if (!callbacks.current.visible || !runtimeRef.current || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea, dialog, [role="dialog"]')) return;
      const action = actionKeys[event.code];
      if (action) { event.preventDefault(); if (!event.repeat) input(action, true, `key:${event.code}`); }
      else if (['KeyP', 'F3', 'Escape'].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat && runtimeRef.current.active) pause(!runtimeRef.current.engine.getState(false).paused);
      } else if (['KeyN', 'F2'].includes(event.code)) { event.preventDefault(); if (!event.repeat) void callbacks.current.onNewGame(); }
    };
    const keyUp = (event: KeyboardEvent) => {
      const action = runtimeRef.current?.held.get(`key:${event.code}`);
      if (action) { event.preventDefault(); input(action, false, `key:${event.code}`); }
    };
    const blur = () => { if (runtimeRef.current?.active) pause(true); else release(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);

    void (async () => {
      let renderer: ModernTableRenderer | undefined;
      try {
        const geometry = await apiRequest<{ sounds?: SoundMetadata[] }>('/api/table', { signal: abort.signal });
        if (disposed || !canvasRef.current || !stageRef.current) return;
        const engine = await createEngine(geometry);
        if (disposed) return;
        renderer = new ModernTableRenderer(canvasRef.current, geometry);
        const audio = new GameAudio(geometry.sounds ?? []);
        engine.setMuted(true);
        runtimeRef.current = { engine, renderer, audio, held: new Map(), active: false, previousMode: 2, accumulator: 0 };
        observer.observe(stageRef.current);
        resize();
        const state = sample();
        if (state) callbacks.current.onState(state);
        callbacks.current.onReady(true);
        setLoading(false);
        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_HOOKS === '1') {
          window.__pinballTest = {
            state: () => runtimeRef.current?.engine.getState(false) ?? null,
            advance(seconds) {
              for (let elapsed = 0; elapsed < seconds * 1000; elapsed += STEP_MS) engine.step(STEP_MS);
              const snapshot = sample(seconds);
              if (snapshot) callbacks.current.onState(snapshot);
              return snapshot;
            },
            setBall: engine.testing.setBall,
            finishGame(scores) {
              if (scores) {
                const table = engine.testing.table;
                scores.forEach((score, index) => {
                  const player = table.PlayerScores[index];
                  if (player) { player.Score = score % 1e9; player.ScoreE9Part = Math.floor(score / 1e9); player.ScoreStruct.Score = player.Score; }
                });
                const current = scores[table.CurrentPlayer] ?? 0;
                table.CurScore = current % 1e9; table.CurScoreE9 = Math.floor(current / 1e9);
              }
              engine.testing.endGame();
              const snapshot = sample();
              if (snapshot) callbacks.current.onState(snapshot);
              return snapshot;
            },
            newGame: () => callbacks.current.onNewGame(), pause,
          };
        }
        animation = requestAnimationFrame(frame);
      } catch (failure) {
        if (disposed) return;
        renderer?.dispose();
        setError(failure instanceof Error ? failure.message : 'The table could not load.');
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(animation);
      observer.disconnect();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      release();
      runtimeRef.current?.renderer.dispose();
      runtimeRef.current?.audio.dispose();
      runtimeRef.current = null;
      delete window.__pinballTest;
    };
    // The runtime lives for the mounted canvas; callbacks use refs to avoid reinitializing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  return <div className="canvas-stage" ref={stageRef}>
    <canvas ref={canvasRef} tabIndex={0} aria-label="Space Cadet pinball table. Z and slash control flippers; hold Space and release to launch." />
    {(loading || error) && <div className="table-overlay loading-panel" role={error ? 'alert' : 'status'}>
      <div className="orbital-icon" aria-hidden="true">✦</div>
      <h2>{error ? 'Launch interrupted' : 'Preparing the playfield'}</h2>
      <p>{error || 'Loading the original table, physics, and missions…'}</p>
      {error && <><p className="muted">Keep the backend running and use a browser with WebGL support.</p><button onClick={() => setRetry(value => value + 1)}>Retry table loading</button></>}
    </div>}
  </div>;
});
