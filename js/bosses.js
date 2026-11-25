// Strážci riftu: výběr bosse, společná pravidla souboje a útoky, mechaniky a animace jednotlivých bossů.
//
// Společná pravidla (platí pro všechny bosse):
// - 3 fáze (přechod na 66 % a 33 % života). Přechod nejde přeskočit jedním zásahem, boss při něm zařve a spustí svou mechaniku.
// - Velký útok (sig) s dlouhým varováním. Kdo neuhne, ztratí velkou část života (část poškození je v % max. života).
// - Vyčerpání: po velkém útoku, rozbití štítu nebo přerušení boss chvíli stojí a dostává +50 % poškození.
// - Přerušitelné sesílání: ukazatel nad bossem, přeruší ho omráčení/zmrazení nebo dost poškození.
// - Běsnění: po 120 s boss útočí rychleji a silněji.

// ---------- Pomocné ----------

// Část poškození bosse je v % max. života hrdiny, aby velké útoky byly nebezpečné při každé výbavě.
// Síla roste s úrovní riftu (rift 1 = 56 %, od riftu 8 plná).
const BOSS_PCT = 0.5;
function bossPct(m, p) { return p * BOSS_PCT * Math.min(1, 0.5 + G.rift.level * 0.06) * (m.enraged ? 1.3 : 1); }
function bossAtk(m, mult) { return m.atk * mult * (m.enraged ? 1.5 : 1); }
function toHeroAng(m) { const h = G.hero; return Math.atan2(h.y - m.y, h.x - m.x); }
function bossFace(m) { m.face = Math.cos(toHeroAng(m)) > 0 ? 1 : -1; }

// volné místo v okolí bodu (ve vzdálenosti minD–maxD), kam je vidět
function openSpot(x, y, r, minD, maxD, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(minD, maxD), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (!circleBlocked(G.world, px, py, r) && lineClear(G.world, x, y, px, py, 3)) return { x: px, y: py };
  }
  return nearestFree(G.world, x + rand(-minD, minD), y + rand(-minD, minD), r);
}

function bossHint(text, color) { G.banner = { text, color: color || '#ffb060', t: 0 }; }

// Boss mimo hrací plochu (ve vzduchu, ve stínu): nedá se zasáhnout ani zacílit
function bossHide(m) { if (m.hidden) return; m.hidden = true; G.monsters = G.monsters.filter(x => x !== m); G.offstage.push(m); }
function bossShow(m) { if (!m.hidden) return; m.hidden = false; G.offstage = G.offstage.filter(x => x !== m); if (!m.dead) G.monsters.push(m); }

// ---------- Výběr a zrození ----------

function spawnBoss(forceId) {
  const R = G.rift, h = G.hero, L = R.level;
  R.bossSpawned = true;
  // nikdy stejný boss jako v posledních 3 riftech
  const all = Object.keys(BOSSES), recent = (G.char && G.char.recentBosses) || [];
  let pool = all.filter(k => !recent.includes(k));
  if (!pool.length) pool = all;
  const id = forceId || pick(pool), B = BOSSES[id];
  if (G.char) G.char.recentBosses = [id].concat(recent.filter(k => k !== id)).slice(0, 3);
  // strážce se zrodí kousek od hrdiny, na volném místě, které je vidět
  let pos = null;
  const a0 = Math.random() * Math.PI * 2;
  for (const dd of [80, 64, 48]) {
    for (let i = 0; i < 16 && !pos; i++) {
      const a = a0 + i * Math.PI / 8, x = h.x + Math.cos(a) * dd, y = h.y + Math.sin(a) * dd;
      if (!circleBlocked(G.world, x, y, B.r) && lineClear(G.world, h.x, h.y, x, y, 4)) pos = { x, y };
    }
    if (pos) break;
  }
  if (!pos) pos = nearestFree(G.world, h.x + 30, h.y, B.r);
  // v prvních riftech je boss slabší (rift 1 = 68 % života, od riftu 5 plný)
  const m = {
    kind: 'monster', boss: id, def: B, name: B.name, sprite: B.sprite, pal: B.pal || null, scale: B.scale,
    x: pos.x, y: pos.y, z: 0, r: B.r, maxHp: Math.round(B.hp * riftMult(RIFT.hp, L) * Math.min(1, 0.6 + 0.08 * L) * (G.partyMul || 1)), atk: B.atk * riftMult(RIFT.atk, L),
    spd: B.spd, res: Object.assign({}, B.res), atkElem: B.atkElem, xp: 40, pts: 0, gold: GOLD_BASE * Math.pow(GOLD_GROWTH, riftIlvl(L)),
    dots: {}, slowT: 0, slowPct: 0, stunT: 0, stunImm: 0, cd: 2, spec: 3.2, sigT: 9, wind: 0, aggro: true, face: 1, hitT: 0, bob: 0,
    attackIdx: 0, phase: 1, fightT: 0, animT: 0, shield: 0, exposedT: 0, introT: 1.4, immune: true, sq: 0
  };
  m.hp = m.maxHp;
  bossFace(m);
  G.monsters.push(m);
  sfx('boss');
  R.boss = m; R.bossT = R.time; R.bossName = B.name;
  ringFx(m.x, m.y, 70, '#ff4040', 0.8, 3); ringFx(m.x, m.y, 40, '#ffb060', 0.6, 2);
  beamFx(m.x, m.y, BOSS_LOOK[id].color, 0.9, 26);
  shake(5);
  G.bannerBig = { text: B.name, sub: 'Strážce riftu', t: 0, color: '#ff6060' };
  const AI = BOSS_AI[id];
  if (AI && AI.start) AI.start(m);
}

// ---------- Hlavní smyčka bosse ----------

function updateBoss(m, dt, d) {
  const h = G.hero, B = m.def, AI = BOSS_AI[m.boss] || {};
  m.animT += dt;
  if (m.introT > 0) {   // vynoření
    m.introT -= dt;
    if (Math.random() < 0.6) particle(m.x + rand(-m.r, m.r), m.y, { vy: rand(-60, -20), life: 0.6, color: BOSS_LOOK[m.boss].color, size: 2, glow: true });
    if (m.introT <= 0) { m.immune = false; m.sq = 0.25; shake(4); burst(m.x, m.y, BOSS_LOOK[m.boss].color, 40, 120, { glow: true }); }
    return;
  }
  m.fightT += dt;
  if (!m.enraged && m.fightT > BOSS_ENRAGE) {
    m.enraged = true;
    floatText(m.x, m.y - 50, 'Běsnění!', '#ff3030', 1.6, { dur: 1.6 });
    bossHint(`${m.name} běsní!`, '#ff4040'); sfx('boss'); shake(4);
  }
  if (m.exposedT > 0) m.exposedT -= dt;
  m.sq *= Math.pow(0.02, dt);   // doznění animace zmáčknutí
  if (m.shieldT > 0) {
    m.shieldT -= dt;
    if (m.shieldT <= 0 && m.shield > 0) { m.shield = 0; m.shieldMax = 0; if (AI.shieldFail) AI.shieldFail(m); }
  }
  if (AI.tick) AI.tick(m, dt, d);
  if (m.dead) return;
  // přechod do další fáze (počká, až boss dokončí dopad skoku apod.)
  if (m.phasePending && !(m.act && m.act.lock)) {
    m.phasePending = false; m.act = null;
    if (m.channel) { m.channel = null; }
    if (m.hidden) bossShow(m);
    m.z = 0; m.phase++;
    bossPhaseChange(m);
    return;
  }
  if (m.inter > 0) {   // řev při změně fáze
    m.inter -= dt;
    if (Math.random() < 0.5) particle(m.x + rand(-m.r, m.r), m.y - rand(0, m.r * 2), { vy: -40, life: 0.5, color: '#ff4040', size: 1, glow: true });
    if (m.inter <= 0) { if (!m.holdImmune) m.immune = false; if (AI.phase) AI.phase(m, m.phase); }
    return;
  }
  if (m.holdImmune) { if (AI.held) AI.held(m, dt, d); return; }
  if (m.exposedT > 0 && !m.act) { m.walk = 0; return; }
  const rate = (m.phase === 3 ? 1.3 : m.phase === 2 ? 1.12 : 1) * (m.enraged ? 1.4 : 1);
  const slow = m.slowT > 0 ? m.slowPct * 0.5 : 0;
  const k = dt * rate * (1 - slow);
  m.cd -= k; m.spec -= k; m.sigT -= k;
  if (m.channel) { updateChannel(m, dt); return; }
  if (m.act) { bossAct(m, dt); return; }
  if (m.sigT <= 0 && d < 240) { m.sigT = B.sigCd; bossCast(m, B.sig); return; }
  if (m.spec <= 0) {
    const list = B.phases[m.phase - 1];
    m.spec = rand(2.3, 3.2);
    bossCast(m, list[m.attackIdx++ % list.length]);
    return;
  }
  (AI.move || bossMoveMelee)(m, dt, d, slow);
}

function bossCast(m, atk) {
  bossFace(m); m.lastAtk = atk;
  const f = BOSS_ATTACKS[atk];
  if (f) f(m); else console.warn('Neznámý útok bosse', atk);
}

// Výchozí pohyb: jde k hrdinovi a útočí zblízka (úder s krátkým varováním)
function bossMoveMelee(m, dt, d, slow) {
  const h = G.hero, range = m.r + h.r + 8;
  if (d > range) monsterMoveToward(m, h.x, h.y, m.spd * (1 - slow), dt);
  else { m.walk = 0; bossFace(m); }
  if (d <= range && m.cd <= 0) {
    m.cd = 1.5; m.atkAnim = 0.2;
    hazard({ x: m.x + (h.x - m.x) * 0.6, y: m.y + (h.y - m.y) * 0.6, r: 20, delay: 0.45, dmg: bossAtk(m, 1), pct: bossPct(m, 0.04), elem: m.atkElem, color: '#ff4040', src: m });
  }
}
// Kouzelník: drží odstup a střílí
function bossMoveCaster(m, dt, d, slow, o = {}) {
  const h = G.hero, los = lineOfSight(G.world, m.x, m.y, h.x, h.y), spd = m.spd * (1 - slow);
  if (d > 120 || !los) monsterMoveToward(m, h.x, h.y, spd, dt);
  else if (d < 70) monsterMoveToward(m, m.x - (h.x - m.x), m.y - (h.y - m.y), spd * 0.8, dt);
  else m.walk = 0;
  if (los && d < 180 && m.cd <= 0) {
    m.cd = 1.4; m.atkAnim = 0.2;
    monsterShoot(m, h.x, h.y, { speed: 140, dmg: bossAtk(m, 0.9), pct: bossPct(m, 0.03), elem: m.atkElem, color: o.color || ELEMENTS[m.atkElem].color, size: 3 });
  }
}

