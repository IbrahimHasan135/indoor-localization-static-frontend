/** Slow, continuous preview motion. Independent of MQTT and cloud results. */
export class SimulationService {
  constructor({ random = Math.random, schedule = (callback, delay) => setInterval(callback, delay), cancel = (timer) => clearInterval(timer), now = () => performance.now() } = {}) {
    this.random = random;
    this.schedule = schedule;
    this.cancel = cancel;
    this.now = now;
    this.timer = null;
    this.reset();
  }

  get isRunning() { return this.timer !== null; }

  reset() {
    this.pause();
    this.position = { x: 0, y: 0 };
    this.heading = this.random() * Math.PI * 2;
    this.target = this.pickTarget();
  }

  pickTarget() {
    return { x: (this.random() * 2 - 1) * 1.2, y: (this.random() * 2 - 1) * 1.2 };
  }

  // Fixed speed (0.13 m/s), bounded steering, and interior targets prevent jumps.
  step(seconds) {
    const dt = Math.max(0, Math.min(seconds, 0.15));
    const { x, y } = this.position;
    if (Math.hypot(this.target.x - x, this.target.y - y) < 0.3) this.target = this.pickTarget();
    const nearEdge = Math.max(Math.abs(x), Math.abs(y)) > 1.55;
    const desired = nearEdge ? Math.atan2(-y, -x) : Math.atan2(this.target.y - y, this.target.x - x);
    const difference = Math.atan2(Math.sin(desired - this.heading), Math.cos(desired - this.heading));
    const maxTurn = 0.7 * dt;
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, difference));
    this.position = { x: x + Math.cos(this.heading) * 0.13 * dt, y: y + Math.sin(this.heading) * 0.13 * dt };
    return { ...this.position };
  }

  run(onPosition) {
    if (this.isRunning) return;
    let previous = this.now();
    this.timer = this.schedule(() => {
      const current = this.now();
      onPosition(this.step((current - previous) / 1000));
      previous = current;
    }, 100);
  }

  pause() {
    if (this.isRunning) this.cancel(this.timer);
    this.timer = null;
  }
}
