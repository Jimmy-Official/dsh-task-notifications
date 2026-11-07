import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { diffCompletions, toSnapshotView, type SnapshotView } from '../src/detect.ts'
import { shouldNotify } from '../src/client/shouldNotify.ts'
import { DEFAULTS } from '../src/client/settings.ts'
import { DEFAULT_SOUND, CLASSIC_SOUND } from '../src/client/sounds.ts'
import { NotificationSettings } from '../src/client/TaskNotifySettingsCard.tsx'
import { zh } from '../src/client/locales.ts'
import { checkSoundFile, readSoundFile, MAX_CUSTOM_SOUND_BYTES } from '../src/client/customSound.ts'
import { showNotification, soundSource } from '../src/client/notify.ts'
import { openConversation, type ServiceLocator } from '../src/client/navigation.ts'
import { extractFinalResult, MAX_NOTIFICATION_RESULT_CHARS, notificationText } from '../src/client/finalResult.ts'

const running: SnapshotView = { sessions: { s: { running: true, title: '测试任务' } } }
const done: SnapshotView = { sessions: { s: { running: false, title: '测试任务' } } }

/** Minimal fake of the two DSH snapshots, only the fields the detector reads. */
function listOf(rows: Record<string, Record<string, unknown>>): any {
  return { byId: rows }
}
function statusOf(entries: [string, Record<string, unknown>][]): any {
  return new Map(entries)
}