// ---------- Fáze, štít, vyčerpání, sesílání ----------

function bossClampHp(m) {
  if (m.phase >= 3) return;
  const thr = m.maxHp * BOSS_PHASES[m.phase - 1];
  if (m.hp < thr) { m.hp = Math.max(m.hp, thr - 1); m.phasePending = true; }
}

function bossPhaseChange(m) {
  m.inter = 1.3; m.immune = true; m.walk = 0; m.exposedT = 0; m.sq = -0.3;
  sfx('boss'); shake(6);
  ringFx(m.x, m.y, 90, '#ff4040', 0.6, 3); ringFx(m.x, m.y, 60, '#ffd060', 0.5, 2);
  burst(m.x, m.y - 10, '#ff4040', 50, 140, { glow: true });
  flashFx(m.x, m.y - 10, 50, '#ff6040', 0.3);
  floatText(m.x, m.y - 50, m.phase === 3 ? 'Poslední fáze!' : 'Zuří!', '#ff4040', 1.5, { dur: 1.5 });
  // z hrdinů se uvolní hák, pavučina apod.
  G.heroes.forEach(h => { h.hooked = null; });
}

function bossExpose(m, t) {
  m.exposedT = Math.max(m.exposedT, t); m.act = null; m.channel = null; m.walk = 0; m.sq = -0.25;
  floatText(m.x, m.y - m.r * 2 - 18, 'Vyčerpaný! +50 %', '#ffe060', 1.2, { dur: 1.4 });
}

function bossShield(m, pct, t) {
  m.shield = m.shieldMax = Math.round(m.maxHp * pct); m.shieldT = t;
  ringFx(m.x, m.y - 10, 40, '#d0d0e0', 0.5, 3);
}
function bossShieldBroken(m) {
  m.shieldT = 0; m.shieldMax = 0;
  sfx('crit'); shake(4);
  burst(m.x, m.y - 12, '#d0d0e0', 40, 130, { glow: true });
  floatText(m.x, m.y - 50, 'Štít rozbit!', '#ffffff', 1.3);
  const AI = BOSS_AI[m.boss];
  if (AI && AI.shieldBroken) AI.shieldBroken(m);
  bossExpose(m, 4);
}

// o: { name, dur, need (podíl max. života k přerušení), color, done(m), tick(m,dt), brk(m) }
function bossChannel(m, o) {
  m.channel = Object.assign({ t: 0, dmg: 0, need: 0.07 }, o);
  m.walk = 0;
  bossHint(`${m.name} sesílá ${o.name} – přeruš, nebo uteč!`, o.color);
}
function updateChannel(m, dt) {
  const c = m.channel;
  c.t += dt;
  // energie se stahuje do bosse
  for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, r = rand(30, 60); particle(m.x + Math.cos(a) * r, m.y - 12 + Math.sin(a) * r * 0.6, { vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 1.2, life: 0.45, color: c.color, size: 1, glow: true, drag: 1 }); }
  light(m.x, m.y - 12, 30 + c.t * 10, c.color);
  if (c.tick) c.tick(m, dt);
  if (c.dmg >= c.need * m.maxHp) { bossInterrupt(m); return; }
  if (c.t >= c.dur) { m.channel = null; c.done(m); }
}
function bossInterrupt(m) {
  const c = m.channel;
  if (!c) return;
  m.channel = null;
  sfx('crit');
  burst(m.x, m.y - 12, '#ffffff', 30, 100, { glow: true });
  floatText(m.x, m.y - 56, 'Přerušeno!', '#ffffff', 1.4, { dur: 1.3 });
  if (c.brk) c.brk(m);
  bossExpose(m, 3);
}

// ---------- Probíhající akce bosse ----------

function bossAct(m, dt) {
  const h = G.hero, A = m.act;
  A.t -= dt;
  switch (A.type) {
    case 'whirl': {
      monsterMoveToward(m, h.x, h.y, A.speed || 48, dt);
      A.tick -= dt;
      arcFx(m.x, m.y - 10, Math.random() * 6, Math.PI * 2, 34, '#e0e0e0', 0.2);
      if (Math.random() < 0.5) dust(m.x + rand(-10, 10), m.y + 4);
      const tick = A.tick <= 0;
      if (tick) A.tick = 0.5;
      eachHero(hh => {   // vír vtahuje a zraňuje všechny hrdiny
        const dd = dist(m, hh);
        if (A.pull && dd < 130 && dd > m.r + 6 && !hh.dash && !hh.leap) {   // vtahování do víru
          const p = A.pull * dt / dd;
          moveEntity(G.world, hh, (m.x - hh.x) * p, (m.y - hh.y) * p);
          if (Math.random() < 0.3) particle(hh.x + rand(-4, 4), hh.y - 4, { vx: (m.x - hh.x) * 0.8, vy: (m.y - hh.y) * 0.8, life: 0.3, color: '#c0c0c0', size: 1 });
        }
        if (tick && dd < 34) hurtHero(bossAtk(m, A.dmg || 0.6), 'phys', m, bossPct(m, A.pct || 0.03));
      }, true);
      if (A.t <= 0 && A.expose) { m.act = null; bossExpose(m, A.expose); return; }
      break;
    }
    case 'charge': {
      if (A.windup > 0) { A.windup -= dt; m.walk = 0; break; }
      const mv = moveEntity(G.world, m, A.vx * 210 * dt, A.vy * 210 * dt);
      dust(m.x, m.y + 6);
      if (A.trail && dist(m, A.lastPool || { x: -99, y: -99 }) > 20) A.lastPool = hazard({ x: m.x, y: m.y, r: 11, delay: 0, dur: 3.5, dps: bossAtk(m, 0.4), pctTick: bossPct(m, 0.015), elem: 'fire', color: '#ff6020', pool: true });
      if (Math.random() < 0.5) vfx({ kind: 'ghost', x: m.x, y: m.y, sprite: m.sprite, scale: m.scale, pal: m.pal, flip: m.face < 0, dur: 0.3, color: A.ghost || '#ff6020' });
      if (!A.hitSet) A.hitSet = new Set();
      eachHero(hh => { if (!A.hitSet.has(hh) && dist(m, hh) < m.r + hh.r + 4) { A.hitSet.add(hh); A.hit = true; hurtHero(bossAtk(m, A.dmg || 1.8), m.atkElem, m, bossPct(m, A.pct || 0.12)); if (!G.remoteCtx) shake(4); } }, true);
      if (!mv) A.t = Math.min(A.t, 0);   // narazil do zdi
      if (A.t <= 0) {
        m.act = null;
        if (!mv) { shake(3); burst(m.x, m.y, '#a09080', 20, 80); }
        if (A.chain > 0) { bossCharge(m, Object.assign({}, A, { chain: A.chain - 1, wind0: 0.55 })); return; }
        if (A.expose) bossExpose(m, A.expose);
        return;
      }
      break;
    }
    case 'leap': {
      const p = 1 - Math.max(0, A.t) / A.dur;
      m.x = A.fx + (A.tx - A.fx) * p; m.y = A.fy + (A.ty - A.fy) * p; m.z = Math.sin(p * Math.PI) * (A.height || 40);
      if (A.t <= 0) {
        m.z = 0; m.act = null; m.sq = 0.35;
        burst(m.x, m.y, A.color || '#a09080', 40, 120); shake(6); ringFx(m.x, m.y, A.r, A.color || '#c8a060', 0.45, 3);
        eachHero(hh => { if (dist(m, hh) < A.r + hh.r) hurtHero(bossAtk(m, A.dmg || 2), A.elem || 'phys', m, bossPct(m, A.pct || 0.15)); }, true);
        G.decals.push({ kind: 'crack', x: m.x, y: m.y, r: A.r * 0.6, t: 0, dur: 6, seed: Math.random() * 10 });
        if (A.land) A.land(m);
        if (A.expose) bossExpose(m, A.expose);
      }
      return;
    }
    case 'fly': {   // vzlétne / vyšplhá, chvíli je mimo dosah, pak dopadne na hrdinu
      if (A.stage === 'up') {
        A.p = Math.min(1, (A.p || 0) + dt / 0.8); m.z = A.p * 110; m.walk = 0;
        if (A.p >= 1) { A.stage = 'hold'; A.ht = A.hold; bossHide(m); if (A.onHold) A.onHold(m); }
      } else if (A.stage === 'hold') {
        A.ht -= dt;
        if (A.holdTick) A.holdTick(m, dt);
        if (A.ht <= 0) {
          const p = nearestFree(G.world, h.x, h.y, m.r);
          A.stage = 'down'; A.tx = p.x; A.ty = p.y; A.dt0 = 1.1; A.dtl = 1.1;
          hazard({ x: p.x, y: p.y, r: A.r, delay: 1.1, dmg: 0, elem: 'phys', color: A.color || '#ff4040', src: m });
        }
      } else {
        A.dtl -= dt;
        m.x = A.tx; m.y = A.ty; m.z = Math.max(0, A.dtl / A.dt0) * 110;
        if (A.dtl <= 0) {
          bossShow(m); m.z = 0; m.act = null; m.sq = 0.4;
          burst(m.x, m.y, A.color || '#a09080', 50, 140, { glow: true }); shake(7); ringFx(m.x, m.y, A.r, A.color || '#c8a060', 0.5, 3);
          eachHero(hh => { if (dist(m, hh) < A.r + hh.r) hurtHero(bossAtk(m, A.dmg || 2), A.elem || 'phys', m, bossPct(m, A.pct || 0.2)); }, true);
          if (A.land) A.land(m);
          if (A.expose) bossExpose(m, A.expose);
        }
      }
      A.t = 1;   // trvání řídí fáze
      return;
    }
    case 'vanish': {   // zmizí ve stínu a objeví se za hrdinou
      if (A.t <= 0) {
        if (!A.out) { A.out = true; bossHide(m); A.t = 0.55; }
        else { m.act = null; bossShow(m); if (A.appear) A.appear(m); }
      }
      return;
    }
    case 'devour': {   // přitahuje služebníky a požírá je
      A.list.forEach(s => { if (s.dead) return; const dd = dist(s, m) || 1; s.x += (m.x - s.x) / dd * Math.min(dd, 120 * dt); s.y += (m.y - s.y) / dd * Math.min(dd, 120 * dt); s.stunT = 0.2; });
      m.sq = Math.sin(m.animT * 20) * 0.1;
      if (A.t <= 0) {
        m.act = null;
        let n = 0;
        A.list.forEach(s => { if (!s.dead) { s.dead = true; n++; burst(s.x, s.y, '#8be07a', 10, 60); } });
        if (n) { const heal = Math.min(m.maxHp * 0.04 * n, m.maxHp - m.hp); m.hp += heal; floatText(m.x, m.y - 50, `Požírá! +${fmt(heal)}`, '#7fe07f', 1.3); m.sq = 0.3; sfx('potion'); bossClampHp(m); }
        else floatText(m.x, m.y - 50, 'Hladoví…', '#a0c080', 1);
      }
      return;
    }
  }
  if (A.t <= 0) m.act = null;
}

