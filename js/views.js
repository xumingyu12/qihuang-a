/* 岐黄智谱 · 视图：总览 / L1 数据治理 / L2 知识图谱 */
(function () {
  'use strict';
  const QH = window.QH, U = window.QHUI;
  const esc = U.esc, e = U.esc;

  /* ============================================================
   * 总览
   * ========================================================== */
  function overview(root) {
    const m = QH.metrics;
    const mols = (window.QHMOL.compounds || []).filter((c) => c.ok);
    const layerCards = m.map((x) => `
      <div class="layer" onclick="QHGO('${x.layer === 'L1' ? 'emr' : x.layer === 'L2' ? 'graph' : x.layer === 'L3' ? 'rx' : x.layer === 'L4' ? 'platform' : 'recheck'}')">
        <span class="dot ${x.state === 'wip' ? 'wip' : ''}"></span>
        <div class="ln">${x.layer}</div>
        <h4>${e(x.name)}</h4>
        <div class="kv"><b style="color:var(--green)">${e(x.k)}</b><br>${e(x.v)}<br>${e(x.sub)}</div>
      </div>`).join('');

    const pain = [
      { p: '名医经验难复用', s: 'L1 把证—方—药—剂量—转归抽成可回溯的结构化证据链', icon: '经' },
      { p: '古籍知识散在', s: 'L2 把方证记载与本草分子数据对齐到同一套图谱模式', icon: '古' },
      { p: '临床数据闲置', s: 'L5 用历史病历重跑平台，做一致性回检', icon: '历' },
      { p: '药效机制不明', s: 'L3 覆盖度×邻近性×类药性排序 + 分子对接结构证据', icon: '构' }
    ].map((x) => `<div class="evidence" style="cursor:default">
        <div class="ico">${x.icon}</div>
        <div class="tt"><div class="t1">${e(x.p)}</div><div class="t2" style="white-space:normal">${e(x.s)}</div></div>
      </div>`).join('');

    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">岐 黄 智 谱 · v 0 . 2</div>
          <h2>从一份脱敏病历，走到一个可追溯的候选分子</h2>
          <p>以暴聋为示范专病，把「证—方—药—成分—靶点—通路」串成一条可追溯的证据链。</p>
        </div>
        <div class="right">
          <button class="btn primary" onclick="QHGO('platform')">▶ 走一遍完整流程</button>
          <button class="btn" onclick="QHGO('graph')">看知识图谱</button>
        </div>
      </div>

      <div class="layers" style="margin-bottom:12px">${layerCards}</div>

      <div class="grid g4" style="margin-bottom:12px">
        <div class="kpi"><div class="lb">脱敏病历</div><div class="vv"><em>42</em><small>份</small></div><div class="sb">结构化字段 18 个 · 抽取 F1 0.91</div></div>
        <div class="kpi"><div class="lb">专病图谱</div><div class="vv"><em>79</em><small>节点</small></div><div class="sb">8 类实体 · 9 类关系 · 溯源覆盖 100%</div></div>
        <div class="kpi"><div class="lb">成分库</div><div class="vv"><em>${mols.length}</em><small>个</small></div><div class="sb">2D 矢量 + 3D 构象</div></div>
        <div class="kpi"><div class="lb">回顾性回检</div><div class="vv"><em>21</em><small>对</small></div><div class="sb">PSM 1:1 · PTA 差值 +4.3 dB</div></div>
      </div>

      <div class="split" style="margin-bottom:12px">
        <div class="card">
          <div class="card-h"><span>五步走完一条证据链</span></div>
          <div class="card-b">
            <div class="steps" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
              <div class="step on" onclick="QHGO('emr')"><span class="no">1</span>病例结构化</div><span class="step-arrow">→</span>
              <div class="step" onclick="QHGO('rx')"><span class="no">2</span>证候推断</div><span class="step-arrow">→</span>
              <div class="step" onclick="QHGO('rx')"><span class="no">3</span>处方建议</div><span class="step-arrow">→</span>
              <div class="step" onclick="QHGO('graph')"><span class="no">4</span>追溯依据</div><span class="step-arrow">→</span>
              <div class="step" onclick="QHGO('mol')"><span class="no">5</span>候选分子</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><span>四大困境 → 平台对策</span></div>
          <div class="card-b">${pain}</div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card"><div class="card-h"><span>示范专病：暴聋</span><small>${e(QH.disease.icd)}</small></div>
          <div class="card-b">
            <p style="margin:0 0 10px;font-size:12px;line-height:1.75;color:var(--ink-2)">${e(QH.disease.definition)}</p>
            ${QH.disease.facts.map((f) => `<div class="meta-row"><span class="k">${e(f.k)}</span><span class="v">${e(f.v)}</span></div>`).join('')}
          </div>
        </div>
        <div class="card"><div class="card-h"><span>四型辨治</span><small>+ 1 个兼证</small></div>
          <div class="card-b">${QH.syndromes.map((s) => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed var(--line-2)">
              <span class="tag ${s.adjunct ? 'gold' : 'g'}" style="flex:0 0 auto">${e(s.name)}</span>
              <span style="font-size:11.5px;color:var(--muted);line-height:1.6">${e(s.key)}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /* ============================================================
   * L1 数据治理
   * ========================================================== */
  let caseId = 'K1';
  let activeField = null;

  function emr(root) {
    const c = QH.cases.find((x) => x.id === caseId) || QH.cases[0];
    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L1 · 数 据 治 理</div>
          <h2>把病历和古籍拆成能被计算的字段</h2>
          <p>规则 + 预训练语言模型 + 人工校验的半自动流程：先把「证候、症状、舌脉、方名、药味、剂量、听力学、随访」抽成结构，
             每个字段都带原文位置和置信度——这是后面所有「可追溯」的地基。</p>
        </div>
        <div class="right">
          <div class="chips">${QH.cases.map((x) => `<button class="chip ${x.id === c.id ? 'on' : ''}" onclick="QHV.pickCase('${x.id}')">${e(x.name)} · ${e(QH.idx.syndrome(x.syndrome).name)}</button>`).join('')}</div>
        </div>
      </div>

      <div class="split" style="margin-bottom:12px">
        <div class="card">
          <div class="card-h"><span>原始记录（脱敏）</span><small>${e(c.dept)} · ${e(c.date)} · ${c.sex}/${c.age} 岁 · ${e(c.side)}</small></div>
          <div class="card-b">
            <div class="raw" id="rawBox">${e(c.raw)}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><span>结构化字段</span><small>字段与原文位置一一对应</small></div>
          <div class="card-b" id="fields">${c.fields.map((f, i) => `
            <div class="field" data-i="${i}" onclick="QHV.pickField(${i})">
              <span class="k">${e(f.k)}</span>
              <span class="v">${e(f.v)}</span>
              <span class="c">${Math.round(f.conf * 100)}%</span>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="grid g3">
        <div class="card">
          <div class="card-h"><span>抽取管线</span><small>每步都可单独复核</small></div>
          <div class="card-b">
            <div class="timeline">
              <div class="tl"><div class="d">STEP 1</div><div class="t">规则 + 词典</div><div class="n">症状/舌脉/药名用术语表与正则先抓，覆盖高频、格式稳定的字段</div></div>
              <div class="tl"><div class="d">STEP 2</div><div class="t">预训练语言模型</div><div class="n">对长句做实体识别与关系抽取，抽「药味—剂量」「症状—程度」这类结构</div></div>
              <div class="tl"><div class="d">STEP 3</div><div class="t">术语规范化</div><div class="n">别名/炮制品归并（如「川军」→「大黄」），映射到标准药名与 ICD/证候编码</div></div>
              <div class="tl"><div class="d">STEP 4</div><div class="t">人工校验</div><div class="n">低置信字段进复核队列，双人背对背核对；本页 7 个字段中 2 个标为需复核</div></div>
              <div class="tl now"><div class="d">STEP 5</div><div class="t">入库 + 溯源</div><div class="n">写入专病库，保留原文位置、抽取时间与处理版本，支持反查</div></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><span>质量指标</span></div>
          <div class="card-b">
            ${U.barRow('字段抽取 F1', 0.91, 1, { text: '0.91', cls: '' })}
            ${U.barRow('证候判定一致率', 0.86, 1, { text: '0.86', cls: '' })}
            ${U.barRow('药味归并准确率', 0.94, 1, { text: '0.94', cls: '' })}
            ${U.barRow('剂量单位换算正确率', 0.98, 1, { text: '0.98', cls: '' })}
            <div style="height:8px"></div>
            <div class="meta-row"><span class="k">已结构化病历</span><span class="v">42 份 / 字段 18 个</span></div>
            <div class="meta-row"><span class="k">进人工复核比例</span><span class="v">12%（低置信 + 冲突）</span></div>
            <div class="meta-row"><span class="k">平均单份耗时</span><span class="v">模型 8 s + 人工 3 min</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><span>古籍方证抽取</span><small>大模型辅助 + 专家复核</small></div>
          <div class="card-b">
            <div class="quote" style="font-size:12.5px">耳孔内小管通脑，管外有瘀血，靠挤管闭，故耳聋。<span style="color:var(--muted);font-size:11px"> —— 《医林改错》</span></div>
            <table class="t">
              <tbody>
                <tr><td style="color:var(--muted);width:64px">病机</td><td>瘀血阻窍</td><td class="num">0.93</td></tr>
                <tr><td style="color:var(--muted)">对应证候</td><td>气滞血瘀 (S3)</td><td class="num">0.91</td></tr>
                <tr><td style="color:var(--muted)">对应方剂</td><td>通窍活血汤 (F5)</td><td class="num">0.95</td></tr>
                <tr><td style="color:var(--muted)">抽取药味</td><td>赤芍、川芎、桃仁、红花、麝香</td><td class="num">0.88</td></tr>
              </tbody>
            </table>
            <div style="display:flex;gap:6px;margin-top:9px">
              <button class="btn sm primary" onclick="QHUI.toast('已记入复核队列')">✓ 专家复核通过</button>
              <button class="btn sm" onclick="QHUI.evidence('E03')">看证据原条</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function pickCase(id) {
    caseId = id; activeField = null;
    const c = QH.cases.find((x) => x.id === id);
    const box = document.getElementById('rawBox');
    if (box && c) box.textContent = c.raw;
    QHROUTE('emr');
    U.toast('已切换到 ' + id);
  }

  function pickField(i) {
    const c = QH.cases.find((x) => x.id === caseId);
    const f = c.fields[i];
    const box = document.getElementById('rawBox');
    const raw = c.raw;
    const at = raw.indexOf(f.ev);
    if (at >= 0) {
      box.innerHTML = e(raw.slice(0, at)) + '<mark>' + e(f.ev) + '</mark>' + e(raw.slice(at + f.ev.length));
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    document.querySelectorAll('#fields .field').forEach((el) => el.classList.toggle('on', Number(el.dataset.i) === i));
    activeField = i;
  }

  /* ============================================================
   * L2 知识图谱
   * ========================================================== */
  const TYPE_ORDER = ['disease', 'syndrome', 'symptom', 'formula', 'herb', 'compound', 'target', 'pathway'];
  const TYPE_CN = { disease: '疾病', syndrome: '证候', symptom: '症状', formula: '方剂', herb: '药味', compound: '成分', target: '靶点', pathway: '通路' };
  const TYPE_R = { disease: 12, syndrome: 10, symptom: 6.5, formula: 9, herb: 5.5, compound: 7, target: 6.5, pathway: 8 };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  function buildGraph(scope) {
    const nodes = new Map(), edges = [], seen = new Set();
    const add = (id, type, label, ref) => { if (!nodes.has(id)) nodes.set(id, { id, type, label, ref }); };
    const link = (s, d, rel, ev, conf) => {
      const key = s + '|' + d + '|' + rel;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ s, d, rel, ev, conf });
    };

    add('D001', 'disease', QH.disease.name);
    const forms = scope.formulas.map((id) => QH.idx.formula(id));
    const sids = [...new Set(forms.map((f) => f.syndrome))];
    sids.forEach((sid) => {
      const s = QH.idx.syndrome(sid);
      add(s.id, 'syndrome', s.name);
      link(s.id, 'D001', 'R1', 'E01', 0.95);
      s.pattern.symptoms.forEach((yid) => {
        if (scope.skipSymptoms && scope.skipSymptoms.includes(yid)) return;
        const y = QH.idx.symptom(yid);
        add(y.id, 'symptom', y.name);
        link(s.id, y.id, 'R2', 'E04', 0.8);
      });
    });
    forms.forEach((f) => {
      add(f.id, 'formula', f.name);
      link(f.id, f.syndrome, 'R3', f.ev, 0.88);
      f.herbs.forEach(([hid]) => {
        if (scope.skipHerbs.includes(hid)) return;
        const h = QH.idx.herb(hid);
        add(h.id, 'herb', h.name);
        link(f.id, h.id, 'R4', f.ev, 0.9);
        (h.compounds || []).forEach((cid) => {
          const cm = (window.QHMOL.compounds || []).find((x) => x.id === cid);
          if (!cm) return;
          add(cm.id, 'compound', cm.cn);
          link(h.id, cm.id, 'R5', 'E20', 0.75);
          (QH.compoundTarget[cid] || []).forEach((tid) => {
            const t = QH.idx.target(tid);
            add(t.id, 'target', t.gene);
            link(cm.id, t.id, 'R6', 'E20', 0.62 + hash(cid + tid) * 0.3);
            (QH.targetPathway[tid] || []).forEach((pid) => {
              const p = QH.idx.pathway(pid);
              add(p.id, 'pathway', p.name.replace(' 信号通路', ''));
              link(t.id, p.id, 'R7', 'E22', 0.85);
              link(p.id, 'D001', 'R8', 'E22', 0.7);
            });
          });
        });
      });
    });
    QH.modulations.forEach((m) => {
      if (nodes.has(m.from) && nodes.has(m.to)) link(m.from, m.to, 'R9', 'E03', 0.7);
    });
    return { nodes: [...nodes.values()], edges };
  }

  const gstate = { types: new Set(TYPE_ORDER), sel: null, path: null, scope: 'core', depth: 2 };

  function graph(root) {
    const scope = gstate.scope === 'core'
      ? { formulas: ['F1', 'F3', 'F5', 'F7'], skipHerbs: ['H34', 'H35', 'H36'] }
      : { formulas: QH.formulas.map((f) => f.id), skipHerbs: ['H34', 'H35', 'H36', 'H56'] };
    const g = buildGraph(scope);
    gstate.g = g;
    const cnt = {};
    g.nodes.forEach((n) => { cnt[n.type] = (cnt[n.type] || 0) + 1; });
    const relCnt = {};
    g.edges.forEach((x) => { relCnt[x.rel] = (relCnt[x.rel] || 0) + 1; });

    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L2 · 知 识 融 合</div>
          <h2>8 类实体、9 类关系，每一条都带出处</h2>
          <p>病历证据链、古籍方证、本草分子数据在同一套模式里对齐，
             每条关系都挂着来源、等级与置信度。</p>
        </div>
        <div class="right">
          <button class="btn" onclick="QHV.toggleScope()">${gstate.scope === 'core' ? '扩到全部方剂' : '只留四型核心方'}</button>
          <button class="btn primary" onclick="QHV.pathDemo()">跑一条 证→靶点 路径</button>
        </div>
      </div>

      <div class="chips" style="margin-bottom:8px">
        ${TYPE_ORDER.map((t) => `<button class="chip ${gstate.types.has(t) ? 'on' : ''}" onclick="QHV.toggleType('${t}')">${TYPE_CN[t]}<span class="n">${cnt[t] || 0}</span></button>`).join('')}
        <span style="flex:1"></span>
        <button class="btn sm" onclick="QHV.allTypes(true)">全显</button>
        <button class="btn sm" onclick="QHV.allTypes(false)">只看药味链</button>
      </div>

      <div class="split-r">
        <div class="graph-wrap" id="graphWrap"></div>
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>图谱规模</span><small>${e(gstate.scope === 'core' ? '四型核心切片' : '全部方剂')}</small></div>
            <div class="card-b">
              <div class="grid g2">
                <div><div class="big">${g.nodes.length}<small>节点</small></div></div>
                <div><div class="big">${g.edges.length}<small>关系</small></div></div>
              </div>
              <div style="margin-top:9px">
                ${QH.relations.map((r) => {
                  const n = relCnt[r.id] || 0;
                  return n ? `<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink-2);padding:2px 0">
                    <i style="width:8px;height:8px;border-radius:2px;background:${r.color};display:inline-block"></i>
                    <span style="flex:1">${e(r.name)}</span><span class="mono" style="color:var(--muted)">${n}</span></div>` : '';
                }).join('')}
              </div>
              <div class="meta-row" style="margin-top:8px"><span class="k">三元溯源覆盖</span><span class="v">来源 100% · 等级 100% · 置信度 100%</span></div>
            </div>
          </div>
          <div class="card" id="nodePanel"><div class="card-h"><span>节点详情</span></div>
            <div class="card-b" style="color:var(--muted);font-size:12px">选中一个节点后，这里会显示它的属性、连出去的关系、以及每条关系对应的证据。</div>
          </div>
        </div>
      </div>
    `;
    renderGraphSvg();
  }

  function shortLabel(t, s) {
    if (t === 'symptom' && s.length > 5) return s.slice(0, 4) + '…';
    if (t === 'formula' && s.length > 6) return s.slice(0, 5) + '…';
    if (t === 'pathway' && s.length > 8) return s.slice(0, 7) + '…';
    return s;
  }

  function renderGraphSvg() {
    const wrap = document.getElementById('graphWrap');
    if (!wrap || !gstate.g) return;
    const g = gstate.g;
    const W = 1180, H = 860, padT = 44, padB = 24, colW = (W - 90) / TYPE_ORDER.length;
    const cols = TYPE_ORDER.filter((t) => gstate.types.has(t));
    const xOf = (t) => 50 + Math.max(0, TYPE_ORDER.indexOf(t)) * colW + colW / 2;
    const byType = {};
    g.nodes.forEach((n) => { (byType[n.type] = byType[n.type] || []).push(n); });

    const pos = {};
    TYPE_ORDER.forEach((t) => {
      const list = (byType[t] || []).sort((a, b) => a.label.localeCompare(b.label, 'zh'));
      const n = list.length;
      list.forEach((nd, i) => {
        const y = n === 1 ? (padT + H - padB) / 2 : padT + (i * (H - padT - padB)) / (n - 1);
        pos[nd.id] = { x: xOf(t), y, nd };
      });
    });

    const visible = (id) => pos[id] && gstate.types.has(pos[id].nd.type);
    const pathSet = gstate.path ? new Set(gstate.path) : null;
    const trace = gstate.sel ? traceSet(gstate.sel, gstate.depth) : null;

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">`;
    // 列标题
    TYPE_ORDER.forEach((t) => {
      if (!gstate.types.has(t)) return;
      svg += `<text class="gcol-label" x="${xOf(t)}" y="22" text-anchor="middle">${TYPE_CN[t]}</text>`;
    });
    // 边
    g.edges.forEach((ed) => {
      if (!visible(ed.s) || !visible(ed.d)) return;
      const a = pos[ed.s], b = pos[ed.d];
      const rel = QH.relations.find((r) => r.id === ed.rel) || { color: '#cfc6b6' };
      const onPath = pathSet && pathSet.has(ed.s) && pathSet.has(ed.d);
      const dim = trace && !onPath && !(trace.has(ed.s) && trace.has(ed.d));
      const mx = (a.x + b.x) / 2;
      svg += `<path class="gedge ${onPath ? 'hl' : ''} ${dim ? 'dim' : ''}" d="M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}" stroke="${rel.color}"></path>`;
    });
    // 节点
    TYPE_ORDER.forEach((t) => {
      if (!gstate.types.has(t)) return;
      (byType[t] || []).forEach((nd) => {
        const p = pos[nd.id];
        const r = TYPE_R[t];
        const onPath = pathSet && pathSet.has(nd.id);
        const dim = trace && !onPath && !trace.has(nd.id);
        const anchorEnd = TYPE_ORDER.indexOf(t) >= 6;
        const tx = anchorEnd ? p.x - r - 4 : p.x + r + 4;
        svg += `<g class="gnode r-${t} ${dim ? 'dim' : ''} ${onPath ? 'hl' : ''}" data-id="${nd.id}" onclick="QHV.selNode('${nd.id}')">
          <circle cx="${p.x}" cy="${p.y}" r="${r}"></circle>
          <text x="${tx}" y="${p.y + 3.4}" text-anchor="${anchorEnd ? 'end' : 'start'}">${e(shortLabel(t, nd.label))}</text>
          <title>${e(TYPE_CN[t])} · ${e(nd.label)}</title>
        </g>`;
      });
    });
    svg += '</svg>';
    wrap.innerHTML = svg;
  }

  function neighbors(id) {
    const s = new Set([id]);
    (gstate.g.edges || []).forEach((ed) => { if (ed.s === id) s.add(ed.d); if (ed.d === id) s.add(ed.s); });
    return s;
  }

  /* 从选中节点出发，沿「证据链」向外扩散 depth 跳，返回整条链上的节点集合。
     默认 2 跳：通路 → 靶点 → 成分；再往上（药味、方剂）用面板里的「3 跳 / 全链」。 */
  function traceSet(id, depth) {
    const adj = {};
    (gstate.g.edges || []).forEach((ed) => {
      (adj[ed.s] = adj[ed.s] || []).push(ed.d);
      (adj[ed.d] = adj[ed.d] || []).push(ed.s);
    });
    const seen = new Set([id]);
    let frontier = [id];
    for (let d = 0; d < depth; d++) {
      const next = [];
      frontier.forEach((n) => (adj[n] || []).forEach((m) => {
        if (!seen.has(m)) { seen.add(m); next.push(m); }
      }));
      frontier = next;
      if (!frontier.length) break;
    }
    return seen;
  }

  function toggleType(t) {
    if (gstate.types.has(t)) gstate.types.delete(t); else gstate.types.add(t);
    QHROUTE('graph');
  }
  function allTypes(on) {
    gstate.types = on ? new Set(TYPE_ORDER) : new Set(['disease', 'syndrome', 'formula', 'herb', 'compound']);
    QHROUTE('graph');
  }
  function toggleScope() {
    gstate.scope = gstate.scope === 'core' ? 'full' : 'core';
    gstate.sel = null; gstate.path = null;
    QHROUTE('graph');
  }

  function selNode(id) {
    gstate.sel = id; gstate.path = null;
    renderGraphSvg();
    const nd = gstate.g.nodes.find((n) => n.id === id);
    const panel = document.getElementById('nodePanel');
    if (!nd) return;
    const ins = gstate.g.edges.filter((x) => x.d === id);
    const outs = gstate.g.edges.filter((x) => x.s === id);
    const relName = (rid) => (QH.relations.find((r) => r.id === rid) || {}).name || rid;
    const label = (nid) => { const n = gstate.g.nodes.find((n) => n.id === nid); return n ? n.label : nid; };
    const evChip = (ev, conf) => `<span class="tag gold" style="cursor:pointer" onclick="QHUI.evidence('${ev}')">证据 ${ev}</span> <span class="tag">置信 ${Math.round(conf * 100)}%</span>`;

    let body = '';
    if (nd.type === 'syndrome') {
      const s = QH.idx.syndrome(nd.id);
      body = `<p style="font-size:12px;line-height:1.7;color:var(--ink-2);margin:0 0 8px">${e(s.desc)}</p>
        ${U.kv('病机', e(s.key))}${U.kv('核心方', s.formulas.map((f) => e(QH.idx.formula(f).name)).join('、'))}
        ${U.kv('辨证要点', s.pattern.symptoms.map((y) => e(QH.idx.symptom(y).name)).join('、'))}`;
    } else if (nd.type === 'formula') {
      const f = QH.idx.formula(nd.id);
      body = `${U.kv('出处', e(f.book) + ' · ' + e(f.author))}${U.kv('主治', e(f.indication))}
        <div style="margin:8px 0 4px;font-size:11.5px;color:var(--muted)">组成（${f.herbs.length} 味）</div>
        <div class="chips">${f.herbs.map(([hid, d]) => `<span class="tag g" style="cursor:pointer" onclick="QHV.selNode('${hid}')">${e(QH.idx.herb(hid).name)} ${d}g</span>`).join('')}</div>`;
    } else if (nd.type === 'herb') {
      const h = QH.idx.herb(nd.id);
      body = `${U.kv('性味', e(h.nature) + ' · ' + e(h.taste))}${U.kv('归经', e(h.meridian))}
        ${U.kv('功效', e(h.fn))}${U.kv('药典日剂量', h.dose[0] + '–' + h.dose[1] + ' g')}
        ${h.tox ? `<div class="note danger" style="margin-top:8px"><span>注意</span><span>${e(h.note || '有小毒')}</span></div>` : ''}
        ${h.note && !h.tox ? `<div class="note" style="margin-top:8px"><span>注意</span><span>${e(h.note)}</span></div>` : ''}
        ${(h.compounds || []).length ? `<div style="margin-top:8px;font-size:11.5px;color:var(--muted)">已知成分</div>
          <div class="chips">${h.compounds.map((c) => { const cm = (window.QHMOL.compounds || []).find((x) => x.id === c); return `<span class="tag gold" style="cursor:pointer" onclick="QHV.selNode('${c}')">${e(cm ? cm.cn : c)}</span>`; }).join('')}</div>` : ''}`;
    } else if (nd.type === 'compound') {
      const cm = (window.QHMOL.compounds || []).find((x) => x.id === nd.id);
      body = `${U.kv('英文名', e(cm.en))}${U.kv('分子式', e(cm.formula))}${U.kv('MW', cm.mw)}${U.kv('LogP', cm.logp)}
        ${U.kv('来源药味', e(cm.herb))}
        <div style="margin-top:9px"><button class="btn sm primary" onclick="QHGO('mol','${nd.id}')">在分子页打开</button></div>`;
    } else if (nd.type === 'target') {
      const t = QH.idx.target(nd.id);
      body = `${U.kv('基因名', e(t.gene))}${U.kv('蛋白', e(t.name))}${U.kv('UniProt', e(t.uniprot))}
        ${U.kv('功能分类', e(t.family))}
        <div style="margin-top:8px;font-size:11.5px;color:var(--muted)">所属通路</div>
        <div class="chips">${(QH.targetPathway[t.id] || []).map((pid) => `<span class="tag v" style="cursor:pointer" onclick="QHV.selNode('${pid}')">${e(QH.idx.pathway(pid).name)}</span>`).join('')}</div>`;
    } else if (nd.type === 'pathway') {
      const p = QH.idx.pathway(nd.id);
      body = `${U.kv('KEGG', e(p.kegg))}${U.kv('名称', e(p.name))}
        <div class="note info" style="margin-top:8px"><span>用途</span><span>通路层是「成分—靶点」和「疾病」之间的解释桥梁：说明这些靶点为什么和暴聋有关。</span></div>`;
    } else if (nd.type === 'symptom') {
      const y = QH.idx.symptom(nd.id);
      body = `${U.kv('类别', e(y.kind))}${U.kv('出现于证候', QH.syndromes.filter((s) => s.pattern.symptoms.includes(y.id)).map((s) => e(s.name)).join('、') || '—')}`;
    } else {
      body = `${U.kv('定义', e(QH.disease.definition))}${U.kv('ICD-10', e(QH.disease.icd))}
        ${U.kv('西医治疗', e(QH.disease.western.join('、')))}`;
    }

    const relRow = (x, dir) => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px dashed var(--line-2);font-size:11.5px">
        <span style="color:var(--muted);flex:0 0 46px">${dir}</span>
        <span style="flex:1"><b>${e(relName(x.rel))}</b> ${e(label(dir === '出' ? x.d : x.s))}</span>
        ${evChip(x.ev, x.conf)}
      </div>`;

    // 高亮范围：默认顺着证据链亮 4 跳（通路→靶点→成分→药味→方剂）
    const chain = traceSet(id, gstate.depth);
    const chainEdges = gstate.g.edges.filter((x) => chain.has(x.s) && chain.has(x.d)).length;
    const typesIn = new Set([...chain].map((nid) => {
      const n = gstate.g.nodes.find((x) => x.id === nid); return n ? n.type : '';
    }).filter(Boolean));
    const depthBtn = (n, t) => `<button class="btn sm ${gstate.depth === n ? 'primary' : ''}" onclick="QHV.setDepth(${n})">${t}</button>`;

    panel.innerHTML = `<div class="card-h"><span>${TYPE_CN[nd.type]} · ${e(nd.label)}</span>
        <small class="mono">${e(nd.id)}</small></div>
      <div class="card-b">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <span class="tag g">链上 ${chain.size} 节点 · ${chainEdges} 关系 · ${typesIn.size} 类实体</span>
          <span style="flex:1"></span>
          <span style="font-size:10.5px;color:var(--muted)">高亮</span>
          ${depthBtn(1, '1 跳')}${depthBtn(2, '2 跳')}${depthBtn(3, '3 跳')}${depthBtn(9, '全链')}
        </div>
        ${body}
        <div style="margin-top:10px;font-size:11.5px;color:var(--muted)">直接关系（${outs.length} 出 / ${ins.length} 入）</div>
        <div style="max-height:190px;overflow:auto">${outs.map((x) => relRow(x, '出')).join('')}${ins.map((x) => relRow(x, '入')).join('')}</div>
      </div>`;
  }

  function setDepth(n) {
    gstate.depth = n;
    if (gstate.sel) selNode(gstate.sel); else QHROUTE('graph');
  }

  /* 路径：从证候走到靶点（BFS） */
  function pathDemo() {
    const from = 'S3', to = 'T07';
    if (!gstate.types.has('syndrome')) gstate.types.add('syndrome');
    if (!gstate.types.has('target')) gstate.types.add('target');
    const prev = {}, seen = new Set([from]);
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      if (cur === to) break;
      gstate.g.edges.forEach((ed) => {
        const nxt = ed.s === cur ? ed.d : ed.d === cur ? ed.s : null;
        if (nxt && !seen.has(nxt)) { seen.add(nxt); prev[nxt] = cur; q.push(nxt); }
      });
    }
    if (!prev[to] && from !== to) { U.toast('当前筛选下没有连通路径'); return; }
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    gstate.path = path;
    gstate.sel = null;
    renderGraphSvg();
    const lbl = path.map((id) => { const n = gstate.g.nodes.find((n) => n.id === id); return n ? n.label : id; });
    U.toast('路径：' + lbl.join(' → '));
  }

  window.QHV = {
    pickCase, pickField, toggleType, allTypes, toggleScope, selNode, pathDemo, setDepth,
    get graphs() { return gstate; }
  };
  window.QHVIEWS = Object.assign(window.QHVIEWS || {}, { overview, emr, graph });
})();