describe('Codex-style notifications', () => {
  it('shows no reply control and opens once when the in-page card is activated', () => {
    const created: any[] = []
    const clicks: string[] = []
    const original = { document: (globalThis as any).document, window: (globalThis as any).window }
    ;(globalThis as any).document = {
      createElement: () => {
        const node: any = { style: {}, textContent: '', children: [], removed: false, append(...kids: any[]) { node.children.push(...kids) }, remove() { node.removed = true }, setAttribute() {} }
        created.push(node)
        return node
      },
      body: { appendChild() {} },
    }
    ;(globalThis as any).window = { setTimeout: () => 0, focus: () => {} }
    try {
      showNotification('标题', '正文', 'none', () => clicks.push('open'))
      const toast = created[0]!
      toast.onclick()
      toast.onclick()
      expect(clicks).toEqual(['open'])
      expect(toast.children).toHaveLength(2)
      expect(created.find(node => node.textContent === '打开对话')).toBeUndefined()
      expect(toast.removed).toBe(true)
    } finally {
      ;(globalThis as any).document = original.document
      ;(globalThis as any).window = original.window
    }
  })
  it('keeps a native notification clickable and activates its conversation only once', () => {
    const clicks: string[] = []
    const original = { Notification: (globalThis as any).Notification, window: (globalThis as any).window }
    class FakeNotification {
      static permission = 'granted'
      static instances: FakeNotification[] = []
      onclick: (() => void) | null = null
      onclose: (() => void) | null = null
      onerror: (() => void) | null = null
      close = vi.fn()
      constructor(public title: string, public options: NotificationOptions) {
        FakeNotification.instances.push(this)
      }
    }
    const focus = vi.fn()
    ;(globalThis as any).Notification = FakeNotification
    ;(globalThis as any).window = { focus }
    try {
      showNotification('对话名称', '最终结果', 'none', () => clicks.push('open'))
      const notification = FakeNotification.instances[0]!
      expect(notification.title).toBe('对话名称')
      expect(notification.options).toMatchObject({ body: '最终结果', silent: true })
      notification.onclick?.()
      notification.onclick?.()
      expect(clicks).toEqual(['open'])
      expect(notification.close).toHaveBeenCalledTimes(1)
      expect(focus).toHaveBeenCalledTimes(1)
    } finally {
      ;(globalThis as any).Notification = original.Notification
      ;(globalThis as any).window = original.window
    }
  })
  it('notifies only for a completed turn when DSH is unfocused by default', () => {
    const events = diffCompletions(running, done)
    expect(events).toHaveLength(1)
    expect(shouldNotify(events[0]!, DEFAULTS, false)).toBe(true)
    expect(shouldNotify(events[0]!, DEFAULTS, true)).toBe(false)
    expect(shouldNotify(events[0]!, { ...DEFAULTS, completion: 'always' }, true)).toBe(true)
    expect(shouldNotify(events[0]!, { ...DEFAULTS, completion: 'off' }, false)).toBe(false)
  })
  it('does not treat an approval wait as a completed turn or replay the same request', () => {
    const waiting: SnapshotView = { sessions: { s: { running: false, pending: { key: 'p1', kind: 'approval' } } } }
    const events = diffCompletions(running, waiting)
    expect(events.map(e => e.kind)).toEqual(['review'])
    expect(diffCompletions(waiting, waiting)).toEqual([])
    expect(shouldNotify(events[0]!, DEFAULTS, true)).toBe(true)
    expect(shouldNotify(events[0]!, { ...DEFAULTS, permission: false }, false)).toBe(false)
  })
  it('uses a separate question switch', () => {
    const question = { kind: 'review', sessionId: 's', pending: 'question' } as const
    expect(shouldNotify(question, { ...DEFAULTS, permission: false }, true)).toBe(true)
    expect(shouldNotify(question, { ...DEFAULTS, question: false }, false)).toBe(false)
  })
  it('drops subagent sessions before they can become an event of any kind', () => {
    const child = { id: 'c', displayTitle: '分析日志', running: true, origin: 'subagent', retainedBy: 0, blank: false, updatedAt: 0 }
    const parent = { id: 'p', displayTitle: '主会话', running: true, retainedBy: 0, blank: false, updatedAt: 0 }
    const view = toSnapshotView(listOf({ p: parent, c: child }), statusOf([['p', { running: true }], ['c', { running: true }]]))
    expect(Object.keys(view.sessions)).toEqual(['p'])

    const childDone = toSnapshotView(listOf({ c: { ...child, running: false } }), statusOf([['c', { running: false }]]))
    const childAsking = toSnapshotView(
      listOf({ c: { ...child, running: true } }),
      statusOf([['c', { running: true, pendingInteraction: { key: 'q1', kind: 'question' } }]]),
    )
    expect(childDone.sessions).toEqual({})
    expect(childAsking.sessions).toEqual({})
    expect(diffCompletions(childDone, childAsking)).toEqual([])
  })
  it('keeps a normal turn on the completion switch even while focused', () => {
    const events = diffCompletions(running, done)
    expect(events[0]).toMatchObject({ kind: 'turn', sessionId: 's' })
    expect(shouldNotify(events[0]!, { ...DEFAULTS, completion: 'always' }, true)).toBe(true)
    expect(shouldNotify(events[0]!, { ...DEFAULTS, completion: 'unfocused' }, true)).toBe(false)
  })
  it('bundles byte-identical locally generated notification sounds', () => {
    const files = [
      ['default-notify.wav', DEFAULT_SOUND, '68ed872f7323e30e8de38d7e5ba3efbe4c975a6c7a81419a1c12e95e885f4e8d'],
      ['classic-notify.wav', CLASSIC_SOUND, 'd522805dedbcb7e29f035379523bf8797c942f27a685e444568b8284844f55a0'],
    ] as const
    for (const [name, embedded, expected] of files) {
      const bytes = readFileSync(new URL(`../assets/sounds/${name}`, import.meta.url))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected)
      expect(createHash('sha256').update(Buffer.from(embedded.split(',')[1]!, 'base64')).digest('hex')).toBe(expected)
    }
  })
  it('renders only the four remaining controls in the task notifications section', () => {
    const html = renderToStaticMarkup(createElement(NotificationSettings, { t: (key: keyof typeof zh) => zh[key] } as any))
    for (const label of ['轮次完成通知', '启用权限通知', '启用问题通知', '通知提示音']) {
      expect(html).toContain(label)
    }
    expect(html).not.toContain('启用子代理通知')
    expect(html.match(/role="switch"/g)).toHaveLength(2)
    expect(html).toContain('仅在未聚焦时')
  })
  it('ships a DSH client loader bundle with its own package identity', () => {
    const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    expect(bundle).toContain('__ModuleLoader__.load')
    expect(bundle).toContain('@local/dsh-task-notifications')
    expect(bundle).toContain('settings.section')
    expect(bundle).not.toContain('启用子代理通知')
  })
})

