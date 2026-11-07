const KEY = 'dsh.codexTaskNotifications.v1';
export const DEFAULTS = {
    completion: 'unfocused',
    permission: true,
    question: true,
    sound: 'default',
    customName: '',
};
function load() {
    if (typeof localStorage === 'undefined')
        return { ...DEFAULTS };
    try {
        const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (value === null || typeof value !== 'object')
            return { ...DEFAULTS };
        const v = value;
        return {
            completion: v.completion === 'always' || v.completion === 'off' || v.completion === 'unfocused' ? v.completion : DEFAULTS.completion,
            permission: typeof v.permission === 'boolean' ? v.permission : DEFAULTS.permission,
            question: typeof v.question === 'boolean' ? v.question : DEFAULTS.question,
            sound: v.sound === 'classic' || v.sound === 'custom' || v.sound === 'none' || v.sound === 'default' ? v.sound : DEFAULTS.sound,
            customName: typeof v.customName === 'string' ? v.customName : DEFAULTS.customName,
        };
    }
    catch {
        return { ...DEFAULTS };
    }
}
let current = load();
const listeners = new Set();
export function getSettings() { return current; }
export function subscribeSettings(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function setSetting(key, value) {
    current = { ...current, [key]: value };
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    }
    catch { /* still active for this window */ }
    for (const listener of listeners)
        listener();
}
