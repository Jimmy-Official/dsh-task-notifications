/** Host entry for the local DSH Desktop task-notification bundle. */
/** Stable cordis plugin name (matches the cordis.patch.yml insert id). */
export const name = 'task-notify';
/** No required host services. */
export const inject = [];
/**
 * Host entrypoint retained for the DSH bundle loader.
 * @param _ctx - host plugin context (unused).
 */
export function apply(_ctx) {
    // Intentionally empty: package.json's dsh.client declaration mounts the UI.
}
