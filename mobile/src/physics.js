import { PHYSICS } from './tops.js';

/**
 * World-frame heavy symmetric top (tip contact).
 *
 * Frame: +Z up, tip at origin. Symmetry axis
 *   n = (sinθ cosφ, sinθ sinφ, cosθ)
 * Spin ω about n. Angular momentum L ≈ I₃ ω n.
 * Gravity torque τ = r_cm × Mg = M g h (n × (−ẑ)).
 * Slow precession: Ω = M g h / (I₃ ω) about vertical (τ ⊥ L).
 * Sleeping-top stability: I₃² ω² > 4 I₁ M g h.
 * Below that, gravity increases θ (fall); friction damps ω and nutation.
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
    this.omega = 0;
    this.theta = 0;
    this.phi = 0;
    this.thetaVel = 0;
    this.angle = 0;
    this.wobble = 0;
    this.alive = false;
    this.fallen = false;
    this.spinTime = 0;
    this.maxRpm = 0;
    this.lastFallenAt = 0;
  }

  get rpm() {
    return (this.omega * 60) / (Math.PI * 2);
  }

  set rpm(value) {
    this.omega = (value / 60) * Math.PI * 2;
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
    this.theta *= 0.72;
    this.thetaVel *= 0.5;
    this.alive = true;
    this.maxRpm = Math.max(this.maxRpm, this.rpm);
  }

  revive() {
    this.fallen = false;
    this.alive = true;
    this.theta = 0.04;
    this.phi = 0;
    this.thetaVel = 0;
    this.wobble = 0;
    this.spinTime = 0;
  }

  upright() {
    this.theta = 0;
    this.thetaVel = 0;
    this.wobble *= 0.3;
    if (this.fallen && this.rpm > PHYSICS.minRpmAlive) {
      this.fallen = false;
      this.alive = true;
    }
  }

  lean(dx, dy) {
    if (this.fallen) return;
    const deg = (this.theta * 180) / Math.PI;
    let x = deg * Math.cos(this.phi) + dx;
    let y = deg * Math.sin(this.phi) + dy;
    const mag = Math.hypot(x, y);
    this.theta = clamp(mag, 0, PHYSICS.fallThetaDeg) * (Math.PI / 180);
    this.phi = mag > 1e-6 ? Math.atan2(y, x) : this.phi;
    this.thetaVel += (Math.hypot(dx, dy) * Math.PI) / 180;
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    const { I1, I3, g, h } = this._inertias();

    if (this.fallen) {
      this.omega = Math.max(0, this.omega * Math.pow(0.9, dt * 60));
      this.theta = Math.min(Math.PI / 2, this.theta + dt * 0.8);
      this.wobble = Math.min(1, this.wobble + dt * 0.4);
      this.angle += this.omega * dt;
      return this.snapshot();
    }

    if (this.omega > 0.15) {
      this.alive = true;
      this.spinTime += dt;
      this.angle += this.omega * dt;

      const sinT = Math.sin(Math.max(this.theta, 1e-4));
      const cosT = Math.cos(this.theta);
      const slip = 1 - Math.min(0.06, sinT * sinT * 0.08);
      this.omega *= Math.pow(this.friction * slip, dt * 60);
      this.omega = Math.min((PHYSICS.maxRpm / 60) * Math.PI * 2, Math.max(0, this.omega));

      const L = Math.max(PHYSICS.Lmin, I3 * this.omega);
      const Omega = (this.mass * g * h) / L;
      this.phi += Omega * dt;

      const sleep2 = sleepingOmega2(this.mass);
      const ratio = (this.omega * this.omega) / Math.max(sleep2, 1e-9);
      const thetaAcc =
        sinT * ((this.mass * g * h) / I1) * (1 - ratio * cosT) - PHYSICS.nutationDamp * this.thetaVel;

      this.thetaVel += thetaAcc * dt;
      this.theta = clamp(this.theta + this.thetaVel * dt, 0, (PHYSICS.fallThetaDeg * Math.PI) / 180);

      const nutation = Math.min(1, Math.abs(this.thetaVel) / 4);
      const wobbleTarget = nutation * 0.7 + (this.theta / (Math.PI / 2)) * (1 - Math.min(1, ratio)) * 0.5;
      this.wobble += (wobbleTarget - this.wobble) * Math.min(1, dt * 5);

      this.maxRpm = Math.max(this.maxRpm, this.rpm);

      const thetaDeg = (this.theta * 180) / Math.PI;
      if (thetaDeg >= PHYSICS.fallThetaDeg - 0.5) {
        this.fall();
      } else if (this.rpm < PHYSICS.minRpmAlive && thetaDeg > PHYSICS.fallThetaDeg * 0.45) {
        this.fall();
      } else if (this.rpm < PHYSICS.minRpmAlive * 0.45) {
        this.fall();
      }
    } else {
      this.omega = 0;
      this.alive = false;
      this.thetaVel *= 0.9;
      this.wobble *= 0.95;
      if (this.theta > 0.2) this.fall();
    }

    return this.snapshot();
  }

  fall() {
    if (this.fallen) return;
    this.fallen = true;
    this.alive = false;
    this.thetaVel = 0;
    this.lastFallenAt = Date.now();
  }

  snapshot() {
    const thetaDeg = (this.theta * 180) / Math.PI;
    return {
      rpm: this.rpm,
      angle: this.angle,
      leanX: thetaDeg * Math.cos(this.phi),
      leanY: thetaDeg * Math.sin(this.phi),
      leanMag: thetaDeg,
      wobble: this.wobble,
      alive: this.alive,
      fallen: this.fallen,
      spinTime: this.spinTime,
      maxRpm: this.maxRpm,
      theta: this.theta,
      phi: this.phi,
      omega: this.omega,
    };
  }

  _inertias() {
    return {
      I1: PHYSICS.I1 * this.mass,
      I3: PHYSICS.I3 * this.mass,
      g: PHYSICS.g,
      h: PHYSICS.h,
    };
  }
}

/** Sleeping-top threshold ω² > 4 I₁ M g h / I₃² */
export function sleepingOmega2(mass) {
  const I1 = PHYSICS.I1 * mass;
  const I3 = PHYSICS.I3 * mass;
  return (4 * I1 * mass * PHYSICS.g * PHYSICS.h) / (I3 * I3);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
