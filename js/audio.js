/**
 * Web Audio API Sound Synthesizer
 */
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isReady = false;
  }

  init() {
    if (this.isReady && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        this.isReady = true;
      }
    } catch (e) {
      // Audio not supported
    }
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Sound playback error ignored
    }
  }

  step() {
    this.playTone(340, 'sine', 0.04, 0.04);
  }

  push() {
    this.playTone(180, 'triangle', 0.08, 0.06);
  }

  collect() {
    this.playTone(660, 'sine', 0.06, 0.08);
    setTimeout(() => this.playTone(990, 'triangle', 0.1, 0.08), 50);
  }

  breakRock() {
    this.playTone(140, 'square', 0.12, 0.09);
    setTimeout(() => this.playTone(90, 'sawtooth', 0.15, 0.09), 30);
  }

  jump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      // Jump sound error ignored
    }
  }

  undo() {
    this.playTone(450, 'sine', 0.06, 0.06);
  }

  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.18, 0.12), idx * 90);
    });
  }

  lose() {
    this.playTone(220, 'sawtooth', 0.15, 0.12);
    setTimeout(() => this.playTone(140, 'sawtooth', 0.25, 0.14), 100);
  }
}

window.sounds = new SoundSystem();
