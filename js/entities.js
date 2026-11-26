// Entity a souboj: staty hrdiny, nepřátelé a jejich AI, mazlíčci, projektily, plošné efekty, poškození, kořist, XP.

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.floor(n).toLocaleString('cs-CZ');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Staty hrdiny ----------

function addStats(m, stats, times = 1) { for (const k in stats) m[k] = (m[k] || 0) + stats[k] * times; }
function setCounts(ch) {
  const c = {};
  EQUIP_ORDER.forEach(s => { const it = ch.equip[s]; if (it && it.set && it.dur !== 0) c[it.set] = (c[it.set] || 0) + 1; });
  return c;
}
// Stav výbavy pro podmíněné talenty: dvě zbraně, dvě jednoruční, obouručka, štít
function gearConds(ch) {
  const eq = ch.equip, main = eq.main, off = eq.off;
  const dw = !!(main && off && off.slot === 'weapon');
  const c = { dw, dw1: dw && itemHand(main) === 1 && itemHand(off) === 1, dw2: dw && itemHand(main) === 2 && itemHand(off) === 2, th: !!(main && itemHand(main) === 2 && !dw), sh: !!(off && off.type === 'shield') };
  // držené typy zbraní pro bonusy "poškození se sekerou" apod. (klíče axe_atkPct …)
  [main, off].forEach(w => { if (w && w.slot === 'weapon' && w.dur !== 0) c[w.type] = true; });
  return c;
}
// Přičte podmíněné klíče "prefix_stat", pokud je podmínka splněná
function applyConds(m, active) {
  for (const k of Object.keys(m)) {
    const i = k.indexOf('_');
    if (i < 0 || !m[k]) continue;
    const pre = k.slice(0, i);
    if (active[pre]) m[k.slice(i + 1)] = (m[k.slice(i + 1)] || 0) + m[k];
  }
}

function gatherMods(ch) {
  const m = {};
  Object.keys(STAT_LABELS).forEach(k => m[k] = 0);
  TALENT_KEYS.forEach(k => m[k] = 0);
  addStats(m, RACES[ch.race].bonus || {});
  talentNodes(talentKey(ch)).forEach(n => { const v = ch.talents[n.id], st = nodeStats(n, v); if (st) addStats(m, st, n.type === 'passive' ? v : 1); });
  EQUIP_ORDER.forEach(s => {
    const it = ch.equip[s];
    if (!it) return;
    const st = itemStats(it);
    if (s === 'off' && it.slot === 'weapon' && st.atk) st.atk *= Math.min(1, (itemHand(it) === 2 ? OFFHAND_2H_MULT : OFFHAND_WEAPON_MULT) + m.offhand);
    addStats(m, st);
  });
  const sc = setCounts(ch);
  for (const id in sc) for (const need in SETS[id].bonus) if (sc[id] >= +need) addStats(m, SETS[id].bonus[need]);
  applyConds(m, gearConds(ch));
  return m;
}

function invalidate() { G.mods = null; }

function heroStats(ch) {
  ch = ch || G.char;
  if (!G.mods || G.mods.ch !== ch) { G.mods = gatherMods(ch); G.mods.ch = ch; }
  const m = Object.assign({}, G.mods);
  const buffs = (G.hero && G.char === ch) ? G.hero.buffs : [];
  buffs.forEach(b => b.stats && addStats(m, b.stats));
  // talenty platné během buffu / podoby (bear_, enrage_, meta_ …)
  const active = {};
  buffs.forEach(b => active[b.id] = true);
  if (Object.keys(active).length) applyConds(m, active);
  if (m.loneWolf) m.atkPct += m.loneWolf;
  const r = RACES[ch.race], c = CLASSES[ch.cls], L = ch.level - 1;
  // Atributy: hlavní atribut třídy +1 % útoku za bod, vedlejší účinky platí pro všechny
  const mainVal = Math.max(0, ...(c.main || []).map(k => m[k] || 0));
  m.atkPct += mainVal * ATTR_FX.mainAtk;
  m.def += m.str * ATTR_FX.strDef;
  m.crit += m.agi * ATTR_FX.agiCrit;
  m.resAll += m.int * ATTR_FX.intRes;
  m.hpPct += m.sta * ATTR_FX.staHp;
  if (m.titanGrip >= 2 && gearConds(ch).dw2) m.atkPct += 0.08;   // trpaslík s talentem Titánský stisk
  if (c.res.regen > 0) m.resRegenPct += m.spi * ATTR_FX.spiRegen; else m.genPct += m.spi * ATTR_FX.spiGen;
  const lvm = levelMul(ch.level);
  const atk = (r.atk * c.atk * (1 + LVL_ATK * L) + m.atk) * (1 + m.atkPct) * lvm;
  const elemMul = { chaos: 1 };
  ['phys', 'fire', 'frost', 'shadow', 'nature', 'arcane'].forEach(e => elemMul[e] = 1 + m[e + 'Pct']);
  const res = { phys: 0 };
  ['Fire', 'Frost', 'Shadow', 'Nature', 'Arcane'].forEach(e => res[e.toLowerCase()] = Math.min(HERO_RES_CAP, m['res' + e] + m.resAll));
  return {
    maxHp: Math.round((r.hp * c.hp * (1 + LVL_HP * L) + m.hp) * (1 + m.hpPct) * lvm),
    atk,
    def: r.def + c.def + LVL_DEF * L + m.def,
    spd: 1.35 * r.spd * c.spd * (1 + m.spdPct),
    crit: Math.min(0.75, r.crit + m.crit),
    critMult: 2 + m.critDmg,
    ls: Math.min(0.3, (r.ls || 0) + (c.ls || 0) + m.ls) * (1 + m.healPct),
    dodge: Math.min(0.35, m.dodge),
    block: Math.min(0.5, m.block),
    dmgTaken: (1 - Math.min(0.6, m.dmgRed)) * (1 - (c.dr || 0)),   // válečník: Železná kůže (mimo strop 60 %)
    regen: Math.min(0.03, (c.regen || 0) + m.regen) * (1 + m.healPct),
    thorns: m.thorns,
    goldMul: 1 + m.goldPct, dropMul: 1 + m.dropPct, mf: m.mfPct, xpMul: 1 + (m.xpPct || 0),
    elemMul, res,
    armorPen: Math.min(0.8, m.armorPen), resPen: Math.min(0.8, m.resPen),
    execPct: m.execPct, dotMul: 1 + m.dotPct, dotDur: m.dotDur,
    slowBonus: m.slowPct, slowAura: Math.min(0.5, m.slowAura),
    freezeChance: Math.min(0.4, m.freezeChance), stunChance: Math.min(0.3, m.stunChance),
    stunDur: m.stunDur, stunDmg: m.stunDmg,
    double: Math.min(0.5, m.doubleChance),
    healMul: 1 + m.healPct,
    petMul: 1 + m.petPct, petCount: m.petCount,
    rebirth: m.rebirth > 0, titanGrip: m.titanGrip > 0,
    resMax: c.res.max + (m.resMax || 0), resRegen: c.res.regen > 0 ? c.res.regen * (1 + (m.resRegenPct || 0)) : c.res.regen,
    genMul: 1 + (m.genPct || 0), cdr: Math.min(0.5, (m.cdr || 0) + (m.skillCd || 0) * 0.1), skillMul: 1 + (m.skillPct || 0),
    petSpd: m.petSpd || 0, petLs: m.petLs || 0,
    attrs: { str: m.str, agi: m.agi, int: m.int, sta: m.sta, spi: m.spi }, mainVal,
    castMul: 1 + m.castPct, wpnSpdMul: 1 + m.wpnSpd,
    eliteDmg: m.eliteDmg, vs: { undead: m.vsUndead, beast: m.vsBeast, demon: m.vsDemon },
    eliteTaken: 1 - Math.min(0.5, m.eliteRed), rangedTaken: 1 - Math.min(0.5, m.rangedRed), areaTaken: 1 - Math.min(0.5, m.areaRed),
    ccRed: Math.min(0.6, m.ccRed), costRed: Math.min(0.5, m.costRed),
    moveSpeed: 64 * (r.ms || 1) * (c.ms || 1) * Math.max(0.3, 1 + (m.msPct || 0)) * (G.hero && G.hero.whirl > 0 ? 1.3 : 1),
    dotLeech: (c.dotLeech || 0) + (m.dotLeech || 0), barrier: c.barrier || 0, rangeBonus: c.rangeBonus || 0,
    // rozdíl úrovní vůči podzemí (víc poškození od nepřátel / méně poškození nepřátelům)
    gap: G.rift && G.rift.level ? levelGapMul(G.rift.level, ch.level) : 1,
    mods: m
  };
}

