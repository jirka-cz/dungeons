// Vizuální efekty: částice, oblouky seků, kruhy výbuchů, paprsky, létající čísla, otřesy obrazovky, světla.

const FX = { parts: [], vfx: [], texts: [], lights: [], shake: 0 };

function fxReset() { FX.parts = []; FX.vfx = []; FX.texts = []; FX.lights = []; FX.shake = 0; }

// Částice
function particle(x, y, o) {
  if (FX.parts.length > 900) return;
  FX.parts.push(Object.assign({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#fff', size: 1, grav: 0, drag: 0.9, glow: false, z: 0, vz: 0 }, o, { max: o.life || 0.5 }));
}
function burst(x, y, color, n = 10, speed = 60, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
    particle(x, y, Object.assign({ vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.4, color, size: Math.random() < 0.3 ? 2 : 1 }, o));
  }
}
function sparks(x, y, color, n = 6) { burst(x, y, color, n, 90, { glow: true, life: 0.25 }); }
function smoke(x, y, n = 4, color = 'rgba(80,80,90,0.6)') {
  for (let i = 0; i < n; i++) particle(x + (Math.random() - 0.5) * 6, y, { vx: (Math.random() - 0.5) * 10, vy: -10 - Math.random() * 15, life: 0.8, color, size: 2, drag: 0.97 });
}
// Rozpad nepřítele na pixely v barvách jeho spritu
function debris(x, y, colors, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 60;
    particle(x, y - 6, { vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: 40 + Math.random() * 60, grav: 200, life: 0.6 + Math.random() * 0.5, color: colors[i % colors.length], size: Math.random() < 0.4 ? 2 : 1, drag: 0.94 });
  }
}

// Efekty tvarů
function vfx(o) { FX.vfx.push(Object.assign({ t: 0 }, o)); }
function ringFx(x, y, r, color, dur = 0.35, width = 2) { vfx({ kind: 'ring', x, y, r, color, dur, width }); }
function arcFx(x, y, ang, arc, r, color, dur = 0.18) { vfx({ kind: 'arc', x, y, ang, arc, r, color, dur }); }
function beamFx(x, y, color, dur = 0.4, w = 10) { vfx({ kind: 'beam', x, y, color, dur, w }); }
function lineFx(x0, y0, x1, y1, color, dur = 0.25, w = 2) { vfx({ kind: 'line', x: x0, y: y0, x1, y1, color, dur, w }); }
function flashFx(x, y, r, color, dur = 0.15) { vfx({ kind: 'flash', x, y, r, color, dur }); }

function floatText(x, y, text, color = '#fff', size = 1, o = {}) {
  if (FX.texts.length > 120) FX.texts.shift();
  FX.texts.push(Object.assign({ x: x + (Math.random() - 0.5) * 8, y, text, color, size, t: 0, dur: 0.9, vy: -28 }, o));
}
function shake(a) { FX.shake = Math.max(FX.shake, a); }
function light(x, y, r, color) { if (FX.lights.length < 48) FX.lights.push({ x, y, r, color }); }

function updateFx(dt) {
  FX.parts = FX.parts.filter(p => {
    p.life -= dt;
    p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.grav) { p.vz -= p.grav * dt; p.z = Math.max(0, p.z + p.vz * dt); if (p.z === 0) p.vz = 0; }
    return p.life > 0;
  });
  FX.vfx = FX.vfx.filter(v => (v.t += dt) < v.dur);
  FX.texts = FX.texts.filter(t => (t.t += dt) < t.dur);
  FX.shake = Math.max(0, FX.shake - dt * 12);
}

// Kreslení do světa (souřadnice světa, kamera už aplikovaná)
function drawParticles(g) {
  FX.parts.forEach(p => {
    const a = Math.min(1, p.life / p.max * 1.5);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.fillRect(Math.round(p.x), Math.round(p.y - p.z), p.size, p.size);
    if (p.glow && Math.random() < 0.5) light(p.x, p.y, 10, p.color);
  });
  g.globalAlpha = 1;
}

function drawVfx(g) {
  FX.vfx.forEach(v => {
    const p = v.t / v.dur;
    g.globalAlpha = 1 - p;
    g.strokeStyle = v.color; g.fillStyle = v.color;
    switch (v.kind) {
      case 'ring':
        g.lineWidth = v.width; g.beginPath(); g.arc(v.x, v.y, Math.max(1, v.r * (0.3 + p * 0.7)), 0, Math.PI * 2); g.stroke(); break;
      case 'arc': {
        g.lineWidth = 3; g.beginPath();
        const a0 = v.ang - v.arc / 2, a1 = v.ang - v.arc / 2 + v.arc * Math.min(1, p * 2.2);
        g.arc(v.x, v.y, v.r * 0.85, a0, a1); g.stroke();
        g.lineWidth = 1; g.globalAlpha = (1 - p) * 0.5; g.beginPath(); g.arc(v.x, v.y, v.r * 0.6, a0, a1); g.stroke();
        break;
      }
      case 'beam':
        g.fillRect(v.x - v.w / 2 * (1 - p), v.y - 120, v.w * (1 - p), 120);
        g.globalAlpha = (1 - p) * 0.8; g.fillStyle = '#ffffff'; g.fillRect(v.x - 1, v.y - 120, 2, 120);
        light(v.x, v.y, 40, v.color); break;
      case 'line':
        g.lineWidth = v.w; g.beginPath(); g.moveTo(v.x, v.y); g.lineTo(v.x1, v.y1); g.stroke(); break;
      case 'flash':
        g.globalAlpha = (1 - p) * 0.6; g.beginPath(); g.arc(v.x, v.y, v.r, 0, Math.PI * 2); g.fill(); break;
    }
  });
  g.globalAlpha = 1; g.lineWidth = 1;
}
