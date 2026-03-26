/* pages/today.js */
const TodayPage = (() => {
  const HOURS     = Array.from({length:17}, (_,i) => 6 + i);  // 06–22
  const CAT_LBL   = { work:'💼 Работа', personal:'🏠 Личное', health:'💪 Здоровье', study:'📚 Учёба', general:'🗂 Прочее' };
  const MONTHS    = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const DOWS      = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const MONTHS_SH = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

  let tasks        = [];
  let selectedDate = new Date().toISOString().split('T')[0];
  let calViewYear, calViewMonth;
  let activeDays   = [];
  let noteTimer    = null;
  let container    = null;
  let prevDayPct   = -1;

  function todayISO() { return new Date().toISOString().split('T')[0]; }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtDateHeader(ds) {
    const d = new Date(ds + 'T00:00:00');
    const opts = { weekday:'long', day:'numeric', month:'long' };
    const s = d.toLocaleDateString('ru-RU', opts);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtDateSub(ds) {
    if (ds === todayISO()) return 'СЕГОДНЯ';
    const yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tm = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (ds === yd) return 'ВЧЕРА';
    if (ds === tm) return 'ЗАВТРА';
    return '';
  }

  /* ── calendar helpers ─────────────────────────── */
  function calInit(ds) {
    const d = new Date(ds + 'T00:00:00');
    calViewYear  = d.getFullYear();
    calViewMonth = d.getMonth();
  }

  function calHtml() {
    const today = todayISO();
    const first = new Date(calViewYear, calViewMonth, 1);
    const last  = new Date(calViewYear, calViewMonth + 1, 0);
    let startOff = first.getDay() - 1;
    if (startOff < 0) startOff = 6;

    const cells = [];
    for (let i = startOff - 1; i >= 0; i--) {
      const d = new Date(calViewYear, calViewMonth, -i);
      cells.push({ ds: d.toISOString().split('T')[0], n: d.getDate(), other: true });
    }
    for (let n = 1; n <= last.getDate(); n++) {
      const d = new Date(calViewYear, calViewMonth, n);
      cells.push({ ds: d.toISOString().split('T')[0], n, other: false });
    }
    const rem = 7 - (cells.length % 7);
    if (rem < 7) for (let n = 1; n <= rem; n++) {
      const d = new Date(calViewYear, calViewMonth + 1, n);
      cells.push({ ds: d.toISOString().split('T')[0], n, other: true });
    }

    const daysCells = cells.map(c => {
      const cls = ['cal-day',
        c.other        ? 'other-month' : '',
        c.ds === today ? 'is-today'    : '',
        c.ds === selectedDate ? 'selected' : '',
        activeDays.includes(c.ds) ? 'has-tasks' : '',
      ].filter(Boolean).join(' ');
      return `<div class="${cls}" data-date="${c.ds}">${c.n}</div>`;
    }).join('');

    return `
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev">‹</button>
        <span class="cal-month-name">${MONTHS[calViewMonth]} ${calViewYear}</span>
        <button class="cal-nav" id="cal-next">›</button>
      </div>
      <div class="cal-grid">
        ${DOWS.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
        ${daysCells}
      </div>`;
  }

  /* ── progress bar ─────────────────────────────── */
  function updateProgress() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    const pctEl  = container.querySelector('.dp-pct');
    const fillEl = container.querySelector('.dp-fill');
    const dotEl  = container.querySelector('.dp-dot');
    const subEl  = container.querySelector('.dp-sub');
    if (pctEl)  { pctEl.textContent = pct + '%'; pctEl.classList.toggle('done', pct === 100); }
    if (fillEl) fillEl.style.width = pct + '%';
    if (dotEl)  { dotEl.style.left = pct + '%'; dotEl.classList.toggle('done', pct === 100); }
    if (subEl)  subEl.textContent = `${done} из ${total} задач`;

    if (pct === 100 && total > 0 && prevDayPct !== 100) Effects.shoot();
    prevDayPct = pct;
  }

  /* ── task card HTML ───────────────────────────── */
  function taskCardHtml(task) {
    const cat = task.category || 'general';
    const catBadge = `<span class="tc-badge tc-badge-${cat}">${CAT_LBL[cat]}</span>`;
    const subBadge = task.subtasks?.length
      ? `<span class="tc-badge" style="background:var(--s3);color:var(--t3)">${task.subtasks.filter(s=>s.done).length}/${task.subtasks.length}</span>` : '';
    return `
      <div class="task-card p-${task.priority} ${task.done?'is-done':''}" draggable="true" data-id="${task.id}" data-time="${esc(task.time_slot||'')}">
        <div class="tc-check ${task.done?'checked':''}" data-id="${task.id}"></div>
        <div class="tc-body">
          <div class="tc-title">${esc(task.title)}</div>
          <div class="tc-meta">${catBadge}${subBadge}</div>
        </div>
        <div class="tc-actions">
          <button class="tc-btn foc" data-id="${task.id}" title="Фокус">⏱</button>
          <button class="tc-btn edit" data-id="${task.id}" title="Редактировать">✎</button>
          <button class="tc-btn del" data-id="${task.id}" title="Удалить">✕</button>
        </div>
      </div>`;
  }

  /* ── render grid ──────────────────────────────── */
  function renderGrid() {
    if (!container) return;
    const grid = container.querySelector('.time-grid-wrap');
    if (!grid) return;

    const now         = new Date();
    const currentHour = now.getHours();
    const isToday     = selectedDate === todayISO();

    const scheduled   = tasks.filter(t => t.time_slot);
    const unscheduled = tasks.filter(t => !t.time_slot);

    // Group by hour
    const byHour = {};
    for (const t of scheduled) {
      const h = parseInt(t.time_slot.split(':')[0], 10);
      if (!byHour[h]) byHour[h] = [];
      byHour[h].push(t);
    }

    const rowsHtml = HOURS.map(h => {
      const label = `${String(h).padStart(2,'0')}:00`;
      const hourTasks = byHour[h] || [];
      const isCurrent = isToday && h === currentHour;
      return `
        <div class="time-row ${isCurrent?'current-hour':''}" data-hour="${h}">
          <div class="time-label">${label}</div>
          <div class="time-slot-drop ${hourTasks.length===0?'empty':''}" data-hour="${h}">
            ${hourTasks.map(taskCardHtml).join('')}
          </div>
        </div>`;
    }).join('');

    const unschedHtml = unscheduled.length
      ? `<div class="grid-section-label">Без времени</div>
         <div class="unscheduled-list">${unscheduled.map(taskCardHtml).join('')}</div>`
      : '';

    grid.innerHTML = `
      <div class="grid-section-label">Расписание</div>
      ${rowsHtml}
      ${unschedHtml}
      ${tasks.length===0 ? `<div class="empty-state">
        <div class="empty-glyph">◉</div>
        <div class="empty-text">День свободен — добавьте задачу</div>
      </div>` : ''}`;

    attachGridEvents();
    updateProgress();
  }

  /* ── attach events to grid ────────────────────── */
  function attachGridEvents() {
    if (!container) return;

    // Toggle done
    container.querySelectorAll('.tc-check').forEach(el =>
      el.addEventListener('click', async e => {
        e.stopPropagation();
        await API.toggleTask(+el.dataset.id);
        await reload();
      }));

    // Delete
    container.querySelectorAll('.tc-btn.del').forEach(el =>
      el.addEventListener('click', async e => {
        e.stopPropagation();
        await API.deleteTask(+el.dataset.id);
        await reload();
      }));

    // Edit
    container.querySelectorAll('.tc-btn.edit').forEach(el =>
      el.addEventListener('click', e => {
        e.stopPropagation();
        const t = tasks.find(x => x.id === +el.dataset.id);
        if (t) window.Drawer.open(t, async () => await reload());
      }));

    // Focus / Pomodoro
    container.querySelectorAll('.tc-btn.foc').forEach(el =>
      el.addEventListener('click', e => {
        e.stopPropagation();
        const t = tasks.find(x => x.id === +el.dataset.id);
        if (t) {
          window.location.hash = 'focus';
          setTimeout(() => FocusPage.setTask(t), 100);
        }
      }));

    // Click on empty time slot → open drawer with time prefilled
    container.querySelectorAll('.time-slot-drop.empty').forEach(el =>
      el.addEventListener('click', () => {
        const h = el.dataset.hour.padStart(2, '0');
        window.Drawer.open({ time_slot: `${h}:00`, date: selectedDate }, async () => await reload());
      }));

    // Drag from time slot to time slot
    let dragId = null;
    container.querySelectorAll('.task-card').forEach(card => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', e => {
        dragId = +card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.drag-target').forEach(x => x.classList.remove('drag-target'));
      });
    });

    container.querySelectorAll('.time-slot-drop').forEach(slot => {
      slot.addEventListener('dragover', e => {
        e.preventDefault();
        container.querySelectorAll('.drag-target').forEach(x => x.classList.remove('drag-target'));
        slot.classList.add('drag-target');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-target'));
      slot.addEventListener('drop', async e => {
        e.preventDefault();
        slot.classList.remove('drag-target');
        if (!dragId) return;
        const h = slot.dataset.hour;
        const newTime = h ? `${String(h).padStart(2,'0')}:00` : '';
        await API.updateTask(dragId, { time_slot: newTime });
        dragId = null;
        await reload();
      });
    });

    // Unscheduled drop target
    const unsched = container.querySelector('.unscheduled-list');
    if (unsched) {
      unsched.addEventListener('dragover', e => { e.preventDefault(); unsched.style.outline = '1px dashed var(--amber)'; });
      unsched.addEventListener('dragleave', () => { unsched.style.outline = ''; });
      unsched.addEventListener('drop', async e => {
        e.preventDefault();
        unsched.style.outline = '';
        if (!dragId) return;
        await API.updateTask(dragId, { time_slot: '' });
        dragId = null;
        await reload();
      });
    }
  }

  /* ── reload data & re-render ──────────────────── */
  async function reload() {
    const [t, stats] = await Promise.all([
      API.getTasks(selectedDate),
      API.getStats(),
    ]);
    tasks      = t;
    activeDays = stats.active_days || [];

    // update streak in sidenav
    const sn = document.getElementById('nav-streak-n');
    if (sn) sn.textContent = stats.streak ?? 0;

    renderGrid();
    updateCalendar();
    loadNote();
    updateQuickStats();
  }

  function updateCalendar() {
    const calEl = container && container.querySelector('.mini-cal');
    if (!calEl) return;
    calEl.innerHTML = calHtml();
    calEl.querySelector('#cal-prev').addEventListener('click', () => {
      calViewMonth--;
      if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
      calEl.innerHTML = calHtml();
      reattachCalEvents(calEl);
    });
    calEl.querySelector('#cal-next').addEventListener('click', () => {
      calViewMonth++;
      if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
      calEl.innerHTML = calHtml();
      reattachCalEvents(calEl);
    });
    reattachCalEvents(calEl);
  }

  function reattachCalEvents(calEl) {
    calEl.querySelectorAll('.cal-day:not(.other-month)').forEach(el =>
      el.addEventListener('click', () => {
        selectedDate = el.dataset.date;
        prevDayPct   = -1;
        calInit(selectedDate);
        updateHeader();
        reload();
      }));
  }

  function updateHeader() {
    const h = container && container.querySelector('.today-date-display');
    const s = container && container.querySelector('.today-date-sub');
    if (h) h.textContent = fmtDateHeader(selectedDate);
    if (s) s.textContent = fmtDateSub(selectedDate);
  }

  async function loadNote() {
    const ta = container && container.querySelector('.notes-area');
    if (!ta) return;
    const note = await API.getNote(selectedDate);
    ta.value = note.content || '';
  }

  function updateQuickStats() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    const high  = tasks.filter(t => t.priority === 'high' && !t.done).length;
    const el = container;
    if (!el) return;
    const vals = el.querySelectorAll('.qs-val');
    if (vals[0]) vals[0].textContent = total;
    if (vals[1]) vals[1].textContent = done;
    if (vals[2]) vals[2].textContent = high;
    if (vals[3]) vals[3].textContent = tasks.filter(t=>t.time_slot).length;
  }

  /* ── mount ────────────────────────────────────── */
  async function mount(wrap) {
    container = wrap;
    calInit(selectedDate);

    container.innerHTML = `
      <div class="page today-layout">
        <!-- LEFT -->
        <div class="schedule-col">
          <div class="today-header">
            <div class="today-date-display">${fmtDateHeader(selectedDate)}</div>
            <div class="today-date-sub">${fmtDateSub(selectedDate)}</div>
          </div>
          <div class="day-progress">
            <div class="dp-top">
              <span class="dp-label">ПРОГРЕСС ДНЯ</span>
              <span class="dp-pct">0%</span>
            </div>
            <div class="dp-track">
              <div class="dp-fill" style="width:0%"></div>
              <div class="dp-dot" style="left:0%"></div>
            </div>
            <div class="dp-sub">0 из 0 задач</div>
          </div>
          <div class="time-grid-wrap"></div>
        </div>

        <!-- RIGHT -->
        <div class="today-right">
          <div class="right-section">
            <div class="rs-label">Навигация</div>
            <div class="mini-cal"></div>
          </div>
          <div class="right-section">
            <div class="rs-label">Быстрая статистика</div>
            <div class="qs-grid">
              <div class="qs-card"><div class="qs-val">-</div><div class="qs-lbl">Всего задач</div></div>
              <div class="qs-card"><div class="qs-val">-</div><div class="qs-lbl">Выполнено</div></div>
              <div class="qs-card"><div class="qs-val">-</div><div class="qs-lbl">Срочных</div></div>
              <div class="qs-card"><div class="qs-val">-</div><div class="qs-lbl">Запланировано</div></div>
            </div>
          </div>
          <div class="right-section" style="flex:1;overflow-y:auto">
            <div class="rs-label">Заметки дня <span style="color:var(--t4);font-size:.55rem">Ctrl+S чтобы сохранить</span></div>
            <textarea class="notes-area" placeholder="Мысли, идеи, планы на день…"></textarea>
            <div class="notes-save-hint" id="note-save-hint"></div>
          </div>
        </div>
      </div>`;

    // Notes autosave
    const ta = container.querySelector('.notes-area');
    ta.addEventListener('input', () => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(async () => {
        await API.saveNote(selectedDate, ta.value);
        const hint = container.querySelector('#note-save-hint');
        if (hint) { hint.textContent = 'Сохранено ✓'; setTimeout(() => hint.textContent = '', 2000); }
      }, 1000);
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        API.saveNote(selectedDate, ta.value).then(() => {
          const hint = container.querySelector('#note-save-hint');
          if (hint) { hint.textContent = 'Сохранено ✓'; setTimeout(() => hint.textContent = '', 2000); }
        });
      }
    });

    // FAB
    const fab = document.createElement('button');
    fab.className = 'fab'; fab.textContent = '+'; fab.title = 'Добавить задачу (N)';
    fab.addEventListener('click', () =>
      window.Drawer.open({ date: selectedDate }, async () => await reload()));
    container.appendChild(fab);

    // Keyboard shortcuts
    const keyFn = e => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N')
        window.Drawer.open({ date: selectedDate }, async () => await reload());
    };
    document.addEventListener('keydown', keyFn);
    container._cleanup = () => {
      document.removeEventListener('keydown', keyFn);
      fab.remove();
    };

    await reload();
    updateCalendar();
  }

  function unmount() {
    if (container && container._cleanup) container._cleanup();
    container = null;
  }

  function setDate(ds) { selectedDate = ds; }
  function getDate()   { return selectedDate; }

  return { mount, unmount, setDate, getDate };
})();