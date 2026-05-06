// Audio beep helper using Web Audio API — shared across all protocol pages
export function playBeep(frequency: number, duration: number, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.value = volume
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
    setTimeout(() => ctx.close(), duration + 100)
  } catch {
    // Audio not available — silent fallback
  }
}

export function playWorkBeep() { playBeep(880, 200) }
export function playRestBeep() { playBeep(440, 300) }
export function playDoneBeep() {
  playBeep(660, 150)
  setTimeout(() => playBeep(880, 150), 200)
  setTimeout(() => playBeep(1100, 300), 400)
}
export function playCountdownBeep() { playBeep(600, 100, 0.15) }
