import { f, maths } from './math.js';

/** Source-equivalent Space Cadet nudges; rendered cabinet motion is cosmetic. */
export function createNudge(runtime) {
  const nudge = { nudged_left: 0, nudged_right: 0, nudged_up: 0, nudge_count: 0, timer: 0 };
  function impulse(x, y) {
    const balls = runtime.pb.MainTable.BallList;
    for (let i = 0; i < balls.GetCount(); i++) {
      const b = balls.Get(i);
      if (!b.ActiveFlag || b.CollisionComp) continue;
      b.Acceleration.X = f(f(b.Acceleration.X * b.Speed) + f(x * 0.5));
      b.Acceleration.Y = f(f(b.Acceleration.Y * b.Speed) + f(y * 0.5));
      b.Speed = maths.normalize_2d(b.Acceleration);
      b.InvAcceleration.X = b.Acceleration.X ? Math.fround(1 / b.Acceleration.X) : 1e9;
      b.InvAcceleration.Y = b.Acceleration.Y ? Math.fround(1 / b.Acceleration.Y) : 1e9;
    }
  }
  for (const [direction, x] of [['right', 2], ['left', -2], ['up', 0]]) {
    nudge[`un_nudge_${direction}`] = () => {
      if (nudge[`nudged_${direction}`]) impulse(-x, -1);
      nudge[`nudged_${direction}`] = 0;
    };
    nudge[`nudge_${direction}`] = () => {
      impulse(x, 1);
      if (nudge.timer) runtime.timer.kill(nudge.timer);
      nudge.timer = runtime.timer.set(0.4, null, nudge[`un_nudge_${direction}`]);
      nudge[`nudged_${direction}`] = 1;
    };
  }
  nudge.update = (dt) => {
    if (nudge.nudged_left || nudge.nudged_right || nudge.nudged_up) nudge.nudge_count = Math.fround(nudge.nudge_count + dt * 4);
    else nudge.nudge_count = Math.max(0, Math.fround(nudge.nudge_count - dt));
  };
  return nudge;
}
