// Kořist: druhy předmětů, sloty postavy, rarity, affixy, legendární předměty a sety (inspirace Diablo).

// Druh předmětu (item.slot) → typy, základní staty
// base: [stat, v0, vl (za úroveň), grow (exponenciální růst), cap]
const ITEM_KINDS = {
  weapon:  { name: 'Zbraň',      weight: 2,   types: ['sword', 'axe', 'mace', 'dagger', 'wand', 'greatsword', 'hammer', 'staff', 'bow'] },
  offhand: { name: 'Levá ruka',  weight: 1,   types: ['shield', 'orb'] },
  head:    { name: 'Hlava',      weight: 1,   types: ['helm', 'hood', 'circlet'], base: [['hp', 14, 0, true]] },
  chest:   { name: 'Hrudník',    weight: 1,   types: ['plate', 'robe', 'mail', 'vest'], base: [['def', 1, 0.25]] },
  gloves:  { name: 'Rukavice',   weight: 1,   types: ['gloves', 'gauntlets'], base: [['atk', 1.5, 0, true]] },
  legs:    { name: 'Kalhoty',    weight: 1,   types: ['pants', 'greaves'], base: [['hp', 10, 0, true]] },
  boots:   { name: 'Boty',       weight: 1,   types: ['boots', 'sandals'], base: [['hp', 8, 0, true]] },
  cloak:   { name: 'Plášť',      weight: 1,   types: ['cloak', 'mantle'], base: [['resAll', 0.03, 0.0006, false, 0.15]] },
  neck:    { name: 'Náhrdelník', weight: 0.7, types: ['amulet', 'talisman'], base: [['critDmg', 0.08, 0.003, false, 0.5]] },
  ring:    { name: 'Prsten',     weight: 1.2, types: ['ring', 'signet'], base: [['crit', 0.01, 0.0005, false, 0.08]] }
};

// Typy: jméno:rod, ikona, ruka (u zbraní), vlastní základ
const ITEM_TYPES = {
  sword:      { noun: 'Meč:m',              icon: 'sword',      hand: 1 },
  axe:        { noun: 'Sekera:f',           icon: 'axe',        hand: 1 },
  mace:       { noun: 'Palcát:m',           icon: 'mace',       hand: 1 },
  dagger:     { noun: 'Dýka:f',             icon: 'dagger',     hand: 1 },
  wand:       { noun: 'Hůlka:f',            icon: 'wand',       hand: 1 },
  greatsword: { noun: 'Obouruční meč:m',    icon: 'greatsword', hand: 2 },
  hammer:     { noun: 'Válečné kladivo:n',  icon: 'hammer',     hand: 2 },
  staff:      { noun: 'Hůl:f',              icon: 'staff',      hand: 2 },
  bow:        { noun: 'Luk:m',              icon: 'bow',        hand: 2 },
  shield:     { noun: 'Štít:m',             icon: 'shield', base: [['block', 0.05, 0.0005, false, 0.2], ['def', 1, 0.15]] },
  orb:        { noun: 'Ohnisko:n',          icon: 'orb',    base: [['skillPct', 0.06, 0.002, false, 0.4]] },
  helm:       { noun: 'Helma:f',            icon: 'helm' },
  hood:       { noun: 'Kápě:f',             icon: 'hood' },
  circlet:    { noun: 'Čelenka:f',          icon: 'helm' },
  plate:      { noun: 'Kyrys:m',            icon: 'chest' },
  robe:       { noun: 'Róba:f',             icon: 'robe' },
  mail:       { noun: 'Kroužková zbroj:f',  icon: 'chest' },
  vest:       { noun: 'Kožená vesta:f',     icon: 'robe' },
  gloves:     { noun: 'Rukavice:p',         icon: 'gloves' },
  gauntlets:  { noun: 'Kovové rukavice:p',  icon: 'gloves' },
  pants:      { noun: 'Kalhoty:p',          icon: 'legs' },
  greaves:    { noun: 'Nohavice:p',         icon: 'legs' },
  boots:      { noun: 'Boty:p',             icon: 'boots' },
  sandals:    { noun: 'Sandály:p',          icon: 'boots' },
  cloak:      { noun: 'Plášť:m',            icon: 'cloak' },
  mantle:     { noun: 'Pláštěnka:f',        icon: 'cloak' },
  amulet:     { noun: 'Amulet:m',           icon: 'amulet' },
  talisman:   { noun: 'Talisman:m',         icon: 'amulet' },
  ring:       { noun: 'Prsten:m',           icon: 'ring' },
  signet:     { noun: 'Pečetní prsten:m',   icon: 'ring' }
};
const WEAPON_ATK = { 1: 3, 2: 5.7 };   // obouruční zbraň ≈ 1,9× jednoruční
const OFFHAND_WEAPON_MULT = 0.7;       // zbraň v levé ruce dává 70 % útoku

