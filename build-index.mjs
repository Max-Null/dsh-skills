#!/usr/bin/env node
/**
 * dsh-skills 图书馆构建器
 *
 * **派生自** `dsh-anatomy/build-index.mjs`（而它派生自 SSiD 的决策知识库构建器）。
 * 展示层（PAGE_CSS / PAGE_JS / buildHtml）原样复用 —— 那是被 111 + 28 篇真实文档与
 * 数十项断言验证过的部分（含极简 markdown 渲染器、那个已修的死循环防护、以及渲染层的
 * 标识符统一）。**数据层按本库结构新写。**
 *
 * 本库相比母版的两处实质差异：
 *   1. **frontmatter 剥离**：每个 skill 目录下的 SKILL.md 以 YAML frontmatter 开头，
 *      不剥会被那个极简渲染器当正文渲染出来（`---` 会被当分隔线、`name:` 当普通行）。
 *      剥离后还会**用 frontmatter 的 description 作摘要**——它比正文首段更准确。
 *   2. **分类由路径决定**：`skills/`（SKILL 与 SOURCE）、`适配说明/`、`参考/`（references）、
 *      `库说明/`（README）。skill 名不做分类而进标签（8 个分类太碎）。
 *
 * 用法：node build-index.mjs [--json-only]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_JSON = path.join(HERE, 'library.json');
const OUT_HTML = path.join(HERE, 'index.html');

/** 不进图书馆的目录 */
const EXCLUDE = new Set(['lib', 'node_modules', '.git', 'tests', 'dist', 'build', '.github']);

/** 路径 → 分类 */
function classify(rel) {
  if (rel.startsWith('skills/') && rel.includes('/references/')) return '参考';
  if (rel.startsWith('skills/')) return 'skills';
  if (rel.startsWith('docs/适配说明/')) return '适配说明';
  return '库说明';
}

