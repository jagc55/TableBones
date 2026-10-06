// 1930s Procedural Soundstage via Web Audio API & Vintage Gramophone Filter

class Soundstage {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Route any audio chain through a vintage 78 RPM phonograph bandpass filter
  private createGramophoneChain(outputDestination: AudioNode) {
    if (!this.ctx) return null;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.65, this.ctx.currentTime);

    // Warm soft saturation curve
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.makeWarmCurve(12) as Float32Array<ArrayBuffer>;

    distortion.connect(filter);
    filter.connect(outputDestination);
    return distortion;
  }

  private makeWarmCurve(amount: number): Float32Array {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // 1. Tactile Button Tap / Tile Step
  public playTap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    const chain = this.createGramophoneChain(this.ctx.destination);
    if (!chain) return;

    osc.connect(gain);
    gain.connect(chain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // 2. High Resonance Boxing Ring Bell Gong (880Hz + 1760Hz)
  public playRoundBell() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const frequencies = [880, 1760, 2640];

    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      const chain = this.createGramophoneChain(this.ctx.destination);
      if (!chain) return;

      osc.connect(gain);
      gain.connect(chain);

      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  // 3. Bulb-horn Honk ("Quack-Quack" for Kicking Player or Duplicate Alert)
  public playBulbHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(310, now + offset);
      osc.frequency.linearRampToValueAtTime(260, now + offset + 0.1);

      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);

      const chain = this.createGramophoneChain(this.ctx.destination);
      if (!chain) return;

      osc.connect(gain);
      gain.connect(chain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }

  // 4. Slide Whistle Descending (Forfeit / Player Leave / Invalid)
  public playSlideDown() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const chain = this.createGramophoneChain(this.ctx.destination);
    if (!chain) return;

    osc.connect(gain);
    gain.connect(chain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // 5. Ragtime Brass Chime (Wallop / Valid Action / Score)
  public playScoreTrumpet() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25]; // G4, C5, E5
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);

      const chain = this.createGramophoneChain(this.ctx.destination);
      if (!chain) return;

      osc.connect(gain);
      gain.connect(chain);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.23);
    });
  }

  // 6. Triumphant Fanfare / Victory Podium Knockout
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Bell ring followed by brass fanfare
    this.playRoundBell();

    const fanfare = [
      { note: 523.25, time: 0.15, dur: 0.18 }, // C5
      { note: 659.25, time: 0.35, dur: 0.18 }, // E5
      { note: 783.99, time: 0.55, dur: 0.2 },  // G5
      { note: 1046.5, time: 0.78, dur: 0.6 },  // C6
    ];

    fanfare.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f.note, now + f.time);

      gain.gain.setValueAtTime(0.25, now + f.time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + f.time + f.dur);

      const chain = this.createGramophoneChain(this.ctx.destination);
      if (!chain) return;

      osc.connect(gain);
      gain.connect(chain);

      osc.start(now + f.time);
      osc.stop(now + f.time + f.dur + 0.05);
    });
  }

  // 7. Vintage Typewriter Ding (Chat message incoming)
  public playChatDing() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1860, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    const chain = this.createGramophoneChain(this.ctx.destination);
    if (!chain) return;

    osc.connect(gain);
    gain.connect(chain);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const soundstage = new Soundstage();
