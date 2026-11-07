/** Permission prompts and questions have their own controls; turns follow the completion mode. */
export function shouldNotify(event, settings, focused) {
    if (event.kind === 'turn') {
        return settings.completion === 'always' || (settings.completion === 'unfocused' && !focused);
    }
    if (event.kind === 'review') {
        return event.pending === 'question' ? settings.question : settings.permission;
    }
    return false;
}
