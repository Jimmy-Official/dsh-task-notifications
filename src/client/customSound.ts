/** Storage key kept apart from the settings blob so a large data URI is not rewritten on every toggle. */
const KEY = 'dsh.codexTaskNotifications.sound.v1'

/** Browsers cap localStorage per origin; one megabyte of audio stays well inside it. */
export const MAX_CUSTOM_SOUND_BYTES = 1024 * 1024

export type SoundFileProblem = 'empty' | 'too-large' | 'unsupported-type'

export interface CustomSound {
  readonly name: string
  readonly dataUri: string
}

/**
 * Extension → MIME map. Windows hands over a .wav with an empty `type` more often than not, and a
 * picker that only trusted `type` would call a perfectly good sound file "unsupported".
 */
const AUDIO_TYPES: Readonly<Record<string, string>> = {
  wav: 'audio/wav', wave: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm',
}

/** The audio MIME a picked file should be treated as, or null when it is not audio at all. */
export function soundMime(file: { readonly type: string; readonly name?: string }): string | null {
  if (file.type.startsWith('audio/')) return file.type
  const name = file.name
  if (name === undefined) return null
  const dot = name.lastIndexOf('.')
  if (dot < 0) return null
  return AUDIO_TYPES[name.slice(dot + 1).toLowerCase()] ?? null
}

/** Rejects files a picker may hand over but the player cannot use; pure so it is testable without a DOM. */
export function checkSoundFile(file: { readonly size: number; readonly type: string; readonly name?: string }): SoundFileProblem | null {
  if (file.size === 0) return 'empty'
  if (file.size > MAX_CUSTOM_SOUND_BYTES) return 'too-large'
  if (soundMime(file) === null) return 'unsupported-type'
  return null
}

export function loadCustomSound(): CustomSound | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (value === null || typeof value !== 'object') return null
    const v = value as Record<string, unknown>
    if (typeof v.dataUri !== 'string' || v.dataUri === '') return null
    return { name: typeof v.name === 'string' && v.name !== '' ? v.name : 'custom', dataUri: v.dataUri }
  } catch {
    return null
  }
}

/** Throws when the origin quota is exhausted; the caller turns that into a message. */
export function saveCustomSound(sound: CustomSound): void {
  if (typeof localStorage === 'undefined') throw new Error('unavailable')
  localStorage.setItem(KEY, JSON.stringify({ name: sound.name, dataUri: sound.dataUri }))
}

export function clearCustomSound(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}

/** Reads a picked file into a data URI, rejecting whatever `checkSoundFile` refuses. */
export function readSoundFile(file: File): Promise<CustomSound> {
  const problem = checkSoundFile(file)
  if (problem !== null) return Promise.reject(new Error(problem))
  const mime = soundMime(file) ?? 'audio/wav'
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('unreadable'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result === '') { reject(new Error('unreadable')); return }
      // No MIME at pick time means FileReader emits `data:application/octet-stream`; rewrite the
      // prefix with the type the extension proves so `new Audio(...)` can decode it.
      if (result.startsWith('data:audio/')) { resolve({ name: file.name, dataUri: result }); return }
      const at = result.indexOf('base64,')
      if (at < 0) { reject(new Error('unsupported-type')); return }
      resolve({ name: file.name, dataUri: 'data:' + mime + ';base64,' + result.slice(at + 7) })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Plays a data URI and reports whether the browser could decode it.
 * Autoplay may be blocked right after an asynchronous file read; `canplaythrough`
 * still proves the bytes are usable, so that counts as success.
 */
export function playSound(dataUri: string): Promise<boolean> {
  if (typeof Audio === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    let settled = false
    const timer = setTimeout(() => finish(false), 4000)
    function finish(playable: boolean): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(playable)
    }
    try {
      const audio = new Audio(dataUri)
      audio.addEventListener('error', () => finish(false), { once: true })
      audio.addEventListener('playing', () => finish(true), { once: true })
      audio.addEventListener('canplaythrough', () => finish(true), { once: true })
      void audio.play().catch(() => { /* blocked autoplay is not a decode failure */ })
    } catch {
      finish(false)
    }
  })
}
