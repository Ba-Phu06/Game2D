/**
 * Web Audio API Sound Synthesizer - Zero-Latency
 */
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isReady = false;
  }

  init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.isReady = true;
        }
      } catch (e) {
        // Audio not supported
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, type = 'sine', duration = 0.05, gainVal = 0.05) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio error ignored
    }
  }

  step() {
    this.playTone(320, 'sine', 0.03, 0.03);
  }

  push() {
    this.playTone(180, 'triangle', 0.06, 0.05);
  }

  collect() {
    this.playTone(660, 'sine', 0.06, 0.08);
    setTimeout(() => this.playTone(990, 'triangle', 0.08, 0.08), 40);
  }

  breakRock() {
    this.playTone(140, 'square', 0.1, 0.08);
    setTimeout(() => this.playTone(90, 'sawtooth', 0.12, 0.08), 25);
  }

  jump() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Jump audio error
    }
  }

  undo() {
    this.playTone(450, 'sine', 0.05, 0.05);
  }

  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.14, 0.1), idx * 80);
    });
  }

  lose() {
    this.playTone(220, 'sawtooth', 0.12, 0.1);
    setTimeout(() => this.playTone(140, 'sawtooth', 0.2, 0.12), 80);
  }
}

window.sounds = new SoundSystem();