function bossCharge(m, o = {}) {
  const a = toHeroAng(m);
  m.face = Math.cos(a) > 0 ? 1 : -1;
  const wind = o.wind0 !== undefined ? o.wind0 : o.windup !== undefined ? o.windup : 0.6;
  m.act = Object.assign({ type: 'charge' }, o, { type: 'charge', t: wind + 0.75, windup: wind, wind0: wind, vx: Math.cos(a), vy: Math.sin(a), hit: false });
  hazardLine(m.x, m.y, a, 160, wind);
}
function bossLeap(m, tx, ty, o = {}) {
  const p = nearestFree(G.world, tx, ty, m.r), dur = o.dur || 1.0;
  hazard({ x: p.x, y: p.y, r: o.r || 42, delay: dur, dmg: 0, elem: 'phys', color: o.color || '#ff4040' });
  m.act = Object.assign({ type: 'leap', t: dur, dur, fx: m.x, fy: m.y, tx: p.x, ty: p.y, r: 42, lock: true }, o, { t: dur, dur, tx: p.x, ty: p.y });
}

// ---------- Objekty bossů (fylakterie, vajíčka, brány) a služebníci ----------

function spawnBossObject(type, x, y, boss, o = {}) {
  const D = BOSS_OBJECTS[type], p = nearestFree(G.world, x, y, D.r);
  const m = {
    kind: 'monster', obj: type, def: D, name: D.name, sprite: D.sprite, pal: D.pal || null, scale: 1,
    x: p.x, y: p.y, r: D.r, maxHp: Math.max(1, Math.round(boss.maxHp * D.hpPct)), atk: boss.atk, spd: 0, res: {}, atkElem: boss.atkElem,
    xp: 0, pts: 0, gold: 0, minion: true, owner: boss, dots: {}, slowT: 0, slowPct: 0, stunT: 0, stunImm: 0, cd: 0, spec: 0, wind: 0,
    aggro: true, face: 1, hitT: 0, bob: Math.random() * 6, t: 0, walk: 0
  };
  Object.assign(m, o);
  m.hp = m.maxHp;
  G.monsters.push(m);
  burst(m.x, m.y, BOSS_LOOK[boss.boss].color, 20, 70, { glow: true });
  return m;
}
function updateBossObject(m, dt) {
  m.t += dt;
  if (m.owner && m.owner.dead) { m.dead = true; burst(m.x, m.y, '#ffffff', 12, 50); return; }
  if (m.tick) m.tick(m, dt);
}

function bossMinion(type, x, y, o = {}) {
  const p = nearestFree(G.world, x, y, 6);
  const s = spawnMonster(type, p.x, p.y, Object.assign({ minion: true }, o));
  s.aggro = true; s.pts = 0; s.xp = 0.3;
  return s;
}

function bossHooked(m) {
  const h = G.hero;
  if (h.dead || h.invuln > 0) return;
  h.hooked = { m, t: 1.5 }; h.path = null; h.recall = null;
  floatText(h.x, h.y - 28, 'Přitažen!', '#ff8080', 1.1);
  sfx('hit');
}

// ---------- Globální efekty souboje (hák, prokletí, tma, otisky na zemi) ----------

function updateBossWorld(dt) {
  // otisky na zemi
  G.decals = G.decals.filter(dc => (dc.t += dt) < dc.dur);
  // tma (Xal'Vor)
  const b = G.rift && G.rift.boss, target = b && !b.dead ? (b.darkTarget || 0) : 0;
  G.darkness += (target - G.darkness) * Math.min(1, dt * 2);
  eachHero(h => updateBossHero(h, dt));
}
// Hák a prokletí jednoho hrdiny (v jeho kontextu)
function updateBossHero(h, dt) {
  if (h.dead) { h.hooked = null; h.curse = null; return; }
  // hák: hrdina je přitahován k bossovi
  if (h.hooked) {
    const m = h.hooked.m, d = dist(m, h);
    h.hooked.t -= dt;
    if (m.dead || h.hooked.t <= 0 || d < m.r + h.r + 6) {
      h.hooked = null;
      if (!m.dead) { hazard({ x: h.x, y: h.y, r: 24, delay: 0.5, dmg: bossAtk(m, 1.4), pct: bossPct(m, 0.12), elem: 'phys', color: '#ff4040', src: m }); m.atkAnim = 0.3; }
    } else {
      const sp = 260 * dt / d;
      moveEntity(G.world, h, (m.x - h.x) * sp, (m.y - h.y) * sp);
      if (Math.random() < 0.4) dust(h.x, h.y + 3);
    }
  }
  // prokletí: když ho hrdina nesmyje ve sloupu světla, vybuchne
  if (h.curse) {
    h.curse.t -= dt;
    if (Math.random() < 0.3) particle(h.x + rand(-5, 5), h.y - rand(4, 16), { vy: -18, life: 0.5, color: '#b050ff', size: 1, glow: true });
    if (h.curse.t <= 0) {
      const m = h.curse.m; h.curse = null;
      hurtHero(m ? bossAtk(m, 1.5) : 10, 'shadow', m, m ? bossPct(m, 0.55) : 0.3);
      burst(h.x, h.y - 6, '#b050ff', 40, 120, { glow: true }); ringFx(h.x, h.y, 40, '#b050ff', 0.4, 3); shake(4);
    }
  }
}

// ---------- Útoky (sdílené i vlastní) ----------

