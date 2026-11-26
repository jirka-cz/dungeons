// Engine: herní smyčka, ovládání (myš, klávesy, dotyk), kamera, vykreslení světa, světlo, minimapa.

const G = {
  save: null, char: null, scene: 'menu', world: null, mapImg: null, hero: null, st: null, mods: null,
  monsters: [], projs: [], zones: [], hazards: [], loot: [], pets: [], traps: [], lootLog: [], offstage: [], decals: [], darkness: 0,
  flow: null, flowT: 0, exploreT: 0, saveT: 0, uiT: 0,
  rift: { level: 0 }, cam: { x: 0, y: 0 }, vw: VIEW_W, vh: VIEW_H, scale: 3, time: 0,
  input: { mx: 0, my: 0, l: false, r: false, lDownT: 0, keys: new Set(), joy: { x: 0, y: 0, on: false }, atk: false, shift: false },
  portal: null, banner: null, bannerBig: null, touch: false, headless: false, mapBig: false,
  // více hrdinů: heroes = všichni v riftu, me = hrdina tohoto hráče, party = další členové družiny pro příští rift
  heroes: [], me: null, party: [], partyMul: 1, remoteCtx: false, nidSeq: 0
};
function newNid() { return ++G.nidSeq; }

// ---------- Více hrdinů ----------
// Herní kód pracuje s „aktuálním hrdinou“ (G.hero, G.char, G.st, G.mods). Mimo herní smyčku je to vždy
// hrdina tohoto hráče (G.me). withHero(h, fn) dočasně přepne kontext na jiného hrdinu (útoky nepřátel
// na spoluhráče, jeho dovednosti, mazlíčci, kořist) a pak ho vrátí zpět.
function withHero(h, fn) {
  if (!h || G.hero === h) return fn();
  const prev = { hero: G.hero, char: G.char, st: G.st, mods: G.mods, remote: G.remoteCtx };
  if (prev.hero) { prev.hero.st = G.st; prev.hero.mods = G.mods; }
  G.hero = h; G.char = h.char; G.st = h.st; G.mods = h.mods; G.remoteCtx = h !== G.me;
  try { return fn(); }
  finally {
    h.st = G.st; h.mods = G.mods;
    G.hero = prev.hero; G.char = prev.char; G.st = prev.st; G.mods = prev.mods; G.remoteCtx = prev.remote;
  }
}
// Spustí fn(h) pro každého hrdinu v jeho kontextu (alive = jen živí)
function eachHero(fn, alive) {
  for (const h of G.heroes.slice()) { if (h.ghost || h.rep || (alive && h.dead)) continue; withHero(h, () => fn(h)); }
}
function heroSt(h) { return h === G.hero ? G.st : h.st; }
function isHero(h) { return !!h && G.heroes.includes(h); }
function nearestHero(x, y, alive = true) {
  let best = null, bd = 1e9;
  for (const h of G.heroes) { if (h.ghost || h.rep || (alive && h.dead)) continue; const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
  return best;
}
function heroSave() { return (G.hero && G.hero.save) || G.save; }
// +10 % nepřátel, jejich života a poškození za každého dalšího hráče
function partyMulFor(n) { return 1 + 0.1 * Math.max(0, n - 1); }

let canvas, ctx, wc, wg, lc, lg;

// ---------- Plátno a rozměry ----------

function initCanvas() {
  canvas = $('game'); ctx = canvas.getContext('2d');
  wc = document.createElement('canvas'); wg = wc.getContext('2d');
  lc = document.createElement('canvas'); lg = lc.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  // po zapnutí/vypnutí celé obrazovky nebo otočení telefonu hlásí prohlížeč novou velikost se zpožděním – přeměřit ještě jednou
  const later = () => { resize(); setTimeout(resize, 150); setTimeout(resize, 500); };
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, later));
  window.addEventListener('orientationchange', later);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
}

function resize() {
  if (G.char && G.scene && G.scene !== 'menu' && typeof buildHud === 'function') setTimeout(buildHud, 50);
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  const aspect = w / h;
  // menší obrazovky (mobil) = bližší pohled, aby postavy nebyly drobné
  const vh = h < 520 ? 196 : VIEW_H;
  if (aspect >= 1) { G.vh = vh; G.vw = Math.round(vh * aspect); }
  else { G.vw = 230; G.vh = Math.round(230 / aspect); }
  G.vw = Math.min(G.vw, 600);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  wc.width = lc.width = G.vw; wc.height = lc.height = G.vh;
  G.scale = canvas.width / G.vw;
  G.dpr = dpr; G.cssScale = w / G.vw;
}

function toWorld(sx, sy) { return { x: G.cam.x + sx / G.cssScale, y: G.cam.y + sy / G.cssScale }; }

// ---------- Ovládání ----------

// Klávesa podle fyzické pozice u číslic: česká klávesnice píše na horní řadě + ě š č, ale kód je Digit1–4
function keyOf(e) {
  const m = /^(Digit|Numpad)([0-9])$/.exec(e.code || '');
  return m ? m[2] : (e.key || '').toLowerCase();
}

