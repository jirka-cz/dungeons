// Zvukové efekty syntetizované přes WebAudio (žádné soubory). Vypínají se v Nastavení.

const SFX = { ctx: null, master: null, last: {}, noise: null };

function sfxInit() {
  if (SFX.ctx) return;
  try {
    SFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
    SFX.master = SFX.ctx.createGain(); SFX.master.gain.value = 0.35; SFX.master.connect(SFX.ctx.destination);
    const len = SFX.ctx.sampleRate, buf = SFX.ctx.createBuffer(1, len, SFX.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    SFX.noise = buf;
  } catch (e) { SFX.ctx = null; }
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(SFX.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q = 1, type = 'bandpass', delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SFX.noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(SFX.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

function sfx(name) {
  if (!SFX.ctx || G.headless || !G.save || G.save.settings.sound === false) return;
  const now = performance.now();
  if (SFX.last[name] && now - SFX.last[name] < 45) return;
  SFX.last[name] = now;
  switch (name) {
    case 'swing': noise(0.12, 0.25, 1800, 0.8, 'bandpass'); break;
    case 'hit': noise(0.06, 0.3, 900, 1.2); tone('square', 160, 80, 0.06, 0.05); break;
    case 'crit': noise(0.09, 0.4, 1200, 1); tone('square', 240, 90, 0.1, 0.08); break;
    case 'shoot': tone('triangle', 900, 400, 0.08, 0.08); break;
    case 'arrow': noise(0.08, 0.2, 3000, 2, 'highpass'); break;
    case 'fire': noise(0.25, 0.3, 500, 0.7, 'lowpass'); tone('sawtooth', 120, 60, 0.2, 0.04); break;
    case 'frost': noise(0.3, 0.2, 5000, 3, 'highpass'); tone('sine', 1400, 900, 0.25, 0.05); break;
    case 'shadow': tone('sawtooth', 220, 110, 0.2, 0.05); noise(0.2, 0.15, 400, 2); break;
    case 'nature': tone('sine', 520, 780, 0.15, 0.06); break;
    case 'explode': noise(0.5, 0.5, 300, 0.6, 'lowpass'); tone('sine', 90, 40, 0.4, 0.15); break;
    case 'nova': noise(0.4, 0.35, 2000, 0.5); tone('sine', 600, 200, 0.35, 0.08); break;
    case 'hurt': tone('square', 110, 60, 0.12, 0.09); noise(0.08, 0.2, 400, 1); break;
    case 'die': noise(0.15, 0.25, 600, 1); tone('square', 200, 50, 0.15, 0.05); break;
    case 'gold': tone('square', 1300, 1300, 0.05, 0.04); tone('square', 1700, 1700, 0.07, 0.04, 0.05); break;
    case 'pickup': tone('triangle', 600, 900, 0.08, 0.06); break;
    case 'rare': [880, 1100, 1320, 1760].forEach((f, i) => tone('sine', f, f, 0.25, 0.06, i * 0.07)); break;
    case 'potion': tone('sine', 400, 800, 0.2, 0.08); noise(0.15, 0.1, 2000, 2); break;
    case 'levelup': [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.35, 0.08, i * 0.1)); break;
    case 'boss': tone('sawtooth', 70, 45, 1.2, 0.15); noise(1, 0.25, 200, 0.5, 'lowpass'); break;
    case 'portal': tone('sine', 300, 900, 0.6, 0.07); break;
    case 'death': tone('sawtooth', 200, 40, 1.2, 0.12); break;
    case 'click': tone('square', 700, 700, 0.03, 0.03); break;
    case 'blink': tone('sine', 1200, 300, 0.2, 0.06); break;
    case 'telegraph': tone('sine', 300, 300, 0.08, 0.03); break;
  }
}

const ELEM_SFX = { phys: 'swing', fire: 'fire', frost: 'frost', shadow: 'shadow', nature: 'nature', arcane: 'shoot', chaos: 'shadow' };
