// Kořist: druhy předmětů, sloty postavy, rarity, affixy, legendární předměty a sety (inspirace Diablo).

// Druh předmětu (item.slot) → typy, základní staty
// base: [stat, v0, vl (za úroveň), grow (exponenciální růst), cap]
const ITEM_KINDS = {
  weapon:  { name: 'Zbraň',      weight: 2,   types: ['sword', 'axe', 'mace', 'dagger', 'greatsword', 'hammer', 'staff', 'bow', 'orb'] },
  offhand: { name: 'Levá ruka',  weight: 1,   types: ['shield'] },
  head:    { name: 'Hlava',      weight: 1,   types: ['helm', 'hood', 'circlet'], base: [['hp', 14, 0, true]] },
  chest:   { name: 'Hrudník',    weight: 1,   types: ['plate', 'robe', 'mail', 'vest'], base: [['def', 1, 0.25]] },
  gloves:  { name: 'Rukavice',   weight: 1,   types: ['gloves', 'gauntlets'], base: [['atk', 1.5, 0, true]] },
  legs:    { name: 'Kalhoty',    weight: 1,   types: ['pants', 'greaves'], base: [['hp', 10, 0, true]] },
  boots:   { name: 'Boty',       weight: 1,   types: ['boots', 'sandals'], base: [['hp', 8, 0, true]] },
  cloak:   { name: 'Plášť',      weight: 1,   types: ['cloak', 'mantle'], base: [['resAll', 0.01, 0.0002, false, 0.03]] },
  neck:    { name: 'Náhrdelník', weight: 0.7, types: ['amulet', 'talisman'], base: [['critDmg', 0.08, 0.003, false, 0.5]] },
  ring:    { name: 'Prsten',     weight: 1.2, types: ['ring', 'signet'], base: [['crit', 0.01, 0.0005, false, 0.08]] }
};

// Typy: jméno:rod, ikona, ruka (u zbraní), vlastní základ
const ITEM_TYPES = {
  sword:      { noun: 'Meč:m',              icon: 'sword',      hand: 1 },
  axe:        { noun: 'Sekera:f',           icon: 'axe',        hand: 1 },
  mace:       { noun: 'Palcát:m',           icon: 'mace',       hand: 1 },
  dagger:     { noun: 'Dýka:f',             icon: 'dagger',     hand: 1 },
  wand:       { noun: 'Hůlka:f',            icon: 'wand',       hand: 1 },   // v1.18 vyřazeno (nepadá, nikdo ji nedrží), jen kvůli starým předmětům
  greatsword: { noun: 'Obouruční meč:m',    icon: 'greatsword', hand: 2 },
  hammer:     { noun: 'Válečné kladivo:n',  icon: 'hammer',     hand: 2 },
  staff:      { noun: 'Hůl:f',              icon: 'staff',      hand: 2 },
  bow:        { noun: 'Luk:m',              icon: 'bow',        hand: 2 },
  shield:     { noun: 'Štít:m',             icon: 'shield', base: [['block', 0.05, 0.0005, false, 0.2], ['def', 1, 0.15]] },
  orb:        { noun: 'Kniha kouzel:f',     icon: 'orb',        hand: 2, base: [['skillPct', 0.06, 0.002, false, 0.4]] },   // v1.18: obouruční zbraň mága a černokněžníka (útok jako hůl + síla dovedností)
  helm:       { noun: 'Helma:f',            icon: 'helm', armor: 'heavy' },
  hood:       { noun: 'Kápě:f',             icon: 'hood', armor: 'light' },
  circlet:    { noun: 'Čelenka:f',          icon: 'helm', armor: 'light' },
  plate:      { noun: 'Kyrys:m',            icon: 'chest', armor: 'heavy' },
  robe:       { noun: 'Róba:f',             icon: 'robe',   armor: 'light', base: [['def', 0.4, 0.1]] },
  mail:       { noun: 'Kroužková zbroj:f',  icon: 'chest', armor: 'heavy' },
  vest:       { noun: 'Kožená vesta:f',     icon: 'robe',   armor: 'light', base: [['def', 0.7, 0.18]] },
  gloves:     { noun: 'Rukavice:p',         icon: 'gloves', armor: 'light' },
  gauntlets:  { noun: 'Kovové rukavice:p',  icon: 'gloves', armor: 'heavy' },
  pants:      { noun: 'Kalhoty:p',          icon: 'legs', armor: 'light' },
  greaves:    { noun: 'Nohavice:p',         icon: 'legs', armor: 'heavy' },
  boots:      { noun: 'Boty:p',             icon: 'boots', armor: 'heavy' },
  sandals:    { noun: 'Sandály:p',          icon: 'boots', armor: 'light' },
  cloak:      { noun: 'Plášť:m',            icon: 'cloak' },
  mantle:     { noun: 'Pláštěnka:f',        icon: 'cloak' },
  amulet:     { noun: 'Amulet:m',           icon: 'amulet' },
  talisman:   { noun: 'Talisman:m',         icon: 'amulet' },
  ring:       { noun: 'Prsten:m',           icon: 'ring' },
  signet:     { noun: 'Pečetní prsten:m',   icon: 'ring' }
};
// Váha zbroje: těžká přidá obranu (válečník), lehká odolnosti (kouzelníci). Nosit smí každý.
const ARMOR_WEIGHT = {
  heavy: { name: 'Těžká zbroj', extra: [['def', 1, 0.12]] },
  light: { name: 'Lehká zbroj', extra: [['resAll', 0.01, 0.0002, false, 0.03]] }
};
// Odolnost proti jednomu živlu na jednom předmětu (všechny odolnosti + konkrétní) je nejvýš 10 %, i u nejlepších kusů
const RES_ITEM_CAP = 0.10;
const RES_ELEMS = ['Fire', 'Frost', 'Shadow', 'Nature', 'Arcane'];

// Základní atributy. Hlavní atribut třídy (CLASSES[].main) dává navíc +1 % útoku za bod.
const ATTRS = {
  str: { name: 'Síla',      short: 'SÍL', desc: '+0,5 obrany za bod. Hlavní atribut válečníka.' },
  agi: { name: 'Obratnost', short: 'OBR', desc: '+0,1 % krit. šance za bod. Hlavní atribut lovce a druida v Divočině.' },
  int: { name: 'Intelekt',  short: 'INT', desc: '+0,2 % všech odolností za bod. Hlavní atribut mága, černokněžníka a druida.' },
  sta: { name: 'Výdrž',     short: 'VÝD', desc: '+1 % života za bod. Užitečná pro všechny.' },
  spi: { name: 'Moudrost',  short: 'MOU', desc: '+1,5 % rychlosti obnovy many, soustředění a ducha za bod. Válečníkovi +1 % generování zuřivosti.' }
};
const ATTR_ORDER = ['str', 'agi', 'int', 'sta', 'spi'];
const ATTR_FX = { mainAtk: 0.01, strDef: 0.5, agiCrit: 0.001, intRes: 0.002, staHp: 0.01, spiRegen: 0.015, spiGen: 0.01 };

