# 来源与版本

> **本技能是思灵自创，不是 DSH 官方 skill 的适配。**
> 本库其余 8 个技能都脱胎于 `deepseek-harness/.agents/skills/`，它们的 `SOURCE.md` 记录上游 commit 锚点、与上游的差异清单、以及上游变动时的跟进命令。
> **本技能没有上游**——因此**不跟随 DSH 迭代**：DSH 升级不会使它过期，改动它也不需要回溯任何官方来源。

| 项 | 值 |
|---|---|
| 来源 | **思灵自创**（本工作区排查产出） |
| 上游 | **无** |
| 并入日期 | 2026-09-18 |
| 迭代方式 | **不跟随 DSH 迭代**；跟随「DSH 会话日志格式」与配套工具 |
| 适用面 | 通用 —— 任何用 DSH/SSiD 的人都会遇到长会话退化 |
| 配套工具 | `seek-soul-in-darkness/shell/scripts/session-degeneration-scan.mjs` |
| 判据来源 | `seek-soul-in-darkness/docs/排查/2026-09-18-长会话输出退化.md` |

## 它从哪来

2026-09-18 的一条排查线上长出来的。SSiD 长会话里助手回复出现成段重复（推理内容反复输出同一批碎片），而请求是成功的——没有失败、没有重试，所以不是连接故障。

排查发现两侧对不上：自动压缩的触发线是 `thresholdRatio 0.8` × 窗口，本机 deepseek 路由的窗口是 1,000,000，**于是 80 万 token 才压缩**；而实测退化从 **67 万**就开始了。中间约 13 万 token 是「退化无人区」——系统认为还不到时候，模型已经在打转。扫描该机 15 个大会话，其中 9 个的峰值压力全部落在 78.9%~79.7%：九条独立的增长曲线止步于同一条线。

这个技能把那次排查的方法固化下来：**别靠感觉判断退化，跑工具看数字**。

## 判据的来源

技能正文里的每一条判据都对应实测或源码，不是凭印象：

| 判据 | 出处 |
|---|---|
| 上下文压力 = `inputTokens + cacheReadTokens + cacheWriteTokens` | `packages/llm/token-meter/src/usage-projection.ts:78-79`（pressureFrom） |
| 界面上限同源（「已使用 N%」） | `packages/client/ui-conversation/src/client/context-occupancy.ts:18-23` |
| 窗口 1,000,000 | `packages/llm/llm-deepseek/src/adapter.ts:147` |
| 压缩阈值默认 0.8 / 保留 0.16 | `packages/compaction/compaction-basic/src/config.ts:20,23` |
| 会话日志是拼接的 zstd 帧 | `packages/session/session-persistence-jsonl/src/zstd.ts`（`scanZstdFrames`） |
| 推理文本在 `stream[].texts` | `assistant/message` 的 `data.stream`，`type` 为 `reasoning-chunks` / `text-chunks` |

## 维护触发条件

本技能**不需要**跟随 DSH 版本迭代，但下列任一情况发生时必须更新：

- **会话日志格式变化**：`assistant/message` 的 usage 字段、推理文本的 `texts` 结构、或日志的压缩容器改变 → 同步更新技能正文与配套工具
- **压缩默认值变化**：`thresholdRatio` / `DEFAULT_CONTEXT_WINDOW` 的默认值调整 → 技能正文里引用了 0.8 与 1,000,000
- **配套工具改名或移动**：技能正文按路径引用 `session-degeneration-scan.mjs`
- **新的退化判据出现**：若将来有比「行级重复率」更可靠的信号，替换「判据为什么这么算」一节

## 与上游适配类技能的边界

| | 上游适配类（本库 8 个） | 本技能 |
|---|---|---|
| 来源 | `deepseek-harness/.agents/skills/` | 思灵自创 |
| `SOURCE.md` 记什么 | 上游路径、commit 锚点、差异清单、跟进命令 | 判据出处、维护触发条件 |
| DSH 升级时该怎么办 | **必须**重新抓取上游、逐条重判差异 | **不跟随**；只在日志格式或默认值变化时更新 |