/** 剥掉 YAML frontmatter，并返回其中的 description（若有） */
function stripFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { body: text, description: null };
  const d = m[1].match(/^description:\s*(.+)$/m);
  return { body: text.slice(m[0].length), description: d ? d[1].trim().replace(/^["']|["']$/g, '') : null };
}

/** frontmatter 的 description 往往是长句，截到一句话作摘要 */
function firstSentence(s, n = 160) {
  const cut = s.split(/(?<=[。；])/)[0];
  const out = (cut && cut.length <= n * 2 ? cut : s).trim();
  return out.slice(0, n);
}

function extractSummary(body) {
  const lines = body.split('\n');
  const pick = (from) => {
    const buf = [];
    let inFence = false;
    for (let i = from; i < lines.length; i++) {
      const s = lines[i].trim();
      if (/^```/.test(s)) { inFence = !inFence; continue; }
      if (inFence) continue;
      if (/^#{1,6}\s/.test(s) || /^[>|]/.test(s) || /^[-*_]{3,}$/.test(s)) { if (buf.length) break; else continue; }
      if (!s) continue;
      buf.push(s.replace(/[*`_>#]/g, '').trim());
      if (buf.join('').length > 200) break;
    }
    return buf.join(' ');
  };
  const h2 = lines.findIndex((l) => /^##\s+\S/.test(l));
  const out = h2 >= 0 ? (pick(h2 + 1) || pick(0)) : pick(0);
  return (out || '(无摘要)').slice(0, 200);
}

function extractTags(text) {
  const t = new Set();
  for (const m of text.matchAll(/@[a-z0-9][\w.-]*\/[\w.-]+/gi)) t.add(m[0].toLowerCase());
  for (const m of text.matchAll(/\b(?:dsh|ssid)-[a-z0-9]+(?:-[a-z0-9]+)*\b/gi)) t.add(m[0].toLowerCase());
  return [...t].slice(0, 14);
}

function build() {
  const files = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || EXCLUDE.has(e.name)) continue;
      const p = path.join(d, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p, r);
      else if (e.name.endsWith('.md')) files.push({ file: r, abs: p });
    }
  })(HERE, '');

  const entries = [];
  for (const f of files) {
    const raw = fs.readFileSync(f.abs, 'utf8');
    const { body, description } = stripFrontmatter(raw);
    const lines = body.split('\n');
    const base = path.basename(f.file);
    const dirName = path.basename(path.dirname(f.file));
    const fnDate = base.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1] ?? '';
    const h1 = lines.find((l) => /^#\s+\S/.test(l));
    // SOURCE.md 没有 H1 时用「<skill> · 来源」补，避免标题全是 "SOURCE.md"
    const title = h1 ? h1.replace(/^#\s+/, '').trim()
      : base === 'SOURCE.md' ? dirName + ' · 来源'
      : base.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    entries.push({
      file: f.file, group: classify(f.file), date: fnDate,
      slug: base.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
      title,
      tags: extractTags(f.file + '\n' + raw),
      summary: description ? firstSentence(description) : extractSummary(lines.slice(1).join('\n')),
      bytes: Buffer.byteLength(raw, 'utf8'), lines: lines.length, body,
    });
  }
  entries.sort((a, b) => (a.date === b.date ? a.file.localeCompare(b.file) : (b.date || '').localeCompare(a.date || '')));
  const totalBytes = entries.reduce((n, e) => n + e.bytes, 0);
  const tagFreq = {};
  for (const e of entries) for (const t of e.tags) tagFreq[t] = (tagFreq[t] || 0) + 1;
  return { entries, totalBytes, tagFreq, generatedAt: new Date().toISOString() };
}

const PAGE_CSS = [
  ':root{--bg:#fff;--fg:#1b1b1b;--dim:#6b7280;--line:#e5e7eb;--card:#fafafa;--acc:#2563eb;--warn:#b45309;--ok:#15803d;--mut:#9ca3af}',
  '@media(prefers-color-scheme:dark){:root{--bg:#131313;--fg:#e7e7e7;--dim:#9b9b9b;--line:#2c2c2c;--card:#1b1b1b;--acc:#60a5fa;--warn:#fbbf24;--ok:#4ade80;--mut:#6b6b6b}}',
  '*{box-sizing:border-box}',
  'html,body{margin:0;height:100%}',
  'body{font:14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased}',
  'a{color:var(--acc)}',
  '#app{display:flex;height:100%;overflow:hidden}',
  '#side{width:300px;flex:0 0 300px;border-right:1px solid var(--line);overflow-y:auto;padding:18px 16px 40px;background:var(--card)}',
  '#side h1{font-size:16px;margin:0 0 2px}',
  '#side .sub{font-size:12px;color:var(--dim);margin-bottom:14px}',
  '#main{flex:1;overflow-y:auto;padding:22px 26px 60px}',
  'input#q{width:100%;padding:8px 10px;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--fg);margin-bottom:14px}',
  'input#q:focus{outline:2px solid var(--acc);outline-offset:-1px;border-color:transparent}',
  '.grp{margin-bottom:16px}',
  '.grp>h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0 0 7px;font-weight:600}',
  '.chip{display:inline-block;padding:2px 9px;margin:0 4px 4px 0;border:1px solid var(--line);border-radius:20px;font-size:12px;cursor:pointer;background:var(--bg);color:var(--dim);user-select:none;transition:.12s}',
  '.chip:hover{border-color:var(--acc);color:var(--acc)}',
  '.chip.on{background:var(--acc);border-color:var(--acc);color:#fff}',
  '.chip .n{opacity:.6;margin-left:4px;font-size:11px}',
  '.chip.on .n{opacity:.85}',
  '.card{border:1px solid var(--line);border-radius:9px;padding:13px 15px;margin-bottom:9px;cursor:pointer;transition:.12s;background:var(--bg)}',
  '.card:hover{border-color:var(--acc);transform:translateX(2px)}',
  '.card .t{font-weight:600;font-size:14.5px;margin-bottom:3px;line-height:1.45}',
  '.card .meta{font-size:12px;color:var(--dim);display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:5px}',
  '.card .s{font-size:12.5px;color:var(--dim);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '.card .tg{margin-top:6px}',
  '.card .tg i{font-style:normal;font-size:11px;color:var(--mut);background:var(--card);border:1px solid var(--line);border-radius:4px;padding:1px 5px;margin-right:4px}',
  '.st{font-size:11px;padding:1px 7px;border-radius:4px;border:1px solid currentColor;font-weight:600}',
  '.st.进行中{color:var(--warn)}.st.已完成{color:var(--ok)}.st.已决策{color:var(--acc)}.st.已归档{color:var(--mut)}.st.记录{color:var(--dim)}.st.未标注{color:var(--mut);font-weight:400}',
  'mark{background:#fde68a;color:#000;border-radius:2px;padding:0 1px}',
  '@media(prefers-color-scheme:dark){mark{background:#7c5e10;color:#fff}}',
  '#hint{font-size:12.5px;color:var(--dim);margin-bottom:12px}',
  '#empty{color:var(--dim);padding:30px 0;text-align:center}',
  '/* 详情 */',
  '#detail h2{font-size:20px;margin:0 0 8px;line-height:1.4}',
  '#dmeta{font-size:12.5px;color:var(--dim);display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--line);align-items:center}',
  '#body{font-size:14px;line-height:1.8}',
  '#body h1,#body h2,#body h3{margin:22px 0 8px;line-height:1.4}',
  '#body h1{font-size:19px}#body h2{font-size:17px}#body h3{font-size:15px}#body h4,#body h5,#body h6{font-size:14px;margin:16px 0 6px}',
  '#body p{margin:9px 0}',
  '#body code{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font:12.5px ui-monospace,Consolas,monospace}',
  '#body pre{background:var(--card);border:1px solid var(--line);border-radius:7px;padding:11px 13px;overflow-x:auto}',
  '#body pre code{background:none;border:none;padding:0;font-size:12.5px;line-height:1.6}',
  '#body blockquote{border-left:3px solid var(--line);margin:10px 0;padding:2px 0 2px 13px;color:var(--dim)}',
  '#body ul,#body ol{padding-left:24px;margin:9px 0}',
  '#body li{margin:4px 0}',
  '#body table{border-collapse:collapse;margin:12px 0;font-size:13px;display:block;overflow-x:auto;max-width:100%}',
  '#body th,#body td{border:1px solid var(--line);padding:5px 9px;text-align:left}',
  '#body th{background:var(--card);font-weight:600}',
  '#body hr{border:none;border-top:1px solid var(--line);margin:18px 0}',
  '#body a{text-decoration:none;border-bottom:1px solid var(--line)}',
  '#body a:hover{border-color:var(--acc)}',
  'details.raw{margin-top:26px;border-top:1px solid var(--line);padding-top:12px}',
  'details.raw summary{cursor:pointer;color:var(--dim);font-size:12.5px}',
  'details.raw pre{white-space:pre-wrap;font-size:12px;color:var(--dim)}',
  '.back{display:inline-flex;align-items:center;gap:5px;margin-bottom:14px;font-size:13px;color:var(--dim);cursor:pointer;user-select:none}',
  '.back:hover{color:var(--acc)}',
  '::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--line);border-radius:5px}::-webkit-scrollbar-track{background:transparent}',
].join('\n');

const PAGE_JS = [
  '(function(){',
  'var S={q:"",st:null,tag:null,ym:null,file:null};',
  'var E=function(id){return document.getElementById(id);};',
  'var esc=function(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};',
  '',
  '/* 极简 markdown 渲染：标题/围栏代码/表格/引用/列表/分隔线/行内标记。只求可读，不求完备。 */',
  'function md(src){',
  '  var out=[],L=src.split(/\\r?\\n/),i=0,steps=0;',
  '  function inline(s){',
  '    s=esc(s);',
  '    s=s.replace(/`([^`]+)`/g,"<code>$1</code>");',
  '    s=s.replace(/\\*\\*([^*]+)\\*\\*/g,"<strong>$1</strong>");',
  '    s=s.replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s]+)\\)/g,"<a href=\\"$2\\" target=\\"_blank\\" rel=\\"noopener\\">$1</a>");',
  '    return s;',
  '  }',
  '  while(i<L.length&&steps++<L.length*4+64){',
  '    var l=L[i],guard=i;',
  '    if(/^\\s*```/.test(l)){',
  '      var buf=[];i++;',
  '      while(i<L.length&&!/^\\s*```/.test(L[i])){buf.push(L[i]);i++;}',
  '      i++;',
  '      out.push("<pre><code>"+esc(buf.join("\\n"))+"</code></pre>");continue;',
  '    }',
  '    var h=l.match(/^(#{1,6})\\s+(.*)$/);',
  '    if(h){out.push("<h"+h[1].length+">"+inline(h[2])+"</h"+h[1].length+">");i++;continue;}',
  '    if(/^\\s*([-*_])\\1{2,}\\s*$/.test(l)){out.push("<hr>");i++;continue;}',
  '    if(/^\\s*\\|/.test(l)&&i+1<L.length&&/^\\s*\\|[\\s:|-]+\\|\\s*$/.test(L[i+1])){',
  '      var head=L[i].split("|").slice(1,-1),rows=[];i+=2;',
  '      while(i<L.length&&/^\\s*\\|/.test(L[i])){rows.push(L[i].split("|").slice(1,-1));i++;}',
  '      var t="<table><thead><tr>";',
  '      head.forEach(function(c){t+="<th>"+inline(c.trim())+"</th>";});t+="</tr></thead><tbody>";',
  '      rows.forEach(function(r){t+="<tr>";r.forEach(function(c){t+="<td>"+inline(c.trim())+"</td>";});t+="</tr>";});',
  '      out.push(t+"</tbody></table>");continue;',
  '    }',
  '    if(/^\\s*>/.test(l)){',
  '      var q=[];',
  '      while(i<L.length&&/^\\s*>/.test(L[i])){q.push(L[i].replace(/^\\s*>\\s?/,""));i++;}',
  '      out.push("<blockquote>"+q.map(function(x){return "<p>"+inline(x)+"</p>";}).join("")+"</blockquote>");continue;',
  '    }',
  '    var ul=l.match(/^\\s*[-*+]\\s+(.*)$/),ol=l.match(/^\\s*\\d+[.)]\\s+(.*)$/);',
  '    if(ul||ol){',
  '      var tag=ul?"ul":"ol",items=[];',
  '      while(i<L.length){',
  '        var m2=L[i].match(ul?/^\\s*[-*+]\\s+(.*)$/:/^\\s*\\d+[.)]\\s+(.*)$/);',
  '        if(!m2)break;items.push("<li>"+inline(m2[1])+"</li>");i++;',
  '      }',
  '      out.push("<"+tag+">"+items.join("")+"</"+tag+">");continue;',
  '    }',
  '    if(!l.trim()){i++;continue;}',
  '    var p=[];',
  '    while(i<L.length&&L[i].trim()&&!/^\\s*(#{1,6}\\s|```|\\||>|[-*+]\\s|\\d+[.)]\\s)/.test(L[i])){p.push(L[i]);i++;}',
  '    if(i===guard){p.push(l);i++;}',
  '    out.push("<p>"+inline(p.join(" "))+"</p>");',
  '  }',
  '  return out.join("\\n");',
  '}',
  '',
  'function hit(e,q){',
  '  if(!q)return e.summary;',
  '  var low=q.toLowerCase(),at=e.body.toLowerCase().indexOf(low);',
  '  if(at<0)return e.summary;',
  '  var a=Math.max(0,at-50),b=Math.min(e.body.length,at+q.length+90);',
  '  return (a>0?"…":"")+e.body.slice(a,b).replace(/\\s+/g," ")+(b<e.body.length?"…":"");',
  '}',
  'function mk(s,q){',
  '  if(!q)return esc(s);',
  '  var i=s.toLowerCase().indexOf(q.toLowerCase());',
  '  if(i<0)return esc(s);',
  '  return esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+q.length))+"</mark>"+esc(s.slice(i+q.length));',
  '}',
  '',
  'function list(){',
  '  var q=S.q.toLowerCase();',
  '  return DATA.entries.filter(function(e){',
  '    if(S.st&&e.group!==S.st)return false;',
  '    if(S.tag&&e.tags.indexOf(S.tag)<0)return false;',
  '    if(S.ym&&e.date.slice(0,7)!==S.ym)return false;',
  '    if(q){',
  '      var hay=(e.title+" "+e.body+" "+e.tags.join(" ")).toLowerCase();',
  '      if(hay.indexOf(q)<0)return false;',
  '    }',
  '    return true;',
  '  });',
  '}',
  '',
  'function chip(label,n,on,attr){',
  '  return "<span class=\\"chip"+(on?" on":"")+"\\" "+attr+">"+esc(label)+(n!=null?"<span class=\\"n\\">"+n+"</span>":"")+"</span>";',
  '}',
  '',
  'function drawSide(){',
  '  var bySt={},byTag={},byYm={};',
  '  DATA.entries.forEach(function(e){',
  '    bySt[e.group]=(bySt[e.group]||0)+1;',
  '    e.tags.forEach(function(t){byTag[t]=(byTag[t]||0)+1;});',
  '    var y=e.date.slice(0,7);byYm[y]=(byYm[y]||0)+1;',
  '  });',
  '  var ORDER=["skills","适配说明","参考","库说明"];var sc=[];ORDER.forEach(function(g){if(bySt[g])sc.push([g,bySt[g]]);});Object.keys(bySt).forEach(function(g){if(ORDER.indexOf(g)<0)sc.push([g,bySt[g]]);});',
  '  E("fst").innerHTML=sc.map(function(p){',
  '    return chip(p[0],p[1],S.st===p[0],"data-st=\\""+p[0]+"\\"");',
  '  }).join("");',
  '  var top=Object.keys(byTag).sort(function(a,b){return byTag[b]-byTag[a]||a.localeCompare(b);}).slice(0,26);',
  '  E("ftag").innerHTML=top.map(function(t){return chip(t,byTag[t],S.tag===t,"data-tag=\\""+esc(t)+"\\"");}).join("");',
  '  var ys=Object.keys(byYm).sort().reverse();',
  '  E("fym").innerHTML=ys.map(function(y){return chip(y,byYm[y],S.ym===y,"data-ym=\\""+y+"\\"");}).join("");',
  '}',
  '',
  'function drawList(){',
  '  var rows=list();',
  '  var f=[];',
  '  if(S.st)f.push("分类="+S.st);',
  '  if(S.tag)f.push("标签="+S.tag);',
  '  if(S.ym)f.push("月份="+S.ym);',
  '  if(S.q)f.push("搜索="+S.q);',
  '  E("hint").innerHTML=f.length?("筛选 "+rows.length+" / "+DATA.entries.length+" 篇　"+esc(f.join("　"))+(f.length>1?"　<span class=\\"chip\\" data-clear=\\"1\\">清空</span>":"")):("共 "+DATA.entries.length+" 篇 · 点开看全文");',
  '  if(!rows.length){E("list").innerHTML="<div id=\\"empty\\">没有匹配的决策记录</div>";return;}',
  '  E("list").innerHTML=rows.map(function(e){',
  '    return "<div class=\\"card\\" data-file=\\""+esc(e.file)+"\\">"',
  '      +"<div class=\\"t\\">"+mk(e.title,S.q)+"</div>"',
  '      +"<div class=\\"meta\\"><span>"+e.date+"</span><span class=\\"st "+e.group+"\\">"+e.group+"</span>"',
  '      +"</div>"',
  '      +"<div class=\\"s\\">"+mk(hit(e,S.q),S.q)+"</div>"',
  '      +(e.tags.length?"<div class=\\"tg\\">"+e.tags.slice(0,5).map(function(t){return "<i>"+esc(t)+"</i>";}).join("")+"</div>":"")',
  '      +"</div>";',
  '  }).join("");',
  '}',
  '',
  'function drawDetail(e){',
  '  E("detail").innerHTML="<div class=\\"back\\" data-back=\\"1\\">← 返回列表</div>"',
  '    +"<h2>"+esc(e.title)+"</h2>"',
  '    +"<div id=\\"dmeta\\"><span>"+e.date+(e.dateNote?"（"+esc(e.dateNote)+"）":"")+"</span>"',
  '    +"<span class=\\"st "+e.group+"\\">"+e.group+"</span>"',
  '',
  '    +(e.owner?"<span>决策人 "+esc(e.owner)+"</span>":"")',
  '    +"<span>"+e.lines+" 行 · "+(e.bytes/1024).toFixed(1)+" KB</span>"',
  '    +"<span>"+esc(e.file)+"</span></div>"',
  '    +(e.purpose?"<p style=\\"color:var(--dim);font-size:13px\\">用途："+esc(e.purpose)+"</p>":"")',
  '    +"<div id=\\"body\\">"+md(e.body)+"</div>"',
  '    +"<details class=\\"raw\\"><summary>查看原始 markdown</summary><pre>"+esc(e.body)+"</pre></details>";',
  '}',
  '',
  'function draw(){',
  '  if(S.file){',
  '    var e=DATA.entries.filter(function(x){return x.file===S.file;})[0];',
  '    if(e){E("listwrap").hidden=true;E("detailwrap").hidden=false;drawDetail(e);E("main").scrollTop=0;return;}',
  '  }',
  '  E("detailwrap").hidden=true;E("listwrap").hidden=false;drawList();',
  '}',
  '',
  'function setHash(){',
  '  var h=S.file?("#"+encodeURIComponent(S.file)):"";',
  '  if(location.hash!==h)history.replaceState(null,"",h||location.pathname+location.search);',
  '}',
  '',
  'document.addEventListener("click",function(ev){',
  '  var t=ev.target.closest?ev.target.closest("[data-file],[data-st],[data-tag],[data-ym],[data-back],[data-clear]"):null;',
  '  if(!t)return;',
  '  if(t.hasAttribute("data-file")){S.file=t.getAttribute("data-file");}',
  '  else if(t.hasAttribute("data-st")){var v=t.getAttribute("data-st");S.st=S.st===v?null:v;}',
  '  else if(t.hasAttribute("data-tag")){var g=t.getAttribute("data-tag");S.tag=S.tag===g?null:g;}',
  '  else if(t.hasAttribute("data-ym")){var y=t.getAttribute("data-ym");S.ym=S.ym===y?null:y;}',
  '  else if(t.hasAttribute("data-back")){S.file=null;}',
  '  else if(t.hasAttribute("data-clear")){S.st=null;S.tag=null;S.ym=null;S.q="";E("q").value="";}',
  '  drawSide();draw();setHash();',
  '});',
  '',
  'var timer=null;',
  'E("q").addEventListener("input",function(){',
  '  clearTimeout(timer);',
  '  var v=this.value.trim();',
  '  timer=setTimeout(function(){S.q=v;S.file=null;draw();},140);',
  '});',
  'document.addEventListener("keydown",function(ev){',
  '  if(ev.key==="/"&&document.activeElement!==E("q")){ev.preventDefault();E("q").focus();}',
  '  if(ev.key==="Escape"){if(S.file){S.file=null;draw();setHash();}else if(document.activeElement===E("q")){E("q").blur();}}',
  '});',
  'window.addEventListener("hashchange",function(){',
  '  var f=location.hash?decodeURIComponent(location.hash.slice(1)):null;',
  '  S.file=(f&&DATA.entries.some(function(x){return x.file===f;}))?f:null;',
  '  draw();',
  '});',
  '',
  'if(location.hash){',
  '  var f0=decodeURIComponent(location.hash.slice(1));',
  '  if(DATA.entries.some(function(x){return x.file===f0;}))S.file=f0;',
  '}',
  'E("stat").innerHTML=DATA.entries.length+" 篇 · "+(DATA.totalBytes/1024/1024).toFixed(2)+" MB · "+DATA.generatedAt.slice(0,10);',
  'drawSide();draw();',
  '})();',
].join('\n');

function buildHtml(data) {
  // 内联 JSON 必须转义 < 与行分隔符，否则正文里的 </script> 会截断脚本块
  const payload = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return [
    '<!doctype html>',
    '<html lang="zh-CN"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>dsh-skills · 图书馆</title>',
    '<style>' + PAGE_CSS + '</style>',
    '</head><body>',
    '<div id="app">',
    '<aside id="side">',
    '<h1>dsh-skills</h1>',
    '<div class="sub" id="stat"></div>',
    '<input id="q" type="search" placeholder="搜索全文…（按 / 聚焦）" autocomplete="off">',
    '<div class="grp"><h2>分类</h2><div id="fst"></div></div>',
    '<div class="grp"><h2>月份</h2><div id="fym"></div></div>',
    '<div class="grp"><h2>标签（Top 26）</h2><div id="ftag"></div></div>',
    '</aside>',
    '<main id="main">',
    '<div id="listwrap"><div id="hint"></div><div id="list"></div></div>',
    '<div id="detailwrap" hidden><div id="detail"></div></div>',
    '</main>',
    '</div>',
    '<script>var DATA=' + payload + ';',
    PAGE_JS + '<\/script>',
    '</body></html>',
    '',
  ].join('\n');
}


const data = build();
fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), 'utf8');
const byGroup = {};
for (const e of data.entries) byGroup[e.group] = (byGroup[e.group] || 0) + 1;
console.log('\n  dsh-skills 图书馆 · 数据层');
console.log('  ' + '─'.repeat(52));
console.log('  篇数        ' + data.entries.length);
console.log('  总体积      ' + (data.totalBytes / 1024).toFixed(0) + ' KB');
console.log('  分类：');
for (const [g, n] of Object.entries(byGroup).sort((a, b) => b[1] - a[1])) console.log('    ' + String(n).padStart(3) + '  ' + g);
const noFm = data.entries.filter((e) => e.file.endsWith('SKILL.md')).length;
console.log('  \n  ✓ 写出 ' + path.relative(HERE, OUT_JSON));
if (!process.argv.includes('--json-only')) {
  fs.writeFileSync(OUT_HTML, buildHtml(data), 'utf8');
  console.log('  ✓ 写出 ' + path.relative(HERE, OUT_HTML) + '  (' + (fs.statSync(OUT_HTML).size / 1024 / 1024).toFixed(2) + ' MB)');
}
console.log('');