// Druhy nepřátel pro bonusy „poškození nemrtvým/šelmám/démonům“ (fam v MONSTERS a BOSSES)
const MONSTER_FAMS = { undead: 'nemrtvým', beast: 'šelmám', demon: 'démonům' };
// 7. pád pro bonus „poškození se zbraní“
const WEAPON_INSTR = { sword: 's mečem', axe: 'se sekerou', mace: 's palcátem', dagger: 's dýkou', wand: 's hůlkou', orb: 's knihou kouzel',
  greatsword: 's obouručním mečem', hammer: 's válečným kladivem', staff: 's holí', bow: 's lukem' };
const WEAPON_SUF = { sword: 'šermíře', axe: 'sekerníka', mace: 'drtiče', dagger: 'zabijáka', wand: 'kouzelníka', orb: 'učence',
  greatsword: 'obra', hammer: 'kladiváře', staff: 'mudrce', bow: 'střelce' };

const WEAPON_ATK = { 1: 3, 2: 5.7 };   // obouruční zbraň ≈ 1,9× jednoruční
const OFFHAND_WEAPON_MULT = 0.7;       // zbraň v levé ruce dává 70 % útoku
const OFFHAND_2H_MULT = 0.5;           // obouruční zbraň v levé ruce (Titánský stisk / trpaslík) dává 50 % útoku
const TITAN_GRIP_TYPES = ['greatsword', 'hammer'];   // dvě obouruční zbraně jde držet jen u zbraní na blízko (ne luk, ne hůl)
// Smí být tahle kombinace v rukou? tg = má Titánský stisk (talent nebo trpaslík)
function handsOk(main, off, tg) {
  if (!main || !off) return true;
  const m2 = itemHand(main) === 2, o2 = off.slot === 'weapon' && itemHand(off) === 2;
  if (!m2 && !o2) return true;
  if (!tg) return false;
  return (!m2 || TITAN_GRIP_TYPES.includes(main.type)) && (!o2 || TITAN_GRIP_TYPES.includes(off.type));
}

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

// minRift = od které úrovně riftu může rarita padnout; dur = odolnost
// weight = váha při losování rarity (lepší kořist násobí všechny kromě šedé)
// q = „kvalita“ hodu afixu: vyšší číslo = vysoké hodnoty vzácnější (legendárky mají nejlepší šanci na vysoký hod)
const RARITIES = {
  gray:    { name: 'Běžný',      color: '#9d9d9d', weight: 100, minRift: 1,  mult: 1.00, aff: 0, q: 3, sell: 1,  price: 0,   dur: 30 },
  green:   { name: 'Neobvyklý',  color: '#4fd05a', weight: 30,  minRift: 1,  mult: 1.15, aff: 1, q: 3, sell: 5,  price: 150, dur: 40 },
  purple:  { name: 'Epický',     color: '#b75cff', weight: 6,   minRift: 4,  mult: 1.35, aff: 2, q: 2.2, sell: 18, price: 600, dur: 50 },
  orange:  { name: 'Legendární', color: '#ff9a1f', weight: 1,   minRift: 10, mult: 1.60, aff: 3, q: 1.3, sell: 60, price: 2000, dur: 60 },
  diamond: { name: 'Diamantový', color: '#5ff0ff', weight: 0.3, minRift: 16, mult: 1.50, aff: 2, q: 1.3, sell: 70, price: 3000, dur: 60 },
  // Mýtický: nepadá losem rarity, jen z bossů od podzemí 150 (MYTHIC_CHANCE), vždy díl mýtického setu
  mythic:  { name: 'Mýtický',    color: '#ff4a1a', weight: 0,   minRift: 150, mult: 1.90, aff: 4, q: 0.7, sell: 150, price: 0,  dur: 80 }
};
const RARITY_ORDER = ['gray', 'green', 'purple', 'orange', 'diamond', 'mythic'];
const MYTHIC_CHANCE = 0.01;   // šance, že boss od podzemí 150 pustí mýtický předmět
// Očarování: podle nejsilnějšího z těchto statů dostane předmět znak v rohu (O1)
const ENCHANTS = {
  fire:   { name: 'Oheň',  color: '#ff7a2a', stats: ['firePct'] },
  frost:  { name: 'Mráz',  color: '#8fd8ff', stats: ['frostPct'] },
  nature: { name: 'Jed',   color: '#7ad04a', stats: ['naturePct'] },
  shadow: { name: 'Stín',  color: '#a070ff', stats: ['shadowPct'] },
  arcane: { name: 'Magie', color: '#ff6ad8', stats: ['arcanePct'] },
  gold:   { name: 'Zlato', color: '#ffd84a', stats: ['goldPct', 'mfPct'] },
  blood:  { name: 'Krev',  color: '#e03a3a', stats: ['ls'] }
};

