import * as physics from './game/physics.js';
import { createTable } from './game/table.js';
import { createLoader } from './game/loader.js';
import { createTimers } from './game/timers.js';
import { createControl } from './game/control.js';
import { getString } from './game/strings.js';
import { createNudge } from './game/nudge.js';

const ACTIONS = {
  left: [1000, 1001], right: [1002, 1003], plunger: [1004, 1005],
  nudge: 'up', 'nudge-bottom': 'up', 'nudge-left': 'right', 'nudge-right': 'left',
};
const values = (list) => Array.from({ length: list.GetCount() }, (_, i) => list.Get(i));
const finite = (n) => Number.isFinite(n) ? n : 0;
const point = (p) => ({ x: finite(p.X), y: finite(p.Y), z: finite(p.Z) });

/** All simulation runs in these JavaScript modules; the table is plain JSON. */
export async function createEngine(geometry, { random = Math.random } = {}) {
  if (!geometry?.components?.length || !geometry.groups?.length) throw new Error('Missing readable Space Cadet table data.');
  const pb = { time_now: 0, time_next: 0, time_ticks: 0, game_mode: 2, FullTiltMode: false, demo_mode: 0, cheat_mode: 0, highscore_table: Array.from({ length: 5 }, () => ({ Score: -999 })) };
  const runtime = { pb, random, muted: true, soundEvents: [], pinball: { get_rc_string: getString } };
  runtime.sound = { play_sound(id) { if (!runtime.muted && id > 0 && runtime.soundEvents.length < 128) runtime.soundEvents.push(id); } };
  runtime.timer = createTimers(pb);
  runtime.loader = createLoader(geometry, runtime);
  runtime.nudge = createNudge(runtime);
  let table;
  pb.mode_change = (mode) => {
    pb.game_mode = mode;
    if (mode === 2) table?.LightGroup?.Message(29, 1.4);
    if (mode === 1 && table?.Demo) table.Demo.ActiveFlag = 0;
  };
  pb.end_game = () => pb.mode_change(2);
  pb.chk_highscore = () => table.PlayerScores.slice(0, table.PlayerCount).some((p) => p.ScoreStruct?.Score > pb.highscore_table[4].Score);
  pb.tilt_no_more = () => {
    if (table.TiltLockFlag) runtime.pinball.InfoTextBox.Clear();
    table.TiltLockFlag = 0;
    runtime.nudge.nudge_count = -2;
  };
  table = createTable(geometry, runtime, physics);
  pb.MainTable = table;
  table.random = random;
  runtime.control = createControl(table, runtime);
  runtime.control.make_links(table);
  const world = new physics.PhysicsWorld(table);
  let paused = false;
  let fractionalMilliseconds = 0;
  const held = new Set();

  function snapshot(consumeSounds = true) {
    const flippers = [table.FlipperL, table.FlipperR].map((flipper) => {
      const edge = flipper.FlipperEdge;
      const angle = edge.flipper_angle(pb.time_now);
      const dx = edge.T1Src.X - edge.RotOrigin.X, dy = edge.T1Src.Y - edge.RotOrigin.Y;
      const s = Math.sin(angle), c = Math.cos(angle);
      return { id: flipper.GroupIndex, name: flipper.GroupName, angle, pivot: point(edge.RotOrigin), tip: { x: edge.RotOrigin.X + dx * c - dy * s, y: edge.RotOrigin.Y + dx * s + dy * c, z: finite(edge.T1Src.Z) } };
    });
    const components = values(table.ComponentList);
    const sounds = consumeSounds ? runtime.soundEvents.splice(0) : [...runtime.soundEvents];
    return {
      ready: true, time: pb.time_now, gameMode: pb.game_mode, paused,
      score: table.CurScore, scoreBillions: table.CurScoreE9,
      ballCount: table.BallCount, maxBallCount: table.MaxBallCount,
      ballNumber: Math.min(table.MaxBallCount, table.MaxBallCount - table.BallCount + 1),
      currentPlayer: table.CurrentPlayer, playerCount: table.PlayerCount,
      playerScores: table.PlayerScores.slice(0, table.PlayerCount).map((player, index) =>
        index === table.CurrentPlayer
          ? finite(table.CurScoreE9) * 1_000_000_000 + finite(table.CurScore)
          : finite(player.ScoreE9Part) * 1_000_000_000 + finite(player.Score)),
      cheatsUsed: Boolean(table.CheatsUsed || pb.cheat_mode),
      extraBalls: table.ExtraBalls, scoreMultiplier: table.ScoreMultiplier, tilted: Boolean(table.TiltLockFlag),
      plungerCharge: finite(table.Plunger.Boost / table.Plunger.MaxPullback),
      mission: runtime.pinball.MissTextBox?.Message1?.Text ?? '',
      info: runtime.pinball.InfoTextBox?.Message1?.Text ?? '',
      balls: values(table.BallList).map((ball, id) => ({ id, x: finite(ball.Position.X), y: finite(ball.Position.Y), z: finite(ball.Position.Z), radius: ball.Offset, active: Boolean(ball.ActiveFlag), vx: finite(ball.Acceleration.X * ball.Speed), vy: finite(ball.Acceleration.Y * ball.Speed), speed: finite(ball.Speed) })),
      flippers,
      lights: components.filter((c) => c.Flasher).map((light) => ({ id: light.GroupIndex, on: Boolean(light.RenderSprite?.Bmp && light.RenderSprite.Bmp === light.Flasher.BmpArr[1]), flashing: Boolean(light.FlasherActive) })),
      components: components.map((component) => ({ id: component.GroupIndex, active: Boolean(component.ActiveFlag), message: component.MessageField, frame: component.ListBitmap ? values(component.ListBitmap).indexOf(component.RenderSprite?.Bmp) : -1 })),
      sounds,
    };
  }

  function input(action, down) {
    if (!(action in ACTIONS) || paused || pb.game_mode !== 1) return;
    if (Boolean(down) === held.has(action)) return;
    if (down) held.add(action); else held.delete(action);
    const codes = ACTIONS[action];
    if (Array.isArray(codes)) table.Message(codes[down ? 0 : 1], pb.time_now);
    else if (!table.TiltLockFlag || !down) runtime.nudge[`${down ? 'nudge' : 'un_nudge'}_${codes}`]();
  }
  function releaseInputs() {
    for (const action of [...held]) input(action, false);
    held.clear();
  }
  function frame(ms) {
    const dt = Math.fround(ms * 0.001);
    pb.time_next = Math.fround(pb.time_now + dt);
    world.step(pb.time_now, dt);
    pb.time_now = pb.time_next;
    pb.time_ticks += ms;
    runtime.nudge.update(dt);
    runtime.timer.check();
    if (!table.TiltLockFlag) {
      if (runtime.nudge.nudge_count > 0.5) runtime.pinball.InfoTextBox.Display(getString(25), 2);
      if (runtime.nudge.nudge_count > 1) table.tilt(pb.time_now);
    }
  }
  const engine = Object.freeze({
    step(ms) {
      if (paused || !Number.isFinite(ms)) return;
      fractionalMilliseconds += Math.max(0, Math.min(ms, 100));
      let remaining = Math.trunc(fractionalMilliseconds);
      fractionalMilliseconds -= remaining;
      while (remaining > 0) { const dt = Math.min(remaining, 8); frame(dt); remaining -= dt; }
    },
    getState: snapshot,
    input, releaseInputs,
    keyDown(key) {
      if (!paused && pb.game_mode === 1) runtime.control.pbctrl_bdoor_controller(key.length === 1 ? key : 0);
    },
    newGame(players = 1) {
      releaseInputs();
      paused = false;
      fractionalMilliseconds = 0;
      runtime.soundEvents.length = 0;
      pb.demo_mode = 0;
      const playerCount = Math.max(1, Math.min(4, Math.trunc(players) || 1));
      // The native intro shortcut skips player initialization. A changed player
      // selection must start the requested game even during that opening show.
      if (table.LightShowTimer) {
        runtime.timer.kill(table.LightShowTimer);
        table.LightShowTimer = 0;
      }
      // A new ranked session always starts with fresh scores, including billions.
      table.CurScoreE9 = 0;
      for (const player of table.PlayerScores) {
        player.Score = 0;
        player.ScoreE9Part = 0;
        player.ScoreStruct.Score = 0;
      }
      pb.cheat_mode = 0;
      pb.mode_change(1);
      table.Message(1014, playerCount);
      return snapshot(false);
    },
    pause(value) {
      if (Boolean(value) !== paused) {
        releaseInputs();
        paused = Boolean(value);
        runtime.pinball.InfoTextBox.Clear();
        runtime.pinball.MissTextBox.Clear();
        table.Message(paused ? 1008 : 1009, paused ? pb.time_now : 0);
        runtime.pinball.InfoTextBox.Display(getString(paused ? 22 : pb.game_mode === 2 ? 24 : 23), paused || pb.game_mode === 2 ? -1 : 5);
      }
      return snapshot(false);
    },
    launch() { if (!paused && pb.game_mode === 1) table.Plunger.Message(1017, 0); },
    setMuted(value) { runtime.muted = Boolean(value); if (runtime.muted) runtime.soundEvents.length = 0; },
    testing: Object.freeze({
      setBall({ x, y, z = geometry.ball.radius, vx = 0, vy = 0 }) {
        const ball = table.BallList.Get(0);
        ball.Message(1024, 0);
        ball.Position = { X: Math.fround(x), Y: Math.fround(y), Z: Math.fround(z) };
        ball.Acceleration = { X: Math.fround(vx), Y: Math.fround(vy), Z: 0 };
        ball.Speed = physics.maths.normalize_2d(ball.Acceleration);
        ball.InvAcceleration = { X: ball.Acceleration.X ? 1 / ball.Acceleration.X : 1e9, Y: ball.Acceleration.Y ? 1 / ball.Acceleration.Y : 1e9, Z: 0 };
        ball.ActiveFlag = 1;
        return snapshot(false);
      },
      endGame: pb.end_game,
      table, runtime, world,
    }),
  });
  // React starts gameplay only after the API creates a ranked session.
  return engine;
}
