# plan.md — 让 dsh-task-notifications 可被 awesome-dsh-plugin 收录

- 版本：v0.1（2026-11-08）
- 范围（用户 m01500 拍板）：**只修收录必过项（方案 C）**，不改功能代码；转公开；GitHub Release 附预构建 tgz；直接推 main；由我 fork 并开收录 PR。
- 工作副本：`F:\桌面\DSH\dsh-task-notifications`（git 分支 main，HEAD `ab8daef`，47 项未提交）

## 1. 背景

插件是本地魔改分支（派生自 `ltao0829/dsh-task-notify`），已迭代到 0.1.9：任务完成/权限/提问提醒、提示音（含自定义）、点击跳转、诊断痕迹。目标是把仓库推到 `Jimmy-Official/dsh-task-notifications` 并提交到 `awesome-dsh-plugin` 的 `data/plugins/`。

## 2. 已知事实（证据分级）

| 事实 | 等级 | 依据 |
| --- | --- | --- |
| 仓库 `Jimmy-Official/dsh-task-notifications` 已创建，**private**，`size=0 KB`，`pushed_at` 等于 `created_at` | 测过 | GitHub API `/repos/...` 返回 `private:true, size:0, pushed_at 2026-11-01T12:03:47Z` |
| 仓库创建于 2026-11-01T12:03:45Z，距今约 6.5 天 | 测过 | 同上（CI 要求 ≥1 天） |
| 本地 `ab8daef` 提交从未推送成功过 | 测过 | `pushed_at == created_at`、`size=0` |
| `package.json` 已声明 `dsh.bundle.patch`，`cordis.patch.yml` 存在且能插入 `id: task-notify` | 查过 | 读文件确认 |
| `peerDependencies` 用 `^0.2.0-rc.2`；按 node-semver 预发布规则，**匹配不到 `0.2.1-rc.5`**（无 `0.2.1` 元组上的预发布比较符） | 查过 | contributing.md 明确记载该陷阱；本机无 `semver` 模块，未跑实际校验 |
| 当前运行的 DSH 为 0.2.1-rc.x 系列 | 查过 | 本会话 runtime context 与历史进程核对 |
| `.gitignore` 忽略 `*.tgz`、`node_modules/`、`install-backup/`、`coverage/`；`lib/` 已被跟踪 | 测过 | 读文件 + `git status` |
| LICENSE 为 BSD-3-Clause，版权行写的是 `dsh-task-notify contributors`（上游名） | 查过 | 读文件 |
| `repository` 字段指向上游 `ltao0829/dsh-task-notify` | 查过 | 读 package.json |
| 现有 10 个历史 tgz 在工作区，全部被 gitignore | 测过 | 目录列表 + .gitignore |
| 仓库无 topic、无 release、无 tag | 测过 | GitHub API |

### 未验证假设

- 「点击通知跳转」在 0.1.9 上是否真的能用：0.1.5 与 0.1.8 两次桌面实测均失败，0.1.9 改了取服务的方式（`ctx.get`），但用户尚未安装实测。
- `dsh plugin add <git-url>` 从该仓库安装是否能在用户机器上走通（本机没有 dsh CLI，未试）。
- awesome 列表 CI 对 `name` 字段（`@local/...`）是否有隐藏校验。

## 3. 验收标准

1. `https://github.com/Jimmy-Official/dsh-task-notifications` 能被匿名访问：`package.json` 与 `cordis.patch.yml` 可 raw 拉取。
2. 仓库带 `dsh-plugin` topic；有一个 `v0.1.10` release，附带预构建 `.tgz`。
3. `package.json` 的 peer 范围能覆盖 `0.2.0-rc.2` 与 `0.2.1-rc.1` 起的预发布；`repository`/`homepage`/`bugs` 指向本仓库。
4. 类型检查 0、单测全绿、重新打包产物与源码一致。
5. awesome-dsh-plugin 上有一个 PR：只新增 `data/plugins/Jimmy-Official__dsh-task-notifications.yml`，`category: notify`，描述中每句话都能在代码里找到依据。

## 4. 架构

不改代码结构，只改元数据与发布流程：

```
package.json  →  peerDependencies / engines.dsh / repository / homepage / bugs / version
LICENSE       →  补一行本仓库版权，保留上游 BSD-3-Clause 正文
.github/      →  可选：release 附件由本地命令上传，不引入 CI
data/plugins/Jimmy-Official__dsh-task-notifications.yml  →  在新 fork 里新增
```

## 5. 接口契约

- 收录条目字段：`url`（必须与仓库完全一致）、`name`（`owner/repo`）、`category: notify`、`description.en`（必填、单句、句号结尾、无营销词）、`description.zh`（可选）、`tarball`（可选，指向 release 资产）。
- `tarball` 取值：`https://github.com/Jimmy-Official/dsh-task-notifications/releases/latest/download/dsh-task-notifications.tgz`（资产名不含版本号，避免 `latest/download` 下次发版 404）。

## 6. 文件清单

| 文件 | 动作 |
| --- | --- |
| `package.json` | 改 version → 0.1.10、peer/engines 预发布分支、repository/homepage/bugs |
| `LICENSE` | 追加本仓库版权行（保留原正文与上游署名） |
| `CHANGELOG.md` | 追加 `[0.1.10]`（Changed：peer 范围、仓库元数据；不写功能变更） |
| `README.md` / `README.zh-CN.md` | 安装命令改为 git 地址与 release tarball 两种；补「上游来源」小节 |
| `docs/verification-evidence.md` | 追加第 9 节：本轮的元数据变更与未验证项 |
| `.github` 内容 | 只读检查，不新建 CI |

## 7. 分阶段实施

1. **元数据修正**：改 package.json / LICENSE / README×2 / CHANGELOG / evidence。
2. **本地验收**：`tsc -b`、`vitest run`、`tsdown`、`npm pack`，记录数字。
3. **仓库转公开**：`PATCH /repos/... {private:false}`，加 topic `dsh-plugin`。
4. **推送**：全部改动一次性 commit，`git push -u origin main`（仓库 0 KB，首推即建立 main）。
5. **发版**：`git tag v0.1.10 && git push --tags`；`gh` 未安装，用 API 创建 release 并上传 tgz 资产（资产名 `dsh-task-notifications.tgz`）。
6. **收录 PR**：fork `awesome-dsh-plugin` → 分支 `add-jimmy-dsh-task-notifications` → 新增 YAML → 开 PR，等待 CI。

## 8. 风险与回滚

| 风险 | 处理 |
| --- | --- |
| 转公开后源码可见（含历史 tgz？不会，tgz 被 ignore） | 提交前 `git status` 复核，确认没有 `.env`、token、`install-backup/` |
| peer 范围改错导致安装 ERESOLVE | 改完用 `npm pack` 的产物 + 本地 profile 现有安装做一次回归；不覆盖用户已装的 0.1.9 |
| 首推就把 47 项未提交改动带上 main | 用户已选「直接推 main」；推送前先 `git add -A` 后 `git status` 复核清单 |
| release 资产名带版本导致链接腐烂 | 资产名固定为 `dsh-task-notifications.tgz` |
| 收录 PR 被 `held: author` | 按评论改同一分支，只留一条说明评论 |
| PR 描述夸大导致被打回 | 描述只写已验证行为；「点击跳转」未经桌面实测就不写进描述 |
