// Native millisecond timer ordering, expressed entirely in JavaScript.
export function createTimers(pb, maxCount = 150) {
  const pending = []; let nextId = 1;
  return {
    get Count() { return pending.length; },
    get pending() { return pending; },
    set(seconds, caller, callback) {
      if (pending.length >= maxCount) return 0;
      const item = { id: nextId++, target: pb.time_ticks + Math.trunc(seconds * 1000), caller, callback };
      let index = pending.findIndex(entry => entry.target > item.target);
      if (index < 0) index = pending.length;
      pending.splice(index, 0, item); return item.id;
    },
    kill(id) { const index = pending.findIndex(item => item.id === id); if (index < 0) return 0; pending.splice(index, 1); return id; },
    check() {
      let count = 0;
      // The original fires two punctual timers, then catches up timers more than
      // 100 ms late. Preserve this rather than changing lamp/mission ordering.
      while (pending.length && pending[0].target <= pb.time_ticks && (count < 2 || pending[0].target + 100 <= pb.time_ticks)) {
        const item = pending.shift(); count++; item.callback?.(item.id, item.caller);
        if (count > maxCount * 4) throw new Error('Timer callback failed to advance time');
      }
      return count;
    },
    clear() { pending.length = 0; },
  };
}
