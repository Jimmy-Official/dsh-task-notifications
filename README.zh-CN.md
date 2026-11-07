# DSH 任务通知

适配 DeepSeek Harness Desktop 0.2.x。在 **设置 → 任务通知** 新增独立页面，界面按 Codex 通知设置设计。本仓库派生自 [ltao0829/dsh-task-notify](https://github.com/ltao0829/dsh-task-notify)，当前版本 `0.1.10`。

| 设置 | 默认值 | 行为 |
| --- | --- | --- |
| 轮次完成通知 | 仅在未聚焦时 | 可选始终、仅未聚焦时、关闭 |
| 启用权限通知 | 开 | 等待审批或计划确认时提醒 |
| 启用问题通知 | 开 | 等待用户回答问题时提醒 |
| 通知提示音 | 默认 | 默认 `default-notify.wav`、经典 `classic-notify.wav`、自定义（导入本机音频，上限 1 MB）、无 |

插件优先发送 Windows 系统通知；未获得系统通知权限时，在 DSH 页面右下角显示提示。轮次完成通知以「对话名称」为标题、以本轮最后一条 assistant 文本为正文（清理常见 Markdown，最多 700 个 Unicode 字符）；本轮没有文本时显示「任务已完成，点击查看对话」。通知不带输入框、Reply 或动作按钮，点击整块通知会唤醒 DSH 并打开产生它的对话。首次连接只记录现状，不补发旧任务提醒。设置保存在 DSH 客户端的 `localStorage`（键 `dsh.codexTaskNotifications.v1`）；导入的自定义提示音单独存在键 `dsh.codexTaskNotifications.sound.v1`，只在本机这个客户端里有效，清缓存或换机器后需要重新导入。

**不提醒子代理。** 从 `0.1.4` 起，`origin === 'subagent'` 的会话在进入差分之前就被丢弃：子代理结束、被终止、请求权限、提出问题，都由 DSH 自己的界面呈现，不会产生桌面通知。这条规则写在检测层，不依赖任何开关，因此设置页也没有对应选项。

早期版本曾想用作业通道识别子代理，实测确认这版 DSH 的子代理不产生作业记录，该通道从未生效，已随本版删除；后台 bash 作业也不会因此新增提醒。

## 0.1.10 变更

- **提示音改为本地合成。** 早期版本把两段 WAV 以数据 URI 内联进包，音源取自本机 Codex 安装包，随公开仓库分发等于再分发第三方音频。现在两段提示音由 `scripts/generate-tones.mjs` 合成（A5→D6 双音、D5 单音），音色与原版不同，`lib/client.js` 从 533 kB 降到 116 kB。
- **peer 依赖可匹配预发布。** `^0.2.0-rc.2` 按 node-semver 规则匹配不到 `0.2.1-rc.x`，改为 `^0.2.0-rc.2 || ^0.2.1-rc.1`，`engines.dsh` 同步。
- **仓库元数据指向本仓库。** `repository` / `homepage` / `bugs` 改为 `Jimmy-Official/dsh-task-notifications`。
- 未改功能代码；「点击通知跳转」仍未在真实桌面验证，本版不声称可用。

## 0.1.9 变更

- **修复点击通知不跳转。** 旧实现直接读取 `ctx.uiWorkspace`；该服务没有声明在 `inject` 里时，Cordis 会抛 `cannot get property "uiWorkspace" without inject`，而这次读取又位于 `try` 之外，于是点击后既没有导航、也没有失败提示。现在改用 Cordis 的 `ctx.get('uiWorkspace')`（其文档明示「不需要 inject」）作为唯一路径，删掉晚绑定变量与属性直读。
- **聚焦窗口与内部导航解耦。** `window.focus()` 与 `notification.close()` 各自 try/catch，窗口聚焦失败不再阻断对话切换。
- **补全导航诊断。** 一次点击会依次写入 `native:clicked`、`navigate:service-found`、`navigate:open-called`；服务缺失或抛错时写入 `navigate:service-missing` / `navigate:error:<原因>`。记录写入 `dsh.codexTaskNotifications.diag.v1`，最多保留 32 条。
- 新增 `src/client/navigation.ts` 与 6 组导航测试，测试总数 18 → 24。

## 0.1.8 变更

- 新增 `src/client/finalResult.ts`：通过 DSH Session Controller 的 `sessions.using(...).eventSource` 读取最近已结束轮次，只取该轮最后一条 `assistant/message` 的文本块。
- 完成通知从「固定完成标题 + 对话名称正文」改为「对话名称标题 + 最终结果正文」；无正文时使用明确兜底，不会错误显示上一轮内容。
- 修复原生 `Notification` 没有真正加入存活集合的问题；通知关闭、出错或被点击后再释放，降低点击回调丢失风险。
- 点击通知仍调用 DSH 自带的 `uiWorkspace.openSession(sessionId)`；晚绑定调用不再吞异常，失败会显示既有提示。
- 去掉页面回退卡片的动作按钮，系统通知和回退卡片都只保留整块点击，没有输入框或 Reply。
- 新增 4 个测试，共 18 个测试。

## 0.1.7 变更

- 音频文件不要求自带「我是音频」标签了：Windows 上经常把 `.wav` 交过来时 `type` 是空的，以前会被判成「不支持的类型」，现在按扩展名识别（wav / wave / mp3 / m4a / aac / ogg / oga / opus / flac / webm）。
- 解码后如果 `data:` 前缀不是 `audio/`，改用扩展名推出的类型重新拼接，否则 `new Audio(...)` 解不出来。
- 点「移除」自定义提示音后，提示音设置会自动退回「默认」，不再留一个空的「自定义」行、实际却放默认音。
- 跳转失败不再一声不吭：拿不到宿主导航服务或调用抛错时，右下角弹一句「没能切换到该对话，请手动在左侧列表里选择」。
- 新增 2 个测试：扩展名兜底识别、以及「没有 MIME 的文件被重新包装成 audio/wav」。共 14 个测试。

## 0.1.6 变更

- 修复点击提醒不跳转：`0.1.5` 直接读 `ctx.uiWorkspace`，但这个服务没有写进 `inject`，取到的永远是 `undefined`，点下去静默无事发生。
- 改为 `ctx.inject(['uiWorkspace'], …)` 晚绑定：服务就绪后记下跳转函数；服务缺失时退回直接取值。两条路都失败也只丢掉跳转，提醒与提示音照常。
- 系统通知的点击回调加一次性守卫，避免一次点击触发两次跳转。
- 测试数保持 12：跳转依赖宿主服务，单测只能证明回调被调用，不能证明视图被切换。

## 0.1.5 变更

- 提示卡片可点击跳转：底部按钮文字按提醒类型区分，点按钮或卡片任意位置都会切换到对应的对话。
- 系统通知被点击时同样切换；跳转走 DSH 自带的 Workspace 服务，不新增依赖，服务缺失或调用失败时只丢掉跳转，提醒照常显示。
- 卡片自动消失时间 5 秒 → 8 秒，并支持键盘回车 / 空格。
- 测试数 11 → 12。

## 0.1.4 变更

- 彻底移除子代理提醒：设置页删除「启用子代理通知」整行，控件从 5 个降为 4 个（轮次完成 / 权限 / 问题 / 提示音）。
- 检测层直接跳过 `origin === 'subagent'` 的会话，子代理的结束、终止、权限与提问都不再产生通知；主会话的完成与审批提醒行为不变。
- 删除作业通道的全部残留：`jobs` 注入与订阅、`watchRows` 订阅、`activeSessions` / `jobWatchers`、`job` 事件与相关类型、job-controller 依赖。
- 旧版 `localStorage` 里的 `subagent` 字段读取时被忽略，其他设置原样保留，不重置存储。
- 测试数 12 → 11。

## 0.1.3 变更

- 新增「自定义」提示音：设置页选「通知提示音 → 自定义…」，点「选择文件」导入本机音频（wav / mp3 / ogg / m4a，上限 1 MB），导入时自动试听一次，放不了的文件不会保存。
- 音频内容存进 `localStorage` 的独立键 `dsh.codexTaskNotifications.sound.v1`，不带进插件包，也不会跟着每次设置变更重写。
- 回落规则：选了自定义但没有可用音频时，提醒使用内置默认音。
- 错误提示：文件过大、非音频、空文件、读取失败、存储配额不足、无法播放，各有对应文案。
- 测试数 10 → 12。

## 0.1.2 变更

- 修复标题说谎：子代理会话结束时，只要「轮次完成通知」开着就会弹「DSH 任务已完成」——子代理被中途终止也一样。现在识别 `origin === 'subagent'` 的会话，标题改为「DSH 子代理已结束」（新增 locale 键 `subagentEndedTitle`），不再谎报完成。
- 「启用子代理通知」开关终于生效：以前它只拦 `job` 事件，而子代理不产生 `job`；现在它拦子代理会话的轮次提醒，关掉就不再弹。
- 已知局限：仍无法区分完成、失败与被终止，原因见上一节。
- 测试数 8 → 10（子代理会话路由、普通轮次不受影响）。

## 0.1.1 变更

- 修复：`failed` / `killed` 状态的子代理以前被 `shouldNotify` 直接丢弃，页面上不会有任何提示；现在与 `completed` 一样触发提醒。
- 通知标题与正文按结束状态区分（新增 locale 键 `subagentFailedTitle`）。
- 删除 `detect.ts` 中从未被产生的 `failure` 事件变体，避免误以为已存在「会话失败」提醒。
- 新增两个测试：失败/终止状态的判定，以及 `running` → `failed` 的整条 diff 转事件链路。测试数 7 → 8。

## 本地构建与验证

```powershell
cd 'F:\\桌面\\DSH\\dsh-task-notifications'
pnpm install --ignore-scripts
pnpm run typecheck
pnpm run build
pnpm test
pnpm pack
```

本机 `pnpm` 不在 PATH 上时，可直接调用仓库内的二进制：`node node_modules/typescript/bin/tsc -b --pretty false`、`node node_modules/tsdown/dist/run.mjs`、`node node_modules/vitest/vitest.mjs run tests/codex-notifications.spec.ts`、`npm pack`。

安装有两条路：① 从本仓库安装——插件管理界面选择 `https://github.com/Jimmy-Official/dsh-task-notifications`，或下载 [最新 Release](https://github.com/Jimmy-Official/dsh-task-notifications/releases/latest/download/dsh-codex-notification.tgz) 后在插件管理里选这个 tgz；② 本地开发时直接装 `local-dsh-task-notifications-<version>.tgz`。不要手动改写 `~/.dsh/profiles/desktop`。安装前必须 bump 版本号——lockfile 按 integrity 复用，同版本号重装会装回旧包。

### 本机状态（2026-11-08，`0.1.10`）

已验证：

- `tsc -b --pretty false` 退出码 0。
- `vitest run tests/codex-notifications.spec.ts`：24 个测试全部通过（含两段合成提示音的字节与哈希校验）。
- `tsdown` 构建通过；`lib/client.js` 116,394 B（gzip 70.27 kB），资源内联只剩两段合成提示音。
- `npm pack` 产出 `local-dsh-task-notifications-0.1.10.tgz`，作为 GitHub Release 资产上传时改名为 `dsh-codex-notification.tgz`；精确字节数与 SHA-256 记在 `docs/verification-evidence.md`（该文件不进包，避免包内 README 自述自身校验值）。

未验证（不要当成已完成）：

- `0.1.8` 已安装并做过真实点击实测，结论负面：磁盘诊断里 `native:shown` ×2、`native:clicked` ×2，说明点击回调确实执行了，但界面没有跳转、也没有出现失败提示。根因见「0.1.9 变更」第一条。
- `0.1.9` 尚未安装进 Desktop；「点击后切到对应对话」目前是已编译、已测试、尚未桌面实测。
- `0.1.2` 到 `0.1.7` 中没有任何一版被完整实测过；「子代理完全静默」和「导入自定义提示音」目前只在单元测试层面成立。
- `0.1.5` 做过一次真实桌面实测，结论是负面的：点击 Windows 系统通知后没有切换对话（当时目标会话在别的工作区）。
- `0.1.6` 与 `0.1.7` 都没有重装验证；`0.1.5`、`0.1.8` 两次桌面实测都是负面的（一次目标在别的工作区，一次同工作区也不跳）。
- 自定义音频的选文件、试听、存储配额报错都依赖浏览器环境，没有在真实 DSH 页面里操作过。
- 点击跳转只在模拟页面（DOM 桩）里验证过：真实 DSH 页面里点卡片能不能切视图、目标会话在别的工作区时会不会先切工作区，都没有实测。
- 已实测但结论是负面的：2026-11-01 20:5x 在真实桌面弹窗里观察到的仍是旧的「DSH 任务已完成」，即 `0.1.1` 修复的 `job` 分支对子代理不生效。
- 系统通知是否弹出、提示音是否可听，需要真实桌面环境与浏览器通知授权，本机没有做这一步核对。
- `0.1.0` 的安装记录只能证明「设置页可渲染、设置值可写入 `localStorage`」，不能证明通知已送达。

两段提示音由仓库内 `scripts/generate-tones.mjs` 合成，再以数据 URI 打入 `lib/client.js`；`assets/sounds/` 保存同名 WAV 供测试校验。它们不是第三方音频，可以随仓库一起分发。要换音色就改脚本里的频率与时值，重跑脚本后再构建。

## 来源

事件观察与 DSH 0.2 插件构建方式派生自 [ltao0829/dsh-task-notify](https://github.com/ltao0829/dsh-task-notify)；原项目采用 BSD-3-Clause，原始版权声明与本次派生声明同在 [LICENSE](LICENSE)。后续维护在 [Jimmy-Official/dsh-task-notifications](https://github.com/Jimmy-Official/dsh-task-notifications)：修改了设置入口、通知类别、界面、子代理策略与音源。
