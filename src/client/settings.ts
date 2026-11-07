export type CompletionMode = 'unfocused' | 'always' | 'off'
export type SoundMode = 'default' | 'classic' | 'custom' | 'none'

export interface TaskNotificationSettings {
  completion: CompletionMode
  permission: boolean
  question: boolean
  sound: SoundMode
  /** Display name of the imported custom sound; empty when none is stored. */
  customName: string
}

const KEY = 'dsh.codexTaskNotifications.v1'
export const DEFAULTS: TaskNotificationSettings = {
  completion: 'unfocused',
  permission: true,
  question: true,
  sound: 'default',
  customName: '',
}

function load(): TaskNotificationSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS }
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (value === null || typeof value !== 'object') return { ...DEFAULTS }
    const v = value as Record<string, unknown>
    return {
      completion: v.completion === 'always' || v.completion === 'off' || v.completion === 'unfocused' ? v.completion : DEFAULTS.completion,
      permission: typeof v.permission === 'boolean' ? v.permission : DEFAULTS.permission,
      question: typeof v.question === 'boolean' ? v.question : DEFAULTS.question,
      sound: v.sound === 'classic' || v.sound === 'custom' || v.sound === 'none' || v.sound === 'default' ? v.sound : DEFAULTS.sound,
      customName: typeof v.customName === 'string' ? v.customName : DEFAULTS.customName,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

let current = load()
const listeners = new Set<() => void>()
export function getSettings(): TaskNotificationSettings { return current }
export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setSetting<K extends keyof TaskNotificationSettings>(key: K, value: TaskNotificationSettings[K]): void {
  current = { ...current, [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* still active for this window */ }
  for (const listener of listeners) listener()
}
