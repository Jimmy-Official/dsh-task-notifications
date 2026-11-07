import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    taskNotifications: unknown
  }
}

/** Keep Windows notifications readable without trying to reproduce the full conversation. */
export const MAX_NOTIFICATION_RESULT_CHARS = 700
const RESULT_READ_TIMEOUT_MS = 2500
const RECENT_COMPLETION_WINDOW_MS = 60_000

interface EventLike {
  type: string
  time?: number
  data?: unknown
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function durableEvent(entry: unknown): EventLike | null {
  const row = record(entry)
  if (row?.type !== 'event') return null
  const event = record(row.event)
  return typeof event?.type === 'string' ? event as unknown as EventLike : null
}

function turnOf(event: EventLike): number | null {
  const turn = record(event.data)?.turn
  return typeof turn === 'number' ? turn : null
}

function plainText(messageEvent: EventLike): string | null {
  const data = record(messageEvent.data)
  const message = record(data?.message)
  if (!Array.isArray(message?.content)) return null
  const parts: string[] = []
  for (const block of message.content) {
    const value = record(block)
    if (value?.type === 'text' && typeof value.text === 'string' && value.text.trim() !== '') {
      parts.push(value.text)
    }
  }
  return parts.length === 0 ? null : parts.join('\n')
}

/** Reduce common Markdown decoration while retaining the answer's actual words. */
export function notificationText(markdown: string): string | null {
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
    .trim()
  if (cleaned === '') return null
  const points = Array.from(cleaned)
  return points.length <= MAX_NOTIFICATION_RESULT_CHARS
    ? cleaned
    : `${points.slice(0, MAX_NOTIFICATION_RESULT_CHARS - 1).join('')}…`
}

/**
 * Return the last assistant text belonging to the most recent completed turn.
 * A message from an older turn is never used as a misleading fallback.
 */
export function extractFinalResult(entries: readonly unknown[], completedAfter = Number.NEGATIVE_INFINITY): string | null {
  let endIndex = -1
  let completedTurn: number | null = null
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const event = durableEvent(entries[index])
    if (event?.type !== 'turn/end') continue
    const turn = turnOf(event)
    if (turn === null) continue
    if (Number.isFinite(completedAfter) && (typeof event.time !== 'number' || event.time < completedAfter)) return null
    endIndex = index
    completedTurn = turn
    break
  }
  if (endIndex < 0 || completedTurn === null) return null

  for (let index = endIndex - 1; index >= 0; index -= 1) {
    const event = durableEvent(entries[index])
    if (event?.type !== 'assistant/message' || turnOf(event) !== completedTurn) continue
    const text = plainText(event)
    if (text !== null) return notificationText(text)
  }
  return null
}

/** Read one session's already-materialized event window without taking over the UI selection. */
export async function readFinalResult(sessions: ISessions, sessionId: string): Promise<string | null> {
  const abort = new AbortController()
  const completedAfter = Date.now() - RECENT_COMPLETION_WINDOW_MS
  const timer = globalThis.setTimeout(() => abort.abort(), RESULT_READ_TIMEOUT_MS)
  try {
    const target = sessionId as Parameters<ISessions['using']>[0]
    return await sessions.using(target, { source: 'taskNotifications', signal: abort.signal }, async (reference) => {
      const binding = await reference.ready
      return extractFinalResult(binding.eventSource.getSnapshot().entries, completedAfter)
    })
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timer)
  }
}
