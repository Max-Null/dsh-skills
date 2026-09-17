---
name: dsh-session-forensics
description: 用 DSH 会话日志回答「模型是不是在打转」「上下文用了多少」「压缩什么时候触发」。当用户说「回复重复」「输出退化」「是不是崩了」「上下文用了多少」「长会话是不是出问题了」「怎么越说越笨」，或需要解剖某个会话（事件普查、token 压力轨迹、压缩点定位、跨会话找退化样本）时使用。工具：seek-soul-in-darkness/shell/scripts/session-degeneration-scan.mjs。
---

# DSH 会话取证

会话日志是**唯一**能回答「模型当时到底看到了多少上下文、输出了什么」的证据源：DSH 遵循
「model-visible ⟺ logged」，每次请求的 provider usage 和完整流式输出都落在
`session.v3.jsonl.zstd` 里。**不要靠感觉判断退化，跑工具。**

## 什么时候用它

- 用户说回复重复、输出退化、思考打转、「你好像出故障了」「是不是 api 崩了」
- 想知道某会话上下文用到了多少、离压缩线还有多远
- 怀疑长会话变笨、需要判断该不该压缩或开新会话
- 要跨会话确认某个现象是偶发还是普遍

## 怎么用

```sh
# 单会话报告：事件普查 + 压力轨迹 + 重复率 + 压缩事件
node seek-soul-in-darkness/shell/scripts/session-degeneration-scan.mjs <session.v3.jsonl.zstd>

# 跨会话扫描（默认只看 ≥1MB 的）
node .../session-degeneration-scan.mjs --root ~/.dsh/sessions-ssid --min-size 3MB

# 机器可读
node .../session-degeneration-scan.mjs <file> --json
```

会话根：SSiD = `~/.dsh/sessions-ssid`，web = `~/.dsh/sessions`。**找当前会话**：挑
最近几分钟内被写过的那个（`Get-ChildItem -Recurse -Filter session.v3.jsonl.zstd | Sort LastWriteTime -Descending`）。

退出码：0 = 未越线，1 = 有会话越线，2 = 用法或读取失败。可以据此写自动化。

## 怎么读结果

**看三个数，一起看**：

1. **峰值压力 vs 自动压缩阈值**（报告里直接给出）。阈值 = `0.8 × 窗口`，窗口写在
   `request/context` 事件里。**峰值紧贴阈值**说明这个会话被用到了极限才压——实测九个会话
   都停在 79%，因为 80 万才是线。
2. **重复率的爬升**。判据 = 单条 reasoning 输出按换行与中英句读切分后，出现 ≥3 次的单元占比。
   报告给出峰值、越线次数、**最早越线时的 token 数**——最后这个数就是这次会话的退化起点。
3. **压缩事件的位置**（`compaction/start` 的 seq）。拿它和最早越线点的 token 数对比，
   差值就是「系统还没打算压、模型已经在打转」的区间。

## 判据为什么这么算

- **上下文压力** = `inputTokens + cacheReadTokens + cacheWriteTokens`，取自
  `assistant/message` 的 `data.usage`，是 **provider 上报的真实计数**，不是本地估算。
  所以它和界面上的「已使用 N%」同源（`token-meter` 的投影）。
- **窗口**取自 `request/context`；本机 deepseek 路由默认 **1,000,000**
  （`llm-deepseek/src/adapter.ts:147`），于是默认阈值落在 **80 万 token**。
- **重复率是启发式**：切分规则微调会带来几个百分点的差异，**只能横向比较同一判据下的会话**，
  不要跨判据引用绝对数字。

## 局限（别把「扫不出来」当「没问题」）

- **旧格式日志没有推理文本**：报 `n/a [no-reasoning]` 的会话**不参与判断**。它们的压力照样
  可能跑到 79%，只是无从检测退化。报告结尾会统计这类会话的数量，**那不是「健康」，是「未知」**。
- 日志有多帧 zstd 拼接（每次追加一批事件写一帧），**必须逐帧解压**——工具已处理，
  但如果你手写解析，按普通压缩流解会在第二帧报 `Unknown frame descriptor`。
- 推理文本在 `data.stream[]` 里 `type` 为 `reasoning-chunks` / `text-chunks` 的条目下，
  字段名是 **`texts`**（不是 `chunks`）。

## 背景

根因、实测曲线与「压缩阈值锚在窗口比例上」的分析：
`seek-soul-in-darkness/docs/排查/2026-09-18-长会话输出退化.md`。
处置：两个 profile 的 `cordis.patch.yml` 都把 `thresholdRatio` 调到了 0.5（50 万）。
