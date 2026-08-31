export const SOUND_STORAGE_KEY = "tsai-roulette-sound";
export const MIN_TICK_GAP_MS = 25;

export function readMuted(storage: { getItem(key: string): string | null } = localStorage): boolean {
  return storage.getItem(SOUND_STORAGE_KEY) === "off";
}

export function writeMuted(
  muted: boolean,
  storage: { setItem(key: string, value: string): void } = localStorage,
): void {
  storage.setItem(SOUND_STORAGE_KEY, muted ? "off" : "on");
}

export function canTick(now: number, lastTickAt: number, minGapMs = MIN_TICK_GAP_MS): boolean {
  return now - lastTickAt >= minGapMs;
}

export function motionTicksAllowed(
  matchMedia: (query: string) => { matches: boolean } = (query) => window.matchMedia(query),
): boolean {
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createSound() {
  let ctx: AudioContext | null = null;
  let muted = readMuted();
  let lastTickAt = 0;

  function beep(frequency: number, duration: number, peak = 0.07, type: OscillatorType = "square", delay = 0): void {
    if (muted || !ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  return {
    isMuted(): boolean {
      return muted;
    },
    setMuted(next: boolean): void {
      muted = next;
      writeMuted(next);
    },
    async unlock(): Promise<void> {
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();
    },
    tick(progress01: number): void {
      if (muted || !motionTicksAllowed()) return;
      const now = performance.now();
      if (!canTick(now, lastTickAt)) return;
      lastTickAt = now;
      const p = Math.min(1, Math.max(0, progress01));
      beep(420 + (1 - p) * 780, 0.03, 0.045);
    },
    land(): void {
      beep(392, 0.14, 0.08, "sine", 0);
      beep(523.25, 0.22, 0.09, "sine", 0.11);
    },
  };
}