const BOSS_ATTACKS = {
  // ===== Kamenný kolos =====
  slam(m) {
    const a = toHeroAng(m), x = m.x + Math.cos(a) * 18, y = m.y + Math.sin(a) * 18;
    hazard({ x, y, r: 46, delay: 0.9, dmg: bossAtk(m, 1.8), pct: bossPct(m, 0.12), elem: 'phys', color: '#ff4040', src: m,
             onFire: z => { G.decals.push({ kind: 'crack', x: z.x, y: z.y, r: 26, t: 0, dur: 5, seed: Math.random() * 10 }); m.sq = 0.3; } });
    m.act = { type: 'cast', t: 0.9, pose: 'raise' };
  },
  quakeRing(m) {
    for (let i = 0; i < 3; i++) hazard({ wave: true, x: m.x, y: m.y, delay: 0.6 + i * 0.7, speed: 110, maxR: 170, dmg: bossAtk(m, 0.8), pct: bossPct(m, 0.04), elem: 'phys', color: '#c8a060', src: m });
    m.act = { type: 'cast', t: 0.6, pose: 'stomp' }; shake(3); m.sq = 0.3;
  },
  rocks(m) {
    const h = G.hero, n = m.phase === 3 ? 10 : 7;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : rand(14, 75);
      hazard({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, r: 17, delay: 1.0 + i * 0.13, dmg: bossAtk(m, 1.2), pct: bossPct(m, 0.07), elem: 'phys', color: '#c8a060', rock: '#8a8478', src: m }); }
    m.act = { type: 'cast', t: 0.5, pose: 'raise' };
  },
  fissure(m) {   // praskliny: řady výbuchů ze země směrem k hrdinovi
    const a0 = toHeroAng(m), lines = m.phase === 3 ? 5 : 3;
    for (let l = 0; l < lines; l++) {
      const a = a0 + (l - (lines - 1) / 2) * 0.45;
      for (let i = 1; i <= 9; i++) hazard({ x: m.x + Math.cos(a) * i * 15, y: m.y + Math.sin(a) * i * 15, r: 11, delay: 0.75 + i * 0.07, dmg: bossAtk(m, 0.9), pct: bossPct(m, 0.05), elem: 'phys', color: '#ff8030', spike: '#c8a060', src: m, quiet: i % 2 === 0 });
    }
    m.act = { type: 'cast', t: 0.75, pose: 'stomp' }; m.sq = 0.3;
  },
  earthquake(m) {   // velký útok: vyskočí a dopadne, kolem sebe drtí všechno
    hazard({ x: m.x, y: m.y, r: 80, delay: 1.8, dmg: bossAtk(m, 2.6), pct: bossPct(m, 0.5), elem: 'phys', color: '#ff3020', src: m,
             onFire: z => { G.decals.push({ kind: 'crack', x: z.x, y: z.y, r: 70, t: 0, dur: 7, seed: Math.random() * 10 }); m.sq = 0.45; shake(9); bossExpose(m, 3);
               for (let i = 0; i < 3; i++) hazard({ wave: true, x: z.x, y: z.y, delay: 0.1 + i * 0.25, speed: 140, maxR: 120, dmg: 0, elem: 'phys', color: '#c8a060' }); } });
    m.act = { type: 'cast', t: 1.75, pose: 'jump' };
    bossHint('Zemětřesení – utíkej od kolosu!', '#ff8040');
  },

  // ===== Lich =====
  boltFan(m) {
    const a0 = toHeroAng(m), n = m.phase >= 2 ? 9 : 7;
    for (let i = 0; i < n; i++) { const a = a0 - 0.1 * (n - 1) + i * 0.2; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 120, dmg: bossAtk(m, 0.7), pct: bossPct(m, 0.035), elem: 'shadow', color: '#c77dff', size: 3 }); }
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  frostNova(m) {
    if (dist(m, G.hero) > 110) { BOSS_ATTACKS.boltFan(m); return; }
    hazard({ x: m.x, y: m.y, r: 72, delay: 1.1, dmg: bossAtk(m, 1.2), pct: bossPct(m, 0.1), elem: 'frost', color: '#8fd8ff', freeze: 1.0, src: m });
    m.act = { type: 'cast', t: 1.1, pose: 'cast' };
  },
  summonSkel(m) {
    if (m.boss === 'bonelord') return BOSS_AI.bonelord.raiseGuard(m, m.phase >= 3 ? 3 : 2);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const s = bossMinion('skeleton', m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 30); burst(s.x, s.y, '#c77dff', 14, 50); }
    m.act = { type: 'cast', t: 0.6, pose: 'cast' };
  },
  teleport(m) {
    const h = G.hero;
    if (dist(m, h) > 70) { BOSS_ATTACKS.boltFan(m); return; }
    vfx({ kind: 'ghost', x: m.x, y: m.y, sprite: m.sprite, scale: m.scale, pal: m.pal, flip: m.face < 0, dur: 0.6, color: BOSS_LOOK[m.boss].color });
    burst(m.x, m.y - 10, BOSS_LOOK[m.boss].color, 30, 80, { glow: true });
    const p = openSpot(h.x, h.y, m.r, 90, 120);
    if (lineOfSight(G.world, h.x, h.y, p.x, p.y)) { m.x = p.x; m.y = p.y; }
    burst(m.x, m.y - 10, BOSS_LOOK[m.boss].color, 30, 80, { glow: true });
    sfx('blink');
  },
  soulOrbs(m) {   // pomalé duše, které tě pronásledují
    const a0 = toHeroAng(m);
    for (let i = 0; i < 3; i++) { const a = a0 - 0.8 + i * 0.8;
      monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 58, seek: 2.0, range: 320, dmg: bossAtk(m, 1.0), pct: bossPct(m, 0.1), elem: 'shadow', color: '#7ff0ff', size: 4, burst: true, orbFx: true }); }
    m.act = { type: 'cast', t: 0.6, pose: 'cast' };
  },
  soulStorm(m) {   // velký útok: přerušitelné sesílání
    bossChannel(m, { name: 'Bouři duší', dur: 3.5, need: 0.05, color: '#7ff0ff', r: 115,
      done: b => {
        hazard({ x: b.x, y: b.y, r: 115, delay: 0.05, dmg: bossAtk(b, 1.4), pct: bossPct(b, 0.5), elem: 'shadow', color: '#7ff0ff', src: b });
        flashFx(b.x, b.y, 115, '#7ff0ff', 0.4); shake(7);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; bossMinion('skeleton', b.x + Math.cos(a) * 34, b.y + Math.sin(a) * 34); }
      } });
  },

  // ===== Pekelný démon =====
  breath(m) {
    hazard({ cone: true, x: m.x, y: m.y, ang: toHeroAng(m), arc: 1.1, len: 105, delay: 0.9, dmg: bossAtk(m, 2), pct: bossPct(m, 0.15), elem: 'fire', color: '#ff6020', pools: true, src: m });
    m.act = { type: 'cast', t: 1.0, pose: 'breath' };
  },
  meteors(m) {
    const h = G.hero, n = m.phase === 3 ? 9 : 6;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : rand(16, 85);
      hazard({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, r: 24, delay: 1.3 + i * 0.18, dmg: bossAtk(m, 1.5), pct: bossPct(m, 0.08), elem: 'fire', color: '#ff6020', dur: 2.5, dps: bossAtk(m, 0.3), pool: true, rock: '#ff8030', src: m,
                onFire: z => G.decals.push({ kind: 'scorch', x: z.x, y: z.y, r: 16, t: 0, dur: 6 }) }); }
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  charge(m) { bossCharge(m, { dmg: 1.8, pct: 0.12 }); },
  tripleCharge(m) {   // velký útok: tři výpady za sebou, za sebou nechává oheň
    bossCharge(m, { dmg: 1.6, pct: 0.2, chain: 2, trail: true, windup: 0.75, expose: 3 });
    bossHint('Trojitý výpad – uhni do strany!', '#ff8040');
  },
  firePulse(m) {   // ohnivý puls kolem démona – trestá stání u něj
    hazard({ x: m.x, y: m.y, r: 62, delay: 0.95, dmg: bossAtk(m, 1.4), pct: bossPct(m, 0.12), elem: 'fire', color: '#ff6020', src: m,
             onFire: z => { G.decals.push({ kind: 'scorch', x: z.x, y: z.y, r: 40, t: 0, dur: 5 }); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; particle(z.x, z.y - 4, { vx: Math.cos(a) * 160, vy: Math.sin(a) * 110, life: 0.4, color: pick(['#ff6020', '#ffd060']), size: 2, glow: true, drag: 0.9 }); } } });
    m.act = { type: 'cast', t: 0.95, pose: 'flare' };
  },
  ringOfFire(m) {   // ohnivý kruh kolem hrdiny s jednou mezerou, pak meteor doprostřed
    const h = G.hero, n = 14, gap = rnd(n), cx = h.x, cy = h.y;
    for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n || i === (gap + 2) % n) continue;
      const a = i / n * Math.PI * 2;
      hazard({ x: cx + Math.cos(a) * 48, y: cy + Math.sin(a) * 48, r: 12, delay: 1.0, dmg: bossAtk(m, 1.0), pct: bossPct(m, 0.06), elem: 'fire', color: '#ff6020', dur: 4, dps: bossAtk(m, 0.8), pctTick: bossPct(m, 0.03), pool: true, src: m, quiet: i % 2 }); }
    hazard({ x: cx, y: cy, r: 30, delay: 2.1, dmg: bossAtk(m, 2.0), pct: bossPct(m, 0.24), elem: 'fire', color: '#ff3010', rock: '#ff8030', src: m, onFire: z => G.decals.push({ kind: 'scorch', x: z.x, y: z.y, r: 24, t: 0, dur: 6 }) });
    m.act = { type: 'cast', t: 0.7, pose: 'cast' };
  },

  // ===== Pavoučí královna =====
  spit(m) {
    const a0 = toHeroAng(m), n = m.phase === 3 ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = a0 - 0.15 * (n - 1) + i * 0.3; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 130, dmg: bossAtk(m, 0.8), pct: bossPct(m, 0.04), elem: 'nature', color: '#8be07a', size: 3, pool: true }); }
    m.act = { type: 'cast', t: 0.4, pose: 'cast' };
  },
  web(m) {
    const h = G.hero;
    hazard({ x: h.x, y: h.y, r: 40, delay: 0.9, dmg: bossAtk(m, 0.5), pct: bossPct(m, 0.03), elem: 'nature', color: '#e0e0e0', slow: 0.7, slowT: 3, src: m,
             onFire: z => G.decals.push({ kind: 'web', x: z.x, y: z.y, r: 36, t: 0, dur: 4 }) });
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  brood(m) {
    for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; bossMinion('spider', m.x + Math.cos(a) * 24, m.y + Math.sin(a) * 24, { scale: 0.7, hpMul: 0.5 }); }
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  eggs(m) { BOSS_AI.queen.layEggs(m, m.phase === 3 ? 3 : 2); m.act = { type: 'cast', t: 0.6, pose: 'cast' }; },
  ascend(m) {   // velký útok: vyšplhá do stropu, prší jed, pak dopadne na hrdinu
    const h = G.hero;
    m.act = { type: 'fly', stage: 'up', hold: 4.2, r: 40, dmg: 1.8, pct: 0.3, elem: 'nature', color: '#8be07a', thread: true, lock: true, expose: 2.5,
      onHold: b => { BOSS_AI.queen.layEggs(b, 2); bossHint('Jedový déšť – hýbej se a znič vajíčka!', '#8be07a'); },
      holdTick: (b, dt) => { b.rainT = (b.rainT || 0) - dt; if (b.rainT <= 0) { b.rainT = 0.3; const a = Math.random() * Math.PI * 2, r = rand(0, 70);
        hazard({ x: G.hero.x + Math.cos(a) * r, y: G.hero.y + Math.sin(a) * r, r: 15, delay: 0.9, dmg: bossAtk(b, 0.8), pct: bossPct(b, 0.07), elem: 'nature', color: '#8be07a', rock: '#6ad04a', dur: 2, dps: bossAtk(b, 0.25), pool: true, src: b, quiet: true }); } } };
  },

  // ===== Kostěný král =====
  whirlwind(m) { m.act = { type: 'whirl', t: 3, tick: 0.3, pull: 14, speed: 34 }; },
  royalWhirl(m) {
    m.act = { type: 'whirl', t: 4, tick: 0.3, pull: 24, speed: 30, dmg: 0.75, pct: 0.05, expose: 3 };
    bossHint('Královský vír tě vtahuje – utíkej!', '#e0e0e0');
  },
  leapSlam(m) { const h = G.hero; bossLeap(m, h.x, h.y, { r: 40, dmg: 2, pct: 0.15, dur: 1.2 }); },
  boneSpear(m) {   // řada kostěných bodců ze země
    const a0 = toHeroAng(m), lines = m.phase === 3 ? 3 : 1;
    for (let l = 0; l < lines; l++) {
      const a = a0 + (l - (lines - 1) / 2) * 0.5;
      for (let i = 1; i <= 10; i++) hazard({ x: m.x + Math.cos(a) * i * 14, y: m.y + Math.sin(a) * i * 14, r: 11, delay: 0.7 + i * 0.06, dmg: bossAtk(m, 1.2), pct: bossPct(m, 0.07), elem: 'phys', color: '#f0ead8', spike: '#f0ead8', src: m, quiet: true });
    }
    m.act = { type: 'cast', t: 0.7, pose: 'stomp' };
  },

  // ===== Ledová vědma Ysolda =====
  iceShards(m) {
    const a0 = toHeroAng(m), n = m.phase === 3 ? 7 : 5;
    for (let i = 0; i < n; i++) { const a = a0 - 0.14 * (n - 1) + i * 0.28; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 150, dmg: bossAtk(m, 0.7), pct: bossPct(m, 0.035), elem: 'frost', color: '#bfefff', size: 2, slow: 0.4 }); }
    m.act = { type: 'cast', t: 0.45, pose: 'cast' };
  },
  icicles(m) {   // rampouchy ve dvou vlnách: kříž, pak úhlopříčky
    const h = G.hero, cx = h.x, cy = h.y, s = 28;
    const w1 = [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]], w2 = [[s, s], [-s, s], [s, -s], [-s, -s], [2 * s, 0], [-2 * s, 0]];
    w1.forEach(([ox, oy]) => hazard({ x: cx + ox, y: cy + oy, r: 14, delay: 1.0, dmg: bossAtk(m, 1.3), pct: bossPct(m, 0.1), elem: 'frost', color: '#8fd8ff', rock: '#dff8ff', icicle: true, src: m }));
    w2.forEach(([ox, oy]) => hazard({ x: cx + ox, y: cy + oy, r: 14, delay: 1.7, dmg: bossAtk(m, 1.3), pct: bossPct(m, 0.1), elem: 'frost', color: '#8fd8ff', rock: '#dff8ff', icicle: true, src: m }));
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  blizzard(m) {   // vánice, která tě pronásleduje
    const h = G.hero, p = openSpot(h.x, h.y, 4, 40, 60);
    hazard({ x: p.x, y: p.y, r: 26, delay: 0.6, dur: 6, dps: bossAtk(m, 0.7), pctTick: bossPct(m, 0.03), elem: 'frost', color: '#bfe8ff', slow: 0.35, follow: 24, pool: true, snow: true, src: m });
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  absoluteZero(m) {   // velký útok: mráz zasáhne všechno kromě teplého kruhu
    const h = G.hero, p = openSpot(h.x, h.y, 10, 70, 100);
    hazard({ safe: true, x: p.x, y: p.y, r: 24, delay: 3.0, dmg: bossAtk(m, 1.5), pct: bossPct(m, 0.6), elem: 'frost', freeze: 1.5, color: '#ffc060', src: m,
             onFire: () => { flashFx(G.hero.x, G.hero.y, 200, '#bfefff', 0.5); shake(6); bossExpose(m, 2.5); } });
    m.act = { type: 'cast', t: 3.0, pose: 'cast', frost: true };
    bossHint('Absolutní nula – běž do teplého kruhu!', '#ffc060');
  },

  // ===== Hnilobný Gorgul =====
  hook(m) {
    const h = G.hero;
    monsterShoot(m, h.x, h.y, { speed: 175, range: 175, dmg: bossAtk(m, 0.6), pct: bossPct(m, 0.03), elem: 'phys', color: '#a0a0a8', size: 2, hook: m, chain: m });
    m.act = { type: 'cast', t: 0.9, pose: 'throw' }; m.walk = 0;
  },
  vomit(m) {
    hazard({ cone: true, x: m.x, y: m.y, ang: toHeroAng(m), arc: 0.9, len: 90, delay: 0.85, dmg: bossAtk(m, 1.6), pct: bossPct(m, 0.12), elem: 'nature', color: '#8be07a', color2: '#b0d050', color3: '#5a8a2a', pools: true, src: m });
    m.act = { type: 'cast', t: 0.95, pose: 'breath' };
  },
  bloaters(m) {
    for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; const s = bossMinion('bloater', m.x + Math.cos(a) * 26, m.y + Math.sin(a) * 26, { atkMul: 0.6 }); burst(s.x, s.y, '#8be07a', 10, 50); }
    m.act = { type: 'cast', t: 0.6, pose: 'cast' }; m.sq = -0.2;
  },
  devour(m) {
    const list = G.monsters.filter(s => !s.dead && s.minion && !s.obj && dist(s, m) < 110);
    if (!list.length) { BOSS_ATTACKS.vomit(m); return; }
    m.act = { type: 'devour', t: 1.0, list, lock: true };
    bossHint('Gorgul požírá své služebníky – zabij je dřív!', '#8be07a');
  },
  bellyFlop(m) {
    const h = G.hero;
    bossLeap(m, h.x, h.y, { r: 50, dmg: 2.2, pct: 0.45, elem: 'nature', color: '#8be07a', dur: 1.25, height: 60, expose: 3,
      land: b => hazard({ x: b.x, y: b.y, r: 30, delay: 0, dur: 4, dps: bossAtk(b, 0.5), pctTick: bossPct(b, 0.02), elem: 'nature', color: '#7ab03a', pool: true }) });
    bossHint('Gorgul skáče – uhni!', '#8be07a');
  },

  // ===== Xal'Vor, Pán stínů =====
  shadowOrbs(m) {
    const a0 = toHeroAng(m);
    for (let i = 0; i < 3; i++) { const a = a0 + Math.PI + (i - 1) * 0.9;   // vyletí dozadu a stočí se k hrdinovi
      monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 62, seek: 2.4, range: 340, dmg: bossAtk(m, 1.0), pct: bossPct(m, 0.1), elem: 'shadow', color: '#c060ff', size: 4, burst: true, orbFx: true }); }
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  shadowStep(m) {   // zmizí a udeří zezadu
    vfx({ kind: 'ghost', x: m.x, y: m.y, sprite: m.sprite, scale: m.scale, pal: m.pal, flip: m.face < 0, dur: 0.5, color: '#c060ff' });
    burst(m.x, m.y - 10, '#5a2a8a', 30, 70);
    m.act = { type: 'vanish', t: 0.35, lock: true, appear: b => {
      const h = G.hero, back = -(h.face || 1), p = nearestFree(G.world, h.x + back * 26, h.y + rand(-6, 6), b.r);
      b.x = p.x; b.y = p.y; bossFace(b);
      burst(b.x, b.y - 10, '#c060ff', 30, 90, { glow: true }); sfx('blink');
      hazard({ x: h.x, y: h.y, r: 24, delay: 0.6, dmg: bossAtk(b, 1.6), pct: bossPct(b, 0.14), elem: 'shadow', color: '#c060ff', src: b });
      b.act = { type: 'cast', t: 0.6, pose: 'cast' };
    } };
  },
  voidZones(m) {
    const h = G.hero;
    for (let i = 0; i < 3; i++) { const p = i === 0 ? { x: h.x, y: h.y } : openSpot(h.x, h.y, 4, 24, 55);
      hazard({ x: p.x, y: p.y, r: 22, delay: 0.9, dmg: bossAtk(m, 0.8), pct: bossPct(m, 0.05), elem: 'shadow', color: '#7a30c0', dur: 6, dps: bossAtk(m, 0.8), pctTick: bossPct(m, 0.035), pool: true, voidz: true, src: m, quiet: true }); }
    m.act = { type: 'cast', t: 0.5, pose: 'cast' };
  },
  curse(m) {
    const h = G.hero;
    if (h.curse) { BOSS_ATTACKS.shadowOrbs(m); return; }
    h.curse = { t: 7, clean: 0, m };
    for (let i = 0; i < 2; i++) { const p = openSpot(h.x, h.y, 8, 60, 100); hazard({ pillar: true, x: p.x, y: p.y, r: 14, delay: 0, dur: 7.5 }); }
    floatText(h.x, h.y - 30, 'Prokletí!', '#b050ff', 1.3);
    bossHint('Prokletí – smyj ho ve sloupu světla!', '#fff0b0');
    m.act = { type: 'cast', t: 0.6, pose: 'cast' };
  },
  eclipse(m) {   // velký útok: zatmění, přerušitelné
    m.darkTarget = 0.9;
    bossChannel(m, { name: 'Zatmění', dur: 3.5, need: 0.05, color: '#c060ff', r: 115,
      done: b => {
        b.darkTarget = 0.55;
        hazard({ x: b.x, y: b.y, r: 115, delay: 0.05, dmg: bossAtk(b, 1.5), pct: bossPct(b, 0.5), elem: 'shadow', color: '#c060ff', src: b });
        flashFx(b.x, b.y, 115, '#5a2a8a', 0.5); shake(7);
        BOSS_ATTACKS.voidZones(b);
      },
      brk: b => { b.darkTarget = 0.55; } });
  }
};