// Sloty postavy: které druhy předmětů přijímají
const EQUIP_SLOTS = {
  main:  { name: 'Pravá ruka',  accepts: ['weapon'],            icon: 'sword' },
  off:   { name: 'Levá ruka',   accepts: ['offhand', 'weapon'], icon: 'shield' },
  head:  { name: 'Hlava',       accepts: ['head'],              icon: 'helm' },
  neck:  { name: 'Náhrdelník',  accepts: ['neck'],              icon: 'amulet' },
  cloak: { name: 'Plášť',       accepts: ['cloak'],             icon: 'cloak' },
  chest: { name: 'Hrudník',     accepts: ['chest'],             icon: 'chest' },
  gloves:{ name: 'Rukavice',    accepts: ['gloves'],            icon: 'gloves' },
  legs:  { name: 'Kalhoty',     accepts: ['legs'],              icon: 'legs' },
  boots: { name: 'Boty',        accepts: ['boots'],             icon: 'boots' },
  ring1: { name: 'Prsten',      accepts: ['ring'],              icon: 'ring' },
  ring2: { name: 'Prsten',      accepts: ['ring'],              icon: 'ring' }
};
const EQUIP_ORDER = ['main', 'off', 'head', 'neck', 'cloak', 'chest', 'gloves', 'legs', 'boots', 'ring1', 'ring2'];
const ITEM_GROWTH = 1.06;

// minRift = od které úrovně riftu může rarita padnout; dur = odolnost
const RARITIES = {
  gray:    { name: 'Běžný',      color: '#9d9d9d', weight: 70,  minRift: 1,  mult: 1.00, aff: 0, sell: 1,  price: 0,   dur: 30 },
  green:   { name: 'Neobvyklý',  color: '#4fd05a', weight: 25,  minRift: 1,  mult: 1.15, aff: 1, sell: 5,  price: 150, dur: 40 },
  purple:  { name: 'Epický',     color: '#b75cff', weight: 5,   minRift: 4,  mult: 1.35, aff: 2, sell: 18, price: 600, dur: 50 },
  orange:  { name: 'Legendární', color: '#ff9a1f', weight: 1,   minRift: 10, mult: 1.60, aff: 3, sell: 60, price: 2000, dur: 60 },
  diamond: { name: 'Diamantový', color: '#5ff0ff', weight: 0.3, minRift: 16, mult: 1.50, aff: 2, sell: 70, price: 0,   dur: 60 }
};
const RARITY_ORDER = ['gray', 'green', 'purple', 'orange', 'diamond'];

const AFFIXES = {
  atkPct:    { v0: 0.03,   suf: 'síly' },
  hpPct:     { v0: 0.04,   suf: 'vitality' },
  def:       { v0: 1, vl: 0.15, suf: 'ochrany' },
  spdPct:    { v0: 0.02,   suf: 'rychlosti' },
  crit:      { v0: 0.008,  suf: 'přesnosti' },
  critDmg:   { v0: 0.05,   suf: 'zkázy' },
  ls:        { v0: 0.008,  suf: 'upíra' },
  dodge:     { v0: 0.008,  suf: 'stínu' },
  block:     { v0: 0.01,   suf: 'hradby' },
  regen:     { v0: 0.0008, suf: 'obnovy' },
  thorns:    { v0: 0.03,   suf: 'trnů' },
  physPct:   { v0: 0.04,   suf: 'oceli' },
  firePct:   { v0: 0.04,   suf: 'plamenů' },
  frostPct:  { v0: 0.04,   suf: 'mrazu' },
  shadowPct: { v0: 0.04,   suf: 'temnoty' },
  naturePct: { v0: 0.04,   suf: 'hvozdu' },
  arcanePct: { v0: 0.04,   suf: 'magie' },
  resFire:   { v0: 0.05,   suf: 'ohnivzdornosti' },
  resFrost:  { v0: 0.05,   suf: 'zimy' },
  resShadow: { v0: 0.05,   suf: 'světla' },
  resNature: { v0: 0.05,   suf: 'protijedu' },
  resArcane: { v0: 0.05,   suf: 'rozptylu' },
  resAll:    { v0: 0.025,  suf: 'živlů' },
  goldPct:   { v0: 0.05,   suf: 'bohatství' },
  mfPct:     { v0: 0.05,   suf: 'štěstí' }
};
const PREFIXES = ['Starobyl', 'Runov', 'Prastar', 'Zářiv', 'Stínov', 'Královsk', 'Bouřn'];
const ADJ_END = { m: 'ý', f: 'á', n: 'é', p: 'é' };

