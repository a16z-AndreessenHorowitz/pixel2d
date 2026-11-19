/**
 * =========================================================
 * SoundEngine.ts – Pure Web Audio API 8-Bit Retro Audio Engine
 * Zero-dependency, lightweight, authentic chiptune SFX & BGM
 * Inspired by Pixels.xyz & classic 8-bit pastoral games
 * =========================================================
 */

export class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null

  private isSfxMuted: boolean
  private isBgmMuted: boolean

  // BGM sequencer state
  private isBgmPlaying = false
  private bgmTimer: number | null = null
  private currentStep = 0

  constructor() {
    this.isSfxMuted = localStorage.getItem('pixel_farm_sfx_muted') === 'true'
    this.isBgmMuted = localStorage.getItem('pixel_farm_bgm_muted') === 'true'
  }

  /**
   * Lazily initializes AudioContext upon first user interaction
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtxClass) return null

      this.ctx = new AudioCtxClass()

      // Master output gain
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // SFX gain
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.6, this.ctx.currentTime)
      this.sfxGain.connect(this.masterGain)

      // BGM gain
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.setValueAtTime(this.isBgmMuted ? 0 : 0.28, this.ctx.currentTime)
      this.bgmGain.connect(this.masterGain)
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    return this.ctx
  }

  // =========================================================
  // AUDIO CONTROLS & STATE
  // =========================================================

  public toggleSfx(): boolean {
    this.isSfxMuted = !this.isSfxMuted
    localStorage.setItem('pixel_farm_sfx_muted', String(this.isSfxMuted))

    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.6, this.ctx.currentTime)
    }

    if (!this.isSfxMuted) {
      this.playCoin()
    }
    return !this.isSfxMuted
  }

  public toggleBgm(): boolean {
    this.isBgmMuted = !this.isBgmMuted
    localStorage.setItem('pixel_farm_bgm_muted', String(this.isBgmMuted))

    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.isBgmMuted ? 0 : 0.28, this.ctx.currentTime)
    }

    if (!this.isBgmMuted && !this.isBgmPlaying) {
      this.startBGM()
    } else if (this.isBgmMuted && this.isBgmPlaying) {
      this.stopBGM()
    }

    return !this.isBgmMuted
  }

  public getSfxEnabled(): boolean {
    return !this.isSfxMuted
  }

  public getBgmEnabled(): boolean {
    return !this.isBgmMuted
  }

  // =========================================================
  // 8-BIT RETRO SOUND EFFECTS (SFX)
  // =========================================================

  /**
   * Cuốc xới đất: Thud trầm ấm
   */
  public playTill() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12)

    gain.gain.setValueAtTime(0.8, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.13)
  }

  /**
   * Gieo hạt: Tiếng tí tách nhẹ nhõm
   */
  public playPlant() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07)

    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.09)
  }

  /**
   * Tưới nước: Tiếng xì rào nước tưới mát
   */
  public playWater() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const bufferSize = ctx.sampleRate * 0.22
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(750, now)
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.2)
    filter.Q.value = 2.5

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain)

    noise.start(now)
    noise.stop(now + 0.23)
  }

  /**
   * Thu hoạch: Pop nảy vui tai
   */
  public playHarvest() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.09)

    gain.gain.setValueAtTime(0.7, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.11)
  }

  /**
   * Quăng cần câu: Tiếng vút và nước bì bõm
   */
  public playFishCast() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.1)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.22)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.25)
  }

  /**
   * Cá cắn câu: Báo động ting-ting
   */
  public playFishBite() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const notes = [920, 1380]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + idx * 0.08

      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07)

      osc.connect(gain)
      gain.connect(this.sfxGain!)

      osc.start(t)
      osc.stop(t + 0.08)
    })
  }

  /**
   * Kéo cá thành công: 3 nốt nhạc thắng lợi
   */
  public playFishCatch() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const chord = [523.25, 659.25, 783.99] // C5, E5, G5
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + idx * 0.07

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0.5, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16)

      osc.connect(gain)
      gain.connect(this.sfxGain!)

      osc.start(t)
      osc.stop(t + 0.17)
    })
  }

  /**
   * Nhận Coin / Bán hàng: Tiếng chuông vàng lảnh lót (Chime)
   */
  public playCoin() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    // Note 1: B5 (987.77 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(987.77, now)
    gain1.gain.setValueAtTime(0.45, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
    osc1.connect(gain1)
    gain1.connect(this.sfxGain)
    osc1.start(now)
    osc1.stop(now + 0.08)

    // Note 2: E6 (1318.51 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.51, now + 0.07)
    gain2.gain.setValueAtTime(0.55, now + 0.07)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32)
    osc2.connect(gain2)
    gain2.connect(this.sfxGain)
    osc2.start(now + 0.07)
    osc2.stop(now + 0.33)
  }

  /**
   * Ăn nông sản: Âm thanh nhai nhóp nhép retro
   */
  public playEat() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const chews = [0, 0.09, 0.18]
    chews.forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + delay

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(380, t)
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.06)

      gain.gain.setValueAtTime(0.6, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07)

      osc.connect(gain)
      gain.connect(this.sfxGain!)

      osc.start(t)
      osc.stop(t + 0.08)
    })
  }

  /**
   * Thăng cấp (Level Up): Fanfare hoàng kim rực rỡ
   */
  public playLevelUp() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    // Fanfare arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [
      { freq: 523.25, time: 0, dur: 0.12 },
      { freq: 659.25, time: 0.12, dur: 0.12 },
      { freq: 783.99, time: 0.24, dur: 0.14 },
      { freq: 1046.5, time: 0.38, dur: 0.6 },
    ]

    notes.forEach((n) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + n.time

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(n.freq, t)

      gain.gain.setValueAtTime(0.55, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + n.dur)

      osc.connect(gain)
      gain.connect(this.sfxGain!)

      osc.start(t)
      osc.stop(t + n.dur + 0.02)
    })
  }

  /**
   * Kiệt sức (Exhausted): Cảnh báo âm trầm
   */
  public playExhausted() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.22)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.26)
  }

  /**
   * Click nút bấm UI
   */
  public playClick() {
    if (this.isSfxMuted) return
    const ctx = this.getContext()
    if (!ctx || !this.sfxGain) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  // =========================================================
  // RETRO 8-BIT CHIPTUNE BGM SYNTHESIZER (Pastoral Farm Melody)
  // =========================================================

  /**
   * Bắt đầu chơi nhạc nền nông trại đồng quê chiptune thư giãn
   */
  public startBGM() {
    if (this.isBgmMuted || this.isBgmPlaying) return
    const ctx = this.getContext()
    if (!ctx) return

    this.isBgmPlaying = true
    this.currentStep = 0

    // G major pastoral farm melody sequence (soothing & looping)
    // Scale: G4, A4, B4, C5, D5, E5
    const melody = [
      392.0, // G4
      440.0, // A4
      493.88, // B4
      587.33, // D5
      523.25, // C5
      493.88, // B4
      440.0, // A4
      392.0, // G4
      329.63, // E4
      392.0, // G4
      440.0, // A4
      493.88, // B4
      440.0, // A4
      392.0, // G4
      329.63, // E4
      293.66, // D4
    ]

    const bass = [
      196.0, // G3
      196.0,
      164.81, // E3
      164.81,
      130.81, // C3
      130.81,
      146.83, // D3
      146.83,
    ]

    const stepInterval = 320 // ms per eighth note

    const tick = () => {
      if (!this.isBgmPlaying || this.isBgmMuted) return

      const now = ctx.currentTime
      const noteFreq = melody[this.currentStep % melody.length]
      const bassFreq = bass[Math.floor(this.currentStep / 2) % bass.length]

      // Melody voice (soft triangle wave)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(noteFreq, now)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28)
      osc.connect(gain)
      gain.connect(this.bgmGain!)
      osc.start(now)
      osc.stop(now + 0.29)

      // Bass voice on even steps
      if (this.currentStep % 2 === 0) {
        const bassOsc = ctx.createOscillator()
        const bassGain = ctx.createGain()
        bassOsc.type = 'sine'
        bassOsc.frequency.setValueAtTime(bassFreq, now)
        bassGain.gain.setValueAtTime(0.25, now)
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55)
        bassOsc.connect(bassGain)
        bassGain.connect(this.bgmGain!)
        bassOsc.start(now)
        bassOsc.stop(now + 0.58)
      }

      this.currentStep++
      this.bgmTimer = window.setTimeout(tick, stepInterval)
    }

    tick()
  }

  /**
   * Dừng chơi nhạc nền
   */
  public stopBGM() {
    this.isBgmPlaying = false
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }
}

// Export singleton instance
export const soundEngine = new SoundEngine()
