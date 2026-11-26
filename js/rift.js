// Rift: vygenerování, rozmístění nepřátel, postup, strážce (boss), dokončení, smrt a oživení, přechod do města.

function newHero(x, y) {
  const st = heroStats();
  return { x, y, r: 5, z: 0, face: 1, hp: st.maxHp, res: CLASSES[G.char.cls].res.start, cds: {}, buffs: [], castLock: 0,
           potionCd: 0, walk: 0, path: null, dest: null, target: null, invuln: 0, frozen: 0, whirl: 0, hitT: 0, atkAnim: 0,
           char: G.char, save: G.save, name: G.char.name };
}

// Hrdina tohoto hráče: stane se aktuálním hrdinou (G.hero = G.me)
function setLocalHero(h) {
  G.hero = G.me = h; h.char = G.char; h.save = G.save;
  G.heroes = [h];
}

// Další člen družiny. member: { char, save, name, control(dt) } – control řídí hrdinu (síť, testovací bot)
function addPartyHero(member, x, y) {
  const h = { x, y, r: 5, z: 0, face: 1, hp: 1, res: 0, cds: {}, buffs: [], castLock: 0, potionCd: 0, walk: 0, path: null, dest: null,
              target: null, invuln: 0, frozen: 0, whirl: 0, hitT: 0, atkAnim: 0,
              char: member.char, save: member.save || { gold: 0, nextUid: 1e9, settings: { autoSell: {} } }, name: member.name || member.char.name,
              control: member.control || null, member, st: null, mods: null, netId: member.netId || undefined };
  const p = nearestFree(G.world, x, y, h.r); h.x = p.x; h.y = p.y;
  G.heroes.push(h);
  withHero(h, () => {
    invalidate(); G.st = heroStats();
    h.hp = G.st.maxHp; h.res = G.st.resMax * (G.char.cls === 'warrior' ? 0 : 1);
    addClassPets();
  });
  return h;
}

function resetEntities() {
  G.monsters = []; G.projs = []; G.zones = []; G.hazards = []; G.loot = []; G.pets = []; G.traps = [];
  G.flow = null; G.portal = null; G.banner = null; G.shrines = []; G.offstage = []; G.decals = []; G.darkness = 0; fxReset();
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
  setLocalHero(newHero(G.world.spawn.x, G.world.spawn.y));
  G.hero.res = G.st.resMax * (G.char.cls === 'warrior' ? 0 : 1);
  G.partyMul = 1;
  G.rift = { level: 0 };
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
  setLocalHero(newHero(G.world.spawn.x, G.world.spawn.y));
  G.hero.hp = G.st.maxHp * Math.max(0.5, Math.min(1, keep || 1));
  G.rift = { level, theme: themeId, progress: 0, boss: null, bossSpawned: false, done: false, time: 0, deaths: 0, kills: 0 };
  addClassPets();
  // spoluhráči se objeví vedle místního hrdiny
  (G.party || []).forEach((mb, i) => { const a = i * 2.1; addPartyHero(mb, G.world.spawn.x + Math.cos(a) * 14, G.world.spawn.y + Math.sin(a) * 10); });
  G.partyMul = partyMulFor(G.heroes.length);
  populateRift();
  placeShrines();
  G.bannerBig = { text: `Podzemí ${level}`, sub: THEMES[themeId].name, t: 0 };
  onSceneChange();
}

