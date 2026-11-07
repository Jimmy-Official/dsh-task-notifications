import { diag } from './notify.ts'

/**
 * The host Workspace service. It is not part of this package's type surface,
 * so it is described structurally and reached through the registry instead of
 * an inject declaration: a host that renames or drops it loses only the jump,
 * never the reminder.
 */
export interface UiWorkspaceLike {
  openSession: (sessionId: string) => void
}

/** The inject-free slice of a Cordis context used here (`ctx.get` from the registry). */
export interface ServiceLocator {
  get: (name: string) => unknown
}

/**
 * Opens one conversation through the host Workspace service.
 *
 * Every outcome is recorded before it is reported, so a click that does
 * nothing can be told apart from a click that never arrived.
 *
 * @returns whether the service was found and its `openSession` call returned.
 */
export function openConversation(locator: ServiceLocator, sessionId: string, onFailure: () => void): boolean {
  let workspace: UiWorkspaceLike | undefined
  try {
    workspace = locator.get('uiWorkspace') as UiWorkspaceLike | undefined
  } catch {
    diag(`navigate:service-missing:${sessionId}`)
    onFailure()
    return false
  }
  if (workspace === undefined || typeof workspace.openSession !== 'function') {
    diag(`navigate:service-missing:${sessionId}`)
    onFailure()
    return false
  }
  try {
    diag(`navigate:service-found:${sessionId}`)
    workspace.openSession(sessionId)
    diag(`navigate:open-called:${sessionId}`)
    return true
  } catch (error) {
    diag(`navigate:error:${error instanceof Error ? error.message : String(error)}`)
    onFailure()
    return false
  }
}
