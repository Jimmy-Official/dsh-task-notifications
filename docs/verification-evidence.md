# 验证记录

本仓库是 [`ltao0829/dsh-task-notify`](https://github.com/ltao0829/dsh-task-notify) `0.3.0` 的本地魔改分支：包名改为 `@local/dsh-task-notifications`，`src` 从 1,463 行裁到约 500 行，测试集从 9 个 spec 收到 1 个。上游那份验证证据因此不能直接套用在本构建上——本文件分成两节：第 1 节保留上游记录（历史与方法参考），第 2 节是本构建的实测。

## 1. 上游证据（`@ltao0829/dsh-task-notify@0.3.0`，历史，不适用本构建）

原记录：临时 `DSH_HOME` + `dsh plugin add` 的一次性 Profile 验证，六个阶段全部通过。

| 项目 | 上游数值 |
|---|---|
| 固定 Commit | `6735fd29909edc9e2f0531a52d671b2d9e607bcf` |
| 验证时间 | `2026-11-01T09:20:01.152Z` |
| Node.js | `v24.14.0` (win32 x64) |
| DSH | `0.2.1-rc.5` |
| 监听地址 | `http://127.0.0.1:3936` |
| 客户端产物 | `package/lib/client.js`，519,018 字节 |
| 产物外部依赖 | `react`、`react/jsx-runtime` |

与当前仓库对不上的三处：

- 包名是本地的 `@local/dsh-task-notifications`，不是 `@ltao0829/dsh-task-notify`。
- 519,018 字节是上游 0.3.0 的产物；本构建 0.1.1 是 519,463 字节，0.1.2 是 519,845 字节。
- 原文引用的 `tests/client-apply.spec.ts`、`tests/notification.spec.ts` 在本仓库已删除，现存测试只有 `tests/codex-notifications.spec.ts`。

## 2. 本构建（`@local/dsh-task-notifications@0.1.3`，2026-11-01）

### 已执行

| 阶段 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `tsc -b --pretty false` | 退出码 0 |
| 构建 | `tsdown` | `lib/index.js` 355 B；`lib/client.js` 528,412 B（gzip 153.37 kB） |
| 单元与渲染测试 | `vitest run tests/codex-notifications.spec.ts` | 12/12 通过 |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.3.tgz`，793,196 B，48 个文件，shasum `7c38d206633373293fbc6a56f5c5706d92f161c3` |

0.1.2 的历史数值（已作废）：`lib/client.js` 519,845 B，`local-dsh-task-notifications-0.1.2.tgz` 780,981 B，44 个文件，shasum `72b295f90dc1467ea5f53a3336adcd9e60eefc7f`，10/10 测试通过。

0.1.1 的历史数值（已作废，仅供对照）：`lib/client.js` 519,463 B，`local-dsh-task-notifications-0.1.1.tgz` 779,223 B，shasum `349d95cde53e34a348c64a7ef2c622dad8191859`，8/8 测试通过。

测试覆盖：轮次完成判定的四种组合；审批等待不误报且同一请求不重放；问题独立开关；子代理三种作业结束状态；`running → failed` 的 diff 转事件链路；**子代理会话的轮次提醒归「启用子代理通知」管、普通轮次仍归「轮次完成通知」管**；两段 WAV 与内联数据 URI 的 sha256 一致；设置页五个控件渲染；`lib/client.js` 携带 `__ModuleLoader__.load` 与包名标识。

### 运行时观察（2026-11-01 20:50 起，0.1.1 已装载）

主进程 20:50:06 重启后加载 0.1.1（`lib/client.js` 519,463 B，含「子代理未完成」）。随后做两次子代理测试：

| 测试 | 子代理结局 | 观察到的系统通知 |
|---|---|---|
| 1 | 启动约 7 秒后被 `interrupt_agent` 终止 | 标题「DSH 任务已完成」，正文是英文任务描述 |
| 2 | 正常完成 | 标题「DSH 任务已完成」，正文是该会话标题 |

结论（已测）：

- 两条通知都由**会话轮次结束**触发，标题固定 `turnTitle`，不因失败/终止而改变。
- 「被终止也会弹」成立；「标题区分结果」不成立。
- 0.1.1 修复的 `job` 分支从未触发：这版 DSH 里子代理不产生作业记录。核查依据（只读代码检索）：`dsh-subagent-fork-in-process` 内无作业注册；`dsh-client-ui-subagent/lib/client.js` 引用 `jobs` 次数为 0；作业状态枚举为 `failed | running | stopping | completed | killed`（`dsh-api-job-controller/lib/typert.host.js:19`），承载的是 bash 类后台任务。

### 未覆盖

- **一次性 Profile 的安装/启动/卸载**：本轮没有重跑 `dsh plugin add` / `--dump-config` / `dsh web` / `plugin remove` 六阶段，本机 `dsh` CLI 不在 PATH 上。
- **真实浏览器运行时**：通知权限、Web Audio 解锁、React 实际渲染均未逐项验证；`vitest.config.ts` 的 `test.environment` 是 `node`。
- **提示音是否可听**：未核对。
- **0.1.2 / 0.1.3 的运行行为**：包已构建并打包，但**尚未重装进 `~/.dsh/profiles/desktop`**；新标题「DSH 子代理已结束」与自定义提示音都只在单元测试层面成立。
- **自定义音频的浏览器侧行为**：选文件、试听、存储配额报错只在 `node` 环境下以纯函数覆盖，没有真实浏览器操作记录。

### 当前 profile 状态（已发现）

- `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 指向 `file:F:/桌面/DSH/dsh-task-notifications/local-dsh-task-notifications-0.1.1.tgz`，`dsh.profile.bundles` 末项为 `@local/dsh-task-notifications`。
- 客户端 `localStorage` 键 `dsh.codexTaskNotifications.v1` 有实际值（`completion` 曾被改为 `always`），说明设置页确实渲染过、写入成功。
- 以上只证明「加载与写入」，不证明「通知内容正确」。

### 升级注意

- `local-dsh-task-notifications-0.1.0.tgz` 与 `0.1.1` 的包**不要删**：profile 的 `dependencies` 与 lockfile 按 integrity 复用，删掉会让重装失败。
- 装 0.1.2 前确认版本号已 bump（本次 0.1.1 → 0.1.2），否则同版本重装会装回旧包。

## 3. 0.1.4 — 移除子代理提醒（2026-11-02，未运行验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 11 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 525,241 B（gzip 152.42 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.4.tgz`，788,816 B，48 个文件，shasum `9ec7f4ea9568e47071ee4a70e58d91c97d5b6393` |

- 产物取证：`lib/client.js` 与 tgz 内的 `package/lib/client.js` 都不含「启用子代理通知」和 `subagentEndedTitle`，仍含「DSH 任务已完成」。
- 结构变化：`toSnapshotView(list, status)` 在建视图时跳过 `origin === 'subagent'`；`CompletionEvent` 只剩 `turn` / `review`；`jobs` 注入、`watchRows`、`activeSessions`、`jobWatchers` 全部删除；lockfile 中 job-controller 条目已移除（离线环境无法跑 `pnpm install --lockfile-only`，为手工删除三个块）。
- 未覆盖：**0.1.4 未重装**；「设置页没有子代理行」「子代理结束完全静默」「普通任务提醒照旧」三项都没有桌面实测证据，上表只是构建与单测。
- profile 仍指向 `0.1.1` 的 tgz（已发现），重装前必须先完全退出 DSH。

## 4. 0.1.5 — 卡片可点击跳转（2026-11-02，未运行验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 12 passed（新增「卡片只提供一个动作并可触发」1 例，用 DOM 桩） |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 526,407 B（gzip 156.50 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.5.tgz`，790,931 B，48 个文件，shasum `ca36c0206295e176a6a0764d1c1b11b0358b5ccf` |

- 产物取证：tgz 内 `package/lib/client.js` 含 `openSession` 3 处、「打开对话」1 处；不含「启用子代理通知」；`package.json` version=0.1.5，`inject` 仍为 6 个包。
- 结构变化：`notify.ts` 的 `showPageToast(title, body, action, onActivate)` 增加按钮与 `activate`，卡片 8 秒后消失；`showNotification(title, body, sound, action, activate)` 把动作同时接到系统通知的 `onclick` 和页面卡片；`index.ts` 新增结构化 `UiWorkspaceLike` 与 `openSession(ctx, sessionId)`，该服务不写入 `inject`。
- 未覆盖：**0.1.5 未重装**；真实页面点击跳转、系统通知点击跳转、目标会话在别的工作区时的切换都没有实测；DOM 桩只能证明「点击会调用回调」，不能证明宿主真的切了视图。
- profile 仍指向 `0.1.1` 的 tgz。

## 5. 0.1.6 — 修复点击跳转（2026-11-02，未运行验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 12 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 526,808 B（gzip 156.63 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.6.tgz`，791,935 B，48 个文件，shasum `df18fc294302076d5378f460119fb52be0742b49` |

- 修的是什么：0.1.5 直接读 `ctx.uiWorkspace`；宿主服务没有声明进 `inject` 时该值恒为 `undefined`，点击回调静默空转。0.1.6 改为 `ctx.inject(['uiWorkspace'], …)` 晚绑定，服务就绪后写入 `navigate`，触发时还保留直接取值兜底。
- 产物取证：tgz 内 `package/lib/client.js` 的 sha1 `0d9186a4763c61238be6d7f9e1ecf39a4a44d45b` 与本地一致；含 `uiWorkspace` 3 处、`ctx.inject` 1 处、「打开对话」1 处；不含「启用子代理通知」；`package.json` 的 version=0.1.6，`inject` 仍是 6 个包——`uiWorkspace` 不在其中，靠晚绑定取得。
- 真实运行反馈（0.1.5）：2026-11-02 03:5x，用户点击 Windows 系统通知后没有切换对话，目标会话在「未分组」工作区。这一点是本轮唯一的桌面证据，且结论为负面。
- 未覆盖：0.1.6 未重装；「同一工作区点击跳转」「别的工作区点击跳转」都没有实测；Electron 是否真的把系统通知的点击事件送达到渲染进程也仍未证实——若重装后仍不跳，下一步先验证这一条。
- profile 当前指向 `0.1.5` 的 tgz（0.1.6 尚未安装）。

## 6. 0.1.7 — 音频识别兜底与跳转失败提示（2026-11-02，未运行验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 14 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 528,999 B（gzip 157.35 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.7.tgz`，795,805 B，48 个文件，shasum `45b77269cf8867ff5bc0316f8e18b6e51e4fa999` |

- 修的三条都来自静态自检：① `checkSoundFile` 只认 `File.type`，Windows 上无 MIME 的 wav 会被误判为不支持；② 移除自定义音频后 `sound` 仍停在 `custom`；③ `activate()` 用空 `catch` 吞掉跳转失败。
- 仍未解决：点击跳转的两种失败可能（跨工作区是否可切、系统通知点击是否送达渲染进程）需要重装后实测，本轮没有新增桌面证据。
- 未覆盖：0.1.7 未重装；跳转成功路径、跨工作区路径、提示音实际播放均未实测。

## 7. 0.1.8 — 最终结果正文与点击跳转加固（2026-11-02，未安装验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 18 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 533,127 B（构建器报告 gzip 158.99 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.8.tgz`，805,836 B，52 个文件，sha1 `0e68b98f60d31762a0a378af20d88bb26973cc54` |

- 包 SHA-256：`dfe0ad51bd9dfe945a71e27a1bd4c3da07d6316873e14a6c25f2485aa3f0e759`。
- 最终结果：`finalResult.ts` 使用 Session Controller 的 `sessions.using` 临时持有目标会话，等待 `reference.ready` 后读取 `eventSource`；只取最近 `turn/end` 对应轮次中最后一条带文本块的 `assistant/message`。读取上限 2.5 秒，并要求结束事件发生在提醒触发前 60 秒内；失败、过期或无文本时返回兜底文案，不会退回上一轮回答。
- 通知布局：完成通知标题为会话 `displayTitle`，正文为最多 700 个 Unicode 字符的最终结果；页面回退卡片和 Windows 通知都没有输入框、Reply 或动作按钮，整块点击触发跳转。
- 点击加固：原生 `Notification` 创建后加入 `liveNotifications` 强引用集合，在关闭、出错或点击时释放；点击有一次性守卫。`uiWorkspace.openSession(sessionId)` 的异常不再被晚绑定包装层吞掉。
- 产物取证：`lib/client.js` 含 `source: "taskNotifications"`、`liveNotifications.add(notification)`、`native:shown`、`workspace.openSession(sessionId)` 和中文兜底文案；不含 `actionOpenConversation`、`Reply to` 或「启用子代理通知」。tgz 内 `package.json` 的版本为 `0.1.8`。
- 测试覆盖新增 4 项：页面卡片无动作按钮且仅激活一次；原生通知正文与单次点击；最新完成轮次的最终文本；旧轮次隔离、Markdown 清理及 Unicode 截断。
- **未覆盖：0.1.8 没有安装进 Desktop，也没有真实触发 Windows 通知。** 因此「真实通知能完整显示多少正文」「点击是否切到同工作区/跨工作区会话」「Windows 是否稳定派发通知点击事件」仍需安装后桌面实测，不能由 18 个 Node 测试替代。

## 8. 0.1.9 — 点击跳转根因与 inject-free 导航（2026-11-02，未安装验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 24 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 533,690 B（构建器报告 533.69 kB，gzip 159.17 kB） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.9.tgz`，807,653 B，56 个文件，sha1 `43d880504dcb36adc9c04ea2489b51306dd5df04` |

- 包 SHA-256：`2017cce2eff65021f727becd405e5e15c3d9bc4887e76cb31b931afbb2e0cae9`。
- 产物取证：包内 `package.json` 的 `version` 为 `0.1.9`，`dsh.client.inject` 仍为 6 个包（`uiWorkspace` 不在其中，走 `ctx.get`）；`package/lib/client.js` 与本地 `lib/client.js` 同为 533,686 B，含 `get("uiWorkspace")` 1 处、`navigate:service-found` 1 处、`navigate:open-called` 1 处、`navigate:service-missing` 2 处；不含 `ctx.uiWorkspace`、`direct?.openSession`、`let navigate`、`打开对话`、`启用子代理通知` 的直读残留。

### 8.1 桌面证据（0.1.8 已安装）

- `C:\Users\Lenovo\AppData\Roaming\@deepseek-ai\dsh-desktop\Local Storage\leveldb` 中 `dsh.codexTaskNotifications.diag.v1` 记录到 `native:shown` ×2、`native:clicked` ×2。
- 结论：Windows 通知可显示，点击事件能回到渲染进程，`Notification.onclick` 确实执行；故障在 `native:clicked` 之后的导航阶段。

### 8.2 根因

- `src/client/index.ts`（0.1.8）第 44 行 `const direct = (ctx as Context & { uiWorkspace?: UiWorkspaceLike }).uiWorkspace` 位于 `try` 之外。
- Cordis 的 context 是 Proxy：读取未在 `inject` 声明的服务属性会在 `node_modules/@deepseek-ai/cordis/lib/index.js:676` 抛出 `cannot get property "<name>" without inject`。
- 异常跳出 `activate()`，既到不了 `navigate` 分支，也到不了 `showMessage(t('jumpFailed'))` → 点击后「很安静」。
- 对照：`cordis/lib/index.js:763` 的 `get(name, strict)` 注释为「Read a service from the store without the inject requirement」；`cordis/lib/types/reflect.d.ts:12` 在 `Context` 上声明 `get(name: string, strict?: boolean): any`；宿主 `app.asar` 中 ui-conversation 也使用 `ctx.get("uiWorkspace")`。

### 8.3 修改

- 新增 `src/client/navigation.ts`：`openConversation(locator, sessionId, onFailure)` 用 `locator.get('uiWorkspace')` 取服务，按「找到 / 调用成功 / 服务缺失 / 抛错」四条路径写 diag 并返回布尔值。
- `src/client/index.ts`：删除 `UiWorkspaceLike`、`let navigate`、`ctx.inject(['uiWorkspace'], …)` 与 `ctx.uiWorkspace` 直读；`activate` 收敛为一次 `openConversation`。
- `src/client/notify.ts`：`window.focus()`、`notification.close()` 各自 try/catch；`DIAG_LIMIT` 24 → 32。

### 8.4 测试

- 新增 6 组：服务存在时调用一次并记录链路；服务缺失不抛错并提示；`openSession` 抛错被记录且不影响后续；`window.focus` 抛错仍导航；连点两次只导航一次；源码与产物中不再出现属性直读与晚绑定变量。
- 既有 18 条全部保留通过。

### 8.5 未覆盖

- **0.1.9 尚未安装进 Desktop**，没有真实点击实测；「同工作区跳转」「跨工作区跳转」「最小化时窗口是否回前台」三个场景均未验证。
- `ctx.get('uiWorkspace')` 在运行时是否返回服务未验证；若诊断出现 `navigate:service-missing`，退路是 `ctx.get('uiWorkspace', false)` 或改回 inject。
- 跨工作区：宿主 `ui-schedule` 先用 `sessionLinkState(...) === 'available'` 过滤再 `openSession`，暗示目标不在当前工作区时可能不可用；本轮未验证。
- 窗口回前台属操作系统行为，网页插件没有主进程窗口激活接口；该项与「内部是否已切换」必须分开记录。

## 8. 0.1.10 — 公开分发前的元数据与音源替换（2026-11-08，未安装验证）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出码 0 |
| 单测 | `node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts` | 24 passed |
| 构建 | `node node_modules/tsdown/dist/run.mjs` | `lib/index.js` 355 B、`lib/client.js` 116,394 B（gzip 70.27 kB，比 0.1.9 少 417 kB，因为不再内联第三方 WAV） |
| 打包 | `npm pack` | `local-dsh-task-notifications-0.1.10.tgz`，362,529 B，56 个文件 |

- 包 SHA-256：`d3fd10204185cdf77c990376a4d7b530de6c7a49ca922f5c521b3ca37179dd6d`；SHA-1：`063c57c45d28b849781e3497979afe7a6a315b25`。
- 音源替换：`scripts/generate-tones.mjs` 合成 `default-notify.wav`（34,442 B，sha256 `68ed872f7323e30e8de38d7e5ba3efbe4c975a6c7a81419a1c12e95e885f4e8d`）与 `classic-notify.wav`（28,268 B，sha256 `d522805dedbcb7e29f035379523bf8797c942f27a685e444568b8284844f55a0`）；原 `codex-notification.wav` / `codex-classic.wav` 已删除，`src/client/sounds.ts` 由 501,109 字符降到 83,823 字符。
- 产物取证：tgz 内 `package.json` 版本 0.1.10、`repository` 指向 `Jimmy-Official/dsh-task-notifications`、peer 为 `^0.2.0-rc.2 || ^0.2.1-rc.1`；`package/lib/client.js` 内 `uiWorkspace` 1 处、`UklGR` 2 处（两段合成音）、不含 `codex-notification`/`codex-classic`。
- **未覆盖**：0.1.10 未安装进 Desktop；没有任何真实桌面点击证据；「点击跳转」自 0.1.5、0.1.8 两次负面实测后仍未复测。
