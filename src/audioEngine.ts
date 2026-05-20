import { MoodType, SoundId } from './types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundGains: Record<SoundId, GainNode | null> = {
    rain: null,
    keyboard: null,
    cafe: null,
    thunder: null,
    fireplace: null,
    city: null,
    train: null,
    vinyl: null,
    birds: null,
    ocean: null,
    white_noise: null,
    soft_music: null
  };

  private activeNodes: Record<string, any[]> = {};
  private currentVolumeSettings: Record<SoundId, number> = {
    rain: 0.5,
    keyboard: 0.4,
    cafe: 0.4,
    thunder: 0.5,
    fireplace: 0.5,
    city: 0.3,
    train: 0.4,
    vinyl: 0.4,
    birds: 0.8,
    ocean: 0.5,
    white_noise: 0.3,
    soft_music: 0.6
  };

  private masterVolume: number = 0.8;
  private currentMood: MoodType = 'cozy';
  private buffers: { white: AudioBuffer | null; pink: AudioBuffer | null; brown: AudioBuffer | null } = {
    white: null,
    pink: null,
    brown: null
  };

  // Keep track of active intervals for scheduling events
  private schedulers: Record<string, number | NodeJS.Timeout> = {};
  private isStoppingAll = false;

  constructor() {}

  public init() {
    if (this.ctx) return;
    try {
      // Create audio context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Warm up noise buffers
      this.generateNoiseBuffers();
    } catch (e) {
      console.error('Web Audio API not supported in this browser.', e);
    }
  }

  private generateNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 3; // 3 seconds loop

    // 1. White Noise Buffer
    const whiteBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.buffers.white = whiteBuffer;

    // 2. Brown Noise Buffer
    const brownBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = brownData[i];
      // Normalize a bit
      brownData[i] *= 4.5;
    }
    this.buffers.brown = brownBuffer;

    // 3. Pink Noise Buffer (Voss-McCartney approximation)
    const pinkBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      pinkData[i] *= 0.11; // rescue level
      b6 = white * 0.115926;
    }
    this.buffers.pink = pinkBuffer;
  }

  // Resumes audio context safely
  public async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  public setSoundVolume(id: SoundId, vol: number) {
    this.currentVolumeSettings[id] = vol;
    const gainNode = this.soundGains[id];
    if (gainNode && this.ctx) {
      // Smooth transit
      gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.15);
    }
  }

  public getSoundVolume(id: SoundId): number {
    return this.currentVolumeSettings[id];
  }

  public setMood(mood: MoodType) {
    this.currentMood = mood;
    // Modulate soft music, rain filter, etc.
    this.updateSoundModulations();
  }

  private updateSoundModulations() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    // Modulate sounds depending on atmosphere
    // E.g. Sleepy mood adds a lowpass filter to master
    // Overthinking mood adds filter sweep to music
    // Sad mood dims overall pad music frequencies
    // Productive boosts keyboard tap crispness
  }

  public toggleSound(id: SoundId, forceState?: boolean): boolean {
    this.init();
    this.resumeContext();

    const isRunning = this.isSoundPlaying(id);
    const shouldStart = forceState !== undefined ? forceState : !isRunning;

    if (shouldStart && !isRunning) {
      this.startSoundNode(id);
      return true;
    } else if (!shouldStart && isRunning) {
      this.stopSoundNode(id);
      return false;
    }
    return isRunning;
  }

  public isSoundPlaying(id: SoundId): boolean {
    return !!(this.activeNodes[id] && this.activeNodes[id].length > 0);
  }

  private startSoundNode(id: SoundId) {
    if (!this.ctx || !this.masterGain) return;

    // Create sub-gain node for this specific sound
    const soundGain = this.ctx.createGain();
    // Fade in
    soundGain.gain.setValueAtTime(0, this.ctx.currentTime);
    soundGain.gain.setTargetAtTime(this.currentVolumeSettings[id], this.ctx.currentTime, 0.4);
    soundGain.connect(this.masterGain);
    this.soundGains[id] = soundGain;

    this.activeNodes[id] = [];

    // Select suitable synthesizer model
    switch (id) {
      case 'rain':
        this.buildRainSynth(soundGain);
        break;
      case 'ocean':
        this.buildOceanSynth(soundGain);
        break;
      case 'fireplace':
        this.buildFireplaceSynth(soundGain);
        break;
      case 'keyboard':
        this.buildKeyboardSynth(soundGain);
        break;
      case 'cafe':
        this.buildCafeSynth(soundGain);
        break;
      case 'thunder':
        this.buildThunderSynth(soundGain);
        break;
      case 'city':
        this.buildCitySynth(soundGain);
        break;
      case 'train':
        this.buildTrainSynth(soundGain);
        break;
      case 'vinyl':
        this.buildVinylSynth(soundGain);
        break;
      case 'birds':
        this.buildBirdsSynth(soundGain);
        break;
      case 'white_noise':
        this.buildWhiteNoiseSynth(soundGain);
        break;
      case 'soft_music':
        this.buildSoftMusicSynth(soundGain);
        break;
    }
  }

  private stopSoundNode(id: SoundId) {
    const gainNode = this.soundGains[id];
    const nodes = this.activeNodes[id] || [];
    const scheduler = this.schedulers[id];

    if (scheduler) {
      clearInterval(scheduler as any);
      clearTimeout(scheduler as any);
      delete this.schedulers[id];
    }

    if (gainNode && this.ctx) {
      const stopTime = this.ctx.currentTime;
      // Fade out smoothly over 0.5s
      gainNode.gain.cancelScheduledValues(stopTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.5);

      setTimeout(() => {
        try {
          nodes.forEach(node => {
            try { node.stop(); } catch (e) {}
            try { node.disconnect(); } catch (e) {}
          });
          gainNode.disconnect();
        } catch (e) {}
        this.activeNodes[id] = [];
        this.soundGains[id] = null;
      }, 600);
    }
  }

  public stopAll() {
    this.isStoppingAll = true;
    // 1. Clear all intervals and timeouts
    Object.keys(this.schedulers).forEach((key) => {
      const scheduler = this.schedulers[key];
      if (scheduler) {
        clearInterval(scheduler as any);
        clearTimeout(scheduler as any);
      }
    });
    this.schedulers = {};

    // 2. Stop and disconnect all nodes immediately without waiting for timeouts
    Object.keys(this.activeNodes).forEach((soundKey) => {
      const nodes = this.activeNodes[soundKey] || [];
      nodes.forEach((node) => {
        try { node.stop(); } catch (e) {}
        try { node.disconnect(); } catch (e) {}
      });
      this.activeNodes[soundKey] = [];
    });

    // 3. Disconnect all gain nodes
    Object.keys(this.soundGains).forEach((soundKey) => {
      const id = soundKey as SoundId;
      const gainNode = this.soundGains[id];
      if (gainNode) {
        try {
          gainNode.gain.cancelScheduledValues(this.ctx?.currentTime || 0);
          gainNode.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        } catch (e) {}
        try {
          gainNode.disconnect();
        } catch (e) {}
        this.soundGains[id] = null;
      setTimeout(() => {
        this.isStoppingAll = false;
      }, 100);
      }
    });

    // 4. Reset volume settings back to original defaults
    this.currentVolumeSettings = {
      rain: 0.5,
      keyboard: 0.4,
      cafe: 0.4,
      thunder: 0.5,
      fireplace: 0.5,
      city: 0.3,
      train: 0.4,
      vinyl: 0.4,
      birds: 0.8,
      ocean: 0.5,
      white_noise: 0.3,
      soft_music: 0.6
    };
  }

  // --- Synthesis Models utilizing native nodes and buffers ---

  private createBufferSourceNode(buffer: AudioBuffer): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private buildRainSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.pink) return;

    // Cozy Rain Pink noise
    const pinkSource = this.createBufferSourceNode(this.buffers.pink);
    if (!pinkSource) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 250;

    pinkSource.connect(highpass);
    highpass.connect(filter);
    filter.connect(dest);
    pinkSource.start(0);

    this.activeNodes['rain'].push(pinkSource, highpass, filter);

    // Dynamic raindrop clicks
    const interval = setInterval(() => {
      this.triggerRaindrop(dest);
    }, 180);
    this.schedulers['rain'] = interval;
  }

  private triggerRaindrop(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Modulate drop depending on mood (e.g. moody/sad is heavier/slower, productive is energetic)
    let count = 1;
    if (this.currentMood === 'sad') count = 2;
    if (this.currentMood === 'productive') count = 3;

    for (let d = 0; d < count; d++) {
      const delay = Math.random() * 0.15;
      const osc = this.ctx.createOscillator();
      const clickFilter = this.ctx.createBiquadFilter();
      const clickGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500 + Math.random() * 2000, now + delay);
      
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3000, now + delay);
      clickFilter.Q.setValueAtTime(10, now + delay);

      clickGain.gain.setValueAtTime(0, now + delay);
      clickGain.gain.linearRampToValueAtTime(0.015 + Math.random() * 0.02, now + delay + 0.002);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.04);

      osc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(dest);

      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    }
  }

  private buildOceanSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;

    // Broad Brown noise source is perfect for Ocean Waves
    const brownSource = this.createBufferSourceNode(this.buffers.brown);
    if (!brownSource) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const waveGain = this.ctx.createGain();
    waveGain.gain.value = 0.5;

    brownSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(dest);
    brownSource.start(0);

    this.activeNodes['ocean'].push(brownSource, filter, waveGain);

    // LFO Osc to represent slow ocean wave cycles (period ~8-12 seconds)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // 8.3 seconds wave period
    lfoGain.gain.value = 0.25;  // depth

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain); // Modulates the gain of wave node
    lfoGain.connect(filter.frequency); // Modulates filter cutoff slightly for dynamic swell

    lfo.start(0);
    this.activeNodes['ocean'].push(lfo, lfoGain);
  }

  private buildFireplaceSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;

    // Warm fireplace background roar (Brown noise + Lowpass)
    const brownSource = this.createBufferSourceNode(this.buffers.brown);
    if (!brownSource) return;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 250;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 40;

    brownSource.connect(hp);
    hp.connect(lp);
    lp.connect(dest);
    brownSource.start(0);

    this.activeNodes['fireplace'].push(brownSource, hp, lp);

    // Spark cracking events (highpassed clicks at random intervals)
    const crackleInterval = setInterval(() => {
      this.triggerFireCrackle(dest);
    }, 120);
    this.schedulers['fireplace'] = crackleInterval;
  }

  private triggerFireCrackle(dest: AudioNode) {
    if (!this.ctx || !this.buffers.white) return;
    const now = this.ctx.currentTime;

    // Random roll for crackle density
    if (Math.random() > 0.45) return;

    const clickNode = this.ctx.createBufferSource();
    clickNode.buffer = this.buffers.white;

    const clickFil = this.ctx.createBiquadFilter();
    clickFil.type = 'bandpass';
    clickFil.frequency.setValueAtTime(6000 + Math.random() * 4000, now);
    clickFil.Q.setValueAtTime(8, now);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.08, now + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01 + Math.random() * 0.02);

    clickNode.connect(clickFil);
    clickFil.connect(clickGain);
    clickGain.connect(dest);

    clickNode.start(now);
    clickNode.stop(now + 0.15);
  }

  private buildKeyboardSynth(dest: AudioNode) {
    if (!this.ctx) return;
    // Keep reference so that we can trigger clicks on keys
    // Keyboard starts a ticking scheduler to simulate other people tying in the room
    const keyInterval = setInterval(() => {
      // Simulate stranger typing occasionally
      if (Math.random() > 0.3) {
        this.triggerSingleKeyPress(dest);
      }
    }, 280);
    this.schedulers['keyboard'] = keyInterval;
  }

  public triggerSingleKeyPress(customDest?: AudioNode) {
    if (!this.ctx) return;
    const target = customDest || this.soundGains['keyboard'] || this.masterGain;
    if (!target) return;

    const now = this.ctx.currentTime;
    
    // Laptop chiclet keystroke clicks: lighter body resonance, snappy crisp plastic dome / scissor switch action
    const pitch = 260 + Math.random() * 100; // Higher frequency than bulky mechanical keys
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle'; // Pure sine for a clean, short dome "pop" rather than mechanical clack body
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.015);

    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.035, now + 0.001); // Lighter acoustic body
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015); // Shorter decay for snappy laptop dome keyboard feel

    // Crisp high-passed scissor/dome snap
    let noiseSource: AudioBufferSourceNode | null = null;
    let noiseGain: GainNode | null = null;
    let noiseFil: BiquadFilterNode | null = null;

    if (this.buffers.white) {
      noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.buffers.white;
      
      noiseFil = this.ctx.createBiquadFilter();
      noiseFil.type = 'highpass';
      noiseFil.frequency.setValueAtTime(3800, now); // Higher HPF cutoff for tiny crispy scissor action click

      noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.045, now + 0.001); // Snappy dome impact click
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008); // Extremely short switch release

      noiseSource.connect(noiseFil);
      noiseFil.connect(noiseGain);
      noiseGain.connect(target);
      noiseSource.start(now);
      noiseSource.stop(now + 0.03);
    }

    osc.connect(oscGain);
    oscGain.connect(target);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  private buildCafeSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;

    // Warm cafe crowd talk rumble
    const brownSource = this.createBufferSourceNode(this.buffers.brown);
    if (!brownSource) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180; // Cut off high frequency static completely
    filter.Q.value = 1.0;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.1; // Much quieter background level to minimize overhead noise

    brownSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);
    brownSource.start(0);

    this.activeNodes['cafe'].push(brownSource, filter, gainNode);

    // Occasionally schedule dynamic muffled dish clinks
    const timer = setInterval(() => {
      if (Math.random() > 0.6) {
        this.triggerDishClink(dest);
      }
    }, 2800);
    this.schedulers['cafe'] = timer;
  }

  private triggerDishClink(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    const delay = Math.random() * 0.5;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000 + Math.random() * 3000, now + delay);

    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(3200, now + delay);

    clickGain.gain.setValueAtTime(0, now + delay);
    clickGain.gain.linearRampToValueAtTime(0.008 + Math.random() * 0.01, now + delay + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);

    osc.connect(filterNode);
    filterNode.connect(clickGain);
    clickGain.connect(dest);

    osc.start(now + delay);
    osc.stop(now + delay + 0.3);
  }

  private buildThunderSynth(dest: AudioNode) {
    if (!this.ctx) return;

    // Distant heavy low thunder scheduler
    const timer = setInterval(() => {
      // Thunder happens randomly every 20-30 seconds
      if (Math.random() > 0.35) {
        this.triggerThunderBoom(dest);
      }
    }, 8000);
    this.schedulers['thunder'] = timer;
  }

  public triggerThunderBoom(customDest?: AudioNode) {
    if (this.isStoppingAll) return;
    if (!this.ctx || !this.buffers.brown) return;
    const target = customDest || this.soundGains['thunder'] || this.masterGain;
    if (!target) return;

    const now = this.ctx.currentTime;

    // Create thunder roll using filtered brown noise
    const sourceNode = this.ctx.createBufferSource();
    sourceNode.buffer = this.buffers.brown;

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(50, now);
    flt.frequency.exponentialRampToValueAtTime(160, now + 1.2);
    flt.frequency.exponentialRampToValueAtTime(40, now + 10);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    // Sudden spike (flash) followed by rumblings
    gainNode.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.45, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 2.5);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 11.0);

    sourceNode.connect(flt);
    flt.connect(gainNode);
    gainNode.connect(target);

    sourceNode.start(now);
    sourceNode.stop(now + 12.0);

    // Call callback for screen lightning animations if attached (handled globally in component via events or state)
    const customEvent = new CustomEvent('room_thunder_strike', { detail: { now } });
    window.dispatchEvent(customEvent);
  }

  private buildCitySynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;

    // Muffled background drone representing traffic
    const brownSource = this.createBufferSourceNode(this.buffers.brown);
    if (!brownSource) return;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 140;

    const volume = this.ctx.createGain();
    volume.gain.value = 0.5;

    brownSource.connect(lp);
    lp.connect(volume);
    volume.connect(dest);
    brownSource.start(0);

    this.activeNodes['city'].push(brownSource, lp, volume);

    // Distant low horn blow
    const cityInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        this.triggerDistantHorn(dest);
      }
    }, 8000);
    this.schedulers['city'] = cityInterval;
  }

  private triggerDistantHorn(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    const frequency = 120 + Math.random() * 40;

    osc1.frequency.setValueAtTime(frequency, now);
    osc2.frequency.setValueAtTime(frequency + 0.5, now); // slightly detuned

    osc1.type = 'triangle';
    osc2.type = 'triangle';

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.02, now + 0.4);
    gainNode.gain.linearRampToValueAtTime(0.02, now + 1.2);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  private buildTrainSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;

    // Deep rhythmic clack clack engine
    const rumbleSource = this.createBufferSourceNode(this.buffers.brown);
    if (!rumbleSource) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;

    const trainGain = this.ctx.createGain();
    trainGain.gain.value = 0.4;

    rumbleSource.connect(filter);
    filter.connect(trainGain);
    trainGain.connect(dest);
    rumbleSource.start(0);

    this.activeNodes['train'].push(rumbleSource, filter, trainGain);

    // Clack-clack sound track (thump-thump) scheduled every 1.5 seconds
    const interval = setInterval(() => {
      this.triggerTrainClack(dest);
    }, 1500);
    this.schedulers['train'] = interval;
  }

  private triggerTrainClack(dest: AudioNode) {
    if (!this.ctx || !this.buffers.brown) return;
    const now = this.ctx.currentTime;

    // Trigger double thump click
    const timings = [0, 0.15];
    timings.forEach(t => {
      const source = this.ctx!.createBufferSource();
      source.buffer = this.buffers.brown;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(140, now + t);
      filter.Q.setValueAtTime(4, now + t);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.12, now + t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      source.start(now + t);
      source.stop(now + t + 0.25);
    });
  }

  private buildVinylSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.pink) return;

    // Vinyl static background noise
    const pinkSource = this.createBufferSourceNode(this.buffers.pink);
    if (!pinkSource) return;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 150;

    const vinylGain = this.ctx.createGain();
    vinylGain.gain.value = 0.35;

    pinkSource.connect(hp);
    hp.connect(lp);
    lp.connect(vinylGain);
    vinylGain.connect(dest);
    pinkSource.start(0);

    this.activeNodes['vinyl'].push(pinkSource, lp, hp, vinylGain);

    // Periodic vinyl scratch crackles
    const interval = setInterval(() => {
      if (Math.random() > 0.35) {
        this.triggerVinylCracklePop(dest);
      }
    }, 500);
    this.schedulers['vinyl'] = interval;
  }

  private triggerVinylCracklePop(dest: AudioNode) {
    if (!this.ctx || !this.buffers.white) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.white;

    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(8000 + Math.random() * 4000, now);
    clickFilter.Q.setValueAtTime(6, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.06, now + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

    src.connect(clickFilter);
    clickFilter.connect(gainNode);
    gainNode.connect(dest);

    src.start(now);
    src.stop(now + 0.05);
  }

  private buildBirdsSynth(dest: AudioNode) {
    if (!this.ctx) return;

    // Birds chirp schedule
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        this.triggerBirdChirpSeries(dest);
      }
    }, 4000);
    this.schedulers['birds'] = interval;
  }

  private triggerBirdChirpSeries(dest: AudioNode) {
    if (this.isStoppingAll) return;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chirpCount = 3 + Math.floor(Math.random() * 4);
    
    let timeOffset = 0;
    for (let i = 0; i < chirpCount; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startFreq = 1400 + Math.random() * 400;
      const endFreq = startFreq + 500 + Math.random() * 300;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + timeOffset + 0.06);

      gain.gain.setValueAtTime(0, now + timeOffset);
      gain.gain.linearRampToValueAtTime(0.03, now + timeOffset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.08);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.05);

      timeOffset += 0.12 + Math.random() * 0.1;
    }
  }

  private buildWhiteNoiseSynth(dest: AudioNode) {
    if (!this.ctx || !this.buffers.white) return;

    const source = this.createBufferSourceNode(this.buffers.white);
    if (!source) return;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1000;
    bp.Q.value = 0.5;

    source.connect(bp);
    bp.connect(dest);
    source.start(0);

    this.activeNodes['white_noise'].push(source, bp);
  }

  private buildSoftMusicSynth(dest: AudioNode) {
    if (!this.ctx) return;

    // Synthesize gorgeous late-night ambient chord track progression repeating!
    // Every 8 seconds playing a beautiful filtered synthesizer pad chord
    const chords = [
      [110, 220, 275, 330, 412], // A major 9
      [110, 196, 247, 293, 392], // E major 7sus
      [87.3, 174.6, 220, 261.6, 349.2], // F minor 11
      [73.4, 146.8, 185, 220, 293.7] // D major add9
    ];

    let chordIdx = 0;

    const playChordEvent = () => {
      const now = this.ctx!.currentTime;
      const notes = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;

      // Adjust based on mood
      let cutoff = 350;
      if (this.currentMood === 'sleepy') cutoff = 250;
      if (this.currentMood === 'overthinking') cutoff = 500;
      if (this.currentMood === 'vibing') cutoff = 650;

      // We use multiple detuned oscillators for absolute space lushness
      const oscillators: OscillatorNode[] = [];
      const chordVolume = this.ctx!.createGain();

      chordVolume.gain.setValueAtTime(0, now);
      chordVolume.gain.linearRampToValueAtTime(0.06, now + 3.0); // Slow warm attack
      chordVolume.gain.setValueAtTime(0.06, now + 4.5);
      chordVolume.gain.exponentialRampToValueAtTime(0.0001, now + 7.8); // Long release decay

      const lowpassFilter = this.ctx!.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.setValueAtTime(cutoff, now);
      lowpassFilter.frequency.exponentialRampToValueAtTime(cutoff * 1.5, now + 3.0);
      lowpassFilter.frequency.exponentialRampToValueAtTime(cutoff * 0.8, now + 6.0);

      notes.forEach((freq) => {
        // Voice 1 - triangle
        const osc1 = this.ctx!.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        osc1.frequency.setValueAtTime(freq + (Math.random() * 0.8 - 0.4), now);

        // Voice 2 - sine detuned
        const osc2 = this.ctx!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);
        osc2.frequency.setValueAtTime(freq * 2 + (Math.random() * 1.5 - 0.75), now);

        osc1.connect(lowpassFilter);
        osc2.connect(lowpassFilter);
        oscillators.push(osc1, osc2);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 8.0);
        osc2.stop(now + 8.0);
      });

      lowpassFilter.connect(chordVolume);
      chordVolume.connect(dest);

      // Keep tracking nodes for teardown safety
      this.activeNodes['soft_music'].push(...oscillators, lowpassFilter, chordVolume);
    };

    // Play immediately
    playChordEvent();

    // Loop every 8 seconds
    const interval = setInterval(() => {
      playChordEvent();
    }, 8000);
    this.schedulers['soft_music'] = interval;
  }
}

export const audioEngine = new AudioEngine();
