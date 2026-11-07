// Regenerates the two bundled notification tones and their embedded data URIs.
// Run from the repository root: node scripts/generate-tones.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const RATE = 44100

function tone(notes, { gain = 0.55, decay = 5 } = {}) {
  const segments = []
  for (const { hz, ms } of notes) {
    const frames = Math.round((ms / 1000) * RATE)
    const buffer = new Float32Array(frames)
    const attack = Math.round(0.008 * RATE)
    for (let i = 0; i < frames; i++) {
      const t = i / RATE
      const envelope = Math.min(1, i / attack) * Math.exp((-decay * t) / (ms / 1000))
      const wave = Math.sin(2 * Math.PI * hz * t) + 0.18 * Math.sin(4 * Math.PI * hz * t)
      buffer[i] = wave * envelope
    }
    segments.push(buffer)
  }
  const gap = new Float32Array(Math.round(0.02 * RATE))
  const parts = []
  segments.forEach((segment, index) => {
    parts.push(segment)
    if (index < segments.length - 1) parts.push(gap)
  })

  const frames = parts.reduce((total, part) => total + part.length, 0)
  const wav = Buffer.alloc(44 + frames * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + frames * 2, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(RATE, 24)
  wav.writeUInt32LE(RATE * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(frames * 2, 40)

  let offset = 44
  for (const part of parts) {
    for (const value of part) {
      const clamped = Math.max(-1, Math.min(1, value * gain))
      wav.writeInt16LE(Math.round(clamped * 32767), offset)
      offset += 2
    }
  }
  return wav
}

const defaultTone = tone(
  [
    { hz: 880, ms: 150 },
    { hz: 1174.66, ms: 220 },
  ],
  { gain: 0.55, decay: 5 },
)
const classicTone = tone([{ hz: 587.33, ms: 320 }], { gain: 0.5, decay: 3.2 })

mkdirSync('assets/sounds', { recursive: true })
writeFileSync('assets/sounds/default-notify.wav', defaultTone)
writeFileSync('assets/sounds/classic-notify.wav', classicTone)
writeFileSync(
  'src/client/sounds.ts',
  `// Embedded for the DSH Desktop client: two short tones synthesized locally, no third-party audio.\nexport const DEFAULT_SOUND = 'data:audio/wav;base64,${defaultTone.toString('base64')}'\nexport const CLASSIC_SOUND = 'data:audio/wav;base64,${classicTone.toString('base64')}'\n`,
)

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
console.log(
  JSON.stringify(
    {
      default: { bytes: defaultTone.length, sha256: sha256(defaultTone) },
      classic: { bytes: classicTone.length, sha256: sha256(classicTone) },
    },
    null,
    2,
  ),
)