// Náhodné afixy (inspirace Diablo 3, WoW, Grim Dawn).
// v0 = hodnota na úrovni 1 (roste do úrovně 100), w = váha (jak často padá, výchozí 1), slots = jen na těchto druzích,
// cap = strop hodnoty, attr/int = celé číslo, family = rodina konkrétních klíčů (zbraň → "axe_atkPct", dovednost → "skd_fireball").
const AFFIXES = {
  // Atributy
  str:       { v0: 3, attr: true, w: 1.3, suf: 'síly' },
  agi:       { v0: 3, attr: true, w: 1.3, suf: 'obratnosti' },
  int:       { v0: 3, attr: true, w: 1.3, suf: 'rozumu' },
  sta:       { v0: 3, attr: true, w: 1.3, suf: 'výdrže' },
  spi:       { v0: 3, attr: true, w: 1.1, suf: 'moudrosti' },
  // Útok
  atkPct:    { v0: 0.03,   suf: 'moci' },
  wpnPct:    { v0: 0.05,   family: 'weapon', w: 0.9, slots: ['weapon', 'offhand', 'gloves', 'neck', 'ring'] },
  skillDmg:  { v0: 0.08,   family: 'skill',  w: 0.9, suf: 'mistrovství' },
  skillPct:  { v0: 0.03,   suf: 'umění' },
  spdPct:    { v0: 0.02,   suf: 'rychlosti' },
  castPct:   { v0: 0.03,   suf: 'čarodějnictví', slots: ['weapon', 'offhand', 'gloves', 'neck', 'ring', 'head'] },
  wpnSpd:    { v0: 0.03,   suf: 'šermu',         slots: ['weapon', 'offhand', 'gloves', 'neck', 'ring', 'head'] },
  crit:      { v0: 0.008,  suf: 'přesnosti' },
  critDmg:   { v0: 0.05,   suf: 'zkázy' },
  physPct:   { v0: 0.04,   suf: 'oceli' },
  firePct:   { v0: 0.04,   suf: 'plamenů' },
  frostPct:  { v0: 0.04,   suf: 'mrazu' },
  shadowPct: { v0: 0.04,   suf: 'temnoty' },
  naturePct: { v0: 0.04,   suf: 'hvozdu' },
  arcanePct: { v0: 0.04,   suf: 'magie' },
  eliteDmg:  { v0: 0.04,   w: 0.8, suf: 'lovce elit' },
  vsUndead:  { v0: 0.06,   w: 0.6, suf: 'exorcisty' },
  vsBeast:   { v0: 0.06,   w: 0.6, suf: 'lovce šelem' },
  vsDemon:   { v0: 0.06,   w: 0.6, suf: 'vymítače' },
  execPct:   { v0: 0.06,   w: 0.7, suf: 'popravčího' },
  dotPct:    { v0: 0.05,   w: 0.8, suf: 'moru' },
  armorPen:  { v0: 0.03,   w: 0.7, suf: 'průrazu' },
  resPen:    { v0: 0.02,   w: 0.6, suf: 'průniku' },
  doubleChance: { v0: 0.01, w: 0.5, suf: 'dvojitého úderu' },
  stunChance:   { v0: 0.01, w: 0.5, suf: 'omráčení' },
  petPct:    { v0: 0.05,   w: 0.7, suf: 'smečky' },
  // Zdroj (mana, zuřivost, soustředění, duch)
  resMax:    { v0: 4, int: true, w: 0.8, suf: 'zásob' },
  resRegenPct: { v0: 0.04, w: 0.8, suf: 'proudu' },
  genPct:    { v0: 0.04,   w: 0.8, suf: 'bojovníka' },
  costRed:   { v0: 0.025,  w: 0.8, suf: 'úspornosti', slots: ['weapon', 'offhand', 'neck', 'ring', 'head'] },
  skillCd:   { v0: 0.25,   w: 0.8, suf: 'pohotovosti', slots: ['weapon', 'offhand', 'neck', 'ring', 'head'] },
  killRes:   { v0: 1.5, int: true, w: 0.6, suf: 'žně' },
  // Obrana
  def:       { v0: 1, vl: 0.15, suf: 'ochrany' },
  ls:        { v0: 0.008,  suf: 'upíra' },
  dodge:     { v0: 0.008,  suf: 'stínu' },
  block:     { v0: 0.01,   suf: 'hradby' },
  regen:     { v0: 0.0008, suf: 'obnovy' },
  healPct:   { v0: 0.05,   suf: 'uzdravení' },
  killHeal:  { v0: 0.005,  w: 0.6, suf: 'krve' },
  thorns:    { v0: 0.03,   suf: 'trnů' },
  resFire:   { v0: 0.018, cap: 0.06, suf: 'ohnivzdornosti' },
  resFrost:  { v0: 0.018, cap: 0.06, suf: 'zimy' },
  resShadow: { v0: 0.018, cap: 0.06, suf: 'světla' },
  resNature: { v0: 0.018, cap: 0.06, suf: 'protijedu' },
  resArcane: { v0: 0.018, cap: 0.06, suf: 'rozptylu' },
  resAll:    { v0: 0.012, cap: 0.04, suf: 'živlů' },
  eliteRed:  { v0: 0.03,   w: 0.7, suf: 'štítonoše' },
  rangedRed: { v0: 0.04,   w: 0.7, suf: 'šípové stěny' },
  areaRed:   { v0: 0.04,   w: 0.7, suf: 'úkrytu' },
  ccRed:     { v0: 0.06,   w: 0.6, suf: 'svobody' },
  msPct:     { v0: 0.03,   suf: 'větru', slots: ['boots'] },
  // Kořist
  goldPct:   { v0: 0.05,   w: 0.7, suf: 'bohatství' },
  mfPct:     { v0: 0.05,   w: 0.7, suf: 'štěstí' },
  dropPct:   { v0: 0.03,   w: 0.5, suf: 'hledače' },
  xpPct:     { v0: 0.04,   w: 0.5, suf: 'zkušenosti' }
};
const PREFIXES = ['Starobyl', 'Runov', 'Prastar', 'Zářiv', 'Stínov', 'Královsk', 'Bouřn'];
const ADJ_END = { m: 'ý', f: 'á', n: 'é', p: 'é' };

