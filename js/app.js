/* 岐黄智谱 · 路由与启动 */
(function () {
  'use strict';
  const ROUTES = ['overview', 'emr', 'graph', 'rx', 'mol', 'platform', 'recheck', 'metrics'];
  const TITLES = {
    overview: '总览', emr: 'L1 数据治理', graph: 'L2 知识图谱', rx: 'L3 处方优化',
    mol: 'L3 分子发现', platform: 'L4 工作台', recheck: 'L5 回检', metrics: '指标与边界'
  };

  function cur() {
    const h = location.hash.replace(/^#\/?/, '');
    return ROUTES.includes(h) ? h : 'overview';
  }

  function renderView(route) {
    const host = document.getElementById('app');
    if (!host) return;
    host.className = 'view on';
    host.innerHTML = '';
    try {
      const fn = window.QHVIEWS && window.QHVIEWS[route];
      if (fn) fn(host);
    } catch (err) {
      host.innerHTML = '<div class="note danger"><span>渲染出错</span><span>' +
        String(err && err.message ? err.message : err) + '</span></div>';
      console.error(err);
    }
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === route));
    const m = document.querySelector('main');
    if (m) m.scrollTop = 0;
    document.title = '岐黄智谱 · ' + (TITLES[route] || '');
  }

  window.QHROUTE = function (route) {
    if (!ROUTES.includes(route)) route = 'overview';
    if (location.hash === '#/' + route) renderView(route);
    else location.hash = '#/' + route;
  };

  window.QHGO = function (route, arg) {
    if (route === 'mol' && arg) window.__molFocus = arg;
    window.QHROUTE(route);
  };

  window.addEventListener('hashchange', () => renderView(cur()));
  document.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.replace('#/overview');
    renderView(cur());
  });
})();
