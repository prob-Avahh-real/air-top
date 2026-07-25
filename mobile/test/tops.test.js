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