describe('final result extraction', () => {
  const entry = (type: string, data: Record<string, unknown>): unknown => ({
    type: 'event',
    event: { type, data },
  })

  it('uses only the last assistant text from the most recent completed turn', () => {
    const entries = [
      entry('assistant/message', { turn: 1, message: { content: [{ type: 'text', text: '旧结果' }] } }),
      entry('turn/end', { turn: 1, reason: 'completed' }),
      entry('assistant/message', { turn: 2, message: { content: [{ type: 'reasoning', text: '隐藏思考' }, { type: 'text', text: '**新结果**\n[详情](https://example.com)' }] } }),
      entry('assistant/message', { turn: 2, message: { content: [{ type: 'text', text: '最终结果' }] } }),
      entry('turn/end', { turn: 2, reason: 'completed' }),
    ]
    expect(extractFinalResult(entries)).toBe('最终结果')
  })

  it('never borrows an older answer when the completed turn has no assistant text', () => {
    const entries = [
      entry('assistant/message', { turn: 1, message: { content: [{ type: 'text', text: '不能显示这条' }] } }),
      entry('turn/end', { turn: 1 }),
      entry('assistant/message', { turn: 2, message: { content: [{ type: 'tool-call' }] } }),
      entry('turn/end', { turn: 2 }),
    ]
    expect(extractFinalResult(entries)).toBeNull()
    const stale = [
      { type: 'event', event: { type: 'assistant/message', time: 10, data: { turn: 3, message: { content: [{ type: 'text', text: '过期结果' }] } } } },
      { type: 'event', event: { type: 'turn/end', time: 20, data: { turn: 3 } } },
    ]
    expect(extractFinalResult(stale, 21)).toBeNull()
  })

  it('cleans Markdown and truncates by Unicode code point', () => {
    expect(notificationText('# 结论\n**完成**：[文件](https://example.com)')).toBe('结论\n完成：文件')
    const long = '😀'.repeat(MAX_NOTIFICATION_RESULT_CHARS + 5)
    const result = notificationText(long)!
    expect(Array.from(result)).toHaveLength(MAX_NOTIFICATION_RESULT_CHARS)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('legacy settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })
  it('reads a store written while the subagent switch still existed', async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ completion: 'always', permission: false, question: true, subagent: false, sound: 'classic', customName: '' }),
      setItem: () => {},
    })
    const mod = await import('../src/client/settings.ts')
    expect(mod.getSettings().completion).toBe('always')
    expect(mod.getSettings().permission).toBe(false)
    expect(mod.getSettings().sound).toBe('classic')
    expect(mod.getSettings()).not.toHaveProperty('subagent')
    expect(mod.DEFAULTS).not.toHaveProperty('subagent')
  })
})

describe('custom notification sound', () => {
  it('rejects empty, oversized and non-audio files', () => {
    expect(checkSoundFile({ size: 0, type: 'audio/wav' })).toBe('empty')
    expect(checkSoundFile({ size: MAX_CUSTOM_SOUND_BYTES + 1, type: 'audio/wav' })).toBe('too-large')
    expect(checkSoundFile({ size: 1024, type: 'image/png' })).toBe('unsupported-type')
    expect(checkSoundFile({ size: 1024, type: 'audio/mpeg' })).toBeNull()
  })
  it('accepts a sound file whose MIME is missing but whose extension proves it is audio', () => {
    // Windows routinely hands a .wav over with an empty type.
    expect(checkSoundFile({ size: 1024, type: '', name: '敲门.wav' })).toBeNull()
    expect(checkSoundFile({ size: 1024, type: 'application/octet-stream', name: 'x.MP3' })).toBeNull()
    // Without a name there is nothing to prove it is audio, so it stays rejected.
    expect(checkSoundFile({ size: 1024, type: '' })).toBe('unsupported-type')
    expect(checkSoundFile({ size: 1024, type: '', name: 'note.txt' })).toBe('unsupported-type')
  })
  it('rewraps a decoded file that arrives without an audio MIME', async () => {
    const original = (globalThis as any).FileReader
    class FakeReader {
      result = 'data:application/octet-stream;base64,AAAA'
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL(): void { queueMicrotask(() => this.onload?.()) }
    }
    ;(globalThis as any).FileReader = FakeReader
    try {
      const sound = await readSoundFile({ name: 'x.wav', size: 4, type: '' } as any)
      expect(sound.dataUri).toBe('data:audio/wav;base64,AAAA')
      expect(sound.name).toBe('x.wav')
    } finally {
      ;(globalThis as any).FileReader = original
    }
  })
  it('falls back to the bundled default when a custom sound is missing', () => {
    const custom = { name: 'me.wav', dataUri: 'data:audio/wav;base64,AAAA' }
    expect(soundSource('custom', custom)).toBe(custom.dataUri)
    expect(soundSource('custom', null)).toBe(DEFAULT_SOUND)
    expect(soundSource('classic', null)).toBe(CLASSIC_SOUND)
    expect(soundSource('default', custom)).toBe(DEFAULT_SOUND)
    expect(soundSource('none', custom)).toBeNull()
  })
})

const DIAG_KEY = 'dsh.codexTaskNotifications.diag.v1'

