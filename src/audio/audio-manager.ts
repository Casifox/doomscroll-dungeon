import type { MusicTrack, Settings, SfxName } from '../core/types';

type SfxOptions = {
  pitch?: number;
  volume?: number;
};

type TrackPattern = {
  bpm: number;
  bass: (number | null)[];
  lead: (number | null)[];
  bassType: OscillatorType;
  leadType: OscillatorType;
  drums: boolean;
};

const TRACKS: Record<MusicTrack, TrackPattern> = {
  menu: {
    bpm: 72,
    bass: [45, null, null, null, 52, null, null, null, 48, null, null, null, 43, null, null, null],
    lead: [69, null, 72, null, 76, null, 72, null, 67, null, 71, null, 74, null, 71, null],
    bassType: 'sine',
    leadType: 'sine',
    drums: false,
  },
  dungeon: {
    bpm: 90,
    bass: [40, null, 40, null, 48, null, 40, null, 43, null, 43, null, 39, null, 36, null],
    lead: [64, 67, 71, 67, null, 63, 67, 70, 62, 66, 69, 66, null, 61, 64, 67],
    bassType: 'triangle',
    leadType: 'triangle',
    drums: true,
  },
  boss: {
    bpm: 132,
    bass: [36, 36, null, 36, 39, 39, null, 39, 34, 34, null, 34, 41, 41, 43, 43],
    lead: [72, null, 75, 79, 78, null, 75, 72, 70, null, 73, 77, 76, 79, 82, 79],
    bassType: 'sawtooth',
    leadType: 'square',
    drums: true,
  },
  results: {
    bpm: 68,
    bass: [41, null, null, null, 48, null, null, null, 45, null, null, null, 36, null, null, null],
    lead: [65, 69, 72, 76, 74, 69, 65, 62, 64, 67, 71, 74, 72, 67, 64, 60],
    bassType: 'sine',
    leadType: 'sine',
    drums: false,
  },
};

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private settings: Settings;
  private currentTrack: MusicTrack | null = null;
  private pendingTrack: MusicTrack | null = null;
  private schedulerId: number | null = null;
  private step = 0;
  private nextStepTime = 0;
  private ducked = false;
  private failed = false;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext;
        if (!Ctx) {
          this.failed = true;
          return;
        }
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyVolumes();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.pendingTrack) {
        const track = this.pendingTrack;
        this.pendingTrack = null;
        this.startScheduler(track);
      }
    } catch {
      this.failed = true;
    }
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
    this.applyVolumes();
    if (settings.musicVolume <= 0) {
      this.stopScheduler();
    } else if (this.ctx && this.currentTrack && this.schedulerId === null) {
      this.startScheduler(this.currentTrack);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.sfxBus || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.03);
    const musicVolume = this.settings.musicVolume * (this.ducked ? 0.3 : 1);
    this.musicBus.gain.setTargetAtTime(musicVolume, now, 0.08);
  }

  duck(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolumes();
  }

  setTrack(track: MusicTrack): void {
    if (this.currentTrack === track && this.schedulerId !== null) return;
    this.currentTrack = track;
    if (!this.ctx) {
      this.pendingTrack = track;
      return;
    }
    this.startScheduler(track);
  }

  stopMusic(): void {
    this.pendingTrack = null;
    this.currentTrack = null;
    this.stopScheduler();
  }

  private startScheduler(track: MusicTrack): void {
    if (!this.ctx) {
      this.pendingTrack = track;
      return;
    }
    this.stopScheduler();
    this.currentTrack = track;
    if (this.settings.musicVolume <= 0) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.schedulerId = window.setInterval(() => this.scheduleAhead(), 70);
    this.scheduleAhead();
  }

  private stopScheduler(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduleAhead(): void {
    if (!this.ctx || !this.currentTrack) return;
    const pattern = TRACKS[this.currentTrack];
    const secondsPerStep = 60 / pattern.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.22) {
      this.scheduleStep(pattern, this.step, this.nextStepTime);
      this.nextStepTime += secondsPerStep;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(pattern: TrackPattern, step: number, time: number): void {
    if (!this.ctx || !this.musicBus) return;
    const bass = pattern.bass[step];
    if (bass != null) {
      this.playMusicTone(midiToHz(bass), time, 0.3, 0.06, pattern.bassType, 0.01);
    }
    const lead = pattern.lead[step];
    if (lead != null) {
      this.playMusicTone(midiToHz(lead), time, 0.22, 0.035, pattern.leadType, 0.012);
    }
    if (pattern.drums) {
      if (step % 4 === 0) {
        this.playNoise(time, 0.05, 0.05, 180);
      }
      if (step % 4 === 2) {
        this.playNoise(time, 0.03, 0.022, 5200);
      }
    }
  }

  private playMusicTone(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    attack: number,
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const end = time + duration;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(end + 0.02);
  }

  playSfx(name: SfxName, options: SfxOptions = {}): void {
    if (!this.ctx || this.settings.sfxVolume <= 0) return;
    try {
      const now = this.ctx.currentTime;
      const volume = (options.volume ?? 1) * 0.5;
      const pitch = options.pitch ?? 0;
      switch (name) {
        case 'click':
          this.blip(520 + pitch * 20, now, 0.045, 0.055 * volume, 'sine');
          break;
        case 'like':
          this.blip(680 + pitch * 45, now, 0.07, 0.11 * volume, 'triangle');
          this.blip(980 + pitch * 55, now + 0.035, 0.08, 0.07 * volume, 'sine');
          break;
        case 'combo':
          this.blip(880 + pitch * 70, now, 0.06, 0.07 * volume, 'square');
          break;
        case 'hurt':
          this.blip(140, now, 0.16, 0.16 * volume, 'sawtooth', 70);
          this.noise(now, 0.12, 0.1 * volume, 420);
          break;
        case 'shield':
          this.chord([330, 440, 554], now, 0.3, 0.06 * volume);
          break;
        case 'heal':
          this.blip(523, now, 0.09, 0.08 * volume, 'sine');
          this.blip(784, now + 0.09, 0.13, 0.08 * volume, 'sine');
          break;
        case 'ignore':
          this.noise(now, 0.2, 0.07 * volume, 1200);
          this.blip(300, now + 0.05, 0.08, 0.05 * volume, 'triangle', 140);
          break;
        case 'explode':
          this.noise(now, 0.36, 0.16 * volume, 240);
          this.blip(90, now, 0.3, 0.15 * volume, 'sawtooth', 40);
          break;
        case 'warning':
          this.blip(660, now, 0.06, 0.05 * volume, 'square');
          this.blip(660, now + 0.1, 0.06, 0.04 * volume, 'square');
          break;
        case 'dodge':
          this.noise(now, 0.16, 0.08 * volume, 2200);
          this.blip(300, now, 0.12, 0.04 * volume, 'sine', 900);
          break;
        case 'upgrade':
          [523, 659, 784].forEach((freq, index) => {
            this.blip(freq, now + index * 0.07, 0.13, 0.07 * volume, 'triangle');
          });
          break;
        case 'select':
          this.blip(740, now, 0.05, 0.06 * volume, 'sine');
          break;
        case 'victory':
          [523, 659, 784, 1046, 1318].forEach((freq, index) => {
            this.blip(freq, now + index * 0.1, 0.24, 0.09 * volume, 'triangle');
          });
          break;
        case 'defeat':
          [392, 330, 262, 196].forEach((freq, index) => {
            this.blip(freq, now + index * 0.14, 0.32, 0.08 * volume, 'sawtooth');
          });
          break;
        case 'fake':
          this.blip(1046, now, 0.05, 0.035 * volume, 'square');
          this.blip(987, now + 0.08, 0.06, 0.03 * volume, 'square');
          break;
        case 'scroll':
          this.blip(210, now, 0.03, 0.025 * volume, 'sine');
          break;
        default:
          break;
      }
    } catch {
      // Un échec audio ne doit jamais interrompre la partie.
    }
  }

  private blip(
    frequency: number,
    when: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.sfxBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, frequency), when);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), when + duration);
    }
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  private chord(frequencies: number[], when: number, duration: number, volume: number): void {
    frequencies.forEach((freq) => this.blip(freq, when, duration, volume, 'sine'));
  }

  private noise(when: number, duration: number, volume: number, cutoff: number): void {
    if (!this.ctx || !this.sfxBus) return;
    if (!this.noiseBuffer) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, volume), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  playNoise(when: number, duration: number, volume: number, cutoff: number): void {
    if (!this.ctx || !this.musicBus) return;
    const source = this.ctx.createBufferSource();
    if (!this.noiseBuffer) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, volume), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }
}

export { TRACKS };
