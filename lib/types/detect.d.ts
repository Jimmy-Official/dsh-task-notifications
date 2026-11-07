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
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
/** One pending interaction reduced to the two facts a reminder needs. */
export interface PendingView {
    /** Opaque request identity; a replacement request uses a new key. */
    key: string;
    /** Domain-owned discriminator (`approval`, `plan-review`, `question`, …). */
    kind: string;
}
/** Minimal per-session view (only what the detector needs). */
export interface SessionRowView {
    running: boolean;
    title?: string;
    pending?: PendingView;
}
/** A complete snapshot of every session that may raise a reminder. */
export interface SnapshotView {
    sessions: Record<string, SessionRowView>;
}
/** One transition observed between two snapshots. */
export type CompletionEvent = {
    kind: 'turn';
    sessionId: string;
    title?: string;
} | {
    kind: 'review';
    sessionId: string;
    pending: string;
    title?: string;
};
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
export declare function toSnapshotView(list: SessionListState, status: SessionStatusSnapshot): SnapshotView;
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
export declare function diffCompletions(prev: SnapshotView | null, next: SnapshotView): CompletionEvent[];
//# sourceMappingURL=detect.d.ts.map