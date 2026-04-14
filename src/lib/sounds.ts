/**
 * Web Audio API sound generator — no external files needed.
 * Plays a brief, pleasant notification tone.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/** Unlock audio context on first user interaction */
export function unlockAudio() {
  if (typeof window === 'undefined') return
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/** Play a soft 2-tone ping for new messages */
export function playMessageSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    function tone(freq: number, start: number, duration: number, vol: number) {
      const osc  = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.start(start)
      osc.stop(start + duration)
    }

    tone(880, now,        0.18, 0.18)
    tone(1100, now + 0.1, 0.22, 0.14)
  } catch (_) {
    // silently ignore if audio not available
  }
}

/** Play a soft bell-like sound for notifications */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    function bell(freq: number, start: number, vol: number) {
      const osc  = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
      osc.start(start)
      osc.stop(start + 0.65)
    }

    bell(660, now,        0.15)
    bell(880, now + 0.15, 0.12)
    bell(550, now + 0.28, 0.08)
  } catch (_) {
    // silently ignore
  }
}

/** Play a warm confirmation chime when a meeting is confirmed */
export function playMeetingConfirmedSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    // Major third interval — warm and affirmative
    const pairs: [number, number][] = [[523, now], [659, now + 0.12], [784, now + 0.24]]
    pairs.forEach(([freq, t]) => {
      const osc  = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.13, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch (_) {}
}

/** Short two-tone for meeting invite / reschedule request */
export function playMeetingRequestSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    ;[[440, now], [550, now + 0.14]].forEach(([freq, t]) => {
      const osc  = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch (_) {}
}

/** Play a celebratory sound when a match is found */
export function playMatchSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const freqs = [523, 659, 784, 1047] // C5 E5 G5 C6

    freqs.forEach((freq, i) => {
      const osc  = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.1)
      gain.gain.setValueAtTime(0, now + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.55)
    })
  } catch (_) {
    // silently ignore
  }
}