/** Captures the breadcrumb trail written by the reminder and navigation paths. */
function withDiagTrail(): { steps: () => string[]; restore: () => void } {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
  })
  return {
    steps: () => {
      const raw = store.get(DIAG_KEY)
      if (raw === undefined) return []
      return (JSON.parse(raw) as { step: string }[]).map((entry) => entry.step)
    },
    restore: () => { vi.unstubAllGlobals() },
  }
}

/** A service locator shaped like the part of a Cordis context this plugin uses. */
function locatorOf(service: unknown): ServiceLocator {
  return { get: (name: string) => (name === 'uiWorkspace' ? service : undefined) }
}

class FakeClickNotification {
  static permission = 'granted'
  static instances: FakeClickNotification[] = []
  onclick: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()
  constructor(public title: string, public options: NotificationOptions) {
    FakeClickNotification.instances.push(this)
  }
}

/** Replaces Notification and window for one native-click test. */
function withNativeClick(): { click: () => void; openSession: (id: string) => void; restore: () => void } {
  const original = { Notification: (globalThis as any).Notification, window: (globalThis as any).window }
  FakeClickNotification.instances = []
  ;(globalThis as any).Notification = FakeClickNotification
  ;(globalThis as any).window = { focus: () => { throw new Error('no window to focus') } }
  const openSession = vi.fn()
  return {
    openSession,
    click: () => { FakeClickNotification.instances[0]!.onclick?.() },
    restore: () => {
      ;(globalThis as any).Notification = original.Notification
      ;(globalThis as any).window = original.window
      vi.unstubAllGlobals()
    },
  }
}

describe('conversation navigation', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('opens the conversation once through ctx.get and records the path', () => {
    const trail = withDiagTrail()
    try {
      const openSession = vi.fn()
      const onFailure = vi.fn()
      expect(openConversation(locatorOf({ openSession }), 's1', onFailure)).toBe(true)
      expect(openSession).toHaveBeenCalledTimes(1)
      expect(openSession).toHaveBeenCalledWith('s1')
      expect(onFailure).not.toHaveBeenCalled()
      expect(trail.steps()).toContain('navigate:service-found:s1')
      expect(trail.steps()).toContain('navigate:open-called:s1')
    } finally { trail.restore() }
  })

  it('reports a missing service without throwing', () => {
    const trail = withDiagTrail()
    try {
      const onFailure = vi.fn()
      expect(openConversation(locatorOf(undefined), 's2', onFailure)).toBe(false)
      expect(onFailure).toHaveBeenCalledTimes(1)
      expect(trail.steps()).toContain('navigate:service-missing:s2')
    } finally { trail.restore() }
  })

  it('reports an openSession failure and survives it', () => {
    const trail = withDiagTrail()
    try {
      const openSession = () => { throw new Error('boom') }
      const onFailure = vi.fn()
      expect(openConversation(locatorOf({ openSession }), 's3', onFailure)).toBe(false)
      expect(onFailure).toHaveBeenCalledTimes(1)
      expect(trail.steps()).toContain('navigate:error:boom')
    } finally { trail.restore() }
  })

  it('still navigates when focusing the window throws', () => {
    const trail = withDiagTrail()
    const native = withNativeClick()
    const locator = locatorOf({ openSession: native.openSession })
    try {
      showNotification('对话名称', '最终结果', 'none', () => { openConversation(locator, 's9', () => {}) })
      native.click()
      expect(native.openSession).toHaveBeenCalledWith('s9')
      expect(trail.steps()).toContain('navigate:open-called:s9')
    } finally { native.restore() }
  })

  it('navigates once even when the native click fires twice', () => {
    const trail = withDiagTrail()
    const native = withNativeClick()
    const locator = locatorOf({ openSession: native.openSession })
    try {
      showNotification('对话名称', '最终结果', 'none', () => { openConversation(locator, 's10', () => {}) })
      native.click()
      native.click()
      expect(native.openSession).toHaveBeenCalledTimes(1)
      expect(native.openSession).toHaveBeenCalledWith('s10')
    } finally { native.restore() }
  })

  it('ships a single inject-free navigation path in source and bundle', () => {
    const index = readFileSync('src/client/index.ts', 'utf8')
    const navigation = readFileSync('src/client/navigation.ts', 'utf8')
    expect(index).not.toContain('uiWorkspace')
    expect(index).not.toContain('let navigate')
    expect(navigation).toContain("locator.get('uiWorkspace')")
    const bundle = readFileSync('lib/client.js', 'utf8')
    expect(bundle).toContain('uiWorkspace')
    expect(bundle).not.toContain('direct?.openSession')
    expect(bundle).not.toContain('let navigate')
  })
})
