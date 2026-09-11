# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `dsh-ci-test-reliability` |
| 上游路径 | `DSHFork/.agents/skills/dsh-ci-test-reliability/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 131 行 + `references/ci-flake-diagnosis.md` 60 行 = **191 行** |
| 适配日期 | 2026-09-10 |
| 适配类型 | 小改（判据骨架全部保留；引用、示例与命令本地化） |
| 依赖 | `ssid-prose-standard`、`ssid-pre-push-checks`——**同批安装** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-01-测试可靠性.md` |

## 与上游的差异

**保留**（判据骨架，未改一条）：

- 原子分配资源、隔离进程全局状态、尊重平台自有语义、用状态同步、拆除到静默、证明预期回归、拒绝掩盖式修复——对应上游第 3–5、7–10 节。
- 上游第 10 节的七条禁令与两条区分逐字保留。

**改写**：

- 「读取归属规则」：上游的 5 个文档链接 → 本仓库的三条真实指向（4 个 `vitest.config.ts`、node:test 的 `package.json` 脚本、`docs/SSiD开发手册.md` §9）。上游的 `docs/defensive-patterns.md` 与 `snapshots/AGENTS.md` 在本仓库没有对应物，删除而不硬造。
- 「建模执行拓扑」：上游四层（含自托管池）→ 本仓库四层（spec 内 / 并行 worker / 多包同时跑 / 本地 vs GitHub runner）。
- 「超时预算」：上游的抽象说法 → 运行器**实际默认值**（vitest 5000/10000 ms、node:test `Infinity`、Playwright 本仓库自设 60000 ms），并给出 hook : test = 2 : 1 的机制解释。
- 「诊断既有 flake」：上游的 CI 拓扑诊断 → 本仓库的本地复现路径。
- 「验证与报告」：上游命令 → 经核实存在的本仓库命令表。

**新增**：

- **两套运行器的双版示例**（vitest 与 node:test）——上游只对一种运行器讲话。依据：本仓库 10 个插件用 vitest、4 处载体用 node:test。
- **本仓库专有坑**：Playwright 不在 `npm test` 里；包管理器不统一（`dsh-memory` 同时有两个锁文件）；`dsh-ssid-panels` 的测试没有 npm 脚本且必须在仓库根手跑。
- **现存的硬编码问题**（约 28 个探针写死端口、5 个写死 token）——上游第 3 节的判据在本仓库第一批审计对象上直接命中。
- **超时三态度**：Playwright 已做对（三层递减 + `retries: 0`），vitest 是裸默认，node:test 无上限。

**删除**：无。上游判据一条未删。

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/dsh-ci-test-reliability/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。
3. 更新本文件的版本锚点与适配日期。