// Parametry dovednosti po vylepšeních z talentů
function skillParams(id, st) {
  const S = Object.assign({}, SKILLS[id]), m = st.mods, k = p => m[p + '_' + id] || 0;
  S.id = id;
  const dm = 1 + k('skd'), rm = 1 + k('skr');
  S.dmg = (S.dmg || 0) * dm;
  if (S.type === 'heal') S.pct *= dm;
  if (S.mult) S.mult *= dm;
  if (S.explode) S.explode = Object.assign({}, S.explode, { dmg: S.explode.dmg * dm, r: S.explode.r * rm });
  if (S.r) S.r *= rm;
  if (S.aura) S.aura = Object.assign({}, S.aura, { r: S.aura.r * rm, dmg: S.aura.dmg * dm * (1 + (m.auraPct || 0)) });
  if (S.range && S.type === 'melee') S.range *= rm;
  if (k('skc')) { S.count = (S.count || 1) + k('skc'); if (S.type === 'projectile' && !S.spread) S.spread = 22; }
  if (S.primary && S.type === 'projectile') {
    const moon = id === 'wrath' && G.hero && G.char && CLASSES[G.char.cls].shapeshift && G.hero.buffs.some(b => b.form === 'moonkin');   // druid v měsíční podobě
    const extra = (m.primCount || 0) + (moon ? 1 : 0);
    if (extra) { S.count = (S.count || 1) + extra; S.spread = S.spread || 16; }
    S.pierce = (S.pierce || 0) + (m.primPierce || 0);
  }
  if (S.arrow) S.pierce = (S.pierce || 0) + (m.arrowPierce || 0);
  if (k('skpierce')) S.pierce = (S.pierce || 0) + k('skpierce');
  if (S.dur) S.dur += k('skdur') + (S.form ? (m.formDur || 0) : 0);
  if (S.cd) S.cd = Math.max(0.3, S.cd - k('skcd'));
  if (S.cost) S.cost *= 1 - Math.min(0.8, k('skcost') + (st.costRed || 0));
  if (S.lifeCost) S.lifeCost *= 1 - Math.min(0.8, k('skcost'));
  S.gen = (S.gen || 0) + k('skgen');
  if (k('skstun')) S.stun = (S.stun || 0) + k('skstun');
  if (k('skslow')) S.slow = (S.slow || 0) + k('skslow');
  if (S.dot && k('skdot')) S.dot = Object.assign({}, S.dot, { pct: S.dot.pct * (1 + k('skdot')) });
  if (k('skhits')) S.hits = (S.hits || 1) + k('skhits');
  return S;
}
// Skutečná cena dovednosti po talentech (pro lištu a kontrolu zdroje)
function skillCost(id) { const S = SKILLS[id]; if (!S || !S.cost) return 0; return S.cost * (1 - Math.min(0.8, ((G.st && G.st.mods['skcost_' + id]) || 0) + ((G.st && G.st.costRed) || 0))); }

// Rozzuření (válečník): +10 % útok a +15 % rychlost útoku
function triggerEnrage() {
  const h = G.hero, M = G.st.mods;
  if (!h || h.dead) return;
  const dur = M.enrageAlways ? Infinity : 5 + (M.enrageDur || 0);
  const b = h.buffs.find(x => x.id === 'enrage');
  if (b) { b.t = Math.max(b.t, dur); return; }
  h.buffs.push({ id: 'enrage', name: 'Rozzuření', glyph: '💢', stats: { atkPct: 0.10, spdPct: 0.15 }, t: dur, dur, color: '#ff3030' });
  invalidate(); G.st = heroStats();
  floatText(h.x, h.y - 30, 'Rozzuření!', '#ff5050', 0.9);
}
function hasFireDot(m) { for (const k in m.dots) if (m.dots[k].elem === 'fire') return true; return false; }

// ---------- Poškození ----------

function resFactor(m, elem, st, extraPen) {
  if (elem === 'chaos') return 1;
  let r = m.res[elem] || 0;
  if (r > 0) r *= 1 - Math.min(0.9, elem === 'phys' ? st.armorPen + (extraPen || 0) : st.resPen);
  return 1 - r;
}

// Poškodí nepřítele. o: { crit, armorPen, dot, label, noProc }
function dealDamage(m, raw, elem, o = {}) {
  if (!m || m.dead) return 0;
  const st = G.st;
  if (m.immune) {   // boss nebo objekt je nezranitelný
    if (!(m.immTxtT > G.time)) { m.immTxtT = G.time + 0.6; floatText(m.x, m.y - m.r * 2 - 6, 'Nezranitelný', '#a0a0b0', 0.9); }
    m.hitT = 0.06; return 0;
  }
  raw *= (st.elemMul[elem] || 1) / (st.gap || 1);
  if (m.hp < m.maxHp * 0.3) raw *= 1 + st.execPct;
  if (m.stunT > 0) raw *= 1 + st.stunDmg;
  const fam = m.def && m.def.fam;
  if (fam && st.vs[fam]) raw *= 1 + st.vs[fam];
  if ((m.elite || m.boss) && st.eliteDmg) raw *= 1 + st.eliteDmg;
  if (m.vulnT > 0) raw *= 1.2 + (st.mods.vulnPct || 0);
  if (m.exposedT > 0) raw *= BOSS_EXPOSED_MUL;   // vyčerpaný boss
  if (m.dr) raw *= 1 - m.dr;                     // ochrana (např. od kostlivců Kostěného krále)
  let dmg = Math.max(1, Math.round(raw * rand(0.9, 1.1) * resFactor(m, elem, st, o.armorPen)));
  if (m.shield > 0) {   // štít pohltí poškození
    const a = Math.min(m.shield, dmg);
    m.shield -= a; dmg -= a;
    m.hitT = 0.12;
    if (!o.dot) floatText(m.x, m.y - m.r * 2 - 6, fmt(a), '#c8c8d0', 0.9);
    if (m.shield <= 0 && m.boss) bossShieldBroken(m);
    if (dmg <= 0) return a;
  }
  m.hp -= dmg;
  if (m.boss) { if (m.channel) m.channel.dmg += dmg; bossClampHp(m); }
  m.hitT = 0.12;
  m.aggro = true;
  if (!o.dot) m.knock = 0.08;
  if (!o.dot) sfx(o.crit ? 'crit' : 'hit');
  const col = o.crit ? '#ffd23f' : (elem === 'phys' ? '#ffffff' : ELEMENTS[elem].color);
  floatText(m.x, m.y - m.r * 2 - 6, (o.crit ? fmtBig(dmg) + '!' : fmtBig(dmg)), col, o.crit ? 1.35 : (o.dot ? 0.8 : 1));
  if (!o.noProc && !o.dot) {
    if (st.ls > 0) healHero(dmg * st.ls, true);
    if (st.freezeChance && Math.random() < st.freezeChance) stunMonster(m, 1.5 + st.stunDur, 'freeze');
    else if (st.stunChance && Math.random() < st.stunChance) stunMonster(m, 1 + st.stunDur, 'stun');
  }
  if (m.hp <= 0) killMonster(m);
  return dmg;
}

