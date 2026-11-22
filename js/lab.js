/* 岐黄智谱 · 工作台前端（数据全部来自 data/lab-data.js，由 pipeline/build_web.py 生成） */
(function () {
  'use strict';
  const D = window.QHLAB || { ligands: [], targets: [], results: [], matrix: {}, poses: {}, validation: { cases: [] } };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const num = (v, d) => (v == null ? '—' : Number(v).toFixed(d == null ? 1 : d));

  const S = { tab: 'screen', lig: null, tgt: null, sort: 'mw', dir: 1, f: { mwMin: 0, mwMax: 900, logpMax: 6, tpsaMax: 300, qedMin: 0, pains: false, lipinski: false, veber: false } };

  const resKey = (l, t) => l + '_' + t;
  const resOf = (l, t) => (D.results || []).find((r) => r.ligand === l && r.target === t);
  const lig = (id) => (D.ligands || []).find((x) => x.id === id);
  const tgt = (id) => (D.targets || []).find((x) => x.pdb === id);

  /* ---------------- 通用 ---------------- */
  function pdbText(atoms, extra) {
    let out = '';
    atoms.forEach((a, i) => {
      const e = (a.e || 'C').padEnd(2, ' ').slice(0, 2);
      out += 'ATOM  ' + String(i + 1).padStart(5) + ' ' + (a.an || 'CA').padEnd(4).slice(0, 4) + ' ' +
        (a.rn || 'UNK').padEnd(3) + ' ' + (a.ch || 'A') + String(a.ri || 1).padStart(4) +
        '    ' + a.x.toFixed(3).padStart(8) + a.y.toFixed(3).padStart(8) + a.z.toFixed(3).padStart(8) +
        '  1.00  0.00          ' + e + '\n';
    });
    return out + (extra || '') + 'END\n';
  }

  /* 口袋点云单独做成一个"伪分子"模型：走原子渲染通道，一定能显示出来
   *（3Dmol 的 addSphere 在部分构建里不参与 zoomTo/拾取，实测不出来） */
  function pocketPdb(points) {
    const atoms = (points || []).map((p) => ({ x: p[0], y: p[1], z: p[2], e: 'C', an: 'C', rn: 'PKT', ch: 'P', ri: 1 }));
    return atoms.length ? pdbText(atoms) : '';
  }

  /* 配体位姿：用 PDB + CONECT 渲染，和蛋白同一条解析路径 */
  function posePdb(pose) {
    if (!pose || !pose.elem || !pose.elem.length) return '';
    const atoms = pose.xyz.map((p, i) => ({ x: p[0], y: p[1], z: p[2], e: pose.elem[i], an: pose.elem[i], rn: 'LIG', ch: 'L', ri: 1 }));
    let txt = pdbText(atoms);
    const nb = {};
    (pose.bonds || []).forEach(([a, b]) => {
      (nb[a] = nb[a] || []).push(b + 1);
      (nb[b] = nb[b] || []).push(a + 1);
    });
    Object.keys(nb).forEach((a) => {
      const partners = nb[a];
      for (let i = 0; i < partners.length; i += 4) {
        txt += 'CONECT' + String(Number(a) + 1).padStart(5) + partners.slice(i, i + 4).map((x) => String(x).padStart(5)).join('') + '\n';
      }
    });
    return txt + 'END\n';
  }

  function viewer(el, opts) {
    if (!window.$3Dmol) return null;
    try {
      el.innerHTML = '';                       // 清掉上一次的 canvas，避免叠加
      const v = $3Dmol.createViewer(el, { backgroundColor: 'white' });
      if (!v) return null;
      if (opts && opts.pdb) v.addModel(opts.pdb, 'pdb');
      if (opts && opts.sdf) v.addModel(opts.sdf, 'sdf');
      return v;
    } catch (err) {
      el.innerHTML = '<div style="padding:20px;color:#a4632a;font-size:12px;text-align:center">3D 组件初始化失败：' +
        esc(err.message) + '<br>多半是浏览器未启用 WebGL</div>';
      return null;
    }
  }

  /* ---------------- ① 成分筛选 ---------------- */
  function screenHtml() {
    const f = S.f;
    return `
      <div class="row">
        <div style="flex:1;min-width:0">
          <div class="card">
            <div class="filters">
              <div class="field"><label>MW 下限</label><input type="number" id="mwMin" value="${f.mwMin}" step="10"></div>
              <div class="field"><label>MW 上限</label><input type="number" id="mwMax" value="${f.mwMax}" step="10"></div>
              <div class="field"><label>LogP ≤</label><input type="number" id="logpMax" value="${f.logpMax}" step="0.5"></div>
              <div class="field"><label>TPSA ≤</label><input type="number" id="tpsaMax" value="${f.tpsaMax}" step="10"></div>
              <div class="field"><label>QED ≥</label><input type="number" id="qedMin" value="${f.qedMin}" step="0.1" min="0" max="1"></div>
              <label class="check"><input type="checkbox" id="ckPains" ${f.pains ? 'checked' : ''}>仅通过 PAINS</label>
              <label class="check"><input type="checkbox" id="ckLip" ${f.lipinski ? 'checked' : ''}>Lipinski 违规 ≤1</label>
              <label class="check"><input type="checkbox" id="ckVeber" ${f.veber ? 'checked' : ''}>Veber 通过</label>
              <button class="btn" id="btnReset">重置</button>
              <span class="muted" id="cnt" style="margin-left:auto"></span>
            </div>
          </div>
          <div class="card" style="margin-top:10px">
            <div class="card-h"><span>成分库</span><small>点列名排序 · 点行看结构</small></div>
            <div class="scroll" style="max-height:calc(100vh - 300px)" id="tbl"></div>
          </div>
        </div>
        <div style="width:380px;flex:0 0 380px" id="ligPanel"></div>
      </div>`;
  }

  function screenRows() {
    const f = S.f;
    return D.ligands.filter((x) =>
      x.mw >= f.mwMin && x.mw <= f.mwMax && x.logp <= f.logpMax && x.tpsa <= f.tpsaMax &&
      x.qed >= f.qedMin && (!f.pains || !x.pains) && (!f.lipinski || x.lipinski_viol <= 1) &&
      (!f.veber || x.veber_ok));
  }

  function renderScreen() {
    const rows = screenRows().slice().sort((a, b) => (a[S.sort] > b[S.sort] ? S.dir : a[S.sort] < b[S.sort] ? -S.dir : 0));
    const cols = [['id', 'ID'], ['cn', '名称'], ['herb', '药味'], ['mw', 'MW'], ['logp', 'LogP'], ['tpsa', 'TPSA'],
      ['hbd', 'HBD'], ['hba', 'HBA'], ['rotb', 'RotB'], ['qed', 'QED'], ['heavy', '重原子']];
    const bestOf = (id) => {
      const m = D.matrix[id] || {};
      const v = Object.values(m).filter((x) => x && x.st === 'ok').map((x) => x.s);
      return v.length ? Math.min(...v) : null;
    };
    $('#cnt').textContent = `${rows.length} / ${D.ligands.length} 个成分 · ${(D.results || []).filter((r) => r.status === 'ok').length} 条有效位姿`;
    $('#tbl').innerHTML = `<table><thead><tr>
      ${cols.map(([k, t]) => `<th class="${['mw', 'logp', 'tpsa', 'hbd', 'hba', 'rotb', 'qed', 'heavy'].includes(k) ? 'num' : ''}" data-k="${k}">${t}</th>`).join('')}
      <th class="num" title="只统计有效位姿（无冲突、接触残基≥8、ΔE<0）">最佳有效</th><th class="nos">警报</th></tr></thead><tbody>
      ${rows.map((x) => {
        const best = bestOf(x.id);
        const bad = [x.pains ? 'PAINS' : '', x.brenk ? 'Brenk' : '', x.lipinski_viol ? 'Lipinski' + x.lipinski_viol : ''].filter(Boolean);
        return `<tr data-id="${x.id}" class="${S.lig === x.id ? 'sel' : ''}">
          <td class="mono">${x.id}</td><td>${esc(x.cn)}</td><td class="muted">${esc(x.herb)}</td>
          <td class="num">${num(x.mw, 1)}</td><td class="num">${num(x.logp, 2)}</td><td class="num">${num(x.tpsa, 1)}</td>
          <td class="num">${x.hbd}</td><td class="num">${x.hba}</td><td class="num">${x.rotb}</td>
          <td class="num">${num(x.qed, 3)}</td><td class="num">${x.heavy}</td>
          <td class="num">${best == null ? '<span class="muted">—</span>' : '<span class="tag g">' + num(best, 1) + '</span>'}</td>
          <td>${bad.map((b) => `<span class="tag ${b === 'Lipinski' + x.lipinski_viol ? 'w' : 'r'}">${b}</span>`).join(' ')}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
    $$('#tbl th[data-k]').forEach((th) => th.onclick = () => {
      const k = th.dataset.k;
      if (S.sort === k) S.dir = -S.dir; else { S.sort = k; S.dir = 1; }
      renderScreen();
    });
    $$('#tbl tbody tr').forEach((tr) => tr.onclick = () => { S.lig = tr.dataset.id; renderScreen(); renderLigPanel(); });
    if (S.lig) renderLigPanel();
  }

  function renderLigPanel() {
    const p = $('#ligPanel');
    if (!p) return;
    const x = lig(S.lig);
    if (!x) { p.innerHTML = `<div class="card"><div class="card-h"><span>成分详情</span></div><div class="card-b muted">左侧点一行</div></div>`; return; }
    const rows = (D.results || []).filter((r) => r.ligand === x.id).sort((a, b) => a.score - b.score);
    p.innerHTML = `
      <div class="card">
        <div class="card-h"><span>${esc(x.cn)} <small>${esc(x.en)}</small></span><small class="mono">${x.id}</small></div>
        <div class="card-b">
          <div style="display:flex;gap:10px">
            <div class="viewer" style="width:180px;height:150px;flex:0 0 180px"><div class="gl" id="lig2d" style="display:grid;place-items:center;padding:4px">
              <img src="${esc(x.svg)}" style="max-width:100%;max-height:100%" alt=""></div></div>
            <div class="viewer" style="flex:1;height:150px"><div class="gl" id="lig3d"></div></div>
          </div>
          <div style="margin-top:8px">
            <div class="kv"><span class="k">分子式 / MW</span><span>${esc(x.formula)} · ${num(x.mw, 2)}</span></div>
            <div class="kv"><span class="k">LogP / TPSA</span><span>${num(x.logp, 2)} / ${num(x.tpsa, 1)}</span></div>
            <div class="kv"><span class="k">HBD / HBA / RotB</span><span>${x.hbd} / ${x.hba} / ${x.rotb}</span></div>
            <div class="kv"><span class="k">QED / 重原子 / 构象</span><span>${num(x.qed, 3)} / ${x.heavy} / ${x.n_confs}</span></div>
            <div class="kv"><span class="k">结构警报</span><span>${[x.pains && 'PAINS:' + (x.pains_desc || ''), x.brenk && 'Brenk:' + (x.brenk_desc || '')].filter(Boolean).join('；') || '无'}</span></div>
          </div>
          <div class="mono" style="font-size:10px;word-break:break-all;color:var(--muted);margin-top:6px">${esc(x.smiles)}</div>
          ${rows.length ? `<div class="card-h" style="margin:10px -11px 0;border-top:1px solid var(--line-2)"><span>该分子的对接结果</span></div>
          <table><tbody>${rows.map((r) => `<tr data-l="${x.id}" data-t="${r.target}" style="cursor:pointer">
            <td>${r.target} <span class="muted">${esc(r.gene)}</span></td><td class="num">${num(r.score, 1)}</td>
            <td class="num muted">LE ${num(r.le, 2)}</td><td class="num">${r.n_hbond} H</td></tr>`).join('')}</tbody></table>` : ''}
        </div>
      </div>`;
    const v = viewer($('#lig3d'), { sdf: x.confSdf });
    if (v) {
      v.setStyle({}, { stick: { radius: 0.14, colorscheme: 'Jmol' }, sphere: { scale: 0.22, colorscheme: 'Jmol' } });
      v.zoomTo(); v.render();
    }
    $$('#ligPanel tr[data-t]').forEach((tr) => tr.onclick = () => { S.tgt = tr.dataset.t; go('dock'); });
  }

  /* ---------------- ② 靶点与口袋 ---------------- */
  function targetsHtml() {
    return `<div class="row">
      <div style="width:230px;flex:0 0 230px">
        <div class="card"><div class="card-h"><span>靶点</span><small>${D.targets.length} 个</small></div>
          <div class="card-b" id="tgtList" style="padding:6px"></div></div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="card"><div class="card-h"><span id="tgtTitle">—</span><small id="tgtSub"></small></div>
          <div class="card-b" style="padding:0">
            <div class="viewer" style="height:520px;border:0;border-radius:0">
              <div class="gl" id="tgt3d"></div>
              <div class="vtools">
                <button data-a="pts">口袋点</button><button data-a="res">口袋残基</button>
                <button data-a="bg">蛋白骨架</button><button data-a="spin">旋转</button><button data-a="reset">复位</button>
              </div>
              <div class="legend"><i style="background:#2f7d63"></i>口袋点 &nbsp;<i style="background:#b5703a"></i>口袋残基 &nbsp;<i style="background:#9aa79f"></i>其余</div>
            </div>
          </div>
        </div>
      </div>
      <div style="width:400px;flex:0 0 400px" id="pocketPanel"></div>
    </div>`;
  }

  let tv = null;
  const tstate = { pts: true, res: true, bg: true, spin: false, pocket: 1 };

  function renderTargets() {
    if (!S.tgt) S.tgt = D.targets[0] && D.targets[0].pdb;
    $('#tgtList').innerHTML = D.targets.map((t) => `
      <div class="tr-item" data-p="${t.pdb}" style="padding:6px 7px;border-radius:7px;cursor:pointer;
        ${S.tgt === t.pdb ? 'background:var(--green-soft)' : ''}">
        <div style="font-size:12px"><b>${esc(t.gene)}</b> <span class="muted mono">${t.pdb}</span></div>
        <div class="muted" style="font-size:10.5px">${esc(t.name)} · ${t.atoms} 原子</div>
        <div style="margin-top:2px"><span class="tag ${t.org === '病毒' ? 'v' : 'g'}">${t.org}</span>
        <span class="tag">口袋 ${t.pockets.length}</span></div>
      </div>`).join('');
    $$('#tgtList .tr-item').forEach((el) => el.onclick = () => { S.tgt = el.dataset.p; tstate.pocket = 1; renderTargets(); });
    const t = tgt(S.tgt);
    if (!t) return;
    const pk = t.pockets.find((p) => p.rank === tstate.pocket) || t.pockets[0];
    $('#tgtTitle').textContent = `${t.gene} · ${t.name}`;
    $('#tgtSub').textContent = `${t.pdb} · ${t.org} · ${t.atoms} 原子 / ${t.residues} 残基 · ${esc(t.role)}`;
    $('#pocketPanel').innerHTML = `
      <div class="card">
        <div class="card-h"><span>口袋</span><small>PSP 射线法 · 埋闭度按 14 条射线</small></div>
        <div class="card-b" style="padding:0">
          <table><thead><tr><th class="nos">#</th><th class="num">体积 Å³</th><th class="num">半径</th>
            <th class="num">埋闭</th><th class="num">残基</th></tr></thead>
          <tbody>${t.pockets.map((p) => `<tr data-pk="${p.rank}" style="cursor:pointer" class="${p.rank === tstate.pocket ? 'sel' : ''}">
            <td>${p.rank}</td><td class="num">${num(p.volume, 0)}</td><td class="num">${num(p.radius, 1)}</td>
            <td class="num">${num(p.enclosure, 1)}</td><td class="num">${p.residues.length}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card" style="margin-top:10px">
        <div class="card-h"><span>口袋 #${pk.rank} 残基</span><small>${pk.residues.length} 个</small></div>
        <div class="card-b" style="max-height:200px;overflow:auto">
          <div class="chips">${pk.residues.slice(0, 40).map((r) => `<span class="tag">${r.resname}${r.resid}</span>`).join('')}</div>
        </div>
      </div>
      <div class="card" style="margin-top:10px">
        <div class="card-h"><span>共晶配体</span><small>用于验证口袋位置</small></div>
        <div class="card-b">${t.crystal ? `
          <div class="kv"><span class="k">配体代码</span><span class="mono">${t.crystal.code}（${t.crystal.n_atoms} 原子）</span></div>
          <div class="kv"><span class="k">最近口袋</span><span>#${t.crystal.nearest_pocket}，相距 ${num(t.crystal.pocket_dist, 1)} Å</span></div>
          <div class="kv"><span class="k">与蛋白最小距离</span><span>${num(t.crystal.min_dist, 2)} Å ${t.crystal.covalent ? '<span class="tag r">共价</span>' : ''}</span></div>` :
          '<div class="muted">该结构无小分子配体</div>'}</div>
      </div>`;
    $$('#pocketPanel tr[data-pk]').forEach((tr) => tr.onclick = () => { tstate.pocket = +tr.dataset.pk; renderTargets(); });
    drawTarget3D(t, pk);
  }

  function drawTarget3D(t, pk) {
    const el = $('#tgt3d');
    if (!el) return;
    if (tv) { try { tv.clear(); } catch (e) { } }
    const atoms = t.atomList || [];
    tv = viewer(el, { pdb: pdbText(atoms) });
    if (!tv) return;

    // model 0：蛋白（口袋附近的原子）
    tv.setStyle({ model: 0 }, tstate.bg ? { line: { linewidth: 1, color: '#9aa79f' } } : {});

    // 口袋残基：用 PDB 原子序号（serial）选中，3Dmol 的 atomi 选择器无效
    if (tstate.res && pk && pk.residues.length) {
      const names = new Set(pk.residues.map((r) => r.resname + r.resid));
      const serials = [];
      atoms.forEach((a, i) => { if (names.has(a.rn + a.ri)) serials.push(i + 1); });
      if (serials.length) {
        tv.setStyle({ model: 0, serial: serials }, { stick: { radius: 0.15, color: '#b5703a' } });
      }
    }

    // 口袋点云：单独一个模型，用 sphere 渲染（走原子通道，保证可见）
    if (tstate.pts && pk && pk.points && pk.points.length) {
      const txt = pocketPdb(pk.points);
      if (txt) {
        tv.addModel(txt, 'pdb');
        tv.setStyle({ model: 1 }, { sphere: { scale: 0.62, color: '#2f7d63', opacity: 0.55 } });
      }
    }

    tv.zoomTo(); tv.render();
    if (tstate.spin) tv.spin('y');
    $$('#v-targets .vtools button').forEach((b) => {
      b.classList.toggle('on', !!(tstate[b.dataset.a] === undefined ? false : tstate[b.dataset.a]));
    });
    // 右下角显示当前画了什么，便于自查（也方便你确认口袋点/残基有没有出来）
    const info = document.querySelector('#v-targets .legend');
    if (info) {
      const nRes = (pk && pk.residues) ? pk.residues.length : 0;
      const nPts = (pk && pk.points) ? pk.points.length : 0;
      info.innerHTML = `<i style="background:#2f7d63"></i>口袋点 ${tstate.pts ? nPts : 0} 个 `
        + `&nbsp;<i style="background:#b5703a"></i>口袋残基 ${tstate.res ? nRes : 0} 个 `
        + `&nbsp;<i style="background:#9aa79f"></i>原子 ${atoms.length} 个`;
    }
    $$('#v-targets .vtools button').forEach((b) => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'pts') tstate.pts = !tstate.pts;
      if (a === 'res') tstate.res = !tstate.res;
      if (a === 'bg') tstate.bg = !tstate.bg;
      if (a === 'spin') tstate.spin = !tstate.spin;
      if (a === 'reset') { tstate.spin = false; tv.zoomTo(); tv.render(); return; }
      drawTarget3D(t, pk);
    });
  }

  /* ---------------- ③ 对接结果 ---------------- */
  function dockHtml() {
    return `<div class="row">
      <div style="width:250px;flex:0 0 250px">
        <div class="card"><div class="card-h"><span>小分子</span><small id="dLigCnt"></small></div>
          <div class="card-b" style="max-height:560px;overflow:auto" id="dLigList"></div></div>
      </div>
      <div style="flex:1;min-width:0" id="dockMain"></div>
      <div style="width:300px;flex:0 0 300px" id="dockSide"></div>
    </div>`;
  }

  function renderDock() {
    if (!S.lig) S.lig = D.results[0] && D.results[0].ligand;
    if (!S.tgt) S.tgt = D.results[0] && D.results[0].target;
    const avail = D.results.filter((r) => r.ligand === S.lig);
    $('#dLigCnt').textContent = `${avail.length} 个靶点有结果`;
    $('#dLigList').innerHTML = D.ligands.map((l) => {
      const nOk = D.results.filter((x) => x.ligand === l.id && x.status === 'ok').length;
      return `<div class="dl" data-l="${l.id}" style="padding:4px 6px;border-radius:6px;cursor:pointer;
        ${S.lig === l.id ? 'background:var(--green-soft)' : ''}">
        <span style="font-size:11.5px">${esc(l.cn)}</span>
        <span class="muted mono" style="font-size:10px">${l.id}</span>
        <span class="tag ${nOk ? 'g' : ''}" style="float:right" title="有效位姿个数">${nOk ? nOk + ' 有效' : '—'}</span></div>`;
    }).join('');
    $$('#dLigList .dl').forEach((el) => el.onclick = () => { S.lig = el.dataset.l; renderDock(); });

    const r = resOf(S.lig, S.tgt);
    const L = lig(S.lig), T = tgt(S.tgt);
    if (!r) {
      $('#dockMain').innerHTML = `<div class="card"><div class="card-h"><span>${esc(L ? L.cn : '')} × ${esc(T ? T.gene : '')}</span></div>
        <div class="card-b muted">该组合未计算（矩阵中为灰格）</div></div>`;
      $('#dockSide').innerHTML = '';
      return;
    }
    const rankList = D.results.filter((x) => x.target === r.target && (x.status === 'ok' || x.status === 'loose')).sort((a, b) => a.score - b.score);
    const rank = rankList.findIndex((x) => x.ligand === r.ligand) + 1;
    const stTag = r.status === 'clash' ? '<span class="tag r">有原子冲突 · 不采信</span>'
      : r.status === 'toobig' ? '<span class="tag r">装不进口袋</span>'
        : r.status === 'unfav' ? '<span class="tag w">位姿成立但能量不利</span>'
          : r.status === 'loose' ? '<span class="tag w">接触偏少 · 参考</span>' : '<span class="tag g">有效位姿</span>';
    const usable = r.status === 'ok' || r.status === 'unfav' || r.status === 'loose';
    const t = r.terms;
    const barRow = (k, v, max) => {
      const mx = Math.max(max, Math.abs(v));
      return `<div class="kv"><span class="k">${k}</span>
      <span style="flex:1;margin:0 8px"><div class="bar ${v > 0 ? 'neg' : ''}"><i style="width:${Math.min(100, Math.abs(v) / mx * 100)}%"></i></div></span>
      <span class="mono" style="width:58px;text-align:right">${v.toFixed(1)}</span></div>`;
    };
    $('#dockMain').innerHTML = `
      <div class="card">
        <div class="card-h"><span>${esc(L.cn)} <small>${esc(L.en)}</small> × ${esc(T.gene)} <small>${esc(T.name)}</small></span>
          <small>口袋 #${r.pocket} · 构象 #${r.conf} · ${stTag}</small></div>
        <div class="card-b">
          <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
            <div style="flex:0 0 auto">
              <div class="metric"><b style="font-size:30px">${num(r.score, 1)}</b><span>名义 kcal/mol</span></div>
              <div class="muted" style="font-size:11px;margin-top:2px">配体效率 ${usable ? num(r.le, 2) : '—'} · ${rank > 0 ? '该靶点第 ' + rank + '/' + rankList.length : '未进入排序（' + ({ toobig: '装不下', clash: '有冲突', unfav: '能量不利', loose: '接触少' }[r.status] || r.status) + '）'}</div>
            </div>
            <div style="flex:1;min-width:240px">
              ${barRow('范德华 vdW', t.vdw, 30)}${barRow('疏水 hyd', t.hyd, 30)}
              ${barRow('氢键 hb', t.hb, 12)}${barRow('静电 elec', t.elec, 20)}${barRow('冲突 clash', t.clash, 30)}
              <div class="muted" style="font-size:10.5px;margin-top:4px">总分 = 五项之和（不封顶）；数值越大说明原子撞得越厉害，正数不代表结合</div>
            </div>
          </div>
        </div>
        <div class="viewer" style="height:420px;border:0;border-top:1px solid var(--line-2);border-radius:0">
          <div class="gl" id="pose3d"></div>
          <div class="vtools"><button data-a="style">球棍/线框</button><button data-a="res">口袋残基</button><button data-a="spin">旋转</button></div>
          <div class="legend"><i style="background:#f0a04b"></i>配体 &nbsp;<i style="background:#b5703a"></i>口袋残基</div>
        </div>
      </div>`;
    $('#dockSide').innerHTML = `
      <div class="card"><div class="card-h"><span>接触残基</span><small>≤4.2 Å，${r.n_contact} 个</small></div>
        <div class="card-b" style="max-height:300px;overflow:auto;padding:0">
          <table><thead><tr><th class="nos">残基</th><th class="num">最近距离</th><th class="nos">原子</th></tr></thead>
          <tbody>${r.contacts.map((c) => `<tr><td>${c.resname}${c.resid}</td><td class="num">${num(c.min_d, 2)}</td>
            <td class="muted mono" style="font-size:10px">${esc(c.atom)}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card" style="margin-top:10px"><div class="card-h"><span>潜在氢键</span><small>${r.n_hbond} 个</small></div>
        <div class="card-b">${r.hbonds.length ? r.hbonds.map((h) => `<div class="kv"><span class="k">${h.resname}${h.resid}:${esc(h.atom)}</span><span class="mono">${num(h.dist, 2)} Å</span></div>`).join('') : '<span class="muted">无（2.4–3.7 Å）</span>'}</div>
      </div>`;
    drawPose(r, T);
  }

  let pv = null, pstate = { style: 'stick', res: true, spin: false };
  function drawPose(r, T) {
    const el = $('#pose3d');
    if (!el) return;
    if (pv) { try { pv.clear(); } catch (e) { } }
    pv = viewer(el, {});
    if (!pv) return;
    const atoms = T.atomList || [];
    pv.addModel(pdbText(atoms), 'pdb');            // model 0：口袋附近蛋白
    pv.setStyle({ model: 0 }, { line: { linewidth: 1, color: '#9aa79f' } });
    if (pstate.res) {
      const names = new Set(r.contacts.map((c) => c.resname + c.resid));
      const serials = [];
      atoms.forEach((a, i) => { if (names.has(a.rn + a.ri)) serials.push(i + 1); });
      if (serials.length) pv.setStyle({ model: 0, serial: serials }, { stick: { radius: 0.15, color: '#b5703a' } });
    }
    const pose = (D.poses || {})[resKey(r.ligand, r.target)];
    const ptxt = posePdb(pose);
    if (ptxt) pv.addModel(ptxt, 'pdb');            // model 1：配体位姿（含 CONECT 键表）
    if (!ptxt) {
      pv.setStyle({ model: 0 }, { line: { linewidth: 1.2, color: '#9aa79f' } });
      pv.zoomTo(); pv.render();
      return;
    }
    // 球棍：棍 0.25 Å + 球 0.35×vdW（之前 0.2/0.22 太小，看着只有细棍）
    if (pstate.style === 'line') pv.setStyle({ model: 1 }, { line: { linewidth: 4, color: '#e07b39' } });
    else pv.setStyle({ model: 1 }, { stick: { radius: 0.25, color: '#e07b39' }, sphere: { scale: 0.35, color: '#e07b39' } });
    pv.zoomTo({ model: 1 });
    pv.render();
    if (pstate.spin) pv.spin('y');
    $$('#dockMain .vtools button').forEach((b) => {
      const a = b.dataset.a;
      if (a === 'style') {
        b.textContent = pstate.style === 'line' ? '线框' : '球棍';
        b.classList.toggle('on', pstate.style === 'line');
      }
      if (a === 'res') b.classList.toggle('on', pstate.res);
      if (a === 'spin') b.classList.toggle('on', pstate.spin);
      b.onclick = () => {
        if (a === 'style') { pstate.style = pstate.style === 'line' ? 'stick' : 'line'; drawPose(r, T); }
        if (a === 'res') { pstate.res = !pstate.res; drawPose(r, T); }
        if (a === 'spin') { pstate.spin = !pstate.spin; drawPose(r, T); }
      };
    });
  }

  /* ---------------- ④ 打分矩阵 ---------------- */
  function renderMatrix() {
    const tgts = D.targets.map((t) => t.pdb);
    const byBest = D.ligands.map((l) => {
      const m = D.matrix[l.id] || {};
      const v = Object.values(m).filter((x) => x && x.st !== 'clash' && x.st !== 'toobig').map((x) => x.s);
      return { l, best: v.length ? Math.min(...v) : null, n: v.length };
    }).sort((a, b) => (a.best == null ? 1 : b.best == null ? -1 : a.best - b.best));
    const scores = D.results.filter((r) => r.status === 'ok' || r.status === 'loose').map((r) => r.score);
    const lo = scores.length ? Math.min(...scores) : 0;
    const hi = scores.length ? Math.max(...scores) : 1;
    const color = (v) => {
      const t = Math.max(0, Math.min(1, (hi - v) / (hi - lo || 1)));
      const r = Math.round(246 - 190 * t), g = Math.round(242 - 105 * t), b = Math.round(233 - 140 * t);
      return `background:rgb(${r},${g},${b});color:${t > 0.55 ? '#fff' : 'var(--ink)'}`;
    };
    $('#v-matrix').innerHTML = `
      <div class="card">
        <div class="card-h"><span>对接打分矩阵（越低越优）</span>
          <small>${D.results.length} 个组合 · 斜纹格 = 有原子冲突、不采信 · 点格看详情</small></div>
        <div class="scroll" style="max-height:calc(100vh - 230px)">
          <table class="hm">
            <thead><tr><th class="nos" style="text-align:left">成分</th>
              ${tgts.map((p) => { const t = tgt(p); return `<th class="nos">${t.gene}<div class="muted" style="font-weight:400">${p}</div></th>`; }).join('')}
              <th class="nos">最优</th></tr></thead>
            <tbody>${byBest.map(({ l, best }) => `<tr>
              <td style="text-align:left;white-space:nowrap">${esc(l.cn)} <span class="muted mono" style="font-size:10px">${l.id}</span></td>
              ${tgts.map((p) => {
        const c = (D.matrix[l.id] || {})[p];
        if (!c) return `<td class="z">·</td>`;
        if (c.st === 'clash' || c.st === 'toobig') return `<td class="z" style="cursor:pointer" title="${c.st === 'toobig' ? '配体体积超过口袋容量，装不下' : '有原子冲突，未采信'}" data-l="${l.id}" data-t="${p}">▨</td>`;
        const st = c.st === 'loose' ? 'text-decoration:underline dotted'
          : c.st === 'unfav' ? 'text-decoration:underline dotted;opacity:.75' : '';
        const tip = c.st === 'loose' ? '接触残基偏少' : c.st === 'unfav' ? '位姿成立但能量不利（ΔE>0）' : '有效位姿';
        return `<td style="${color(c.s)};${st};cursor:pointer" title="${tip}" data-l="${l.id}" data-t="${p}">${c.s.toFixed(1)}</td>`;
      }).join('')}
              <td class="num">${best == null ? '—' : best.toFixed(1)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
    $$('#v-matrix td[data-l]').forEach((td) => td.onclick = () => { S.lig = td.dataset.l; S.tgt = td.dataset.t; go('dock'); });
  }

  /* ---------------- ⑤ 引擎验证 ---------------- */
  function renderValid() {
    const cs = (D.validation && D.validation.cases) || [];
    const ok = cs.filter((c) => !c.covalent && c.rmsd_best <= 3);
    $('#v-valid').innerHTML = `
      <div class="card">
        <div class="card-h"><span>重对接验证：把共晶配体当刚体，看能否找回晶体位姿</span>
          <small>成功判据 RMSD ≤ 3 Å · ${ok.length}/${cs.filter((c) => !c.covalent).length} 通过</small></div>
        <div class="card-b" style="padding:0">
          <table><thead><tr><th class="nos">PDB</th><th class="nos">配体</th><th class="num">原子</th>
            <th class="num">天然位姿 E</th><th class="num">搜索最优 E</th><th class="num">RMSD</th>
            <th class="num">口袋</th><th class="num">耗时</th><th class="nos">判定</th></tr></thead>
          <tbody>${cs.map((c) => `<tr>
            <td class="mono">${c.pdb}</td><td class="mono">${c.code || '—'}</td>
            <td class="num">${c.n_atoms || '—'}</td>
            <td class="num">${c.e_native == null ? '—' : c.e_native.toFixed(1)}</td>
            <td class="num">${c.e_best == null ? '—' : c.e_best.toFixed(1)}</td>
            <td class="num">${c.rmsd_best == null ? '—' : c.rmsd_best.toFixed(2) + ' Å'}</td>
            <td class="num">${c.pocket == null ? '—' : '#' + c.pocket}</td>
            <td class="num">${c.time_s == null ? '—' : c.time_s + 's'}</td>
            <td>${c.covalent ? '<span class="tag w">共价，跳过</span>' :
              (c.rmsd_best <= 3 ? '<span class="tag g">通过</span>' : '<span class="tag r">未通过</span>')}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card" style="margin-top:10px">
        <div class="card-h"><span>怎么读这张表</span></div>
        <div class="card-b muted" style="font-size:11.5px;line-height:1.9">
          天然位姿 E 是把晶体坐标直接代入打分函数得到的能量；搜索最优 E 是引擎自己搜出来的最低能量。
          两者接近且 RMSD ≤ 3 Å，说明打分函数与搜索都能复现天然结合模式；RMSD 大说明该体系下引擎不可靠，
          对应的对接结果应当降级看待。共价配体（最小原子距离 &lt; 1.9 Å）不参与评价。
        </div>
      </div>`;
  }

  /* ---------------- 路由 ---------------- */
  function go(tab) {
    S.tab = tab;
    $$('nav button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + tab));
    if (tab === 'screen') { renderScreen(); }
    if (tab === 'targets') { renderTargets(); }
    if (tab === 'dock') { renderDock(); }
    if (tab === 'matrix') { renderMatrix(); }
    if (tab === 'valid') { renderValid(); }
  }

  function init() {
    // 默认打开"分数最好的有效位姿"，而不是列表第一条（第一条可能是 clash）
    if (!S.lig || !S.tgt) {
      const best = (D.results || []).filter((r) => r.status === 'ok').sort((a, b) => a.score - b.score)[0];
      if (best) { S.lig = best.ligand; S.tgt = best.target; }
    }
    if (!S.lig && D.ligands.length) S.lig = D.ligands[0].id;
    if (!S.tgt && D.targets.length) S.tgt = D.targets[0].pdb;
    $('#mComp').textContent = D.ligands.length;
    $('#mTgt').textContent = D.targets.length;
    $('#mRun').textContent = D.results.length;
    $('#mDate').textContent = (D.meta && D.meta.generatedAt || '').slice(5, 16);
    $('#navHint').textContent = D.meta ? D.meta.engine : '';
    $$('nav button').forEach((b) => b.onclick = () => go(b.dataset.t));

    const bind = (id, key, parse) => {
      const el = $('#' + id);
      if (!el) return;
      el.oninput = () => { S.f[key] = parse(el.value); renderScreen(); };
    };
    $('#v-screen').innerHTML = screenHtml();
    bind('mwMin', 'mwMin', Number); bind('mwMax', 'mwMax', Number);
    bind('logpMax', 'logpMax', Number); bind('tpsaMax', 'tpsaMax', Number); bind('qedMin', 'qedMin', Number);
    ['ckPains:pains', 'ckLip:lipinski', 'ckVeber:veber'].forEach((pair) => {
      const [id, key] = pair.split(':');
      const el = $('#' + id);
      if (el) el.onchange = () => { S.f[key] = el.checked; renderScreen(); };
    });
    $('#btnReset').onclick = () => {
      S.f = { mwMin: 0, mwMax: 900, logpMax: 6, tpsaMax: 300, qedMin: 0, pains: false, lipinski: false, veber: false };
      go('screen');
    };

    $('#v-targets').innerHTML = targetsHtml();
    $('#v-dock').innerHTML = dockHtml();
    $('#v-matrix').innerHTML = '';
    $('#v-valid').innerHTML = '';
    go('screen');
  }

  document.addEventListener('DOMContentLoaded', init);
  window.QH = { go, state: S };
})();
