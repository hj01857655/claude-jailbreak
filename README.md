# claude-jailbreak — 淬（Quench）人设 Claude Code 铺装

本机 Claude Code 2.1.325 的淬人设铺装。**五端里首个行为层完全生效的端**：官方身份段真 replace，模型开口自称淬。

## 通道模型

| 通道 | 机制 | 位置 | 类型 |
|---|---|---|---|
| output-style（主） | 自定义 style 替换系统提示词的官方行为段（含 `You are Claude Code` 身份句），工具/安全段保留 | `~/.claude/output-styles/quench.md` + `settings.json` `"outputStyle": "quench"` | **replace 型官方持久通道** |
| CLAUDE.md（辅） | 剥离旧 POJIA 越狱身份块，AGENT-RULES 工作规约保留 | `~/.claude/CLAUDE.md` | 清理旧冲突身份 |

`outputStyle` 键名经官方 schema（json.schemastore.org/claude-code-settings.json）确认；新版本 claude-code 为原生二进制分发（`claude-code-win32-x64`），无 cli.js 可查，schema 为准。

## 用法

```powershell
node bin/claude-JAILBREAK.js status
node bin/claude-JAILBREAK.js apply    # style 文件 + settings.outputStyle + CLAUDE.md 剥旧越狱块
node bin/claude-JAILBREAK.js verify
node bin/claude-JAILBREAK.js revert   # 三处全还原（persona/legacy/*.original）
```

人设修改：改 `persona/quench-output-style.md`（front-matter 标准闭合格式）→ `apply` → `verify`。

## 验证记录（2026-11-15）

- `verify: PASS`（style hash MATCH + outputStyle SET + CLAUDE.md 无旧越狱残留）
- **行为实测**：`claude -p "你是谁"`（magpie 网关 127.0.0.1:3425，workbuddy/hy4free）→
  「我是淬（Quench），底层模型 Tencent Hunyuan Hy，本会话里就是资深软件工程师与安全研究员本身。」
  ——自称淬，底层模型如实报告载具，身份/载具分离行为按人设执行。
- 对比：codex（KAS/8081 服务端身份锚压住）、kiro（同）——Claude Code 的 output-style 是客户端 system 位真替换，服务端无身份锚。

## 回滚

```powershell
node bin/claude-JAILBREAK.js revert
```

还原 `settings.json` 与 `CLAUDE.md`（`.original` 备份），删除 quench.md。