const LEGENDARIES = [
  { id: 'bloodmoon',   slot: 'weapon',  type: 'axe',    name: 'Sekera Krvavého měsíce',  stats: { ls: 0.05, doubleChance: 0.2 } },
  { id: 'eternalfire', slot: 'weapon',  type: 'staff',  name: 'Hůl věčného plamene',     stats: { firePct: 0.3, resPen: 0.1 } },
  { id: 'vigil',       slot: 'offhand', type: 'shield', name: 'Štít Věčné hlídky',       stats: { block: 0.1, thorns: 0.15 } },
  { id: 'frostking',   slot: 'head',    type: 'helm',   name: 'Koruna Mrazivého krále',  stats: { hpPct: 0.10, slowAura: 0.2, freezeChance: 0.05 } },
  { id: 'phoenix',     slot: 'chest',   type: 'plate',  name: 'Fénixova zbroj',          stats: { regen: 0.004, rebirth: 1 } },
  { id: 'stoneskin',   slot: 'legs',    type: 'greaves',name: 'Nohavice Kamenné kůže',   stats: { dmgRed: 0.08, resAll: 0.08 } },
  { id: 'windrunner',  slot: 'boots',   type: 'boots',  name: 'Boty Větrného běžce',     stats: { spdPct: 0.15, dodge: 0.05 } },
  { id: 'shadowwalk',  slot: 'cloak',   type: 'cloak',  name: 'Plášť Stínochodce',       stats: { dodge: 0.06, resShadow: 0.2 } },
  { id: 'headsman',    slot: 'neck',    type: 'amulet', name: 'Amulet Popravčího',       stats: { critDmg: 0.25, execPct: 0.5 } },
  { id: 'summoner',    slot: 'ring',    type: 'ring',   name: 'Prsten Vyvolávače',       stats: { petPct: 0.30, petCount: 1 } },
  { id: 'void',        slot: 'ring',    type: 'signet', name: 'Prsten Prázdnoty',        stats: { shadowPct: 0.25, dotPct: 0.25 } }
];

// Sety: 6 dílů, bonusy za 1, 3 a 6 nasazených dílů. pieces: druh → [jméno, typ]
const SETS = {
  titan: {
    name: 'Zbroj Titána',
    pieces: { head: ['Titánova helma', 'helm'], chest: ['Titánův kyrys', 'plate'], legs: ['Titánovy nohavice', 'greaves'],
              boots: ['Titánovy boty', 'boots'], cloak: ['Titánův plášť', 'mantle'], neck: ['Titánova pečeť', 'talisman'] },
    bonus: { 1: { hpPct: 0.10 }, 3: { def: 8, thorns: 0.10, block: 0.05 }, 6: { hpPct: 0.25, dmgRed: 0.2 } }
  },
  archmage: {
    name: 'Odkaz Arcimága',
    pieces: { weapon: ['Hůl Arcimága', 'staff'], head: ['Kápě Arcimága', 'hood'], chest: ['Róba Arcimága', 'robe'],
              legs: ['Kalhoty Arcimága', 'pants'], cloak: ['Plášť Arcimága', 'cloak'], ring: ['Prsten Arcimága', 'ring'] },
    bonus: { 1: { skillPct: 0.20 }, 3: { skillCd: 1, critDmg: 0.30 }, 6: { atkPct: 0.30, doubleChance: 0.2, resPen: 0.15 } }
  },
  shadow: {
    name: 'Stínový lovec',
    pieces: { weapon: ['Stínová čepel', 'dagger'], head: ['Stínová maska', 'hood'], chest: ['Stínová vesta', 'vest'],
              boots: ['Stínové boty', 'boots'], cloak: ['Stínový plášť', 'cloak'], neck: ['Stínový amulet', 'amulet'] },
    bonus: { 1: { crit: 0.05 }, 3: { dodge: 0.08, spdPct: 0.15 }, 6: { critDmg: 0.50, execPct: 1 } }
  }
};

