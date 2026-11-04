/** Position payload interpretation and trajectory state; the localization algorithm plugs in here. */
export class LocalizationService {
  constructor({ min = -2, max = 2 } = {}) {
    this.min = min;
    this.max = max;
    this.points = [];
  }

  processPayload(payload) {
    let data;
    try { data = JSON.parse(payload); } catch { return null; }
    const candidate = data && (data.position || data.location || data);
    if (!candidate || typeof candidate !== 'object') return null;
    const x = Number(candidate?.x), y = Number(candidate?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const position = { x: this.#clamp(x), y: this.#clamp(y) };
    this.points.push(position);
    return { position, points: this.getTrajectory(), displayPayload: JSON.stringify(data, null, 2) };
  }

  getTrajectory() { return this.points.map(({ x, y }) => ({ x, y })); }

  reset() { this.points = []; }

  #clamp(value) { return Math.max(this.min, Math.min(this.max, value)); }
}