// Legendárky: cls = které třídy je smí nosit. Při padání dostanou hlavní atribut své třídy.
const LEGENDARIES = [
  // Válečník
  { id: 'bloodmoon',   cls: ['warrior'],                     slot: 'weapon',  type: 'axe',     name: 'Sekera Krvavého měsíce',  stats: { ls: 0.05, doubleChance: 0.2 } },
  { id: 'vigil',       cls: ['warrior'],                     slot: 'offhand', type: 'shield',  name: 'Štít Věčné hlídky',       stats: { block: 0.1, thorns: 0.15 } },
  { id: 'phoenix',     cls: ['warrior', 'druid'],            slot: 'chest',   type: 'mail',    name: 'Fénixova zbroj',          stats: { regen: 0.004, rebirth: 1 } },
  { id: 'stoneskin',   cls: ['warrior', 'druid'],            slot: 'legs',    type: 'pants',   name: 'Nohavice Kamenné kůže',   stats: { dmgRed: 0.08, resAll: 0.05 } },
  { id: 'headsman',    cls: ['warrior', 'hunter'],           slot: 'neck',    type: 'amulet',  name: 'Amulet Popravčího',       stats: { critDmg: 0.25, execPct: 0.5 } },
  // Mág
  { id: 'eternalfire', cls: ['mage'],                        slot: 'weapon',  type: 'orb',     name: 'Kniha věčného ohně',      stats: { firePct: 0.3, resPen: 0.1 } },
  { id: 'frostking',   cls: ['mage'],                        slot: 'head',    type: 'circlet', name: 'Koruna Mrazivého krále',  stats: { hpPct: 0.10, slowAura: 0.2, freezeChance: 0.05 } },
  { id: 'starfall',    cls: ['mage'],                        slot: 'weapon',  type: 'orb',     name: 'Kniha Hvězdného prachu', stats: { arcanePct: 0.25, skillCd: 1 } },
  { id: 'runerobe',    cls: ['mage', 'warlock'],             slot: 'chest',   type: 'robe',    name: 'Róba Tisíce run',         stats: { resAll: 0.05, skillPct: 0.15, castPct: 0.12 } },
  // Černokněžník
  { id: 'void',        cls: ['warlock'],                     slot: 'ring',    type: 'signet',  name: 'Prsten Prázdnoty',        stats: { shadowPct: 0.25, dotPct: 0.25 } },
  { id: 'soulreaper',  cls: ['warlock'],                     slot: 'weapon',  type: 'orb',     name: 'Kniha Žnece duší',        stats: { shadowPct: 0.2, ls: 0.03, dotDur: 2 } },
  { id: 'shadowwalk',  cls: ['hunter', 'warlock'],           slot: 'cloak',   type: 'cloak',   name: 'Plášť Stínochodce',       stats: { dodge: 0.06, resShadow: 0.08 } },
  // Lovec
  { id: 'windrunner',  cls: ['hunter'],                      slot: 'boots',   type: 'sandals', name: 'Boty Větrného běžce',     stats: { spdPct: 0.15, dodge: 0.05 } },
  { id: 'eagleeye',    cls: ['hunter'],                      slot: 'weapon',  type: 'bow',     name: 'Luk Orlího oka',          stats: { crit: 0.06, armorPen: 0.2 } },
  { id: 'summoner',    cls: ['hunter', 'warlock', 'druid'],  slot: 'ring',    type: 'ring',    name: 'Prsten Vyvolávače',       stats: { petPct: 0.30, petCount: 1 } },
  // Druid
  { id: 'oakheart',    cls: ['druid'],                       slot: 'weapon',  type: 'staff',   name: 'Hůl Srdce dubu',          stats: { naturePct: 0.25, healPct: 0.25 } },
  { id: 'antlers',     cls: ['druid'],                       slot: 'head',    type: 'circlet', name: 'Koruna z parohů',         stats: { hpPct: 0.08, dodge: 0.04, resNature: 0.08 } }
];

