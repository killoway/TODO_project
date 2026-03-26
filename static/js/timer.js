/* timer.js — shared Pomodoro engine */
const PomodoroTimer = (() => {
  const WORK  = 25 * 60;
  const BREAK = 5  * 60;
  const LONG  = 15 * 60;
  const CIRC  = 2 * Math.PI * 105;   // matches r="105" in Focus ring

  let remaining  = WORK;
  let duration   = WORK;
  let running    = false;
  let isBreak    = false;
  let sessions   = 0;
  let taskId     = null;
  let taskTitle  = '';
  let tickHandle = null;
  let onTick     = null;
  let onDone     = null;

  function fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }

  function start(tId, tTitle, cb_tick, cb_done) {
    taskId    = tId;
    taskTitle = tTitle || 'Без задачи';
    onTick    = cb_tick;
    onDone    = cb_done;
    remaining = isBreak ? (sessions % 4 === 0 ? LONG : BREAK) : WORK;
    duration  = remaining;
    running   = true;
    clearInterval(tickHandle);
    tickHandle = setInterval(() => {
      remaining--;
      if (onTick) onTick(state());
      if (remaining <= 0) {
        clearInterval(tickHandle);
        running = false;
        if (!isBreak) {
          sessions++;
          API.logPomodoro(taskId, new Date().toISOString().split('T')[0]);
        }
        isBreak = !isBreak;
        if (onDone) onDone(state());
      }
    }, 1000);
    if (onTick) onTick(state());
  }

  function pause() {
    if (!running) return;
    clearInterval(tickHandle);
    running = false;
    if (onTick) onTick(state());
  }

  function resume() {
    if (running || remaining <= 0) return;
    running = true;
    tickHandle = setInterval(() => {
      remaining--;
      if (onTick) onTick(state());
      if (remaining <= 0) {
        clearInterval(tickHandle);
        running = false;
        if (!isBreak) {
          sessions++;
          API.logPomodoro(taskId, new Date().toISOString().split('T')[0]);
        }
        isBreak = !isBreak;
        if (onDone) onDone(state());
      }
    }, 1000);
  }

  function stop() {
    clearInterval(tickHandle);
    running   = false;
    isBreak   = false;
    remaining = WORK;
    duration  = WORK;
    if (onTick) onTick(state());
  }

  function state() {
    const pct = 1 - remaining / duration;
    return {
      fmt:      fmt(remaining),
      pct,
      offset:   CIRC * (1 - pct),
      running,
      isBreak,
      sessions,
      taskTitle,
      taskId,
      circ: CIRC,
    };
  }

  return { start, pause, resume, stop, state, fmt };
})();