// Rift: vygenerování, rozmístění nepřátel, postup, strážce (boss), dokončení, smrt a oživení, přechod do města.

function newHero(x, y) {
  const st = heroStats();
  return { x, y, r: 5, z: 0, face: 1, hp: st.maxHp, res: CLASSES[G.char.cls].res.start, cds: {}, buffs: [], castLock: 0,
           potionCd: 0, walk: 0, path: null, dest: null, target: null, invuln: 0, frozen: 0, whirl: 0, hitT: 0, atkAnim: 0 };
}

function resetEntities() {
  G.monsters = []; G.projs = []; G.zones = []; G.hazards = []; G.loot = []; G.pets = []; G.traps = [];
  G.flow = null; G.portal = null; G.banner = null; G.shrines = []; fxReset();
}

function addClassPets() {
  const st = G.st, c = CLASSES[G.char.cls];
  if (c.pet && !st.mods.loneWolf) { const n = 1 + (st.petCount || 0); for (let i = 0; i < n; i++) { const p = spawnPet(c.pet); p.classPet = true; } }
}

function enterTown() {
  resetEntities();
  G.scene = 'town';
  G.world = genTown();
  G.mapImg = renderMap(G.world);
  invalidate(); G.st = heroStats();
  G.hero = newHero(G.world.spawn.x, G.world.spawn.y);
  G.hero.res = G.st.resMax * (G.char.cls === 'warrior' ? 0 : 1);
  G.rift = { level: 0 };
  G.vendorStock = null;
  addClassPets();
  onSceneChange();
  persist();
}

function startRift(level) {
  resetEntities();
  const themeId = pick(Object.keys(THEMES));
  G.scene = 'rift';
  G.world = genRift(themeId);
  G.mapImg = renderMap(G.world);
  invalidate(); G.st = heroStats();
  const keep = G.hero ? G.hero.hp / Math.max(1, G.st.maxHp) : 1;
  G.hero = newHero(G.world.spawn.x, G.world.spawn.y);
  G.hero.hp = G.st.maxHp * Math.max(0.5, Math.min(1, keep || 1));
  G.rift = { level, theme: themeId, progress: 0, boss: null, bossSpawned: false, done: false, time: 0, deaths: 0, kills: 0 };
  populateRift();
  placeShrines();
  addClassPets();
  G.bannerBig = { text: `Rift ${level}`, sub: THEMES[themeId].name, t: 0 };
  onSceneChange();
}

function populateRift() {
  const W = G.world, T = THEMES[W.theme], L = G.rift.level;
  const goal = RIFT.progressGoal * 1.45 * (1 + RIFT.density * L);
  const sp = { x: Math.floor(W.spawn.x / TILE), y: Math.floor(W.spawn.y / TILE) };
  const cand = floorTiles(W).filter(([x, y]) => isOpen(W, x, y) && Math.hypot(x - sp.x, y - sp.y) > 11);
  const centers = [];
  let pts = 0, tries = 0, packId = 0;
  while (pts < goal && tries++ < 600 && cand.length) {
    const [cx, cy] = cand[rnd(cand.length)];
    if (centers.some(([x, y]) => Math.hypot(x - cx, y - cy) < 7)) continue;
    centers.push([cx, cy]);
    const type = pick(T.monsters), def = MONSTERS[type];
    const elite = Math.random() < RIFT.eliteChance(L);
    let affixes = null;
    if (elite) {
      const keys = Object.keys(ELITE_AFFIXES).filter(k => !(def.res[ELITE_AFFIXES[k].atkElem] > 0));
      affixes = [pick(keys)];
      if (L >= 6 && Math.random() < 0.5) { const b = pick(keys.filter(k => k !== affixes[0])); if (b) affixes.push(b); }
    }
    const n = elite ? 3 : (def.ai === 'swarm' ? 5 + rnd(4) : 3 + rnd(3) + (L >= 8 ? 1 : 0));
    packId++;
    for (let i = 0; i < n; i++) {
      const x = (cx + rand(-1.8, 1.8)) * TILE + 8, y = (cy + rand(-1.8, 1.8)) * TILE + 8;
      const p = nearestFree(W, x, y, def.r);
      const m = spawnMonster(type, p.x, p.y, { elite: affixes, pack: packId });
      pts += m.pts;
    }
  }
}

function placeShrines() {
  const W = G.world, sp = { x: W.spawn.x / TILE, y: W.spawn.y / TILE };
  const cand = floorTiles(W).filter(([x, y]) => isOpen(W, x, y) && Math.hypot(x - sp.x, y - sp.y) > 14);
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  G.shrines = [];
  for (let i = 0; i < n && cand.length; i++) {
    const [x, y] = cand.splice(rnd(cand.length), 1)[0];
    G.shrines.push({ x: x * TILE + 8, y: y * TILE + 10, type: pick(Object.keys(SHRINES)), used: false });
  }
}