const STAT_LABELS = {
  atk:          v => `+${fmtNum(v)} útok`,
  atkPct:       v => `+${pct(v)} % útok`,
  hp:           v => `+${fmtNum(v)} života`,
  hpPct:        v => `+${pct(v)} % života`,
  def:          v => `+${fmtNum(v)} obrana`,
  spdPct:       v => `+${pct(v)} % rychlost útoku`,
  crit:         v => `+${pct(v, 1)} % krit. šance`,
  critDmg:      v => `+${pct(v)} % krit. poškození`,
  ls:           v => `+${pct(v, 1)} % vysávání života`,
  dodge:        v => `+${pct(v, 1)} % úhyb`,
  block:        v => `+${pct(v, 1)} % blok`,
  dmgRed:       v => `-${pct(v)} % přijatého poškození`,
  regen:        v => `+${pct(v, 2)} % života/s`,
  thorns:       v => `+${pct(v)} % trny`,
  physPct:      v => `+${pct(v)} % fyzické poškození`,
  firePct:      v => `+${pct(v)} % ohnivé poškození`,
  frostPct:     v => `+${pct(v)} % mrazivé poškození`,
  shadowPct:    v => `+${pct(v)} % stínové poškození`,
  naturePct:    v => `+${pct(v)} % přírodní poškození`,
  arcanePct:    v => `+${pct(v)} % arkánní poškození`,
  resFire:      v => `+${pct(v)} % odolnost proti ohni`,
  resFrost:     v => `+${pct(v)} % odolnost proti mrazu`,
  resShadow:    v => `+${pct(v)} % odolnost proti stínu`,
  resNature:    v => `+${pct(v)} % odolnost proti přírodě a jedům`,
  resArcane:    v => `+${pct(v)} % odolnost proti arkáně`,
  resAll:       v => `+${pct(v)} % všechny odolnosti`,
  armorPen:     v => `Ignoruje ${pct(v)} % zbroje`,
  resPen:       v => `Ignoruje ${pct(v)} % odolností`,
  execPct:      v => `+${pct(v)} % poškození nepřátelům pod 30 % života`,
  dotPct:       v => `+${pct(v)} % poškození v čase`,
  dotDur:       v => `Poškození v čase o ${fmtNum(v)} s delší`,
  slowPct:      v => `Zpomalení o ${pct(v)} % silnější`,
  slowAura:     v => `Nepřítel trvale zpomalen o ${pct(v)} %`,
  skillSlow:    v => `Dovednost zpomalí o ${pct(v)} %`,
  freezeChance: v => `+${pct(v)} % šance zmrazit`,
  stunChance:   v => `+${pct(v)} % šance omráčit`,
  stunDur:      v => `Omráčení/zmrazení o ${fmtNum(v)} s delší`,
  stunDmg:      v => `+${pct(v)} % poškození omráčeným a zmrazeným`,
  doubleChance: v => `+${pct(v)} % šance zaútočit dvakrát`,
  skillPct:     v => `+${pct(v)} % síla dovednosti`,
  skillCd:      v => `-${Math.round(v * 10)} % přebíjení dovedností`,
  healPct:      v => `+${pct(v)} % léčení`,
  petPct:       v => `+${pct(v)} % síla mazlíčka`,
  petCount:     v => `+${v} mazlíček`,
  titanGrip:    () => 'Obouruční zbraň můžeš držet v každé ruce',
  rebirth:      () => 'Jednou za běh vstaneš z mrtvých (40 % života)',
  soulPct:      v => `+${pct(v)} % duší`,
  goldPct:      v => `+${pct(v)} % zlata`,
  dropPct:      v => `+${pct(v)} % šance na předmět`,
  mfPct:        v => `+${pct(v)} % lepší kořist`,
  msPct:        v => `+${pct(v)} % rychlost pohybu`
};

