/**
 * Continuous whir + whip/tap one-shots for the spinning top.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.humOsc = null;
    this.humOsc2 = null;
    this.humGain = null;
    this.humFilter = null;
    this.noiseSrc = null;
    this.noiseGain = null;
    this.humBase = 90;
    this.running = false;
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    this.master.connect(this.ctx.destination);
    this._buildHum();
  }

  _buildHum() {
    this.humOsc = this.ctx.createOscillator();
    this.humOsc2 = this.ctx.createOscillator();
    this.humFilter = this.ctx.createBiquadFilter();
    this.humGain = this.ctx.createGain();

    this.humOsc.type = 'sawtooth';
    this.humOsc2.type = 'triangle';
    this.humOsc.frequency.value = this.humBase;
    this.humOsc2.frequency.value = this.humBase * 1.01;

    this.humFilter.type = 'lowpass';
    this.humFilter.frequency.value = 900;
    this.humFilter.Q.value = 0.7;

    this.humGain.gain.value = 0.0001;

    this.humOsc.connect(this.humFilter);
    this.humOsc2.connect(this.humFilter);
    this.humFilter.connect(this.humGain);
    this.humGain.connect(this.master);

    // Soft noise bed for friction
    const noiseBuf = this._noiseBuffer(2);
    this.noiseSrc = this.ctx.createBufferSource();
    this.noiseSrc.buffer = noiseBuf;
    this.noiseSrc.loop = true;
    const np = this.ctx.createBiquadFilter();
    np.type = 'bandpass';
    np.frequency.value = 1800;
    np.Q.value = 0.6;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.0001;
    this.noiseSrc.connect(np);
    np.connect(this.noiseGain);
    this.noiseGain.connect(this.master);

    this.humOsc.start();
    this.humOsc2.start();
    this.noiseSrc.start();
    this.running = true;
  }

  setTopProfile(top) {
    this.humBase = top.humBase ?? 90;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Drive continuous tone from physics snapshot.
   * @param {{ rpm: number, fallen: boolean, leanMag: number }} snap
   */
  sync(snap) {
    if (!this.ctx || !this.humGain || this.muted) return;
    const t = this.ctx.currentTime;
    const rpm = snap.fallen ? snap.rpm * 0.2 : snap.rpm;
    const norm = Math.min(1, rpm / 1800);
    const freq = this.humBase + norm * 220 + (snap.leanMag || 0) * 0.4;
    const vol = norm < 0.02 ? 0.0001 : 0.04 + norm * 0.22;

    this.humOsc.frequency.setTargetAtTime(freq, t, 0.05);
    this.humOsc2.frequency.setTargetAtTime(freq * 1.008, t, 0.05);
    this.humFilter.frequency.setTargetAtTime(600 + norm * 2200, t, 0.08);
    this.humGain.gain.setTargetAtTime(vol, t, 0.06);
    this.noiseGain.gain.setTargetAtTime(norm * 0.04, t, 0.08);
  }

  async whip(velocity = 0.85) {
    await this.ensure();
    if (this.muted) return;
    const t = this.ctx.currentTime;
    const v = Math.min(1.3, Math.max(0.3, velocity));

    const noise = this._noiseBuffer(0.25);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + v * 800;
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180 + v * 80, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    og.gain.setValueAtTime(0.2 * v, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(og);
    og.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  async tap(velocity = 0.85) {
    await this.ensure();
    if (this.muted) return;
    const t = this.ctx.currentTime;
    const v = Math.min(1.2, Math.max(0.3, velocity));

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    g.gain.setValueAtTime(0.28 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.12);

    const click = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 640;
    cg.gain.setValueAtTime(0.08 * v, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    click.connect(cg);
    cg.connect(this.master);
    click.start(t);
    click.stop(t + 0.04);
  }

  async fall() {
    await this.ensure();
    if (this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  _noiseBuffer(duration) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
