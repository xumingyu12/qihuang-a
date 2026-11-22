/* 岐黄智谱 · 公共 UI 工具 */
(function () {
  'use strict';
  const QH = window.QH;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const pct = (v, d) => (v == null ? '—' : (v * 100).toFixed(d == null ? 0 : d) + '%');
  const num = (v, d) => (v == null || v === '' ? '—' : Number(v).toFixed(d == null ? 1 : d));
  const band = (v) => (v >= 0.85 ? 'high' : v >= 0.65 ? 'mid' : 'low');

  /* ---------- 提示 ---------- */
  let toastTimer = null;
  function toast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:38px;transform:translateX(-50%);background:#1b2a24;' +
        'color:#f6efe0;padding:8px 16px;border-radius:999px;font-size:12px;z-index:99;opacity:0;' +
        'transition:opacity .2s;pointer-events:none;box-shadow:0 8px 24px rgba(27,42,36,.25)';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1900);
  }

  /* ---------- 抽屉 ---------- */
  function drawer(title, sub, body) {
    let d = $('#drawer');
    if (!d) {
      d = document.createElement('aside');
      d.id = 'drawer';
      d.className = 'drawer';
      d.innerHTML = '<div class="drawer-h"><div><div class="kicker" id="dKick"></div>' +
        '<h3 id="dTitle" style="font-size:16px;margin:2px 0 0"></h3></div>' +
        '<button class="drawer-x" onclick="QHUI.closeDrawer()" aria-label="关闭">×</button></div>' +
        '<div class="drawer-b" id="dBody"></div>';
      document.body.appendChild(d);
    }
    $('#dKick').textContent = sub || '';
    $('#dTitle').textContent = title || '';
    $('#dBody').innerHTML = body || '';
    d.classList.add('on');
  }
  function closeDrawer() {
    const d = $('#drawer');
    if (d) d.classList.remove('on');
  }

  /* ---------- 证据 ---------- */
  const KIND_ICO = { 古籍: '古', 方书: '方', 数据库: '库', 文献: '文', 病历: '历', 结构: '构' };
  function levelBadge(level) { return `<span class="badge ${level}" title="证据等级 ${level}">${level}</span>`; }

  function evidenceRow(e, opts) {
    opts = opts || {};
    return `<div class="evidence" data-ev="${e.id}" onclick="QHUI.evidence('${e.id}')">
      <div class="ico">${KIND_ICO[e.kind] || '证'}</div>
      <div class="tt">
        <div class="t1">${esc(e.title)}</div>
        <div class="t2">${esc(e.source)}</div>
      </div>
      <div class="rt">
        ${levelBadge(e.level)}
        <span class="mono" style="font-size:10px;color:#7c8a82">${Math.round(e.conf * 100)}%</span>
      </div>
    </div>`;
  }

  function evidence(id) {
    const e = QH.idx.evidence(id);
    if (!e) return;
    drawer(e.title, `证据 · ${e.kind} · ${e.id}`, `
      <div class="quote">${esc(e.quote)}</div>
      <div class="meta-row"><span class="k">出处</span><span class="v">${esc(e.source)}</span></div>
      <div class="meta-row"><span class="k">证据等级</span><span class="v">${levelBadge(e.level)} ${['', '系统评价/RCT', '队列/古籍原文', '专家经验/数据库条目', '模型/推断'][['A', 'B', 'C', 'D'].indexOf(e.level) + 1] || ''}</span></div>
      <div class="meta-row"><span class="k">置信度</span><span class="v">${Math.round(e.conf * 100)}%</span></div>`);
  }

  /* ---------- 小部件 ---------- */
  function barRow(label, value, max, opts) {
    opts = opts || {};
    const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
    return `<div class="rowbar"><span style="flex:0 0 ${opts.w || 88}px;font-size:11.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</span>
      <div class="bar ${opts.cls || ''}" style="flex:1"><i style="width:${w}%"></i></div>
      <span class="v">${opts.text || num(value, opts.d == null ? 1 : opts.d)}</span></div>`;
  }

  function kv(k, v) { return `<div class="meta-row"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`; }

  function confPill(v) {
    const c = v >= 0.85 ? 'g' : v >= 0.65 ? 'gold' : 'w';
    return `<span class="tag ${c}" title="置信度">置信 ${Math.round(v * 100)}%</span>`;
  }

  /* 简单水平柱状图（SVG），返回字符串 */
  function hbars(items, opts) {
    opts = opts || {};
    const w = opts.w || 320, h = opts.h || 18, gap = 6, max = opts.max || Math.max(...items.map((i) => i.v)) * 1.05;
    const rows = items.map((it, i) => {
      const y = i * (h + gap);
      const bw = Math.max(1, (it.v / max) * (w - 110));
      return `<g><text x="0" y="${y + h - 5}" font-size="10.5">${esc(it.k)}</text>
        <rect x="96" y="${y + 2}" width="${bw}" height="${h - 6}" rx="3" fill="${it.c || '#2f7d63'}" opacity=".85"></rect>
        <text x="${96 + bw + 5}" y="${y + h - 5}" font-size="10">${esc(it.v)}</text></g>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${w} ${items.length * (h + gap)}" height="${items.length * (h + gap)}">${rows}</svg>`;
  }

  /* 森林图：行 {k, diff, ci:[lo,hi], p} */
  function forest(rows, opts) {
    opts = opts || {};
    const W = opts.w || 560, rowH = 34, padL = 150, padR = 92, top = 24;
    const H = top + rows.length * rowH + 10;
    const vals = rows.filter((r) => r.ci).flatMap((r) => [r.ci[0], r.ci[1], r.diff]);
    const lo = Math.min(-2, ...vals) - 1, hi = Math.max(2, ...vals) + 1;
    const x = (v) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);
    let g = '';
    // 0 参考线
    g += `<line class="ref" x1="${x(0)}" y1="${top - 6}" x2="${x(0)}" y2="${H - 6}"></line>`;
    g += `<text x="${x(0)}" y="${top - 10}" text-anchor="middle">0</text>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH + 8;
      g += `<text x="0" y="${y + 4}" font-size="11">${esc(r.k)}</text>`;
      if (r.ci) {
        g += `<line x1="${x(r.ci[0])}" y1="${y}" x2="${x(r.ci[1])}" y2="${y}" stroke="#2f7d63" stroke-width="1.6"></line>
          <circle cx="${x(r.diff)}" cy="${y}" r="4.4" fill="#1d5a48"></circle>`;
        g += `<text x="${W - padR + 6}" y="${y + 4}" font-size="10" fill="#3c4b44">${r.diff > 0 ? '+' : ''}${r.diff}${r.unit || ''} (${r.ci[0]}, ${r.ci[1]})</text>`;
      } else {
        g += `<text x="${x(0)}" y="${y + 4}" font-size="10" fill="#7c8a82">—</text>`;
      }
      g += `<text x="${W - 26}" y="${y + 4}" font-size="10" fill="${r.p < 0.05 ? '#1d5a48' : '#a4632a'}">p=${r.p}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" height="${H}">${g}</svg>`;
  }

  /* SMD 哑铃图（配对前后） */
  function dumbbell(rows, opts) {
    opts = opts || {};
    const W = opts.w || 520, rowH = 30, padL = 118, padR = 58;
    const H = 26 + rows.length * rowH + 8;
    const max = 0.3;
    const x = (v) => padL + Math.min(v, max) / max * (W - padL - padR);
    let g = `<line class="ref" x1="${x(0.1)}" y1="14" x2="${x(0.1)}" y2="${H - 6}"></line>
      <text x="${x(0.1)}" y="10" text-anchor="middle">0.1</text>`;
    rows.forEach((r, i) => {
      const y = 26 + i * rowH + 6;
      g += `<text x="0" y="${y + 4}" font-size="10.5">${esc(r.k)}</text>`;
      g += `<line x1="${x(r.bef)}" y1="${y}" x2="${x(r.aft)}" y2="${y}" stroke="#d8cfbe" stroke-width="2"></line>`;
      g += `<circle cx="${x(r.bef)}" cy="${y}" r="4" fill="#c08a3e"></circle>
        <circle cx="${x(r.aft)}" cy="${y}" r="4" fill="#1d5a48"></circle>
        <text x="${W - padR + 6}" y="${y + 4}" font-size="9.5" fill="#7c8a82">${r.bef.toFixed(2)}→${r.aft.toFixed(2)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" height="${H}">${g}</svg>`;
  }

  /* ---------- 3Dmol 帮助 ---------- */
  function render3d(el, sdf, opts) {
    if (!window.$3Dmol || !sdf) {
      el.innerHTML = '<p style="color:#7c8a82;font-size:11.5px;text-align:center">3D 组件未加载</p>';
      return null;
    }
    const v = $3Dmol.createViewer(el, { backgroundColor: 'rgba(255,255,255,0)' });
    v.addModel(sdf, 'sdf');
    v.setStyle({}, { stick: { radius: 0.13, colorscheme: 'Jmol' }, sphere: { scale: 0.24, colorscheme: 'Jmol' } });
    v.zoomTo();
    v.render();
    return v;
  }

  window.QHUI = {
    esc, $, $$, pct, num, band, toast, drawer, closeDrawer,
    evidence, evidenceRow, levelBadge, barRow, kv, confPill, hbars, forest, dumbbell, render3d
  };
})();
