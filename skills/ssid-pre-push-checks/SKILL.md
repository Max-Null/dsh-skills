---
name: ssid-pre-push-checks
description: 在推送、强制推送，或在给 DSH 或第三方插件提 PR 之前使用——用于为出站改动选出最小的测试与检查集合，而不是反射性地跑全仓套件。
---

# 推送前检查

在推送之前**跑一次**相关的本地证据。

**本仓库没有任何本地基线，也没有 CI 兜底——你选的检查就是这次改动仅有的证据。** 没有钩子会替你跑；CI 只在打 tag 时触发，而且**不跑任何测试**。在有兜底的仓库里「选最小集」是安全的，因为漏掉的会被接住；**这里不会**。

## 检查出站改动

1. 确认 checkout 与分支：

```sh
git status --short --branch
git rev-parse --show-toplevel
```

2. **先确认比较基准，不要想当然**——用上次发版 tag 或目标分支的实时 ref（本仓库有 19 个 release tag 可作候选，最近的是 `v0.2.1`）。然后看完整范围：

```sh
git diff --stat <verified-base>..HEAD
```

**这不是范围报告的等价物：它给路径，不给受影响包与脏层。**

合并了变化后的 base 之后：**重跑范围报告，重估合并后的范围能影响什么行为，并只重跑被合并失效的检查**。

## 选出相关证据

**没有通用的本地基线。** 每个行为变更都需要**最窄的、可获得的、会因该回归失败的测试或专用检查**；只在 diff 真正触及的表面加更广的检查。

当改动涉及**拥有资源的或异步的测试、fixture、helper 或 CI 执行路径**时，**先读 `ssid-test-reliability`** 判断是否适用恢复、负向控制、静默拆除或并发进程证据。本 skill 负责选命令，并避免重复已通过的证据。

**选测试时的两条禁令**（与有没有覆盖率配置无关）：

1. **测试选择与覆盖率选择是两件事**——一个文件过滤器决定跑哪些测试，配置决定量哪些源码。
2. **不要用"没有测试"的开关、降低阈值或缩小覆盖面来掩盖一个未覆盖的受影响文件。**

按改动类型选：

| 改了什么 | 跑什么 |
|---|---|
| 包或脚本行为 | 属主测试：`shell/` 用 node:test（`npm test`、`npm run test:profile-merge`、`npm run test:codegraph-adapt`）；插件按各自 runner。**注意 9 个插件用 `tests/`、3 个用 `test/`** |
| `src/` 的类型或构建 | `npm run typecheck`（shell）或插件 `pnpm typecheck`——`lib/` 是派生物，改 `src/` 后要确认构建产物与源一致 |
| 文档、注释、skill 正文 | `ssid-prose-standard` 的人工语义核 + 相关链接可用性检查 |
| 界面可见输出 | Playwright 截图基线：`cd shell/tests/plugin-adapt && npm test`。**基线变了要问为什么变**——把它的 diff 当行为变更评审，不是格式噪音 |
| `shell/profile-template/` 或 vendor | `node scripts/prepare-runtime.mjs` + 核对三处 vendor 全等（手册 §10） |
| `package.json` 的 `main` / `exports` / `dsh.client` | `npm run build` + `npm run typecheck` |
| `cordis.patch.yml` | 核对插件能在 profile 中装载 |
| 真实 provider 或模型行为 | 相关的真实调用检查；**绝不打印密钥** |

**不要因为 commit 或 push 在即就手动重复一个已通过的检查。**

## 全量本地排练

只在三种情况下跑完整的本地近似：**用户显式要求**、**诊断 CI 失败**、或**改动横跨全仓以致没有更窄的集合可信**。

以 `shell/package.json` 的 scripts 为清单，**不要自造聚合命令**。

**本仓库的"横跨全仓"阈值应当更低**：因为**没有 CI 会在推送后替你发现问题**，触及**壳/内核边界**（`shell/main.mjs` ↔ `kernel.bundle.mjs` ↔ profile）或**同时改多个插件**时，倾向按全量排练处理。

## 保护重写历史的推送

重写独立分支的历史之前，**抓取当前远端分支并记录它的确切 OID**；用确切 lease 发布，使并发更新中止推送：

```sh
git push --force-with-lease=<branch>:<observed-oid>
```

**Raw `--force` 永不允许。**

**任何重写推送之后，重新抓取实时 head，并重新审计未解决的评审线程、批准、可合并性与检查——重写之前的 commit hash 与行内评论锚点不是当前证据。**

## 处理失败

若相关检查在普通推送前失败：**停下并修复或解释阻塞**。**不要"推上去然后指望 CI 结果不同"——本仓库的 CI 本来就不会告诉你。**

若失败看起来是环境特有的，**证明它**：

- 记录确切的命令、失败的用例与平台特有的差异。
- 确认相关的非平台证据。
- **该检查必需时，优先修复跨平台不确定性。**
- **只有在用户显式要求或同意时才绕过任何自定义检查**，并报告究竟什么失败、以及为什么预期别处会不同。

## 推送流程

1. **跑一次**选定的相关检查。
2. 正常提交，并在继续之前**检查格式化或生成步骤改过的文件**。
3. 推送，或对已授权的重写分支使用确切 lease。
4. **验证远端 ref 与本地 `HEAD` 一致**：

```sh
git rev-parse HEAD origin/$(git branch --show-current)
```

给上游提 PR 时，推送后检查远端 CI 与可合并性。

**一条值得记住的诊断**（适用于给 DSH 或第三方提 PR，**不适用于本仓库自己的分支**——本仓库没有 `pull_request` 工作流）：当 `gh pr checks` 报 "no checks reported" 且 `/actions/runs?head_sha=<sha>` 返回 `total_count: 0` 时，**先读可合并性再怀疑推送或 GitHub 丢事件**：

```sh
gh pr view <number> --json mergeable,mergeStateStatus
```

> GitHub 在 PR 处于 `CONFLICTING` / `DIRTY` 时**不创建 `pull_request` 工作流运行**，所以缺失的信号就是冲突本身，不是基础设施问题。解决冲突是唯一的修法；空提交、`--allow-empty` 推送、draft/ready 翻转、撤销再恢复，都会让 `total_count` 保持为零并增加垃圾历史。

**待定的检查要报告为待定**；归因给分支或环境之前先看失败。
