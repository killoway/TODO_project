/* pages/calendar.js */
const CalendarPage = (() => {
  const MONTHS  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const DOWS    = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  let container    = null;
  let allTasks     = [];
  let viewYear, viewMonth;
  let selectedDate = null;

  function todayISO() { return new Date().toISOString().split('T')[0]; }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtDisplay(ds) {
    const d = new Date(ds + 'T00:00:00');
    const s = d.toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function buildGrid() {
    const today = todayISO();
    const first = new Date(viewYear, viewMonth, 1);
    const last  = new Date(viewYear, viewMonth + 1, 0);
    let startOff = first.getDay() - 1;
    if (startOff < 0) startOff = 6;

    const cells = [];
    for (let i = startOff - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      cells.push({ ds: d.toISOString().split('T')[0], n: d.getDate(), other: true });
    }
    for (let n = 1; n <= last.getDate(); n++) {
      const d = new Date(viewYear, viewMonth, n);
      cells.push({ ds: d.toISOString().split('T')[0], n, other: false });
    }
    const rem = 7 - (cells.length % 7);
    if (rem < 7) for (let n = 1; n <= rem; n++) {
      const d = new Date(viewYear, viewMonth + 1, n);
      cells.push({ ds: d.toISOString().split('T')[0], n, other: true });
    }

    // Group tasks by date
    const byDate = {};
    for (const t of allTasks) {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    }

    const PRIO = ['high','medium','low'];
    const cellsHtml = cells.map(c => {
      const dayTasks = (byDate[c.ds] || []).sort((a,b)=>PRIO.indexOf(a.priority)-PRIO.indexOf(b.priority));
      const shown = dayTasks.slice(0, 3);
      const more  = dayTasks.length - shown.length;
      const cls = ['cal-full-cell',
        c.other    ? 'other-month' : '',
        c.ds === today          ? 'today'    : '',
        c.ds === selectedDate   ? 'selected' : '',
      ].filter(Boolean).join(' ');

      return `
        <div class="${cls}" data-date="${c.ds}">
          <div class="cfc-num">${c.n}</div>
          <div class="cfc-tasks">
            ${shown.map(t => `
              <div class="cfc-task-pill p-${t.priority} ${t.done?'done':''}">
                ${esc(t.title)}
              </div>`).join('')}
            ${more > 0 ? `<div class="cfc-more">+${more} ещё</div>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="cal-full-grid">
        ${DOWS.map(d => `<div class="cal-full-dow">${d}</div>`).join('')}
        ${cellsHtml}
      </div>`;
  }

  function renderDayDetail(ds) {
    const panel = container && container.querySelector('.day-detail-panel');
    if (!panel) return;
    const dayTasks = allTasks.filter(t => t.date === ds);
    const done = dayTasks.filter(t => t.done).length;
    const pct  = dayTasks.length ? Math.round(done / dayTasks.length * 100) : 0;

    panel.innerHTML = `
      <div class="ddp-header">
        <div>
          <div class="ddp-date">${fmtDisplay(ds)}</div>
          <div style="font-size:.68rem;color:var(--t3);margin-top:3px">${dayTasks.length} задач · ${pct}% выполнено</div>
        </div>
        <button class="ddp-add" id="ddp-add-btn">+ Добавить</button>
      </div>
      <div class="ddp-tasks">
        ${dayTasks.length === 0
          ? `<div style="color:var(--t4);font-size:.82rem;padding:20px 0;text-align:center;font-style:italic">Нет задач</div>`
          : dayTasks.map(t => `
            <div class="task-card p-${t.priority} ${t.done?'is-done':''}" data-id="${t.id}" style="cursor:default">
              <div class="tc-check ${t.done?'checked':''}" data-id="${t.id}"></div>
              <div class="tc-body">
                <div class="tc-title">${esc(t.title)}</div>
                ${t.time_slot ? `<div class="tc-meta"><span class="tc-badge" style="background:var(--s3);color:var(--t3)">⏰ ${t.time_slot}</span></div>` : ''}
              </div>
              <div class="tc-actions">
                <button class="tc-btn edit" data-id="${t.id}">✎</button>
                <button class="tc-btn del"  data-id="${t.id}">✕</button>
              </div>
            </div>`).join('')}
      </div>`;

    panel.querySelector('#ddp-add-btn').addEventListener('click', () =>
      window.Drawer.open({ date: ds }, async () => await reload()));

    panel.querySelectorAll('.tc-check').forEach(el =>
      el.addEventListener('click', async () => {
        await API.toggleTask(+el.dataset.id);
        await reload();
      }));
    panel.querySelectorAll('.tc-btn.edit').forEach(el =>
      el.addEventListener('click', () => {
        const t = allTasks.find(x => x.id === +el.dataset.id);
        if (t) window.Drawer.open(t, async () => await reload());
      }));
    panel.querySelectorAll('.tc-btn.del').forEach(el =>
      el.addEventListener('click', async () => {
        await API.deleteTask(+el.dataset.id);
        await reload();
      }));
  }

  function attachGridEvents() {
    const grid = container && container.querySelector('.cal-full-grid');
    if (!grid) return;
    grid.querySelectorAll('.cal-full-cell:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => {
        selectedDate = el.dataset.date;
        grid.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        renderDayDetail(selectedDate);
      });
    });
  }

  async function reload() {
    allTasks = await API.getTasks();
    const stats = await API.getStats();
    const sn = document.getElementById('nav-streak-n');
    if (sn) sn.textContent = stats.streak ?? 0;
    renderMonth();
    if (selectedDate) renderDayDetail(selectedDate);
  }

  function renderMonth() {
    const monthEl = container && container.querySelector('.cal-page-month');
    if (monthEl) monthEl.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    const gridWrap = container && container.querySelector('#cal-grid-wrap');
    if (gridWrap) {
      gridWrap.innerHTML = buildGrid();
      attachGridEvents();
    }
  }

  async function mount(wrap) {
    container = wrap;
    const today = new Date();
    viewYear  = today.getFullYear();
    viewMonth = today.getMonth();
    selectedDate = todayISO();

    container.innerHTML = `
      <div class="page cal-page">
        <div class="cal-page-header">
          <h1 class="cal-page-month"></h1>
          <button class="cal-page-nav" id="cp-prev">‹ Пред.</button>
          <button class="cal-page-nav" id="cp-today">Сегодня</button>
          <button class="cal-page-nav" id="cp-next">След. ›</button>
        </div>
        <div id="cal-grid-wrap"></div>
        <div class="day-detail-panel"></div>
      </div>`;

    container.querySelector('#cp-prev').addEventListener('click', () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderMonth();
    });
    container.querySelector('#cp-next').addEventListener('click', () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderMonth();
    });
    container.querySelector('#cp-today').addEventListener('click', () => {
      const d = new Date();
      viewYear = d.getFullYear(); viewMonth = d.getMonth();
      selectedDate = todayISO();
      renderMonth();
      renderDayDetail(selectedDate);
    });

    await reload();
    renderDayDetail(selectedDate);
  }

  function unmount() { container = null; }

  return { mount, unmount };
})();