/**
 * Pure detection — folds the DSH 0.2 client sources (the Session Controller
 * list and the ui-session status snapshot) into one minimal view, then diffs
 * two consecutive views into completion events.
 *
 * A session owned by a subagent run (`origin === 'subagent'`) is dropped while
 * the view is built, so a subagent can never raise a reminder — not on its turn
 * end, not on a pending approval, not on a question.
 *
 * No DOM, no React, no loader: the view is plain data, so this module
 * unit-tests without a running Client.
 * @module @ltao0829/dsh-task-notify/detect
 */
/** Re-key the branded status map so plain session-id strings can read it. */
function statusByStringKey(status) {
    const out = new Map();
    for (const [id, value] of status) {
        const pending = value.pendingInteraction;
        out.set(id, {
            ...(value.running === undefined ? {} : { running: value.running }),
            ...(pending === undefined ? {} : { pending: { key: pending.key, kind: pending.kind } }),
        });
    }
    return out;
}
/**
 * Map the runtime sources into the minimal detector view.
 *
 * `SessionStatus` wins over the list row wherever it has an opinion: it is the
 * live Client projection, while `SessionSummary.running` is the Host baseline
 * that status events update.
 *
 * Subagent sessions are skipped here, once, for every consumer: the detector,
 * the diff and the notifier never see them.
 * @param list - the Session Controller list snapshot.
 * @param status - the `uiSession.sessionStatus` snapshot.
 * @returns the plain view.
 */
export function toSnapshotView(list, status) {
    const live = statusByStringKey(status);
    const sessions = {};
    for (const [id, row] of Object.entries(list.byId)) {
        // Subagent replies are shown in their own panel by DSH itself; a desktop
        // notification for them would only repeat what the user already watched.
        if (row.origin === 'subagent')
            continue;
        const observed = live.get(id);
        const pending = observed?.pending;
        sessions[id] = {
            running: observed?.running ?? row.running,
            ...(row.displayTitle === undefined ? {} : { title: row.displayTitle }),
            ...(pending === undefined ? {} : { pending }),
        };
    }
    return { sessions };
}
/**
 * Diff two snapshots into the events that happened between them.
 *
 * A null previous snapshot (the first observation) yields nothing, so a page
 * load never fires reminders for every historically-settled task. A session
 * first seen in `next` is likewise treated as pre-existing and silent.
 * @param prev - the previous snapshot, or null on the first observation.
 * @param next - the latest snapshot.
 * @returns newly-settled turns and pending reviews.
 */
export function diffCompletions(prev, next) {
    if (prev === null)
        return [];
    const events = [];
    for (const [sessionId, row] of Object.entries(next.sessions)) {
        const before = prev.sessions[sessionId];
        if (before === undefined)
            continue;
        if (before.running && !row.running && row.pending === undefined) {
            events.push({
                kind: 'turn',
                sessionId,
                ...(row.title === undefined ? {} : { title: row.title }),
            });
        }
        // A pending interaction is identified by its opaque request key, so a
        // replacement request (approval followed by a question) fires again while a
        // reconnect replay of the same request stays silent.
        const pending = row.pending;
        if (pending !== undefined && pending.key !== before.pending?.key) {
            events.push({
                kind: 'review',
                sessionId,
                pending: pending.kind,
                ...(row.title === undefined ? {} : { title: row.title }),
            });
        }
    }
    return events;
}
