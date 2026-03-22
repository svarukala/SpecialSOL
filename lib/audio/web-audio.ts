function createTone(frequency: number, duration: number, type: OscillatorType = 'triangle') {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

export function playCorrectChime() {
  createTone(523, 0.15)                          // C5
  setTimeout(() => createTone(659, 0.15), 100)   // E5
  setTimeout(() => createTone(784, 0.2), 200)    // G5
}

export function playFanfare() {
  const notes = [523, 659, 784, 1047]            // C5, E5, G5, C6
  notes.forEach((freq, i) => setTimeout(() => createTone(freq, 0.3), i * 120))
}