// Sety: 6 dílů, bonusy za 1, 3 a 6 nasazených dílů. pieces: druh → [jméno, typ]. cls = kdo je smí nosit.
// color a glyph = barva a znak setu (znak v rohu ikony), mythic = mýtický set (rarita mythic, efekty ohně při 3 a 6 dílech)
const SETS = {
  titan: {
    name: 'Zbroj Titána', cls: ['warrior'], color: '#e0a050', glyph: 'set_titan',
    pieces: { head: ['Titánova helma', 'helm'], chest: ['Titánův kyrys', 'plate'], legs: ['Titánovy nohavice', 'greaves'],
              boots: ['Titánovy boty', 'boots'], cloak: ['Titánův plášť', 'mantle'], neck: ['Titánova pečeť', 'talisman'] },
    bonus: { 1: { hpPct: 0.10 }, 3: { def: 8, thorns: 0.10, block: 0.05 }, 6: { hpPct: 0.25, dmgRed: 0.2 } }
  },
  archmage: {
    name: 'Odkaz Arcimága', cls: ['mage'], color: '#6fa8ff', glyph: 'set_archmage',
    pieces: { weapon: ['Kniha Arcimága', 'orb'], head: ['Kápě Arcimága', 'hood'], chest: ['Róba Arcimága', 'robe'],
              legs: ['Kalhoty Arcimága', 'pants'], cloak: ['Plášť Arcimága', 'cloak'], ring: ['Prsten Arcimága', 'ring'] },
    bonus: { 1: { skillPct: 0.20 }, 3: { skillCd: 1, critDmg: 0.30 }, 6: { atkPct: 0.30, doubleChance: 0.2, resPen: 0.15 } }
  },
  shadow: {
    name: 'Stínový lovec', cls: ['hunter'], color: '#4fd1a5', glyph: 'set_shadow',
    pieces: { weapon: ['Stínová čepel', 'dagger'], head: ['Stínová maska', 'hood'], chest: ['Stínová vesta', 'vest'],
              boots: ['Stínové sandály', 'sandals'], cloak: ['Stínový plášť', 'cloak'], neck: ['Stínový amulet', 'amulet'] },
    bonus: { 1: { crit: 0.05 }, 3: { dodge: 0.08, spdPct: 0.15 }, 6: { critDmg: 0.50, execPct: 1 } }
  },
  pact: {
    name: 'Pakt Prázdnoty', cls: ['warlock'], color: '#c050ff', glyph: 'set_pact',
    pieces: { weapon: ['Kniha Paktu', 'orb'], head: ['Kápě Paktu', 'hood'], chest: ['Róba Paktu', 'robe'],
              gloves: ['Rukavice Paktu', 'gloves'], legs: ['Kalhoty Paktu', 'pants'], ring: ['Pečeť Paktu', 'signet'] },
    bonus: { 1: { shadowPct: 0.15 }, 3: { dotPct: 0.30, resAll: 0.05 }, 6: { atkPct: 0.30, ls: 0.05, petPct: 0.40 } }
  },
  grove: {
    name: 'Strážce Hvozdu', cls: ['druid'], color: '#7cd04a', glyph: 'set_grove',
    pieces: { weapon: ['Hůl Strážce', 'staff'], head: ['Parohy Strážce', 'circlet'], chest: ['Vesta Strážce', 'vest'],
              gloves: ['Rukavice Strážce', 'gloves'], boots: ['Sandály Strážce', 'sandals'], neck: ['Talisman Strážce', 'talisman'] },
    bonus: { 1: { naturePct: 0.15 }, 3: { healPct: 0.30, regen: 0.003, resNature: 0.10 }, 6: { atkPct: 0.30, petPct: 0.40, hpPct: 0.20 } }
  },
  // ---- Mýtické sety (jeden pro každou třídu) ----
  m_warrior: {
    name: 'Pekelný dobyvatel', cls: ['warrior'], color: '#ff4a1a', glyph: 'set_m_warrior', mythic: true,
    pieces: { weapon: ['Čepel Pekelného dobyvatele', 'greatsword'], head: ['Helma Pekelného dobyvatele', 'helm'], chest: ['Kyrys Pekelného dobyvatele', 'plate'],
              gloves: ['Pěsti Pekelného dobyvatele', 'gauntlets'], legs: ['Nohavice Pekelného dobyvatele', 'greaves'], boots: ['Boty Pekelného dobyvatele', 'boots'] },
    bonus: { 1: { atkPct: 0.15, hpPct: 0.10 }, 3: { dmgRed: 0.12, thorns: 0.25, ls: 0.03 }, 6: { atkPct: 0.50, doubleChance: 0.25, hpPct: 0.25 } }
  },
  m_mage: {
    name: 'Oko věčného plamene', cls: ['mage'], color: '#ff4a1a', glyph: 'set_m_mage', mythic: true,
    pieces: { weapon: ['Kniha věčného plamene', 'orb'], head: ['Koruna věčného plamene', 'circlet'], chest: ['Róba věčného plamene', 'robe'],
              gloves: ['Rukavice věčného plamene', 'gloves'], legs: ['Kalhoty věčného plamene', 'pants'], ring: ['Prsten věčného plamene', 'signet'] },
    bonus: { 1: { skillPct: 0.20, firePct: 0.15 }, 3: { skillCd: 2, castPct: 0.15, critDmg: 0.30 }, 6: { atkPct: 0.50, resPen: 0.20, doubleChance: 0.20 } }
  },
  m_warlock: {
    name: 'Koruna spáleného krále', cls: ['warlock'], color: '#ff4a1a', glyph: 'set_m_warlock', mythic: true,
    pieces: { weapon: ['Kniha spáleného krále', 'orb'], gloves: ['Rukavice spáleného krále', 'gloves'], head: ['Koruna spáleného krále', 'circlet'],
              chest: ['Róba spáleného krále', 'robe'], legs: ['Kalhoty spáleného krále', 'pants'], neck: ['Amulet spáleného krále', 'amulet'] },
    bonus: { 1: { shadowPct: 0.20, ls: 0.02 }, 3: { dotPct: 0.40, dotDur: 2, resAll: 0.05 }, 6: { atkPct: 0.50, petPct: 0.60, ls: 0.04 } }
  },
  m_hunter: {
    name: 'Lov rudého měsíce', cls: ['hunter'], color: '#ff4a1a', glyph: 'set_m_hunter', mythic: true,
    pieces: { weapon: ['Luk rudého měsíce', 'bow'], head: ['Kápě rudého měsíce', 'hood'], chest: ['Kožená vesta rudého měsíce', 'vest'],
              gloves: ['Rukavice rudého měsíce', 'gloves'], boots: ['Sandály rudého měsíce', 'sandals'], cloak: ['Plášť rudého měsíce', 'cloak'] },
    bonus: { 1: { crit: 0.05, petPct: 0.15 }, 3: { critDmg: 0.40, wpnSpd: 0.12, armorPen: 0.15 }, 6: { atkPct: 0.50, execPct: 1, petPct: 0.40 } }
  },
  m_druid: {
    name: 'Srdce hořícího hvozdu', cls: ['druid'], color: '#ff4a1a', glyph: 'set_m_druid', mythic: true,
    pieces: { weapon: ['Hůl hořícího hvozdu', 'staff'], head: ['Parohy hořícího hvozdu', 'circlet'], chest: ['Vesta hořícího hvozdu', 'vest'],
              legs: ['Kalhoty hořícího hvozdu', 'pants'], boots: ['Sandály hořícího hvozdu', 'sandals'], neck: ['Talisman hořícího hvozdu', 'talisman'] },
    bonus: { 1: { naturePct: 0.20, healPct: 0.15 }, 3: { regen: 0.004, castPct: 0.12, resAll: 0.05 }, 6: { atkPct: 0.50, petPct: 0.60, hpPct: 0.25 } }
  }
};
// Nejvyšší počet nasazených dílů jednoho mýtického setu (pro efekty ohně: 3 = oči, 6 = hořící postava)
function mythicPieces(ch) {
  let best = 0; const c = {};
  EQUIP_ORDER.forEach(s => { const it = ch.equip && ch.equip[s]; if (it && it.set && SETS[it.set] && SETS[it.set].mythic) c[it.set] = (c[it.set] || 0) + 1; });
  for (const k in c) best = Math.max(best, c[k]);
  return best;
}
// Očarování předmětu (klíč z ENCHANTS) nebo null – podle nejsilnějšího statu vzhledem k běžné hodnotě afixu
function itemEnchant(it) {
  if (!it || it.rarity === 'gray') return null;
  const st = Object.assign({}, it.base); for (const k in it.affixes) st[k] = (st[k] || 0) + it.affixes[k];
  if (it.leg) { const l = LEGENDARIES.find(x => x.id === it.leg); if (l) for (const k in l.stats) st[k] = (st[k] || 0) + l.stats[k]; }
  let best = null, bv = 0;
  for (const e in ENCHANTS) for (const k of ENCHANTS[e].stats) { const v = (st[k] || 0) / (AFFIXES[k] ? AFFIXES[k].v0 : 0.05); if (v > bv) { bv = v; best = e; } }
  return best;
}

const STAT_LABELS = {
  str:          v => `+${Math.round(v)} síla`,
  agi:          v => `+${Math.round(v)} obratnost`,
  int:          v => `+${Math.round(v)} intelekt`,
  sta:          v => `+${Math.round(v)} výdrž`,
  spi:          v => `+${Math.round(v)} moudrost`,
  castPct:      v => `+${pct(v)} % rychlost sesílání`,
  wpnSpd:       v => `+${pct(v)} % rychlost útoku zbraní`,
  eliteDmg:     v => `+${pct(v)} % poškození elitám a strážcům`,
  vsUndead:     v => `+${pct(v)} % poškození nemrtvým`,
  vsBeast:      v => `+${pct(v)} % poškození šelmám`,
  vsDemon:      v => `+${pct(v)} % poškození démonům`,
  resMax:       v => `+${Math.round(v)} max. zdroje (mana, zuřivost…)`,
  resRegenPct:  v => `+${pct(v)} % obnova zdroje`,
  genPct:       v => `+${pct(v)} % generování zdroje`,
  costRed:      v => `-${pct(v)} % cena dovedností`,
  killRes:      v => `+${Math.round(v)} zdroje za zabití`,
  killHeal:     v => `Zabití vyléčí ${pct(v, 1)} % života`,
  eliteRed:     v => `-${pct(v)} % poškození od elit a strážců`,
  rangedRed:    v => `-${pct(v)} % poškození od střel`,
  areaRed:      v => `-${pct(v)} % poškození z plošných útoků`,
  ccRed:        v => `-${pct(v)} % trvání zmrazení a zpomalení`,
  xpPct:        v => `+${pct(v)} % zkušeností`,
  atk:          v => `+${fmtNum(v)} útok`,
  atkPct:       v => `+${pct(v)} % útok`,
  hp:           v => `+${fmtNum(v)} života`,
  hpPct:        v => `+${pct(v)} % života`,
  def:          v => `+${fmtNum(v)} obrana`,
  spdPct:       v => `+${pct(v)} % rychlost útoku a sesílání`,
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
  titanGrip:    () => 'Obouruční meč nebo kladivo můžeš držet v každé ruce',
  rebirth:      () => 'Jednou za běh vstaneš z mrtvých (40 % života)',
  soulPct:      v => `+${pct(v)} % duší`,
  goldPct:      v => `+${pct(v)} % zlata`,
  dropPct:      v => `+${pct(v)} % šance na předmět`,
  mfPct:        v => `+${pct(v)} % lepší kořist`,
  msPct:        v => `+${pct(v)} % rychlost pohybu`
};