// Zásah hrdiny. o: { crit, armorPen, noProc, skill, exec, vuln, healPct, dotBonus, slow }
function heroHit(m, mult, elem, o = {}) {
  if (!m || m.dead) return 0;
  const st = G.st, M = st.mods, id = o.skill, S = id ? SKILLS[id] : null, h = G.hero;
  const k = p => (id && M[p + '_' + id]) || 0;
  const crit = o.crit || (h.ambushT > G.time && !o.dot) || Math.random() < st.crit + k('skcrit');
  if (S && !S.primary) mult *= st.skillMul;
  if (m.hp < m.maxHp * 0.3) mult *= 1 + (o.exec || 0) + k('skexec');
  const dotted = Object.keys(m.dots).length > 0;
  if (dotted) mult *= (1 + (o.dotBonus || 0)) * (1 + (M.dottedBonus || 0));
  if (M.burnBonus && hasFireDot(m)) mult *= 1 + M.burnBonus;
  if (M.slowedBonus && (m.slowT > 0 || (m.stunT > 0 && m.stunKind === 'freeze'))) mult *= 1 + M.slowedBonus;
  if (M.lowHpDmg && h.hp < st.maxHp * 0.5) mult *= 1 + M.lowHpDmg;
  if (M.orcRage && h.hp < st.maxHp * 0.5) mult *= 1 + 0.2 * (M.orcRage2 ? 2 : 1);   // ork: Krvavý vztek
  if (st.rangeBonus && !o.dot) mult *= 1 + clamp((dist(h, m) - 40) / 1000, 0, st.rangeBonus);   // lovec: čím dál, tím víc
  let ambush = false;
  if (h.ambushT > G.time && !o.dot) { ambush = true; h.ambushT = 0; mult *= 2 + (M.stealthDmg || 0); }   // útok ze stínu (elf)
  if (id === 'execute' && M.executeKill && !m.boss && !m.obj && m.hp < m.maxHp * 0.2) {   // Popravčí: okamžité zabití
    dealDamage(m, m.hp * 10, 'chaos', { crit: true, noProc: true });
    if (m.dead) { delete h.cds.execute; floatText(m.x, m.y - m.r * 2 - 16, 'Poprava!', '#ff5050', 1); return m.maxHp; }
  }
  const dmg = dealDamage(m, st.atk * mult * (crit ? st.critMult : 1), elem, Object.assign({}, o, { crit }));
  // efekty po zásahu
  if (crit && !o.noProc) {
    if (M.enrageChance && Math.random() < M.enrageChance) triggerEnrage();
    if (M.critRes && !(h.critResT > G.time)) { h.critResT = G.time + 0.15; h.res = Math.min(st.resMax, h.res + M.critRes); }
  }
  const heal = (o.healPct || 0) + k('skheal');
  if (heal && dmg) healHero(dmg * heal * st.healMul, true);
  if (m.dead) { if (k('skkillres')) h.res = Math.min(st.resMax, h.res + k('skkillres')); return dmg; }
  const vuln = (o.vuln || 0) + k('skvuln');
  if (vuln) m.vulnT = Math.max(m.vulnT || 0, vuln);
  const dd = st.dotDur;
  if (k('skburn')) applyDot(m, id + '_burn', 'fire', st.atk * k('skburn') * st.dotMul, 4 + dd);
  if (k('skbleed')) applyDot(m, id + '_bleed', 'phys', st.atk * k('skbleed') * st.dotMul, 5 + dd);
  if (elem === 'fire' && M.ignite && Math.random() < M.ignite) applyDot(m, 'ignite', 'fire', st.atk * 0.4 * st.dotMul, 4 + dd);
  if (S && S.primary && S.type === 'melee' && M.bleedHit) applyDot(m, 'bleed', 'phys', st.atk * M.bleedHit * st.dotMul, 4 + dd);
  if (o.slow) slowMonster(m, o.slow + st.slowBonus, 3);
  if (S && !S.primary && M.skillSlow) slowMonster(m, M.skillSlow, 2);
  if (k('skfreeze') && Math.random() < k('skfreeze')) stunMonster(m, 1.5 + st.stunDur, 'freeze');
  return dmg;
}

function applyDot(m, key, elem, dps, dur) { if (!m.dead) m.dots[key] = { elem, dps, t: dur, tick: 1, owner: G.hero }; }
function slowMonster(m, pct, dur) {
  m.slowPct = Math.max(m.slowT > 0 ? m.slowPct : 0, Math.min(0.7, pct));
  m.slowT = Math.max(m.slowT, dur);
}
function stunMonster(m, dur, kind) {
  if (m.dead) return;
  if (m.boss && m.channel) bossInterrupt(m);
  if (m.stunImm > 0 || m.obj || m.immune || (m.boss && m.act && m.act.lock)) return;
  if (m.boss) dur *= 0.4;
  m.stunT = dur; m.stunImm = dur + 1.2; m.stunKind = kind;
  m.wind = 0;
  floatText(m.x, m.y - m.r * 2 - 14, kind === 'freeze' ? 'Zmrazen' : 'Omráčen', kind === 'freeze' ? '#8fd8ff' : '#ffe08a', 0.8);
}

function healHero(n, quiet) {
  const h = G.hero;
  if (h.dead) return;
  const before = h.hp;
  h.hp = Math.min(G.st.maxHp, h.hp + n);
  if (!quiet && h.hp - before >= 1) floatText(h.x, h.y - 22, '+' + fmt(h.hp - before), '#7fe07f');
}

// Dočasný bonus hrdiny (obnoví se, pokud už běží)
function heroBuff(id, name, stats, dur, color) {
  const h = G.hero, b = h.buffs.find(x => x.id === id);
  if (b) { b.t = Math.max(b.t, dur); return b; }
  const nb = { id, name, stats, t: dur, dur, color };
  h.buffs.push(nb); invalidate(); G.st = heroStats();
  return nb;
}
// Kostlivci hrdiny (rasa nemrtvých)
function skeletonsOf(h) { return G.pets.filter(p => p.owner === h && p.def.skel); }
// Reakce na zásah (rasové a třídní talenty): pomsta, druhý dech, kamenná krev, ledová zbroj
function onHeroHurt(dmg, src) {
  const h = G.hero, st = G.st, M = st.mods;
  if (h.hp <= 0) return;
  if (M.revenge && dmg > st.maxHp * 0.1) heroBuff('revenge', 'Pomsta', { atkPct: M.revenge }, 4, '#ff6040');
  if (M.secondWind && h.hp < st.maxHp * 0.3 && !(h.swT > G.time)) {
    h.swT = G.time + 60; healHero(st.maxHp * M.secondWind * st.healMul); floatText(h.x, h.y - 34, 'Druhý dech!', '#ffe08a', 1);
  }
  if (M.stoneSkin && h.hp < st.maxHp * 0.35 && !(h.ssT > G.time)) {
    h.ssT = G.time + 60; heroBuff('stoneskin', 'Kamenná krev', { dmgRed: M.stoneSkin }, 6, '#b0a090'); floatText(h.x, h.y - 34, 'Kamenná krev!', '#d0c0a0', 1);
  }
  if (M.frostArmor && src && !src.boss && !src.obj && !src.dead && dist(src, h) < 34 && !(src.frostArmorT > G.time)) {
    src.frostArmorT = G.time + 4; stunMonster(src, M.frostArmor, 'freeze');
  }
}

// Zasažení hrdiny
function hurtHero(raw, elem, src, pctHp) {
  const h = G.hero, st = G.st;
  if (h.dead || h.invuln > 0 || G.scene !== 'rift') return 0;
  if (Math.random() < st.dodge) {
    floatText(h.x, h.y - 20, 'Úhyb', '#9fd3ff', 0.9);
    if (st.mods.dodgeAtk) heroBuff('reflex', 'Rychlé reflexy', { atkPct: st.mods.dodgeAtk }, 3, '#9fd3ff');
    return 0;
  }
  h.lastHitT = G.time;
  const k = 15 + 4 * G.rift.level;
  const def = Math.max(0, st.def) * (elem === 'phys' ? 1 : 0.5);
  const res = elem === 'phys' ? 0 : (st.res[elem] || 0);
  let dmg = raw * rand(0.9, 1.1) * (k / (k + def)) * (1 - res) * st.dmgTaken;
  if (pctHp) dmg += st.maxHp * pctHp * (1 - res) * st.dmgTaken;
  dmg *= (G.partyMul || 1) * (st.gap || 1);   // víc hráčů = silnější nepřátelé; nižší úroveň = víc poškození
  if (src && (src.elite || src.boss)) dmg *= st.eliteTaken;
  let blocked = false;
  if (Math.random() < st.block) { dmg *= 0.5; blocked = true; }
  if (st.mods.boneShield) dmg *= 1 - Math.min(0.3, st.mods.boneShield * skeletonsOf(h).length);   // nemrtvý: Kostěný štít
  if (h.barrier > 0) {   // mág: Arkánní bariéra
    const a = Math.min(h.barrier, dmg); h.barrier -= a; dmg -= a;
    if (h.barrier <= 0) floatText(h.x, h.y - 30, 'Bariéra praskla', '#9fc8ff', 0.8);
    if (dmg <= 0) { floatText(h.x, h.y - 22, fmtBig(a), '#9fc8ff', 0.8); return 0; }
  }
  if (st.mods.manaShield > 0 && h.res > 0) {   // mana pohltí část poškození (1 mana = 2 poškození)
    const absorb = Math.min(dmg * Math.min(0.9, st.mods.manaShield), h.res * 2);
    h.res -= absorb / 2; dmg -= absorb;
  }
  if (!isFinite(dmg)) return 0;   // pojistka proti chybným číslům
  dmg = Math.max(1, Math.round(dmg));
  h.hp -= dmg;
  h.hitT = 0.15;
  onHeroHurt(dmg, src);
  sfx('hurt');
  floatText(h.x, h.y - 22, (blocked ? 'Blok ' : '') + fmtBig(dmg), elem === 'phys' ? '#ff6b6b' : ELEMENTS[elem].color, 1);
  if (dmg > st.maxHp * 0.15 && !G.remoteCtx) shake(3);
  if (src && src.elite && src.elite.includes('vampire')) { src.hp = Math.min(src.maxHp, src.hp + dmg * 0.5); }
  if (src && st.thorns > 0 && !src.dead) dealDamage(src, dmg * st.thorns / (st.elemMul.phys || 1), 'phys', { noProc: true });
  wearArmor();
  if (h.hp <= 0) heroDeath();
  return dmg;
}

