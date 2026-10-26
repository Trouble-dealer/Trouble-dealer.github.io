import { elapsedSince } from '../lib/time';
function updateClocks() {
  document.querySelectorAll<HTMLElement>('[data-clock]').forEach(clock => {
    const elapsed = elapsedSince(clock.dataset.clock!);
    for (const [name, value] of Object.entries(elapsed)) {
      const el = clock.querySelector(`[data-${name}]`);
      if (el) el.textContent = name === 'days' ? String(value) : String(value).padStart(2, '0');
    }
  });
  document.querySelectorAll<HTMLElement>('[data-elapsed-days]').forEach(el => el.textContent = String(elapsedSince(el.dataset.elapsedDays!).days));
}
updateClocks();
let clockInterval = setInterval(() => { if (!document.hidden) updateClocks(); }, 1000);
addEventListener('pageshow', event => { if (event.persisted) { updateClocks(); clockInterval = setInterval(() => { if (!document.hidden) updateClocks(); }, 1000); } });
addEventListener('visibilitychange', () => { if (!document.hidden) updateClocks(); });

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.createElement('canvas'); canvas.className = 'spark-canvas'; canvas.setAttribute('aria-hidden', 'true');
document.body.append(canvas);
const ctx = canvas.getContext('2d');
type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string; radius: number };
let particles: Particle[] = [];
let frame = 0;
let previous = 0;
let lastBurst = 0;
function resize() { const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx?.setTransform(ratio, 0, 0, ratio, 0, 0); }
resize(); addEventListener('resize', resize, { passive: true });
function draw(timestamp: number) {
  if (!ctx) return;
  const delta = Math.min(previous ? (timestamp - previous) / 16.67 : 1, 3); previous = timestamp;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter(p => p.age < p.life);
  for (const p of particles) {
    p.age += delta; p.x += p.vx * delta; p.y += p.vy * delta; p.vy += .045 * delta;
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (particles.length) frame = requestAnimationFrame(draw); else { frame = 0; previous = 0; }
}
function clear() { cancelAnimationFrame(frame); frame = 0; previous = 0; particles = []; ctx?.clearRect(0, 0, innerWidth, innerHeight); }
reduced.addEventListener('change', clear);
addEventListener('pointerdown', event => {
  if (!ctx || reduced.matches || document.documentElement.dataset.fireworks === 'false' || event.button !== 0 || !event.isPrimary || document.querySelector('dialog[open]')) return;
  if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],.markdown-tools')) return;
  const now = performance.now(); if (now - lastBurst < 120) return; lastBurst = now;
  const mono = document.documentElement.dataset.skin === 'mono';
  const colors = mono ? ['#9da7b8','#d7dbe2','#718096'] : ['#88bfff','#bda9ff','#82e3cb','#c8d6ee','#f7bcdb'];
  for (let i = 0; i < 22; i++) { const angle = Math.PI * 2 * i / 22; const speed = 1.1 + Math.random() * 2.6; particles.push({ x: event.clientX, y: event.clientY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 26 + Math.random() * 16, color: colors[i % colors.length], radius: .8 + Math.random() * 1.5 }); }
  if (particles.length > 132) particles = particles.slice(-132);
  if (!frame) frame = requestAnimationFrame(draw);
}, { passive: true });
addEventListener('pagehide', () => { clearInterval(clockInterval); clear(); });
