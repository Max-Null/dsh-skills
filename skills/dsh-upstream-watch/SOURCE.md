# 来源与版本

> **本技能是思灵自创，不是 DSH 官方 skill 的适配。**
> 本库其余 8 个技能都脱胎于 `deepseek-harness/.agents/skills/`，它们的 `SOURCE.md` 记录上游 commit 锚点、与上游的差异清单、以及上游变动时的跟进命令。
> **本技能没有上游**——因此**不跟随 DSH 迭代**：它观察的对象正是 DSH，但它自身不会因为 DSH 发新版而失效。

| 项 | 值 |
|---|---|
| 来源 | **思灵自创**（本工作区的上游观察流程） |
| 上游 | **无** |
| 建立日期 | 2026-09-17 |
| 并入本库 | 2026-09-18 |
| 迭代方式 | **不跟随 DSH 迭代**；只在本工作区的目录结构或观察站约定变化时更新 |
| 适用面 | **本工作区专用** —— 依赖 `DSHfork/`、`dsh-anatomy/`、`seek-soul-in-darkness/` 三处目录 |
| 配套产物 | `dsh-anatomy/版本对比/<日期>-<版本>-vs-<基线>.md`、`dsh-anatomy/基线.md` |

## 它从哪来

它记录的是**本工作区专用**的流程。工作区里同时存在三份 DSH 库：`deepseek-harness/`（web 与 SSiD 共享的内核来源）、`dsh-web-runtime/`（web 版内核副本）、`DSHfork/`（唯一可以随意 fetch / 切分支的观察站）。这个技能把「观察上游」与「升级内核」两件事分开：观察产出的结论进 `dsh-anatomy/`，是否升级由用户单独决策。

## 适用面为什么是本工作区专用

技能正文直接引用了本工作区的目录与文件：

- `DSHfork/` —— 观察站，所有 `git fetch` / `checkout` 都在这里做
- `dsh-anatomy/` —— 报告的落点与基线文件
- 工作区 `AGENTS.md` 的铁律编号（2.0 / 2.1 的共享 checkout 禁令）
- `seek-soul-in-darkness/docs/SSiD开发手册.md`

**这些路径在其他机器上不存在。** 分发给别的用户时，这个技能会指向空目录——它记录的是**本工作区的做法**，不是通用流程。若要通用化，需要先把观察站与基线库的约定抽出来。

## 维护触发条件

本技能**不需要**跟随 DSH 版本迭代，但下列任一情况发生时必须更新：

- **工作区目录结构变化**：观察站改名、`dsh-anatomy/` 迁移、三库架构调整
- **观察站约定变化**：基线文件的格式、报告命名规则、`build-index.mjs` / `verify-library.mjs` 的用法
- **铁律编号变动**：技能正文引用了 `AGENTS.md` 的 2.0 / 2.1
- **上游发布节奏变化**：tag 与 npm 两套口径的关系（正文第 3 步的前提）若不再成立

## 维护记录

| 日期 | 触发条件 | 改了什么 |
|---|---|---|
| 2026-09-28 | **三库架构调整**（上面第 1 条）：自建壳运行时归档、SSiD 换代到官方壳基座 | ① §5「内核 API 兼容」的检查对象，从 `shell/kernel.ts` 的四个 import 换成「SSiD 直接 import 的 `@deepseek-ai/dsh-*` 包」（扫描命令已写进该行）；② 新增「先确认检查对象是活代码」一节；③ 隐私检查项补「服务提供者 / 适配器 / 采集器」的角色判据 |

**为什么会漏到现在**：`shell/` 归档发生在 2026-09（tag `v0.4.0-selfbuilt`），但 `shell/` 目录里的文件**没有全删**——`kernel.bundle.mjs`、`kernel-child.bundle.mjs`、`boot-bundled.mjs` 都还在，且它们仍然 `import` DSH 的 `app-boot` / `cmdline` / `launch-environment`。照路径核对时，这些残留物看起来完全像活代码。

**怎么发现的**：2026-09-28 那轮观察按 §5 去核对 `healProfilesModuleFallback`，发现该函数已从 `app-boot` 导出面移除、而 `kernel.bundle.mjs:351` 仍在调用它、且调用点在一个会重新抛出异常的大 `try` 里——**据此几乎报出「SSiD 启动会崩」的假警报**。真正的判据是 `shell/package.json` 的 description，它写明运行时已归档到 tag `v0.4.0-selfbuilt` / 分支 `archive/selfbuilt-shell`。

**同一批修正**：`seek-soul-in-darkness/AGENTS.md` 的库结构描述（原写「`shell/`（main.mjs Electron 壳 + kernel.ts 内核启动）」）与「常用命令」段（原列 `npm start` / `npm run bundle-kernel` 等已随归档消失的脚本）一并更正。

## 与上游适配类技能的边界

| | 上游适配类（本库 8 个） | 本技能 |
|---|---|---|
| 来源 | `deepseek-harness/.agents/skills/` | 思灵自创 |
| `SOURCE.md` 记什么 | 上游路径、commit 锚点、差异清单、跟进命令 | 适用面、维护触发条件 |
| DSH 升级时该怎么办 | **必须**重新抓取上游、逐条重判差异 | **不跟随**；它就是干这个的——但自身只在本工作区结构变化时更新 |
| 适用面 | 通用工程判据 | 本工作区专用 |
