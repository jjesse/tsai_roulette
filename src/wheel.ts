export type WheelTheme = {
  sliceA: string;
  sliceB: string;
  sliceC: string;
  text: string;
  rim: string;
  hub: string;
  hubStroke: string;
};

const defaultTheme: WheelTheme = {
  sliceA: "#1a0b10",
  sliceB: "#8b1e2d",
  sliceC: "#c9a227",
  text: "#f6e7c1",
  rim: "#e6c878",
  hub: "#14080c",
  hubStroke: "#f0d58c",
};

export class RouletteWheel {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private angle = 0;
  private sliceCount = 1;
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
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 231, 193, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const mid = start + slice / 2;
      const labelR = radius * (n > 40 ? 0.78 : 0.72);
      ctx.save();
      ctx.rotate(mid + Math.PI / 2);
      ctx.translate(0, -labelR);
      ctx.fillStyle = this.theme.text;
      const fontSize = n > 80 ? 9 : n > 40 ? 11 : n > 24 ? 13 : 16;
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
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.hub;
    ctx.fill();
    ctx.strokeStyle = this.theme.hubStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  spinToIndex(index: number, durationMs = 5200): Promise<void> {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    const n = this.sliceCount;
    const slice = (Math.PI * 2) / n;
    const extraTurns = 5 + Math.random() * 2;
    const landing = this.normalize((n - index) * slice - slice / 2);
    const spin = this.normalize(landing - this.normalize(this.angle));
    const target = this.angle + extraTurns * Math.PI * 2 + spin;

    const start = this.angle;
    const delta = target - start;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        this.angle = start + delta * eased;
        this.draw();
        if (t < 1) {
          this.animation = requestAnimationFrame(tick);
        } else {
          this.angle = target;
          this.draw();
          this.animation = null;
          resolve();
        }
      };
      this.animation = requestAnimationFrame(tick);
    });
  }

  private normalize(radians: number): number {
    const tau = Math.PI * 2;
    return ((radians % tau) + tau) % tau;
  }
}