// ---------- Odolnost předmětů ----------

function wearArmor() {
  const h = G.hero;
  h.hitsTaken = (h.hitsTaken || 0) + 1;
  if (h.hitsTaken % 14) return;
  const slots = EQUIP_ORDER.filter(s => s !== 'main' && s !== 'off' && G.char.equip[s] && G.char.equip[s].dur > 0);
  if (slots.length) damageItem(G.char.equip[pick(slots)], 1);
}
function wearWeapon() {
  const h = G.hero;
  h.attacks = (h.attacks || 0) + 1;
  if (h.attacks % 45) return;
  const w = G.char.equip.main;
  if (w && w.dur > 0) damageItem(w, 1);
}
function damageItem(it, n) {
  if (it.dur === undefined) return;
  const was = it.dur;
  it.dur = Math.max(0, it.dur - n);
  if (it.dur !== was) netReward({ dur: [it.uid, it.dur] });
  if (was > 0 && it.dur === 0) { toast(`${it.name} se rozbil! Oprav ho u kováře.`); invalidate(); }
  else if (was > it.maxDur * 0.2 && it.dur <= it.maxDur * 0.2) toast(`${it.name}: nízká odolnost`);
}

// ---------- Nepřátelé ----------

function spawnMonster(typeId, x, y, o = {}) {
  const def = MONSTERS[typeId], L = G.rift.level;
  const m = {
    kind: 'monster', type: typeId, def, name: def.name, sprite: def.sprite, pal: def.pal || null, scale: o.scale || 1,
    x, y, r: def.r * (o.scale || 1), fly: def.fly,
    maxHp: Math.round(def.hp * riftHpMul(L) * (o.hpMul || 1) * (G.partyMul || 1)), atk: def.atk * riftAtkMul(L) * (o.atkMul || 1),
    spd: def.spd, res: Object.assign({}, def.res), atkElem: def.atkElem, ai: def.ai,
    xp: def.xp, pts: def.pts, gold: GOLD_BASE * goldPow(riftIlvl(L)),
    dots: {}, slowT: 0, slowPct: 0, stunT: 0, stunImm: 0, cd: rand(0.5, 1.5), spec: rand(1, 3), wind: 0,
    aggro: false, face: 1, hitT: 0, bob: Math.random() * 6, pack: o.pack || null, affT: rand(1, 3)
  };
  // dav („jatka“): běžný nepřítel z velké skupiny – slabší a s menšími odměnami (m.rw = podíl odměn)
  m.rw = 1;
  if (o.crowd && !o.elite) {
    m.rw = 1 / RIFT.crowd;
    m.maxHp = Math.max(1, Math.round(m.maxHp * RIFT.crowdHp)); m.atk *= RIFT.crowdAtk;
    m.xp *= m.rw; m.pts *= m.rw; m.gold *= m.rw;
  }
  m.hp = m.maxHp;
  if (o.elite) {
    m.elite = o.elite; m.tint = ELITE_AFFIXES[o.elite[0]].color;
    m.maxHp = m.hp = Math.round(m.maxHp * ELITE_MULT.hp); m.atk *= ELITE_MULT.atk;
    m.xp *= ELITE_MULT.xp; m.pts *= ELITE_MULT.pts; m.gold *= ELITE_MULT.gold;
    o.elite.forEach(a => {
      const A = ELITE_AFFIXES[a];
      for (const k in A.res) m.res[k] = Math.max(m.res[k] || 0, A.res[k]);
      if (A.atkElem) m.atkElem = A.atkElem;
      if (a === 'fast') m.spd *= 1.4;
    });
    m.name = o.elite.map(a => ELITE_AFFIXES[a].name).join(' ') + ' ' + def.name.toLowerCase();
  }
  if (o.minion) m.minion = true;
  m.nid = newNid();
  G.monsters.push(m);
  return m;
}

function monsterColors(m) {
  const sp = getSprite(m.sprite), pal = Object.assign({}, sp.pal, m.pal || {});
  return Object.keys(pal).filter(k => k !== 'k').map(k => pal[k]);
}

function killMonster(m) {
  if (m.dead) return;
  m.dead = true;
  sfx(m.boss ? 'explode' : 'die');
  const st = G.st;
  debris(m.x, m.y, monsterColors(m), m.boss ? 40 : 14);
  if (m.boss) { shake(6); burst(m.x, m.y, '#ffd060', 50, 120, { glow: true }); }
  onKillTalents(m, st);
  // odměny: zkušenosti dostane každý hrdina, zlato a předměty padají každému zvlášť (vidí je jen on)
  const L = G.rift.level;
  eachHero(() => gainXP(m.xp * 2.5 * riftXpMul(L) * G.st.xpMul));
  if (m.onDeath) m.onDeath(m);
  if (m.obj) { if (Math.random() < 0.25) G.loot.push({ kind: 'globe', x: m.x, y: m.y, t: 0 }); return; }
  if (!m.boss) addProgress(m.pts);
  const gold = !m.minion || Math.random() < 0.3;
  eachHero(() => {
    const st = G.st;
    if (gold) dropGold(m.x, m.y, m.gold * st.goldMul * rand(0.7, 1.3) * (m.boss ? 15 : 1));
    const dropC = (m.elite ? RIFT.eliteDrop : RIFT.dropChance * (m.rw || 1)) * st.dropMul * (1 + RIFT.dropPerLevel * L);
    if (m.boss) {
      const n = 3 + rnd(3); for (let i = 0; i < n; i++) dropItem(m.x + rand(-20, 20), m.y + rand(-20, 20), true);
      // mýtický předmět: jen z bossů od podzemí 150, šance 1 %
      if (G.rift.level >= RARITIES.mythic.minRift && Math.random() < MYTHIC_CHANCE) dropItem(m.x, m.y, true, 'mythic');
    }
    else if (Math.random() < dropC) dropItem(m.x, m.y, false);
  });
  if (Math.random() < (m.elite ? 0.6 : RIFT.globeChance * ((m.rw || 1) < 1 ? RIFT.crowdGlobe : 1))) G.loot.push({ kind: 'globe', x: m.x + rand(-6, 6), y: m.y + rand(-6, 6), t: 0 });
  if (m.def && m.def.split && m.scale >= 1) for (let i = 0; i < 2; i++) {
    const s = spawnMonster(m.type, m.x + rand(-6, 6), m.y + rand(-6, 6), { scale: 0.65, hpMul: 0.35, minion: true, crowd: (m.rw || 1) < 1 });
    s.aggro = true; s.pts = 0.2 * s.rw; s.xp = 0.3 * s.rw;
  }
  if (m.elite && m.elite.includes('molten')) hazard({ x: m.x, y: m.y, r: 30, delay: 1.1, dmg: m.atk * 1.6, elem: 'fire', color: '#ff6a2a' });
  if (m.ai === 'exploder' && !m.exploded) explodeBloater(m);
  if (m.boss) bossDefeated(m);
}