function initInput() {
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('pointerdown', sfxInit, { capture: true });
  window.addEventListener('keydown', sfxInit, { capture: true });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') G.touch = true;
    G.input.mx = e.clientX; G.input.my = e.clientY;
    if (e.button === 2) { G.input.r = true; if (G.hero && !modalOpen()) useBarSlot(1); return; }
    if (e.button !== 0) return;
    G.input.l = true; G.input.lDownT = 0;
    clickWorld(e.pointerType === 'touch');
    if (G.hero && !modalOpen() && G.scene === 'rift' && !G.touch) useBarSlot(0);
  });
  window.addEventListener('pointermove', e => { G.input.mx = e.clientX; G.input.my = e.clientY; });
  window.addEventListener('pointerup', e => {
    if (e.button === 2) { G.input.r = false; return; }
    if (e.button !== 0) return;
    G.input.l = false;
  });
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = keyOf(e);
    G.input.keys.add(k);
    if (k === 'escape') { if (modalOpen()) closeMenu(); else if (G.scene !== 'menu') showGameMenu(); }
    if (G.scene === 'menu' || modalOpen()) return;
    if (k.startsWith('arrow')) e.preventDefault();
    if (k === 'q') usePotion();
    if (['1', '2', '3', '4'].includes(k) && !e.repeat) useBarSlot(+k + 1);
    if (k === 'i' || k === 'c') showCharacter();
    if (k === 'k' || k === 'n') showTalents();
    if (k === 'f') toggleFullscreen();
    if (k === 'm' || k === 'tab') { G.mapBig = !G.mapBig; e.preventDefault(); }
    if (k === 't') townPortal();
  });
  window.addEventListener('keyup', e => { G.input.keys.delete(keyOf(e)); G.input.keys.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', () => { G.input.keys.clear(); G.input.l = G.input.r = false; });
}

function monsterAt(wx, wy) {
  let best = null, bd = 1e9;
  G.monsters.forEach(m => {
    if (m.dead) return;
    const cy = m.y - 7 * m.scale, d = Math.hypot(m.x - wx, cy - wy);
    if (d < m.r + 8 * m.scale && d < bd) { bd = d; best = m; }
  });
  return best;
}

function clickWorld(touch) {
  const h = G.hero;
  if (!h || h.dead || G.scene === 'menu') return;
  const p = toWorld(G.input.mx, G.input.my);
  h.interact = null; h.target = null;
  // NPC / objekty / portál (pohyb je na klávesnici, klik jen na postavy a portál)
  if (G.scene === 'town') {
    const npc = G.world.npcs.find(n => Math.hypot(n.x - p.x, n.y - 6 - p.y) < 16);
    if (npc) { h.interact = npc; h.path = findPath(G.world, h.x, h.y, npc.x, npc.y + 14) || null; return; }
  }
  if (G.portal && Math.hypot(G.portal.x - p.x, G.portal.y - 8 - p.y) < 16) { h.path = findPath(G.world, h.x, h.y, G.portal.x, G.portal.y); return; }
  if (touch) { h.path = findPath(G.world, h.x, h.y, p.x, p.y); }   // na mobilu klepnutí do mapy = dojdi tam
}

// Automatický cíl pro dotykové ovládání a klávesy bez kurzoru
function autoTarget(range = 190) {
  const h = G.hero;
  if (h.target && !h.target.dead && !h.target.immune && dist(h.target, h) < range) return h.target;
  const ok = m => lineOfSight(G.world, h.x, h.y, m.x, m.y);
  if (G.mods && G.mods.targetWeakest) {   // pro budoucí talent lovce: cíl s nejméně životy
    let best = null;
    G.monsters.forEach(m => { if (!m.dead && dist(m, h) < range && ok(m) && (!best || m.hp < best.hp)) best = m; });
    return best;
  }
  return nearestMonster(h.x, h.y, range, ok);
}

// Je nějaký nepřítel v dosahu základního útoku? (pro automatický útok)
function primaryInRange() {
  const h = G.hero, S = G.char.bar[0] && SKILLS[effSkill(G.char.bar[0])];
  if (!S) return null;
  if (S.type === 'melee') return nearestMonster(h.x, h.y, S.range + 12, m => dist(m, h) < S.range + m.r + 4);
  return nearestMonster(h.x, h.y, 190, m => lineClear(G.world, h.x, h.y, m.x, m.y, 2));
}

function autoAttackOn() { return G.touch || !!G.save.settings.autoAttack; }

// ---------- Teleport do města (5 s sesílání) ----------
const RECALL_TIME = 5;
function startRecall() {
  const h = G.hero;
  if (!h || h.dead || G.scene !== 'rift' || h.recall) return;
  h.recall = { t: 0 }; h.path = null; h.target = null;
  sfx('portal');
}
function cancelRecall(why) {
  const h = G.hero;
  if (!h || !h.recall) return;
  h.recall = null;
  floatText(h.x, h.y - 30, why || 'Teleport přerušen', '#9ab8ff', 1);
}
function updateRecall(dt) {
  const h = G.hero, R = h.recall;
  R.t += dt;
  const a = G.time * 6;
  if (Math.random() < 0.5) particle(h.x + Math.cos(a) * 11, h.y - 1 + Math.sin(a) * 4, { vy: -24, life: 0.6, color: '#6aa8ff', size: 1 });
  light(h.x, h.y - 8, 26 + R.t * 3, '#3a6acc');
  if (R.t >= RECALL_TIME) { h.recall = null; goTown(); }
}

function aimPoint(skillId) {
  const h = G.hero;
  if (!G.touch) { const p = toWorld(G.input.mx, G.input.my); return { x: p.x, y: p.y, t: monsterAt(p.x, p.y) }; }
  const S = SKILLS[effSkill(skillId)];
  const t = autoTarget(S && (S.type === 'melee') ? 60 : 200);
  const mobility = S && ['teleport', 'leap', 'dash'].includes(S.type);
  if (t && !mobility) return { x: t.x, y: t.y - 6, t };
  const jx = G.input.joy.on ? G.input.joy.x : h.face, jy = G.input.joy.on ? G.input.joy.y : 0;
  const len = Math.hypot(jx, jy) || 1;
  return { x: h.x + jx / len * 90, y: h.y - 6 + jy / len * 90, t: null };
}

function useBarSlot(i) {
  const id = G.char.bar[i];
  if (!id || G.scene !== 'rift') return false;
  if (G.hero.recall) cancelRecall();
  const a = aimPoint(id);
  return castSkill(id, a.x, a.y, a.t);
}

function usePotion() {
  const h = G.hero;
  if (!h || h.dead || G.scene !== 'rift') return;
  if (Net.clientRift && h === G.me) return netPotion();
  if (h.potionCd > 0) { floatText(h.x, h.y - 30, `Lektvar za ${Math.ceil(h.potionCd)} s`, '#aaa', 0.8); return; }
  h.potionCd = POTION_CD;
  sfx('potion');
  healHero(G.st.maxHp * POTION_HEAL * G.st.healMul);
  for (let i = 0; i < 16; i++) particle(h.x + rand(-6, 6), h.y, { vy: rand(-60, -20), life: 0.7, color: '#ff5050', size: 2, glow: true });
}

// ---------- Aktualizace ----------

function update(dt) {
  if (Net.clientRift) return guestUpdate(dt);   // host v podzemí hostitele: hru počítá hostitel
  G.time += dt;
  const me = G.me || G.hero;
  // každý hrdina ve svém kontextu (místní hráč se ovládá vstupem, ostatní přes h.control)
  for (const h of G.heroes.slice()) withHero(h, () => updateHero(h, dt));
  if (G.scene === 'town' && me) withHero(me, npcProximity);   // okna objektů: přiblížení otevře, odchod zavře
  if (G.scene === 'rift') {
    G.rift.time += dt;
    G.flowT -= dt;
    if (G.flowT <= 0) { G.flowT = 0.35; G.flow = flowFieldMulti(G.world, G.heroes.filter(x => !x.dead && !x.ghost), 34); }
    const near = m => G.heroes.some(x => !x.ghost && (Math.abs(m.x - x.x) <= 260 || Math.abs(m.y - x.y) <= 200));
    updateCoopRevive(dt);
    for (const m of G.monsters) {
      if (m.dead) continue;
      if (!m.aggro && !near(m)) continue;
      updateMonster(m, dt);
    }
    G.offstage.slice().forEach(m => { if (!m.dead) updateMonster(m, dt); });   // boss ve vzduchu / ve stínu
    updateBossWorld(dt);
    separate();
    G.monsters = G.monsters.filter(m => !m.dead);
    updateProjectiles(dt); updateZones(dt); updateTraps(dt); updateHazards(dt);
    updateShrines();
    G.stuckT = (G.stuckT || 0) - dt;
    if (G.stuckT <= 0) { G.stuckT = 1; checkRiftStuck(); }
    if (G.portal && !me.dead && dist(G.portal, me) < 12) { goTown(); return; }
  }
  updatePets(dt);
  updateLoot(dt);
  updateFx(dt);
  G.exploreT -= dt;
  if (G.exploreT <= 0) { G.exploreT = 0.25; explore(); }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 3) G.banner = null; }
  if (G.bannerBig) { G.bannerBig.t += dt; if (G.bannerBig.t > 3) G.bannerBig = null; }
  G.lootLog.forEach(l => l.t += dt); G.lootLog = G.lootLog.filter(l => l.t < 8);
  G.saveT -= dt;
  if (G.saveT <= 0) { G.saveT = 15; persist(); }
}

