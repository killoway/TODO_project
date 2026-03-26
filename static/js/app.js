/* app.js — global drawer + boot */

/* ── Global task edit/create drawer ─────────────── */
window.Drawer = (() => {
  const overlay   = document.getElementById('drawer-overlay');
  const drawer    = document.getElementById('task-drawer');
  const labelEl   = document.getElementById('drawer-title-label');
  const delBtn    = document.getElementById('drawer-delete');
  const saveBtn   = document.getElementById('drawer-save');
  const closeBtn  = document.getElementById('drawer-close');

  let editId    = null;
  let callback  = null;
  let subList   = [];

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function open(task, cb) {
    editId   = task?.id || null;
    callback = cb;
    subList  = [...(task?.subtasks || [])];

    labelEl.textContent = editId ? 'Редактировать задачу' : 'Новая задача';
    delBtn.style.display = editId ? '' : 'none';

    document.getElementById('d-title').value    = task?.title    || '';
    document.getElementById('d-priority').value = task?.priority || 'medium';
    document.getElementById('d-category').value = task?.category || 'general';
    document.getElementById('d-time').value     = task?.time_slot || '';
    document.getElementById('d-date').value     = task?.date     || new Date().toISOString().split('T')[0];

    renderSubtasks();
    overlay.classList.add('open');
    drawer.classList.add('open');
    setTimeout(() => document.getElementById('d-title').focus(), 80);
  }

  function close() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    editId = null; callback = null; subList = [];
  }

  function renderSubtasks() {
    const list = document.getElementById('d-subtasks-list');
    if (!list) return;
    list.innerHTML = subList.map((s, i) => `
      <div class="d-sub-row">
        <div class="d-sub-check ${s.done?'checked':''}" data-i="${i}"></div>
        <span class="d-sub-title">${esc(s.title)}</span>
        <button class="d-sub-del" data-i="${i}" title="Удалить">✕</button>
      </div>`).join('');

    list.querySelectorAll('.d-sub-check').forEach(el =>
      el.addEventListener('click', () => {
        subList[+el.dataset.i].done = !subList[+el.dataset.i].done;
        renderSubtasks();
      }));
    list.querySelectorAll('.d-sub-del').forEach(el =>
      el.addEventListener('click', () => {
        subList.splice(+el.dataset.i, 1);
        renderSubtasks();
      }));
  }

  async function save() {
    const title = document.getElementById('d-title').value.trim();
    if (!title) {
      Effects.shake(document.getElementById('d-title'));
      return;
    }
    const data = {
      title,
      priority:  document.getElementById('d-priority').value,
      category:  document.getElementById('d-category').value,
      time_slot: document.getElementById('d-time').value,
      date:      document.getElementById('d-date').value,
    };

    if (editId) {
      await API.updateTask(editId, data);
      // Sync subtasks (only for existing tasks)
      // Add new subs that don't have an id
      for (const sub of subList) {
        if (!sub.id) {
          await API.addSubtask(editId, sub.title);
        } else if (sub.done !== undefined) {
          // toggle changed subs — just rely on server state for now
        }
      }
    } else {
      const created = await API.addTask(data);
      // Add subtasks to new task
      for (const sub of subList) {
        if (sub.title) await API.addSubtask(created.id, sub.title);
      }
    }

    const cb = callback;
    close();
    if (cb) await cb();
  }

  async function del() {
    if (!editId) return;
    if (confirm('Удалить задачу?')) {
    await API.deleteTask(editId);
    const cb = callback;
    close();
    if (cb) await cb();
    }
  }

  // Add subtask inline
  const subInp    = document.getElementById('d-sub-inp');
  const subAddBtn = drawer.querySelector('.d-sub-add-btn');

  function addSubLocal() {
    const v = subInp.value.trim();
    if (!v) return;
    subList.push({ title: v, done: false });
    subInp.value = '';
    renderSubtasks();
  }

  if (subAddBtn) subAddBtn.addEventListener('click', addSubLocal);
  if (subInp)    subInp.addEventListener('keydown', e => { if (e.key === 'Enter') addSubLocal(); });

  saveBtn.addEventListener('click', save);
  delBtn.addEventListener('click', del);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });

  return { open, close };
})();

/* ── Boot ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Fix: add add-subtask button to drawer markup
  const subAddWrap = document.querySelector('.d-sub-add');
  if (subAddWrap && !subAddWrap.querySelector('.d-sub-add-btn')) {
    const btn = document.createElement('button');
    btn.className = 'd-sub-add-btn'; btn.textContent = '+';
    subAddWrap.appendChild(btn);
  }

  Router.init();
});