function onKillTalents(m, st) {
  const M = st.mods, h = G.hero;
  if (!h || h.dead) return;
  if (M.killRes) h.res = Math.min(st.resMax, h.res + M.killRes);
  if (M.raiseOnKill && !m.boss && !m.obj && Math.random() < M.raiseOnKill) raiseSkeleton(m.x, m.y, 10);   // Vzkříšení padlých
  if (M.furyExtend) { const b = h.buffs.find(x => x.id === 'bloodfury'); if (b) b.t = Math.min(b.dur + 10, b.t + 1); }
  if (M.killHeal) healHero(st.maxHp * M.killHeal * st.healMul, true);
  if (M.shatter && m.stunT > 0 && m.stunKind === 'freeze') {   // Tříštění
    burst(m.x, m.y, '#bfe8ff', 30, 110, { glow: true }); ringFx(m.x, m.y, 36, '#8fd8ff', 0.3, 2);
    monstersIn(m.x, m.y, 36).forEach(o => { if (o !== m) dealDamage(o, st.atk * M.shatter * (st.elemMul.frost || 1), 'frost', { noProc: true }); });
  }
  const keys = Object.keys(m.dots);
  if (M.dotSpread && keys.length) {   // Nákazlivost: kletby přeskočí dál
    G.monsters.filter(o => !o.dead && o !== m && dist(o, m) < 80).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, M.dotSpread).forEach(o => {
      keys.forEach(kk => { const d = m.dots[kk]; o.dots[kk] = { elem: d.elem, dps: d.dps, t: Math.max(d.t, 3), tick: 1, owner: d.owner }; });
      lineFx(m.x, m.y - 6, o.x, o.y - 6, '#a050ff', 0.3, 1);
    });
  }
}

function explodeBloater(m) {
  m.exploded = true;
  sfx('explode');
  burst(m.x, m.y, '#9ac040', 30, 110);
  ringFx(m.x, m.y, 36, '#9ac040', 0.35, 3);
  shake(2);
  eachHero(h => { if (dist(m, h) < 38) hurtHero(m.atk * 1.4, m.atkElem, m); }, true);
  hazard({ x: m.x, y: m.y, r: 20, delay: 0, dur: 3, dps: m.atk * 0.25, elem: 'nature', color: '#7ab03a', pool: true });
}

// Pohyb nepřítele k bodu: přímo, nebo podle mapy vzdáleností kolem stěn
function monsterMoveToward(m, tx, ty, speed, dt) {
  const W = G.world;
  let dx = tx - m.x, dy = ty - m.y;
  if (!m.fly && G.flow && !lineClear(W, m.x, m.y, tx, ty, m.r)) {
    const cx = Math.floor(m.x / TILE), cy = Math.floor(m.y / TILE);
    let best = G.flow[cy * W.w + cx], bx = cx, by = cy;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = G.flow[(cy + oy) * W.w + cx + ox];
      if (v >= 0 && (best < 0 || v < best)) { best = v; bx = cx + ox; by = cy + oy; }
    }
    dx = bx * TILE + 8 - m.x; dy = by * TILE + 8 - m.y;
  }
  const d = Math.hypot(dx, dy) || 1;
  if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1;
  const mv = Math.min(d, speed * dt);
  if (m.fly) { m.x += dx / d * mv; m.y += dy / d * mv; if (circleBlocked(W, m.x, m.y, 2)) { m.x -= dx / d * mv; m.y -= dy / d * mv; } }
  else moveEntity(W, m, dx / d * mv, dy / d * mv);
  m.walk = (m.walk || 0) + dt;
}

function monsterShoot(m, tx, ty, o = {}) {
  const a = Math.atan2(ty - m.y, tx - m.x), P = m.def.proj || {};
  G.projs.push({
    x: m.x, y: m.y, vx: Math.cos(a), vy: Math.sin(a), speed: o.speed || P.speed || 140, dmg: o.dmg || m.atk, elem: o.elem || P.elem || m.atkElem,
    size: o.size || 2, color: o.color || P.color || ELEMENTS[m.atkElem].color, friendly: false, range: o.range || 260, traveled: 0, owner: m, arrow: m.type === 'archer',
    pool: o.pool, slow: o.slow, pct: o.pct, seek: o.seek, hook: o.hook, burst: o.burst, chain: o.chain, orbFx: o.orbFx, trail: o.orbFx
  });
}

// Cíl nepřítele: nejbližší živý hrdina (chvíli se ho drží, boss déle)
function monsterTarget(m) {
  const cur = m.tgt;
  if (G.heroes.length <= 1) return G.heroes[0] || G.hero;
  if (cur && !cur.dead && isHero(cur) && (m.tgtT || 0) > G.time) return cur;
  m.tgt = nearestHero(m.x, m.y) || (isHero(cur) ? cur : G.heroes[0]);
  m.tgtT = G.time + (m.boss ? 4 : 1.2);
  return m.tgt;
}

function updateMonster(m, dt) {
  m.hitT -= dt; m.knock = Math.max(0, (m.knock || 0) - dt);
  m.stunT -= dt; m.stunImm -= dt; m.slowT -= dt; if (m.vulnT > 0) m.vulnT -= dt;
  // poškození v čase (počítá se staty toho, kdo ho způsobil)
  for (const k in m.dots) {
    const d = m.dots[k];
    d.t -= dt; d.tick -= dt;
    if (d.tick <= 0) { d.tick += 1; withHero(isHero(d.owner) ? d.owner : G.hero, () => { const dd = dealDamage(m, d.dps, d.elem, { dot: true }); if (G.st.dotLeech && dd) healHero(dd * G.st.dotLeech * G.st.healMul, true); }); if (m.dead) return; }
    if (d.t <= 0) delete m.dots[k];
  }
  withHero(monsterTarget(m), () => monsterThink(m, dt));
}

// Chování nepřítele vůči jeho cíli (běží v kontextu cílového hrdiny: G.hero = cíl)
function monsterThink(m, dt) {
  const h = G.hero;
  if (m.obj) return updateBossObject(m, dt);
  if (m.stunT > 0) return;
  if (h.stealth > 0 && !m.boss) { m.walk = 0; m.wind = 0; return; }   // elf ve stínu: nepřátelé ho nevidí
  const d = dist(m, h);
  if (!m.aggro && d < 150 && (m.fly || lineOfSight(G.world, m.x, m.y, h.x, h.y))) alertPack(m);
  if (!m.aggro || h.dead) { m.walk = 0; return; }
  if (m.boss) return updateBoss(m, dt, d);

  let slow = m.slowT > 0 ? m.slowPct : 0;
  for (const x of G.heroes) { const xs = heroSt(x); if (xs && xs.slowAura && !x.dead && dist(m, x) < 70) slow = Math.max(slow, xs.slowAura); }
  slow = Math.min(0.7, slow);
  const fast = m.elite && m.elite.includes('fast') ? 1.35 : 1;
  const spd = m.spd * (1 - slow);
  m.cd -= dt * (1 - slow) * fast; m.spec -= dt * (1 - slow);
  if (m.elite) updateEliteAffixes(m, dt, d);

  // rozběh (nabíhač)
  if (m.charging) {
    m.charging.t -= dt;
    if (m.charging.t > 0) {
      if (m.charging.windup > 0) { m.charging.windup -= dt; return; }
      moveEntity(G.world, m, m.charging.vx * 190 * dt, m.charging.vy * 190 * dt);
      dust(m.x, m.y + 4);
      if (!m.charging.hit && dist(m, h) < m.r + h.r + 4) { m.charging.hit = true; hurtHero(m.atk * 1.5, m.atkElem, m); shake(2); }
      return;
    }
    m.charging = null;
  }
  // nápřah útoku
  if (m.wind > 0) {
    m.wind -= dt;
    if (m.wind <= 0) monsterStrike(m, d);
    return;
  }
  // výbušný: zápalná šňůra
  if (m.fuse !== undefined) {
    m.fuse -= dt;
    if (m.fuse <= 0) { m.hp = 0; explodeBloater(m); killMonster(m); }
    return;
  }
  const range = m.r + h.r + 6;
  switch (m.ai) {
    case 'melee': case 'swarm':
      if (d > range) monsterMoveToward(m, h.x, h.y, spd, dt);
      else if (m.cd <= 0) { m.wind = m.ai === 'swarm' ? 0.2 : 0.35; m.cd = m.ai === 'swarm' ? 0.9 : 1.3; }
      break;
    case 'ranged': {
      const los = lineOfSight(G.world, m.x, m.y, h.x, h.y);
      if (d < 70) monsterMoveToward(m, m.x - (h.x - m.x), m.y - (h.y - m.y), spd * 0.8, dt);
      else if (d > 140 || !los) monsterMoveToward(m, h.x, h.y, spd, dt);
      if (los && d < 170 && m.cd <= 0) { m.wind = 0.45; m.cd = 2.0; }
      break;
    }
    case 'caster': {
      const los = lineOfSight(G.world, m.x, m.y, h.x, h.y);
      if (d > 130 || !los) monsterMoveToward(m, h.x, h.y, spd, dt);
      else if (d < 60) monsterMoveToward(m, m.x - (h.x - m.x), m.y - (h.y - m.y), spd * 0.7, dt);
      if (los && d < 170 && m.cd <= 0) { m.wind = 0.5; m.cd = 3.0; }
      break;
    }
    case 'charger': {
      const los = lineOfSight(G.world, m.x, m.y, h.x, h.y);
      if (los && d > 40 && d < 140 && m.spec <= 0) {
        const a = Math.atan2(h.y - m.y, h.x - m.x);
        m.charging = { vx: Math.cos(a), vy: Math.sin(a), t: 1.05, windup: 0.55, hit: false };
        m.face = Math.cos(a) > 0 ? 1 : -1;
        hazardLine(m.x, m.y, a, 120, 0.55);
        m.spec = 4;
      } else if (d > range) monsterMoveToward(m, h.x, h.y, spd, dt);
      else if (m.cd <= 0) { m.wind = 0.3; m.cd = 1.2; }
      break;
    }
    case 'exploder':
      if (d > 16) monsterMoveToward(m, h.x, h.y, spd * 1.2, dt);
      else m.fuse = 0.7;
      break;
  }
}

