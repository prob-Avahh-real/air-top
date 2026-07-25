import { PHYSICS } from './tops.js';

/**
 * Spinning-top physics: RPM, lean, wobble, fall.
 */
export class TopPhysics {
  constructor(top) {
    this.applyTop(top);
    this.reset();
  }

  applyTop(top) {
    this.top = top;
    this.friction = top.friction;
    this.mass = top.mass;
  }

  reset() {
    this.rpm = 0;
    this.angle = 0;
    this.leanX = 0;
    this.leanY = 0;
    this.wobble = 0;
    this.alive = false;
    this.fallen = false;
    this.spinTime = 0;
    this.maxRpm = 0;
    this.lastFallenAt = 0;
  }

  whip(velocity = 0.85) {
    if (this.fallen) this.revive();
    const boost = (PHYSICS.whipBoost / this.mass) * Math.min(1.3, Math.max(0.4, velocity));
    this.rpm = Math.min(PHYSICS.maxRpm, this.rpm + boost);
    this.alive = true;
    this.fallen = false;
    this.maxRpm = Math.max(this.maxRpm, this.rpm);
  }

  tap(velocity = 0.85) {
    if (this.fallen) {
      this.revive();
      this.rpm = Math.min(PHYSICS.maxRpm, this.rpm + PHYSICS.tapBoost * 0.6);
      return;
    }
    const boost = (PHYSICS.tapBoost / this.mass) * Math.min(1.2, Math.max(0.35, velocity));
    this.rpm = Math.min(PHYSICS.maxRpm, this.rpm + boost);
    this.leanX *= 0.72;
    this.leanY *= 0.72;
    this.alive = true;
    this.maxRpm = Math.max(this.maxRpm, this.rpm);
  }

  revive() {
    this.fallen = false;
    this.alive = true;
    this.leanX = 0;
    this.leanY = 0;
    this.wobble = 0;
    this.spinTime = 0;
  }

  upright() {
    this.leanX = 0;
    this.leanY = 0;
    this.wobble *= 0.3;
    if (this.fallen && this.rpm > PHYSICS.minRpmAlive) {
      this.fallen = false;
      this.alive = true;
    }
  }

  lean(dx, dy) {
    if (this.fallen) return;
    this.leanX = clamp(this.leanX + dx, -40, 40);
    this.leanY = clamp(this.leanY + dy, -40, 40);
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (this.fallen) {
      this.rpm = Math.max(0, this.rpm * Math.pow(0.9, dt * 60));
      this.wobble = Math.min(1, this.wobble + dt * 0.4);
      return this.snapshot();
    }

    if (this.rpm > 1) {
      this.alive = true;
      this.spinTime += dt;
      const spinRate = (this.rpm / 60) * Math.PI * 2;
      this.angle += spinRate * dt;

      // Friction + lean drag
      const leanMag = Math.hypot(this.leanX, this.leanY);
      const leanDrag = 1 - Math.min(0.04, leanMag * 0.0008);
      this.rpm *= Math.pow(this.friction * leanDrag, dt * 60);

      // Gyroscopic self-righting when fast
      const stability = Math.min(1, this.rpm / 800);
      this.leanX *= 1 - PHYSICS.uprightRate * stability * dt * 8;
      this.leanY *= 1 - PHYSICS.uprightRate * stability * dt * 8;

      // Wobble grows when slow + leaned
      const wobbleTarget = (leanMag / 40) * (1 - stability) + (1 - Math.min(1, this.rpm / 300)) * 0.35;
      this.wobble += (wobbleTarget - this.wobble) * Math.min(1, dt * 4);

      this.maxRpm = Math.max(this.maxRpm, this.rpm);

      if (this.rpm < PHYSICS.minRpmAlive && leanMag > PHYSICS.fallLean * 0.55) {
        this.fall();
      } else if (this.rpm < PHYSICS.minRpmAlive * 0.5) {
        this.fall();
      } else if (leanMag > PHYSICS.fallLean && this.rpm < 500) {
        this.fall();
      }
    } else {
      this.rpm = 0;
      this.alive = false;
      this.wobble *= 0.95;
    }

    return this.snapshot();
  }

  fall() {
    if (this.fallen) return;
    this.fallen = true;
    this.alive = false;
    this.lastFallenAt = Date.now();
  }

  snapshot() {
    return {
      rpm: this.rpm,
      angle: this.angle,
      leanX: this.leanX,
      leanY: this.leanY,
      leanMag: Math.hypot(this.leanX, this.leanY),
      wobble: this.wobble,
      alive: this.alive,
      fallen: this.fallen,
      spinTime: this.spinTime,
      maxRpm: this.maxRpm,
    };
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
