/* pages/focus.js */
const FocusPage = (() => {
  let container  = null;
  let tasks      = [];
  let activeTask = null;
  let particles  = [];
  let animId     = null;
  let pCanvas, pCtx;

  /* ── Ambient particles ───────────────────────── */
  function mkParticle(W, H) {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    1 + Math.random() * 2.5,
      vx:   (Math.random() - 0.5) * 0.3,
      vy:   -0.1 - Math.random() * 0.3,
      life: Math.random(),
      fade: 0.001 + Math.random() * 0.002,
      color: Math.random() > 0.7 ? '#50c8e8' : '#f0c060',
    };
  }

  function startParticles() {
    if (!pCanvas) return;
    const W = pCanvas.width  = pCanvas.offsetWidth;
    const H = pCanvas.height = pCanvas.offsetHeight;
    particles = Array.from({length: 60}, () => mkParticle(W, H));

    function frame() {
      pCtx.clearRect(0, 0, W, H);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life -= p.fade;
        if (p.life <= 0 || p.y < -10) particles[i] = mkParticle(W, H);
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = p.color;
        pCtx.globalAlpha = Math.max(0, p.life) * 0.6;
        pCtx.fill();
      });
      pCtx.globalAlpha = 1;
      animId = requestAnimationFrame(frame);
    }
    frame();
  }

  function stopParticles() {
    cancelAnimationFrame(animId);
    if (pCtx && pCanvas) pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  }

  /* ── Timer callbacks ─────────────────────────── */
  function onTick(s) {
    const el = container && container.querySelector('.focus-time');
    if (el) el.textContent = s.fmt;
    const ring = container && container.querySelector('.focus-ring-fill');
    if (ring) ring.style.strokeDashoffset = s.offset;

    const modeEl = container && container.querySelector('.focus-mode-label');
    if (modeEl) {
      modeEl.textContent = s.isBreak ? (s.sessions % 4 === 0 ? 'ДЛИННЫЙ ПЕРЕРЫВ' : 'ПЕРЕРЫВ') : 'ФОКУС';
      modeEl.className = 'focus-mode-label' + (s.isBreak ? ' break' : '');
    }
    const ringFill = container && container.querySelector('.focus-ring-fill');
    if (ringFill) ringFill.classList.toggle('break', s.isBreak);

    updateSessionDots(s.sessions);
    updateButtons(s);
  }

  function onDone(s) {
    onTick(s);
    if (!s.isBreak) {  // just finished a work session
      Effects.shoot(60);
    }
    // Auto-start break? Just update UI
  }

  function updateSessionDots(n) {
    const wrap = container && container.querySelector('.focus-session-dots');
    if (!wrap) return;
    wrap.innerHTML = Array.from({length: 4}, (_, i) =>
      `<div class="session-dot ${i < (n % 4) ? 'done' : ''}"></div>`
    ).join('');
  }

  function updateButtons(s) {
    const startBtn = container && container.querySelector('#focus-start');
    const pauseBtn = container && container.querySelector('#focus-pause');
    const stopBtn  = container && container.querySelector('#focus-stop');
    if (startBtn) startBtn.style.display = s.running ? 'none' : '';
    if (pauseBtn) pauseBtn.style.display = s.running ? '' : 'none';
    if (stopBtn)  stopBtn.style.display  = s.running || s.fmt !== '25:00' ? '' : 'none';
  }

  /* ── Task list ───────────────────────────────── */
  async function loadTasks() {
    const today = new Date().toISOString().split('T')[0];
    tasks = (await API.getTasks(today)).filter(t => !t.done);
    renderTaskList();
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderTaskList() {
    const list = container && container.querySelector('.ftp-list');
    if (!list) return;
    if (!tasks.length) {
      list.innerHTML = `<div style="color:var(--t4);font-size:.8rem;padding:16px;text-align:center;font-style:italic">Все задачи выполнены!</div>`;
      return;
    }
    list.innerHTML = tasks.map(t => `
      <div class="ftp-item p-${t.priority} ${activeTask?.id === t.id ? 'active' : ''}" data-id="${t.id}">
        ${esc(t.title)}
      </div>`).join('');
    list.querySelectorAll('.ftp-item').forEach(el =>
      el.addEventListener('click', () => {
        activeTask = tasks.find(t => t.id === +el.dataset.id) || null;
        list.querySelectorAll('.ftp-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        const tnEl = container && container.querySelector('.focus-task-name');
        if (tnEl) tnEl.textContent = activeTask ? activeTask.title : '';
      }));
  }

  /* ── Mount ───────────────────────────────────── */
  async function mount(wrap) {
    container = wrap;
    const initState = PomodoroTimer.state();

    container.innerHTML = `
      <div class="page focus-page">
        <canvas class="focus-particles" id="focus-p-canvas"></canvas>
        <div class="focus-content">
          <div class="focus-mode-label">ФОКУС</div>

          <div class="focus-ring">
            <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
              <circle class="focus-ring-bg"   cx="110" cy="110" r="105"/>
              <circle class="focus-ring-fill" cx="110" cy="110" r="105"
                      style="stroke-dasharray:${initState.circ};stroke-dashoffset:${initState.circ}"/>
            </svg>
            <div class="focus-ring-inner">
              <div class="focus-time">${initState.fmt}</div>
              <div class="focus-session-dots">
                ${Array.from({length:4},()=>'<div class="session-dot"></div>').join('')}
              </div>
            </div>
          </div>

          <div class="focus-task-name">${activeTask ? esc(activeTask.title) : 'Выберите задачу ↓'}</div>

          <div class="focus-controls">
            <button class="focus-btn primary" id="focus-start">▶ Начать</button>
            <button class="focus-btn primary" id="focus-pause" style="display:none">⏸ Пауза</button>
            <button class="focus-btn" id="focus-stop" style="display:none">✕ Стоп</button>
          </div>

          <div class="focus-task-picker">
            <div class="ftp-label">Задачи на сегодня</div>
            <div class="ftp-list"></div>
          </div>
        </div>
      </div>`;

    pCanvas = container.querySelector('#focus-p-canvas');
    pCtx    = pCanvas.getContext('2d');
    startParticles();

    container.querySelector('#focus-start').addEventListener('click', () => {
      PomodoroTimer.start(
        activeTask?.id || null,
        activeTask?.title || '',
        onTick, onDone
      );
    });
    container.querySelector('#focus-pause').addEventListener('click', () => {
      PomodoroTimer.pause();
      updateButtons(PomodoroTimer.state());
    });
    container.querySelector('#focus-stop').addEventListener('click', () => {
      PomodoroTimer.stop();
      onTick(PomodoroTimer.state());
    });

    // Re-attach tick callbacks if timer was already running
    if (initState.running) {
      // Timer is mid-session; hook up display
      PomodoroTimer.start(activeTask?.id, activeTask?.title, onTick, onDone);
    }

    await loadTasks();
    updateButtons(PomodoroTimer.state());
  }

  function unmount() {
    stopParticles();
    container = null;
  }

  function setTask(task) {
    activeTask = task;
    const tnEl = container && container.querySelector('.focus-task-name');
    if (tnEl) tnEl.textContent = task ? task.title : '';
    renderTaskList();
  }

  return { mount, unmount, setTask };
})();