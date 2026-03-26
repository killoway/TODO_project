/* effects.js */
const Effects = (() => {
  const canvas = document.getElementById('fx-canvas');
  const ctx    = canvas.getContext('2d');
  let   parts  = [];
  let   raf    = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = [
    '#f0c060','#f8d878','#c89030',
    '#50c8e8','#80ddf8',
    '#60e890','#40c870',
    '#c080f8',
  ];

  function mkPart() {
    return {
      x:    Math.random() * canvas.width,
      y:    -10 - Math.random() * 30,
      vx:   (Math.random() - 0.5) * 5,
      vy:   Math.random() * 3.5 + 1.5,
      w:    Math.random() * 10 + 3,
      h:    Math.random() * 5 + 2,
      rot:  Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
      fade: 0.01 + Math.random() * 0.012,
    };
  }

  function shoot(n = 120) {
    resize();
    parts = Array.from({ length: n }, mkPart);
    if (!raf) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.07; p.vx *= 0.997;
      p.rot += p.drot;
      if (p.y > canvas.height * 0.6) p.life -= p.fade;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (parts.length) { raf = requestAnimationFrame(loop); }
    else { raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  function shake(el) {
    el.style.animation = 'none'; el.offsetHeight;
    el.style.animation = 'shakeEl .4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  return { shoot, shake };
})();