function pct(v, d = 0) { const n = v * 100; return d ? n.toFixed(d).replace('.', ',') : Math.round(n); }
function fmtNum(v) { return v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1).replace('.', ','); }
function statLine(k, v) {
  if (STAT_LABELS[k]) return STAT_LABELS[k](v);
  const i = k.indexOf('_'), pre = k.slice(0, i), rest = k.slice(i + 1);
  if (WEAPON_INSTR[pre] && rest === 'atkPct') return `+${pct(v)} % poškození ${WEAPON_INSTR[pre]}`;
  if (pre === 'skd' && typeof SKILLS !== 'undefined' && SKILLS[rest]) return `+${pct(v)} % poškození: ${SKILLS[rest].name}`;
  return `${k} ${v}`;
}
// Definice afixu i pro konkrétní klíč z rodiny ("axe_atkPct" → wpnPct, "skd_x" → skillDmg)
function affixDef(k) {
  if (AFFIXES[k]) return AFFIXES[k];
  const i = k.indexOf('_'), pre = k.slice(0, i);
  if (WEAPON_INSTR[pre]) return AFFIXES.wpnPct;
  if (pre === 'skd') return AFFIXES.skillDmg;
  return null;
}
function affixSuffix(k) {
  const i = k.indexOf('_'), pre = i > 0 ? k.slice(0, i) : '';
  if (WEAPON_SUF[pre]) return WEAPON_SUF[pre];
  const d = affixDef(k);
  return d ? d.suf : '';
}
// Dovednosti třídy: výchozí + všechny z talentových stromů
function classSkillIds(cls) {
  const out = CLASSES[cls].base.slice();
  if (typeof talentNodes === 'function') talentNodes(cls).forEach(n => { if (n.type === 'skill' && n.skill && !out.includes(n.skill)) out.push(n.skill); });
  return out;
}
function itemIcon(it) { return ITEM_TYPES[it.type] ? ITEM_TYPES[it.type].icon : 'ring'; }
function itemHand(it) { return it.slot === 'weapon' && ITEM_TYPES[it.type] ? ITEM_TYPES[it.type].hand : 0; }
function kindLabel(it) {
  if (it.slot === 'weapon') return itemHand(it) === 2 ? 'Obouruční zbraň' : 'Jednoruční zbraň';
  if (it.slot === 'offhand') return it.type === 'shield' ? 'Štít' : 'Ohnisko (levá ruka)';
  const w = armorWeight(it);
  return ITEM_KINDS[it.slot].name + (w ? ' · ' + ARMOR_WEIGHT[w].name.toLowerCase() : '');
}
function armorWeight(it) { return ITEM_TYPES[it.type] && ITEM_TYPES[it.type].armor || null; }
// Pro které třídy je předmět (legendárky a sety); null = pro všechny
function itemClasses(it) {
  if (it.leg) { const l = LEGENDARIES.find(x => x.id === it.leg); return l ? l.cls : null; }
  if (it.set) return SETS[it.set] ? SETS[it.set].cls : null;
  return null;
}
function classMainStats(cls) { return CLASSES[cls].main || []; }

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

// Hod afixu: úroveň předmětu zvedá strop (do úrovně 100 až 3×), hod 50–100 % stropu je vychýlený k nízkým hodnotám.
// Šance na hod nad 90 % stropu: zelený ≈ 7 %, epický ≈ 10 %, legendární/diamantový ≈ 16 %. Průměr 63 / 66 / 72 % stropu.
function affixRoll(rarity) { return 0.5 + 0.5 * Math.pow(Math.random(), (RARITIES[rarity] || RARITIES.green).q); }
function rollAffixValue(k, ilvl, rarity) {
  const a = affixDef(k);
  const v = (a.vl !== undefined ? a.v0 + a.vl * ilvl : a.v0 * (1 + Math.min(ilvl, 100) / 50)) * affixRoll(rarity);
  if (k === 'def' || a.attr || a.int) return Math.max(1, Math.round(v));
  return +(a.cap ? Math.min(a.cap, v) : v).toFixed(4);
}

// Ořízne odolnosti předmětu na RES_ITEM_CAP pro každý živel (nejdřív afixy, pak základ). Vrací true, když něco změnil.
function capItemRes(it) {
  const leg = it.leg ? LEGENDARIES.find(l => l.id === it.leg) : null, L = leg ? leg.stats : {};
  const get = (o, k) => (o && o[k]) || 0;
  let changed = false;
  RES_ELEMS.forEach(E => {
    const k = 'res' + E;
    let over = get(it.base, 'resAll') + get(it.affixes, 'resAll') + get(it.base, k) + get(it.affixes, k) + get(L, 'resAll') + get(L, k) - RES_ITEM_CAP;
    for (const [obj, key] of [[it.affixes, k], [it.affixes, 'resAll'], [it.base, k], [it.base, 'resAll']]) {
      if (over <= 1e-6) break;
      if (!obj || !obj[key]) continue;
      const cut = Math.min(obj[key], over);
      obj[key] = +(obj[key] - cut).toFixed(4); over -= cut; changed = true;
      if (obj[key] <= 0.001) delete obj[key];
    }
  });
  return changed;
}

// Z rodiny afixu udělá konkrétní klíč podle předmětu a třídy (chytrá kořist)
function resolveFamily(fam, ctx) {
  const wtypes = ITEM_KINDS.weapon.types;
  if (fam === 'weapon') {
    let t = ctx.kind === 'weapon' ? ctx.type : null;
    if (!t) { const pool = ctx.cls ? CLASSES[ctx.cls].weapons.filter(x => wtypes.includes(x)) : wtypes; t = pool[Math.floor(Math.random() * pool.length)]; }
    return t + '_atkPct';
  }
  if (fam === 'skill') {
    const cls = ctx.cls || Object.keys(CLASSES)[Math.floor(Math.random() * 5)];
    const ids = classSkillIds(cls);
    return 'skd_' + ids[Math.floor(Math.random() * ids.length)];
  }
  return null;
}

