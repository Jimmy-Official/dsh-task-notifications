/** Keep Windows notifications readable without trying to reproduce the full conversation. */
export const MAX_NOTIFICATION_RESULT_CHARS = 700;
const RESULT_READ_TIMEOUT_MS = 2500;
const RECENT_COMPLETION_WINDOW_MS = 60_000;
function record(value) {
    return typeof value === 'object' && value !== null ? value : null;
}
function durableEvent(entry) {
    const row = record(entry);
    if (row?.type !== 'event')
        return null;
    const event = record(row.event);
    return typeof event?.type === 'string' ? event : null;
}
function turnOf(event) {
    const turn = record(event.data)?.turn;
    return typeof turn === 'number' ? turn : null;
}
function plainText(messageEvent) {
    const data = record(messageEvent.data);
    const message = record(data?.message);
    if (!Array.isArray(message?.content))
        return null;
    const parts = [];
    for (const block of message.content) {
        const value = record(block);
        if (value?.type === 'text' && typeof value.text === 'string' && value.text.trim() !== '') {
            parts.push(value.text);
        }
    }
    return parts.length === 0 ? null : parts.join('\n');
}
/** Reduce common Markdown decoration while retaining the answer's actual words. */
export function notificationText(markdown) {
    const cleaned = markdown
        .replace(/\r\n?/g, '\n')
        .replace(/^```[^\n]*\n?/gm, '')
        .replace(/```/g, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/(\*\*|__|~~|`)/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (cleaned === '')
        return null;
    const points = Array.from(cleaned);
    return points.length <= MAX_NOTIFICATION_RESULT_CHARS
        ? cleaned
        : `${points.slice(0, MAX_NOTIFICATION_RESULT_CHARS - 1).join('')}…`;
}
/**
 * Return the last assistant text belonging to the most recent completed turn.
 * A message from an older turn is never used as a misleading fallback.
 */
export function extractFinalResult(entries, completedAfter = Number.NEGATIVE_INFINITY) {
    let endIndex = -1;
    let completedTurn = null;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
        const event = durableEvent(entries[index]);
        if (event?.type !== 'turn/end')
            continue;
        const turn = turnOf(event);
        if (turn === null)
            continue;
        if (Number.isFinite(completedAfter) && (typeof event.time !== 'number' || event.time < completedAfter))
            return null;
        endIndex = index;
        completedTurn = turn;
        break;
    }
    if (endIndex < 0 || completedTurn === null)
        return null;
    for (let index = endIndex - 1; index >= 0; index -= 1) {
        const event = durableEvent(entries[index]);
        if (event?.type !== 'assistant/message' || turnOf(event) !== completedTurn)
            continue;
        const text = plainText(event);
        if (text !== null)
            return notificationText(text);
    }
    return null;
}
/** Read one session's already-materialized event window without taking over the UI selection. */
export async function readFinalResult(sessions, sessionId) {
    const abort = new AbortController();
    const completedAfter = Date.now() - RECENT_COMPLETION_WINDOW_MS;
    const timer = globalThis.setTimeout(() => abort.abort(), RESULT_READ_TIMEOUT_MS);
    try {
        const target = sessionId;
        return await sessions.using(target, { source: 'taskNotifications', signal: abort.signal }, async (reference) => {
            const binding = await reference.ready;
            return extractFinalResult(binding.eventSource.getSnapshot().entries, completedAfter);
        });
    }
    catch {
        return null;
    }
    finally {
        globalThis.clearTimeout(timer);
    }
}