function updateShrines() {
  const h = G.hero;
  (G.shrines || []).forEach(s => {
    if (s.used || h.dead || dist(s, h) > 12) return;
    s.used = true;
    const S = SHRINES[s.type];
    h.buffs = h.buffs.filter(b => b.id !== 'shrine_' + s.type);
    h.buffs.push({ id: 'shrine_' + s.type, name: S.name, stats: S.stats, t: S.dur, dur: S.dur, color: S.color, glyph: S.glyph });
    invalidate(); G.st = heroStats();
    sfx('levelup'); beamFx(s.x, s.y, S.color, 0.8, 16); burst(s.x, s.y - 8, S.color, 40, 90, { glow: true });
    G.bannerBig = { text: S.name, sub: S.desc, t: 0.4, color: S.color };
  });
}

function addProgress(p) {
  const R = G.rift;
  if (R.done || R.bossSpawned) return;
  R.progress = Math.min(RIFT.progressGoal, R.progress + p);
  if (R.progress >= RIFT.progressGoal) spawnBoss();
}

// ---------- Strážce riftu ----------

function spawnBoss() {
  const R = G.rift, h = G.hero, L = R.level;
  R.bossSpawned = true;
  const id = pick(Object.keys(BOSSES)), B = BOSSES[id];
  // strážce se zrodí kousek od hrdiny, na volném místě, které je vidět
  let pos = null;
  const a0 = Math.random() * Math.PI * 2;
  for (const dd of [70, 55, 40]) {
    for (let i = 0; i < 16 && !pos; i++) {
      const a = a0 + i * Math.PI / 8, x = h.x + Math.cos(a) * dd, y = h.y + Math.sin(a) * dd;
      if (!circleBlocked(G.world, x, y, B.r) && lineClear(G.world, h.x, h.y, x, y, 4)) pos = { x, y };
    }
    if (pos) break;
  }
  if (!pos) pos = nearestFree(G.world, h.x + 30, h.y, B.r);
  const m = {
    kind: 'monster', boss: id, def: B, name: B.name, sprite: B.sprite, pal: B.pal || null, scale: B.scale,
    x: pos.x, y: pos.y, r: B.r, maxHp: Math.round(B.hp * riftMult(RIFT.hp, L)), atk: B.atk * riftMult(RIFT.atk, L),
    spd: B.spd, res: Object.assign({}, B.res), atkElem: B.atkElem, xp: 40, pts: 0, gold: GOLD_BASE * Math.pow(GOLD_GROWTH, riftIlvl(L)),
    dots: {}, slowT: 0, slowPct: 0, stunT: 0, stunImm: 0, cd: 2, spec: 3, wind: 0, aggro: true, face: 1, hitT: 0, bob: 0,
    attackIdx: 0, phase2: false
  };
  m.hp = m.maxHp;
  G.monsters.push(m);
  sfx('boss');
  R.boss = m; R.bossT = R.time; R.bossName = B.name;
  burst(m.x, m.y, '#ff4040', 60, 140, { glow: true });
  ringFx(m.x, m.y, 60, '#ff4040', 0.6, 3);
  shake(5);
  G.bannerBig = { text: B.name, sub: 'Strážce riftu', t: 0, color: '#ff6060' };
}

