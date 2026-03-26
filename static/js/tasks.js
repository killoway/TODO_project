/* tasks.js — rendering engine for the task list */
const Tasks = (() => {
  let tasks    = [];
  let filter   = 'all';
  let sort     = 'priority';
  let expanded = new Set();   // task IDs with subtasks shown
  let pastMode = false;

  const PRIO_ORDER = { high: 0, medium: 1, low: 2 };
  const CAT_LABEL  = {
    work:     '💼 Работа',
    personal: '🏠 Личное',
    health:   '💪 Здоровье',
    study:    '📚 Учёба',
    general:  '🗂 Прочее',
  };

  function setTasks(t) { tasks = t; }
  function setFilter(f) { filter = f; }
  function setSort(s) { sort = s; }
  function setPastMode(past) { pastMode = past; }

  /* ── helpers ─────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function filtered() {
    let list = [...tasks];
    if (filter === 'active') list = list.filter(t => !t.done);
    if (filter === 'done')   list = list.filter(t =>  t.done);
    if (filter === 'high')   list = list.filter(t =>  t.priority === 'high');
    return list;
  }

  function sorted(list) {
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (sort === 'priority') {
        return (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1);
      }
      if (sort === 'time') {
        if (a.time_slot && b.time_slot) return a.time_slot.localeCompare(b.time_slot);
        return a.time_slot ? -1 : 1;
      }
      /* sort === 'created' */
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }

  /* ── progress calculation ────────────────────────────── */
  function progress() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  }

  /* ── category stats ──────────────────────────────────── */
  function catStats() {
    const m = {};
    tasks.forEach(t => {
      const c = t.category || 'general';
      if (!m[c]) m[c] = { total: 0, done: 0 };
      m[c].total++;
      if (t.done) m[c].done++;
    });
    return m;
  }

  /* ── sub-task markup ─────────────────────────────────── */
  function subHtml(task) {
    const subs = task.subtasks || [];
    const isOpen = expanded.has(task.id);
    const doneCount = subs.filter(s => s.done).length;

    const listHtml = isOpen ? `
      <div class="sub-list">
        ${subs.map(s => `
          <div class="sub-item">
            <div class="sub-check ${s.done ? 'checked' : ''}"
                 data-task="${task.id}" data-sub="${s.id}"></div>
            <span class="sub-title ${s.done ? 'done' : ''}">${esc(s.title)}</span>
          </div>`).join('')}
        <div class="sub-add-row">
          <input type="text" placeholder="Добавить подзадачу…"
                 class="sub-inp" data-task="${task.id}"/>
          <button class="sub-add-btn" data-task="${task.id}">+</button>
        </div>
      </div>` : '';

    return `
      <div class="subtasks-wrap">
        <button class="sub-toggle ${isOpen ? 'open' : ''}" data-task="${task.id}">
          <span class="arrow">▶</span>
          Подзадачи (${doneCount}/${subs.length})
        </button>
        ${listHtml}
      </div>`;
  }

  /* ── single task card ────────────────────────────────── */
  function taskCard(task) {
    const cat  = task.category || 'general';
    const meta = [
      task.time_slot ? `<span class="badge badge-time">⏰ ${esc(task.time_slot)}</span>` : '',
      `<span class="badge badge-${cat}">${CAT_LABEL[cat] || cat}</span>`,
    ].join('');

    return `
      <div class="task-item p-${task.priority} ${task.done ? 'is-done' : ''}"
           draggable="true" data-id="${task.id}">
        <div class="task-check ${task.done ? 'checked' : ''}" data-id="${task.id}"></div>
        <div class="task-body">
          <div class="task-title">${esc(task.title)}</div>
          <div class="task-meta">${meta}</div>
          ${subHtml(task)}
        </div>
        <div class="task-actions">
          <button class="task-act-btn focus" data-id="${task.id}" title="Фокус 25 мин">⏱</button>
          <button class="task-act-btn del"   data-id="${task.id}" title="Удалить">✕</button>
        </div>
      </div>`;
  }

  /* ── main render ─────────────────────────────────────── */
  function render(handlers) {
    const { onToggle, onDelete, onFocus, onAddSub, onToggleSub } = handlers;
    const container = document.getElementById('task-list');
    const list = sorted(filtered());

    /* Progress bar */
    const p = progress();
    const pctEl   = document.getElementById('progress-pct');
    const fillEl  = document.getElementById('progress-fill');
    const dotEl   = document.getElementById('progress-dot');
    const subEl   = document.getElementById('progress-sub');
    if (pctEl) {
      pctEl.textContent  = p.pct + '%';
      pctEl.classList.toggle('complete', p.pct === 100);
    }
    if (fillEl) fillEl.style.width = p.pct + '%';
    if (dotEl) {
      dotEl.style.left = p.pct + '%';
      dotEl.classList.toggle('complete', p.pct === 100);
    }
    if (subEl) subEl.textContent = `${p.done} из ${p.total} задач`;

    /* Category sidebar */
    const catContainer = document.getElementById('category-list');
    if (catContainer) {
      const cs = catStats();
      catContainer.innerHTML = Object.keys(cs).length
        ? Object.entries(cs).map(([c, s]) => `
            <div class="cat-item">
              <div class="cat-dot" style="background:var(--cat-${c})"></div>
              <span class="cat-name">${CAT_LABEL[c] || c}</span>
              <span class="cat-count">${s.done}/${s.total}</span>
            </div>`).join('')
        : `<span style="color:var(--text3);font-size:.76rem">Нет задач</span>`;
    }

    /* Empty state */
    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-glyph">◉</div>
          <div class="empty-text">День свободен — добавьте задачу</div>
        </div>`;
      return p;
    }

    container.innerHTML = list.map(taskCard).join('');

    /* ── attach events ── */

    // Toggle done
    container.querySelectorAll('.task-check').forEach(el =>
      el.addEventListener('click', () => onToggle(+el.dataset.id)));

    // Delete
    container.querySelectorAll('.task-act-btn.del').forEach(el =>
      el.addEventListener('click', () => onDelete(+el.dataset.id)));

    // Focus / timer
    container.querySelectorAll('.task-act-btn.focus').forEach(el =>
      el.addEventListener('click', () => {
        const t = tasks.find(x => x.id === +el.dataset.id);
        if (t) onFocus(t);
      }));

    // Subtask toggle visibility
    container.querySelectorAll('.sub-toggle').forEach(el =>
      el.addEventListener('click', () => {
        const id = +el.dataset.task;
        expanded.has(id) ? expanded.delete(id) : expanded.add(id);
        render(handlers);
      }));

    // Subtask check
    container.querySelectorAll('.sub-check').forEach(el =>
      el.addEventListener('click', () =>
        onToggleSub(+el.dataset.task, +el.dataset.sub)));

    // Add subtask button
    container.querySelectorAll('.sub-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = container.querySelector(`.sub-inp[data-task="${btn.dataset.task}"]`);
        if (inp && inp.value.trim()) {
          onAddSub(+btn.dataset.task, inp.value.trim());
          inp.value = '';
        }
      });
    });

    // Add subtask enter key
    container.querySelectorAll('.sub-inp').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const btn = container.querySelector(`.sub-add-btn[data-task="${inp.dataset.task}"]`);
          if (btn) btn.click();
        }
      });
    });

    /* ── drag & drop reorder ── */
    let dragId = null;

    container.querySelectorAll('.task-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragId = +el.dataset.id;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        container.querySelectorAll('.task-item').forEach(x =>
          x.classList.remove('drag-over'));
      });
      el.addEventListener('dragover', e => {
        e.preventDefault();
        container.querySelectorAll('.task-item').forEach(x =>
          x.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const targetId = +el.dataset.id;
        if (!dragId || dragId === targetId) return;
        const ids = [...container.querySelectorAll('.task-item')].map(x => +x.dataset.id);
        const from = ids.indexOf(dragId);
        const to   = ids.indexOf(targetId);
        ids.splice(from, 1);
        ids.splice(to, 0, dragId);
        API.reorderTasks(ids.map((id, i) => ({ id, order: i })));
      });
    });

    return p;
  }

  return {
    setTasks,
    setFilter,
    setSort,
    setPastMode,
    render,
    progress
  };
})();