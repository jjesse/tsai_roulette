export type WheelTheme = {
  sliceA: string;
  sliceB: string;
  sliceC: string;
  slicePlayed: string;
  text: string;
  rim: string;
  rimInner: string;
  hub: string;
  hubStroke: string;
  peg: string;
};

const defaultTheme: WheelTheme = {
  sliceA: "#00BFB2",
  sliceB: "#F6828C",
  sliceC: "#F4D35E",
  slicePlayed: "#2a2d36",
  text: "#FAF0CA",
  rim: "#00BFB2",
  rimInner: "#363946",
  hub: "#363946",
  hubStroke: "#FAF0CA",
  peg: "#F4D35E",
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

  resize(): void {
    const cssWidth = Math.max(1, this.canvas.clientWidth);
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  draw(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const size = Math.min(width, height);
    const ctx = this.ctx;
    const n = this.sliceCount;
    const slice = (Math.PI * 2) / n;
    const pointer = sliceIndexAtPointer(this.angle, n);

    const rimWidth = Math.max(8, size * 0.02);
    const hubStroke = Math.max(4, size * 0.01);
    const pointerHeight = Math.max(22, size * 0.045);
    const pointerWidth = pointerHeight * 0.55;
    const pointerPad = pointerHeight * 0.2;
    const outer = size / 2 - rimWidth / 2 - pointerPad - 1;
    const hubR = outer * 0.3;
    const labelR = outer * 0.84;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.clip();

    const colors = [this.theme.sliceA, this.theme.sliceB, this.theme.sliceC];
    for (let i = 0; i < n; i += 1) {
      const start = i * slice - Math.PI / 2;
      const end = start + slice;
      const fill = this.played.has(i) ? this.theme.slicePlayed : colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, outer + 2, start, end);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const a = i * slice - Math.PI / 2;
      ctx.moveTo(Math.cos(a) * hubR, Math.sin(a) * hubR);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    }
    ctx.strokeStyle = "rgba(54, 57, 70, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const fontSize = Math.max(8, Math.min(14, slice * labelR * 0.9));
    for (let i = 0; i < n; i += 1) {
      const fill = this.played.has(i) ? this.theme.slicePlayed : colors[i % colors.length];
      const mid = i * slice - Math.PI / 2 + slice / 2;
      ctx.save();
      ctx.rotate(mid + Math.PI / 2);
      ctx.translate(0, -labelR);
      ctx.fillStyle = fill.toLowerCase() === this.theme.sliceC.toLowerCase() ? "#363946" : this.theme.text;
      ctx.globalAlpha = this.played.has(i) ? 0.4 : 1;
      ctx.font = `700 ${i === pointer ? fontSize + 2 : fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), 0, 0);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.strokeStyle = this.theme.rim;
    ctx.lineWidth = rimWidth;
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, hubR, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.hub;
    ctx.fill();
    ctx.strokeStyle = this.theme.hubStroke;
    ctx.lineWidth = hubStroke;
    ctx.stroke();

    const hubLabel = String(pointer + 1);
    ctx.fillStyle = "#00BFB2";
    ctx.font = `800 ${Math.floor(hubR * 0.85)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hubLabel, 0, 0);

    const rimOuter = outer + rimWidth / 2;
    const base = -rimOuter;
    const tip = base + pointerHeight;
    ctx.beginPath();
    ctx.moveTo(0, tip);
    ctx.lineTo(-pointerWidth, base);
    ctx.lineTo(pointerWidth, base);
    ctx.closePath();
    ctx.fillStyle = this.theme.peg;
    ctx.strokeStyle = this.theme.hub;
    ctx.lineWidth = Math.max(2, size * 0.004);
    ctx.lineJoin = "round";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  spinToIndex(
    index: number,
    onIndex: (pointerIndex: number, progress01: number) => void,
    durationMs = 6000,
  ): Promise<void> {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    const n = this.sliceCount;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const target = spinTargetAngle(this.angle, index, n, extraTurns);

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
          onIndex(current, t);
        }
        if (t < 1) {
          this.animation = requestAnimationFrame(tick);
        } else {
          this.angle = target;
          this.draw();
          this.animation = null;
          onIndex(sliceIndexAtPointer(this.angle, n), 1);
          resolve();
        }
      };
      this.animation = requestAnimationFrame(tick);
    });
  }
}

export function spinTargetAngle(
  currentAngle: number,
  index: number,
  sliceCount: number,
  extraTurns: number,
): number {
  const n = Math.max(1, sliceCount);
  const slice = (Math.PI * 2) / n;
  const wholeTurns = Math.max(0, Math.floor(extraTurns));
  const landing = normalizeAngle((n - index) * slice - slice / 2);
  const spin = normalizeAngle(landing - normalizeAngle(currentAngle));
  return currentAngle + wholeTurns * Math.PI * 2 + spin;
}
