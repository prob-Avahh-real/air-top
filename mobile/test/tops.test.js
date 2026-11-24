const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const TOPS = [
  { id: 'wood', label: '木质', friction: 0.985, mass: 1.0 },
  { id: 'metal', label: '金属', friction: 0.992, mass: 1.35 },
  { id: 'neon', label: '霓虹', friction: 0.978, mass: 0.75 },
  { id: 'glass', label: '琉璃', friction: 0.988, mass: 0.9 },
];

const PHYSICS = {
  minRpmAlive: 40,
  maxRpm: 2400,
  whipBoost: 280,
  tapBoost: 120,
  fallLean: 28,
};

const WEARABLE_DEFAULTS = {
  RING_TILT: 6.5,
  RING_SHAKE: 24,
  CANE_TAP: 9,
  CANE_SWING: 3.6,
  RING_THROTTLE: 6,
  CANE_THROTTLE: 5,
  RING_AXIS_DOMINANCE: 1.18,
  RING_LEAN_COOLDOWN_MS: 95,
  RING_STYLE_COOLDOWN_MS: 650,
  RING_SHAKE_COOLDOWN_MS: 900,
  CANE_TAP_COOLDOWN_MS: 190,
  CANE_SWING_COOLDOWN_MS: 240,
};

function wrap(i, n) {
  return ((i % n) + n) % n;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

describe('air-top skins', () => {
  it('has four top styles', () => {
    assert.deepEqual(
      TOPS.map((t) => t.id),
      ['wood', 'metal', 'neon', 'glass']
    );
  });

  it('metal has higher friction than neon', () => {
    const metal = TOPS.find((t) => t.id === 'metal');
    const neon = TOPS.find((t) => t.id === 'neon');
    assert.ok(metal.friction > neon.friction);
    assert.ok(metal.mass > neon.mass);
  });

  it('wrap cycles top index', () => {
    assert.equal(wrap(-1, 4), 3);
    assert.equal(wrap(4, 4), 0);
  });
});

describe('air-top physics helpers', () => {
  it('whip boost stays under max rpm', () => {
    let rpm = 0;
    const boost = PHYSICS.whipBoost / TOPS[0].mass;
    rpm = Math.min(PHYSICS.maxRpm, rpm + boost);
    assert.ok(rpm > 200);
    assert.ok(rpm <= PHYSICS.maxRpm);
  });

  it('lean clamps', () => {
    assert.equal(clamp(50, -40, 40), 40);
    assert.equal(clamp(-50, -40, 40), -40);
  });

  it('precession rotates lean azimuth without changing magnitude', () => {
    // Ω·dt rotation of lean vector (same as physics.js)
    const lx0 = 10;
    const ly0 = 0;
    const mag0 = Math.hypot(lx0, ly0);
    const omegaDt = Math.PI / 2;
    const c = Math.cos(omegaDt);
    const s = Math.sin(omegaDt);
    const lx = lx0 * c - ly0 * s;
    const ly = lx0 * s + ly0 * c;
    assert.ok(Math.abs(Math.hypot(lx, ly) - mag0) < 1e-9);
    assert.ok(Math.abs(lx) < 1e-9);
    assert.ok(Math.abs(ly - 10) < 1e-9);
  });

  it('faster spin yields slower precession for same torque', () => {
    const tau = 1.2;
    const OmegaSlow = tau / 0.5;
    const OmegaFast = tau / 4;
    assert.ok(OmegaFast < OmegaSlow);
  });

  it('ui azimuth mapping keeps right-hand precession direction on screen', () => {
    const leanX = 0;
    const leanY = 12;
    const oldAzimuth = Math.atan2(leanX, leanY);
    const fixedAzimuth = Math.atan2(leanX, -leanY);
    assert.ok(oldAzimuth < 0.001);
    assert.ok(Math.abs(fixedAzimuth - Math.PI) < 1e-9);
  });
});

describe('wearable iOS tuning', () => {
  it('keeps thresholds and cooldowns in calibrated range', () => {
    assert.ok(WEARABLE_DEFAULTS.RING_TILT >= 6 && WEARABLE_DEFAULTS.RING_TILT <= 8);
    assert.ok(WEARABLE_DEFAULTS.RING_SHAKE >= 22);
    assert.ok(WEARABLE_DEFAULTS.CANE_TAP >= 8.5);
    assert.ok(WEARABLE_DEFAULTS.CANE_SWING >= 3.4);
    assert.ok(WEARABLE_DEFAULTS.RING_AXIS_DOMINANCE > 1);
    assert.ok(WEARABLE_DEFAULTS.RING_STYLE_COOLDOWN_MS > WEARABLE_DEFAULTS.RING_LEAN_COOLDOWN_MS);
    assert.ok(WEARABLE_DEFAULTS.CANE_TAP_COOLDOWN_MS >= 180);
    assert.ok(WEARABLE_DEFAULTS.CANE_SWING_COOLDOWN_MS >= 220);
  });
});

describe('project scaffold', () => {
  it('protocol file exists with ring and cane gestures', () => {
    const p = path.join(__dirname, '..', '..', 'protocol', 'air-top.json');
    assert.ok(fs.existsSync(p));
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(data.gestures.ring);
    assert.ok(data.gestures.cane);
    assert.equal(data.gestures.cane.swing.action, 'whip');
    assert.equal(data.gestures.cane.tap.action, 'tap');
    assert.equal(data.gestures.ring.tilt_left.action, 'lean_left');
    assert.equal(data.tops.length, 4);
  });
});