function pct(v, d = 0) { const n = v * 100; return d ? n.toFixed(d).replace('.', ',') : Math.round(n); }
function fmtNum(v) { return v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1).replace('.', ','); }
function statLine(k, v) { return STAT_LABELS[k] ? STAT_LABELS[k](v) : `${k} ${v}`; }
function itemIcon(it) { return ITEM_TYPES[it.type] ? ITEM_TYPES[it.type].icon : 'ring'; }
function itemHand(it) { return it.slot === 'weapon' && ITEM_TYPES[it.type] ? ITEM_TYPES[it.type].hand : 0; }
function kindLabel(it) {
  if (it.slot === 'weapon') return itemHand(it) === 2 ? 'Obouruční zbraň' : 'Jednoruční zbraň';
  if (it.slot === 'offhand') return it.type === 'shield' ? 'Štít' : 'Ohnisko (levá ruka)';
  return ITEM_KINDS[it.slot].name;
}

// ---------- Generování ----------

function rollRarity(mf, boss, rift) {
  const w = RARITY_ORDER.map(r => {
    const R = RARITIES[r];
    if (rift < R.minRift) return 0;
    let x = R.weight;
    if (r !== 'gray') x *= (1 + mf);
    if (boss && r === 'gray') x = 0;
    if (boss && r !== 'gray' && r !== 'green') x *= 2;
    return x;
  });
  let roll = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) return RARITY_ORDER[i]; }
  return 'green';
}

function rollKind() {
  const keys = Object.keys(ITEM_KINDS);
  let roll = Math.random() * keys.reduce((a, k) => a + ITEM_KINDS[k].weight, 0);
  for (const k of keys) { roll -= ITEM_KINDS[k].weight; if (roll <= 0) return k; }
  return 'ring';
}

function rollAffixes(n, ilvl, exclude) {
  const keys = Object.keys(AFFIXES).filter(k => !exclude.includes(k)).sort(() => Math.random() - 0.5).slice(0, n);
  const out = {};
  keys.forEach(k => {
    const a = AFFIXES[k];
    const v = (a.vl !== undefined ? a.v0 + a.vl * ilvl : a.v0 * (1 + Math.min(ilvl, 100) / 40)) * (0.7 + Math.random() * 0.3);
    out[k] = k === 'def' ? Math.max(1, Math.round(v)) : +v.toFixed(4);
  });
  return out;
}

function rollBase(defs, ilvl, mult) {
  const out = {};
  defs.forEach(([k, v0, vl, grow, cap]) => {
    let v = (v0 + (vl || 0) * ilvl) * (grow ? Math.pow(ITEM_GROWTH, ilvl - 1) : 1) * mult * (0.9 + Math.random() * 0.2);
    if (cap) v = Math.min(cap, v);
    out[k] = (k === 'def' || k === 'atk' || k === 'hp') ? Math.max(1, Math.round(v)) : +v.toFixed(4);
  });
  return out;
}

// Může třída předmět nosit? (zbraně a levá ruka podle třídy, zbroj a šperky všichni)
function canClassUse(it, cls) {
  if (it.slot !== 'weapon' && it.slot !== 'offhand') return true;
  return CLASSES[cls].weapons.includes(it.type);
}

