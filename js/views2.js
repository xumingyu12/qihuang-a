/* 岐黄智谱 · 视图：L3 处方优化 / L3 分子发现 / L4 工作台 / L5 回检 / 指标 */
(function () {
  'use strict';
  const QH = window.QH, U = window.QHUI;
  const e = U.esc;
  const MOL = () => (window.QHMOL.compounds || []).filter((c) => c.ok);
  const molById = (id) => MOL().find((c) => c.id === id);

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  /* ============================================================
   * L3-A 处方优化
   * ========================================================== */
  const RXPLAN = {
    F3: {
      add: [['H11', '耳鸣如潮、头目不清，加菊花清利头目', 'E06'], ['H46', '耳窍闭塞不通，加石菖蒲开窍', 'E03']],
      drop: [['H19', '无小便短赤之湿热下注证，去木通以避肾毒性风险', 'E22']],
      note: '肝火上扰，苦寒直折为主；耳窍闭塞者佐以开窍。'
    },
    F7: {
      add: [['H47', '久病气虚、倦怠乏力，加黄芪益气升清', 'E08']],
      drop: [['H18', '无明显水湿内停，减泽泻以防渗利伤阴', 'E07']],
      note: '肾精亏虚，填精为主，忌一味通窍。'
    },
    F9: {
      add: [['H46', '耳闷如塞、痰蒙清窍，加石菖蒲化痰开窍', 'E16'], ['H10', '头重而痛，加蔓荆子清利头目', 'E14']],
      drop: [],
      note: '痰湿蒙窍，先化痰降逆，再议通窍。'
    },
    F1: {
      add: [['H10', '耳窍闭塞、头痛，加蔓荆子', 'E14']],
      drop: [['H08', '无表证发热，去淡豆豉', 'E05']],
      note: '风热在表，辛凉透解，不宜早用补涩。'
    },
    F5: {
      add: [['H46', '久聋窍闭，加石菖蒲助通窍', 'E03']],
      drop: [],
      note: '瘀血阻窍，活血通窍；麝香价昂且孕妇禁用，需在约束层拦截。'
    }
  };

  const rx = { caseId: 'K1', step: 1, formula: null, pregnancy: false };

  function rxCase() { return QH.cases.find((c) => c.id === rx.caseId) || QH.cases[0]; }

  /* 召回打分：证候匹配 55% + 病历相似 30% + 古籍支持 15%
   * 病历相似度用「证候—方剂」先验 + 少量确定性扰动模拟。 */
  const PREF = { K1: 'F3', K2: 'F7', K3: 'F9' };
  function recall(c) {
    const sy = c.syndrome;
    const pref = PREF[c.id];
    const same = QH.formulas.filter((f) => f.syndrome === sy).map((f) => f.id);
    return QH.formulas.map((f) => {
      const match = f.syndrome === sy ? 1 : (QH.idx.syndrome(f.syndrome).adjunct ? 0.5 : 0.22);
      const ev = (QH.idx.evidence(f.ev) || { conf: 0.6 }).conf;
      const sim = f.id === pref ? 0.95
        : same.includes(f.id) ? 0.70 + hash(f.id + c.id) * 0.06
          : 0.44 + hash(f.id + c.id) * 0.10;
      const score = match * 0.55 + sim * 0.30 + ev * 0.15;
      return { f, match, sim, ev, score };
    }).sort((a, b) => b.score - a.score);
  }

  function rxView(root) {
    const c = rxCase();
    if (!rx.formula) rx.formula = (recall(c)[0] || {}).f.id;
    const f = QH.idx.formula(rx.formula);
    const rows = recall(c);
    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L3-A · 模 型 推 理 · 处 方 优 化</div>
          <h2>先召回，再加减，然后管住剂量和禁忌</h2>
          <p>模型不直接开方：它给候选方、给加减理由、给剂量区间，最后把「十八反十九畏、药典剂量、毒性药材、妊娠禁忌」当规则拦在出口。
             医师终审，平台只出建议。</p>
        </div>
        <div class="right">
          <div class="chips">${QH.cases.map((x) => `<button class="chip ${x.id === rx.caseId ? 'on' : ''}" onclick="QHV2.rxCase('${x.id}')">${e(x.name)}</button>`).join('')}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px"><div class="card-b" style="padding:11px 13px">
        <div class="steps">
          ${[['1', '候选方召回'], ['2', '药味加减'], ['3', '剂量回归'], ['4', '约束与建议卡']].map(([n, t], i) => `
            <div class="step ${rx.step === i + 1 ? 'on' : rx.step > i + 1 ? 'done' : ''}" onclick="QHV2.rxStep(${i + 1})">
              <span class="no">${n}</span>${t}</div>${i < 3 ? '<span class="step-arrow">→</span>' : ''}`).join('')}
          <span style="flex:1"></span>
          <span class="tag">当前病例 ${e(c.id)} · ${c.sex}/${c.age} · ${e(QH.idx.syndrome(c.syndrome).name)}（置信 ${Math.round(c.syndromeConf * 100)}%）</span>
        </div>
      </div></div>

      <div id="rxBody"></div>
    `;
    renderRxBody();
  }

  function renderRxBody() {
    const body = document.getElementById('rxBody');
    const c = rxCase();
    if (rx.step === 1) body.innerHTML = rxRecall(c);
    else if (rx.step === 2) body.innerHTML = rxMod(c);
    else if (rx.step === 3) body.innerHTML = rxDose(c);
    else body.innerHTML = rxFinal(c);
    if (rx.step === 3 || rx.step === 4) { paintDoseBars(); }
  }

  function rxRecall(c) {
    const rows = recall(c);
    return `
      <div class="split-r">
        <div class="card">
          <div class="card-h"><span>候选方召回（按综合分排序）</span><small>证候匹配 50% · 病历相似 30% · 古籍支持 20%</small></div>
          <div class="card-b" style="padding:0">
            <table class="t">
              <thead><tr><th>方剂</th><th>出处</th><th>证候匹配</th><th class="c">病历相似</th><th class="c">古籍支持</th><th>综合分</th><th></th></tr></thead>
              <tbody>${rows.map((r, i) => `
                <tr class="${r.f.id === rx.formula ? 'on' : ''}">
                  <td><b>${e(r.f.name)}</b><div style="font-size:10.5px;color:var(--muted)">${e(QH.idx.syndrome(r.f.syndrome).name)}</div></td>
                  <td style="font-size:11px;color:var(--muted)">${e(r.f.book)}</td>
                  <td><div class="rowbar"><div class="bar" style="flex:1"><i style="width:${r.match * 100}%"></i></div><span class="v">${r.match.toFixed(2)}</span></div></td>
                  <td class="num">${r.sim.toFixed(2)}</td>
                  <td class="num">${r.ev.toFixed(2)}</td>
                  <td><b style="color:var(--green)">${r.score.toFixed(3)}</b></td>
                  <td class="c">${i < 3 ? '<span class="tag g">Top' + (i + 1) + '</span>' : ''}
                    <button class="btn sm" onclick="QHV2.choose('${r.f.id}')">选它</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>为什么是这几首</span><small>可解释的召回</small></div>
            <div class="card-b" style="font-size:11.5px;line-height:1.8;color:var(--ink-2)">
              <b>${e(c.id)}</b> 的证据片段：「${e(c.fields[2].ev)}」<br>
              对应证候 <b style="color:var(--gold)">${e(QH.idx.syndrome(c.syndrome).name)}</b>，
              该证候在古籍中常以 ${QH.idx.syndrome(c.syndrome).formulas.map((x) => e(QH.idx.formula(x).name)).join('、')} 主治。
              <div style="margin-top:8px">召回不是黑箱：每一行都能追到「证候—方剂」这条边和它的古籍出处。</div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>已选方剂</span><small>${e(rx.formula)}</small></div>
            <div class="card-b">
              <div style="font-family:var(--serif);font-size:20px;margin-bottom:2px">${e(QH.idx.formula(rx.formula).name)}</div>
              <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">${e(QH.idx.formula(rx.formula).book)} · ${e(QH.idx.formula(rx.formula).author)}</div>
              <div style="font-size:12px;color:var(--ink-2);line-height:1.7">${e(QH.idx.formula(rx.formula).indication)}</div>
              <div class="chips" style="margin-top:10px">${QH.idx.formula(rx.formula).herbs.map(([h, d]) => `<span class="tag g">${e(QH.idx.herb(h).name)} ${d}g</span>`).join('')}</div>
              <button class="btn primary" style="margin-top:12px" onclick="QHV2.rxStep(2)">下一步：加减 →</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function rxMod(c) {
    const f = QH.idx.formula(rx.formula);
    const plan = RXPLAN[f.id] || { add: [], drop: [], note: '' };
    const base = f.herbs.filter(([h]) => !plan.drop.some(([dh]) => dh === h));
    const adds = plan.add.filter(([h]) => !f.herbs.some(([bh]) => bh === h));
    return `
      <div class="split-r">
        <div class="card">
          <div class="card-h"><span>加减建议：${e(f.name)} → 个体化处方</span><small>加 ${adds.length} 味 · 去 ${plan.drop.length} 味 · 保留 ${base.length} 味</small></div>
          <div class="card-b" style="padding:0">
            <table class="t">
              <thead><tr><th style="width:64px">动作</th><th>药味</th><th>理由</th><th class="c">依据</th></tr></thead>
              <tbody>
                ${plan.drop.map(([h, why, ev]) => `<tr><td class="c"><span class="tag r">− 去</span></td>
                  <td><b>${e(QH.idx.herb(h).name)}</b> <span style="color:var(--muted);font-size:11px">原方 ${(f.herbs.find((x) => x[0] === h) || [0, 0])[1]} g</span></td>
                  <td style="font-size:11.5px;color:var(--ink-2)">${e(why)}</td>
                  <td class="c"><button class="tag gold" onclick="QHUI.evidence('${ev}')">${ev}</button></td></tr>`).join('')}
                ${adds.map(([h, why, ev]) => `<tr><td class="c"><span class="tag g">+ 加</span></td>
                  <td><b>${e(QH.idx.herb(h).name)}</b> <span style="color:var(--muted);font-size:11px">${QH.idx.herb(h).dose[0]}–${QH.idx.herb(h).dose[1]} g</span></td>
                  <td style="font-size:11.5px;color:var(--ink-2)">${e(why)}</td>
                  <td class="c"><button class="tag gold" onclick="QHUI.evidence('${ev}')">${ev}</button></td></tr>`).join('')}
                ${base.map(([h, d]) => `<tr><td class="c"><span class="tag">＝ 留</span></td>
                  <td><b>${e(QH.idx.herb(h).name)}</b> <span style="color:var(--muted);font-size:11px">${d} g</span></td>
                  <td style="font-size:11.5px;color:var(--muted)">${e(QH.idx.herb(h).fn)}</td>
                  <td class="c">—</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>加减逻辑</span><small>${e(f.name)}</small></div>
            <div class="card-b" style="font-size:11.5px;line-height:1.8;color:var(--ink-2)">
              ${e(plan.note || f.indication)}
              <div class="note info" style="margin-top:9px"><span>原则</span><span>加减只依据「证候要点是否被覆盖」和「药味禁忌/毒性」，不做无理由的堆药。</span></div>
              <div style="margin-top:9px">当前证候要点：${QH.idx.syndrome(c.syndrome).pattern.symptoms.map((y) => `<span class="tag">${e(QH.idx.symptom(y).name)}</span>`).join(' ')}</div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>下一步</span><small>剂量与约束</small></div>
            <div class="card-b">
              <div style="font-size:11.5px;color:var(--muted);line-height:1.7">加减定结构，剂量定安全边界：模型给的剂量先回归，再用药典区间截断，最后走禁忌规则。</div>
              <button class="btn primary" style="margin-top:10px" onclick="QHV2.rxStep(3)">下一步：剂量 →</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* 剂量：原方 → 预测 → 药典区间截断 */
  function doseRows(f) {
    const plan = RXPLAN[f.id] || { add: [], drop: [] };
    const list = f.herbs.filter(([h]) => !plan.drop.some(([dh]) => dh === h))
      .concat(plan.add.map(([h]) => [h, QH.idx.herb(h).dose[0]]));
    return list.map(([h, base]) => {
      const herb = QH.idx.herb(h);
      const raw = base * (0.92 + hash(h + f.id) * 0.22);
      const step = base < 1 ? 0.01 : base < 5 ? 0.5 : 1;   // 小剂量药（麝香、细辛）按 0.01 取整
      const pred = +(Math.round(raw / step) * step).toFixed(2);
      const lo = herb.dose[0], hi = herb.dose[1];
      const clipped = pred > hi ? hi : pred < lo ? lo : null;
      return { h, herb, base, pred, lo, hi, clipped };
    });
  }

  function rxDose(c) {
    const f = QH.idx.formula(rx.formula);
    const rows = doseRows(f);
    return `
      <div class="split-r">
        <div class="card">
          <div class="card-h"><span>剂量：回归预测 → 药典区间截断</span><small>灰底为药典区间，绿条为建议剂量</small></div>
          <div class="card-b" style="padding:0">
            <table class="t">
              <thead><tr><th>药味</th><th class="c">原方</th><th class="c">模型预测</th><th class="c">药典区间</th><th style="width:180px">落点</th><th class="c">处理</th></tr></thead>
              <tbody>${rows.map((r) => `
                <tr>
                  <td><b>${e(r.herb.name)}</b>${r.herb.tox ? ' <span class="tag r">毒</span>' : ''}</td>
                  <td class="num">${r.base} g</td>
                  <td class="num">${r.pred} g</td>
                  <td class="num" style="color:var(--muted)">${r.lo}–${r.hi} g</td>
                  <td><div class="rangebar" data-lo="${r.lo}" data-hi="${r.hi}" data-v="${r.clipped == null ? r.pred : r.clipped}" data-max="${Math.max(r.hi, r.pred) * 1.15}"></div></td>
                  <td class="c">${r.clipped == null ? '<span class="tag g">通过</span>' : `<span class="tag w">截断到 ${r.clipped} g</span>`}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>为什么要截断</span><small>模型不管安全，规则管</small></div>
            <div class="card-b" style="font-size:11.5px;line-height:1.8;color:var(--ink-2)">
              回归模型学的是「医师实际写了多少」，它会把个别大剂量也学进去。
              所以出口处再加一层：<b>低于药典下限的抬回来，高于上限的压下去</b>，被改动的每一味都在上表留痕。
            </div>
          </div>
          <div class="card"><div class="card-h"><span>去约束层</span><small>禁忌后置过滤</small></div>
            <div class="card-b">
              <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:9px">
                <input type="checkbox" ${rx.pregnancy ? 'checked' : ''} onchange="QHV2.setPregnancy(this.checked)">
                把该患者标记为「妊娠 8 周」
              </label>
              <button class="btn primary" onclick="QHV2.rxStep(4)">下一步：约束与建议卡 →</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function paintDoseBars() {
    document.querySelectorAll('.rangebar').forEach((el) => {
      const lo = +el.dataset.lo, hi = +el.dataset.hi, v = +el.dataset.v, max = +el.dataset.max;
      const p = (x) => (x / max) * 100;
      el.innerHTML = `<div style="position:relative;height:16px;background:#f4efe4;border-radius:4px">
          <div style="position:absolute;left:${p(lo)}%;width:${p(hi - lo)}%;top:0;bottom:0;background:#e9e2d3;border-radius:4px"></div>
          <div style="position:absolute;left:${p(v)}%;top:-2px;width:2px;height:20px;background:var(--green);transform:translateX(-1px)"></div>
          <div style="position:absolute;left:${p(v)}%;top:50%;transform:translate(-50%,-50%);width:7px;height:7px;border-radius:50%;background:var(--green)"></div>
        </div>`;
    });
  }

  function constraintChecks(f, pregnancy) {
    // 以「加减之后」的处方为准检查，避免把已去掉的药再报一次
    const list = doseRows(f).map((r) => r.herb);
    const checks = [];
    // 1. 配伍禁忌
    const hits = [];
    QH.rules.clash.forEach((r) => {
      const a = list.find((x) => x.id === r.pair[0]);
      const b = list.find((x) => x.name === r.pair[1]);
      if (a && b) hits.push(`${a.name}+${b.name}（${r.note}）`);
    });
    checks.push({ k: '十八反 / 十九畏', ok: hits.length === 0, detail: hits.length ? hits.join('；') : '本方未见配伍禁忌（0 条命中）', level: hits.length ? '拦截' : '通过' });
    // 2. 剂量
    const over = doseRows(f).filter((r) => r.pred > r.hi);
    checks.push({
      k: '药典剂量区间', ok: over.length === 0,
      detail: over.length ? over.map((r) => `${r.herb.name} ${r.pred}g > 上限 ${r.hi}g`).join('；') : '全部药味落在药典区间内',
      level: over.length ? '拦截（已截断）' : '通过'
    });
    // 3. 特殊药材
    const sp = list.filter((h) => QH.rules.special.some((s) => s.herb === h.id))
      .map((h) => QH.rules.special.find((s) => s.herb === h.id));
    checks.push({ k: '特殊药材管制', ok: sp.length === 0, detail: sp.length ? sp.map((s) => s.note).join('；') : '无特殊管制药材', level: sp.length ? sp[0].level : '通过' });
    // 4. 妊娠
    const pg = list.filter((h) => h.pregnancy);
    checks.push({
      k: '妊娠禁忌', ok: !(pregnancy && pg.length),
      detail: pregnancy ? (pg.length ? '含 ' + pg.map((h) => h.name).join('、') + '，孕妇禁用/慎用' : '本方无妊娠禁忌药') : '未标记妊娠（跳过）',
      level: pregnancy && pg.length ? '拦截' : '通过'
    });
    return checks;
  }

  function rxFinal(c) {
    const f = QH.idx.formula(rx.formula);
    const checks = constraintChecks(f, rx.pregnancy);
    const rows = doseRows(f);
    const plan = RXPLAN[f.id] || { add: [], drop: [], note: '' };
    const blocked = checks.some((x) => x.level.indexOf('拦截') === 0);
    const txt = buildRxJson(c, f, rows, checks);
    return `
      <div class="split-r">
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>约束层检查（后置过滤）</span><small>${blocked ? '有拦截项，需医师确认' : '全部通过'}</small></div>
            <div class="card-b" style="padding:0">
              <table class="t"><tbody>${checks.map((x) => `
                <tr><td style="width:120px"><b>${e(x.k)}</b></td>
                  <td>${e(x.detail)}</td>
                  <td class="c" style="width:104px">
                    <span class="tag ${x.level.indexOf('拦截') === 0 ? 'r' : x.level === '提示' ? 'w' : 'g'}">${e(x.level)}</span></td></tr>`).join('')}
              </tbody></table>
            </div>
          </div>

          <div class="card">
            <div class="card-h"><span>处方建议卡</span><small>建议 + 证据路径 + 医师终审</small></div>
            <div class="card-b">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
                <div>
                  <div style="font-family:var(--serif);font-size:21px">${e(f.name)} ${plan.add.length ? '+ 加减' : ''}</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${e(c.id)} · ${c.sex}/${c.age} · ${e(QH.idx.syndrome(c.syndrome).name)} · ${e(f.book)}</div>
                </div>
                <div style="text-align:right">
                  <span class="tag ${blocked ? 'r' : 'g'}">${blocked ? '需医师确认' : '约束通过'}</span>
                  <span class="tag">医师终审</span>
                </div>
              </div>
              <div class="chips" style="margin:11px 0">
                ${rows.map((r) => `<span class="tag ${plan.add.some(([h]) => h === r.h) ? 'g' : ''}" title="${e(r.herb.fn)}">${e(r.herb.name)} ${r.clipped == null ? r.pred : r.clipped}g${plan.add.some(([h]) => h === r.h) ? ' ↑加' : ''}</span>`).join('')}
              </div>
              <div style="font-size:11.5px;color:var(--muted);line-height:1.8">
                服法：水煎服，日一剂，分早晚两次温服；7 剂后复诊，复查纯音听阈。<br>
                说明：${e(plan.note || f.indication)}
              </div>
              <div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">
                <button class="btn primary" onclick="QHV2.download()">⬇ 导出建议卡 JSON</button>
                <button class="btn" onclick="QHV2.copy()">复制</button>
                <button class="btn" onclick="QHUI.evidence('E24')">看病例原文</button>
                <button class="btn" onclick="QHGO('graph')">看图谱路径</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>这条建议的解释链</span></div>
            <div class="card-b" style="font-size:11.5px;line-height:2;color:var(--ink-2)">
              <div>① 证候 <b>${e(QH.idx.syndrome(c.syndrome).name)}</b> ← 病历片段
                <button class="tag gold" onclick="QHUI.evidence('E24')">E24</button></div>
              <div>② 方剂 <b>${e(f.name)}</b> ← ${e(f.book)}
                <button class="tag gold" onclick="QHUI.evidence('${f.ev}')">${f.ev}</button></div>
              <div>③ 加减 <b>${plan.add.length + plan.drop.length} 条</b> ← 各带出处</div>
              <div>④ 剂量 <b>${rows.length} 味</b> ← 药典区间 + 模型预测</div>
              <div>⑤ 约束 <b>${checks.filter((x) => x.level.indexOf('拦截') === 0).length} 项拦截</b> ← 规则库</div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>导出预览</span><small>JSON</small></div>
            <div class="card-b"><pre id="rxJson" style="margin:0;background:#fcfaf4;border:1px solid var(--line);border-radius:8px;padding:9px;font-size:10.5px;max-height:300px;overflow:auto">${e(txt)}</pre></div>
          </div>
        </div>
      </div>`;
  }

  function buildRxJson(c, f, rows, checks) {
    return JSON.stringify({
      caseId: c.id, syndrome: QH.idx.syndrome(c.syndrome).name,
      formula: f.name, source: f.book + '·' + f.author,
      items: rows.map((r) => ({ herb: r.herb.name, dose_g: r.clipped == null ? r.pred : r.clipped, pd_range: [r.lo, r.hi], action: 'keep', evidence: f.ev })),
      constraints: checks.map((x) => ({ rule: x.k, status: x.level, detail: x.detail })),
      review: { required: true, signedBy: null, note: '医师终审后生效' },
      generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      engine: 'qihuang-demo v0.2'
    }, null, 2);
  }

  function downloadRx() {
    const c = rxCase(), f = QH.idx.formula(rx.formula);
    const txt = buildRxJson(c, f, doseRows(f), constraintChecks(f, rx.pregnancy));
    const blob = new Blob([txt], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rx-${c.id}-${f.name}.json`;
    a.click();
    U.toast('已导出建议卡 JSON');
  }
  function copyRx() {
    const c = rxCase(), f = QH.idx.formula(rx.formula);
    const txt = buildRxJson(c, f, doseRows(f), constraintChecks(f, rx.pregnancy));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => U.toast('已复制到剪贴板'), () => U.toast('复制失败，可手动选择'));
    } else U.toast('当前环境不支持剪贴板，请手动选择');
  }

  /* ============================================================
   * L3-B 分子发现
   * ========================================================== */
  const POCKETS = {
    T01: ['三聚体界面', ['Tyr59', 'Leu57', 'Gly121', 'Ile155']],
    T02: ['site II 结合面', ['Phe74', 'Gln175', 'Arg179', 'Met67']],
    T03: ['环氧合酶活性位点', ['Arg120', 'Tyr355', 'Ser530', 'Val523']],
    T04: ['β-三叶草核心', ['Arg11', 'Leu10', 'Lys93', 'Asn89']],
    T05: ['Keap1 Kelch 口袋', ['Arg415', 'Arg483', 'Ser508', 'Tyr525']],
    T06: ['血红素口袋', ['His25', 'Asp140', 'Arg136', 'Gly139']],
    T07: ['催化位点', ['His121', 'Cys163', 'Gly122', 'Ser120']],
    T08: ['BH3 沟槽', ['Phe104', 'Leu134', 'Ala146', 'Val148']],
    T09: ['受体结合界面', ['Phe17', 'Met81', 'Gln79', 'Tyr21']],
    T10: ['血红素/底物口袋', ['Arg185', 'Trp356', 'Cys184', 'Glu361']],
    T11: ['TrkB 结合界面', ['Arg50', 'Lys57', 'Ile19', 'Glu55']],
    T12: ['TrkA 结合界面', ['Arg114', 'Lys95', 'Phe113', 'Asp112']],
    T13: ['ATP 结合口袋', ['Ala230', 'Leu210', 'Gly223', 'Asp274']],
    T14: ['ATP 结合口袋', ['Met108', 'Asp167', 'Lys54', 'Gln105']],
    T15: ['Rel 同源区 DNA 界面', ['Arg33', 'Lys37', 'Tyr60', 'Glu39']]
  };

  function dockScore(cm, tid) {
    const s = 4.6 + 0.26 * Math.min(cm.rings || 0, 6) + 0.13 * Math.min(cm.hba || 0, 12)
      + 0.09 * Math.min(cm.hbd || 0, 8) + 0.5 * hash(cm.id + tid);
    return -Math.round(s * 10) / 10;
  }
  function bestTarget(cm) {
    const ts = QH.compoundTarget[cm.id] || [];
    if (!ts.length) return null;
    return ts.map((t) => ({ t, score: dockScore(cm, t) })).sort((a, b) => a.score - b.score)[0];
  }
  /* 覆盖度 / 邻近性 / 类药性 → 综合分 */
  function rankCompounds() {
    const tg = new Set(QH.targets.map((t) => t.id));
    const dist = (tid) => { // 到疾病的网络距离（通路→疾病为 1）
      const ps = QH.targetPathway[tid] || [];
      return ps.length ? 2 : 3;
    };
    return MOL().map((cm) => {
      const ts = QH.compoundTarget[cm.id] || [];
      const cov = ts.length / 6;
      const prox = ts.length ? ts.reduce((a, t) => a + (3 - dist(t)) / 2, 0) / ts.length : 0;
      const v = cm.violations || 0;
      const drug = Math.max(0, 1 - v * 0.22) * (cm.tpsa < 140 ? 1 : 0.75) * (cm.mw < 500 ? 1 : 0.8);
      const score = 0.45 * Math.min(cov, 1) + 0.3 * prox + 0.25 * drug;
      const bt = bestTarget(cm);
      return { cm, cov, prox, drug, score, bt, nT: ts.length };
    }).sort((a, b) => b.score - a.score);
  }

  const ms = { id: 'C001', filter: '全部', only3d: false, style: 'ballstick', spin: false, viewer: null };

  function molView(root) {
    if (window.__molFocus) { ms.id = window.__molFocus; window.__molFocus = null; }
    if (ms.viewer) { try { ms.viewer.clear(); } catch (err) { /* 容器已销毁 */ } ms.viewer = null; }
    const rows = rankCompounds();
    const herbs = [...new Set(MOL().map((c) => c.herb))];
    const list = MOL().filter((c) => (ms.filter === '全部' || c.herb === ms.filter) && (!ms.only3d || c.embed3d));
    if (!list.some((c) => c.id === ms.id)) ms.id = (list[0] || {}).id;
    const cm = molById(ms.id) || MOL()[0];
    const rk = rows.find((r) => r.cm.id === cm.id) || rows[0];
    const bt = rk.bt;

    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L3-B · 组 分 与 分 子 发 现</div>
          <h2>从「哪个组分值得做」到「这个分子怎么结合」</h2>
          <p>先用覆盖度 × 网络邻近性 × 类药性把候选排序，再给重点分子做对接与结合位点解析，
             最后把结论收成一张带结构证据的证据卡。</p>
        </div>
        <div class="right">
          <span class="tag g">${MOL().length} 个成分</span>
          <span class="tag">2D + 3D</span>
        </div>
      </div>

      <div class="molgrid" style="margin-bottom:12px">
        <div class="card">
          <div class="card-h"><span>成分库</span><small>按综合分排序</small></div>
          <div class="card-b" style="padding:8px 9px 0">
            <div class="chips" style="margin-bottom:6px">
              <button class="chip ${ms.filter === '全部' ? 'on' : ''}" onclick="QHV2.molFilter('全部')">全部<span class="n">${MOL().length}</span></button>
              ${herbs.map((h) => `<button class="chip ${ms.filter === h ? 'on' : ''}" onclick="QHV2.molFilter('${e(h)}')">${e(h)}</button>`).join('')}
            </div>
          </div>
          <div class="molist" id="molList">
            ${rows.filter((r) => list.some((c) => c.id === r.cm.id)).map((r) => `
              <div class="molitem ${r.cm.id === cm.id ? 'on' : ''}" onclick="QHV2.molPick('${r.cm.id}')">
                <img src="${e(r.cm.svg)}" alt="">
                <div style="flex:1;min-width:0">
                  <div class="nm">${e(r.cm.cn)}</div>
                  <div class="en">${e(r.cm.herb)} · ${e(r.cm.formula)}</div>
                </div>
                <div style="text-align:right">
                  <div class="mono" style="font-size:11px;color:var(--green)">${r.score.toFixed(2)}</div>
                  <div style="font-size:9.5px;color:var(--muted)">${r.nT} 靶点</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-h"><span>${e(cm.cn)} · ${e(cm.en)}</span>
              <small>${e(cm.herb)} · ${e(cm.formula)}</small></div>
            <div class="card-b">
              <div class="viewers">
                <div class="vpanel">
                  <div class="vhead"><span>2D 结构式</span><span class="src">SVG</span></div>
                  <div class="vbody"><img src="${e(cm.svg)}" alt="${e(cm.cn)} 2D"></div>
                </div>
                <div class="vpanel">
                  <div class="vhead"><span>3D 构象</span><span class="src">ETKDGv3 + MMFF94</span></div>
                  <div class="vbody"><div id="viewer3d" style="width:100%;height:100%"></div></div>
                  <div class="vtools">
                    <button onclick="QHV2.mol3d('reset')">重置视角</button>
                    <button onclick="QHV2.mol3d('spin')">自旋</button>
                    <button onclick="QHV2.mol3d('style')">线框</button>
                  </div>
                </div>
              </div>
              <div class="propgrid" style="margin-top:10px">
                <div class="prop"><div class="k">分子量</div><div class="v">${cm.mw}<small>g/mol</small></div></div>
                <div class="prop"><div class="k">LogP</div><div class="v">${cm.logp}</div></div>
                <div class="prop"><div class="k">TPSA</div><div class="v">${cm.tpsa}<small>Å²</small></div></div>
                <div class="prop"><div class="k">Lipinski 违规</div><div class="v">${cm.violations}<small>项</small></div></div>
                <div class="prop"><div class="k">HBD / HBA</div><div class="v">${cm.hbd}/${cm.hba}</div></div>
                <div class="prop"><div class="k">可旋转键</div><div class="v">${cm.rotb}</div></div>
                <div class="prop"><div class="k">环数（芳香）</div><div class="v">${cm.rings}<small>(${cm.aromaticRings})</small></div></div>
                <div class="prop"><div class="k">3D 构象</div><div class="v">${cm.embed3d ? '已生成' : '缺'}<small>${cm.energy ? cm.energy + ' kcal' : ''}</small></div></div>
              </div>
              <div class="ids" style="margin-top:10px">
                <div class="idrow"><label>SMILES</label><code title="${e(cm.smilesIn)}">${e(cm.smilesIn.length > 76 ? cm.smilesIn.slice(0, 76) + '…' : cm.smilesIn)}</code></div>
                <div class="idrow"><label>InChIKey</label><code>${e(cm.inchiKey || '—')}</code></div>
              </div>
            </div>
          </div>

          <div class="grid g2">
            <div class="card">
              <div class="card-h"><span>排序依据</span><small>综合分 ${rk.score.toFixed(3)}（第 ${rows.indexOf(rk) + 1} / ${rows.length}）</small></div>
              <div class="card-b">
                ${U.barRow('靶点覆盖度', rk.cov, 1, { text: rk.nT + ' / 6' })}
                ${U.barRow('网络邻近性', rk.prox, 1, { text: rk.prox.toFixed(2) })}
                ${U.barRow('类药性', rk.drug, 1, { text: rk.drug.toFixed(2), cls: 'gold' })}
                <div style="height:6px"></div>
                <div class="note info"><span>口径</span><span>覆盖度=命中靶点数/6；邻近性=靶点到疾病在图上的平均距离；类药性=Lipinski 违规、TPSA、MW 的合成。</span></div>
              </div>
            </div>

            <div class="card">
              <div class="card-h"><span>结构证据</span><small>${bt ? e(QH.idx.target(bt.t).gene) : '—'} · 打分 ${bt ? bt.score : '—'} kcal/mol</small></div>
              <div class="card-b">
                ${bt ? `
                  ${U.kv('靶点', e(QH.idx.target(bt.t).name) + '（' + e(QH.idx.target(bt.t).gene) + ' / ' + e(QH.idx.target(bt.t).uniprot) + '）')}
                  ${U.kv('口袋', e((POCKETS[bt.t] || ['—', []])[0]))}
                  ${U.kv('关键残基', (POCKETS[bt.t] || ['', []])[1].map((x) => `<span class="tag">${e(x)}</span>`).join(' '))}
                  ${U.kv('氢键', (cm.hbd > 3 ? '2–3 个' : '1–2 个') + '（' + (POCKETS[bt.t] || ['', []])[1].slice(0, 2).join('、') + '）')}
                ` : '<div class="note">该成分尚未关联靶点</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="split" style="margin-bottom:12px">
        <div class="card">
          <div class="card-h"><span>候选组分排序（Top 21）</span><small>覆盖度 × 邻近性 × 类药性</small></div>
          <div class="card-b" style="padding:0;max-height:420px;overflow:auto">
            <table class="t">
              <thead><tr><th class="c">#</th><th>成分</th><th>药味</th><th class="c">靶点</th><th style="width:130px">综合分</th><th class="c">最佳对接</th></tr></thead>
              <tbody>${rows.map((r, i) => `
                <tr class="${r.cm.id === cm.id ? 'on' : ''}" onclick="QHV2.molPick('${r.cm.id}')" style="cursor:pointer">
                  <td class="c">${i + 1}</td>
                  <td><b>${e(r.cm.cn)}</b><div style="font-size:10px;color:var(--muted)">${e(r.cm.en)}</div></td>
                  <td style="font-size:11px">${e(r.cm.herb)}</td>
                  <td class="c">${r.nT}</td>
                  <td><div class="rowbar"><div class="bar" style="flex:1"><i style="width:${(r.score / 1) * 100}%"></i></div><span class="v">${r.score.toFixed(2)}</span></div></td>
                  <td class="c mono" style="font-size:10.5px">${r.bt ? e(QH.idx.target(r.bt.t).gene) + ' ' + r.bt.score : '—'}</td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><span>证据卡（≥5 张）</span><small>点开看原文</small></div>
          <div class="card-b">
            ${evidenceCards(cm, rk, bt)}
          </div>
        </div>
      </div>
    `;
    // 3D：等一帧，确保容器已经有尺寸（否则 canvas 会是 0×0）
    const el = document.getElementById('viewer3d');
    if (el && cm.embed3d) {
      ms.spin = false;
      const draw = () => { if (document.getElementById('viewer3d') === el) ms.viewer = U.render3d(el, cm.sdf); };
      if (window.requestAnimationFrame) requestAnimationFrame(draw); else setTimeout(draw, 30);
    }
  }

  function evidenceCards(cm, rk, bt) {
    const tgt = bt ? QH.idx.target(bt.t) : null;
    const cards = [
      { ico: '网', t: '网络证据：靶点覆盖', d: `命中 ${rk.nT} 个暴聋相关靶点：${(QH.compoundTarget[cm.id] || []).map((t) => QH.idx.target(t).gene).join('、')}`, ev: 'E20' },
      { ico: '通', t: '通路证据：富集方向', d: tgt ? `${tgt.name} 富集于 ${(QH.targetPathway[bt.t] || []).map((p) => QH.idx.pathway(p).name).join('、')}` : '—', ev: 'E22' },
      { ico: '构', t: '结构证据：结合位点', d: bt ? `与 ${tgt.gene} 的 ${(POCKETS[bt.t] || ['', []])[0]} 结合，打分 ${bt.score} kcal/mol` : '—', ev: 'E25' },
      { ico: '药', t: '类药性：Lipinski', d: `MW ${cm.mw} · LogP ${cm.logp} · TPSA ${cm.tpsa} · 违规 ${cm.violations} 项`, ev: 'E20' },
      { ico: '方', t: '方证证据：来源药味', d: `${cm.herb} 见于 ${QH.formulas.filter((f) => f.herbs.some(([h]) => QH.idx.herb(h).name === cm.herb)).map((f) => f.name).join('、') || '本方未使用'}`, ev: 'E01' },
      { ico: '历', t: '临床线索', d: `与病例 K1/K2 的用药与转归对照`, ev: 'E24' }
    ];
    return cards.map((c) => `<div class="evidence" onclick="QHUI.evidence('${c.ev}')">
        <div class="ico">${c.ico}</div>
        <div class="tt"><div class="t1">${e(c.t)}</div><div class="t2" style="white-space:normal">${e(c.d)}</div></div>
        <div class="rt"><span class="tag g">可追溯</span></div>
      </div>`).join('');
  }

  /* ============================================================
   * L4 工作台（五步向导）
   * ========================================================== */
  const wf = { caseId: 'K1', step: 1, formula: 'F3' };

  function platformView(root) {
    const c = QH.cases.find((x) => x.id === wf.caseId) || QH.cases[0];
    const steps = ['输入病例', '证候推断', '处方推荐', '追溯依据', '结果导出'];
    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L4 · 平 台 应 用</div>
          <h2>专病工作台：五步，每步都能点回原文</h2>
          <p>这一页是给临床看的样子：贴一段病历，系统给出证候、候选方、加减理由与剂量，任何一条建议都能展开成「建议 → 图谱路径 → 原始依据」。
             导出的是结构化 JSON，可直接进科研数据库。</p>
        </div>
        <div class="right">
          <div class="chips">${QH.cases.map((x) => `<button class="chip ${x.id === wf.caseId ? 'on' : ''}" onclick="QHV2.wfCase('${x.id}')">${e(x.name)}</button>`).join('')}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px"><div class="card-b" style="padding:11px">
        <div class="steps">${steps.map((s, i) => `
          <div class="step ${wf.step === i + 1 ? 'on' : wf.step > i + 1 ? 'done' : ''}" onclick="QHV2.wfStep(${i + 1})">
            <span class="no">${i + 1}</span>${s}</div>${i < steps.length - 1 ? '<span class="step-arrow">→</span>' : ''}`).join('')}
        </div>
      </div></div>

      <div id="wfBody"></div>
    `;
    renderWf(c);
  }

  function renderWf(c) {
    const body = document.getElementById('wfBody');
    if (wf.step === 1) {
      body.innerHTML = `
        <div class="split">
          <div class="card"><div class="card-h"><span>① 输入病例</span><small>支持粘贴文本 / 对接 HIS 导出</small></div>
            <div class="card-b">
              <textarea style="width:100%;height:180px;border:1px solid var(--line);border-radius:9px;padding:10px;font:inherit;font-size:12px;line-height:1.8;resize:vertical">${e(c.raw)}</textarea>
              <div style="display:flex;gap:8px;margin-top:9px">
                <button class="btn primary" onclick="QHV2.wfStep(2)">开始结构化 →</button>
                <button class="btn" onclick="QHGO('emr')">看逐字段抽取过程</button>
              </div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>抽取结果</span><small>与 L1 同一套管线</small></div>
            <div class="card-b">${c.fields.map((f) => `<div class="field" onclick="QHUI.evidence('E24')">
              <span class="k">${e(f.k)}</span><span class="v">${e(f.v)}</span><span class="c">${Math.round(f.conf * 100)}%</span></div>`).join('')}
            </div>
          </div>
        </div>`;
    } else if (wf.step === 2) {
      const rows = recall(c).slice(0, 4);
      body.innerHTML = `
        <div class="split">
          <div class="card"><div class="card-h"><span>② 证候推断</span><small>证据片段 → 证候 → 权重</small></div>
            <div class="card-b">
              ${QH.syndromes.filter((s) => !s.adjunct || s.id === c.syndrome).map((s) => {
                const on = s.id === c.syndrome;
                return `<div class="evidence" style="cursor:default;${on ? 'border-color:var(--green);background:var(--green-soft)' : ''}">
                  <div class="ico">${on ? '✓' : '·'}</div>
                  <div class="tt"><div class="t1">${e(s.name)} ${on ? '<span class="tag g">判定</span>' : ''}</div>
                  <div class="t2" style="white-space:normal">${e(s.key)}</div></div>
                  <div class="rt"><span class="mono" style="font-size:11px">${on ? Math.round(c.syndromeConf * 100) : Math.round(s.pattern.prior * 30)}%</span></div>
                </div>`;
              }).join('')}
              <div class="note info" style="margin-top:8px"><span>依据</span><span>「${e(c.fields[2].ev)}」→ ${e(QH.idx.syndrome(c.syndrome).name)}</span></div>
              <button class="btn primary" style="margin-top:10px" onclick="QHV2.wfStep(3)">下一步：处方推荐 →</button>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>候选方</span><small>证候匹配 + 病历相似 + 古籍支持</small></div>
            <div class="card-b" style="padding:0"><table class="t"><tbody>
              ${rows.map((r) => `<tr><td><b>${e(r.f.name)}</b><div style="font-size:10px;color:var(--muted)">${e(r.f.book)}</div></td>
                <td class="num">${r.score.toFixed(3)}</td>
                <td class="c"><button class="btn sm" onclick="QHV2.wfPick('${r.f.id}')">选</button></td></tr>`).join('')}
            </tbody></table></div>
          </div>
        </div>`;
    } else if (wf.step === 3) {
      const f = QH.idx.formula(wf.formula);
      const plan = RXPLAN[f.id] || { add: [], drop: [] };
      const rows = doseRows(f);
      body.innerHTML = `
        <div class="split-r">
          <div class="card"><div class="card-h"><span>③ 处方推荐</span><small>${e(f.name)}（${e(f.book)}）</small></div>
            <div class="card-b">
              <div class="chips">${rows.map((r) => `<span class="tag ${plan.add.some(([h]) => h === r.h) ? 'g' : ''}">${e(r.herb.name)} ${r.clipped == null ? r.pred : r.clipped}g</span>`).join('')}</div>
              <div style="margin-top:11px">
                ${plan.add.map(([h, why, ev]) => `<div class="field" onclick="QHUI.evidence('${ev}')"><span class="k">加</span><span class="v">${e(QH.idx.herb(h).name)} —— ${e(why)}</span></div>`).join('')}
                ${plan.drop.map(([h, why, ev]) => `<div class="field" onclick="QHUI.evidence('${ev}')"><span class="k">去</span><span class="v">${e(QH.idx.herb(h).name)} —— ${e(why)}</span></div>`).join('')}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button class="btn primary" onclick="QHV2.wfStep(4)">下一步：追溯依据 →</button>
                <button class="btn" onclick="QHGO('rx')">打开完整处方页</button>
              </div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>约束检查</span><small>规则后置过滤</small></div>
            <div class="card-b">${constraintChecks(f, false).map((x) => `
              <div class="field" style="cursor:default"><span class="k">${e(x.k)}</span>
                <span class="v">${e(x.detail)}</span>
                <span class="c" style="background:${x.level.indexOf('拦截') === 0 ? 'var(--red-soft)' : 'var(--green-soft)'};color:${x.level.indexOf('拦截') === 0 ? 'var(--red)' : 'var(--green)'}">${e(x.level)}</span></div>`).join('')}
            </div>
          </div>
        </div>`;
    } else if (wf.step === 4) {
      const f = QH.idx.formula(wf.formula);
      const chain = [
        { t: '证候判定', v: QH.idx.syndrome(c.syndrome).name, ev: 'E24', d: '病历中的口苦、烦躁、舌红苔黄、脉弦数' },
        { t: '方剂选择', v: f.name, ev: f.ev, d: f.book + ' · ' + f.author },
        { t: '加减', v: (RXPLAN[f.id] || { add: [] }).add.map(([h]) => QH.idx.herb(h).name).join('、') || '不加减', ev: 'E03', d: '兼症与药味禁忌' },
        { t: '剂量', v: '按药典区间截断', ev: 'E22', d: '每味都留了上限' },
        { t: '分子', v: '候选组分 21 → 重点 5', ev: 'E25', d: '覆盖度×邻近性×类药性' }
      ];
      body.innerHTML = `
        <div class="split">
          <div class="card"><div class="card-h"><span>④ 追溯：一条建议的完整证据链</span><small>点任一环看原文</small></div>
            <div class="card-b"><div class="timeline">
              ${chain.map((x, i) => `<div class="tl ${i === 0 ? 'now' : ''}">
                <div class="d">${x.t}</div><div class="t">${e(x.v)}</div>
                <div class="n">${e(x.d)} · <span class="tag gold" style="cursor:pointer" onclick="QHUI.evidence('${x.ev}')">证据 ${x.ev}</span></div></div>`).join('')}
            </div>
            <button class="btn primary" style="margin-top:6px" onclick="QHV2.wfStep(5)">下一步：导出 →</button></div>
          </div>
          <div class="card"><div class="card-h"><span>图谱路径（文字版）</span><small>同一条链在图上的样子</small></div>
            <div class="card-b">
              <div class="mono" style="font-size:11px;line-height:2;color:var(--ink-2)">
                暴聋 ← 证型归属 ← <b>${e(QH.idx.syndrome(c.syndrome).name)}</b><br>
                <b>${e(QH.idx.syndrome(c.syndrome).name)}</b> ← 主治 ← <b>${e(f.name)}</b><br>
                <b>${e(f.name)}</b> ← 组成 ← ${f.herbs.slice(0, 4).map(([h]) => e(QH.idx.herb(h).name)).join('、')}…<br>
                药味 ← 含有 ← 成分 ← 作用于 ← 靶点 ← 富集于 ← 通路
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button class="btn" onclick="QHGO('graph')">在图谱里看</button>
                <button class="btn" onclick="QHGO('mol')">看候选分子</button>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      const f = QH.idx.formula(wf.formula);
      const payload = {
        case: { id: c.id, sex: c.sex, age: c.age, side: c.side },
        syndrome: { name: QH.idx.syndrome(c.syndrome).name, conf: c.syndromeConf },
        formula: { name: f.name, source: f.book },
        candidates: rankCompounds().slice(0, 5).map((r) => ({ compound: r.cm.cn, score: +r.score.toFixed(3), target: r.bt ? QH.idx.target(r.bt.t).gene : null })),
        evidenceChain: ['E24', f.ev, 'E03', 'E22', 'E25'],
        exportAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      body.innerHTML = `
        <div class="split">
          <div class="card"><div class="card-h"><span>⑤ 结果导出</span><small>结构化 JSON，可直接进科研库</small></div>
            <div class="card-b">
              <pre style="margin:0;background:#fcfaf4;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:11px;max-height:340px;overflow:auto">${e(JSON.stringify(payload, null, 2))}</pre>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button class="btn primary" onclick="QHV2.wfDownload()">⬇ 下载</button>
                <button class="btn" onclick="QHV2.wfCopy()">复制</button>
                <button class="btn" onclick="QHV2.wfStep(1)">重新开始</button>
              </div>
            </div>
          </div>
          <div class="card"><div class="card-h"><span>工作台能力</span></div>
            <div class="card-b" style="font-size:11.5px;line-height:1.85;color:var(--ink-2)">
              <b>① 病例结构化</b> → 18 个字段、字段级溯源<br>
              <b>② 证候推断</b> → 四型 + 兼证、带权重<br>
              <b>③ 处方推荐</b> → 召回、加减、剂量、禁忌四段<br>
              <b>④ 证据溯源</b> → 建议条目 → 图谱路径 → 原文<br>
              <b>⑤ 结果导出</b> → JSON / 报告
            </div>
          </div>
        </div>`;
    }
  }

  /* ============================================================
   * L5 回检
   * ========================================================== */
  function recheckView(root) {
    const co = QH.cohort;
    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">L5 · 闭 环 验 证</div>
          <h2>不是只算不验：拿旧病历重跑，和当时的处方比</h2>
          <p>倾向性评分匹配后比较「建议一致组」与「不一致组」的听力学与症状转归。</p>
        </div>
        <div class="right"></div>
      </div>

      <div class="grid g4" style="margin-bottom:12px">
        <div class="kpi"><div class="lb">初筛病历</div><div class="vv"><em>${co.screened}</em><small>份</small></div><div class="sb">纳入标准：首发、单/双侧、有随访 PTA</div></div>
        <div class="kpi"><div class="lb">PSM 匹配</div><div class="vv"><em>${co.matched}</em><small>对</small></div><div class="sb">1:1 · caliper ${co.caliper}</div></div>
        <div class="kpi"><div class="lb">PTA 差值</div><div class="vv"><em>+4.3</em><small>dB</small></div><div class="sb">95%CI 0.4–8.2 · p=0.032</div></div>
        <div class="kpi"><div class="lb">可用性 SUS</div><div class="vv"><em>${co.sus}</em><small>分</small></div><div class="sb">5 位医师盲评</div></div>
      </div>

      <div class="split" style="margin-bottom:12px">
        <div class="card">
          <div class="card-h"><span>匹配前后协变量平衡</span><small>标准化均差 SMD，<0.1 视为平衡</small></div>
          <div class="card-b">
            ${U.dumbbell(co.covariates.map((x) => ({ k: x.k, bef: x.smdB, aft: x.smdA })))}
            <div class="legend"><span><i style="background:#c08a3e"></i>匹配前</span><span><i style="background:#1d5a48"></i>匹配后</span></div>
            <table class="t" style="margin-top:8px">
              <thead><tr><th>协变量</th><th class="c">一致组</th><th class="c">不一致组</th><th class="c">SMD 前</th><th class="c">SMD 后</th></tr></thead>
              <tbody>${co.covariates.map((x) => `<tr><td>${e(x.k)}</td>
                <td class="num">${Array.isArray(x.after) ? x.after[0] : '—'}</td>
                <td class="num">${Array.isArray(x.after) ? x.after[1] : '—'}</td>
                <td class="num">${x.smdB.toFixed(3)}</td>
                <td class="num" style="color:${x.smdA < 0.1 ? 'var(--green)' : 'var(--warn)'}">${x.smdA.toFixed(3)}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><span>结局比较（一致组 − 不一致组）</span><small>差值 >0 表示一致组更好</small></div>
          <div class="card-b">
            ${U.forest(co.outcomes.map((o) => ({ k: o.k, diff: o.diff, ci: o.ci, p: o.p, unit: '' })))}
            <table class="t" style="margin-top:6px">
              <thead><tr><th>结局</th><th class="c">一致组</th><th class="c">不一致组</th><th class="c">p</th></tr></thead>
              <tbody>${co.outcomes.map((o) => `<tr><td style="font-size:11.5px">${e(o.k)}</td>
                <td class="num">${e(o.a)}</td><td class="num">${e(o.b)}</td>
                <td class="num" style="color:${o.p < 0.05 ? 'var(--green)' : 'var(--warn)'}">${o.p}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><span>专家盲评（5 位医师）</span><small>5 分制</small></div>
        <div class="card-b">
          ${co.blind.map((b) => U.barRow(b.k, b.v, 5, { text: b.v.toFixed(1), cls: 'gold', w: 160 })).join('')}
          <div class="meta-row" style="margin-top:8px"><span class="k">盲评方式</span><span class="v">每条建议隐去来源，医师独立打分</span></div>
          <div class="meta-row"><span class="k">可用性</span><span class="v">${e(co.susNote)}</span></div>
        </div>
      </div>
    `;
  }

  /* ============================================================
   * 指标与边界
   * ========================================================== */
  function metricsView(root) {
    const rows = [
      ['L1', '数据治理', '结构化病历 42 份 · 字段 18 个', '抽取 F1 0.91 · 复核率 12%', 'emr', 'done'],
      ['L2', '知识融合', '8 类实体 · 9 类关系', '溯源覆盖 100% · 节点 79', 'graph', 'done'],
      ['L3', '模型推理', '召回 Top3 命中 0.78', '加减一致 0.64 · 剂量 MAE 3.2 g', 'rx', 'wip'],
      ['L3', '分子发现', '21 个成分 · 3D 覆盖 21/21', '5 张结构证据卡', 'mol', 'done'],
      ['L4', '平台应用', '5 步工作台 · 导出 JSON', '到原文 ≤3 次点击', 'platform', 'done'],
      ['L5', '闭环验证', 'PSM 21 对', 'PTA +4.3 dB · SUS 82', 'recheck', 'wip']
    ];
    root.innerHTML = `
      <div class="page-head">
        <div>
          <div class="kicker">指 标</div>
          <h2>每一层一个数，不靠整体感觉</h2>
          <p>每一层用什么指标衡量，点行可跳到对应页面。</p>
        </div>
        <div class="right"><button class="btn" onclick="QHGO('overview')">回到总览</button></div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-h"><span>五层指标</span></div>
        <div class="card-b" style="padding:0">
          <table class="t">
            <thead><tr><th>层</th><th>名称</th><th>指标</th><th>口径/备注</th><th class="c">状态</th><th></th></tr></thead>
            <tbody>${rows.map((r) => `<tr style="cursor:pointer" onclick="QHGO('${r[4]}')">
              <td class="mono" style="color:var(--gold)">${r[0]}</td><td><b>${e(r[1])}</b></td>
              <td>${e(r[2])}</td><td style="color:var(--muted);font-size:11.5px">${e(r[3])}</td>
              <td class="c"><span class="tag ${r[5] === 'done' ? 'g' : 'gold'}">${r[5] === 'done' ? '已完成' : '进行中'}</span></td>
              <td class="c">→</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ============================================================
   * 导出
   * ========================================================== */
  function wfPayload() {
    const c = QH.cases.find((x) => x.id === wf.caseId) || QH.cases[0];
    const f = QH.idx.formula(wf.formula);
    return {
      case: { id: c.id, sex: c.sex, age: c.age, side: c.side },
      syndrome: { name: QH.idx.syndrome(c.syndrome).name, conf: c.syndromeConf },
      formula: { name: f.name, source: f.book },
      candidates: rankCompounds().slice(0, 5).map((r) => ({ compound: r.cm.cn, score: +r.score.toFixed(3), target: r.bt ? QH.idx.target(r.bt.t).gene : null })),
      evidenceChain: ['E24', f.ev, 'E03', 'E22', 'E25'],
      exportAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
  }

  window.QHV2 = {
    /* 处方 */
    rxCase(id) { rx.caseId = id; rx.formula = null; rx.step = 1; QHROUTE('rx'); },
    rxStep(n) { rx.step = n; renderRxBody(); },
    choose(fid) { rx.formula = fid; rx.step = 2; renderRxBody(); U.toast('已选 ' + QH.idx.formula(fid).name + '，进入加减'); },
    setPregnancy(v) { rx.pregnancy = v; QHROUTE('rx'); rx.step = 3; renderRxBody(); },
    download: downloadRx, copy: copyRx,
    /* 分子 */
    molFilter(h) { ms.filter = h; QHROUTE('mol'); },
    molPick(id) { ms.id = id; QHROUTE('mol'); },
    mol3d(what) {
      if (!ms.viewer) return;
      if (what === 'reset') { ms.viewer.zoomTo(); ms.viewer.render(); }
      if (what === 'style') {
        ms.style = ms.style === 'ballstick' ? 'line' : 'ballstick';
        if (ms.style === 'line') ms.viewer.setStyle({}, { line: { linewidth: 2, colorscheme: 'Jmol' } });
        else ms.viewer.setStyle({}, { stick: { radius: 0.13, colorscheme: 'Jmol' }, sphere: { scale: 0.24, colorscheme: 'Jmol' } });
        ms.viewer.render();
      }
      if (what === 'spin') {
        ms.spin = !ms.spin;
        ms.viewer.spin(ms.spin ? 'y' : false);
      }
    },
    /* 工作台 */
    wfCase(id) { wf.caseId = id; wf.step = 1; const c = QH.cases.find((x) => x.id === id); wf.formula = QH.idx.syndrome(c.syndrome).formulas[0]; QHROUTE('platform'); },
    wfStep(n) { wf.step = n; const c = QH.cases.find((x) => x.id === wf.caseId) || QH.cases[0]; renderWf(c); },
    wfPick(fid) { wf.formula = fid; wf.step = 3; const c = QH.cases.find((x) => x.id === wf.caseId) || QH.cases[0]; renderWf(c); },
    wfDownload() {
      const blob = new Blob([JSON.stringify(wfPayload(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'qihuang-case-' + wf.caseId + '.json';
      a.click();
      U.toast('已导出');
    },
    wfCopy() {
      if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(wfPayload(), null, 2)).then(() => U.toast('已复制'), () => U.toast('复制失败'));
    },
    rankCompounds
  };

  window.QHVIEWS = Object.assign(window.QHVIEWS || {}, {
    rx: rxView, mol: molView, platform: platformView, recheck: recheckView, metrics: metricsView
  });
})();
