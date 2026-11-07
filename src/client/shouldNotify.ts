import type { CompletionEvent } from '../detect.ts'
import type { TaskNotificationSettings } from './settings.ts'

/** Permission prompts and questions have their own controls; turns follow the completion mode. */
export function shouldNotify(event: CompletionEvent, settings: TaskNotificationSettings, focused: boolean): boolean {
  if (event.kind === 'turn') {
    return settings.completion === 'always' || (settings.completion === 'unfocused' && !focused)
  }
  if (event.kind === 'review') {
    return event.pending === 'question' ? settings.question : settings.permission
  }
  return false
}
