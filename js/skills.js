// Sesílání aktivních dovedností hrdiny a jejich efekty.

// Může hrdina dovednost teď použít? Vrací důvod, pokud ne.
function skillBlocked(id) {
  const h = G.hero, S = SKILLS[id];
  if (!S) return 'none';
  if (h.dead || h.leap || (h.frozen > 0 && !S.breakCc)) return 'busy';
  if (G.scene !== 'rift' && G.scene !== 'town') return 'busy';
  if ((h.cds[id] || 0) > 0) return 'cd';
  if (skillCost(id) > h.res) return 'res';
  return null;
}

// Druid v podobě šelmy útočí drápy místo Hněvu (třídní rys Proměnlivost)
function effSkill(id) {
  const h = G.hero;
  if (id === 'wrath' && h && CLASSES[G.char.cls].shapeshift && h.buffs.some(b => b.form === 'bear' || b.form === 'wolf')) return 'claw';
  return id;
}
const MOVE_TYPES = ['leap', 'dash', 'teleport'];

// Sešle dovednost na cíl (tx, ty). target = konkrétní nepřítel (volitelně)
function castSkill(id, tx, ty, target) {
  const h = G.hero, st = G.st;
  id = effSkill(id);
  if (G.scene === 'town') return false;
  if (Net.clientRift && h === G.me) return netCast(id, tx, ty, target);   // host: kouzlo spočítá hostitel
  if (skillBlocked(id)) {
    if (skillBlocked(id) === 'res' && !h.resWarn) { h.resWarn = 0.8; floatText(h.x, h.y - 30, `Málo: ${CLASSES[G.char.cls].res.name.toLowerCase()}`, CLASSES[G.char.cls].res.color, 0.8); }
    return false;
  }
  if (h.castLock > 0) return false;
  if (SKILLS[id].primary && h.atkCd > 0) return false;   // rychlost útoku u základního útoku
  const S = skillParams(id, st);
  const gy = target ? target.y : ty + 6;   // míří se na úroveň země
  const ang = Math.atan2(gy - h.y, tx - h.x);
  if (Math.abs(Math.cos(ang)) > 0.15) h.face = Math.cos(ang) > 0 ? 1 : -1;
  h.res = Math.min(st.resMax, h.res - (S.cost || 0) + (S.gen || 0) * st.genMul);
  if (S.cd) h.cds[id] = S.cd * (1 - st.cdr) * (MOVE_TYPES.includes(S.type) ? 1 - Math.min(0.5, st.mods.moveCdr || 0) : 1);
  if (h.stealth > 0 && S.type !== 'buff' && S.type !== 'heal') { h.stealth = 0; h.ambushT = G.time + 1.5; }   // útok ze stínu
  if (S.breakCc) { h.frozen = 0; h.slowT = 0; }
  if (MOVE_TYPES.includes(S.type)) {
    if (st.mods.elfDash) heroBuff('elfdash', 'Lesní mrštnost', { msPct: 0.3, dodge: 0.15 }, 2, '#9be89b');
    if (id === 'vault' && st.mods.vaultTrap) { const T = SKILLS.trap; G.traps.push({ x: h.x, y: h.y, r: T.r, dmg: T.dmg, elem: T.elem, arm: 0.3, life: 10, color: T.color, skill: 'trap', owner: h }); }
    if (id === 'blink' && st.mods.blinkNova) {
      ringFx(h.x, h.y, 44, '#8fd8ff', 0.4, 2); burst(h.x, h.y, '#bfe8ff', 24, 90, { glow: true });
      monstersIn(h.x, h.y, 44).forEach(m => { heroHit(m, 1.0, 'frost', { skill: id }); if (!m.dead) stunMonster(m, st.mods.blinkNova + st.stunDur, 'freeze'); });
    }
  }
  h.castLock = 0.18;
  if (S.primary) h.atkCd = 1 / (st.spd * (S.elem !== 'phys' ? st.castMul : st.wpnSpdMul) * (st.mods.orcRage && h.hp < st.maxHp * 0.5 ? 1 + 0.1 * (st.mods.orcRage2 ? 2 : 1) : 1));   // kouzlo = rychlost sesílání, zbraň = rychlost útoku zbraní
  h.atkAnim = 0.15; h.atkAng = ang; h.moveLock = S.primary ? 0.16 : 0.12;
  if (S.primary) wearWeapon();
  doSkill(S, tx, ty, ang, target);
  if (S.selfBuff) { h.buffs = h.buffs.filter(b => b.id !== S.selfBuff.id); h.buffs.push(Object.assign({}, S.selfBuff, { t: S.selfBuff.dur })); invalidate(); G.st = heroStats(); }
  if (S.enrage || st.mods['skenrage_' + id] || (S.enrageChance && Math.random() < S.enrageChance)) triggerEnrage();
  if (S.primary && st.mods.eclipse) {   // Zatmění: každý 8. základní útok
    h.eclipseN = (h.eclipseN || 0) + 1;
    if (h.eclipseN >= 8) {
      h.eclipseN = 0;
      h.buffs = h.buffs.filter(b => b.id !== 'eclipse');
      h.buffs.push({ id: 'eclipse', name: 'Zatmění', glyph: '🌗', stats: { arcanePct: st.mods.eclipse, naturePct: st.mods.eclipse }, t: 6, dur: 6, color: '#d8c0ff' });
      invalidate(); G.st = heroStats(); floatText(h.x, h.y - 30, 'Zatmění!', '#d8c0ff', 0.9);
    }
  }
  sfx(skillSfx(S));
  // dvojitý útok u primárních útoků
  if (S.primary && st.double && Math.random() < st.double) later(h, 120, () => doSkill(S, tx, ty, ang, target));
  return true;
}