function updateBoss(m, dt, d) {
  const h = G.hero, B = m.def;
  if (!m.phase2 && m.hp < m.maxHp * 0.5) { m.phase2 = true; floatText(m.x, m.y - 40, 'Zuří!', '#ff4040', 1.5, { dur: 1.5 }); burst(m.x, m.y, '#ff4040', 40, 100); }
  const rate = m.phase2 ? 1.45 : 1;
  let slow = m.slowT > 0 ? m.slowPct * 0.5 : 0;
  m.cd -= dt * rate * (1 - slow); m.spec -= dt * rate * (1 - slow);
  // probíhající akce
  if (m.act) {
    m.act.t -= dt;
    const A = m.act;
    if (A.type === 'whirl') {
      monsterMoveToward(m, h.x, h.y, 48, dt);
      A.tick -= dt;
      arcFx(m.x, m.y - 10, Math.random() * 6, Math.PI * 2, 30, '#e0e0e0', 0.2);
      if (A.tick <= 0) { A.tick = 0.4; if (dist(m, h) < 32) hurtHero(m.atk * 0.6, 'phys', m); }
    } else if (A.type === 'charge') {
      if (A.windup > 0) A.windup -= dt;
      else { moveEntity(G.world, m, A.vx * 200 * dt, A.vy * 200 * dt); dust(m.x, m.y + 6); if (!A.hit && dist(m, h) < m.r + h.r + 4) { A.hit = true; hurtHero(m.atk * 1.8, m.atkElem, m); shake(4); } }
    } else if (A.type === 'leap') {
      const p = 1 - Math.max(0, A.t) / A.dur;
      m.x = A.fx + (A.tx - A.fx) * p; m.y = A.fy + (A.ty - A.fy) * p; m.z = Math.sin(p * Math.PI) * 40;
      if (A.t <= 0) { m.z = 0; burst(m.x, m.y, '#a09080', 40, 110); shake(6); ringFx(m.x, m.y, 40, '#c8a060', 0.4, 3); if (dist(m, h) < 42) hurtHero(m.atk * 2, 'phys', m); }
    } else if (A.type === 'slam' && A.t <= 0) {
      burst(A.x, A.y, '#a09080', 36, 120); shake(5); ringFx(A.x, A.y, A.r, '#c8a060', 0.35, 3);
    }
    if (A.t <= 0) m.act = null;
    return;
  }
  // speciální útok
  if (m.spec <= 0) {
    const atk = B.attacks[m.attackIdx++ % B.attacks.length];
    m.spec = rand(3.2, 4.5);
    bossAttack(m, atk);
    return;
  }
  // základní útok zblízka / přiblížení
  const range = m.r + h.r + 8;
  if (d > range) monsterMoveToward(m, h.x, h.y, m.spd * (1 - slow), dt);
  else if (m.cd <= 0) {
    m.cd = 1.6;
    m.atkAnim = 0.2;
    hazard({ x: m.x + (h.x - m.x) * 0.6, y: m.y + (h.y - m.y) * 0.6, r: 20, delay: 0.45, dmg: m.atk, elem: m.atkElem, color: '#ff4040', src: m });
  }
}

function bossAttack(m, atk) {
  const h = G.hero, A = m.atk;
  const toHero = Math.atan2(h.y - m.y, h.x - m.x);
  m.face = Math.cos(toHero) > 0 ? 1 : -1;
  switch (atk) {
    case 'slam':
      hazard({ x: m.x + Math.cos(toHero) * 18, y: m.y + Math.sin(toHero) * 18, r: 46, delay: 0.9, dmg: A * 1.8, elem: 'phys', color: '#ff4040', src: m });
      m.act = { type: 'slam', t: 0.9, x: m.x + Math.cos(toHero) * 18, y: m.y + Math.sin(toHero) * 18, r: 46 };
      break;
    case 'quakeRing':
      for (let i = 0; i < 3; i++) hazard({ wave: true, x: m.x, y: m.y, delay: 0.6 + i * 0.7, speed: 110, maxR: 170, dmg: A * 1.0, elem: 'phys', color: '#c8a060', src: m });
      m.act = { type: 'cast', t: 0.6 }; shake(3);
      break;
    case 'rocks':
      for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : rand(14, 70);
        hazard({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, r: 18, delay: 1.0 + i * 0.15, dmg: A * 1.2, elem: 'phys', color: '#c8a060', orb: true, src: m }); }
      m.act = { type: 'cast', t: 0.5 };
      break;
    case 'boltFan':
      for (let i = 0; i < 7; i++) { const a = toHero - 0.6 + i * 0.2; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 120, dmg: A * 0.8, elem: 'shadow', color: '#c77dff', size: 3 }); }
      m.act = { type: 'cast', t: 0.5 };
      break;
    case 'frostNova':
      hazard({ x: m.x, y: m.y, r: 72, delay: 1.1, dmg: A * 1.2, elem: 'frost', color: '#8fd8ff', freeze: 1.0, src: m });
      m.act = { type: 'cast', t: 1.1 };
      break;
    case 'summonSkel':
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const p = nearestFree(G.world, m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 30, 6);
        const s = spawnMonster('skeleton', p.x, p.y, { minion: true }); s.aggro = true; s.pts = 0; s.xp = 0.5; burst(p.x, p.y, '#c77dff', 14, 50); }
      m.act = { type: 'cast', t: 0.6 };
      break;
    case 'teleport': {
      if (dist(m, h) > 70) { bossAttack(m, 'boltFan'); return; }
      burst(m.x, m.y, '#c77dff', 30, 80);
      const a = Math.random() * Math.PI * 2, p = nearestFree(G.world, h.x + Math.cos(a) * 110, h.y + Math.sin(a) * 110, m.r);
      if (lineOfSight(G.world, h.x, h.y, p.x, p.y)) { m.x = p.x; m.y = p.y; }
      burst(m.x, m.y, '#c77dff', 30, 80);
      break;
    }
    case 'breath':
      hazard({ cone: true, x: m.x, y: m.y, ang: toHero, arc: 1.1, len: 100, delay: 0.9, dmg: A * 2, elem: 'fire', color: '#ff6020', pools: true, src: m });
      m.act = { type: 'cast', t: 1.0 };
      break;
    case 'meteors':
      for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : rand(16, 80);
        hazard({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, r: 24, delay: 1.3 + i * 0.2, dmg: A * 1.5, elem: 'fire', color: '#ff6020', dur: 2.5, dps: A * 0.3, pool: true, src: m }); }
      m.act = { type: 'cast', t: 0.5 };
      break;
    case 'charge':
      m.act = { type: 'charge', t: 1.3, windup: 0.6, vx: Math.cos(toHero), vy: Math.sin(toHero), hit: false };
      hazardLine(m.x, m.y, toHero, 150, 0.6);
      break;
    case 'spit':
      for (let i = 0; i < 3; i++) { const a = toHero - 0.3 + i * 0.3; monsterShoot(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, { speed: 130, dmg: A * 0.9, elem: 'nature', color: '#8be07a', size: 3, pool: true }); }
      m.act = { type: 'cast', t: 0.4 };
      break;
    case 'web':
      hazard({ x: h.x, y: h.y, r: 40, delay: 0.9, dmg: A * 0.5, elem: 'nature', color: '#e0e0e0', slow: 0.5, src: m });
      m.act = { type: 'cast', t: 0.5 };
      break;
    case 'brood':
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, p = nearestFree(G.world, m.x + Math.cos(a) * 24, m.y + Math.sin(a) * 24, 4);
        const s = spawnMonster('spider', p.x, p.y, { scale: 0.7, hpMul: 0.5, minion: true }); s.aggro = true; s.pts = 0; s.xp = 0.3; }
      m.act = { type: 'cast', t: 0.5 };
      break;
    case 'whirlwind':
      m.act = { type: 'whirl', t: 3, tick: 0.2 };
      break;
    case 'leapSlam': {
      const p = nearestFree(G.world, h.x, h.y, m.r);
      hazard({ x: p.x, y: p.y, r: 42, delay: 1.0, dmg: 0, elem: 'phys', color: '#ff4040' });
      m.act = { type: 'leap', t: 1.0, dur: 1.0, fx: m.x, fy: m.y, tx: p.x, ty: p.y };
      break;
    }
  }
}