// ---------- Mechaniky jednotlivých bossů ----------

const BOSS_AI = {
  colossus: {
    tick(m, dt) {   // těžké kroky
      if (m.walk > 0 && Math.floor(m.animT * 2.2) !== m.stepK) { m.stepK = Math.floor(m.animT * 2.2); dust(m.x - 6, m.y + 4); dust(m.x + 6, m.y + 4); if (dist(m, G.hero) < 120) shake(0.8); }
    },
    phase(m) {   // kamenný štít: když ho nerozbiješ do 8 s, spustí lavinu
      bossShield(m, 0.12, 8);
      bossHint('Kamenný štít – rozbij ho do 8 s, jinak přijde lavina!', '#d0d0e0');
    },
    shieldFail(m) {
      floatText(m.x, m.y - 50, 'Lavina!', '#ff6040', 1.5);
      hazard({ x: m.x, y: m.y, r: 130, delay: 1.3, dmg: bossAtk(m, 2.4), pct: bossPct(m, 0.55), elem: 'phys', color: '#ff3020', src: m, onFire: z => { shake(9); G.decals.push({ kind: 'crack', x: z.x, y: z.y, r: 90, t: 0, dur: 7, seed: 3 }); } });
      BOSS_ATTACKS.rocks(m);
      m.act = { type: 'cast', t: 1.3, pose: 'raise' };
    }
  },
  lich: {
    move(m, dt, d, slow) { bossMoveCaster(m, dt, d, slow, { color: '#c77dff' }); },
    phase(m) {   // fylakterie: nezranitelný, dokud nezničíš krystaly
      m.holdImmune = true; m.immune = true; m.crystals = [];
      for (let i = 0; i < 3; i++) {   // krystaly vždy na dohled od liche
        let p = openSpot(m.x, m.y, 8, 55, 85);
        for (let k = 0; k < 8 && m.crystals.some(c => dist(c, p) < 40); k++) p = openSpot(m.x, m.y, 8, 55, 85);
        m.crystals.push(spawnBossObject('phylactery', p.x, p.y, m));
      }
      m.heldT = 1.5;
      bossHint('Lich je nezranitelný – znič fylakterie!', '#7ff0ff');
    },
    held(m, dt, d) {
      m.walk = 0;
      m.crystals = m.crystals.filter(c => !c.dead);
      if (!m.crystals.length) {
        m.holdImmune = false; m.immune = false;
        floatText(m.x, m.y - 50, 'Ochrana padla!', '#7ff0ff', 1.3); burst(m.x, m.y - 12, '#7ff0ff', 40, 120, { glow: true }); sfx('crit');
        bossExpose(m, 4);
        return;
      }
      m.crystals.forEach(c => { if (Math.random() < 0.3) particle(c.x + (m.x - c.x) * Math.random(), c.y - 8 + (m.y - 14 - c.y + 8) * Math.random(), { life: 0.3, color: '#7ff0ff', size: 1, glow: true }); });
      m.heldT -= dt;
      if (m.heldT <= 0) { m.heldT = 2.6; bossFace(m); if (Math.random() < 0.5) BOSS_ATTACKS.boltFan(m); else BOSS_ATTACKS.soulOrbs(m); m.act = null; }
    }
  },
  demon: {
    phase(m) {   // vzlétne, dopadne na hrdinu a otevře pekelné brány
      m.act = { type: 'fly', stage: 'up', hold: 0.9, r: 50, dmg: 2.0, pct: 0.2, elem: 'fire', color: '#ff6020', lock: true,
        land: b => {
          G.decals.push({ kind: 'scorch', x: b.x, y: b.y, r: 40, t: 0, dur: 8 });
          for (let i = 0; i < 2; i++) { const p = openSpot(b.x, b.y, 10, 60, 100);
            spawnBossObject('hellgate', p.x, p.y, b, { spawnT: 2.5, tick: (g, dt) => {
              light(g.x, g.y - 8, 34, '#ff6020');
              if (Math.random() < dt * 8) particle(g.x + rand(-4, 4), g.y - rand(2, 12), { vy: -30, life: 0.5, color: pick(['#ff6020', '#ffd040']), size: 1, glow: true });
              g.spawnT -= dt;
              if (g.spawnT <= 0) { g.spawnT = 6; if (G.monsters.filter(s => s.type === 'imp' && s.minion).length < 6) { const s = bossMinion('imp', g.x, g.y + 10); burst(s.x, s.y, '#ff6020', 12, 60, { glow: true }); } }
            } }); }
          bossHint('Pekelné brány chrlí skřety – zavři je!', '#ff8040');
        } };
    }
  },
  queen: {
    layEggs(m, n) {
      for (let i = 0; i < n; i++) { const p = openSpot(m.x, m.y, 8, 30, 80);
        spawnBossObject('eggsac', p.x, p.y, m, { hatch: 7, tick: (e, dt) => {
          e.hatch -= dt;
          if (e.hatch < 2 && Math.random() < dt * 6) particle(e.x + rand(-4, 4), e.y - rand(4, 12), { vy: -10, life: 0.4, color: '#8be07a', size: 1, glow: true });
          if (e.hatch <= 0) {
            e.dead = true; burst(e.x, e.y - 6, '#e8e0c8', 20, 70); sfx('die');
            for (let k = 0; k < 3; k++) bossMinion('spider', e.x + rand(-6, 6), e.y + rand(-6, 6), { scale: 0.7, hpMul: 0.5 });
          }
        } }); }
    },
    phase(m) { BOSS_ATTACKS.ascend(m); }
  },
  bonelord: {
    tick(m) {   // kostlivci z jeho gardy mu dávají ochranu
      m.guards = (m.guards || []).filter(s => !s.dead);
      m.dr = Math.min(0.6, m.guards.length * 0.15);
    },
    raiseGuard(m, n) {
      m.guards = m.guards || [];
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2;
        const s = bossMinion('skeleton', m.x + Math.cos(a) * 34, m.y + Math.sin(a) * 34, { hpMul: 1.6 });
        s.tint = '#c8a030'; s.name = 'Královská garda'; m.guards.push(s);
        beamFx(s.x, s.y, '#c8a030', 0.5, 8); }
      if (!m.guardHint) { m.guardHint = true; bossHint('Garda chrání krále (−15 % poškození za každého) – zabij ji!', '#e0c060'); }
      m.act = { type: 'cast', t: 0.7, pose: 'raise' };
    },
    phase(m) { BOSS_AI.bonelord.raiseGuard(m, 4); }
  },
  frostwitch: {
    move(m, dt, d, slow) { bossMoveCaster(m, dt, d, slow, { color: '#bfefff' }); },
    phase(m) {   // ledové přeludy: jen jedna Ysolda je skutečná
      const h = G.hero, spots = [];
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.random() * 0.5; spots.push(nearestFree(G.world, h.x + Math.cos(a) * 85, h.y + Math.sin(a) * 85, m.r)); }
      const real = rnd(4);
      vfx({ kind: 'ghost', x: m.x, y: m.y, sprite: m.sprite, scale: m.scale, pal: m.pal, flip: m.face < 0, dur: 0.6, color: '#bfefff' });
      m.x = spots[real].x; m.y = spots[real].y;
      spots.forEach((p, i) => {
        burst(p.x, p.y - 12, '#bfefff', 24, 80, { glow: true });
        if (i === real) return;
        const c = spawnBossObject('phylactery', p.x, p.y, m, {
          name: 'Ledový přelud', sprite: 'icequeen', pal: null, scale: m.scale, r: m.r, clone: true, maxHp: Math.round(m.maxHp * 0.02), castT: 1 + i * 0.6,
          tick: (cl, dt) => {
            cl.face = G.hero.x > cl.x ? 1 : -1;
            cl.castT -= dt;
            if (cl.castT <= 0 && cl.t < 20) { cl.castT = 3.2; const a0 = Math.atan2(G.hero.y - cl.y, G.hero.x - cl.x);
              for (let k = 0; k < 3; k++) { const a = a0 - 0.25 + k * 0.25; monsterShoot(cl, cl.x + Math.cos(a) * 100, cl.y + Math.sin(a) * 100, { speed: 140, dmg: bossAtk(m, 0.6), pct: bossPct(m, 0.03), elem: 'frost', color: '#bfefff', size: 2, slow: 0.3 }); } }
            if (cl.t > 20) { cl.dead = true; burst(cl.x, cl.y - 12, '#bfefff', 20, 70); }
          },
          onDeath: cl => { hazard({ x: cl.x, y: cl.y, r: 30, delay: 0.5, dmg: bossAtk(m, 0.8), pct: bossPct(m, 0.06), elem: 'frost', color: '#8fd8ff', freeze: 0.8, src: m }); burst(cl.x, cl.y - 12, '#dff8ff', 30, 100, { glow: true }); }
        });
        c.hp = c.maxHp;
      });
      bossHint('Ledové přeludy – najdi skutečnou Ysoldu!', '#bfefff');
    }
  },
  gorgul: {
    tick(m, dt) {   // mouchy a kapky
      if (Math.random() < dt * 4) particle(m.x + rand(-m.r, m.r), m.y - rand(4, m.r * 2), { vy: 25, life: 0.5, color: '#9ac040', size: 1, grav: 0 });
    },
    phase(m) {   // břicho praskne
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 100, range: 110, dmg: bossAtk(m, 0.9), pct: bossPct(m, 0.06), elem: 'nature', color: '#8be07a', size: 3, pool: true }); }
      for (let i = 0; i < 2; i++) bossMinion('slime', m.x + rand(-20, 20), m.y + rand(-20, 20));
      burst(m.x, m.y - 14, '#8be07a', 50, 140); shake(5); m.sq = 0.4;
    }
  },
  shade: {
    start(m) { m.darkTarget = 0.55; },
    move(m, dt, d, slow) {
      const h = G.hero;
      if (m.walk > 0 && Math.random() < dt * 8) vfx({ kind: 'ghost', x: m.x, y: m.y, sprite: m.sprite, scale: m.scale, pal: m.pal, flip: m.face < 0, dur: 0.4, color: '#5a2a8a' });
      bossMoveMelee(m, dt, d, slow);
    },
    phase(m) {
      BOSS_ATTACKS.curse(m); G.hero.curse && (G.hero.curse.t = 8);
      BOSS_ATTACKS.voidZones(m);
      BOSS_ATTACKS.teleport(m);
      m.act = null;
    }
  }
};

