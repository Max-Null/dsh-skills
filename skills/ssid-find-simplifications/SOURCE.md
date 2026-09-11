# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `dsh-find-simplifications` |
| 上游路径 | `DSHFork/.agents/skills/dsh-find-simplifications/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 157 行（**无 references**） |
| 适配日期 | 2026-09-10 |
| 适配类型 | 需适配（依赖制度的 3 处删改 + 语料与域本地化） |
| 依赖 | `ssid-test-reliability`、`ssid-prose-standard`——**同批安装** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-05-简化审查.md` |

## 定位：这是引入新实践

实测（2026-09-10）：本仓库 `docs/决策/` 里**零简化类记录**，源码里**零 `TODO`/`FIXME`/`XXX` 标记**。所以本 skill **不是改进已有实践，而是引入一套"如何证伪一个简化提案"的方法**——第一条简化类决策记录会成为后续的模板。

## 与上游的差异

**保留**（判据一字未减）：

- `What Counts As A Strong Candidate` 的 **9 条**判据全部保留，含最后一条（**简化后行为可以略有不同，但新行为仍然合理且更容易解释**）——它给了简化一个正当的模糊余地，避免"行为必须 100% 等价"的僵化。
- `Prove Or Reject Each Candidate` 的 **4 条拒绝条件**与三类语料骨架。
- `Hand-Rolled Code Versus A Dependency` 的 **4 条证明要求**（点名确切覆盖表面 / 诚实检查包健康度 / 先查决策记录 / 算净删除量）。
- `Audit Trust And Lifecycle Boundaries` 的判断框架，含那句反直觉的：**围绕敌意 getter、伪造类型化对象、回调替换或同进程交接后突变构造的测试，是可能存在投机契约的证据，而不是保留它的自动理由**。
- `Simplify Prose With The Code` 整节。

**改写**：

- 引言：载体由 Agent Note 改为 `docs/决策/` 的提案。
- `Start With Repo Context`：引用换成本地（根与 SSiD 的 `AGENTS.md`、手册 §9、`docs/设计/SSiD-壳级能力设计.md`、按关键词搜 `docs/决策/`）；**受保护对象改为** `dsh-memory` 的 storage backend 抽象与壳/内核边界；删除 DSH 的两条"不是金科玉律"信条与 5 个具体范例（本仓库无对应物）。
- `Survey Broadly`：5 个域全部换成本地域（壳与内核边界 / 插件面 / 数据传输与状态 / 测试与派生物 / 文档与规范）。
- `Prove Or Reject`：语料三类换成本地路径，**并注明 `test/` 与 `tests/` 两种目录名都要匹配**（本仓库 9 个插件用 `tests/`、3 个用 `test/`）。
- `Write The Agent Note` → **写决策记录**：落点 `docs/决策/YYYY-MM-DD-<标题>.md`，7 条建议结构保留 6 条（删除 `Status: proposed`，本仓库无状态机）。
- `Coalesce Superseded Agent Notes`：**5 步 → 1 步**（旧记录顶部加一行"已被取代"并双向链接，不删除）。上游的完全/部分取代细分、理由移交清单、入链修复与三件套同删在本仓库没有落点——硬搬会让 agent 去修不存在的链接。保留边界句「不要把每次简化普查都扩大成全仓库的记录审计」。
- `Validation And PR Hygiene`：`doc-sync` / `lint` 本仓库没有，换成重跑受影响的 L1；**`git diff --check` 可手动跑，但本仓库没有钩子替你跑它**。
- `When Folding Another PR Or Branch`：降权为次场景（向 DSH 或第三方提 PR 时）。

**新增**：

- **vendor 与 profile-template 副本的同步链约束**：它们是同步链的产物（手册 §10：四份指纹一致、改后必同步运行时实体），删任何一处都会断链——**要么整体处理，要么不动**。上游没有这类约束（DSH 只有 `vendor/` 一处）。
- **内联 TODO 的现状空白标注**：本仓库零 TODO 标记，待办集中在手册的「待办清单」节；采用前须先定紧迫度语义，否则「想法对但太小」这条拒绝条件没有出口。
- **依赖政策的缺口**：上游引 DSH 的依赖政策记录，本仓库无对应文档，因此在正文里要求"引入依赖前先在提案里陈述上位理由"。

**删除**：0 个部件。二级小节 `Audit invariant companions` 删除（本仓库无 `./invariant` 机制），**但其通用判断**（只比较**能独立分叉**的观测才算有用）并入「两份表示镜像同一事实」。

**留白**：上游第 6 条判据（猜测性产品通用能力）列了 DSH 的具体实例清单；**本仓库的实例清单留白**，不凭空编造，由实际使用填充，并在正文里注明留白是有意的。

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/dsh-find-simplifications/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。
3. 更新本文件的版本锚点与适配日期。