// n afixů bez opakování, vážený výběr; ctx = { kind, type, cls }
function rollAffixes(n, ilvl, exclude, ctx = {}) {
  let pool = Object.keys(AFFIXES).filter(k => !exclude.includes(k) && (!AFFIXES[k].slots || !ctx.kind || AFFIXES[k].slots.includes(ctx.kind)));
  const out = {};
  while (Object.keys(out).length < n && pool.length) {
    const tot = pool.reduce((a, k) => a + (AFFIXES[k].w || 1), 0);
    let roll = Math.random() * tot, pick = pool[pool.length - 1];
    for (const k of pool) { roll -= AFFIXES[k].w || 1; if (roll <= 0) { pick = k; break; } }
    pool = pool.filter(k => k !== pick);
    const key = AFFIXES[pick].family ? resolveFamily(AFFIXES[pick].family, ctx) : pick;
    if (!key || exclude.includes(key) || out[key] !== undefined) continue;
    out[key] = rollAffixValue(key, ilvl, ctx.rarity);
  }
  return out;
}

function rollBase(defs, ilvl, mult) {
  const out = {};
  defs.forEach(([k, v0, vl, grow, cap]) => {
    let v = (v0 + (vl || 0) * ilvl) * (grow ? itemPow(ilvl) : 1) * mult * (0.9 + Math.random() * 0.2);
    if (cap) v = Math.min(cap, v);
    v += out[k] || 0;   // stejný stat z druhu i z váhy zbroje se sčítá
    out[k] = (k === 'def' || k === 'atk' || k === 'hp') ? Math.max(1, Math.round(v)) : +v.toFixed(4);
  });
  return out;
}

// Základní staty podle druhu a typu (+ obrana nebo odolnosti podle váhy zbroje)
function baseDefsFor(kind, type) {
  const T = ITEM_TYPES[type], K = ITEM_KINDS[kind];
  if (kind === 'weapon') return [['atk', WEAPON_ATK[T.hand], 0, true]].concat(T.base || []);
  const defs = (T.base || K.base || []).slice();
  if (T.armor) defs.push(...ARMOR_WEIGHT[T.armor].extra);
  return defs;
}

// Může třída předmět nosit? Zbraně a levá ruka podle třídy, legendárky a sety podle cls, ostatní všichni.
// Smí třída nosit tenhle typ zbroje? (lehká všichni, těžká podle heavyArmor v CLASSES)
function canWearArmorType(cls, type) {
  if (!ITEM_TYPES[type] || ITEM_TYPES[type].armor !== 'heavy') return true;
  const h = CLASSES[cls].heavyArmor;
  return h === true || (Array.isArray(h) && h.includes(type));
}
function heavyArmorText(cls) {
  return 'Těžkou zbroj nosí jen válečník, druid jen kroužkovou zbroj';
}
function canClassUse(it, cls) {
  const only = itemClasses(it);
  if (only && !only.includes(cls)) return false;
  if (!canWearArmorType(cls, it.type)) return false;   // těžká zbroj: válečník celá, druid jen kroužková
  if (it.slot !== 'weapon' && it.slot !== 'offhand') return true;
  return CLASSES[cls].weapons.includes(it.type);
}

const SMART_UNIQUE = 0.85;   // šance, že legendárka/set padne pro vlastní třídu (jako Diablo 3)
const SMART_ARMOR = 0.7;     // šance na preferovanou váhu zbroje třídy
const SMART_ATTR = 0.4;      // šance, že předmět s afixy dostane hlavní atribut třídy