// Odložená akce hrdiny (dvojitý útok, nova se zpožděním) – proběhne v jeho kontextu, pokud je pořád v riftu a živý
function skillSfx(S) { return S.type === 'melee' || S.type === 'whirl' ? 'swing' : S.arrow ? 'arrow' : S.type === 'nova' ? 'nova' : S.type === 'teleport' ? 'blink' : S.type === 'heal' ? 'potion' : S.type === 'buff' ? 'levelup' : ELEM_SFX[S.elem] || 'shoot'; }

function later(h, ms, fn) {
  setTimeout(() => { if (isHero(h) && !h.dead && G.scene === 'rift') withHero(h, fn); }, ms);
}

function doSkill(S, tx, ty, ang, target) {
  const h = G.hero, st = G.st, W = G.world;
  const ox = h.x, oy = h.y - 6, gx = h.x, gyy = h.y;
  switch (S.type) {
    case 'melee': {
      arcFx(h.x + Math.cos(ang) * 4, oy + Math.sin(ang) * 4, ang, S.arc * Math.PI / 180, S.range + 6, S.color);
      let hit = 0;
      const opt = { skill: S.id, exec: S.exec, vuln: S.vuln, healPct: S.healPct, slow: S.slow };
      G.monsters.forEach(m => {
        if (m.dead) return;
        const d = Math.hypot(m.x - h.x, m.y - h.y);
        if (d > S.range + m.r) return;
        let da = Math.abs(((Math.atan2(m.y - h.y, m.x - h.x) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (da > S.arc * Math.PI / 360 && d > m.r + 4) return;
        for (let i = 0; i < (S.hits || 1) && !m.dead; i++) heroHit(m, S.dmg, S.elem, opt);
        if (S.dot && !m.dead) applyDot(m, S.id, S.dot.elem, st.atk * S.dot.pct * st.dotMul, S.dot.dur + st.dotDur);
        if (S.stun && !m.dead) stunMonster(m, S.stun + st.stunDur, 'stun');
        hit++;
      });
      if (S.hits > 1) for (let i = 1; i < S.hits; i++) setTimeout(() => arcFx(h.x, h.y - 6, ang + rand(-0.4, 0.4), S.arc * Math.PI / 180, S.range + 4, S.color, 0.12), i * 70);
      if (hit) sparks(h.x + Math.cos(ang) * 14, oy + Math.sin(ang) * 14, '#ffffff', 4);
      break;
    }
    case 'projectile': {
      const n = S.count || 1, spread = (S.spread || 0) * Math.PI / 180;
      for (let i = 0; i < n; i++) {
        const a = n > 1 ? ang - spread / 2 + spread * i / (n - 1) : ang;
        G.projs.push({
          x: gx, y: gyy, vx: Math.cos(a), vy: Math.sin(a), speed: S.speed, dmg: S.dmg, elem: S.elem,
          size: S.size || 2, color: S.color, friendly: true, range: S.range || 260, traveled: 0, hits: new Set(), pierce: S.pierce || 0,
          homing: S.homing, explode: S.explode, dot: S.dot, crit: S.crit, armorPen: S.armorPen, arrow: S.arrow, skill: S.id, trail: !S.arrow,
          exec: S.exec, vuln: S.vuln, slow: S.slow, shards: S.shards, owner: h
        });
      }
      if (!S.arrow) sparks(ox + Math.cos(ang) * 8, oy + Math.sin(ang) * 8, S.color, 3);
      break;
    }
    case 'ground': {
      const d = Math.min(200, Math.hypot(tx - h.x, ty - h.y)), a = Math.atan2(ty - h.y, tx - h.x);
      const zx = h.x + Math.cos(a) * d, zy = h.y + Math.sin(a) * d;
      G.zones.push({ x: zx, y: zy, r: S.r, delay: S.delay || 0, dur: S.dur || 0, tick: S.tick || 0.5, tickT: 0, dmg: S.dmg, elem: S.elem,
        slow: S.slow, stun: S.stun, dot: S.dot, pool: S.pool, rain: S.rain, meteor: S.meteor, beam: S.beam, color: S.color, skill: S.id, t: 0, owner: h });
      break;
    }
    case 'nova': {
      const fire = () => {
        if (G.scene !== 'rift') return;
        const hx = G.hero.x, hy = G.hero.y;
        ringFx(hx, hy, S.r, S.color, 0.4, 3); ringFx(hx, hy, S.r * 0.6, '#ffffff', 0.3, 1);
        burst(hx, hy, S.color, 40, S.r * 2.2, { glow: true });
        shake(S.r > 60 ? 4 : 2);
        monstersIn(hx, hy, S.r).forEach(m => {
          if (S.dmg) heroHit(m, S.dmg, S.elem, { skill: S.id, dotBonus: S.dotBonus, vuln: S.vuln, slow: S.slow });
          if (m.dead) return;
          if (S.dot) applyDot(m, S.id, S.dot.elem, st.atk * S.dot.pct * st.dotMul, S.dot.dur + st.dotDur);
          if (S.freeze) stunMonster(m, S.freeze + st.stunDur, 'freeze');
          if (S.stun) stunMonster(m, S.stun + st.stunDur, 'stun');
        });
      };
      if (S.delay) { h.channel = S.delay; for (let i = 0; i < 16; i++) particle(h.x + rand(-40, 40), h.y + rand(-30, 30), { vx: 0, vy: 0, life: S.delay, color: S.color, size: 1, glow: true }); later(h, S.delay * 1000, fire); }
      else fire();
      break;
    }
    case 'leap': {
      const d = Math.min(S.dist, Math.hypot(tx - h.x, ty - h.y)), a = Math.atan2(ty - h.y, tx - h.x);
      const dest = nearestFree(W, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, h.r);
      h.leap = { fx: h.x, fy: h.y, tx: dest.x, ty: dest.y, t: 0, dur: 0.38, S };
      h.invuln = 0.4; h.path = null; h.dest = null;
      break;
    }
    case 'dash': {
      const a = ang;
      h.dash = { vx: Math.cos(a), vy: Math.sin(a), left: S.dist, S, hit: new Set() };
      h.invuln = 0.2; h.path = null; h.dest = null;
      break;
    }
    case 'teleport': {
      const d = Math.min(S.dist, Math.hypot(tx - h.x, ty - h.y)), a = Math.atan2(ty - h.y, tx - h.x);
      burst(h.x, h.y - 6, S.color, 20, 60, { glow: true });
      const dest = nearestFree(W, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, h.r);
      h.x = dest.x; h.y = dest.y; h.path = null; h.dest = null;
      burst(h.x, h.y - 6, S.color, 24, 70, { glow: true }); flashFx(h.x, h.y - 6, 14, S.color);
      break;
    }
    case 'buff': {
      const before = G.st.maxHp;
      h.buffs = h.buffs.filter(b => b.id !== S.id && !(S.form && b.form));   // podoby se vylučují
      h.buffs.push({ id: S.id, name: S.name, stats: S.stats || {}, t: S.dur, dur: S.dur, form: S.form, aura: S.aura, auraT: 0, color: S.color, strafe: S.strafe, strT: 0 });
      invalidate(); G.st = heroStats();
      if (S.form && CLASSES[G.char.cls].shapeshift) healHero(G.st.maxHp * 0.1 * G.st.healMul);   // druid: každá proměna léčí
      if (S.stealth) { h.stealth = S.dur; G.monsters.forEach(m => { if (!m.boss) m.wind = 0; }); smoke(h.x, h.y, 8); }
      if (st.mods['skheal_' + S.id]) healHero(G.st.maxHp * st.mods['skheal_' + S.id] * G.st.healMul);
      ringFx(h.x, h.y, 26, S.color, 0.5, 2); burst(h.x, h.y - 6, S.color, 24, 60, { glow: true });
      if (G.st.maxHp > before) h.hp = Math.min(G.st.maxHp, h.hp * G.st.maxHp / before);
      break;
    }
    case 'tap': {   // Životní pakt: život za manu
      const cost = G.st.maxHp * S.lifeCost;
      h.hp = Math.max(1, h.hp - cost);
      h.res = Math.min(G.st.resMax, h.res + S.resGain);
      floatText(h.x, h.y - 22, '-' + fmt(cost), '#c03060', 0.9);
      for (let i = 0; i < 14; i++) particle(h.x + rand(-6, 6), h.y - rand(0, 14), { vy: rand(-40, -10), life: 0.6, color: S.color, size: 1, glow: true });
      break;
    }
    case 'summon': {
      if (S.skel) {   // nemrtvý: kostlivci (první je kostěný mág, pokud má talent)
        for (let i = 0; i < (S.count || 1); i++) raiseSkeleton(h.x + rand(-14, 14), h.y + rand(-10, 10), S.dur, i === 0 && st.mods.skelMage);
        break;
      }
      if (S.max) {
        const cap = S.max + (S.pet === 'imp' ? (st.petCount || 0) : 0), mine = G.pets.filter(p => p.owner === h && p.type === S.pet && p.life === Infinity && !p.classPet);
        if (mine.length >= cap) { const old = mine[0]; G.pets.splice(G.pets.indexOf(old), 1); smoke(old.x, old.y, 4); }
        spawnPet(S.pet);
      } else for (let i = 0; i < (S.count || 1); i++) spawnPet(S.pet, S.dur);
      break;
    }
    case 'heal': {
      h.buffs = h.buffs.filter(b => b.id !== S.id);
      h.buffs.push({ id: S.id, name: S.name, hot: st.maxHp * S.pct * st.healMul / S.dur, t: S.dur, dur: S.dur, color: S.color });
      for (let i = 0; i < 20; i++) particle(h.x + rand(-8, 8), h.y + rand(-4, 4), { vy: rand(-50, -20), life: 0.8, color: S.color, size: 2, glow: true });
      break;
    }
    case 'whirl':
      h.whirl = S.dur; h.whirlS = S; h.whirlT = 0;
      break;
    case 'petstrike': {
      const t = nearestMonster(tx, ty, 120) || nearestMonster(h.x, h.y, 160);
      if (!t) { floatText(h.x, h.y - 30, 'Žádný cíl', '#aaa', 0.8); break; }
      G.pets.forEach(p => { if (p.owner === h) { p.forceTarget = t; p.strike = S.mult; p.cd = 0; } });
      burst(t.x, t.y - 6, S.color, 12, 50);
      break;
    }
    case 'trap': {
      const mine = G.traps.filter(t => t.skill === S.id && t.owner === h);
      if (mine.length >= S.max + (st.mods.trapMax || 0)) G.traps.splice(G.traps.indexOf(mine[0]), 1);
      const d = Math.min(110, Math.hypot(tx - h.x, ty - h.y)), a = Math.atan2(ty - h.y, tx - h.x);
      const p = nearestFree(W, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, 3);
      G.traps.push({ x: p.x, y: p.y, r: S.r, dmg: S.dmg, elem: S.elem, arm: S.arm, life: S.life, color: S.color, freeze: S.freeze, skill: S.id, owner: h });
      break;
    }
    case 'drain': {
      const t = target && !target.dead && dist(target, h) < S.range ? target : nearestMonster(tx, ty, 80) || nearestMonster(h.x, h.y, S.range);
      if (!t) { floatText(h.x, h.y - 30, 'Žádný cíl', '#aaa', 0.8); h.res += S.cost || 0; delete h.cds[S.id]; break; }
      const dmg = heroHit(t, S.dmg, S.elem, { skill: S.id });
      healHero(dmg * S.heal * st.healMul);
      lineFx(h.x, oy, t.x, t.y - 6, S.color, 0.35, 3);
      for (let i = 0; i < 10; i++) { const f = i / 10; particle(t.x + (h.x - t.x) * f, t.y - 6 + (oy - t.y + 6) * f, { vx: (h.x - t.x) * 0.8, vy: (oy - t.y) * 0.8, life: 0.3, color: S.color, size: 1, glow: true }); }
      break;
    }
  }
}

// Plošné efekty hrdiny (meteor, vánice, mor, hvězdopád…)
// Každá plocha i past se počítá v kontextu hrdiny, který ji vytvořil
function updateZones(dt) {
  filterKeepNew('zones', z => isHero(z.owner) ? withHero(z.owner, () => stepZone(z, dt)) : false);
}
function stepZone(z, dt) {
  const st = G.st;
  {
    z.t += dt;
    if (z.meteor && z.t < z.delay) {
      const p = z.t / z.delay;
      const mx = z.x - 60 * (1 - p), my = z.y - 140 * (1 - p);
      particle(mx, my, { vx: rand(-10, 10), vy: rand(-10, 10), life: 0.3, color: '#ffb040', size: 2, glow: true });
      light(mx, my, 20, '#ff8020');
    }
    if (!z.fired && z.t >= z.delay) {
      z.fired = true;
      if (z.beam) beamFx(z.x, z.y, z.color, 0.4, 12);
      if (z.meteor) { sfx('explode'); burst(z.x, z.y, '#ff8a3a', 50, 140, { glow: true }); shake(5); flashFx(z.x, z.y, z.r, '#ffb040', 0.25); }
      if (z.dmg && !z.rain && !z.dur) {
        ringFx(z.x, z.y, z.r, z.color, 0.35, 2);
        if (!z.meteor) burst(z.x, z.y, z.color, 24, 80, { glow: true });
        monstersIn(z.x, z.y, z.r).forEach(m => {
          heroHit(m, z.dmg, z.elem, { skill: z.skill });
          if (m.dead) return;
          if (z.dot) applyDot(m, z.skill, z.dot.elem, st.atk * z.dot.pct * st.dotMul, z.dot.dur + st.dotDur);
          if (z.stun) stunMonster(m, z.stun + st.stunDur, 'stun');
          if (z.slow) slowMonster(m, z.slow + st.slowBonus, 3);
        });
      } else if (!z.dmg && z.dot) {
        ringFx(z.x, z.y, z.r, z.color, 0.4, 2); burst(z.x, z.y, z.color, 20, 60);
        monstersIn(z.x, z.y, z.r).forEach(m => applyDot(m, z.skill, z.dot.elem, st.atk * z.dot.pct * st.dotMul, z.dot.dur + st.dotDur));
      }
      if (z.pool) { z.dur = z.pool.dur; z.tickDmg = z.pool.pct; z.tick = 0.5; }
    }
    if (z.fired && z.dur) {
      z.tickT -= dt;
      const tickDmg = z.tickDmg || z.dmg;
      if (z.rain) {
        if (z.tickT <= 0) {
          z.tickT = z.tick;
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * z.r;
          const px = z.x + Math.cos(a) * r, py = z.y + Math.sin(a) * r * 0.8;
          lineFx(px - 10, py - 40, px, py, z.color, 0.15, 2);
          burst(px, py, z.color, 8, 50, { glow: true });
          monstersIn(px, py, 16).forEach(m => heroHit(m, tickDmg, z.elem, { noProc: true, skill: z.skill }));
        }
      } else if (z.tickT <= 0) {
        z.tickT = z.tick;
        monstersIn(z.x, z.y, z.r).forEach(m => {
          heroHit(m, tickDmg, z.elem, { noProc: true, skill: z.skill });
          if (!m.dead && z.slow) slowMonster(m, z.slow + st.slowBonus, 1);
        });
      }
      if (Math.random() < dt * 14) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * z.r;
        particle(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r * 0.8, { vx: z.elem === 'frost' ? rand(-20, 0) : 0, vy: z.elem === 'frost' ? 30 : -15, life: 0.6, color: z.color, size: 1, glow: z.elem !== 'shadow' });
      }
      light(z.x, z.y, z.r, z.color);
    }
    return z.t < z.delay + (z.dur || 0) + 0.05;
  }
}

// Pasti
function updateTraps(dt) {
  G.traps = G.traps.filter(t => isHero(t.owner) ? withHero(t.owner, () => stepTrap(t, dt)) : false);
}
function stepTrap(t, dt) {
  {
    t.arm -= dt; t.life -= dt;
    if (t.life <= 0) return false;
    if (t.arm > 0) return true;
    if (nearestMonster(t.x, t.y, 16)) {
      sfx('explode');
      burst(t.x, t.y, t.color, 34, 120, { glow: true });
      ringFx(t.x, t.y, t.r, t.color, 0.35, 3); flashFx(t.x, t.y, t.r, t.color); shake(2.5);
      monstersIn(t.x, t.y, t.r).forEach(m => { heroHit(m, t.dmg, t.elem, { skill: t.skill }); if (t.freeze && !m.dead) stunMonster(m, t.freeze + G.st.stunDur, 'freeze'); });
      return false;
    }
    return true;
  }
}

// Pohybové dovednosti a průběžné efekty hrdiny
function updateHeroSkills(dt) {
  const h = G.hero, st = G.st;
  if (h.leap) {
    const L = h.leap; L.t += dt;
    const p = Math.min(1, L.t / L.dur);
    h.x = L.fx + (L.tx - L.fx) * p; h.y = L.fy + (L.ty - L.fy) * p; h.z = Math.sin(p * Math.PI) * 26;
    if (p >= 1) {
      h.z = 0; h.leap = null;
      const S = L.S;
      ringFx(h.x, h.y, S.r, S.color, 0.4, 3); burst(h.x, h.y, '#a09080', 30, 90); shake(4);
      monstersIn(h.x, h.y, S.r).forEach(m => { heroHit(m, S.dmg, S.elem, { skill: S.id }); if (!m.dead && S.stun) stunMonster(m, S.stun + st.stunDur, 'stun'); });
    }
  }
  if (h.dash) {
    const D = h.dash, step = Math.min(D.left, 420 * dt);
    const moved = moveEntity(G.world, h, D.vx * step, D.vy * step);
    D.left -= step;
    particle(h.x, h.y - 6, { life: 0.25, color: D.S.color, size: 2 });
    if (D.S.dmg) monstersIn(h.x, h.y, D.S.r || 18).forEach(m => {
      if (D.hit.has(m)) return; D.hit.add(m);
      heroHit(m, D.S.dmg, D.S.elem || 'phys', { skill: D.S.id });
      if (!m.dead && D.S.stun) stunMonster(m, D.S.stun + st.stunDur, 'stun');
      sparks(m.x, m.y - 6, '#ffffff', 6);
    });
    if (D.left <= 0 || !moved) h.dash = null;
  }
  if (h.whirl > 0) {
    h.whirl -= dt; h.whirlT -= dt;
    if (h.whirlT <= 0) {
      h.whirlT = 0.25;
      const S = h.whirlS;
      arcFx(h.x, h.y - 6, Math.random() * 6, Math.PI * 2, S.r, S.color, 0.2);
      monstersIn(h.x, h.y, S.r).forEach(m => heroHit(m, S.dmg, S.elem, { skill: S.id }));
      if (st.mods.whirlPull) monstersIn(h.x, h.y, S.r * 2.2).forEach(m => {   // Bouře ocele: vtahuje nepřátele
        if (m.boss || m.obj || m.dead) return;
        const d = Math.max(1, dist(m, h)); moveEntity(G.world, m, (h.x - m.x) / d * 6, (h.y - m.y) / d * 6);
      });
      dust(h.x, h.y + 4);
    }
  }
  if (st.mods.enrageAlways && !h.buffs.some(b => b.id === 'enrage')) triggerEnrage();
  if (h.stealth > 0) h.stealth -= dt;
  h.buffs = h.buffs.filter(b => {
    b.t -= dt;
    if (b.hot) healHero(b.hot * dt, true);
    if (b.strafe && G.scene === 'rift') {   // Palba za běhu: šípy do všech stran
      b.strT -= dt;
      if (b.strT <= 0) {
        b.strT = b.strafe.every;
        const near = G.monsters.filter(m => !m.dead && !m.obj && dist(m, h) < b.strafe.range);
        const t = near.length ? near[Math.floor(Math.random() * near.length)] : null;
        if (t) {
          const a = Math.atan2(t.y - h.y, t.x - h.x);
          G.projs.push({ x: h.x, y: h.y, vx: Math.cos(a), vy: Math.sin(a), speed: 300, dmg: b.strafe.dmg * (1 + (st.mods.skd_strafe || 0)), elem: 'phys', size: 1, color: '#e8e4d4',
            friendly: true, range: 220, traveled: 0, hits: new Set(), pierce: (st.mods.strafePierce || 0) + (st.mods.arrowPierce || 0), arrow: true, skill: 'strafe', owner: h });
          h.face = Math.cos(a) > 0 ? 1 : -1; h.atkAnim = 0.08; h.atkAng = a;
          if (Math.random() < 0.5) sfx('arrow');
        }
      }
    }
    if (b.aura && G.scene === 'rift') {   // aura kolem hrdiny (Hurikán, Démonická proměna)
      b.auraT -= dt;
      const A = skillParams(b.id, st).aura || b.aura;
      if (b.auraT <= 0) {
        b.auraT = A.tick;
        ringFx(h.x, h.y, A.r, b.color, 0.25, 1);
        monstersIn(h.x, h.y, A.r).forEach(m => { heroHit(m, A.dmg, A.elem, { noProc: true, skill: b.id }); if (!m.dead && A.slow) slowMonster(m, A.slow + st.slowBonus, 1); });
      }
      if (Math.random() < dt * 20) { const a = Math.random() * 6.28; particle(h.x + Math.cos(a) * A.r * 0.8, h.y + Math.sin(a) * A.r * 0.5, { vx: -Math.sin(a) * 40, vy: Math.cos(a) * 20, life: 0.4, color: b.color, size: 1, glow: true }); }
    }
    if (b.t <= 0) {
      if (b.id === 'stoneform' && st.mods.stoneQuake && G.scene === 'rift') {   // Otřes na konci Kamenné podoby
        ringFx(h.x, h.y, 60, '#c8a060', 0.4, 3); burst(h.x, h.y, '#a09080', 30, 90); shake(4);
        monstersIn(h.x, h.y, 60).forEach(m => { heroHit(m, st.mods.stoneQuake, 'phys', { noProc: true }); if (!m.dead) stunMonster(m, 1.5 + st.stunDur, 'stun'); });
      }
      if (b.stats) { invalidate(); G.st = heroStats(); }
      return false;
    }
    return true;
  });
}
