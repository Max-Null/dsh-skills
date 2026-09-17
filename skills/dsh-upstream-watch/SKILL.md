---
name: dsh-upstream-watch
description: 当用户说「看看 DSH 有没有更新」「DSH 更新了吗」「同步一下上游」「观察 DSH 主库」时使用；也用于 DSH 发布新 tag 后评估它对本工作区（web 版、SSiD 桌面壳、插件家族）的影响。产出一份带证据的版本对比报告，并把观察基线上移。
---

# DSH 上游观察

**这是指导，不是脚本。** 流程固定，调查深度随版本规模伸缩：一个收口小版看提交清单即可，几百提交的版本按维度并行。

## 铁律：只在观察站动手

`DSHfork/` 是三个 DSH 库中唯一可以随意 fetch / 切分支 / 删建的。`deepseek-harness/` 是 web 与 SSiD 共享的内核来源，`dsh-web-runtime/` 是 web 版的内核副本——对它们做任何 git 操作都会连带影响正在运行的会话宿主。依据：工作区 `AGENTS.md` 铁律 2.0/2.1。

## 流程

**1. 取新版本**

```sh
git -C DSHfork fetch origin --prune --tags
git -C DSHfork checkout --detach origin/master
```

记下 `git describe --tags`、HEAD 日期、上一个基线提交。

**2. 量规模**（决定后面走几步）

- `git rev-list --count <基线>..origin/master`
- 提交构成：`git log --no-merges --format='%s'` 按 `type(scope)` 前缀分组
- 包目录增删：`git ls-tree -r -d --name-only` 做**目录级** `Compare-Object`。文件级 `git diff --name-status` 会把已有包里的新文件误判成新包
- 改动量统计**必须排除生成物**：`:(exclude)docs/persistence-changes`、`:(exclude)docs/persistence-schema.json`、`:(exclude)pnpm-lock.yaml`、`:(exclude)snapshots`。前两者是历史 session schema，单文件可达六万行，不排除会把「每提交平均行数」放大到五倍以上

**3. 发布面：两套口径都要看**

- git tag：`git for-each-ref --sort=v:refname --format='%(refname:short)|%(creatordate:short)' refs/tags/dsh-v*`
- npm：`npm view @deepseek-ai/dsh dist-tags --json`
- 二者不对等：存在有 tag 未发 npm 的版本，也存在早于首个 tag 的 npm 版本。**用户能装到的是 npm 通道，不是 tag**

**4. 分维度调查**（版本大时用 subagent 并行，四个维度互不重叠）

| 维度 | 必查项 |
|---|---|
| 契约与破坏性影响 | `packages/core/session/src/types.ts` 的 `SESSION_FORMAT_VERSION`；**新事件是否带 `ignorable`**（缺失即「必需读」，旧内核必须拒读 → 升级不可回退）；profile 解析与模块解析；插件加载契约；host 通信通道（`ctx.connection.fetch` / `ctx.webServer`）；engines 与包管理器门槛 |
| 内核运行时 | 包的新增 / 删除 / 改名（旧名有无 shim）；启动与加载性能；执行后端（PTC、沙箱、子进程） |
| 新能力面 | 新增实验包是否被 shipped profile 挂载、外部依赖、权限与沙箱边界、是否绕开文件沙箱 |
| Web / Client 与桌面端 | 新增 client 包；slot 与 DOM 锚点的增删；z-index 阶梯与样式归属机制；官方桌面端的运行时与解析形态 |

**每个结论都要带证据**：文件路径 + 行号，或 commit hash。区分「官方声明」与「从 diff 推断」——发布说明的措辞不等于实现。

**5. 对本工作区的命中**（这一步才是产出）

| 检查对象 | 看什么 |
|---|---|
| 我们的插件 | `max-null-plugins/`、`seek-soul-in-darkness/plugins/`、`third-party-plugins/` 是否用到被改的钩子名、服务名、工具名 |
| 模板依赖清单 | `shell/profile-template/pnpm-workspace.yaml` 的 overrides 是否 pin 了已删或已改名的包；profile 闭包里是否残留实体 |
| 内核 API 兼容 | `seek-soul-in-darkness/shell/kernel.ts` 的四个 import：`app-boot` 的 `healProfilesModuleFallback` / `initProfile` / `loadProfile`、`cmdline` 的 `provideCmdline`、`launch-environment` 的 key |
| 隐私与默认值 | 新挂载的插件是否默认上传数据、默认开启什么；交付型产品要不要在 patch 层关掉 |
| 启动严格性 | 必需 entry 清单是否变化，裁剪过的 profile 组合会不会被拒绝启动 |

**结论分三档写**：已验证会坏 / 需要评估 / 核验通过。「核验通过」同样要写——它防止下一轮重复核对。

**6. 落库**

- 报告写进 `dsh-anatomy/版本对比/<日期>-<版本>-vs-<基线>.md`
- 同步 `dsh-anatomy/基线.md`：基线版本、新增的高风险结论、被推翻结论的就地更正（**不要删除过时结论**，改写成「在 vX 下如此，vY 起改为 …」）
- `node build-index.mjs` → `node verify-library.mjs`，两者都要绿

## 产物要回答的问题

1. 上游放了几个版本、走哪个通道（`latest` / `next` / `alpha`）
2. 会话格式与事件词汇表变没变——**能不能退回上一个内核**
3. 对本工作区三处（web 版、SSiD 壳、插件家族）分别命中什么
4. 哪些旧结论被这版推翻

## 权威来源

- `dsh-anatomy/README.md`：本库的分类与更新触发条件
- `dsh-anatomy/基线.md`：当前基线、升级后要重新核对的高风险结论、维护约定
- `seek-soul-in-darkness/docs/SSiD开发手册.md`：内核升级、归档与发版流程
- 工作区 `AGENTS.md`：三库架构、共享 checkout 禁令、环境流转规则

## 与升级解耦

观察**不等于**升级。调查结论进 `dsh-anatomy`，是否升内核由用户单独决策（当前策略见项目记忆「内核升级策略」）。不要在观察过程中改动 `deepseek-harness/`、`dsh-web-runtime/`、profile 或任何插件源码。
