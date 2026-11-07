import { diag } from "./notify.js";
/**
 * Opens one conversation through the host Workspace service.
 *
 * Every outcome is recorded before it is reported, so a click that does
 * nothing can be told apart from a click that never arrived.
 *
 * @returns whether the service was found and its `openSession` call returned.
 */
export function openConversation(locator, sessionId, onFailure) {
    let workspace;
    try {
        workspace = locator.get('uiWorkspace');
    }
    catch {
        diag(`navigate:service-missing:${sessionId}`);
        onFailure();
        return false;
    }
    if (workspace === undefined || typeof workspace.openSession !== 'function') {
        diag(`navigate:service-missing:${sessionId}`);
        onFailure();
        return false;
    }
    try {
        diag(`navigate:service-found:${sessionId}`);
        workspace.openSession(sessionId);
        diag(`navigate:open-called:${sessionId}`);
        return true;
    }
    catch (error) {
        diag(`navigate:error:${error instanceof Error ? error.message : String(error)}`);
        onFailure();
        return false;
    }
}
