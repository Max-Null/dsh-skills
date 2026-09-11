# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `dsh-prose-standard` |
| 上游路径 | `DSHFork/.agents/skills/dsh-prose-standard/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 81 行 + `references/examples.md` 142 行 = **223 行** |
| 适配日期 | 2026-09-10 |
| 适配类型 | 小改（位置清单本地化 + 门禁换名 + 并入 9 条制度无关判据） |
| 依赖 | `ssid-trim-cot-leakage`——**双向依赖，同批安装** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-03-行文标准.md` |

## 与上游的差异

**保留**（判据一字未减）：

- `Preserve the complete proposition` 整节：5 条命题子项（actor/action、条件时序顺序、情态、否定性保证与例外、归属副作用失败后果）与三条附属规则，逐条保留。
- `Borderline decisions` 的三条判断，仅把交互渠道由「PR 行内评论」改为「会话内回复」。
- 上游的事实核对与语气判据经 `dsh-doc` 移交后全部保留（见「新增」）。

**改写**：

- 引言：依赖声明指向 `docs/SSiD开发手册.md`；`contract`/`boundary`/`shape`/`surface`/`seam`/`gate`/`vocabulary` 的检查表补了一张**中英对照**（契约 / 边界 / 表面 / 接缝 / 门禁 / 词汇表）。
- `Inputs and exclusions`：`vendor/` 的本地路径；把「排除归档笔记」换成**同步链的冻结副本**（`references/`、与三处 vendor 全等的 `plugins/` 副本、`_archived-*`）；派生物换成 `lib/` 与 `shell/profile-template/`；双语对降权。
- `Required coverage by prose location`：**12 类 → 10 类**。Cookbooks 的判据并入 README，Diagnostics 的判据并入内部注释；#8「skill 与 agent 指令」提权重（本仓库有 14 个 skill，且本包每份都属这一类）。
- `Workflow`：7 步骨架保留，门禁换成 `npm run typecheck` / 各插件 `pnpm typecheck` / L1 测试 / `verify-zh-ui.cjs` / `git diff --check`。

**新增**：

- **五个合法主场**：`docs/release-notes-*.md`、`docs/决策/`、`docs/设计/`、`docs/排查/`、`shell/docs/pitfalls.md`。依据：本仓库的变更叙事在这些路径是内容本体（实测扫描 202 处命中，分布集中于此）。上游只有 Agent Notes 一个主场，本仓库有五个。
- **从 `dsh-doc` 并入的 9 条制度无关判据**（该 skill 被判不单独适配，其制度部分在本仓库不存在）：
  - 「事实核对：跑，不要假设」4 条（对每条声称的操作真跑一遍 / 删掉无法复现的东西 / 对着最新代码检查旧文档 / 读事实不读文件夹名）
  - 「语气规则」5 条（开篇说能做什么 / 开发者小节解释不枚举 / 草稿只有一个家 / 只讲当前状态 / 受控的技术语言）
- **一个解释只有一个 home** 与**激进外链**在本仓库的落点。

**删除**：无。上游判据一条未删。

## 尚未落地的部分

`references/examples.md`（上游 142 行 / 17 节）**尚未重写**。上游的 17 节全是英文案例，需要替换为本仓库的中文案例，并保留跨语言成立的「不要只为字数修剪」「限制是契约不是债务清单」「生成的摘要必须独立成立」三节。

**当前 SKILL.md 不引用该文件**，因此缺口不影响可用性；补齐后再在正文里链接。

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/dsh-prose-standard/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。
3. 更新本文件的版本锚点与适配日期。
