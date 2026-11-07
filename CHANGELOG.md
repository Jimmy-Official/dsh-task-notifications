# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

Planned work is tracked in exactly one place: the [Roadmap](./README.md#roadmap) in `README.md`. This file records what has shipped, so an item appears here only once it is implemented — not when it is merely intended.

### Changed

- **Sharpened the install-cooldown note against a measured run.** Four minutes after `0.3.0` published, the bare `dsh plugin add @ltao0829/dsh-task-notify` resolved to `0.1.0` — pnpm's `minimumReleaseAge` window admits the newest release *older* than 24 hours, which is not necessarily the immediately previous one — and DSH refused it with an explicit peer-mismatch error and restored `package.json`, the lockfile, and `node_modules`. Both READMEs now describe that instead of "silently resolves to the previous release".

## [0.1.10] - 2026-11-08

### Changed

- 两段随包提示音改为仓库内脚本合成，不再内联从本机 Codex 安装包提取的 WAV；`lib/client.js` 从 533 kB 降到 116 kB，测试改为校验新音频的字节与 SHA-256。
- `peerDependencies` 与 `engines.dsh` 增加预发布分支，改为 `^0.2.0-rc.2 || ^0.2.1-rc.1`，使 0.2.1 预发布版本也能通过 peer 校验。
- `repository` / `homepage` / `bugs` 指向 `Jimmy-Official/dsh-task-notifications`，LICENSE 追加本仓库版权声明。

### Note

- 未改任何功能代码；「点击通知跳转」仍未经真实桌面验证，本版不声称可用。

## [0.1.9] - 2026-11-02

### Fixed

- **点击通知不跳转。** `src/client/index.ts` 在 `try` 之外读取 `ctx.uiWorkspace`；该服务未声明在 `inject` 中时 Cordis 抛出 `cannot get property "uiWorkspace" without inject`，异常直接跳出点击处理函数，既不导航也不提示。改用 `ctx.get('uiWorkspace')` 单一路径，删除晚绑定变量与属性直读。
- `window.focus()` 与 `notification.close()` 各自 try/catch，聚焦失败不再阻断 `openSession`。

### Added

- 导航全链路诊断：`navigate:service-found`、`navigate:open-called`、`navigate:service-missing`、`navigate:error:<message>`，与既有的 `native:clicked` 串成一条可读链路；记录上限 32 条。
- 新增 `src/client/navigation.ts`，导航逻辑可单测；测试总数 18 → 24。

## [0.1.8] - 2026-11-02

### Added

- 轮次完成后通过 Session Controller 的受支持 Client API 读取最近已结束轮次，提取该轮最后一条 `assistant/message` 的文本块作为通知正文。
- 最终结果会去掉常见 Markdown 装饰并按 Unicode 字符截到 700 字；本轮没有文本时显示明确的完成兜底文案，不会错拿上一轮回答。
- 新增最终结果提取、旧轮次隔离、Unicode 截断及原生通知单次点击测试，测试总数 14 → 18。

### Fixed

- 原生通知集合只声明未写入，`Notification` 对象可能被回收并丢失点击回调；现在显示后加入强引用集合，关闭、出错或点击时释放。
- 晚绑定的 `openSession` 不再吞掉异常，失败会进入既有的「请手动选择对话」提示路径。

### Changed

- 完成通知标题改为对话名称，正文改为最终结果，更接近 Codex 的信息层级。
- 页面内回退卡片与系统通知都改为整块点击，不再渲染动作按钮，也没有输入框或 Reply 功能。

## [0.1.7] - 2026-11-02

### Fixed

- 识别音频文件时不再只看 `File.type`：Windows 常把 `.wav` 交过来时类型为空，以前会被判成 `unsupported-type`。现在按扩展名兜底（wav/wave/mp3/m4a/aac/ogg/oga/opus/flac/webm）。
- `readSoundFile` 在 `FileReader` 给出非 `audio/` 的 `data:` 前缀时，用扩展名推出的 MIME 重新拼接，避免 `new Audio(...)` 解码失败。
- 移除自定义提示音时同时把 `sound` 退回 `default`，不再保留一个空的「自定义」行。
- 跳转失败会被报告：拿不到 `uiWorkspace` 或 `openSession` 抛错时，在页面右下角提示「没能切换到该对话，请手动在左侧列表里选择」。

### Added

- 两个测试：扩展名兜底识别；无 MIME 文件重新包装为 `audio/wav`。

## [0.1.6] - 2026-11-02

### Fixed

- 点击提醒从来不跳转：`uiWorkspace` 服务没有声明进 `inject`，`ctx.uiWorkspace` 恒为 `undefined`，`0.1.5` 的点击回调因此静默空转。改为 `ctx.inject(['uiWorkspace'], …)` 晚绑定，并保留直接取值作兜底。
- 系统通知的点击回调可能被重复触发，加一次性守卫。

### Changed

- 宿主服务缺失时只丢掉跳转，提醒与提示音不受影响。

## [0.1.5] - 2026-11-02

### Added

- 提示卡片可点击跳转：底部按钮文字按提醒类型显示「打开对话」/「去批准」/「去回答」，点按钮或卡片任意位置都会切换到产生该提醒的对话。
- 系统通知被点击时同样切换到对应对话（Windows 系统通知本身无法承载按钮）。

### Changed

- 卡片自动消失时间 5 秒 → 8 秒，并支持键盘回车 / 空格触发。
- 跳转通过宿主 `uiWorkspace` 服务完成，该服务不写入 `inject`，缺失或抛错时只丢掉跳转。
- 测试数 11 → 12。

## [0.1.4] - 2026-11-02

彻底移除子代理提醒。这一版只做减法：不再存在任何针对子代理的通知路径。

### Removed

- 设置页删除「启用子代理通知」整行，控件从 5 个降为 4 个（轮次完成 / 权限 / 问题 / 提示音）。
- `detect.ts` 删除作业相关类型与差分（`JobStatus`、`JobRowView`、`JobsSnapshot`、`SETTLED`、`isSettled`、`job` 事件变体）；`toSnapshotView` 不再接收作业快照。
- `detect.ts` 在建视图时直接跳过 `origin === 'subagent'` 的会话：子代理的轮次结束、被终止、权限请求与提问都不会进入事件流。
- `client/index.ts` 去掉 `jobs` 注入与订阅、`watchRows` 订阅、`activeSessions` / `jobWatchers` 管理，以及子代理专用标题。
- `shouldNotify.ts` 只保留普通轮次完成、权限、问题三条判断。
- 删除 5 个 locale 键（`subagent`、`subagentHint`、`subagentTitle`、`subagentFailedTitle`、`subagentEndedTitle`）与 `@deepseek-ai/dsh-api-job-controller` 依赖。

### Changed

- 旧版 `localStorage` 里的 `subagent` 字段在读取时被忽略，其他设置原样保留，存储不重置。
- 测试数 12 → 11：删掉作业用例与子代理路由用例，新增「子代理会话在进入 diff 前就被丢弃」「旧设置可读」两个用例。

## [0.1.3] - 2026-11-01

### Added

- 「通知提示音」新增「自定义…」：可导入本机音频文件（wav / mp3 / ogg / m4a，上限 1 MB），导入时自动试听校验，之后可试听、更换、移除。
- 自定义音频以 data URI 保存在 `localStorage` 的独立键 `dsh.codexTaskNotifications.sound.v1`，不随设置项每次重写，也不进入插件包。
- 测试数 10 → 12（文件大小/类型校验、自定义音源解析与回落）。

### Fixed

- 选中「自定义」但没有可用音频（从未导入或被清掉）时，提醒回落到内置默认音，不再静默无声。
- 文件过大、非音频、空文件、浏览器存储配额写满，都会给出对应中文提示，而不是静默失败。

## [0.1.2] - 2026-11-01

本地分支的第二个修复版本。**0.1.1 的修复方向是错的**：它假设子代理会产生 `job` 记录，实测确认这版 DSH 里子代理不是作业。

### Fixed

- **子代理提醒不再谎报「已完成」。** 子代理会话结束会触发一次轮次结束事件，旧逻辑据此弹「DSH 任务已完成」，被终止的子代理也一样。现在 `detect.ts` 把 `SessionSummary.origin` 带进 `turn` 事件，标题改为「DSH 子代理已结束」（新增 locale 键 `subagentEndedTitle`）。
- **「启用子代理通知」开关生效。** 以前它只拦 `job` 事件（子代理不产生），实际等于没有作用；现在它拦子代理会话的轮次提醒。
- 更新设置页子代理说明文案，明确「完成或被终止都会提醒」。

### Added

- 两个测试：子代理会话的轮次提醒归子代理开关管，普通轮次的提醒仍归「轮次完成通知」管。测试数 8 → 10。

### Known limitation

- 仍无法区分完成、失败与被终止：轮次事件不带结果。要区分需接入子代理面板（`dsh-client-ui-subagent`）的数据源，属于下一阶段工作。

## [0.1.1] - 2026-11-01

本地分支（`@local/dsh-task-notifications`）的修复版本。本地版本号独立于上游——上游已发到 0.3.x，本分支从 0.1.0 起算，故本节排在 0.3.0 之前。

### Fixed

- **失败的子代理不再静默。** `shouldNotify` 只接受 `status === 'completed'`；`failed` 与 `killed` 的子代理虽然已被 `detect.ts` 判为已结束并产出事件，却在通知前被丢弃。现在三种终态都会提醒。
- **标题区分结束状态。** 新增 locale 键 `subagentFailedTitle`（zh/en）：失败或被终止的子代理显示「DSH 子代理未完成」，正文附带作业名与状态。
- **删除从未被产生的 `failure` 事件变体**（`detect.ts`），避免误以为已存在会话级失败提醒。

### Added

- 两个测试：失败/终止状态的 `shouldNotify` 判定，以及 `running → failed` 的 `diffCompletions` 转事件链路。测试数 7 → 8。

## [0.3.0] - 2026-10-02

The first feature release on the DSH 0.2 line: notification customization, a coverage regression gate, and an npm downloads badge. No peer range changed, so a `0.2.x` install upgrades in place.

### Added

- **Notification customization.** The eight boolean switches gained user-facing configuration:
  - **Title / body templates** with `{title}` (task title), `{session}` (session ID), and `{kind}` (localized event type) placeholders; empty templates keep the built-in localized copy, unknown placeholders stay as written, and template output is rendered as plain text (`textContent`), so a template cannot inject markup.
  - **Sound styles**: none / single tone / the classic two-tone / a custom audio URL, plus a 0–100% volume control. A custom mode with an empty URL falls back to the two-tone; an unloadable URL degrades to silence.
  - **Toast placement and duration**: any of the four screen corners, and 3–15 seconds on screen (previously fixed at bottom-right for 5 seconds).
  - **Quiet hours**: a local-time window (may cross midnight, e.g. 22:00 → 08:00) that suppresses every reminder, plus a per-session mute list.
- **Test coverage measurement and regression gate.** Added `@vitest/coverage-v8` (pinned to the exact vitest version), a `pnpm run coverage` script, and V8 coverage over `src/**` with `text` + `lcov` reporters. Global thresholds track the measured coverage with about one point of slack — statements 77 / branches 68 / functions 90 / lines 81 against a measured 78.6 / 69.85 / 91.35 / 82.3 — and are raise-only; a drop fails the run. CI runs coverage after the build on both Node legs and uploads `coverage/lcov.info` from the Node 24 leg as an artifact. The weakest remaining files are the client watcher (`src/client/index.ts`, 69.76% of statements and 44.44% of branches) and the toast/notification renderer (`src/client/notify.ts`, 70.58%).
- **npm downloads badge** in both READMEs (`img.shields.io/npm/dm/…`), backed purely by npm's public download API — no client-side reporting was added. Caveat to keep attached to any use of the number: it counts npm tarball downloads per month (CI installs and registry mirrors included), not active users.

### Changed

- **Settings storage upgraded to `dsh.taskNotify.v3`.** A leftover `v2` record is migrated once — every toggle is kept, and the retired `sound` boolean maps to `soundMode: 'double'` (off maps to `'off'`) — after which the `v2` key is removed. Every stored field is sanitized on load: junk values degrade to their defaults, `volume` and `toastSeconds` are clamped into `0`–`1` / `3`–`15`.
- **Documentation on `main` since `0.2.0`.** Install guidance in both READMEs names a version range (pnpm 11's 24-hour `minimumReleaseAge` cooldown would otherwise resolve the bare name to an older release), pins Git installs to a release tag, and states the DSH line pairing. Both READMEs also gained a language switch, a requirements table, an uninstall section, a troubleshooting table, and settings labels that match `src/client/locales.ts`; the demo table lists the three recording file names instead of embedding GIFs that are not in the repository.
- Added `docs/roadmap-plan.md`: scope, technical constraints, dependencies, risks, and acceptance criteria for every open roadmap item.
- **Settings-page and test hygiene.** The body-template box is now its own labelled field instead of a second box under the title label — a placeholder is not an accessible name. `tests/settings-card.spec.tsx` restores every setting to its documented default in `beforeEach`, so no test can observe another test's edits (the file imports the store statically, and a dynamic import after `vi.resetModules()` would hand the card a second React instance).

### Fixed

- **Corrected the DSH 0.1.x install path.** Both READMEs told DSH 0.1.x users to install `0.1.2`, but npm has only ever carried `0.1.0` and `0.2.0` and no `v0.1.1`/`v0.1.2` tag exists, so the instruction could not be followed. The `0.1.x` line is now documented as discontinued, with a pointer to the DSH upgrade.

## [0.2.0] - 2026-10-02

Re-targets the plugin at **DeepSeek Harness 0.2 (`0.2.0-rc.2`)**. This is a breaking release: DSH 0.2 removed the client packages and slots the 0.1.x line was built on.

### Changed

- **Detection now folds three DSH 0.2 client sources** instead of the retired single `sessions.list` store: `ctx.sessions.list` (catalog and Host baseline), `ctx.uiSession.sessionStatus` (live running state and the pending interaction), and `ctx.jobs.state` (per-Session job rosters).
- **Background jobs are watched per Session.** `IJobs.watchRows(sessionId)` opens one `job.list` stream per Session; the watcher opens one for every Session observed running since page load, and a new "watch every session" setting switches to the whole catalog.
- **A pending interaction is tracked by its opaque request key** rather than by presence alone, so a replacement request reminds again while a reconnect replay of the same request stays silent. The `kind` is now an open, domain-owned string, and an unrecognized kind falls back to the wire word instead of a wrong translation.
- **Settings moved to the `settings.plugins.tab` seat** (Plugins section, one page per contribution). The retired `settings.plugin.item` card list no longer exists, so the settings page renders toggles as a form rather than a single `<li>` card.
- **Client context types come from `@deepseek-ai/cordis`** plus the domain packages' declaration merges; `@deepseek-ai/dsh-client-runtime` was removed from DSH and is no longer referenced.
- **Host half is now inert.** The `schemastery` `Config` schema was dropped along with the dependency: the host half is a loader anchor and holds no settings.
- **Build externals track the 0.2 platform module table** (`@deepseek-ai/dsh-client-store` and `-ui-dockkit` in; `dsh-client-runtime`, `dsh-client-web-react`, and `dsh-client-schema-form` out).
- **Theme tokens refreshed for the 0.2 alias table**: the toast uses `--dsw-alias-bg-overlay`, and the settings page no longer uses the removed `--dsw-alias-label-tertiary`.
- Toast copy is localized through the plugin's own namespace instead of being hard-coded Chinese.

### Added

- Manifest contract tests (`tests/manifest.spec.ts`): `manifestVersion`, the web client platform, the `engines.dsh` range, per-peer range pinning, and patch/plugin identity agreement.
- `tests/client-apply.spec.ts`: drives `apply(ctx)` against a fake client context, covering the registrations and the watcher end-to-end — the seat the 0.1.1 keyed-slot regression escaped through.
- A "watch every session" setting with `zh`/`en` copy.

### Fixed

- Installation is accepted again by DSH 0.2's compatibility gate, which checks `peerDependencies` on `@deepseek-ai/dsh*` against the runtime version. The retired `dsh.compatibility` block and the 0.1.x peer ranges are gone; every DSH peer is pinned to `^0.2.0-rc.2`.

### Removed

- The `dsh.compatibility` manifest block (`dsh` and `dshReleases` tables), which DSH 0.2 no longer reads.
- The `schemastery` runtime dependency and the host `Config` schema.
- The `dsh.taskNotify.v1` storage key in favour of `dsh.taskNotify.v2`, so a DSH 0.2 install starts from clean defaults instead of inheriting a record written by the 0.1.x line.

## [0.1.2] - 2026-09-13

### Fixed

- Remove the obsolete host-side `installSettingsSection` integration, which is not exported by `@deepseek-ai/dsh-settings` in DSH `0.1.5`. Notification preferences remain browser-local as designed.
- Make disposable-profile verification tolerate first-run setup time, probe the authenticated Web URL, report the actual HTTP status, surface pnpm failures, and always clean up the spawned process and temporary profile.

### Changed

- Expand `@deepseek-ai/dsh-*` `peerDependencies` range to `>=0.1.0-rc.6 <0.2.0 || ^0.1.1-rc.1 || ^0.1.2-alpha.1 || ^0.1.3-alpha.1 || ^0.1.5-alpha.1 || ^0.1.5-rc.1` to align with declared DSH releases including `0.1.5-alpha.2`, `0.1.5-rc.1`, and `0.1.5-rc.2`.
- Update `pnpm-lock.yaml` with aligned peerDependencies.

### Added

- Add disposable profile verification script (`scripts/verify-disposable-profile.cjs`) and integrate `verify:profile` into CI workflow.
- Add verification evidence report (`docs/verification-evidence.md`).

## [0.1.1] - 2026-09-13

### Fixed

- Register the settings card into the keyed `settings.plugin.item` slot with a `key` (the settings namespace) instead of a list-slot `id`. The previous wiring made the plugin fail to load with `keyed slot "settings.plugin.item" requires options.key` on dsh `0.1.1-rc.2` (#7).

### Changed

- Declare explicit DSH and Node.js compatibility under `dsh.compatibility` and `engines` in `package.json` for DSH Store catalog contract compliance.

## [0.1.0] - 2026-08-20

Initial release.

### Added

- Turn-completion reminder: fires when an agent turn (thinking or tool use) finishes.
- Background-job reminder: fires when a background command or subagent job settles (`completed` / `failed` / `killed`).
- Review-needed reminder: fires when a running task waits for approval, plan review, or a question answer.
- Failure reminder: fires when an agent turn errors (`lastAgentError`) or a background job fails / is killed.
- Three notification channels: OS-level browser notification, in-page toast, optional two-tone beep.
- Per-event configuration with seven independent toggles, persisted in `localStorage` (`dsh.taskNotify.v1`).
- Host half (`src/index.ts`) registering the `task-notify` settings section.
- Pure snapshot-diff detector (`src/detect.ts`) with Vitest unit tests (`tests/detect.spec.ts`, 15 tests).
- CI workflow (`.github/workflows/ci.yml`): typecheck + test + build on push and pull request.
- English `README.md` and Chinese `README.zh-CN.md` documentation.

### Security

- No external server, telemetry, analytics, or API key. Notifications are generated locally; settings live in `localStorage` only; conversation content is never uploaded.

## [0.0.0] - 2026-08-14

Initial development (pre-release commits).
