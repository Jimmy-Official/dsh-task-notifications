import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { diffCompletions, toSnapshotView, type CompletionEvent, type SnapshotView } from '../detect.ts'
import { readFinalResult } from './finalResult.ts'
import { NS, en, zh } from './locales.ts'
import { NotificationSettings } from './TaskNotifySettingsCard.tsx'
import { openConversation } from './navigation.ts'
import { armNotificationPermission, showMessage, showNotification } from './notify.ts'
import { getSettings } from './settings.ts'
import { shouldNotify } from './shouldNotify.ts'

export const inject = ['slots', 'locale', 'sessions', 'uiSession']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'task-notifications: locale')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: NS, order: 25,
    label: () => t('nav'), locale: NS,
  }, NotificationSettings))
  armNotificationPermission()

  const activate = (sessionId: string): void => {
    openConversation(ctx, sessionId, () => showMessage(t('jumpFailed')))
  }

  const sessions = ctx.sessions
  const ui = ctx.uiSession
  let previous: SnapshotView | null = null
  let reconciling = false
  let queued = false

  const present = (event: CompletionEvent): void => {
    const cfg = getSettings()
    if (!shouldNotify(event, cfg, document.hasFocus())) return
    if (event.kind === 'turn') {
      // Read history only after the focus/settings decision. Each event owns its
      // async work so one slow session cannot block snapshot reconciliation.
      void readFinalResult(sessions, event.sessionId).then((result) => {
        showNotification(
          event.title ?? t('turnTitle'),
          result ?? t('turnBodyFallback'),
          cfg.sound,
          () => activate(event.sessionId),
        )
      })
      return
    }
    const title = event.pending === 'question' ? t('questionTitle') : t('permissionTitle')
    showNotification(title, event.title ?? event.sessionId, cfg.sound, () => activate(event.sessionId))
  }

  const reconcileOnce = (): void => {
    const list = sessions.list.getSnapshot()
    const status = ui.sessionStatus.getSnapshot()
    const next = toSnapshotView(list, status)
    const events = diffCompletions(previous, next)
    previous = next
    for (const event of events) present(event)
  }

  const reconcile = (): void => {
    if (reconciling) { queued = true; return }
    reconciling = true
    try { reconcileOnce() } finally { reconciling = false }
    if (queued) { queued = false; reconcile() }
  }
  ctx.effect(() => {
    const stop = [sessions.list.subscribe(reconcile), ui.sessionStatus.subscribe(reconcile)]
    reconcile()
    return () => {
      for (const unsubscribe of stop) unsubscribe()
    }
  }, 'task-notifications: watch sessions')
}
