import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useSyncExternalStore } from 'react';
import { getSettings, setSetting, subscribeSettings } from "./settings.js";
import { checkSoundFile, clearCustomSound, loadCustomSound, playSound, readSoundFile, saveCustomSound, } from "./customSound.js";
const card = {
    maxWidth: 730, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)',
    borderRadius: 17, padding: '0 16px', background: 'var(--dsw-alias-bg-primary, #fff)',
};
const row = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 62, gap: 16, borderBottom: '1px solid var(--dsw-alias-border-l2, #ececec)',
};
const label = { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #171717)' };
const hint = { fontSize: 13, color: 'var(--dsw-alias-label-secondary, #777)', marginTop: 2 };
const select = {
    flexShrink: 0, maxWidth: 160, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)',
    borderRadius: 10, background: 'var(--dsw-alias-bg-primary, #fff)',
    color: 'var(--dsw-alias-label-primary, #171717)', padding: '5px 10px', fontSize: 13,
};
const button = {
    flexShrink: 0, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)', borderRadius: 10,
    background: 'var(--dsw-alias-bg-primary, #fff)', color: 'var(--dsw-alias-label-primary, #171717)',
    padding: '5px 10px', fontSize: 13, cursor: 'pointer',
};
function SettingsRow({ title, description, children, last = false }) {
    return _jsxs("div", { style: { ...row, ...(last ? { borderBottom: 'none' } : {}) }, children: [_jsxs("div", { children: [_jsx("div", { style: label, children: title }), _jsx("div", { style: hint, children: description })] }), children] });
}
function Toggle({ title, checked, onChange }) {
    return _jsx("button", { type: "button", role: "switch", "aria-label": title, "aria-checked": checked, onClick: () => onChange(!checked), style: { width: 32, height: 20, flexShrink: 0, border: 0, borderRadius: 20,
            padding: 2, cursor: 'pointer', background: checked ? '#b548df' : '#b9b9b9',
            display: 'flex', alignItems: 'center', justifyContent: checked ? 'flex-end' : 'flex-start' }, children: _jsx("span", { style: { width: 16, height: 16, borderRadius: '50%', background: '#fff' } }) });
}
export function NotificationSettings(props) {
    const { t } = props;
    const cfg = useSyncExternalStore(subscribeSettings, getSettings, getSettings);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);
    const hasCustom = cfg.customName !== '';
    const problemText = (problem) => problem === 'too-large' ? t('customTooLarge')
        : problem === 'empty' ? t('customEmptyFile')
            : t('customUnsupported');
    const pick = (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        input.value = '';
        if (file === undefined)
            return;
        const problem = checkSoundFile(file);
        if (problem !== null) {
            setError(problemText(problem));
            return;
        }
        setBusy(true);
        setError(null);
        void (async () => {
            try {
                const sound = await readSoundFile(file);
                if (!(await playSound(sound.dataUri))) {
                    setError(t('customUnplayable'));
                    return;
                }
                try {
                    saveCustomSound(sound);
                }
                catch {
                    setError(t('customQuota'));
                    return;
                }
                setSetting('customName', sound.name);
                setSetting('sound', 'custom');
                setError(null);
            }
            catch (error) {
                const code = error instanceof Error ? error.message : '';
                setError(code === 'too-large' || code === 'empty' ? problemText(code)
                    : code === 'unsupported-type' ? t('customUnsupported')
                        : t('customUnreadable'));
            }
            finally {
                setBusy(false);
            }
        })();
    };
    const preview = () => {
        const sound = loadCustomSound();
        if (sound === null) {
            setError(t('customEmpty'));
            return;
        }
        setError(null);
        void playSound(sound.dataUri);
    };
    const remove = () => {
        clearCustomSound();
        setSetting('customName', '');
        setSetting('sound', 'default');
        setError(null);
    };
    const importLabel = busy ? t('customReading') : hasCustom ? t('customReplace') : t('customChoose');
    const customDescription = error !== null
        ? _jsx("span", { style: { color: '#d33' }, children: error })
        : hasCustom ? cfg.customName : t('customHint');
    return _jsxs("section", { "aria-label": t('nav'), style: { padding: '0 4px' }, children: [_jsx("h2", { style: { ...label, fontSize: 16, margin: '0 0 16px' }, children: t('title') }), _jsxs("div", { style: card, children: [_jsx(SettingsRow, { title: t('completion'), description: t('completionHint'), children: _jsxs("select", { "aria-label": t('completion'), style: select, value: cfg.completion, onChange: e => setSetting('completion', e.target.value), children: [_jsx("option", { value: "unfocused", children: t('unfocused') }), _jsx("option", { value: "always", children: t('always') }), _jsx("option", { value: "off", children: t('off') })] }) }), _jsx(SettingsRow, { title: t('permission'), description: t('permissionHint'), children: _jsx(Toggle, { title: t('permission'), checked: cfg.permission, onChange: v => setSetting('permission', v) }) }), _jsx(SettingsRow, { title: t('question'), description: t('questionHint'), children: _jsx(Toggle, { title: t('question'), checked: cfg.question, onChange: v => setSetting('question', v) }) }), _jsx(SettingsRow, { title: t('sound'), description: t('soundHint'), last: cfg.sound !== 'custom', children: _jsxs("select", { "aria-label": t('sound'), style: select, value: cfg.sound, onChange: e => setSetting('sound', e.target.value), children: [_jsx("option", { value: "default", children: t('default') }), _jsx("option", { value: "classic", children: t('classic') }), _jsx("option", { value: "custom", children: t('custom') }), _jsx("option", { value: "none", children: t('none') })] }) }), cfg.sound === 'custom' && (_jsx(SettingsRow, { title: t('custom'), description: customDescription, last: true, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { ref: fileRef, type: "file", accept: "audio/*", "aria-label": t('customChoose'), style: { display: 'none' }, onChange: pick }), _jsx("button", { type: "button", style: button, disabled: busy, onClick: () => fileRef.current?.click(), children: importLabel }), _jsx("button", { type: "button", style: button, disabled: !hasCustom, onClick: preview, children: t('customPreview') }), hasCustom && _jsx("button", { type: "button", style: button, onClick: remove, children: t('customRemove') })] }) }))] })] });
}