function populateRift() {
  const W = G.world, T = THEMES[W.theme], L = G.rift.level;
  const goal = RIFT.progressGoal * 1.45 * (1 + RIFT.density * L);
  const sp = { x: Math.floor(W.spawn.x / TILE), y: Math.floor(W.spawn.y / TILE) };
  const cand = floorTiles(W).filter(([x, y]) => isOpen(W, x, y) && Math.hypot(x - sp.x, y - sp.y) > 11);
  const centers = [];
  let pts = 0, tries = 0, packId = 0, gap = 7;
  // na malé mapě se skupiny nevejdou s rozestupem 7 dlaždic – rozestup se postupně zmenšuje, dokud není dost nepřátel
  while (pts < goal && cand.length && gap >= 3) {
    if (tries++ >= 600) { tries = 0; gap--; continue; }
    const [cx, cy] = cand[rnd(cand.length)];
    if (centers.some(([x, y]) => Math.hypot(x - cx, y - cy) < gap)) continue;
    centers.push([cx, cy]);
    const type = pick(T.monsters), def = MONSTERS[type];
    const elite = Math.random() < RIFT.eliteChance(L);
    let affixes = null;
    if (elite) {
      const keys = Object.keys(ELITE_AFFIXES).filter(k => !(def.res[ELITE_AFFIXES[k].atkElem] > 0));
      affixes = [pick(keys)];
      if (L >= 6 && Math.random() < 0.5) { const b = pick(keys.filter(k => k !== affixes[0])); if (b) affixes.push(b); }
    }
    // „jatka“: běžné skupiny jsou RIFT.crowd× větší (hejna o něco méně), elity mají s sebou doprovod
    const base = def.ai === 'swarm' ? 5 + rnd(4) : 3 + rnd(3) + (L >= 8 ? 1 : 0);
    const n = elite ? 3 : Math.round(base * RIFT.crowd * (def.ai === 'swarm' ? 0.7 : 1));
    const [f0, f1] = RIFT.eliteFollowers, follow = elite ? f0 + rnd(f1 - f0 + 1) : 0;
    const total = n + follow, spread = Math.min(3.2, 1.4 + Math.sqrt(total) * 0.5);
    // část skupiny může být jiný druh z tématu (ne u elit)
    const others = T.monsters.filter(t => t !== type);
    const mixType = !elite && others.length && Math.random() < RIFT.mixChance ? pick(others) : null;
    const mixN = mixType ? Math.round(n * 0.3) : 0;
    packId++;
    const spot = r => { const p = nearestFree(W, (cx + rand(-spread, spread)) * TILE + 8, (cy + rand(-spread, spread)) * TILE + 8, r); return p; };
    for (let i = 0; i < total; i++) {
      const isElite = elite && i < n;
      const t = !elite && i >= n - mixN ? mixType : type;
      const p = spot(MONSTERS[t].r);
      const m = spawnMonster(t, p.x, p.y, isElite ? { elite: affixes, pack: packId } : { crowd: true, pack: packId });
      pts += m.pts;
    }
    // víc hráčů = větší skupiny (+10 % nepřátel za každého dalšího hráče, zbytek se dorovná náhodou)
    const extra = total * (G.partyMul - 1), add = Math.floor(extra + Math.random());
    for (let i = 0; i < add; i++) {
      const isElite = elite && i < Math.round(add * n / total);
      const p = spot(def.r);
      spawnMonster(type, p.x, p.y, isElite ? { elite: affixes, pack: packId } : { crowd: true, pack: packId });
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
  eachHero(updateShrinesFor, true);
}
function updateShrinesFor(h) {
  (G.shrines || []).forEach(s => {
    if (s.used || h.dead || dist(s, h) > 12) return;
    s.used = true;
    const S = SHRINES[s.type];
    h.buffs = h.buffs.filter(b => b.id !== 'shrine_' + s.type);
    h.buffs.push({ id: 'shrine_' + s.type, name: S.name, stats: S.stats, t: S.dur, dur: S.dur, color: S.color, glyph: S.glyph });
    invalidate(); G.st = heroStats();
    sfx('levelup'); beamFx(s.x, s.y, S.color, 0.8, 16); burst(s.x, s.y - 8, S.color, 40, 90, { glow: true });
    personalBanner('bannerBig', { text: S.name, sub: S.desc, t: 0.4, color: S.color });
  });
}

// Pojistka: když už v riftu nezbývá nikdo, kdo dává postup, objeví se strážce i tak
function checkRiftStuck() {
  const R = G.rift;
  if (R.done || R.bossSpawned) return;
  if (G.monsters.some(m => !m.dead && m.pts > 0)) return;
  R.progress = RIFT.progressGoal;
  spawnBoss();
}

function addProgress(p) {
  const R = G.rift;
  if (R.done || R.bossSpawned) return;
  R.progress = Math.min(RIFT.progressGoal, R.progress + p);
  if (R.progress >= RIFT.progressGoal) spawnBoss();
}

// ---------- Strážce riftu (zrození, souboj a útoky jsou v js/bosses.js) ----------

function bossDefeated(m) {
  const R = G.rift;
  R.done = true; R.boss = null;
  sfx('portal');
  // konec souboje: zmizí objekty bosse, hák a prokletí, světlo se vrátí
  G.monsters.forEach(o => { if (o.obj) { o.dead = true; burst(o.x, o.y, '#ffffff', 12, 50); } });
  G.offstage = [];
  G.heroes.forEach(h => { h.hooked = null; h.curse = null; });
  G.hazards = G.hazards.filter(z => !z.src || z.src !== m);
  // velkolepá smrt
  const col = BOSS_LOOK[m.boss] ? BOSS_LOOK[m.boss].color : '#ffd060';
  beamFx(m.x, m.y, col, 1.2, 30); flashFx(m.x, m.y - 10, 90, col, 0.5);
  [40, 75, 110].forEach((r, i) => ringFx(m.x, m.y, r, i % 2 ? '#ffd060' : col, 0.5 + i * 0.2, 3));
  burst(m.x, m.y - 12, col, 80, 170, { glow: true }); shake(9);
  G.portal = nearestFree(G.world, m.x, m.y, 7);
  // odměna a odemčení další úrovně pro každého hrdinu v riftu
  let was = 0, now = 0;
  eachHero(h => {
    const ch = G.char, w = ch.maxRift;
    ch.maxRift = Math.max(ch.maxRift, R.level + 1);
    vendorRiftDone(ch);
    netReward({ maxRift: ch.maxRift, vendor: 1 });
    gainXP(60 * riftMult(RIFT.xp, R.level) * G.st.xpMul);
    if (h === G.me) { was = w; now = ch.maxRift; }
  });
  G.bannerBig = { text: 'Podzemí dokončeno!', sub: now > was ? `Odemčeno podzemí ${now}` : 'Portál do města je otevřen', t: 0, color: '#ffd060' };
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
  h.dead = true; h.deadT = G.heroes.filter(x => !x.ghost).length > 1 ? COOP_DEAD_T : 3; h.revT = 0; h.hp = 0; h.path = null; h.dest = null; h.target = null; h.whirl = 0;
  if (h === G.me) G.rift.deaths++;
  EQUIP_ORDER.forEach(s => { const it = G.char.equip[s]; if (it && it.dur > 0) damageItem(it, Math.ceil(it.maxDur * RIFT.deathDurability)); });
  debris(h.x, h.y, CLASSES[G.char.cls].colors.concat(['#f2c39b']), 20);
  if (!G.remoteCtx) shake(4);
  // nepřátelé se uklidní, jen když padli všichni hrdinové; jinak si najdou jiný cíl
  G.monsters.forEach(m => { if (m.tgt === h) m.tgt = null; });
  if (G.heroes.every(x => x.dead || x === h)) G.monsters.forEach(m => { if (!m.boss) m.aggro = false; });
  invalidate();
}

// atPlace = oživil ho spoluhráč (vstane na místě s polovinou života), jinak na začátku podzemí
function reviveHero(atPlace) {
  const h = G.hero, W = G.world;
  G.st = heroStats();
  h.dead = false; h.hp = G.st.maxHp * (atPlace ? 0.5 : 1); h.res = Math.max(h.res, CLASSES[G.char.cls].res.start);
  if (!atPlace) { h.x = W.spawn.x; h.y = W.spawn.y; }
  h.invuln = 2; h.frozen = 0; h.revT = 0;
  G.pets.forEach(p => { if (p.owner === h) { p.x = h.x; p.y = h.y; } });
  burst(h.x, h.y, '#ffffff', 30, 70, { glow: true });
}

// Zobrazení postupu (pro HUD)
function riftProgressPct() { return Math.floor(G.rift.progress / RIFT.progressGoal * 100); }
