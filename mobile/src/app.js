import { TOPS, PHYSICS } from './tops.js';
import { TopPhysics } from './physics.js';
import { AudioEngine } from './audio-engine.js';
import { WearableInput } from './wearable-input.js';

const $ = (id) => document.getElementById(id);

const audio = new AudioEngine();
const state = {
  topIndex: 0,
  muted: false,
  bestTime: Number(localStorage.getItem('air-top-best') || 0),
  sessionBest: 0,
};

const physics = new TopPhysics(TOPS[0]);
let lastTs = 0;
let wasFallen = false;

function currentTop() {
  return TOPS[state.topIndex];
}

function wrap(i, n) {
  return ((i % n) + n) % n;
}

function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 1200);
}

function haptic(ms = 14) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

function applyTheme() {
  const top = currentTop();
  document.documentElement.style.setProperty('--accent', top.color);
  document.body.dataset.top = top.id;
  audio.setTopProfile(top);
}

function formatTime(sec) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

function renderChrome() {
  const top = currentTop();
  applyTheme();
  $('top-name').textContent = top.label;
  $('top-hint').textContent = top.description;

  const tabs = $('top-tabs');
  tabs.innerHTML = TOPS.map(
    (t, i) => `
    <button type="button" class="top-tab ${i === state.topIndex ? 'active' : ''}" data-i="${i}">
      ${t.label}
    </button>`
  ).join('');

  $('mute-btn').classList.toggle('on', state.muted);
  $('mute-btn').textContent = state.muted ? '已静音' : '静音';
  $('best-time').textContent = formatTime(Math.max(state.bestTime, state.sessionBest));
}

function renderHud(snap) {
  $('rpm').textContent = String(Math.round(snap.rpm));
  $('spin-time').textContent = formatTime(snap.spinTime);
  $('lean-val').textContent = `${snap.leanMag.toFixed(0)}°`;
  $('status').textContent = snap.fallen ? '倒下了' : snap.alive ? '旋转中' : '待命';
  $('status').dataset.state = snap.fallen ? 'fallen' : snap.alive ? 'spin' : 'idle';

  const topEl = $('top-visual');
  const shadow = $('shadow');
  const leanX = snap.leanX;
  const leanY = snap.leanY;
  const wobble = snap.wobble * 8;
  const rot = (snap.angle * 180) / Math.PI;
  const tilt = Math.min(32, snap.leanMag * 0.9);
  const scale = snap.fallen ? 0.92 : 1;

  if (snap.fallen) {
    topEl.style.transform = `translate(${leanX * 1.2}px, 28px) rotate(${45 + leanX}deg) scale(${scale})`;
    topEl.classList.add('fallen');
  } else {
    topEl.classList.remove('fallen');
    topEl.style.transform = `
      translate(${leanX * 0.6 + Math.sin(snap.angle * 3) * wobble * 0.15}px, ${leanY * 0.15}px)
      rotateX(${12 + tilt * 0.3}deg)
      rotateZ(${rot}deg)
      rotateY(${leanX * 0.35}deg)
      scale(${scale})
    `;
  }

  const spinBody = $('top-body');
  if (spinBody) {
    spinBody.style.setProperty('--spin', `${rot}deg`);
  }

  shadow.style.transform = `translateX(${leanX * 0.9}px) scale(${1 + snap.leanMag * 0.008}, ${0.55 + snap.wobble * 0.2})`;
  shadow.style.opacity = String(0.25 + Math.min(0.45, snap.rpm / 3000));

  const rpmBar = $('rpm-bar');
  if (rpmBar) {
    rpmBar.style.width = `${Math.min(100, (snap.rpm / PHYSICS.maxRpm) * 100)}%`;
  }
}

function selectTop(i) {
  state.topIndex = wrap(i, TOPS.length);
  physics.applyTop(currentTop());
  renderChrome();
  showToast(`陀螺 · ${currentTop().label}`);
  haptic(8);
}