function bossDefeated(m) {
  const R = G.rift, ch = G.char;
  R.done = true; R.boss = null;
  sfx('portal');
  G.portal = nearestFree(G.world, m.x, m.y, 7);
  const was = ch.maxRift;
  ch.maxRift = Math.max(ch.maxRift, R.level + 1);
  gainXP(60 * riftMult(RIFT.xp, R.level) * G.st.xpMul);
  G.bannerBig = { text: 'Rift dokončen!', sub: ch.maxRift > was ? `Odemčen rift ${ch.maxRift}` : 'Portál do města je otevřen', t: 0, color: '#ffd060' };
  persist();
}

// ---------- Smrt ----------

function heroDeath() {
  const h = G.hero, st = G.st;
  if (st.rebirth && !h.rebirthUsed) {
    h.rebirthUsed = true; h.hp = st.maxHp * 0.4; h.invuln = 2;
    floatText(h.x, h.y - 30, 'Znovuzrození!', '#ffd060', 1.4);
    burst(h.x, h.y, '#ffd060', 40, 90, { glow: true });
    return;
  }
  sfx('death');
  h.dead = true; h.deadT = 3; h.hp = 0; h.path = null; h.dest = null; h.target = null; h.whirl = 0;
  G.rift.deaths++;
  EQUIP_ORDER.forEach(s => { const it = G.char.equip[s]; if (it && it.dur > 0) damageItem(it, Math.ceil(it.maxDur * RIFT.deathDurability)); });
  debris(h.x, h.y, CLASSES[G.char.cls].colors.concat(['#f2c39b']), 20);
  shake(4);
  G.monsters.forEach(m => { if (!m.boss) m.aggro = false; });
  invalidate();
}

function reviveHero() {
  const h = G.hero, W = G.world;
  G.st = heroStats();
  h.dead = false; h.hp = G.st.maxHp; h.res = Math.max(h.res, CLASSES[G.char.cls].res.start);
  h.x = W.spawn.x; h.y = W.spawn.y; h.invuln = 2; h.frozen = 0;
  G.pets.forEach(p => { p.x = h.x; p.y = h.y; });
  burst(h.x, h.y, '#ffffff', 30, 70, { glow: true });
}

// Zobrazení postupu (pro HUD)
function riftProgressPct() { return Math.floor(G.rift.progress / RIFT.progressGoal * 100); }
