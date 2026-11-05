/** Validates cloud-computed results and holds trajectory state. No localization algorithm. */
export class LocalizationService {
  constructor({ min = -2, max = 2 } = {}) {
    this.min = min;
    this.max = max;
    this.points = [];
  }

  processResult(result) {
    if (!result || typeof result !== 'object') return null;
    const { x, y } = result;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const position = { x: this.#clamp(x), y: this.#clamp(y) };
    this.points.push(position);
    if (this.points.length > 1200) this.points.shift();
    return { position, points: this.getTrajectory(), displayPayload: JSON.stringify(result, null, 2) };
  }

  getTrajectory() { return this.points.map(({ x, y }) => ({ x, y })); }

  reset() { this.points = []; }

  #clamp(value) { return Math.max(this.min, Math.min(this.max, value)); }
}