function setMuted(muted) {
  state.muted = muted;
  audio.setMuted(muted);
  renderChrome();
  showToast(muted ? '已静音' : '取消静音');
}

async function doWhip(detail = {}) {
  await audio.ensure();
  const v = detail.velocity ?? 0.95;
  physics.whip(v);
  await audio.whip(v);
  haptic(18);
  const el = $('top-visual');
  el.classList.remove('whip');
  void el.offsetWidth;
  el.classList.add('whip');
  showToast('抽！');
}

async function doTap(detail = {}) {
  await audio.ensure();
  const v = detail.velocity ?? 0.9;
  physics.tap(v);
  await audio.tap(v);
  haptic(12);
  showToast('点地');
}

function doUpright() {
  physics.upright();
  haptic(10);
  showToast('扶正');
}

function handleGesture(gesture, detail) {
  switch (gesture) {
    case 'lean_left':
      physics.lean(-PHYSICS.leanStep, 0);
      break;
    case 'lean_right':
      physics.lean(PHYSICS.leanStep, 0);
      break;
    case 'prev_top':
      selectTop(state.topIndex - 1);
      break;
    case 'next_top':
      selectTop(state.topIndex + 1);
      break;
    case 'whip':
      doWhip(detail || { velocity: 0.85 });
      break;
    case 'tap':
      doTap(detail || { velocity: 0.85 });
      break;
    case 'toggle_mute':
      setMuted(!state.muted);
      break;
    default:
      break;
  }
}

const wearable = new WearableInput({
  onGesture: handleGesture,
  onBadge: (kind, text, active) => {
    const el = $(`${kind}-badge`);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('active', active);
  },
});

function bindUi() {
  $('top-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.top-tab');
    if (!btn) return;
    selectTop(Number(btn.dataset.i));
  });

  $('whip-btn').addEventListener('click', () => doWhip({ velocity: 1.0 }));
  $('tap-btn').addEventListener('click', () => doTap({ velocity: 0.95 }));
  $('upright-btn').addEventListener('click', doUpright);
  $('mute-btn').addEventListener('click', () => setMuted(!state.muted));

  // Drag on stage to lean
  const stage = $('arena');
  let dragging = false;
  let lastX = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    physics.lean(dx * 0.08, 0);
  });
  stage.addEventListener('pointerup', () => {
    dragging = false;
  });
  stage.addEventListener('pointercancel', () => {
    dragging = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      doWhip({ velocity: 0.95 });
    } else if (e.key === 't' || e.key === 'T') doTap({ velocity: 0.9 });
    else if (e.key === 'r' || e.key === 'R') doUpright();
    else if (e.key === 'ArrowLeft') physics.lean(-PHYSICS.leanStep, 0);
    else if (e.key === 'ArrowRight') physics.lean(PHYSICS.leanStep, 0);
    else if (e.key === 'ArrowUp') selectTop(state.topIndex - 1);
    else if (e.key === 'ArrowDown') selectTop(state.topIndex + 1);
    else if (e.key === 'm' || e.key === 'M') setMuted(!state.muted);
  });
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const snap = physics.update(dt);
  renderHud(snap);
  audio.sync(snap);

  if (snap.fallen && !wasFallen) {
    audio.fall();
    haptic([20, 40, 20]);
    state.sessionBest = Math.max(state.sessionBest, snap.spinTime);
    if (snap.spinTime > state.bestTime) {
      state.bestTime = snap.spinTime;
      localStorage.setItem('air-top-best', String(state.bestTime));
      showToast(`新纪录 ${formatTime(snap.spinTime)}`);
    } else {
      showToast(`倒下 · ${formatTime(snap.spinTime)}`);
    }
    renderChrome();
  }
  wasFallen = snap.fallen;

  requestAnimationFrame(loop);
}

renderChrome();
bindUi();
wearable.setupRing();
wearable.setupCane();
requestAnimationFrame(loop);

document.body.addEventListener(
  'pointerdown',
  () => {
    audio.ensure();
  },
  { once: true }
);