// cls = třída pro "chytrou kořist" (zbraně, zbroj, atributy a unikáty vhodné pro třídu)
function makeItem(ilvl, rarity, uid, forceKind, cls) {
  const r = RARITIES[rarity];
  let kind = forceKind || rollKind(), type = null, name = null, forCls = cls || null;
  if (cls) {
    const allowed = CLASSES[cls].weapons;
    if (kind === 'offhand' && !allowed.some(t => ITEM_KINDS.offhand.types.includes(t))) kind = 'weapon';
    if (kind === 'weapon' || kind === 'offhand') {
      const pool = ITEM_KINDS[kind].types.filter(t => allowed.includes(t));
      type = pool[Math.floor(Math.random() * pool.length)];
    } else if (CLASSES[cls].armor && (CLASSES[cls].heavyArmor !== true || Math.random() < SMART_ARMOR)) {
      // třída bez těžké zbroje dostane z chytré kořisti vždy lehkou
      const pool = ITEM_KINDS[kind].types.filter(t => ITEM_TYPES[t].armor === CLASSES[cls].armor);
      if (pool.length) type = pool[Math.floor(Math.random() * pool.length)];
    } else if (CLASSES[cls].heavyArmor !== true) {
      // druid: jen typy, které smí nosit (lehká + kroužková zbroj)
      const pool = ITEM_KINDS[kind].types.filter(t => canWearArmorType(cls, t));
      if (pool.length) type = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const item = { uid, rarity, ilvl };
  if (rarity === 'orange') {
    const mine = cls ? LEGENDARIES.filter(l => l.cls.includes(cls)) : [];
    const pool = mine.length && Math.random() < SMART_UNIQUE ? mine : LEGENDARIES;
    const leg = pool[Math.floor(Math.random() * pool.length)];
    kind = leg.slot; type = leg.type; name = leg.name; item.leg = leg.id;
    if (!forCls || !leg.cls.includes(forCls)) forCls = leg.cls[Math.floor(Math.random() * leg.cls.length)];
  } else if (rarity === 'diamond' || rarity === 'mythic') {
    const all = Object.keys(SETS).filter(id => !!SETS[id].mythic === (rarity === 'mythic')), mine = cls ? all.filter(id => SETS[id].cls.includes(cls)) : [];
    const ids = mine.length && Math.random() < SMART_UNIQUE ? mine : all;
    const setId = ids[Math.floor(Math.random() * ids.length)];
    const kinds = Object.keys(SETS[setId].pieces);
    kind = kinds[Math.floor(Math.random() * kinds.length)];
    [name, type] = SETS[setId].pieces[kind];
    item.set = setId;
    if (!forCls || !SETS[setId].cls.includes(forCls)) forCls = SETS[setId].cls[0];
  }
  if (rarity !== 'orange' && rarity !== 'diamond' && rarity !== 'mythic' && type && ITEM_KINDS[kind].types.indexOf(type) < 0) type = null;
  const K = ITEM_KINDS[kind];
  type = type || K.types[Math.floor(Math.random() * K.types.length)];
  item.slot = kind; item.type = type;
  item.base = rollBase(baseDefsFor(kind, type), ilvl, r.mult);
  const mains = forCls ? classMainStats(forCls) : [];
  const mainKey = mains.length ? mains[Math.floor(Math.random() * mains.length)] : null;
  // legendárky a sety mají vždy hlavní atribut své třídy (silnější než afix)
  if ((item.leg || item.set) && mainKey) item.base[mainKey] = Math.max(2, Math.round(rollAffixValue(mainKey, ilvl, rarity) * (rarity === 'mythic' ? 2.2 : 1.6)));
  const legDef = item.leg ? LEGENDARIES.find(l => l.id === item.leg) : null;
  item.affixes = rollAffixes(r.aff, ilvl, Object.keys(item.base).concat(legDef ? Object.keys(legDef.stats) : []), { kind, type, cls: forCls, rarity });
  // chytrá kořist: běžné předměty občas dostanou hlavní atribut třídy místo náhodného afixu
  const ak = Object.keys(item.affixes);
  if (cls && mainKey && ak.length && !item.base[mainKey] && !ak.some(k => mains.includes(k)) && Math.random() < SMART_ATTR) {
    delete item.affixes[ak[0]];
    item.affixes = Object.assign({ [mainKey]: rollAffixValue(mainKey, ilvl, rarity) }, item.affixes);
  }
  if (!name) {
    const [noun, gender] = ITEM_TYPES[type].noun.split(':');
    if (rarity === 'gray') name = noun;
    else {
      const firstAff = Object.keys(item.affixes)[0];
      const suf = firstAff ? ' ' + affixSuffix(firstAff) : '';
      const adj = PREFIXES[Math.floor(Math.random() * PREFIXES.length)] + ADJ_END[gender];
      name = (rarity === 'purple' ? adj + ' ' + noun.charAt(0).toLowerCase() + noun.slice(1) : noun) + suf;
    }
  }
  item.name = name;
  item.maxDur = item.dur = r.dur;
  capItemRes(item);
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

const STAT_WEIGHTS = { atk: 3, hp: 0.3, def: 2.5, atkPct: 150, hpPct: 100, healPct: 40, spdPct: 150, crit: 250, critDmg: 60,
  ls: 150, dodge: 150, block: 120, dmgRed: 300, regen: 3000, thorns: 50, goldPct: 20, mfPct: 30, dropPct: 20, xpPct: 20,
  physPct: 60, firePct: 60, frostPct: 60, shadowPct: 60, naturePct: 60, arcanePct: 60,
  resFire: 50, resFrost: 50, resShadow: 50, resNature: 50, resArcane: 50, resAll: 220,
  resPen: 150, armorPen: 120, execPct: 50, doubleChance: 200, slowAura: 150, freezeChance: 300, stunChance: 150,
  petPct: 40, petCount: 50, dotPct: 40, skillPct: 60, skillCd: 30, rebirth: 60,
  eliteDmg: 120, vsUndead: 50, vsBeast: 50, vsDemon: 50, resMax: 2, resRegenPct: 100, genPct: 100, costRed: 150, killRes: 5,
  killHeal: 400, eliteRed: 150, rangedRed: 80, areaRed: 80, ccRed: 60, msPct: 80 };
const ELEM_PCT = { physPct: 'phys', firePct: 'fire', frostPct: 'frost', shadowPct: 'shadow', naturePct: 'nature', arcanePct: 'arcane' };
// Kouzelník = základní útok je kouzlo (není fyzický) → těží z rychlosti sesílání
function isCasterClass(cls) { const S = SKILLS[CLASSES[cls].base[0]]; return !!S && S.elem !== 'phys'; }
// Váha atributu: vedlejší účinek pro všechny + útok, pokud je to hlavní atribut třídy
function attrWeight(k, cls) {
  const spi = cls && CLASSES[cls].res.regen <= 0 ? ATTR_FX.spiGen * STAT_WEIGHTS.genPct : ATTR_FX.spiRegen * STAT_WEIGHTS.resRegenPct;
  const side = { str: ATTR_FX.strDef * STAT_WEIGHTS.def, agi: ATTR_FX.agiCrit * STAT_WEIGHTS.crit,
                 int: ATTR_FX.intRes * STAT_WEIGHTS.resAll, sta: ATTR_FX.staHp * STAT_WEIGHTS.hpPct, spi }[k];
  return side + (cls && classMainStats(cls).includes(k) ? ATTR_FX.mainAtk * STAT_WEIGHTS.atkPct : 0);
}
// Váha jednoho statu. ctx = { elems, cls, wtypes (držené typy zbraní), skills (dovednosti na liště) }
function statWeight(k, it, ctx) {
  if (ATTRS[k]) return attrWeight(k, ctx.cls);
  const i = k.indexOf('_'), pre = i > 0 ? k.slice(0, i) : '';
  if (WEAPON_INSTR[pre]) return (it.type === pre || (ctx.wtypes || []).includes(pre)) ? 150 : 10;
  if (pre === 'skd') return (ctx.skills || []).includes(k.slice(4)) ? 60 : 5;
  if (k === 'castPct') return ctx.cls && !isCasterClass(ctx.cls) ? 5 : 150;
  if (k === 'wpnSpd') return ctx.cls && isCasterClass(ctx.cls) ? 5 : 150;
  if (ctx.elems && ELEM_PCT[k] && !ctx.elems.includes(ELEM_PCT[k])) return 5;
  return STAT_WEIGHTS[k] || 10;
}
// ctx může být i jen pole elementů (starší volání)
function itemScore(it, ctx, cls) {
  if (Array.isArray(ctx) || !ctx) ctx = { elems: ctx || null, cls };
  const st = itemStats(it);
  let s = 0;
  for (const k in st) s += statWeight(k, it, ctx) * st[k];
  if (it.set) s += 30;
  return Math.round(s);
}

function repairCost(it) {
  if (it.dur === undefined || it.dur >= it.maxDur) return 0;
  return Math.max(1, Math.round((it.maxDur - it.dur) / it.maxDur * sellValue(it) * 4));
}
function sellValue(it) { return Math.max(1, Math.round(RARITIES[it.rarity].sell * goldPow(it.ilvl))); }
function buyPrice(it) { return Math.round(RARITIES[it.rarity].price * goldPow(it.ilvl)); }

