# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `dsh-pre-push-checks` |
| 上游路径 | `DSHFork/.agents/skills/dsh-pre-push-checks/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 128 行（**无 references**） |
| 适配日期 | 2026-09-10 |
| 适配类型 | 需适配（**前提反转** + 命令与放置规则本地化 + 删 stacks） |
| 依赖 | `ssid-test-reliability`、`ssid-prose-standard`——**同批安装** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-06-推送前检查.md` |

## 与上游的差异

**改写（前提反转，这是本 skill 最要紧的一处）**：

上游的全部逻辑建立在**一句前提**上——*"Git hooks are intentionally narrow… **CI owns exhaustive coverage and the platform matrix**"*，即「本地钩子只做很小的事，你按变更选最小检查集，CI 兜底穷尽覆盖」，所以「选最小集」是安全的。

**本仓库的这条前提整个不存在**（实测）：`core.hooksPath` 未配置、`.git/hooks` 下非 sample 文件为零、无 lefthook/husky；唯一的 CI 是 `build-mac.yml`（107 行），只打包**不跑任何测试**，且只在 `push tag v*` 或手动触发——**推分支根本不触发**。

因此正文的第一原则反转为：

> **本仓库没有任何本地基线，也没有 CI 兜底——你选的检查就是这次改动仅有的证据。**

随之调整的还有「全量本地排练」的阈值：因为**没有 CI 会在推送后替你发现问题**，触及壳/内核边界或同时改多个插件时，倾向按全量排练处理。

**保留**（判据一字未减）：

- 三条核心：**最窄的、会因该回归失败的测试**；**不要因为 commit 或 push 在即就重复已通过的检查**；**`--force-with-lease=<branch>:<observed-oid>`，raw `--force` 永不允许**。
- 「全量本地排练」仅在三种情况下的判断（用户显式要求 / 诊断 CI 失败 / 改动横跨全仓）。
- 失败处理：**停下并修复或解释阻塞，不要"推上去然后指望 CI 结果不同"**；环境特定失败的完整证明流程。
- 重写后重新抓取 head 并重新审计评审线程、批准、可合并性、检查。
- **mergeability 诊断**（`no checks reported` + `total_count: 0` 时先读 `mergeable`/`mergeStateStatus`）——并标注其适用边界：本仓库无 `pull_request` 工作流，该诊断只适用于给 DSH 或第三方提 PR 时。

**本地化**：

- 基准确认：上游的 `change-scope` 在本仓库不存在，改为 `git diff --stat <verified-base>..HEAD`，并**显式声明它不是范围报告的等价物**；基准候选是本仓库的 19 个 release tag。
- 8 类具体检查全部换成本地域（属主测试、`lib/` 派生、截图基线、`profile-template/`、`cordis.patch.yml` 等）。
- 推送第 2 步的「pre-commit 修复器」改为「格式化或生成步骤」。

**新增**：

- **操作前提**：本仓库根目录**没有 `package.json`**，npm 命令须在 `shell/` 下执行。
- **两条与覆盖率无关的禁令**（救回自被删的二级小节）：**测试选择与覆盖率选择是两件事**；**不要用"没有测试"的开关、降低阈值或缩小覆盖面来掩盖一个未覆盖的受影响文件**。

**删除**：

- `gh stack push` / `gh stack sync` 相关内容与二级小节 `### Post-sync validation` 整节（本仓库不用 GitHub stacks）。
- 二级小节 `### Focus unit coverage on the affected source`（本仓库无覆盖率配置）——其两条通用禁令已救回并写入正文。

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/dsh-pre-push-checks/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。
3. 更新本文件的版本锚点与适配日期。
