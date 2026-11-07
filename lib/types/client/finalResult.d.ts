import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        taskNotifications: unknown;
    }
}
/** Keep Windows notifications readable without trying to reproduce the full conversation. */
export declare const MAX_NOTIFICATION_RESULT_CHARS = 700;
/** Reduce common Markdown decoration while retaining the answer's actual words. */
export declare function notificationText(markdown: string): string | null;
/**
 * Return the last assistant text belonging to the most recent completed turn.
 * A message from an older turn is never used as a misleading fallback.
 */
export declare function extractFinalResult(entries: readonly unknown[], completedAfter?: number): string | null;
/** Read one session's already-materialized event window without taking over the UI selection. */
export declare function readFinalResult(sessions: ISessions, sessionId: string): Promise<string | null>;
//# sourceMappingURL=finalResult.d.ts.map