// Časovače, život, zdroj, ovládání a dovednosti jednoho hrdiny (běží v jeho kontextu)
function updateHero(h, dt) {
  if (h.ghost) { netGhostStep(h, dt); return; }   // spoluhráč ve městě: jen se plynule posouvá
  const st = G.st;
  h.castLock -= dt; h.atkCd = (h.atkCd || 0) - dt; h.moveLock = (h.moveLock || 0) - dt; h.invuln -= dt; h.potionCd -= dt; h.frozen -= dt; h.hitT -= dt; h.atkAnim -= dt; h.slowT = (h.slowT || 0) - dt; h.resWarn = (h.resWarn || 0) - dt;
  for (const k in h.cds) h.cds[k] -= dt;
  if (h.dead) {
    h.recall = null;
    h.deadT -= dt;
    if (h.deadT <= 0) reviveHero();
  } else {
    h.hp = Math.min(st.maxHp, h.hp + st.maxHp * (st.regen + (G.scene === 'town' ? 0.1 : 0)) * dt);
    h.res = clamp(h.res + st.resRegen * dt, 0, st.resMax);
    if (st.barrier) {   // mág: Arkánní bariéra se obnoví po 5 s bez zásahu
      const full = st.maxHp * st.barrier;
      if (G.scene !== 'rift' || G.time - (h.lastHitT || -99) > 5) { if ((h.barrier || 0) < full) h.barrier = Math.min(full, (h.barrier || 0) + full * dt * 2); }
      h.barrier = Math.min(h.barrier || 0, full);
    }
    if (h === G.me) heroControl(dt);
    else if (h.control) h.control(dt);
    updateHeroSkills(dt);
  }
}

// Oživení spoluhráče: postav se k padlému na 2 s a vstane na místě (jen v družině)
function updateCoopRevive(dt) {
  if (G.heroes.length < 2) return;
  for (const d of G.heroes) {
    if (!d.dead || d.ghost) continue;
    const helper = G.heroes.find(o => o !== d && !o.dead && !o.ghost && dist(o, d) < 20);
    if (helper) {
      d.revT = (d.revT || 0) + dt;
      if (Math.random() < 0.4) particle(d.x + rand(-6, 6), d.y - rand(0, 12), { vy: -30, life: 0.5, color: '#fff0b0', size: 1, glow: true });
      if (d.revT >= COOP_REVIVE_T) { d.revT = 0; withHero(d, () => reviveHero(true)); floatText(d.x, d.y - 30, 'Oživen!', '#fff0b0', 1.2); }
    } else d.revT = Math.max(0, (d.revT || 0) - dt * 2);
  }
}

function heroControl(dt) {
  const h = G.hero, inp = G.input, K = inp.keys;
  if (inp.l) inp.lDownT += dt;
  if (h.frozen > 0 || h.leap || h.dash || h.hooked) return;
  // směr pohybu z klávesnice (WASD / šipky) nebo joysticku
  let mx = 0, my = 0;
  if (K.has('a') || K.has('arrowleft')) mx -= 1;
  if (K.has('d') || K.has('arrowright')) mx += 1;
  if (K.has('w') || K.has('arrowup')) my -= 1;
  if (K.has('s') || K.has('arrowdown')) my += 1;
  if (inp.joy.on && (inp.joy.x || inp.joy.y)) { mx = inp.joy.x; my = inp.joy.y; }
  const moving = mx !== 0 || my !== 0;
  // teleport do města: pohyb nebo útok ho přeruší
  if (h.recall) {
    if (moving || inp.l || inp.r || inp.atk || ['1', '2', '3', '4'].some(k => K.has(k))) cancelRecall();
    else { updateRecall(dt); return; }
  }
  // útoky a dovednosti
  if (G.scene === 'rift') {
    if (inp.r) useBarSlot(1);
    ['1', '2', '3', '4'].forEach((k, i) => { if (K.has(k)) useBarSlot(i + 2); });
    if (inp.l && !G.touch) useBarSlot(0);                       // držení levého = základní útok ke kurzoru
    else if (autoAttackOn() && !inp.atk && primaryInRange()) useBarSlot(0);   // automatický útok
  }
  // mobil: držení tlačítka útoku = dojdi k nejbližšímu a útoč
  if (G.touch && inp.atk && G.scene === 'rift' && !moving) {
    const t = autoTarget(200);
    if (t) {
      h.target = t;
      const id = G.char.bar[0], S = SKILLS[effSkill(id)], melee = S.type === 'melee';
      const range = melee ? S.range + t.r - 2 : 190, d = dist(h, t);
      if (d > range || (!melee && !lineClear(G.world, h.x, h.y, t.x, t.y, 2))) moveToward(t.x, t.y, dt, true);
      else castSkill(id, t.x, t.y - 6 * t.scale, t);
      return;
    }
    useBarSlot(0);
  }
  if (h.target && (h.target.dead || G.scene !== 'rift' || !inp.atk)) h.target = null;
  // pohyb klávesnicí / joystickem (útok pohyb nezastaví)
  if (moving) {
    h.path = null; h.interact = null;
    const len = Math.max(1, Math.hypot(mx, my)), sp = heroSpeed() * dt;
    if (moveEntity(G.world, h, mx / len * sp, my / len * sp)) h.walk += dt;
    if (Math.abs(mx) > 0.1 && h.atkAnim <= 0) h.face = mx > 0 ? 1 : -1;
    return;
  }
  if (h.moveLock > 0) return;
  // dojití k NPC / portálu po kliknutí
  if (h.path && h.path.length) {
    const wp = h.path[0];
    if (Math.hypot(wp.x - h.x, wp.y - h.y) < 3) h.path.shift();
    else moveToward(wp.x, wp.y, dt, false);
  } else h.walk = 0;
  // interakce s NPC
  if (h.interact && dist(h, h.interact) < 24) { const n = h.interact; h.interact = null; h.path = null; interactNpc(n); }
}

function heroSpeed() {
  const h = G.hero;
  return G.st.moveSpeed * (h.slowT > 0 ? 1 - h.slowP : 1);
}

function moveToward(tx, ty, dt, pathfind) {
  const h = G.hero;
  let dx = tx - h.x, dy = ty - h.y;
  if (pathfind && !lineClear(G.world, h.x, h.y, tx, ty, h.r)) {
    if (!h.path || !h.pathT || h.pathT < G.time) { h.path = findPath(G.world, h.x, h.y, tx, ty); h.pathT = G.time + 0.4; }
    if (h.path && h.path.length) { if (Math.hypot(h.path[0].x - h.x, h.path[0].y - h.y) < 3) h.path.shift(); if (h.path.length) { dx = h.path[0].x - h.x; dy = h.path[0].y - h.y; } }
  }
  const d = Math.hypot(dx, dy) || 1, sp = Math.min(d, heroSpeed() * dt);
  if (moveEntity(G.world, h, dx / d * sp, dy / d * sp)) h.walk += dt;
  else if (!pathfind && h.path && h.path.length) h.path.shift();   // zaseknutý bod cesty přeskočit
  if (Math.abs(dx) > 1) h.face = dx > 0 ? 1 : -1;
}

// Nepřátelé se navzájem odstrkují, aby se nepřekrývali
function separate() {
  const ms = G.monsters;
  for (let i = 0; i < ms.length; i++) {
    const a = ms[i];
    if (a.dead || !a.aggro || a.boss || a.obj) continue;
    for (let j = i + 1; j < ms.length; j++) {
      const b = ms[j];
      if (b.dead || !b.aggro || b.obj) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2 / d;
        if (!b.boss) moveEntity(G.world, b, dx * push, dy * push);
        moveEntity(G.world, a, -dx * push, -dy * push);
      }
    }
    for (const h of G.heroes) {
      if (h.dead) continue;
      const dx = a.x - h.x, dy = a.y - h.y, d = Math.hypot(dx, dy), min = a.r + h.r - 1;
      if (d > 0 && d < min) moveEntity(G.world, a, dx / d * (min - d), dy / d * (min - d));
    }
  }
}

