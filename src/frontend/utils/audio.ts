// 1930s Procedural Soundstage via Web Audio API & Vintage Gramophone Filter

class Soundstage {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private masterGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (typeof window === 'undefined') return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('AudioContext creation failed', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private cachedCurve: Float32Array | null = null;

  // Route any audio chain through a vintage 78 RPM phonograph bandpass filter
  private createGramophoneChain(outputDestination?: AudioNode) {
    if (!this.ctx) return null;
    const dest = outputDestination || this.masterGain || this.ctx.destination;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    if (!this.cachedCurve) {
      this.cachedCurve = this.makeWarmCurve(1.5);
    }

    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.cachedCurve as Float32Array<ArrayBuffer>;
    distortion.oversample = 'none';

    distortion.connect(filter);
    filter.connect(dest);
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
    const frequencies = [880, 1760];

    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = idx === 0 ? 0.22 : 0.09;
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      const chain = this.createGramophoneChain();
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

  // 6. 10-Second Urgent Warning Chime (Two-tone urgent warning "Beep-Bop!")
  public playTimerWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const beeps = [
        { freq: 880, start: 0, dur: 0.08 },
        { freq: 1174.66, start: 0.1, dur: 0.12 },
      ];

      beeps.forEach((b) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(b.freq, now + b.start);

        gain.gain.setValueAtTime(0.18, now + b.start);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + b.start + b.dur);

        const chain = this.createGramophoneChain();
        if (!chain) return;

        osc.connect(gain);
        gain.connect(chain);

        osc.start(now + b.start);
        osc.stop(now + b.start + b.dur + 0.02);
      });
    } catch {
      // Audio fallback
    }
  }

  // 7. Mechanical Timer Tick for urgent seconds countdown
  public playTimerTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      const chain = this.createGramophoneChain();
      if (!chain) return;

      osc.connect(gain);
      gain.connect(chain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  // 8. Theatrical Round End Gong (Classic boxing bell ding + smooth chime gong)
  public playRoundEnd() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Two clear bell dings (Ding-Ding!)
      [0, 0.2].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now + delay); // C6 clear chime

        gain.gain.setValueAtTime(0.14, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);

        const chain = this.createGramophoneChain();
        if (!chain) return;

        osc.connect(gain);
        gain.connect(chain);

        osc.start(now + delay);
        osc.stop(now + delay + 0.48);
      });

      // 2. Resonant warm gong finish
      const gong = this.ctx.createOscillator();
      const gongGain = this.ctx.createGain();
      gong.type = 'sine';
      gong.frequency.setValueAtTime(261.63, now + 0.25); // C4
      gong.frequency.exponentialRampToValueAtTime(130.81, now + 1.2); // C3

      gongGain.gain.setValueAtTime(0.12, now + 0.25);
      gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      const gongChain = this.createGramophoneChain();
      if (gongChain) {
        gong.connect(gongGain);
        gongGain.connect(gongChain);
        gong.start(now + 0.25);
        gong.stop(now + 1.25);
      }
    } catch {
      // Audio fallback
    }
  }

  // 9. Triumphant Fanfare / Victory Podium Knockout
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const fanfare = [
      { note: 523.25, time: 0.05, dur: 0.16 }, // C5
      { note: 659.25, time: 0.22, dur: 0.16 }, // E5
      { note: 783.99, time: 0.40, dur: 0.18 },  // G5
      { note: 1046.5, time: 0.60, dur: 0.5 },  // C6
    ];

    fanfare.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f.note, now + f.time);

      gain.gain.setValueAtTime(0.2, now + f.time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + f.time + f.dur);

      const chain = this.createGramophoneChain();
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

  // 8. Stride Pentatonic Step Tone for connecting tiles in Bonegle
  public playTileSelect(step = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
      const freq = scale[Math.min(step, scale.length - 1)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      const chain = this.createGramophoneChain(this.ctx.destination);
      if (!chain) return;
      osc.connect(gain);
      gain.connect(chain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio fallback
    }
  }

  // 9. Backtrack tile pop
  public playTileBacktrack() {
    this.playTap();
  }
}

export const soundstage = new Soundstage();
