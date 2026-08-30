export type WheelTheme = {
  sliceA: string;
  sliceB: string;
  sliceC: string;
  slicePlayed: string;
  text: string;
  rim: string;
  hub: string;
  hubStroke: string;
};

const defaultTheme: WheelTheme = {
  sliceA: "#1a0b10",
  sliceB: "#8b1e2d",
  sliceC: "#c9a227",
  slicePlayed: "#2a1814",
  text: "#f6e7c1",
  rim: "#e6c878",
  hub: "#14080c",
  hubStroke: "#f0d58c",
};

export function normalizeAngle(radians: number): number {
  const tau = Math.PI * 2;
  return ((radians % tau) + tau) % tau;
}

export function sliceIndexAtPointer(angle: number, sliceCount: number): number {
  const n = Math.max(1, sliceCount);
  const slice = (Math.PI * 2) / n;
  return Math.min(n - 1, Math.floor(normalizeAngle(-angle) / slice));
}

export function rimLabelStep(sliceCount: number): number {
  if (sliceCount <= 24) return 1;
  if (sliceCount <= 40) return 2;
  if (sliceCount <= 80) return 5;
  return 10;
}

export function shouldDrawRimLabel(index: number, sliceCount: number, pointerIndex: number): boolean {
  if (index === pointerIndex) return true;
  const step = rimLabelStep(sliceCount);
  return (index + 1) % step === 0 || index === 0;
}

export class RouletteWheel {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private angle = 0;
  private sliceCount = 1;
  private played = new Set<number>();
  private animation: number | null = null;
  private theme: WheelTheme;

  constructor(canvas: HTMLCanvasElement, theme: WheelTheme = defaultTheme) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.theme = theme;
  }

  setSliceCount(count: number): void {
    this.sliceCount = Math.max(1, count);
    this.draw();
  }

  setPlayedIndices(indices: Iterable<number>): void {
    this.played = new Set(indices);
    this.draw();
  }

  pointerIndex(): number {
    return sliceIndexAtPointer(this.angle, this.sliceCount);
  }

  resize(cssSize: number): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
    this.canvas.width = Math.floor(cssSize * dpr);
    this.canvas.height = Math.floor(cssSize * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  draw(): void {
    const size = this.canvas.clientWidth;
    const ctx = this.ctx;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.46;
    const n = this.sliceCount;
    const slice = (Math.PI * 2) / n;
    const pointer = sliceIndexAtPointer(this.angle, n);

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    const colors = [this.theme.sliceA, this.theme.sliceB, this.theme.sliceC];
    for (let i = 0; i < n; i += 1) {
      const start = i * slice - Math.PI / 2;
      const end = start + slice;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = this.played.has(i) ? this.theme.slicePlayed : colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 231, 193, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!shouldDrawRimLabel(i, n, pointer)) continue;

      const mid = start + slice / 2;
      const labelR = radius * 0.78;
      ctx.save();
      ctx.rotate(mid + Math.PI / 2);
      ctx.translate(0, -labelR);
      ctx.fillStyle = this.theme.text;
      ctx.globalAlpha = this.played.has(i) ? 0.35 : 1;
      const fontSize = i === pointer ? 18 : 13;
      ctx.font = `700 ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), 0, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.theme.rim;
    ctx.lineWidth = size * 0.018;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.hub;
    ctx.fill();
    ctx.strokeStyle = this.theme.hubStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  spinToIndex(index: number, onIndex: (pointerIndex: number) => void, durationMs = 6000): Promise<void> {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    const n = this.sliceCount;
    const slice = (Math.PI * 2) / n;
    const extraTurns = 5 + Math.random() * 2;
    const landing = normalizeAngle((n - index) * slice - slice / 2);
    const spin = normalizeAngle(landing - normalizeAngle(this.angle));
    const target = this.angle + extraTurns * Math.PI * 2 + spin;

    const start = this.angle;
    const delta = target - start;
    const startTime = performance.now();
    let lastReported = -1;

    return new Promise((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        this.angle = start + delta * eased;
        this.draw();
        const current = sliceIndexAtPointer(this.angle, n);
        if (current !== lastReported) {
          lastReported = current;
          onIndex(current);
        }
        if (t < 1) {
          this.animation = requestAnimationFrame(tick);
        } else {
          this.angle = target;
          this.draw();
          this.animation = null;
          onIndex(sliceIndexAtPointer(this.angle, n));
          resolve();
        }
      };
      this.animation = requestAnimationFrame(tick);
    });
  }
}