function explore() {
  const W = G.world, h = G.hero, R = 11;
  const cx = Math.floor(h.x / TILE), cy = Math.floor(h.y / TILE);
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || y < 0 || x >= W.w || y >= W.h) continue;
    if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R) W.explored[y * W.w + x] = 1;
  }
}

// ---------- Vykreslení ----------

function render() {
  const h = G.hero;
  if (!h || !G.world) { ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const W = G.world;
  // kamera
  let cx = h.x - G.vw / 2, cy = h.y - 8 - G.vh / 2;
  cx = clamp(cx, 0, Math.max(0, W.w * TILE - G.vw)); cy = clamp(cy, 0, Math.max(0, W.h * TILE - G.vh));
  if (FX.shake > 0) { cx += rand(-FX.shake, FX.shake); cy += rand(-FX.shake, FX.shake); }
  G.cam.x = cx; G.cam.y = cy;
  const camX = Math.round(cx), camY = Math.round(cy);
  wg.imageSmoothingEnabled = false;
  wg.fillStyle = '#000'; wg.fillRect(0, 0, G.vw, G.vh);
  wg.drawImage(G.mapImg, camX, camY, G.vw, G.vh, 0, 0, G.vw, G.vh);
  wg.save();
  wg.translate(-camX, -camY);
  drawGroundLayer(wg);
  drawEntities(wg);
  drawProjectiles(wg);
  drawParticles(wg);
  drawVfx(wg);
  wg.restore();
  drawLighting(wg, camX, camY);
  // přenos na obrazovku
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wc, 0, 0, canvas.width, canvas.height);
  drawOverlay(camX, camY);
  FX.lights = [];
}

function inView(x, y, m = 40) { return x > G.cam.x - m && x < G.cam.x + G.vw + m && y > G.cam.y - m && y < G.cam.y + G.vh + m; }

