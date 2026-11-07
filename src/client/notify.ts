import { loadCustomSound, type CustomSound } from './customSound.ts'

/** Every shown notification is kept here: a garbage-collected Notification loses its click handler. */
const liveNotifications = new Set<Notification>()

/** Diagnostics key. Breadcrumbs stay small; the desktop stores them next to the other settings. */
const DIAG_KEY = 'dsh.codexTaskNotifications.diag.v1'
const DIAG_LIMIT = 32

/** Records one step of the reminder path so a failed click can be diagnosed from disk afterwards. */
export function diag(step: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DIAG_KEY) ?? '[]')
    const trail = Array.isArray(parsed) ? parsed : []
    trail.push({ at: new Date().toISOString(), step })
    localStorage.setItem(DIAG_KEY, JSON.stringify(trail.slice(-DIAG_LIMIT)))
  } catch { /* diagnostics must never break a reminder */ }
}
import { DEFAULT_SOUND, CLASSIC_SOUND } from './sounds.ts'
import type { SoundMode } from './settings.ts'

let permissionListenerInstalled = false
export function armNotificationPermission(): void {
  if (permissionListenerInstalled || typeof document === 'undefined') return
  permissionListenerInstalled = true
  const request = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { void Notification.requestPermission() } catch { /* in-page fallback stays available */ }
    }
    document.removeEventListener('pointerdown', request)
    document.removeEventListener('keydown', request)
    permissionListenerInstalled = false
  }
  document.addEventListener('pointerdown', request, { once: true })
  document.addEventListener('keydown', request, { once: true })
}

function showPageToast(title: string, body: string, onActivate?: () => void): void {
  if (typeof document === 'undefined') return
  const toast = document.createElement('div')
  toast.setAttribute('role', 'status')
  toast.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;max-width:340px;padding:12px 16px;border-radius:12px;background:var(--dsw-alias-bg-overlay,#202020);color:var(--dsw-alias-label-primary,#fff);box-shadow:0 8px 24px #0005;font:13px/1.5 system-ui;cursor:pointer'
  const heading = document.createElement('strong')
  heading.textContent = title
  const detail = document.createElement('div')
  detail.textContent = body
  toast.append(heading, detail)
  let activated = false
  const activate = (): void => {
    if (activated) return
    activated = true
    diag('toast:clicked')
    toast.remove()
    onActivate?.()
  }
  toast.onclick = activate
  document.body.appendChild(toast)
  diag('toast:shown')
  window.setTimeout(() => toast.remove(), 8000)
}

/** Resolves the audio source for a mode; a custom sound that is missing falls back to the bundled default. */
export function soundSource(mode: SoundMode, custom: CustomSound | null): string | null {
  if (mode === 'none') return null
  // A custom sound that was never imported falls through to the bundled default.
  if (mode === 'custom' && custom !== null) return custom.dataUri
  return mode === 'classic' ? CLASSIC_SOUND : DEFAULT_SOUND
}

/** A short, non-actionable message in the corner; used when a jump target cannot be opened. */
export function showMessage(text: string): void {
  if (typeof document === 'undefined') return
  const node = document.createElement('div')
  node.setAttribute('role', 'status')
  node.textContent = text
  node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;max-width:340px;padding:10px 14px;border-radius:12px;background:var(--dsw-alias-bg-overlay,#202020);color:var(--dsw-alias-label-primary,#fff);box-shadow:0 8px 24px #0005;font:13px/1.5 system-ui'
  document.body.appendChild(node)
  window.setTimeout(() => node.remove(), 6000)
}

export function showNotification(title: string, body: string, sound: SoundMode, activate?: () => void): void {
  let delivered = false
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, { body, silent: true })
      liveNotifications.add(notification)
      let jumped = false
      const cleanup = (): void => { liveNotifications.delete(notification) }
      notification.onclose = cleanup
      notification.onerror = cleanup
      notification.onclick = () => {
        if (jumped) return
        jumped = true
        diag('native:clicked')
        cleanup()
        try { window.focus() } catch { /* focusing the window must never block the jump */ }
        try { notification.close() } catch { /* an already-closed notification is harmless */ }
        activate?.()
      }
      diag('native:shown')
      delivered = true
    } catch { /* fall back to an in-page toast */ }
  }
  if (!delivered) showPageToast(title, body, activate)
  const source = soundSource(sound, loadCustomSound())
  if (source === null) return
  try {
    const audio = new Audio(source)
    void audio.play().catch(() => { /* notification remains visible if autoplay is blocked */ })
  } catch { /* sound failure must not hide notification */ }
}
