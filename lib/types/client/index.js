import { diffCompletions, toSnapshotView } from "../detect.js";
import { readFinalResult } from "./finalResult.js";
import { NS, en, zh } from "./locales.js";
import { NotificationSettings } from "./TaskNotifySettingsCard.js";
import { openConversation } from "./navigation.js";
import { armNotificationPermission, showMessage, showNotification } from "./notify.js";
import { getSettings } from "./settings.js";
import { shouldNotify } from "./shouldNotify.js";
export const inject = ['slots', 'locale', 'sessions', 'uiSession'];
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'task-notifications: locale');
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: NS, order: 25,
        label: () => t('nav'), locale: NS,
    }, NotificationSettings));
    armNotificationPermission();
    const activate = (sessionId) => {
        openConversation(ctx, sessionId, () => showMessage(t('jumpFailed')));
    };
    const sessions = ctx.sessions;
    const ui = ctx.uiSession;
    let previous = null;
    let reconciling = false;
    let queued = false;
    const present = (event) => {
        const cfg = getSettings();
        if (!shouldNotify(event, cfg, document.hasFocus()))
            return;
        if (event.kind === 'turn') {
            // Read history only after the focus/settings decision. Each event owns its
            // async work so one slow session cannot block snapshot reconciliation.
            void readFinalResult(sessions, event.sessionId).then((result) => {
                showNotification(event.title ?? t('turnTitle'), result ?? t('turnBodyFallback'), cfg.sound, () => activate(event.sessionId));
            });
            return;
        }
        const title = event.pending === 'question' ? t('questionTitle') : t('permissionTitle');
        showNotification(title, event.title ?? event.sessionId, cfg.sound, () => activate(event.sessionId));
    };
    const reconcileOnce = () => {
        const list = sessions.list.getSnapshot();
        const status = ui.sessionStatus.getSnapshot();
        const next = toSnapshotView(list, status);
        const events = diffCompletions(previous, next);
        previous = next;
        for (const event of events)
            present(event);
    };
    const reconcile = () => {
        if (reconciling) {
            queued = true;
            return;
        }
        reconciling = true;
        try {
            reconcileOnce();
        }
        finally {
            reconciling = false;
        }
        if (queued) {
            queued = false;
            reconcile();
        }
    };
    ctx.effect(() => {
        const stop = [sessions.list.subscribe(reconcile), ui.sessionStatus.subscribe(reconcile)];
        reconcile();
        return () => {
            for (const unsubscribe of stop)
                unsubscribe();
        };
    }, 'task-notifications: watch sessions');
}