function drawGroundLayer(g) {
  const t = G.time;
  // pochodně
  G.world.torches.forEach(tc => {
    if (!inView(tc.x, tc.y)) return;
    const f = Math.sin(t * 12 + tc.x) > 0;
    g.fillStyle = '#4a3018'; g.fillRect(tc.x - 1, tc.y + 2, 2, 5);
    g.fillStyle = f ? '#ffb040' : '#ff7a20'; g.fillRect(tc.x - 2, tc.y - 2, 4, 4);
    g.fillStyle = '#ffe8a0'; g.fillRect(tc.x - 1, tc.y - (f ? 1 : 0), 2, 2);
    light(tc.x, tc.y, 62 + Math.sin(t * 9 + tc.y) * 4, G.scene === 'town' ? '#ffb040' : THEMES[G.world.theme].torch);
    if (Math.random() < 0.08) particle(tc.x, tc.y - 3, { vy: -20, vx: rand(-4, 4), life: 0.5, color: '#ffb040', size: 1, glow: true });
  });
  // obelisk ve městě
  if (G.scene === 'town') {
    const o = G.world.npcs.find(n => n.id === 'obelisk');
    const x = o.x, y = 10 * TILE;
    g.fillStyle = '#2a2240'; g.fillRect(x - 10, y + 22, 20, 8);
    g.fillStyle = '#4a3a7a'; g.fillRect(x - 6, y - 6, 12, 30);
    g.fillStyle = '#6a5aaa'; g.fillRect(x - 6, y - 6, 3, 30);
    g.fillStyle = '#2a1e4a'; g.fillRect(x - 4, y - 12, 8, 6); g.fillRect(x - 2, y - 15, 4, 3);
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    g.fillStyle = `rgba(180,120,255,${0.5 + pulse * 0.5})`; g.fillRect(x - 2, y + 2, 4, 14);
    light(x, y + 6, 70 + pulse * 15, '#a070ff');
    if (Math.random() < 0.3) particle(x + rand(-8, 8), y + 24, { vy: rand(-40, -15), life: 1, color: '#b080ff', size: 1, glow: true, drag: 0.98 });
  }
  // plochy dovedností hrdiny
  G.zones.forEach(z => {
    if (z.t < z.delay && !z.meteor && !z.beam) { g.strokeStyle = z.color; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2); g.stroke(); }
    if (z.t < z.delay && z.meteor) { g.strokeStyle = '#ff6020'; g.globalAlpha = 0.4 + 0.4 * (z.t / z.delay); g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2); g.stroke(); }
    if (z.fired && z.dur) {
      g.globalAlpha = 0.18 + Math.sin(G.time * 6) * 0.04; g.fillStyle = z.color;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.5; g.strokeStyle = z.color; g.stroke();
    }
    g.globalAlpha = 1;
  });
  drawDecals(g);
  // nebezpečí nepřátel (varování)
  G.hazards.forEach(z => {
    if (drawBossHazard(g, z)) return;
    const p = z.delay ? Math.min(1, z.t / z.delay) : 1;
    if (z.line) {
      g.globalAlpha = 0.25 + p * 0.35; g.strokeStyle = '#ff3030'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(z.x, z.y); g.lineTo(z.x + Math.cos(z.ang) * z.len, z.y + Math.sin(z.ang) * z.len); g.stroke(); g.lineWidth = 1;
    } else if (z.wave) {
      if (z.t >= z.delay) { g.globalAlpha = 0.8; g.strokeStyle = z.color; g.lineWidth = 3; g.beginPath(); g.ellipse(z.x, z.y, z.cur, z.cur * 0.8, 0, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; }
    } else if (z.cone) {
      g.globalAlpha = 0.2 + p * 0.3; g.fillStyle = '#ff3020';
      g.beginPath(); g.moveTo(z.x, z.y); g.arc(z.x, z.y, z.len * p, z.ang - z.arc / 2, z.ang + z.arc / 2); g.closePath(); g.fill();
      g.strokeStyle = '#ff6040'; g.beginPath(); g.moveTo(z.x, z.y); g.arc(z.x, z.y, z.len, z.ang - z.arc / 2, z.ang + z.arc / 2); g.closePath(); g.stroke();
    } else if (!z.fired && z.delay) {
      g.globalAlpha = 0.7; g.strokeStyle = z.orb ? z.color : '#ff3030';
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.15 + p * 0.3; g.fillStyle = z.orb ? z.color : '#ff3030';
      g.beginPath(); g.ellipse(z.x, z.y, z.r * p, z.r * 0.8 * p, 0, 0, Math.PI * 2); g.fill();
      if (z.orb) { g.globalAlpha = 1; g.fillStyle = z.color; g.fillRect(z.x - 2, z.y - 8 - Math.sin(G.time * 8) * 2, 4, 4); light(z.x, z.y - 6, 18, z.color); }
    } else if (z.pool && z.dur) {
      g.globalAlpha = 0.35; g.fillStyle = z.color;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); g.fill();
      if (z.elem === 'fire') light(z.x, z.y, z.r + 10, z.color);
    }
    g.globalAlpha = 1;
  });
  // pasti
  G.traps.forEach(tr => {
    g.fillStyle = tr.arm > 0 ? '#6a5a4a' : '#8a6a3a'; g.fillRect(tr.x - 4, tr.y - 2, 8, 4);
    g.fillStyle = Math.sin(G.time * 8) > 0 ? '#ff8a3a' : '#a04010'; g.fillRect(tr.x - 1, tr.y - 1, 2, 2);
  });
  // kořist
  G.loot.forEach(l => {
    if (l.owner && l.owner !== G.hero) return;   // kořist spoluhráčů vidí jen oni
    const bob = Math.sin(G.time * 4 + l.x) * 1;
    const drop = Math.max(0, 1 - l.t * 4) * 10;
    if (l.kind === 'gold') { g.fillStyle = '#e0b030'; g.fillRect(l.x - 2, l.y - 2 - drop, 4, 3); g.fillStyle = '#fff0a0'; g.fillRect(l.x - 1, l.y - 2 - drop, 1, 1); }
    else if (l.kind === 'globe') { g.fillStyle = '#c02020'; g.beginPath(); g.arc(l.x, l.y - 4 + bob, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff8080'; g.fillRect(l.x - 2, l.y - 6 + bob, 1, 1); light(l.x, l.y, 16, '#ff4040'); }
    else if (l.kind === 'item') {
      const it = l.item, col = RARITIES[it.rarity].color, ri = RARITY_ORDER.indexOf(it.rarity);
      if (ri >= 2) { g.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.1; g.fillStyle = col; g.fillRect(l.x - 1, l.y - 60, 2, 60); g.globalAlpha = 1; light(l.x, l.y, 24, col); }
      drawIcon(g, itemIcon(it), l.x - 6, l.y - 10 - drop + bob, 1, col);
      if (it.rarity === 'mythic' && Math.random() < 0.4) particle(l.x + rand(-5, 5), l.y - 4, { vy: -rand(12, 22), life: 0.6, color: ['#ffd27a', '#ff5a14', '#c41a10'][Math.random() * 3 | 0], size: 1, glow: true });
    }
  });
  // svatyně
  (G.shrines || []).forEach(s => {
    if (!inView(s.x, s.y)) return;
    const S = SHRINES[s.type];
    g.fillStyle = '#3a3448'; g.fillRect(s.x - 7, s.y - 2, 14, 5); g.fillStyle = '#5a5268'; g.fillRect(s.x - 5, s.y - 16, 10, 14);
    g.fillStyle = '#2a2436'; g.fillRect(s.x - 5, s.y - 16, 2, 14);
    if (!s.used) {
      const pu = 0.6 + Math.sin(G.time * 4) * 0.4;
      g.globalAlpha = pu; g.fillStyle = S.color; g.fillRect(s.x - 2, s.y - 22 - Math.sin(G.time * 3) * 2, 4, 4); g.globalAlpha = 1;
      light(s.x, s.y - 14, 40 + pu * 10, S.color);
      if (Math.random() < 0.2) particle(s.x + rand(-5, 5), s.y - 10, { vy: -20, life: 0.8, color: S.color, size: 1, glow: true });
    }
  });
  // portál
  if (G.portal) {
    const p = G.portal;
    for (let i = 0; i < 3; i++) { g.strokeStyle = ['#4a8aff', '#8ac0ff', '#ffffff'][i]; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(p.x, p.y - 10, 8 - i * 2 + Math.sin(G.time * 5 + i) * 1, 14 - i * 3, 0, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1; light(p.x, p.y - 10, 50, '#4a8aff');
    if (Math.random() < 0.4) particle(p.x + rand(-6, 6), p.y - rand(0, 20), { vy: -10, life: 0.6, color: '#8ac0ff', size: 1, glow: true });
  }
}

function drawShadow(g, x, y, w) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2); g.fill(); }

function drawEntities(g) {
  const h = G.hero, t = G.time;
  const list = [];
  G.monsters.forEach(m => { if (inView(m.x, m.y)) list.push(m); });
  G.offstage.forEach(m => { if (inView(m.x, m.y, 80)) list.push(m); });
  G.pets.forEach(p => { if (inView(p.x, p.y)) list.push(p); });
  if (G.scene === 'town') G.world.npcs.forEach(n => { if (!n.obj) list.push(n); });
  const heroes = G.heroes.length ? G.heroes : [h];
  heroes.forEach(x => list.push(x));
  list.sort((a, b) => a.y - b.y);
  list.forEach(e => {
    if (heroes.includes(e)) return drawHero(g, e);
    if (e.kind === 'pet') {
      const bob = e.walk > 0 ? Math.floor(t * 10) % 2 : 0;
      drawShadow(g, e.x, e.y, 5 * e.scale);
      if (e.def.ring) { g.strokeStyle = e.def.ring; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(e.x, e.y + 1, 6, 2.5, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }   // spojenec (kostlivec nemrtvého)
      const s = e.def.scale, lift = e.type === 'imp' ? 6 + Math.sin(t * 4) * 2 : 0;
      drawSprite(g, e.def.sprite, e.x - 8 * s, e.y - 15 * s - bob - lift, s, { flip: e.face < 0, t, tint: e.def.tint, palOverride: e.def.pal });
      return;
    }
    if (e.sprite && !e.kind) {   // NPC
      drawShadow(g, e.x, e.y, 5);
      drawSprite(g, e.sprite, e.x - 8, e.y - 16 + (Math.floor(t * 1.5) % 2), 1, { palOverride: e.pal, t, flip: h.x < e.x });
      return;
    }
    drawMonster(g, e);
  });
}

function drawMonster(g, m) {
  if (m.boss) return drawBoss(g, m);
  if (!m.sprite) return;
  const t = G.time, s = m.scale, size = 16 * s;
  const walking = m.walk > 0 && m.stunT <= 0;
  let ox = 0, oy = 0;
  if (walking) oy -= (Math.floor(t * 8 + m.bob) % 2);
  if (m.fly) oy -= 6 + Math.sin(t * 7 + m.bob) * 2;
  if (m.wind > 0) ox -= m.face * 2;
  if (m.atkAnim > 0) { ox += m.face * 3; m.atkAnim -= 1 / 60; }
  if (m.knock > 0) ox -= m.face * 1;
  if (m.fuse !== undefined) ox += Math.sin(t * 60) * 1;
  // objekty bossů: vznášení, pulzování, záře
  let alpha;
  if (m.obj) {
    if (m.clone) { oy -= 5 + Math.sin(t * 2.5 + m.bob) * 2; alpha = 0.78 + Math.sin(t * 7 + m.bob) * 0.1; light(m.x, m.y - 14, 24, '#bfefff'); }
    else if (m.obj === 'phylactery') { oy -= 3 + Math.sin(t * 3 + m.bob) * 2; light(m.x, m.y - 8, 30, '#7ff0ff'); }
    else if (m.obj === 'eggsac') { if (m.hatch < 2) ox += Math.sin(t * 40) * 1; light(m.x, m.y - 6, 14, '#8be07a'); }
  }
  drawShadow(g, m.x, m.y, m.r * 0.9);
  if (m.elite) { g.strokeStyle = m.tint; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(m.x, m.y, m.r + 2, (m.r + 2) * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  if (m.boss) { g.strokeStyle = '#ff4040'; g.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2; g.beginPath(); g.ellipse(m.x, m.y, m.r + 4, (m.r + 4) * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  const flash = m.hitT > 0 || (m.wind > 0 && Math.floor(t * 20) % 2) || (m.fuse !== undefined && Math.floor(t * 16) % 2);
  drawSprite(g, m.sprite, Math.round(m.x - size / 2 + ox), Math.round(m.y - size + 1 + oy - (m.z || 0)), s,
    { flip: m.face < 0, flash, t, palOverride: m.pal, tint: m.tint, frozen: m.stunT > 0 && m.stunKind === 'freeze', alpha });
  // stavy
  if (m.stunT > 0 && m.stunKind === 'stun') for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; g.fillStyle = '#ffe08a'; g.fillRect(m.x + Math.cos(a) * 6, m.y - size - 2 + Math.sin(a) * 2, 2, 2); }
  Object.values(m.dots).forEach((d, j) => { if (Math.random() < 0.3) particle(m.x + rand(-m.r, m.r), m.y - rand(0, size), { vy: -15, life: 0.4, color: ELEMENTS[d.elem].color, size: 1 }); });
  if (m.slowT > 0) { g.fillStyle = '#bfe8ff'; g.fillRect(m.x - 4 + Math.sin(t * 3) * 3, m.y - 2, 1, 1); }
}

const spriteEyeCache = {};
function drawHero(g, h) {
  h = h || G.hero;
  const t = G.time, ch = h.char || G.char;
  if (h.dead) { g.globalAlpha = 0.3; }
  const bob = h.walk > 0 ? (Math.floor(t * 9) % 2) : 0;
  const form = (h.buffs.find(b => b.form) || {}).form;
  const FORM = { bear: ['#8a5a2a', 1.3], wolf: ['#7a7a8a', 1.15], moonkin: ['#8a78d8', 1.2], meta: ['#30a050', 1.3], avatar: [null, 1.3] }[form] || [null, 1];
  const s = FORM[1];
  let ox = 0, oy = 0;
  if (h.atkAnim > 0) { ox = Math.cos(h.atkAng || 0) * 2; oy = Math.sin(h.atkAng || 0) * 1; }
  drawShadow(g, h.x, h.y, 6 * s);
  if (h.invuln > 0 && !h.leap && !h.dash && Math.floor(t * 15) % 2) g.globalAlpha = 0.5;
  if (h.stealth > 0) g.globalAlpha = 0.35;   // elf ve stínu
  // mýtický set: 3 díly = planoucí oči, 6 dílů = hořící postava
  const myth = h.dead ? 0 : mythicPieces(ch), sx = Math.round(h.x - 8 * s + ox), sy = Math.round(h.y - 16 * s + 1 - bob + oy - (h.z || 0));
  const pal = classPal(ch.race, ch.cls);
  drawSprite(g, ch.race, sx, sy, s, {
    flip: h.face < 0, flash: h.hitT > 0, t, blink: myth < 3 && (t % 3.8) < 0.12, palOverride: myth >= 3 ? Object.assign({}, pal, { e: Math.sin(t * 9) > -0.3 ? '#ffe08a' : '#ff8a2a' }) : pal,
    tint: FORM[0], frozen: h.frozen > 0
  });
  g.globalAlpha = 1;
  if (myth >= 3) {
    const FIRE = ['#ffd27a', '#ff8a2a', '#ff5a14', '#c41a10'];
    (spriteEyeCache[ch.race] || (spriteEyeCache[ch.race] = spriteEyes(ch.race))).eyes.forEach(([ex, ey]) => {
      const px = sx + ((h.face < 0 ? 15 - ex : ex) + 0.5) * s, py = sy + (ey + 0.5) * s;
      if (Math.random() < 0.2) particle(px, py, { vy: -14, vx: rand(-3, 3), life: 0.4, color: FIRE[Math.random() * 3 | 0], size: 1 });
    });
    if (myth >= 6) {
      light(h.x, h.y - 8, 24, '#9a3010');
      for (let i = 0; i < (Math.random() < 0.5 ? 2 : 1); i++) {
        const side = Math.random() < 0.5 ? -1 : 1;   // plameny hlavně po obrysu postavy, ať zůstane čitelná
        particle(h.x + side * rand(4, 7) * s, h.y - rand(1, 13) * s, { vy: -rand(14, 26), vx: side * rand(0, 4), life: rand(0.35, 0.65), color: FIRE[Math.random() * 4 | 0], size: 1 });
      }
      if (Math.random() < 0.3) particle(h.x + rand(-4, 4) * s, h.y - 15 * s, { vy: -rand(16, 26), life: 0.5, color: FIRE[Math.random() * 3 | 0], size: 1 });
    }
  }
  if (h.barrier > 1 && !h.dead) { const st = heroSt(h), full = st ? st.maxHp * st.barrier : 1; g.strokeStyle = '#9fc8ff'; g.globalAlpha = 0.25 + 0.35 * Math.min(1, h.barrier / full); g.beginPath(); g.ellipse(h.x, h.y - 7, 9, 11, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  if (h.whirl > 0) { g.strokeStyle = '#ffffff'; g.globalAlpha = 0.5; g.beginPath(); g.arc(h.x, h.y - 6, 14, t * 20, t * 20 + 3); g.stroke(); g.globalAlpha = 1; }
  h.buffs.forEach((b, i) => { if (b.color && Math.random() < 0.15) particle(h.x + rand(-6, 6), h.y - rand(0, 14), { vy: -12, life: 0.5, color: b.color, size: 1, glow: true }); });
  if (h.channel > 0) { h.channel -= 1 / 60; g.strokeStyle = '#7dffb0'; g.globalAlpha = 0.6; g.beginPath(); g.arc(h.x, h.y - 6, 10 + Math.sin(t * 20) * 2, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
}

function drawChain(g, x0, y0, x1, y1) {
  g.strokeStyle = '#6a6a72'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = 1; g.fillStyle = '#b0b0b8';
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let i = 1; i < n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n) - 1, Math.round(y0 + (y1 - y0) * i / n) - 1, 2, 2);
}
function drawProjectiles(g) {
  G.heroes.forEach(h => { const hk = h.hooked; if (hk && !hk.m.dead) drawChain(g, hk.m.x, hk.m.y - 14, h.x, h.y - 8); });
  G.projs.forEach(q => {
    if (q.chain && !q.chain.dead) drawChain(g, q.chain.x, q.chain.y - 14, q.x, q.y - 7);
    if (!inView(q.x, q.y)) return;
    const p = { x: q.x, y: q.y - 7, vx: q.vx, vy: q.vy, size: q.size, color: q.color, arrow: q.arrow, friendly: q.friendly };
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1);
    if (p.arrow) {
      g.strokeStyle = p.color; g.lineWidth = 1;
      g.beginPath(); g.moveTo(p.x - p.vx * 7, p.y - p.vy * 7); g.lineTo(p.x, p.y); g.stroke();
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    } else {
      const r = p.size;
      g.fillStyle = p.color; g.globalAlpha = 0.35; g.beginPath(); g.arc(p.x, p.y, r + 2, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, Math.max(1, r - 1), Math.max(1, r - 1));
      if (!p.friendly) light(p.x, p.y, 16, p.color);
    }
  });
}

function drawLighting(g, camX, camY) {
  const town = G.scene === 'town';
  const dark = town ? 0 : G.darkness || 0;
  const amb = town ? 0.3 : THEMES[G.world.theme].ambient + (0.97 - THEMES[G.world.theme].ambient) * dark;
  lg.globalCompositeOperation = 'source-over';
  lg.clearRect(0, 0, G.vw, G.vh);
  lg.fillStyle = `rgba(4,2,10,${amb})`; lg.fillRect(0, 0, G.vw, G.vh);
  lg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => {
    const sx = x - camX, sy = y - camY;
    if (sx < -r || sy < -r || sx > G.vw + r || sy > G.vh + r) return;
    const gr = lg.createRadialGradient(sx, sy, 0, sx, sy, r);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.fillRect(sx - r, sy - r, r * 2, r * 2);
  };
  const h = G.hero;
  hole(h.x, h.y - 6, town ? 160 : 125 * (1 - dark * 0.6), 1);
  G.heroes.forEach(o => { if (o !== h) hole(o.x, o.y - 6, 70 * (1 - dark * 0.6), 0.9); });   // spoluhráči svítí slaběji
  FX.lights.forEach(l => hole(l.x, l.y, l.r, 0.85));
  g.drawImage(lc, 0, 0);
  // barevná záře
  g.globalCompositeOperation = 'lighter';
  FX.lights.forEach(l => {
    if (!l.color) return;
    const sx = l.x - camX, sy = l.y - camY, r = l.r * 0.7;
    if (sx < -r || sy < -r || sx > G.vw + r || sy > G.vh + r) return;
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
    gr.addColorStop(0, hexA(l.color, 0.22)); gr.addColorStop(1, hexA(l.color, 0));
    g.fillStyle = gr; g.fillRect(sx - r, sy - r, r * 2, r * 2);
  });
  g.globalCompositeOperation = 'source-over';
}

function hexA(hex, a) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Text a ukazatele v rozlišení obrazovky (ostré)
function drawOverlay(camX, camY) {
  const S = G.scale, d = G.dpr;
  const sx = x => (x - camX) * S, sy = y => (y - camY) * S;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  // jména NPC
  if (G.scene === 'town') G.world.npcs.forEach(n => {
    const near = dist(n, G.hero) < 40;
    ctx.font = `600 ${11 * d}px system-ui`; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
    const y = n.obj ? (n.id === 'obelisk' ? 10 * TILE - 18 : n.y - 18) : n.y - 20;
    ctx.fillStyle = near ? '#ffe080' : '#e0d8c0';
    ctx.strokeText(n.name, sx(n.x), sy(y)); ctx.fillText(n.name, sx(n.x), sy(y));
  });
  // ukazatele života nepřátel + jména elit
  const hovered = !G.touch ? monsterAt(toWorld(G.input.mx, G.input.my).x, toWorld(G.input.mx, G.input.my).y) : null;
  G.monsters.forEach(m => {
    if (m.dead || m.boss || !inView(m.x, m.y, 0)) return;
    const top = m.y - 16 * m.scale - (m.fly ? 8 : 0) - 4;
    if (m.elite || m.obj || m.hp < m.maxHp || m === hovered) {
      const w = (m.elite || m.obj ? 26 : 16) * S / 3, x = sx(m.x) - w / 2, y = sy(top);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - d, y - d, w + 2 * d, 4 * d + 2 * d);
      ctx.fillStyle = m.obj ? '#e0a030' : m.elite ? '#4a7aff' : '#d03030'; ctx.fillRect(x, y, w * Math.max(0, m.hp / m.maxHp), 4 * d);
    }
    if (m.elite || (m.obj && !m.clone) || m === hovered) {
      ctx.font = `600 ${10 * d}px system-ui`; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
      ctx.fillStyle = m.obj ? '#ffc060' : m.elite ? '#7aa0ff' : '#e0e0e0';
      const nm = m.obj === 'eggsac' ? `${m.name} ${Math.ceil(Math.max(0, m.hatch))} s` : m.name;
      ctx.strokeText(nm, sx(m.x), sy(top) - 4 * d); ctx.fillText(nm, sx(m.x), sy(top) - 4 * d);
    }
  });
  // teleport do města: ukazatel sesílání
  if (G.hero && G.hero.recall) {
    const h = G.hero, p = Math.min(1, h.recall.t / RECALL_TIME), w = 70 * d, x0 = sx(h.x) - w / 2, y0 = sy(h.y - 34);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x0 - 2 * d, y0 - 2 * d, w + 4 * d, 9 * d);
    ctx.fillStyle = '#4a8aff'; ctx.fillRect(x0, y0, w * p, 5 * d);
    ctx.font = `600 ${10 * d}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = '#cfe0ff';
    const tx = `Návrat do města ${(RECALL_TIME - h.recall.t).toFixed(1)} s`;
    ctx.strokeText(tx, sx(h.x), y0 - 4 * d); ctx.fillText(tx, sx(h.x), y0 - 4 * d);
  }
  // oživování padlého spoluhráče
  G.heroes.forEach(o => {
    if (!o.dead || !(o.revT > 0) || !inView(o.x, o.y, 0)) return;
    const p = Math.min(1, o.revT / COOP_REVIVE_T);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 5 * d; ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y - 8), 12 * d, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y - 8), 12 * d, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
  });
  // jména spoluhráčů
  G.heroes.forEach(o => {
    if (o === G.hero || !inView(o.x, o.y, 0)) return;
    ctx.font = `600 ${10 * d}px system-ui`; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = o.dead ? '#a08080' : '#8fe0ff';
    const nm = (o.name || (o.char && o.char.name) || '') + (o.dead ? ' †' : '');
    ctx.strokeText(nm, sx(o.x), sy(o.y - 22)); ctx.fillText(nm, sx(o.x), sy(o.y - 22));
  });
  // jména svatyní
  (G.shrines || []).forEach(s => {
    if (s.used || !inView(s.x, s.y, 0) || dist(s, G.hero) > 70) return;
    ctx.font = `600 ${10 * d}px system-ui`; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = SHRINES[s.type].color;
    ctx.strokeText(SHRINES[s.type].name, sx(s.x), sy(s.y - 26)); ctx.fillText(SHRINES[s.type].name, sx(s.x), sy(s.y - 26));
  });
  // popisky kořisti
  ctx.font = `600 ${10 * d}px system-ui`;
  G.loot.forEach(l => {
    if (l.kind !== 'item' || !inView(l.x, l.y, 0) || (l.owner && l.owner !== G.hero)) return;
    const it = l.item;
    if (it.rarity === 'gray' && Math.hypot(l.x - G.hero.x, l.y - G.hero.y) > 50) return;
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = RARITIES[it.rarity].color;
    ctx.strokeText(it.name, sx(l.x), sy(l.y - 14)); ctx.fillText(it.name, sx(l.x), sy(l.y - 14));
  });
  // létající čísla
  if (G.save.settings.dmgNumbers) FX.texts.forEach(t => {
    const p = t.t / t.dur;
    ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
    ctx.font = `800 ${Math.round(12 * t.size * d)}px system-ui`;
    ctx.lineWidth = 3 * d; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = t.color;
    const y = sy(t.y + t.vy * t.t * (1 - p * 0.4));
    ctx.strokeText(t.text, sx(t.x), y); ctx.fillText(t.text, sx(t.x), y);
  });
  ctx.globalAlpha = 1;
  drawBossOverlay(sx, sy, d);
  // velký nápis (začátek riftu, boss, dokončení)
  if (G.bannerBig) {
    const b = G.bannerBig, a = b.t < 0.3 ? b.t / 0.3 : b.t > 2.4 ? (3 - b.t) / 0.6 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `800 ${30 * d}px Georgia, serif`; ctx.lineWidth = 5 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = b.color || '#e8d8b0';
    ctx.strokeText(b.text, canvas.width / 2, canvas.height * 0.28); ctx.fillText(b.text, canvas.width / 2, canvas.height * 0.28);
    ctx.font = `600 ${14 * d}px system-ui`; ctx.fillStyle = '#c8c0b0';
    ctx.strokeText(b.sub, canvas.width / 2, canvas.height * 0.28 + 24 * d); ctx.fillText(b.sub, canvas.width / 2, canvas.height * 0.28 + 24 * d);
    ctx.globalAlpha = 1;
  }
  // smrt
  if (G.hero.dead) {
    ctx.fillStyle = 'rgba(80,0,0,0.35)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `800 ${32 * d}px Georgia, serif`; ctx.lineWidth = 5 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = '#ff6060';
    ctx.strokeText('Zemřel jsi', canvas.width / 2, canvas.height * 0.4); ctx.fillText('Zemřel jsi', canvas.width / 2, canvas.height * 0.4);
    ctx.font = `600 ${14 * d}px system-ui`; ctx.fillStyle = '#e0c0c0';
    const txt = `Oživení za ${Math.ceil(G.hero.deadT)} s${G.heroes.length > 1 ? ' (spoluhráč tě oživí rychleji)' : ''} · předměty ztratily 10 % odolnosti`;
    ctx.strokeText(txt, canvas.width / 2, canvas.height * 0.4 + 28 * d); ctx.fillText(txt, canvas.width / 2, canvas.height * 0.4 + 28 * d);
  }
}

// ---------- Minimapa ----------

function drawMinimap() {
  const mm = $('minimap');
  if (!mm || !G.world) return;
  const big = G.mapBig;
  const W = G.world, sz = big ? 4 : 2;
  const vw = big ? Math.min(W.w, 90) : 46, vh = big ? Math.min(W.h, 70) : 36;
  if (mm.width !== vw * sz) { mm.width = vw * sz; mm.height = vh * sz; }
  mm.classList.toggle('big', big);
  const g = mm.getContext('2d');
  g.fillStyle = 'rgba(8,6,14,0.85)'; g.fillRect(0, 0, mm.width, mm.height);
  const hx = Math.floor(G.hero.x / TILE), hy = Math.floor(G.hero.y / TILE);
  const x0 = big ? 0 : hx - (vw >> 1), y0 = big ? 0 : hy - (vh >> 1);
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    const tx = x0 + x, ty = y0 + y;
    if (tx < 0 || ty < 0 || tx >= W.w || ty >= W.h) continue;
    if (!W.explored[ty * W.w + tx] && W.kind !== 'town') continue;
    if (isFloor(W, tx, ty)) { g.fillStyle = W.kind === 'town' ? (W.ground[ty * W.w + tx] ? '#6a6050' : '#2e4a24') : '#4a4258'; g.fillRect(x * sz, y * sz, sz, sz); }
    else if (isFloor(W, tx, ty + 1) || isFloor(W, tx, ty - 1)) { g.fillStyle = '#8a8098'; g.fillRect(x * sz, y * sz, sz, sz); }
  }
  const dot = (wx, wy, c, r = sz) => { g.fillStyle = c; g.fillRect((wx / TILE - x0) * sz - r / 2, (wy / TILE - y0) * sz - r / 2, r, r); };
  G.monsters.forEach(m => { if (W.explored[Math.floor(m.y / TILE) * W.w + Math.floor(m.x / TILE)]) dot(m.x, m.y, m.boss ? '#ff3030' : m.elite ? '#5a8aff' : '#c04040', m.boss ? sz * 3 : sz); });
  if (G.portal) dot(G.portal.x, G.portal.y, '#4a8aff', sz * 3);
  (G.shrines || []).forEach(s => { if (!s.used && W.explored[Math.floor(s.y / TILE) * W.w + Math.floor(s.x / TILE)]) dot(s.x, s.y, SHRINES[s.type].color, sz * 2); });
  if (W.kind === 'town') W.npcs.forEach(n => dot(n.x, n.y, '#ffe080', sz * 2));
  G.heroes.forEach(o => { if (o !== G.hero) dot(o.x, o.y, '#5ad0ff', sz * 2); });
  dot(G.hero.x, G.hero.y, '#ffffff', sz * 2);
}

// ---------- Scény ----------

function goTown() {
  if (Net.clientRift) return netGuestLeaveRift();             // host: odchází z podzemí hostitele
  if (netIsHost() && G.scene === 'rift') netEndRiftForGuests();  // hostitel: s ním odchází celá družina
  persist();
  sfx('portal');
  enterTown();
  toast('Vítej zpět ve městě');
}

function townPortal() {
  if (G.scene !== 'rift' || G.hero.dead) return;
  if (G.hero.recall) return cancelRecall('Teleport zrušen');
  startRecall();
}

function interactNpc(n) {
  if (n.id === 'vendor') showVendor();
  else if (n.id === 'smith') showSmith();
  else if (n.id === 'stash') showStash();
  else if (n.id === 'obelisk') showRiftSelect();
  UI.npcWin = n;   // okno patří k tomuto objektu → odchodem se zavře
}

// ---------- Okna objektů ve městě: otevřou se přiblížením, zavřou odchodem ----------
const NPC_OPEN_R = 28, NPC_CLOSE_R = 56;   // px (dlaždice = 16 px): otevře se blíž než ~2 dlaždice, zavře se dál než 3,5 dlaždice
const NPC_KIND = { vendor: 'vendor', smith: 'smith', stash: 'stash', obelisk: 'obelisk' };
// Je otevřené okno objektu (ne jiné okno přes něj, např. postava nebo potvrzení)?
function npcWinShown() { return G.scene === 'town' && !!UI.npcWin && modalOpen() && UI.modalKind === NPC_KIND[UI.npcWin.id]; }
function npcProximity() {
  const h = G.hero;
  if (G.scene !== 'town' || !h || h.dead) return;
  if (npcWinShown() && dist(h, UI.npcWin) > NPC_CLOSE_R) closeMenu();
  G.world.npcs.forEach(n => {
    const near = dist(h, n) < NPC_OPEN_R;
    // otevře se jen při vstupu do blízkosti; po ručním zavření až po odchodu a novém příchodu
    if (near && !n.near && !modalOpen() && (!h.interact || h.interact === n)) { h.interact = null; h.path = null; interactNpc(n); }
    n.near = near;
  });
}

function persist() { if (!G.headless && G.save) writeSave(G.save); }

// ---------- Hlavní smyčka ----------

let lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000);
  lastT = now;
  if ((G.scene === 'rift' || G.scene === 'town') && G.hero) {
    // ve hře více hráčů se nezastavuje ani s otevřeným oknem; ve městě ani s oknem objektu (odchodem se zavře)
    if (!modalOpen() || netLive() || npcWinShown()) update(dt);
    netTick(dt);
    render();
    G.uiT -= dt;
    if (G.uiT <= 0) { G.uiT = 0.08; updateHud(); drawMinimap(); }
  }
  requestAnimationFrame(frame);
}

function init() {
  G.save = loadSave();
  initCanvas();
  initInput();
  bindUi();
  showMenu();
  if (G.save._notice) { const n = G.save._notice; delete G.save._notice; setTimeout(() => toast(n), 500); persist(); }
  requestAnimationFrame(frame);
}

window.addEventListener('load', init);
