import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEngine } from '../src/pinball/engine.js';

const geometry = JSON.parse(await readFile(new URL('../../assets/table.json', import.meta.url)));
function advance(engine, seconds) {
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += 1000 / 120) engine.step(1000 / 120);
  return engine.getState(false);
}
async function game(players = 1) {
  const engine = await createEngine(geometry, { random: () => .5 });
  engine.newGame(players);
  advance(engine, 6);
  return engine;
}

test('React adapter begins idle until an API-backed session is started', async () => {
  const engine = await createEngine(geometry);
  const idle = engine.getState(false);
  assert.equal(idle.gameMode, 2);
  assert.equal(idle.balls.some(ball => ball.active), false);
  assert.equal(idle.cheatsUsed, false);
  engine.newGame(2);
  const playing = advance(engine, 6);
  assert.equal(playing.gameMode, 1);
  assert.equal(playing.playerCount, 2);
  assert.deepEqual(playing.playerScores, [0, 0]);
});

test('restarting during the intro creates fresh scores and clears all billion parts', async () => {
  const engine = await createEngine(geometry);
  engine.newGame(4);
  const table = engine.testing.table;
  table.CurScore = 87;
  table.CurScoreE9 = 2;
  for (const player of table.PlayerScores) { player.Score = 23; player.ScoreE9Part = 3; }
  engine.newGame(4);
  const fresh = advance(engine, 6);
  assert.equal(fresh.currentPlayer, 0);
  assert.equal(fresh.ballCount, 3);
  assert.equal(fresh.scoreBillions, 0);
  assert.equal(fresh.score, 0);
  assert.deepEqual(fresh.playerScores, [0, 0, 0, 0]);
});

test('snapshot combines live current and stored inactive scores for every pilot', async () => {
  const engine = await game(4);
  const table = engine.testing.table;
  table.CurrentPlayer = 2;
  table.CurScore = 456;
  table.CurScoreE9 = 3;
  table.PlayerScores.forEach((player, index) => { player.Score = 100 + index; player.ScoreE9Part = index; });
  assert.deepEqual(engine.getState(false).playerScores, [100, 1_000_000_101, 3_000_000_456, 3_000_000_103]);
  engine.testing.endGame();
  assert.equal(engine.getState(false).gameMode, 2);
  assert.deepEqual(engine.getState(false).playerScores, [100, 1_000_000_101, 3_000_000_456, 3_000_000_103]);
});

test('real drain collisions finish multiplayer and retain every player score', async () => {
  const engine = await game(2);
  const seen = new Set();
  let drains = 0;
  while (engine.getState(false).gameMode === 1 && drains < 30) {
    const state = engine.getState(false);
    seen.add(state.currentPlayer);
    // Real skill-shot protection has two consecutive five-second saver stages.
    engine.input('plunger', true);
    advance(engine, 3);
    engine.input('plunger', false);
    advance(engine, 12);
    if (engine.getState(false).gameMode !== 1) break;
    engine.testing.setBall({ x: 0, y: 13.3, vx: 0, vy: 25 });
    advance(engine, 8);
    drains++;
  }
  const completed = engine.getState(false);
  assert.equal(completed.gameMode, 2, `Game did not finish after ${drains} actual drains`);
  assert.deepEqual([...seen].sort(), [0, 1]);
  assert.equal(completed.playerScores.length, 2);
  assert.ok(completed.playerScores.every(score => Number.isSafeInteger(score) && score >= 0));
  assert.ok(completed.playerScores.every(score => score > 0), 'Normal drain bonus was preserved for both players');
});
