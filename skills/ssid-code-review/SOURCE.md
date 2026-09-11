# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `dsh-code-review` |
| 上游路径 | `DSHFork/.agents/skills/dsh-code-review/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 52 行（**无 references**） |
| 适配日期 | 2026-09-10 |
| 适配类型 | 需适配（场景重述 + 来源指向重写 + 删 6 条无对应机制的判据） |
| 依赖 | `ssid-test-reliability`、`ssid-prose-standard`——**同批安装** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-04-代码评审.md` |

## 与上游的差异

**保留**（判据骨架）：

- `Manual checks` 的 12/16 条判据原样保留（意图与接口契约、生命周期与并发、能力与消费者匹配、范围与归属与必要性、配置与公开选择、模型视角、强制点、借用与派生状态、边界覆盖最终操作、测试强度、测试可靠性、真实入口路径）。
- 上游两句通用纪律逐字保留：**"一条有证据的阻塞项胜过一长串小毛病"**、**"逐条核实，以技术理由修正或反驳，不做表演性同意"**。

**改写**：

- **场景重述**：上游是「评审别人的 PR」；本仓库是单人开发，主场景改为**交付前自审**，次场景为向 DSH 或第三方插件提 PR 前自查。判据本身与「谁看」无关，因此一条不减。
- `Blocking requirements`：7 → 5 条。删除 subsystems/type-equiv 与 invariant companions（本仓库无此机制）；「注册要清理」**提权**（本仓库插件大量使用 cordis 注册，但测试里零 disposal 断言）。
- `Manual checks`：16 → 14 条。真实入口路径改为 Electron 壳 → 内核 → profile 装载；决策记录一致性与截图基线替换上游的 Agent Note 与 transcript snapshot；invariant 负向控制中的通用部分（蓄意无效用例必须按预期规则失败）并入测试强度。
- `Reporting findings`：主场景的呈现渠道由 PR 行内评论改为**会话内交付说明**，四要素（缺陷、位置、影响、证据）与「已被门禁守住的不重复报告」保留。
- 起点确认：上游的 `change-scope` 在本仓库不存在，改为 `git status` + `git diff --stat`，并**显式声明它不是范围报告的等价物**。

**新增**：

- **6 条文档质量判据**（从 `dsh-doc` 并入；该 skill 被判不单独适配）：Brief / Intuitive / Friendly / Accurate / **Agent-readable** / Newcomer-complete。审阅新增或修改的文档与 skill 正文时逐条过。其中 **Agent-readable** 判的正是「skill 与文档能不能被 agent 定向检索」——即本包全部适配工作的目标。

**删除**：6 条，**全部因本仓库无对应机制，无一因「不需要」**——

| 删除项 | 原属 | 理由 |
|---|---|---|
| i18n 双语源 | Sources of truth | 本仓库无双语配对制度 |
| subsystems 页 + `type-equiv` | Blocking #3 | 本仓库无此清单机制 |
| invariant companions | Blocking #5 | 本仓库无 `./invariant` 机制 |
| invariant 生命周期与负向控制 | Manual #13 | 同上；其中的负向控制判据已并入测试强度 |
| 双语改动检查 | Manual #16 | 无双语制度 |
| `docs/defensive-patterns.md` | Sources of truth | 其缺陷类判据由 `ssid-test-reliability` 覆盖 |

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/dsh-code-review/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。
3. 更新本文件的版本锚点与适配日期。
