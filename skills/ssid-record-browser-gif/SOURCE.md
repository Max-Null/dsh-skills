# 来源与版本

| 项 | 值 |
|---|---|
| 上游 skill | `record-browser-gif` |
| 上游路径 | `DSHFork/.agents/skills/record-browser-gif/` |
| 上游版本锚点 | `c291e7961a`（2026-09-10 抓取） |
| 上游体量 | SKILL.md 172 行 + `scripts/encode_gif.py` 337 行 + `scripts/test_encode_gif.py` 103 行 = **612 行** |
| 适配日期 | 2026-09-10 |
| 适配类型 | 部分可用（发布目标改写；脚本**逐字复用**） |
| 依赖 | `ssid-pre-push-checks`——同批安装；**运行时另需 `python` / `ffmpeg` / `ffprobe`** |
| 适配依据 | `seek-soul-in-darkness/docs/决策/2026-09-10-skill适配说明-08-浏览器录制.md` |

## 与上游的差异

**逐字复用（未改一个字节）**：

- `scripts/encode_gif.py`（337 行）——只 import 标准库（`argparse` / `json` / `math` / `shutil` / `subprocess` / `tempfile` / `pathlib` / `typing`），外部只依赖 `ffmpeg` / `ffprobe`，**自带的输入校验就是判据的载体**（拒绝空/越界区间、短于两帧的选择、模式不当的标志、意外覆盖），改它就是改判据。
- `scripts/test_encode_gif.py`（103 行）——编码器自测。

> 复制时以 SHA256 校验：`encode_gif.py` = `34AA80599036…`、`test_encode_gif.py` = `B803EE933E13…`，与上游一致。

**保留**（判据一字未减）：

- **录制与发布分离**的 4 条（录制绝不改动远端状态；发布是单独的最后一步；保留所要求的录制条件；绝不读取或暴露凭据值）。
- **录制流程**全部要点：3–6 个有意义状态、唯一语义定位器、`exact: true` 防提示词回显、**固定等待不用于确立就绪**、不捕获机密与无关标签页、单一视口。
- **`viewport` 与 `recordVideo.size` 必须显式匹配**（否则缩到 800×800 以内导致文字不可读）；**`context.close()` 要在 `video.saveAs()` 之前 await**。
- **验证产物**的 4 步，其中**目视阅读编码后的 GIF 本身**是最容易跳过也最重要的一步。
- 编码器的全部使用纪律（`--speed` 必须在旁边披露、`--fps` 不能恢复未捕获的运动、体积削减顺序、`--force` 的前置）。

**改写**：

- **发布目标**：主落点改为**本仓库的 `docs/shots/`**（对应工作区铁律 7 的 README 截图段），并说明**它与「绝不提交二进制」不冲突**——被禁的是把媒体塞进会被反复合并的分支以膨胀历史，而 `docs/shots/` 是 README 的常驻资产。上游的 `gh --attach` 全流程与 assets 分支退路**作为次落点保留**，供向 DSH 或第三方提 PR 时使用。
- **强制规则换载体**：上游要求「改动用户可见 GUI 的 PR 必须包含 GIF」；本仓库改为**「改动用户可见界面时必须在同一次改动里更新 `docs/shots/` 与 README 的 `## 截图` 段」**。
- **隔离域本地化**：构建命令改为 `npm run bundle-kernel` + 受影响插件的构建；隔离面加入 **profile（`~/.dsh/profiles/ssid`）——录制不得碰用户真实 profile**；停服务器用 PID 或命令行精确匹配，**不要用宽泛的 `taskkill /IM node.exe`**。

**新增**：

- **媒体依赖的现状**：`ffmpeg` / `ffprobe` **9.0.1**（gyan.dev release-essentials，106 MB）解压在本机 `H:\MaxNull\WorkStation\.build\ffmpeg\ffmpeg-9.0.1-essentials_build\bin\`，并写入**用户级 PATH**（便携版路线，`IsAdmin=False` 下的可行做法）。**编码器的 5 个自测已实测通过**（`python -m unittest test_encode_gif -v` → `Ran 5 tests … OK`）——这是「逐字复用」在本机成立的实际证据，不只是纸面声明。
- **Windows 的命令差异**：`python3` 在本机解析到 Windows Store 应用别名（0 字节，执行返回 9009），而 `python` 可用（3.12.1）。**`Get-Command` 会报告它存在**——所以正文明确要求用 `python`，并写明「存在性检查不等于可用性检查」。

## 上游变动时的跟进方式

上游无版本号，只有 commit 可靠。跟进方法：

1. `git -C DSHfork fetch && git -C DSHfork log --oneline c291e7961a..origin/master -- .agents/skills/record-browser-gif/`
2. 若该目录有变动，对照本文件「与上游的差异」逐条重判。**若 `scripts/` 有变动，重新逐字复制并更新上面的校验和。**
3. 更新本文件的版本锚点与适配日期。
