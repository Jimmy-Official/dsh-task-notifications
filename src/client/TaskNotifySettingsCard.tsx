import { useRef, useState, useSyncExternalStore, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { getSettings, setSetting, subscribeSettings, type CompletionMode, type SoundMode } from './settings.ts'
import {
  checkSoundFile, clearCustomSound, loadCustomSound, playSound, readSoundFile, saveCustomSound,
  type SoundFileProblem,
} from './customSound.ts'

export type NotificationSettingsProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-task-notifications'>

const card: CSSProperties = {
  maxWidth: 730, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)',
  borderRadius: 17, padding: '0 16px', background: 'var(--dsw-alias-bg-primary, #fff)',
}
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  minHeight: 62, gap: 16, borderBottom: '1px solid var(--dsw-alias-border-l2, #ececec)',
}
const label: CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #171717)' }
const hint: CSSProperties = { fontSize: 13, color: 'var(--dsw-alias-label-secondary, #777)', marginTop: 2 }
const select: CSSProperties = {
  flexShrink: 0, maxWidth: 160, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)',
  borderRadius: 10, background: 'var(--dsw-alias-bg-primary, #fff)',
  color: 'var(--dsw-alias-label-primary, #171717)', padding: '5px 10px', fontSize: 13,
}
const button: CSSProperties = {
  flexShrink: 0, border: '1px solid var(--dsw-alias-border-l2, #e6e6e6)', borderRadius: 10,
  background: 'var(--dsw-alias-bg-primary, #fff)', color: 'var(--dsw-alias-label-primary, #171717)',
  padding: '5px 10px', fontSize: 13, cursor: 'pointer',
}
function SettingsRow({ title, description, children, last = false }: {
  title: string; description: ReactNode; children: ReactNode; last?: boolean
}) {
  return <div style={{ ...row, ...(last ? { borderBottom: 'none' } : {}) }}>
    <div><div style={label}>{title}</div><div style={hint}>{description}</div></div>
    {children}
  </div>
}

function Toggle({ title, checked, onChange }: { title: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-label={title} aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{ width: 32, height: 20, flexShrink: 0, border: 0, borderRadius: 20,
      padding: 2, cursor: 'pointer', background: checked ? '#b548df' : '#b9b9b9',
      display: 'flex', alignItems: 'center', justifyContent: checked ? 'flex-end' : 'flex-start' }}>
    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
  </button>
}

export function NotificationSettings(props: NotificationSettingsProps) {
  const { t } = props
  const cfg = useSyncExternalStore(subscribeSettings, getSettings, getSettings)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const hasCustom = cfg.customName !== ''

  const problemText = (problem: SoundFileProblem): string =>
    problem === 'too-large' ? t('customTooLarge')
      : problem === 'empty' ? t('customEmptyFile')
      : t('customUnsupported')

  const pick = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (file === undefined) return
    const problem = checkSoundFile(file)
    if (problem !== null) {
      setError(problemText(problem))
      return
    }
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const sound = await readSoundFile(file)
        if (!(await playSound(sound.dataUri))) {
          setError(t('customUnplayable'))
          return
        }
        try {
          saveCustomSound(sound)
        } catch {
          setError(t('customQuota'))
          return
        }
        setSetting('customName', sound.name)
        setSetting('sound', 'custom')
        setError(null)
      } catch (error: unknown) {
        const code = error instanceof Error ? error.message : ''
        setError(code === 'too-large' || code === 'empty' ? problemText(code)
          : code === 'unsupported-type' ? t('customUnsupported')
          : t('customUnreadable'))
      } finally {
        setBusy(false)
      }
    })()
  }

  const preview = (): void => {
    const sound = loadCustomSound()
    if (sound === null) {
      setError(t('customEmpty'))
      return
    }
    setError(null)
    void playSound(sound.dataUri)
  }

  const remove = (): void => {
    clearCustomSound()
    setSetting('customName', '')
    setSetting('sound', 'default')
    setError(null)
  }

  const importLabel = busy ? t('customReading') : hasCustom ? t('customReplace') : t('customChoose')
  const customDescription = error !== null
    ? <span style={{ color: '#d33' }}>{error}</span>
    : hasCustom ? cfg.customName : t('customHint')

  return <section aria-label={t('nav')} style={{ padding: '0 4px' }}>
    <h2 style={{ ...label, fontSize: 16, margin: '0 0 16px' }}>{t('title')}</h2>
    <div style={card}>
      <SettingsRow title={t('completion')} description={t('completionHint')}>
        <select aria-label={t('completion')} style={select} value={cfg.completion}
          onChange={e => setSetting('completion', e.target.value as CompletionMode)}>
          <option value="unfocused">{t('unfocused')}</option>
          <option value="always">{t('always')}</option>
          <option value="off">{t('off')}</option>
        </select>
      </SettingsRow>
      <SettingsRow title={t('permission')} description={t('permissionHint')}>
        <Toggle title={t('permission')} checked={cfg.permission} onChange={v => setSetting('permission', v)} />
      </SettingsRow>
      <SettingsRow title={t('question')} description={t('questionHint')}>
        <Toggle title={t('question')} checked={cfg.question} onChange={v => setSetting('question', v)} />
      </SettingsRow>
      <SettingsRow title={t('sound')} description={t('soundHint')} last={cfg.sound !== 'custom'}>
        <select aria-label={t('sound')} style={select} value={cfg.sound}
          onChange={e => setSetting('sound', e.target.value as SoundMode)}>
          <option value="default">{t('default')}</option>
          <option value="classic">{t('classic')}</option>
          <option value="custom">{t('custom')}</option>
          <option value="none">{t('none')}</option>
        </select>
      </SettingsRow>
      {cfg.sound === 'custom' && (
        <SettingsRow title={t('custom')} description={customDescription} last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input ref={fileRef} type="file" accept="audio/*" aria-label={t('customChoose')}
              style={{ display: 'none' }} onChange={pick} />
            <button type="button" style={button} disabled={busy} onClick={() => fileRef.current?.click()}>
              {importLabel}
            </button>
            <button type="button" style={button} disabled={!hasCustom} onClick={preview}>
              {t('customPreview')}
            </button>
            {hasCustom && <button type="button" style={button} onClick={remove}>{t('customRemove')}</button>}
          </div>
        </SettingsRow>
      )}
    </div>
  </section>
}