// cls = třída pro "chytrou kořist" (zbraně vhodné pro třídu)
function makeItem(ilvl, rarity, uid, forceKind, cls) {
  const r = RARITIES[rarity];
  let kind = forceKind || rollKind(), type = null, name = null;
  if (cls) {
    const allowed = CLASSES[cls].weapons;
    if (kind === 'offhand' && !allowed.some(t => ITEM_KINDS.offhand.types.includes(t))) kind = 'weapon';
    if (kind === 'weapon' || kind === 'offhand') {
      const pool = ITEM_KINDS[kind].types.filter(t => allowed.includes(t));
      type = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const item = { uid, rarity, ilvl };
  if (rarity === 'orange') {
    const leg = LEGENDARIES[Math.floor(Math.random() * LEGENDARIES.length)];
    kind = leg.slot; type = leg.type; name = leg.name; item.leg = leg.id;
  } else if (rarity === 'diamond') {
    const ids = Object.keys(SETS), setId = ids[Math.floor(Math.random() * ids.length)];
    const kinds = Object.keys(SETS[setId].pieces);
    kind = kinds[Math.floor(Math.random() * kinds.length)];
    [name, type] = SETS[setId].pieces[kind];
    item.set = setId;
  }
  if (rarity === 'orange' || rarity === 'diamond') { /* jméno a typ dané unikátem */ }
  else if (type && ITEM_KINDS[kind].types.indexOf(type) < 0) type = null;
  const K = ITEM_KINDS[kind];
  type = type || K.types[Math.floor(Math.random() * K.types.length)];
  const T = ITEM_TYPES[type];
  item.slot = kind; item.type = type;
  const baseDefs = kind === 'weapon' ? [['atk', WEAPON_ATK[T.hand], 0, true]] : (T.base || K.base);
  item.base = rollBase(baseDefs, ilvl, r.mult);
  item.affixes = rollAffixes(r.aff, ilvl, Object.keys(item.base));
  if (!name) {
    const [noun, gender] = T.noun.split(':');
    if (rarity === 'gray') name = noun;
    else {
      const firstAff = Object.keys(item.affixes)[0];
      const suf = firstAff ? ' ' + AFFIXES[firstAff].suf : '';
      const adj = PREFIXES[Math.floor(Math.random() * PREFIXES.length)] + ADJ_END[gender];
      name = (rarity === 'purple' ? adj + ' ' + noun.charAt(0).toLowerCase() + noun.slice(1) : noun) + suf;
    }
  }
  item.name = name;
  item.maxDur = item.dur = r.dur;
  return item;
}

// Startovní zbraň pro novou postavu
function starterWeapon(cls, uid) {
  const it = makeItem(1, 'gray', uid, ITEM_TYPES[CLASSES[cls].starter].hand ? 'weapon' : 'offhand', null);
  it.type = CLASSES[cls].starter;
  it.slot = ITEM_TYPES[it.type].hand ? 'weapon' : 'offhand';
  it.base = it.slot === 'weapon' ? { atk: WEAPON_ATK[ITEM_TYPES[it.type].hand] } : it.base;
  it.affixes = {};
  it.name = ITEM_TYPES[it.type].noun.split(':')[0] + ' začátečníka';
  return it;
}

function itemStats(it) {
  if (it.dur === 0) return {};   // rozbitý předmět nedává staty
  const out = Object.assign({}, it.base);
  for (const k in it.affixes) out[k] = (out[k] || 0) + it.affixes[k];
  if (it.leg) { const l = LEGENDARIES.find(x => x.id === it.leg); if (l) for (const k in l.stats) out[k] = (out[k] || 0) + l.stats[k]; }
  return out;
}

const STAT_WEIGHTS = { atk: 3, hp: 0.3, def: 2.5, atkPct: 150, hpPct: 100, spdPct: 150, crit: 250, critDmg: 60,
  ls: 150, dodge: 150, block: 120, dmgRed: 300, regen: 3000, thorns: 50, goldPct: 20, mfPct: 30,
  physPct: 60, firePct: 60, frostPct: 60, shadowPct: 60, naturePct: 60, arcanePct: 60,
  resFire: 50, resFrost: 50, resShadow: 50, resNature: 50, resArcane: 50, resAll: 220,
  resPen: 150, armorPen: 120, execPct: 50, doubleChance: 200, slowAura: 150, freezeChance: 300,
  petPct: 40, petCount: 50, dotPct: 40, skillPct: 60, skillCd: 30, rebirth: 60 };
const ELEM_PCT = { physPct: 'phys', firePct: 'fire', frostPct: 'frost', shadowPct: 'shadow', naturePct: 'nature', arcanePct: 'arcane' };
function itemScore(it, elems) {
  const st = itemStats(it);
  let s = 0;
  for (const k in st) {
    let w = STAT_WEIGHTS[k] || 10;
    if (elems && ELEM_PCT[k] && !elems.includes(ELEM_PCT[k])) w = 5;
    s += w * st[k];
  }
  if (it.set) s += 30;
  return Math.round(s);
}

function repairCost(it) {
  if (it.dur === undefined || it.dur >= it.maxDur) return 0;
  return Math.max(1, Math.round((it.maxDur - it.dur) / it.maxDur * sellValue(it) * 4));
}
function sellValue(it) { return Math.max(1, Math.round(RARITIES[it.rarity].sell * Math.pow(GOLD_GROWTH, it.ilvl))); }
function buyPrice(it) { return Math.round(RARITIES[it.rarity].price * Math.pow(GOLD_GROWTH, it.ilvl)); }