// ---------- Vzhled a animace ----------

const BOSS_LOOK = {
  colossus:   { color: '#ff8a30' },
  lich:       { color: '#7ff0ff' },
  demon:      { color: '#ff6020' },
  queen:      { color: '#ff4040' },
  bonelord:   { color: '#ffd060' },
  frostwitch: { color: '#bfefff' },
  gorgul:     { color: '#9ac040' },
  shade:      { color: '#c060ff' }
};

const BOSS_CV = {};
function bossPose(m) { return m.act && m.act.pose ? m.act.pose : m.channel ? 'cast' : null; }

function drawBoss(g, m) {
  const t = G.time, s = m.scale, size = 16 * s, L = BOSS_LOOK[m.boss], pose = bossPose(m);
  const fl = m.def.float ? 5 + Math.sin(t * 2.5) * 2 : 0;
  let ox = 0, oy = 0, sx = 1 + m.sq, sy = 1 - m.sq, alpha = 1;
  const walking = m.walk > 0;
  if (walking && !m.def.float) oy -= Math.floor(t * 6 + m.bob) % 2;
  if (m.atkAnim > 0) { ox += m.face * 3; m.atkAnim -= 1 / 60; }
  if (pose === 'raise') { sy += 0.08; sx -= 0.04; ox += Math.sin(t * 40) * 0.8; }
  if (pose === 'jump') { const p = 1 - Math.max(0, m.act.t) / 1.75; oy -= Math.sin(Math.min(1, p * 1.3) * Math.PI) * 18; ox += Math.sin(t * 50) * (p > 0.7 ? 1.2 : 0); }
  if (pose === 'stomp') { sy -= 0.06; sx += 0.06; }
  if (pose === 'breath') { ox -= m.face * 2; sx += 0.05; }
  if (pose === 'flare') { const k = 0.08 + Math.sin(t * 30) * 0.03; sx += k; sy += k; }
  if (m.exposedT > 0) { sy -= 0.1; sx += 0.06; }
  if (m.introT > 0) { alpha = 1 - m.introT / 1.4; oy += m.introT * 10; }
  if (m.boss === 'shade') alpha *= 0.72 + Math.sin(t * 9) * 0.12 + (Math.random() < 0.05 ? -0.3 : 0);
  if (m.boss === 'gorgul') { const w = Math.sin(t * 5) * 0.04; sx += w; sy -= w; }
  if (m.act && m.act.type === 'whirl') { m.face = Math.floor(t * 16) % 2 ? 1 : -1; }
  const zz = (m.z || 0) + fl;
  // stín (menší, když je boss ve vzduchu)
  if (m.hidden && !(m.act && m.act.type === 'fly' && m.act.stage === 'down')) return;   // ve stínu / ve vzduchu: není vidět
  drawShadow(g, m.x, m.y, m.r * 0.95 * Math.max(0.3, 1 - zz / 140));
  // podložka bosse
  g.strokeStyle = m.enraged ? '#ff2020' : '#ff4040'; g.globalAlpha = 0.45 + Math.sin(t * 4) * 0.2;
  g.beginPath(); g.ellipse(m.x, m.y, m.r + 4, (m.r + 4) * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  const baseX = m.x + ox, baseY = m.y + oy - zz;
  // --- efekty za bossem ---
  if (m.boss === 'demon') drawDemonWings(g, m, baseX, baseY - size * 0.55, s, t, pose);
  if (m.boss === 'queen' && m.act && m.act.thread) { g.strokeStyle = '#e8e8e8'; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(baseX, baseY - size * 0.6); g.lineTo(baseX, G.cam.y - 10); g.stroke(); g.globalAlpha = 1; }
  if (m.channel && m.channel.r) {   // dosah výbuchu po dokončení sesílání
    const c = m.channel, p = Math.min(1, c.t / c.dur);
    g.setLineDash([4, 4]); g.strokeStyle = '#ff3030'; g.globalAlpha = 0.5 + p * 0.4; g.beginPath(); g.ellipse(m.x, m.y, c.r, c.r * 0.8, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 0.08 + p * 0.12; g.fillStyle = '#ff3030'; g.beginPath(); g.ellipse(m.x, m.y, c.r * p, c.r * 0.8 * p, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  }
  if (m.channel) { g.strokeStyle = m.channel.color; g.globalAlpha = 0.6; g.lineWidth = 2; const r = 16 + Math.sin(t * 12) * 2; g.beginPath(); g.ellipse(m.x, m.y, r + m.r, (r + m.r) * 0.45, 0, t * 4, t * 4 + 4.5); g.stroke(); g.lineWidth = 1; g.globalAlpha = 1; }
  // --- samotný sprite (s animací zmáčknutí) ---
  const flash = m.hitT > 0 && !m.immune;
  let tint = m.tint;
  if (m.exposedT > 0) tint = '#8090b0';
  if (m.enraged && Math.floor(t * 6) % 2) tint = '#ff3030';
  // sprite se vykreslí do malého plátna a to se roztáhne (ostré pixely i při zmáčknutí)
  if (!BOSS_CV.c) { BOSS_CV.c = document.createElement('canvas'); BOSS_CV.g = BOSS_CV.c.getContext('2d'); }
  const W = Math.ceil(size) + 2, cv = BOSS_CV.c, cg = BOSS_CV.g;
  if (cv.width !== W) { cv.width = W; cv.height = W; } else cg.clearRect(0, 0, W, W);
  drawSprite(cg, m.sprite, 1, 1, s, { flip: m.face < 0, flash, t, palOverride: m.pal, tint, frozen: m.stunT > 0 && m.stunKind === 'freeze' });
  g.save();
  g.globalAlpha = Math.max(0, alpha); g.imageSmoothingEnabled = false;
  g.translate(Math.round(baseX), Math.round(baseY)); g.scale(sx, sy);
  g.drawImage(cv, -W / 2, -W + 2);
  g.restore();
  // --- efekty před bossem ---
  const cx = baseX, cy = baseY - size * 0.55;
  switch (m.boss) {
    case 'colossus':
      light(cx, cy - 6, 30, '#ff8a30');
      if (pose === 'jump' || pose === 'raise') for (let i = 0; i < 2; i++) particle(cx + rand(-size / 2, size / 2), baseY - rand(0, size), { vy: 20, life: 0.4, color: '#8a8478', size: 1 });
      break;
    case 'lich':
      for (let i = 0; i < 3; i++) { const a = t * 2.2 + i * 2.09, px = cx + Math.cos(a) * 18, py = cy + Math.sin(a) * 7 - 4; g.fillStyle = '#7ff0ff'; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(Math.round(px), Math.round(py), 1, 1); light(px, py, 14, '#7ff0ff'); }
      if (Math.random() < 0.3) particle(m.x + rand(-8, 8), baseY - 2, { vy: 8, life: 0.6, color: '#5a3a8a', size: 2 });
      light(cx, cy, 34, '#7ff0ff');
      break;
    case 'demon':
      if (Math.random() < 0.5) particle(cx + rand(-size / 3, size / 3), cy + rand(-6, 10), { vy: rand(-40, -20), life: 0.5, color: pick(['#ff6020', '#ffd040', '#ff3010']), size: 1, glow: true });
      light(cx, cy, 50 + Math.sin(t * 10) * 5, '#ff6020');
      if (pose === 'breath') for (let i = 0; i < 3; i++) particle(cx + m.face * 12, cy - 4, { vx: m.face * rand(20, 50), vy: rand(-10, 10), life: 0.3, color: '#ffd040', size: 1, glow: true });
      break;
    case 'queen':
      light(cx + m.face * 6, cy + 4, 22, '#ff4040');
      if (Math.random() < 0.15) particle(cx + rand(-10, 10), baseY - 2, { vy: 20, life: 0.4, color: '#8be07a', size: 1 });
      break;
    case 'bonelord': {
      const cr = baseY - size + 2 * s;   // koruna
      g.fillStyle = '#ffd060';
      for (let i = -1; i <= 1; i++) g.fillRect(Math.round(cx + i * 3 * s / 1.5) - 1, Math.round(cr - 3 - (i === 0 ? 2 : 0)), 2, 3 + (i === 0 ? 2 : 0));
      g.fillRect(Math.round(cx - 5), Math.round(cr), 10, 2);
      if (Math.random() < 0.08) particle(cx + rand(-5, 5), cr - 2, { vy: -10, life: 0.5, color: '#fff0a0', size: 1, glow: true });
      light(cx, cy, 26, '#ff5050');
      (m.guards || []).forEach(gd => { if (gd.dead) return; g.strokeStyle = '#c8a030'; g.globalAlpha = 0.35 + Math.sin(t * 6) * 0.15; g.beginPath(); g.moveTo(cx, cy); g.lineTo(gd.x, gd.y - 8); g.stroke(); g.globalAlpha = 1; });
      if (m.dr > 0) { g.strokeStyle = '#ffd060'; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx, cy, size * 0.55, size * 0.6, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      break;
    }
    case 'frostwitch':
      for (let i = 0; i < 4; i++) { const a = -t * 1.6 + i * 1.57, px = cx + Math.cos(a) * 20, py = cy + Math.sin(a) * 8; g.fillStyle = '#dff8ff'; g.fillRect(Math.round(px), Math.round(py) - 2, 1, 5); g.fillRect(Math.round(px) - 2, Math.round(py), 5, 1); light(px, py, 10, '#bfefff'); }
      if (Math.random() < 0.3) particle(m.x + rand(-12, 12), baseY - rand(0, size), { vy: 12, vx: rand(-5, 5), life: 0.8, color: '#ffffff', size: 1 });
      light(cx, cy, 34, '#bfefff');
      break;
    case 'gorgul':
      for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1; g.fillStyle = '#1a1a1a'; g.fillRect(Math.round(cx + Math.cos(a) * (14 + i * 3)), Math.round(cy - 10 + Math.sin(a * 1.3) * 6), 1, 1); }
      light(cx, cy, 22, '#9ac040');
      break;
    case 'shade':
      if (Math.random() < 0.6) particle(m.x + rand(-10, 10), baseY - rand(0, size * 0.8), { vy: rand(-30, -10), life: 0.6, color: pick(['#5a2a8a', '#2a1a3e', '#c060ff']), size: Math.random() < 0.3 ? 2 : 1 });
      light(cx, cy - 6, 30, '#c060ff');
      break;
  }
  // štít
  if (m.shield > 0) {
    g.globalAlpha = 0.25 + Math.sin(t * 6) * 0.08; g.fillStyle = '#d0d0e0';
    g.beginPath(); g.ellipse(cx, cy, size * 0.62, size * 0.66, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.8; g.strokeStyle = '#ffffff'; g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * 1.05; g.fillStyle = '#8a8478'; g.fillRect(Math.round(cx + Math.cos(a) * size * 0.6) - 1, Math.round(cy + Math.sin(a) * size * 0.25) - 1, 3, 3); }
  }
  // nezranitelnost (fylakterie, řev)
  if (m.immune && m.introT <= 0) {
    g.globalAlpha = 0.3 + Math.sin(t * 8) * 0.1; g.strokeStyle = m.holdImmune ? L.color : '#ffffff'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, cy, size * 0.6, size * 0.65, 0, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; g.globalAlpha = 1;
    if (m.holdImmune && m.crystals) m.crystals.forEach(c => { if (c.dead) return; g.strokeStyle = L.color; g.globalAlpha = 0.5 + Math.sin(t * 10) * 0.2; g.lineWidth = 2; g.beginPath(); g.moveTo(c.x, c.y - 10); g.lineTo(cx, cy); g.stroke(); g.lineWidth = 1; g.globalAlpha = 1; });
  }
  // vyčerpání: hvězdičky
  if (m.exposedT > 0) for (let i = 0; i < 4; i++) { const a = t * 5 + i * 1.57; g.fillStyle = i % 2 ? '#ffe060' : '#ffffff'; g.fillRect(Math.round(cx + Math.cos(a) * 12), Math.round(baseY - size - 2 + Math.sin(a) * 3), 2, 2); }
  // běsnění: rudá aura
  if (m.enraged && Math.random() < 0.5) particle(m.x + rand(-m.r, m.r), baseY - rand(0, size), { vy: -40, life: 0.4, color: '#ff2020', size: 1, glow: true });
  // stavy
  if (m.stunT > 0 && m.stunKind === 'stun') for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; g.fillStyle = '#ffe08a'; g.fillRect(m.x + Math.cos(a) * 8, baseY - size - 4 + Math.sin(a) * 2, 2, 2); }
  Object.values(m.dots).forEach(dd => { if (Math.random() < 0.3) particle(m.x + rand(-m.r, m.r), baseY - rand(0, size), { vy: -15, life: 0.4, color: ELEMENTS[dd.elem].color, size: 1 }); });
}

function drawDemonWings(g, m, x, y, s, t, pose) {
  const flap = Math.sin(t * (m.act && m.act.type === 'fly' ? 18 : 5)) * 0.35 + (pose === 'flare' ? 0.4 : 0);
  const span = 13 * s;
  [-1, 1].forEach(side => {
    g.fillStyle = '#5a1010'; g.strokeStyle = '#1a0a0a';
    g.beginPath();
    g.moveTo(x + side * 3, y);
    g.lineTo(x + side * span, y - span * (0.55 + flap));
    g.lineTo(x + side * span * 0.85, y + span * 0.1);
    g.lineTo(x + side * span * 0.55, y - span * 0.05);
    g.lineTo(x + side * span * 0.4, y + span * 0.25);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#a02020'; g.beginPath(); g.moveTo(x + side * 3, y); g.lineTo(x + side * span * 0.85, y + span * 0.1); g.stroke();
  });
}

// Otisky na zemi (praskliny, spáleniště, pavučiny)
function drawDecals(g) {
  G.decals.forEach(dc => {
    if (!inView(dc.x, dc.y, 80)) return;
    const a = Math.min(1, (dc.dur - dc.t) / 1.5);
    g.globalAlpha = a;
    if (dc.kind === 'crack') {
      g.strokeStyle = '#120c08'; g.lineWidth = 1;
      const n = 7;
      for (let i = 0; i < n; i++) {
        const ang = dc.seed + i * (Math.PI * 2 / n);
        let x = dc.x, y = dc.y;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 1; k <= 3; k++) { const r = dc.r * k / 3; x = dc.x + Math.cos(ang + Math.sin(dc.seed * k + i) * 0.4) * r; y = dc.y + Math.sin(ang + Math.sin(dc.seed * k + i) * 0.4) * r * 0.7; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(20,12,8,0.35)'; g.beginPath(); g.ellipse(dc.x, dc.y, dc.r * 0.35, dc.r * 0.25, 0, 0, Math.PI * 2); g.fill();
    } else if (dc.kind === 'scorch') {
      g.fillStyle = 'rgba(15,8,4,0.55)'; g.beginPath(); g.ellipse(dc.x, dc.y, dc.r, dc.r * 0.7, 0, 0, Math.PI * 2); g.fill();
      if (dc.t < 2) { g.fillStyle = '#ff6020'; g.globalAlpha = a * (1 - dc.t / 2) * 0.5; g.beginPath(); g.ellipse(dc.x, dc.y, dc.r * 0.6, dc.r * 0.4, 0, 0, Math.PI * 2); g.fill(); }
    } else if (dc.kind === 'web') {
      g.strokeStyle = 'rgba(230,230,230,0.6)';
      for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4; g.beginPath(); g.moveTo(dc.x, dc.y); g.lineTo(dc.x + Math.cos(ang) * dc.r, dc.y + Math.sin(ang) * dc.r * 0.75); g.stroke(); }
      for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(dc.x, dc.y, dc.r * k / 3, dc.r * k / 3 * 0.75, 0, 0, Math.PI * 2); g.stroke(); }
    }
  });
  g.globalAlpha = 1;
}

// Zvláštní nebezpečí bossů na zemi (padající kameny, bodce, bezpečná zóna, sloup světla, vánice)
function drawBossHazard(g, z) {
  const p = z.delay ? Math.min(1, z.t / z.delay) : 1;
  if (z.safe) {
    const left = Math.max(0, z.delay - z.t);
    g.globalAlpha = 0.25 + Math.sin(G.time * 8) * 0.08; g.fillStyle = '#ffc060';
    g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.9; g.strokeStyle = '#ffe0a0'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); g.stroke(); g.lineWidth = 1;
    light(z.x, z.y - 6, 50, '#ffc060');
    if (Math.random() < 0.4) particle(z.x + rand(-z.r, z.r) * 0.7, z.y, { vy: -30, life: 0.6, color: '#ffd080', size: 1, glow: true });
    g.globalAlpha = 1;
    return true;
  }
  if (z.pillar) {
    const a = Math.min(1, z.t * 3, (z.dur - z.t) * 2);
    g.globalAlpha = 0.25 * a; g.fillStyle = '#fff0b0'; g.fillRect(z.x - z.r * 0.7, z.y - 90, z.r * 1.4, 90);
    g.globalAlpha = 0.6 * a; g.fillRect(z.x - 2, z.y - 90, 4, 90);
    g.globalAlpha = 0.4 * a; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    return true;
  }
  if (z.snow && z.fired) {
    g.globalAlpha = 0.3; g.fillStyle = '#bfe8ff'; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) particle(z.x + rand(-z.r, z.r), z.y - 30 + rand(-6, 6), { vx: rand(10, 30), vy: rand(30, 50), life: 0.6, color: '#ffffff', size: 1 });
    return true;
  }
  if (z.voidz && z.fired) {
    g.globalAlpha = 0.55; g.fillStyle = '#12061e'; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.7; g.strokeStyle = '#7a30c0'; g.beginPath(); g.ellipse(z.x, z.y, z.r * (0.8 + Math.sin(G.time * 5) * 0.1), z.r * 0.6, 0, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
    if (Math.random() < 0.2) particle(z.x + rand(-z.r, z.r) * 0.6, z.y, { vy: -25, life: 0.6, color: '#7a30c0', size: 1 });
    return true;
  }
  if (z.spike && z.fired) {   // bodce vyrazí ze země
    const k = Math.min(1, (z.t - z.delay) * 10), fade = Math.max(0, 1 - (z.t - z.delay) / 0.45);
    g.globalAlpha = fade; g.fillStyle = z.spike;
    for (let i = -1; i <= 1; i++) { const hh = (i === 0 ? 12 : 8) * k; g.beginPath(); g.moveTo(z.x + i * 5 - 2, z.y + 1); g.lineTo(z.x + i * 5, z.y - hh); g.lineTo(z.x + i * 5 + 2, z.y + 1); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
    return true;
  }
  if (z.rock && !z.fired && z.delay) {   // padající kámen / rampouch / meteor nad varováním
    const h = (1 - p) * 120;
    if (p > 0.35) {
      g.fillStyle = z.rock;
      if (z.icicle) { g.beginPath(); g.moveTo(z.x - 3, z.y - h - 10); g.lineTo(z.x + 3, z.y - h - 10); g.lineTo(z.x, z.y - h); g.closePath(); g.fill(); }
      else { g.fillRect(Math.round(z.x) - 3, Math.round(z.y - h) - 6, 6, 6); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(Math.round(z.x) + 1, Math.round(z.y - h) - 2, 2, 2); }
      if (z.elem === 'fire') { light(z.x, z.y - h - 3, 20, '#ff8030'); particle(z.x, z.y - h - 4, { vy: -30, life: 0.25, color: '#ffd040', size: 1, glow: true }); }
    }
  }
  return false;
}

// Ukazatel sesílání a štítu nad bossem, odpočet prokletí (v rozlišení obrazovky)
function drawBossOverlay(sx, sy, d) {
  const m = G.rift && G.rift.boss;
  const h = G.hero;
  if (m && !m.dead && m.channel && inView(m.x, m.y, 0)) {
    const c = m.channel, w = 90 * d, x0 = sx(m.x) - w / 2, y0 = sy(m.y - 16 * m.scale - 18);
    const need = c.need * m.maxHp, brk = Math.min(1, c.dmg / need);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x0 - 2 * d, y0 - 2 * d, w + 4 * d, 12 * d);
    ctx.fillStyle = c.color; ctx.fillRect(x0, y0, w * Math.min(1, c.t / c.dur), 5 * d);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y0 + 6 * d, w * brk, 2 * d);
    ctx.font = `700 ${10 * d}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = '#ffffff';
    const tx = `${c.name} – přeruš!`;
    ctx.strokeText(tx, sx(m.x), y0 - 4 * d); ctx.fillText(tx, sx(m.x), y0 - 4 * d);
  }
  (G.heroes.length ? G.heroes : [h]).forEach(h => {
    if (!h || !h.curse || h.dead) return;
    ctx.font = `800 ${12 * d}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.fillStyle = h.curse.t < 2.5 && Math.floor(G.time * 6) % 2 ? '#ffffff' : '#c070ff';
    const tx = `Prokletí ${h.curse.t.toFixed(1)} s`;
    ctx.strokeText(tx, sx(h.x), sy(h.y - 32)); ctx.fillText(tx, sx(h.x), sy(h.y - 32));
  });
  // mráz přes obrazovku při Absolutní nule
  if (m && m.act && m.act.frost) {
    const p = 1 - Math.max(0, m.act.t) / 3;
    const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    gr.addColorStop(0, 'rgba(190,240,255,0)'); gr.addColorStop(1, `rgba(190,240,255,${0.45 * p})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function bossStatusText(m) {
  if (m.introT > 0) return '';
  if (m.holdImmune && m.crystals) return `Nezranitelný – znič fylakterie (${m.crystals.filter(c => !c.dead).length})`;
  if (m.hidden) return 'Mimo dosah';
  if (m.shield > 0) return `Kamenný štít ${fmt(m.shield)} · ${Math.ceil(m.shieldT)} s`;
  if (m.exposedT > 0) return 'Vyčerpaný: +50 % poškození';
  if (m.dr > 0) return `Garda: −${Math.round(m.dr * 100)} % poškození`;
  if (m.enraged) return 'Běsnění';
  return `Fáze ${m.phase}/3`;
}
