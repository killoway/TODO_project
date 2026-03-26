/* pages/analytics.js */
const AnalyticsPage = (() => {
  let container = null;
  const CAT_COLORS = {
    work:'#70a8ff', personal:'#c080f8', health:'#60e890',
    study:'#f8a050', general:'#909090',
  };
  const CAT_LBL = {
    work:'💼 Работа', personal:'🏠 Личное', health:'💪 Здоровье',
    study:'📚 Учёба', general:'🗂 Прочее',
  };

  /* ── Canvas bar chart ────────────────────────── */
  function drawBarChart(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 600;
    const H = 160;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD   = { top:14, right:8, bottom:30, left:8 };
    const usableW = W - PAD.left - PAD.right;
    const usableH = H - PAD.top  - PAD.bottom;
    const n       = data.length;
    const gap     = 3;
    const barW    = Math.max(4, (usableW - gap * (n-1)) / n);

    ctx.clearRect(0, 0, W, H);

    data.forEach((d, i) => {
      const x   = PAD.left + i * (barW + gap);
      const pct = d.pct / 100;
      const bH  = pct * usableH;
      const y   = PAD.top + usableH - bH;

      // Background bar
      ctx.fillStyle = '#1c1c22';
      ctx.beginPath();
      ctx.roundRect(x, PAD.top, barW, usableH, 3);
      ctx.fill();

      // Filled bar
      if (bH > 0) {
        const grad = ctx.createLinearGradient(x, y + bH, x, y);
        grad.addColorStop(0, '#c89030');
        grad.addColorStop(1, '#f0c060');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, bH, 3);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = d.date === new Date().toISOString().split('T')[0] ? '#f0c060' : '#52526a';
      ctx.font = `500 ${Math.min(10, barW)}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, H - 8);

      // Pct on top
      if (d.pct > 0) {
        ctx.fillStyle = '#9090a8';
        ctx.font = `400 9px JetBrains Mono, monospace`;
        ctx.fillText(d.pct + '%', x + barW / 2, y - 3);
      }
    });
  }

  /* ── Canvas donut chart ──────────────────────── */
  function drawDonut(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const S   = Math.min(canvas.offsetWidth, 180);
    canvas.width  = S * dpr;
    canvas.height = S * dpr;
    canvas.style.width  = S + 'px';
    canvas.style.height = S + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = S / 2, cy = S / 2, r = S / 2 - 10, ri = r * 0.55;
    const total = data.reduce((acc, d) => acc + d.total, 0);
    if (total === 0) return;

    let angle = -Math.PI / 2;
    data.forEach(d => {
      const sweep = (d.total / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = CAT_COLORS[d.category] || '#666';
      ctx.fill();
      angle += sweep;
    });

    // Inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fillStyle = '#141418';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#f0c060';
    ctx.font = `bold ${Math.round(S*0.14)}px Instrument Serif, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 4);
    ctx.fillStyle = '#52526a';
    ctx.font = `400 ${Math.round(S*0.07)}px JetBrains Mono, monospace`;
    ctx.fillText('задач', cx, cy + S * 0.1);
  }

  /* ── GitHub-style heatmap ────────────────────── */
  function buildHeatmap(daily) {
    // daily is 30 days array, show as weeks
    const WEEKS = [];
    let week = [];
    const first = new Date(daily[0].date + 'T00:00:00');
    // pad start of first week
    let dow = first.getDay() - 1; if (dow < 0) dow = 6;
    for (let i = 0; i < dow; i++) week.push(null);

    for (const d of daily) {
      week.push(d);
      if (week.length === 7) { WEEKS.push(week); week = []; }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      WEEKS.push(week);
    }

    function pctLevel(p) {
      if (!p) return '0';
      if (p < 35) return '25';
      if (p < 65) return '50';
      if (p < 100) return '75';
      return '100';
    }

    return `<div class="heatmap-grid">${
      WEEKS.map(w => `
        <div class="hm-col">${
          w.map(d => d
            ? `<div class="hm-cell" data-pct="${pctLevel(d.pct)}" title="${d.date}: ${d.pct}%"></div>`
            : `<div class="hm-cell" data-pct="0"></div>`
          ).join('')
        }</div>`).join('')
    }</div>`;
  }

  /* ── Time-of-day bar chart ───────────────────── */
  function drawTimeChart(canvas, timeDist) {
    const dpr  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth || 500;
    const H    = 80;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const hours = Array.from({length:17}, (_,i) => 6+i); // 06-22
    const max   = Math.max(1, ...hours.map(h => timeDist[h] || 0));
    const barW  = (W - 16) / hours.length;
    const PAD   = { top:6, bottom:22 };
    const usableH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);
    hours.forEach((h, i) => {
      const val = timeDist[String(h)] || 0;
      const bH  = (val / max) * usableH;
      const x   = 8 + i * barW;
      const y   = PAD.top + usableH - bH;
      if (bH > 0) {
        ctx.fillStyle = '#f0c060';
        ctx.globalAlpha = 0.7 + (val/max)*0.3;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barW - 2, bH, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (h % 3 === 0) {
        ctx.fillStyle = '#52526a';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${h}h`, x + barW/2, H - 5);
      }
    });
  }

  async function mount(wrap) {
    container = wrap;
    container.innerHTML = `<div class="page analytics-page">
      <h1 class="analytics-title">Аналитика</h1>
      <div class="stat-cards" id="stat-cards"></div>
      <div class="charts-grid">
        <div class="chart-card wide">
          <div class="chart-title">ВЫПОЛНЕНИЕ ПО ДНЯМ (последние 30)</div>
          <div class="chart-canvas-wrap"><canvas id="bar-chart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">КАТЕГОРИИ</div>
          <div style="display:flex;gap:16px;align-items:center">
            <canvas id="donut-chart" style="flex-shrink:0"></canvas>
            <div class="cat-legend" id="cat-legend"></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">АКТИВНОСТЬ ЗА МЕСЯЦ</div>
          <div id="heatmap-wrap"></div>
        </div>
        <div class="chart-card wide">
          <div class="chart-title">ПИКОВЫЕ ЧАСЫ (по выполненным задачам)</div>
          <div class="chart-canvas-wrap"><canvas id="time-chart"></canvas></div>
        </div>
      </div>
    </div>`;

    const stats = await API.getStats();

    // Streak in nav
    const sn = document.getElementById('nav-streak-n');
    if (sn) sn.textContent = stats.streak ?? 0;

    // Stat cards
    const totalDone = stats.totals.done;
    const totalAll  = stats.totals.total;
    const avgPct    = stats.daily.length
      ? Math.round(stats.daily.filter(d=>d.total>0).reduce((a,d)=>a+d.pct,0) /
          Math.max(1, stats.daily.filter(d=>d.total>0).length))
      : 0;
    const pomToday  = stats.pomodoros[new Date().toISOString().split('T')[0]] || 0;

    document.getElementById('stat-cards').innerHTML = `
      <div class="stat-card"><div class="sc-val">${stats.streak}</div><div class="sc-lbl">🔥 Дней подряд</div></div>
      <div class="stat-card"><div class="sc-val">${totalDone}</div><div class="sc-lbl">✅ Выполнено всего</div></div>
      <div class="stat-card"><div class="sc-val">${avgPct}%</div><div class="sc-lbl">📊 Ср. выполнение</div></div>
      <div class="stat-card"><div class="sc-val">${pomToday}</div><div class="sc-lbl">⏱ Помодоро сегодня</div></div>`;

    // Bar chart (30 days)
    const barCanvas = document.getElementById('bar-chart');
    if (barCanvas) {
      barCanvas.style.width = '100%';
      requestAnimationFrame(() => drawBarChart(barCanvas, stats.daily));
    }

    // Donut
    const donutCanvas = document.getElementById('donut-chart');
    if (donutCanvas && stats.categories.length) {
      donutCanvas.style.width = '160px'; donutCanvas.style.height = '160px';
      requestAnimationFrame(() => drawDonut(donutCanvas, stats.categories));
      const maxCat = Math.max(...stats.categories.map(c => c.total));
      document.getElementById('cat-legend').innerHTML = stats.categories.map(c => `
        <div class="cl-item">
          <div class="cl-dot" style="background:${CAT_COLORS[c.category]||'#666'}"></div>
          <span class="cl-name">${CAT_LBL[c.category]||c.category}</span>
          <div class="cl-bar-wrap">
            <div class="cl-bar" style="width:${Math.round(c.total/maxCat*100)}%;background:${CAT_COLORS[c.category]||'#666'}"></div>
          </div>
          <span class="cl-val">${c.done}/${c.total}</span>
        </div>`).join('');
    } else if (document.getElementById('cat-legend')) {
      document.getElementById('cat-legend').innerHTML = '<span style="color:var(--t4);font-size:.78rem">Нет данных</span>';
    }

    // Heatmap
    const hmWrap = document.getElementById('heatmap-wrap');
    if (hmWrap) hmWrap.innerHTML = buildHeatmap(stats.daily);

    // Time chart
    const timeCanvas = document.getElementById('time-chart');
    if (timeCanvas) {
      timeCanvas.style.width = '100%';
      requestAnimationFrame(() => drawTimeChart(timeCanvas, stats.time_dist));
    }

    // Redraw on resize
    const resizeFn = () => {
      if (barCanvas)  drawBarChart(barCanvas, stats.daily);
      if (timeCanvas) drawTimeChart(timeCanvas, stats.time_dist);
    };
    window.addEventListener('resize', resizeFn);
    container._cleanup = () => window.removeEventListener('resize', resizeFn);
  }

  function unmount() {
    if (container && container._cleanup) container._cleanup();
    container = null;
  }

  return { mount, unmount };
})();