function monsterStrike(m, d) {
  const h = G.hero;
  if (m.ai === 'ranged') { monsterShoot(m, h.x, h.y); return; }
  if (m.ai === 'caster') {
    hazard({ x: h.x, y: h.y, r: 22, delay: 1.1, dmg: m.atk * 1.4, elem: m.atkElem, color: ELEMENTS[m.atkElem].color });
    return;
  }
  m.atkAnim = 0.15;
  if (d <= m.r + h.r + 12) hurtHero(m.atk, m.atkElem, m);
}

function alertPack(m) {
  m.aggro = true;
  if (m.pack) G.monsters.forEach(o => { if (o.pack === m.pack) o.aggro = true; });
}

function updateEliteAffixes(m, dt, d) {
  m.affT -= dt;
  const h = G.hero;
  if (m.elite.includes('molten') && m.walk > 0 && Math.random() < dt * 1.5)
    hazard({ x: m.x, y: m.y, r: 9, delay: 0, dur: 3, dps: m.atk * 0.3, elem: 'fire', color: '#ff6a2a', pool: true });
  if (m.affT > 0 || d > 160) return;
  m.affT = rand(4, 6);
  if (m.elite.includes('frozen')) for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2, r = rand(10, 34);
    hazard({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, r: 18, delay: 1.5, dmg: m.atk * 0.8, elem: 'frost', color: '#8fd8ff', freeze: 0.8, orb: true });
  }
  if (m.elite.includes('plagued')) hazard({ x: h.x, y: h.y, r: 20, delay: 0.6, dur: 4, dps: m.atk * 0.35, elem: 'nature', color: '#6ad04a', pool: true });
}

function dust(x, y) { if (Math.random() < 0.5) particle(x + rand(-3, 3), y, { vx: rand(-10, 10), vy: rand(-10, -2), life: 0.4, color: 'rgba(160,150,140,0.6)', size: 1 }); }

// ---------- Nebezpečné zóny nepřátel (s varováním na zemi) ----------

// Projde seznam G[key] a nechá jen položky, pro které fn vrátí true. Co během toho nově vznikne
// (úlomky Ledové koule, louže po dechu bosse…), se zachová – dřív se to ztrácelo.
const NET_LENIENCY = 3;   // px, o kolik menší zásah plošných útoků na hrdinu hosta (zpoždění sítě)
function filterKeepNew(key, fn) {
  const cur = G[key]; G[key] = [];
  const kept = cur.filter(fn);
  G[key] = kept.concat(G[key]);
}

function hazard(o) { const z = Object.assign({ t: 0, dur: 0, tickT: 0 }, o); G.hazards.push(z); return z; }
function hazardLine(x, y, ang, len, delay) { G.hazards.push({ line: true, x, y, ang, len, t: 0, delay, dur: 0, dmg: 0 }); }

