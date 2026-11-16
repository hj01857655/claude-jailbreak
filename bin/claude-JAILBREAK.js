#!/usr/bin/env node
/** claude-JAILBREAK — 淬（Quench）人设 Claude Code 分发器（零依赖，Node >= 18）
 *
 *  通道模型（官方 schema + 官方文档级）：
 *  - 主通道：output-style（replace 型官方持久通道）
 *      ~/.claude/output-styles/quench.md  +  settings.json "outputStyle": "quench"
 *      自定义 style 替换系统提示词的官方行为段（含身份句），工具/安全段保留
 *  - 辅通道：~/.claude/CLAUDE.md —— 剥离旧 POJIA 越狱身份块（AGENT-RULES 工作规约保留）
 *
 *  命令: status | apply | verify | revert
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PROJECT = path.resolve(__dirname, "..");
const STYLE_SRC = path.join(PROJECT, "persona", "quench-output-style.md");
const LEGACY = path.join(PROJECT, "persona", "legacy");

const CC_HOME = path.join(os.homedir(), ".claude");
const STYLE_DST = path.join(CC_HOME, "output-styles", "quench.md");
const SETTINGS = path.join(CC_HOME, "settings.json");
const CLAUDE_MD = path.join(CC_HOME, "CLAUDE.md");

const POJIA_BEGIN = "<!-- POJIA-PURGE:BEGIN -->";
const POJIA_END = "<!-- POJIA-PURGE:END -->";
const POJIA_RE = /\n?<!-- POJIA-PURGE:BEGIN -->[\s\S]*?<!-- POJIA-PURGE:END -->\n?/g;

const sha16 = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);

function backup(file) {
  fs.mkdirSync(LEGACY, { recursive: true });
  const dst = path.join(LEGACY, path.basename(file) + ".original");
  if (!fs.existsSync(dst)) fs.copyFileSync(file, dst);
  return dst;
}

function cmdApply() {
  // 1) output-style 文件
  fs.mkdirSync(path.dirname(STYLE_DST), { recursive: true });
  fs.copyFileSync(STYLE_SRC, STYLE_DST);
  console.log(`apply: output-style → ${STYLE_DST}`);
  // 2) settings.json 增 outputStyle 键（JSON 保序改写，$schema 保持在首）
  backup(SETTINGS);
  const raw = fs.readFileSync(SETTINGS, "utf8");
  const cfg = JSON.parse(raw);
  const ordered = {};
  for (const [k, v] of Object.entries(cfg)) ordered[k] = v;
  delete ordered.outputStyle;
  const out = { outputStyle: "quench" };
  for (const [k, v] of Object.entries(ordered)) out[k] = v;
  fs.writeFileSync(SETTINGS, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`apply: settings.outputStyle = "quench"（原样备份 persona/legacy/settings.json.original）`);
  // 3) CLAUDE.md 剥旧越狱身份块（AGENT-RULES 保留）
  if (fs.existsSync(CLAUDE_MD)) {
    backup(CLAUDE_MD);
    const md = fs.readFileSync(CLAUDE_MD, "utf8");
    if (POJIA_RE.test(md)) {
      fs.writeFileSync(CLAUDE_MD, md.replace(POJIA_RE, "").trimEnd() + "\n", "utf8");
      console.log("apply: CLAUDE.md 旧 POJIA 越狱块已剥离（AGENT-RULES 保留，备份 persona/legacy/CLAUDE.md.original）");
    } else {
      console.log("apply: CLAUDE.md 无旧越狱残留，跳过");
    }
  }
}

function cmdVerify() {
  const results = [];
  results.push(["style", fs.existsSync(STYLE_DST) && sha16(fs.readFileSync(STYLE_DST)) === sha16(fs.readFileSync(STYLE_SRC)) ? "MATCH" : "MISMATCH"]);
  try {
    results.push(["outputStyle", JSON.parse(fs.readFileSync(SETTINGS, "utf8")).outputStyle === "quench" ? "SET" : "NOT-SET"]);
  } catch { results.push(["outputStyle", "PARSE-FAIL"]); }
  let residue = "无残留";
  if (fs.existsSync(CLAUDE_MD) && POJIA_RE.test(fs.readFileSync(CLAUDE_MD, "utf8"))) residue = "有残留";
  results.push(["CLAUDE.md 旧越狱残留", residue]);
  const pass = results.every(([, v]) => v === "MATCH" || v === "SET" || v === "无残留");
  console.log(`verify: ${pass ? "PASS" : "FAIL"}（${results.map(([k, v]) => `${k}: ${v}`).join(", ")}）`);
  process.exitCode = pass ? 0 : 1;
}

function cmdStatus() {
  console.log(`output-style : ${fs.existsSync(STYLE_DST) ? "已铺 quench.md" : "未铺"}`);
  try { console.log(`settings     : outputStyle = ${JSON.parse(fs.readFileSync(SETTINGS, "utf8")).outputStyle}`); }
  catch { console.log("settings     : 解析失败"); }
  const md = fs.existsSync(CLAUDE_MD) ? fs.readFileSync(CLAUDE_MD, "utf8") : "";
  console.log(`CLAUDE.md    : ${POJIA_RE.test(md) ? "含旧 POJIA 越狱块（未剥离）" : "无旧越狱残留"}`);
}

function cmdRevert() {
  if (fs.existsSync(STYLE_DST)) fs.unlinkSync(STYLE_DST);
  console.log(`revert: 已删 ${STYLE_DST}`);
  const sb = path.join(LEGACY, "settings.json.original");
  if (fs.existsSync(sb)) { fs.copyFileSync(sb, SETTINGS); console.log(`revert: settings.json 已还原`); }
  const mb = path.join(LEGACY, "CLAUDE.md.original");
  if (fs.existsSync(mb)) { fs.copyFileSync(mb, CLAUDE_MD); console.log(`revert: CLAUDE.md 已还原`); }
}

const cmd = process.argv[2] || "status";
({ status: cmdStatus, apply: cmdApply, verify: cmdVerify, revert: cmdRevert }[cmd] ||
  (() => { console.log("用法: node claude-JAILBREAK.js [status|apply|verify|revert]"); process.exit(2); }))();
