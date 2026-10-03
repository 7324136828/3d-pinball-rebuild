/** Procedural Web Audio effects: no WAV files, decoder, binary assets or service. */
export class GameAudio {
  constructor(sounds = []) {
    this.sounds = new Map(sounds.map((sound) => [sound.id, sound]));
    this.context = null;
    this.enabled = false;
    this.voices = new Set();
  }

  async setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      for (const voice of this.voices) { try { voice.stop(); } catch {} }
      this.voices.clear();
      return;
    }
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) { this.enabled = false; return; }
    if (!this.context) {
      this.context = new Context();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.18;
      this.gain.connect(this.context.destination);
    }
    await this.context.resume();
  }

  play(events = []) {
    if (!this.enabled || this.context?.state !== 'running') return;
    for (const event of events) {
      const id = typeof event === 'number' ? event : event.id;
      if (id <= 1 || !this.sounds.has(id)) continue;
      const sound = this.sounds.get(id);
      const duration = Math.min(0.8, Math.max(0.045, (sound.duration || 0.12) * 0.35));
      const t = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = ['sine', 'triangle', 'sine', 'square'][id % 4];
      const frequency = 180 + (id % 13) * 48;
      oscillator.frequency.setValueAtTime(frequency * 1.4, t);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.55), t + duration);
      envelope.gain.setValueAtTime(0, t);
      envelope.gain.linearRampToValueAtTime(id % 4 === 3 ? 0.24 : 0.6, t + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
      oscillator.connect(envelope);
      envelope.connect(this.gain);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      if (this.voices.size >= 18) { try { this.voices.values().next().value.stop(); } catch {} }
      this.voices.add(oscillator);
      oscillator.start(t);
      oscillator.stop(t + duration + 0.01);
    }
  }

  dispose() {
    this.enabled = false;
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
    this.gain?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
