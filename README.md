# @max-null/dsh-skills

把 DSH 官方 `.agents/skills` 的工程判据带到思灵（SSiD）仓库。

装上它之后，在思灵里做这些事会获得对应的判据：**设计或排查不稳定的测试**、**修剪文档里的推理痕迹**、**判断某段注释该保留什么**、**交付前的代码自审**、**找简化候选并证明它值得删**、**推送前选最小验证集**、**测量并优化启动与响应**、**录制界面演示**。

**它来自对 deepseek-harness 官方 skill 的适配，不是自创。** 每条判据都能追到上游的具体文件与 commit，见每份 skill 的 `SOURCE.md`。

## 包含的 8 个 skill

| skill | 什么时候用 |
|---|---|
| `ssid-test-reliability` | 测试可能因并发、共享资源、时钟、进程全局状态、子进程或异步拆除而不稳定时 |
| `ssid-trim-cot-leakage` | 文档或注释里出现以写作会话为视角的表述（「第一版」「不再」「旧版」）时 |
| `ssid-prose-standard` | 撰写、评审、修剪文档与注释，判断哪些内容必需时 |
| `ssid-code-review` | 交付代码或文档前自审，或向上游提 PR 前自查时 |
| `ssid-find-simplifications` | 需要找出简化候选、并证明它值得删时 |
| `ssid-pre-push-checks` | 推送之前为出站改动选证据时 |
| `ssid-speed-up-perf` | 调查启动时间、大会话装载、界面响应时 |
| `ssid-record-browser-gif` | 改动用户可见界面后需要录制演示时 |

**依赖关系**：`trim-cot-leakage` 与 `prose-standard` 互为前置；`code-review` 引用 `test-reliability` 与 `prose-standard`；`pre-push-checks` 引用 `test-reliability`。**应当整包安装**，否则引用会指向不存在的判据。

## 未包含的 4 个，以及原因

上游共 12 个 skill。另外 4 个**依赖思灵没有的制度**——硬适配只会得到空壳。**但判据没有丢，可搬的部分已并入上表**：

| 上游 skill | 为什么不适配 |
|---|---|
| `dsh-doc` | 依赖整套文档制度（kind 系统、4 个模板、双语配对、字数预算、网站投影、门禁），思灵一样都没有。**它的 15 条制度无关判据已并入 `ssid-prose-standard`（9 条）与 `ssid-code-review`（6 条）** |
| `dsh-translate-docs` | 唯一主题就是双语配对制度，而思灵是单语仓库 |
| `dsh-archive-agent-notes` | 依赖 Agent Note 的状态机、三件套与归档封印；思灵的 `docs/决策/` 没有状态机 |
| `dsh-merging-stacked-prs` | 围绕 `gh stack` 堆叠 PR 扩展；其通用判据（重写后重新审计）已在 `ssid-pre-push-checks` 里 |

完整理由见 `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-09-不适用理由.md`。

## 截图

本插件是 **SkillProvider 类**：不新增任何按钮、面板或设置项，而是以技能包形式提供 8 个技能。加载结果可用命令验证：`dsh --profile <profile> --dump-config`（组合树里会出现本包名）。

> 按《SSiD 开发手册》§9 截图规范：截图须回答「装完会多出/变成什么」的**入口与面板**。
> 本插件无界面元素，故**不适用**该项要求，改以上述行为效果说明代替。

## 安装

### 一般 profile

```
dsh plugin --profile <name> add @max-null/dsh-skills
```

### 思灵（SSiD）的 profile-template

按本仓库的**双处声明**约定，两处都要加：

1. `shell/profile-template/package.json` 的 `dependencies` —— `"@max-null/dsh-skills": "<版本>"`
2. 同一个文件的 `dsh.profile.bundles` 数组 —— `"@max-null/dsh-skills"`

然后 `node scripts/prepare-runtime.mjs` 重建归档。**改 profile-template 是发版动作**（见手册 §10 与"双处声明"），不是随手改动。

**在 npm 发布之前**也可以用 `file:` 指向本地包目录做临时验证——但那是临时手段，版本无法确认，**最终仍应改为 registry 版本**（这正是本包选择 npm 形态的原因：让 skill 版本可被确认）。

### 验证集成成功

在装好的 profile 里新开一个会话，问它「有哪些 `ssid-` 开头的 skill」。**八个都在**就说明 provider 已被发现。

若一个都没有，按顺序检查：包是否真的进了 `node_modules` → profile 的 `cordis.patch.yml` 里是否有 `@max-null/dsh-skills` 那一行 → 该 profile 是否真的重启过（provider 在 `apply()` 时注册，不重启不会生效）。

## 关于 rank 550

DSH 的 skill 优先级**数字小的赢**。官方定义的刻度是：

| rank | 来源 |
|---:|---|
| 100 / 200 | 项目的 `.dsh/skills` / `.agents/skills` |
| 250 | 运行时注册 |
| 300 | `customSkillDirs` |
| 400 / 500 | 用户的 `$DSH_HOME/skills` / `$AGENTS_HOME/skills` |
| **550** | **本包（打包的 provider）** |
| 600 | 随 DSH 打包的内置 skill |

**550 不是 DSH 定义的常量**，而是留给「打包 provider」的空档：**低于**用户自己的 skill 目录（用户始终可以覆盖），**高于**内置（包可以覆盖官方）。

## 与上游的版本关系

每个 skill 目录下的 `SOURCE.md` 记录：上游 skill 名、路径、**抓取时的 commit 锚点**、上游体量、本地的保留 / 改写 / 新增 / 删除清单，以及**上游变动时的跟进命令**。

上游没有版本号，只有 commit 可靠。本包的所有 skill 指向同一个锚点：**`c291e7961a`（2026-09-10 抓取）**。

## 开发

```sh
npm test
```

用 node:test 跑 8 个测试：provider 注册、候选校验、frontmatter 剥离、排序稳定性、带脚本 skill 的完整性，以及 **frontmatter 字段受控 + description 不总结工作流**（后一条依据：描述里写了工作流，agent 会照描述做、跳过正文）。

## 关于 README 截图

本包**没有界面**，因此没有 `## 截图` 段与 `docs/shots/`——那条规则针对的是有用户可见界面的插件。