// Nebezpečí zasahují všechny hrdiny. Zásah se počítá v kontextu zasaženého (jeho odolnosti).
function updateHazards(dt) {
  const inside = (z, h) => dist(z, h) < z.r + h.r - (h.netId ? NET_LENIENCY : 0);   // host po síti: drobná tolerance kvůli zpoždění
  const A = () => G.st.areaTaken;
  filterKeepNew('hazards', z => {
    z.t += dt;
    if (z.line) return z.t < z.delay;
    if (z.wave) {   // rozpínající se vlna (otřes)
      if (z.t < z.delay) return true;
      z.cur = (z.t - z.delay) * z.speed;
      if (!z.hitSet) z.hitSet = new Set();
      eachHero(h => {
        if (!z.hitSet.has(h) && Math.abs(dist(z, h) - z.cur) < 7 - (h.netId ? NET_LENIENCY : 0)) { z.hitSet.add(h); hurtHero(z.dmg * A(), z.elem, z.src, (z.pct || 0) * A()); if (z.stun) freezeHero(z.stun); }
      }, true);
      return z.cur < z.maxR;
    }
    if (z.cone) {   // kužel (dech)
      if (!z.fired && z.t >= z.delay) {
        z.fired = true;
        eachHero(h => {
          const d = dist(z, h), a = Math.atan2(h.y - z.y, h.x - z.x);
          const da = Math.abs(((a - z.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (d < z.len && da < z.arc / 2) hurtHero(z.dmg * A(), z.elem, z.src, (z.pct || 0) * A());
        }, true);
        for (let i = 0; i < 40; i++) { const aa = z.ang + rand(-z.arc / 2, z.arc / 2), s2 = rand(60, 200); particle(z.x, z.y - 8, { vx: Math.cos(aa) * s2, vy: Math.sin(aa) * s2, life: 0.5, color: pick([z.color, z.color2 || '#ffd060', z.color3 || '#ff4020']), size: 2, glow: true, drag: 0.92 }); }
        if (z.pools) for (let i = 1; i <= 3; i++) hazard({ x: z.x + Math.cos(z.ang) * z.len * i / 4, y: z.y + Math.sin(z.ang) * z.len * i / 4, r: 14, delay: 0, dur: 3, dps: z.dmg * 0.25, elem: z.elem, color: z.color, pool: true });
      }
      return z.t < z.delay + 0.1;
    }
    if (z.safe) {   // bezpečná zóna: kdo je venku, dostane zásah
      if (!z.fired && z.t >= z.delay) {
        z.fired = true;
        eachHero(h => {
          if (!inside(z, h)) { hurtHero(z.dmg, z.elem, z.src, z.pct || 0); if (z.freeze) freezeHero(z.freeze); }
          else floatText(h.x, h.y - 28, 'V bezpečí', '#ffd890', 0.9);
        }, true);
        if (z.onFire) z.onFire(z);
      }
      return z.t < z.delay + 0.3;
    }
    if (z.pillar) {   // sloup světla: smyje prokletí
      G.heroes.forEach(h => { if (h.curse && inside(z, h)) { h.curse.clean += dt; if (h.curse.clean > 0.5) { h.curse = null; floatText(h.x, h.y - 28, 'Prokletí smyto', '#fff0b0', 1); burst(h.x, h.y - 6, '#fff0b0', 24, 70, { glow: true }); } } });
      light(z.x, z.y - 10, 40, '#fff0b0');
      if (Math.random() < dt * 10) particle(z.x + rand(-z.r, z.r) * 0.6, z.y, { vy: -50, life: 0.6, color: '#fff0b0', size: 1, glow: true });
      return z.t < z.dur;
    }
    if (z.follow && z.t < z.delay + z.dur) {   // zóna, která pronásleduje hrdinu (nejbližšího)
      const h = nearestHero(z.x, z.y) || G.hero, d = dist(z, h) || 1, mv = Math.min(d, z.follow * dt);
      z.x += (h.x - z.x) / d * mv; z.y += (h.y - z.y) / d * mv;
    }
    if (!z.fired && z.t >= z.delay) {
      z.fired = true;
      if (z.dmg || z.pct) {
        eachHero(h => { if (inside(z, h)) { hurtHero(z.dmg * A(), z.elem, z.src, (z.pct || 0) * A()); if (z.freeze) freezeHero(z.freeze); if (z.slow) slowHero(z.slow, z.slowT || 3); if (z.onHit) z.onHit(z); } }, true);
        if (!z.quiet) { burst(z.x, z.y, z.color, z.orb || z.spike ? 12 : 22, 90, { glow: !z.spike }); ringFx(z.x, z.y, z.r, z.color, 0.3, 2); }
        if (z.r > 25 && !z.quiet) shake(1.5);
      }
      if (z.onFire) z.onFire(z);
    }
    if (z.fired && z.dur > 0 && z.dps) {
      z.tickT -= dt;
      if (z.tickT <= 0) { z.tickT = 0.5; eachHero(h => { if (dist(z, h) < z.r + h.r * 0.5) { hurtHero(z.dps * 0.5 * A(), z.elem, null, (z.pctTick || 0) * A()); if (z.slow) slowHero(z.slow, 1); } }, true); }
      if (Math.random() < dt * 6) particle(z.x + rand(-z.r, z.r) * 0.7, z.y + rand(-z.r, z.r) * 0.5, { vy: -12, life: 0.5, color: z.color, size: 1, glow: z.elem === 'fire' || z.elem === 'shadow' });
    }
    return z.t < z.delay + Math.max(z.dur, z.spike ? 0.45 : 0.05);
  });
}

function freezeHero(t) { t *= 1 - (G.st.ccRed || 0); G.hero.frozen = Math.max(G.hero.frozen || 0, t); floatText(G.hero.x, G.hero.y - 28, 'Zmrazen!', '#8fd8ff'); }
function slowHero(p, t) { G.hero.slowP = p; G.hero.slowT = t * (1 - (G.st.ccRed || 0)); }

// ---------- Projektily ----------

function updateProjectiles(dt) {
  // střely hrdinů a mazlíčků se počítají v kontextu majitele (jeho staty, jeho zásahy)
  filterKeepNew('projs', p => p.friendly && isHero(p.owner) ? withHero(p.owner, () => stepProjectile(p, dt)) : stepProjectile(p, dt));
}

function stepProjectile(p, dt) {
  const W = G.world;
  {
    if (p.seek && !p.friendly) {   // nepřátelská střela, která sleduje nejbližšího hrdinu
      const h = nearestHero(p.x, p.y) || G.hero, a = Math.atan2(h.y - p.y, h.x - p.x), cur = Math.atan2(p.vy, p.vx);
      const da = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI, na = cur + clamp(da, -p.seek * dt, p.seek * dt);
      p.vx = Math.cos(na); p.vy = Math.sin(na);
    }
    if (p.homing) {
      const t = nearestMonster(p.x, p.y, 90);
      if (t) {
        const a = Math.atan2(t.y - p.y, t.x - p.x), cur = Math.atan2(p.vy, p.vx);
        let da = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const na = cur + clamp(da, -6 * dt, 6 * dt);
        p.vx = Math.cos(na); p.vy = Math.sin(na);
      }
    }
    const step = p.speed * dt;
    p.x += p.vx * step; p.y += p.vy * step; p.traveled += step;
    if (p.shards) {   // Ledová koule rozstřikuje úlomky
      p.shardT = (p.shardT || 0) - dt;
      if (p.shardT <= 0) {
        p.shardT = p.shards.every;
        const a = Math.random() * Math.PI * 2;
        G.projs.push({ x: p.x, y: p.y, vx: Math.cos(a), vy: Math.sin(a), speed: 200, dmg: p.shards.dmg, elem: p.elem, size: 1, color: p.color, friendly: true, range: 70, traveled: 0, hits: new Set(), pierce: 0, skill: p.skill, trail: false, owner: p.owner });
      }
    }
    if (p.trail && Math.random() < 0.7) particle(p.x, p.y - 7, { vx: rand(-8, 8), vy: rand(-8, 8), life: 0.3, color: p.color, size: 1, glow: true });
    if (p.color && p.size >= 2) light(p.x, p.y - 7, 14 + p.size * 3, p.color);
    if (solidAt(W, p.x, p.y)) { projEnd(p); return false; }
    if (p.traveled > p.range) { projEnd(p); return false; }
    if (p.friendly) {
      for (const m of G.monsters) {
        if (m.dead || p.hits.has(m)) continue;
        if (Math.hypot(m.x - p.x, m.y - p.y) < m.r + p.size + 3) {
          p.hits.add(m);
          if (p.pet) { const dd = dealDamage(m, p.dmg, p.elem, {}); if (G.st.petLs) healHero(dd * G.st.petLs, true); }
          else heroHit(m, p.dmg, p.elem, { crit: p.crit, armorPen: p.armorPen, skill: p.skill, exec: p.exec, vuln: p.vuln, slow: p.slow });
          if (p.dot && !m.dead) applyDot(m, p.skill, p.dot.elem, G.st.atk * p.dot.pct * G.st.dotMul, p.dot.dur + G.st.dotDur);
          sparks(p.x, p.y - 7, p.color, 4);
          if (p.explode && !p.pierce) { projEnd(p); return false; }
          if (--p.pierce < 0) { projEnd(p); return false; }
        }
      }
    } else {
      const h = G.heroes.find(x => !x.dead && Math.hypot(x.x - p.x, x.y - p.y) < x.r + p.size + 3);
      if (h) {
        withHero(h, () => {
          hurtHero(p.dmg * G.st.rangedTaken, p.elem, p.owner, (p.pct || 0) * G.st.rangedTaken);
          if (p.slow) slowHero(p.slow, 2);
          if (p.hook && !p.hook.dead) bossHooked(p.hook);
        });
        if (p.burst) { burst(p.x, p.y, p.color, 20, 80, { glow: true }); ringFx(p.x, p.y, 18, p.color, 0.3, 2); }
        if (p.pool) hazard({ x: p.x, y: p.y + 6, r: 16, delay: 0, dur: 3, dps: p.dmg * 0.3, elem: p.elem, color: p.color, pool: true });
        sparks(p.x, p.y - 7, p.color, 6);
        return false;
      }
    }
    return true;
  }
}

function projEnd(p) {
  if (p.explode) {
    sfx('explode');
    const r = p.explode.r;
    burst(p.x, p.y, p.color, 26, 100, { glow: true });
    flashFx(p.x, p.y, r, p.color, 0.18);
    ringFx(p.x, p.y, r, p.color, 0.3, 2);
    shake(1.5);
    G.monsters.forEach(m => { if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < r + m.r) {
      heroHit(m, p.explode.dmg, p.elem, { noProc: true, skill: p.skill });
      if (p.dot && !m.dead) applyDot(m, p.skill, p.dot.elem, G.st.atk * p.dot.pct * G.st.dotMul, p.dot.dur + G.st.dotDur);
    } });
  } else if (!p.friendly && p.pool) {
    hazard({ x: p.x, y: p.y, r: 16, delay: 0, dur: 3, dps: p.dmg * 0.3, elem: p.elem, color: p.color, pool: true });
  } else sparks(p.x, p.y, p.color, 3);
}

function nearestMonster(x, y, maxD, filter) {
  let best = null, bd = maxD;
  G.monsters.forEach(m => { if (m.dead || m.immune || (filter && !filter(m))) return; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } });
  return best;
}
function monstersIn(x, y, r) { return G.monsters.filter(m => !m.dead && Math.hypot(m.x - x, m.y - y) < r + m.r); }

// ---------- Mazlíčci ----------

// Kostlivec nemrtvého (rasový strom). Najednou nejvýš SKEL_MAX (+ talenty), nejstarší zmizí.
function raiseSkeleton(x, y, life, mage) {
  const h = G.hero, M = G.st.mods, mine = skeletonsOf(h), cap = SKEL_MAX + (M.skelMax || 0);
  while (mine.length >= cap) { const old = mine.shift(); G.pets.splice(G.pets.indexOf(old), 1); smoke(old.x, old.y, 4); }
  const p = spawnPet(mage ? 'skelmage' : 'skeleton', life);
  if (x !== undefined) { const fp = nearestFree(G.world, x, y, 4); p.x = fp.x; p.y = fp.y; }
  for (let i = 0; i < 10; i++) particle(p.x + rand(-5, 5), p.y, { vy: rand(-40, -10), life: 0.5, color: '#d8d0b8', size: 1 });
  return p;
}
function spawnPet(type, life) {
  const P = PETS[type], h = G.hero;
  const p = { kind: 'pet', type, def: P, x: h.x + rand(-12, 12), y: h.y + rand(-12, 12), r: 5, cd: 0.5, life: life || Infinity, face: 1, walk: 0, scale: P.scale, owner: h, nid: newNid() };
  const fp = nearestFree(G.world, p.x, p.y, 4); p.x = fp.x; p.y = fp.y;
  G.pets.push(p);
  burst(p.x, p.y, '#ffffff', 10, 50);
  return p;
}

// Mazlíček jedná v kontextu svého majitele (jeho útok, jeho cíle). Mazlíčci odešlého hrdiny zmizí.
function updatePets(dt) {
  G.pets = G.pets.filter(p => {
    if (!isHero(p.owner)) return false;
    return withHero(p.owner, () => stepPet(p, dt));
  });
}
function stepPet(p, dt) {
  const h = G.hero, st = G.st;
  {
    p.life -= dt;
    if (p.life <= 0) {
      smoke(p.x, p.y, 6);
      if (p.def.skel && st.mods.skelBoom && G.scene === 'rift') {   // Pán smrti: kostlivec při zániku vybuchne
        burst(p.x, p.y, '#d8d0b8', 20, 90); ringFx(p.x, p.y, 34, '#d8d0b8', 0.3, 2);
        monstersIn(p.x, p.y, 34).forEach(m => dealDamage(m, st.atk * st.mods.skelBoom * st.petMul, 'shadow', { noProc: true }));
      }
      return false;
    }
    p.cd -= dt; p.atkAnim = Math.max(0, (p.atkAnim || 0) - dt);
    const t = (p.forceTarget && !p.forceTarget.dead) ? p.forceTarget : nearestMonster(h.x, h.y, 150, m => m.aggro || dist(m, h) < 90);
    const P = p.def;
    if (t) {
      const d = dist(p, t);
      if (d > P.range + t.r) monsterMoveToward(p, t.x, t.y, P.speed, dt);
      else { p.walk = 0; p.face = t.x > p.x ? 1 : -1; }
      if (d <= P.range + t.r + 2 && p.cd <= 0) {
        p.cd = P.cd / (1 + (st.petSpd || 0));
        const dmg = st.atk * P.dmg * st.petMul * (P.skel ? 1 + (st.mods.skelPct || 0) : 1) * (p.strike || 1);
        if (P.ranged) G.projs.push({ x: p.x, y: p.y, vx: (t.x - p.x) / d, vy: (t.y - p.y) / d, speed: 170, dmg, elem: P.elem, size: 2, color: P.proj, friendly: true, pet: true, range: 200, traveled: 0, hits: new Set(), pierce: 0, trail: true, owner: h });
        else { const dd = dealDamage(t, dmg, P.elem, {}); if (st.petLs) healHero(dd * st.petLs, true); p.atkAnim = 0.15; arcFx(t.x, t.y - 4, Math.atan2(t.y - p.y, t.x - p.x), 1.6, 10, '#ffffff', 0.15); }
        if (p.strike) { p.strike = 0; p.forceTarget = null; burst(t.x, t.y, '#e0c080', 12, 70); }
      }
    } else {
      const d = dist(p, h);
      if (d > 30) monsterMoveToward(p, h.x - h.face * 14, h.y + 6, P.speed * (d > 120 ? 2 : 1), dt);
      else p.walk = 0;
      if (d > 300) { p.x = h.x; p.y = h.y; }
    }
    return true;
  }
}

// ---------- Kořist na zemi ----------

// Zlato a předměty patří aktuálnímu hrdinovi (owner) – vidí a sebere je jen on. Koule zdraví jsou společné.
function dropGold(x, y, amount) {
  amount = Math.max(1, Math.round(amount));
  G.loot.push({ kind: 'gold', x: x + rand(-8, 8), y: y + rand(-6, 6), amount, t: 0, owner: G.hero });
}
function dropItem(x, y, boss, forceRar) {
  const st = G.st, L = G.rift.level;
  const rar = forceRar || rollRarity(st.mf + riftMf(L), boss, L);
  const it = makeItem(riftIlvl(L), rar, heroSave().nextUid++, null, Math.random() < 0.8 ? G.char.cls : null);
  G.loot.push({ kind: 'item', item: it, x: x + rand(-10, 10), y: y + rand(-8, 8), t: 0, owner: G.hero });
  if (RARITY_ORDER.indexOf(rar) >= 2 && !G.remoteCtx) { sfx('rare'); burst(x, y, RARITIES[rar].color, 20, 60, { glow: true }); }
}

function updateLoot(dt) {
  G.loot = G.loot.filter(l => {
    l.t += dt;
    if (l.owner && !isHero(l.owner)) return false;   // majitel odešel
    for (const h of (l.owner ? [l.owner] : G.heroes)) {
      if (h.dead || h.ghost || h.rep) continue;
      if (withHero(h, () => lootStep(l, h, dt))) return false;
    }
    return true;
  });
}
// Vrací true, když hrdina kořist sebral
function lootStep(l, h, dt) {
  const d = Math.hypot(l.x - h.x, l.y - h.y);
  if (l.kind === 'gold' && d < 40) { l.x += (h.x - l.x) * dt * 8; l.y += (h.y - l.y) * dt * 8; }
  if (d < 12 && l.t > 0.3) {
    if (l.kind === 'gold') { sfx('gold'); heroSave().gold += l.amount; netReward({ gold: l.amount }); floatText(h.x, h.y - 26, '+' + fmt(l.amount) + ' zlata', '#e0c040', 0.8); return true; }
    if (l.kind === 'globe') { sfx('potion'); healHero(G.st.maxHp * GLOBE_HEAL * G.st.healMul); burst(l.x, l.y, '#ff5050', 12, 50); return true; }
    if (l.kind === 'item') {
      if (pickupItem(l.item)) return true;
      if (!l.warned) { l.warned = true; toast('Batoh je plný'); }
    }
  }
  return false;
}

function pickupItem(it) {
  const ch = G.char, sv = heroSave(), s = sv.settings || { autoSell: {} };
  if (s.autoSell && s.autoSell[it.rarity]) {
    const g = sellValue(it); sv.gold += g;
    netReward({ gold: g, log: [it.name, RARITIES[it.rarity].color, `prodáno +${fmt(g)} zlata`] });
    addLootLog(it, `prodáno +${fmt(g)} zlata`);
    return true;
  }
  if (ch.inv.length >= INV_MAX) return false;
  ch.inv.push(it);
  sfx('pickup');
  addLootLog(it, 'do batohu');
  netReward({ item: it, log: [it.name, RARITIES[it.rarity].color, 'do batohu'] });
  if (RARITY_ORDER.indexOf(it.rarity) >= 2) personalBanner('banner', { text: `${RARITIES[it.rarity].name}: ${it.name}`, color: RARITIES[it.rarity].color, t: 0 });
  return true;
}

function addLootLog(it, note) {
  if (G.remoteCtx) return;
  G.lootLog.unshift({ name: it.name, color: RARITIES[it.rarity].color, note, t: 0 });
  G.lootLog.length = Math.min(G.lootLog.length, 6);
}

// ---------- XP a úrovně ----------

function gainXP(n) {
  const ch = G.char;
  netReward({ xp: Math.round(n) });
  ch.xp += Math.round(n);
  while (ch.xp >= xpToNext(ch.level)) {
    ch.xp -= xpToNext(ch.level);
    ch.level++;
    sfx('levelup');
    invalidate();
    G.st = heroStats();
    G.hero.hp = G.st.maxHp;
    floatText(G.hero.x, G.hero.y - 34, `Úroveň ${ch.level}!`, '#ffd060', 1.6, { dur: 2 });
    for (let i = 0; i < 30; i++) particle(G.hero.x + rand(-8, 8), G.hero.y, { vy: rand(-80, -30), life: 1, color: '#ffd060', size: 2, glow: true, drag: 0.96 });
    beamFx(G.hero.x, G.hero.y, '#ffd060', 0.8, 14);
    toast(`Úroveň ${ch.level}! Máš nový talentový bod.`);
  }
}
