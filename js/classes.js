// Třídy, zdroje, aktivní dovednosti a talentové stromy.
//
// main = hlavní atribut (+1 % útoku za bod; druid bere vyšší z intelektu a obratnosti),
// armor = preferovaná zbroj pro chytrou kořist (heavy = těžká, light = lehká, null = obojí);
// heavyArmor = smí nosit těžkou zbroj (v1.18 jen válečník a druid, ostatní jen lehkou).
// Každá třída má 2 výchozí dovednosti (základní útok + jednu další), ostatní odemykají talenty (js/talents.js).

const CLASSES = {
  warrior: {
    name: 'Válečník', hp: 1.2, atk: 1.0, def: 3, spd: 0.95, elem: 'phys', main: ['str'], armor: 'heavy', heavyArmor: true,
    res: { name: 'Zuřivost', color: '#d8402a', max: 100, regen: -2, start: 0 },
    weapons: ['sword', 'axe', 'mace', 'greatsword', 'hammer', 'shield'], starter: 'sword',
    colors: ['#a9b2bd', '#646c77'],
    base: ['slash', 'leap'],
    dr: 0.25,
    trait: { name: 'Železná kůže', desc: 'Bojuje v první linii: dostává o 25 % menší poškození než ostatní třídy.' },
    desc: 'Tank na blízko. Vydrží nejvíc, útočí jen zblízka a do boje skáče. Útoky generují zuřivost. Zuřivost (dvě zbraně) nebo Zbraně (obouručka).',
  },
  mage: {
    name: 'Mág', hp: 0.92, atk: 1.25, def: -1, spd: 1.0, elem: 'arcane', main: ['int'], armor: 'light',
    res: { name: 'Mana', color: '#3a6ae0', max: 100, regen: 1.4, start: 100 },
    weapons: ['orb'], starter: 'orb',   // v1.18: kouzelníci drží jen Knihu kouzel (obouruční), magii sesílají sami
    colors: ['#6a4ae0', '#43309a'],
    base: ['missile', 'blink'],
    barrier: 0.15,
    trait: { name: 'Arkánní bariéra', desc: 'Štít ve výši 15 % života pohltí poškození. Obnoví se, když tě 5 s nic nezasáhne.' },
    desc: 'Skleněné dělo: obrovská plošná kouzla z dálky, ale málo života. Bariéra a teleport ho drží naživu. Oheň, nebo Mráz.',
  },
  warlock: {
    name: 'Černokněžník', hp: 1.0, atk: 1.1, def: 0, spd: 1.0, ls: 0.04, elem: 'shadow', main: ['int'], armor: 'light',
    res: { name: 'Mana', color: '#7a3ae0', max: 100, regen: 1.2, start: 100 },
    weapons: ['orb'], starter: 'orb',
    colors: ['#2c3a86', '#11132a'],
    base: ['sbolt', 'drain'],
    dotLeech: 0.10,
    trait: { name: 'Temný pakt', desc: 'Vysává 4 % poškození jako život a jeho kletby (poškození v čase) ho léčí o 10 % svého poškození.' },
    desc: 'Pomalá smrt: prokleje celé skupiny a žije z jejich utrpení, nebo velí démonům. Kletby, nebo Démonologie.',
  },
  hunter: {
    name: 'Lovec', hp: 0.95, atk: 1.0, def: 0, spd: 1.15, elem: 'phys', pet: 'wolf', main: ['agi'], armor: 'light',
    res: { name: 'Soustředění', color: '#d8a030', max: 100, regen: 1.6, start: 100 },
    weapons: ['bow', 'dagger', 'sword', 'axe'], starter: 'bow',
    colors: ['#4a7a3a', '#5a3a1e'],
    base: ['shot', 'vault'],
    ms: 1.05, rangeBonus: 0.2,
    trait: { name: 'Lovec na dálku', desc: 'Čím dál je cíl, tím víc zraní: +1 % poškození za každých 10 bodů vzdálenosti nad 40 (až +20 %). +5 % rychlost pohybu.' },
    desc: 'Mrštný střelec: drží si odstup, střílí v pohybu, klade pasti a má věrného vlka. Lučištník, nebo Pán šelem.',
  },
  druid: {
    name: 'Druid', hp: 1.05, atk: 0.95, def: 2, spd: 1.0, regen: 0.004, elem: 'nature', main: ['int', 'agi'], armor: null, heavyArmor: true,
    res: { name: 'Duch', color: '#3ab060', max: 100, regen: 1.2, start: 100 },
    weapons: ['staff', 'mace', 'orb', 'dagger'], starter: 'staff',
    colors: ['#7a5a2a', '#3e6a2a'],
    base: ['wrath', 'rejuv'],
    shapeshift: true,
    trait: { name: 'Proměnlivost', desc: 'V medvědí a vlčí podobě útočí drápy zblízka místo Hněvu, v měsíční podobě Hněv vystřelí dvakrát. Každá proměna vyléčí 10 % života.' },
    desc: 'Měňavec: z dálky kouzlí, v podobě šelmy bojuje zblízka a léčí se. Rovnováha, nebo Divočina.',
  }
};

// ---------- Aktivní dovednosti ----------
// type: melee | projectile | ground | nova | leap | dash | teleport | buff | summon | heal | whirl | petstrike | trap | drain
// dmg = násobek útoku, cost = zdroj, gen = získaný zdroj, cd = cooldown v s
const SKILLS = {
  // Válečník
  slash:    { name: 'Sek', glyph: '⚔', primary: true, type: 'melee', elem: 'phys', range: 26, arc: 120, dmg: 1.0, gen: 12, color: '#ffffff', desc: 'Úder zblízka do oblouku. Generuje zuřivost.' },
  leap:     { name: 'Drtivý skok', glyph: '⤴', type: 'leap', elem: 'phys', dist: 96, r: 36, dmg: 1.6, stun: 0.6, cd: 9, gen: 20, color: '#c8a060', desc: 'Skok na cíl, dopad zraní a omráčí okolí.' },
  mortal:   { name: 'Smrtící úder', glyph: '✖', type: 'melee', elem: 'phys', range: 28, arc: 70, dmg: 3.2, cost: 30, dot: { elem: 'phys', pct: 0.5, dur: 5 }, color: '#ff5050', desc: 'Mohutný úder, který způsobí krvácení.' },
  cleave:   { name: 'Rozsekání', glyph: '◠', type: 'melee', elem: 'phys', range: 34, arc: 220, dmg: 1.8, cost: 20, dot: { elem: 'phys', pct: 0.3, dur: 4 }, color: '#ffb0a0', desc: 'Široký sek kolem sebe s krvácením.' },
  whirl:    { name: 'Vichřice', glyph: '🌀', type: 'whirl', elem: 'phys', r: 30, dmg: 0.55, dur: 3, cost: 40, cd: 5, color: '#e0e0e0', desc: 'Točíš se a sekáš vše kolem sebe, pohybuješ se rychleji.' },
  shout:    { name: 'Bojový pokřik', glyph: '📯', type: 'buff', dur: 10, stats: { atkPct: 0.25, dmgRed: 0.1 }, cd: 20, gen: 40, color: '#ffd060', desc: '+25 % útok a -10 % přijatého poškození na 10 s.' },
  bash:     { name: 'Úder štítem', glyph: '🛡', type: 'dash', elem: 'phys', dist: 56, r: 24, dmg: 2.2, stun: 1.5, cost: 20, cd: 4, color: '#c9ced6', desc: 'Výpad vpřed, zasažené omráčí.' },
  quake:    { name: 'Zemětřesení', glyph: '⛰', type: 'nova', elem: 'phys', r: 64, dmg: 2.5, stun: 1.2, cost: 40, cd: 10, color: '#c8a060', desc: 'Otřes kolem tebe zraní a omráčí nepřátele.' },
  // Mág
  missile:  { name: 'Magická střela', glyph: '✦', primary: true, type: 'projectile', elem: 'arcane', speed: 230, dmg: 1.0, size: 2, color: '#ff8cf0', desc: 'Základní kouzlo na dálku.' },
  blink:    { name: 'Teleport', glyph: '✧', type: 'teleport', dist: 110, cost: 15, cd: 7, color: '#b0a0ff', desc: 'Okamžitě se přeneseš kousek dál.' },
  fireball: { name: 'Ohnivá koule', glyph: '🔥', type: 'projectile', elem: 'fire', speed: 170, dmg: 2.4, size: 4, explode: { r: 30, dmg: 1.2 }, dot: { elem: 'fire', pct: 0.4, dur: 4 }, cost: 25, color: '#ff8a3a', desc: 'Koule vybuchne a zapálí nepřátele.' },
  meteor:   { name: 'Meteor', glyph: '☄', type: 'ground', elem: 'fire', r: 42, delay: 1.0, dmg: 5, pool: { dur: 3, pct: 0.6 }, meteor: true, cost: 50, cd: 6, color: '#ff6020', desc: 'Po chvíli dopadne meteor a zanechá hořící zem.' },
  nova:     { name: 'Mrazivá nova', glyph: '❄', type: 'nova', elem: 'frost', r: 58, dmg: 1.5, freeze: 1.8, cost: 25, cd: 8, color: '#8fd8ff', desc: 'Mrazivá vlna kolem tebe zmrazí nepřátele.' },
  blizzard: { name: 'Vánice', glyph: '🌨', type: 'ground', elem: 'frost', r: 46, delay: 0.2, dur: 5, tick: 0.5, dmg: 0.5, slow: 0.4, cost: 40, cd: 3, color: '#bfe8ff', desc: 'Ledová bouře na místě: zraňuje a zpomaluje.' },
  amissiles:{ name: 'Arkánní střely', glyph: '⁂', type: 'projectile', elem: 'arcane', count: 3, spread: 36, homing: true, speed: 180, dmg: 0.9, size: 2, cost: 20, color: '#ff8cf0', desc: 'Naváděné střely hledají nepřátele.' },
  aorb:     { name: 'Arkánní koule', glyph: '◉', type: 'projectile', elem: 'arcane', speed: 85, dmg: 1.2, size: 6, pierce: 99, range: 190, explode: { r: 42, dmg: 2.5 }, cost: 35, color: '#e070ff', desc: 'Pomalá koule prochází nepřáteli a na konci vybuchne.' },
  // Černokněžník
  sbolt:    { name: 'Stínový šíp', glyph: '➶', primary: true, type: 'projectile', elem: 'shadow', speed: 210, dmg: 1.0, size: 2, color: '#c77dff', desc: 'Základní stínové kouzlo.' },
  drain:    { name: 'Vysátí', glyph: '❦', type: 'drain', elem: 'shadow', range: 130, dmg: 2.0, heal: 0.5, cost: 10, cd: 4, color: '#c040ff', desc: 'Vysaje nejbližšího nepřítele a vyléčí tě o polovinu poškození.' },
  agony:    { name: 'Zkáza', glyph: '☠', type: 'ground', elem: 'shadow', r: 40, delay: 0.1, dmg: 0, dot: { elem: 'shadow', pct: 1.6, dur: 8 }, cost: 25, color: '#9a40ff', desc: 'Prokleje všechny nepřátele v oblasti silnou kletbou.' },
  plague:   { name: 'Mor', glyph: '☣', type: 'ground', elem: 'shadow', r: 46, delay: 0.1, dur: 6, tick: 0.5, dmg: 0.35, cost: 35, cd: 2, color: '#7a40c0', desc: 'Jedovatý mrak zraňuje vše uvnitř.' },
  imp:      { name: 'Vyvolej skřeta', glyph: '👹', type: 'summon', pet: 'imp', max: 2, cost: 40, cd: 2, color: '#ff6020', desc: 'Vyvolá skřeta, který střílí ohnivé koule (max. 2).' },
  hellfire: { name: 'Pekelný oheň', glyph: '🜂', type: 'ground', elem: 'fire', r: 52, delay: 0.2, dur: 3, tick: 0.25, dmg: 0.45, rain: true, cost: 40, cd: 6, color: '#ff6020', desc: 'Z nebe prší oheň na oblast.' },
  chaos:    { name: 'Chaotický šíp', glyph: '☄', type: 'projectile', elem: 'chaos', speed: 160, dmg: 3.0, size: 5, pierce: 1, cost: 30, color: '#7dffb0', desc: 'Silný šíp, který ignoruje zbroj i odolnosti.' },
  cataclysm:{ name: 'Kataklyzma', glyph: '✺', type: 'nova', elem: 'chaos', r: 74, delay: 0.5, dmg: 4, cost: 60, cd: 10, color: '#7dffb0', desc: 'Po krátkém soustředění exploduje vše kolem.' },
  // Lovec
  shot:     { name: 'Výstřel', glyph: '➹', primary: true, type: 'projectile', elem: 'phys', speed: 290, dmg: 1.0, size: 1, arrow: true, color: '#e8e4d4', desc: 'Základní výstřel z luku.' },
  vault:    { name: 'Úskok', glyph: '↯', type: 'dash', dist: 84, dmg: 0, cd: 5, color: '#9be89b', desc: 'Rychlý přeskok, kterým se dostaneš z nebezpečí.' },
  kill:     { name: 'Zabij!', glyph: '🐺', type: 'petstrike', mult: 3.0, cost: 20, cd: 5, color: '#e0c080', desc: 'Mazlíčci se vrhnou na nepřítele trojnásobnou silou.' },
  pack:     { name: 'Divoká smečka', glyph: '🐾', type: 'summon', pet: 'wolf', count: 3, dur: 12, cost: 50, cd: 20, color: '#c0c0c0', desc: 'Na 12 s přivolá 3 vlky.' },
  aimed:    { name: 'Mířená střela', glyph: '◎', type: 'projectile', elem: 'phys', speed: 380, dmg: 3.0, size: 2, pierce: 99, crit: true, armorPen: 0.3, arrow: true, cost: 30, color: '#ffffff', desc: 'Průrazný šíp, vždy kritický zásah, ignoruje 30 % zbroje.' },
  volley:   { name: 'Salva', glyph: '⋔', type: 'projectile', elem: 'phys', count: 5, spread: 50, speed: 280, dmg: 1.1, size: 1, arrow: true, cost: 35, color: '#e8e4d4', desc: 'Vějíř šípů.' },
  trap:     { name: 'Výbušná past', glyph: '✹', type: 'trap', elem: 'fire', r: 40, dmg: 3.2, arm: 0.5, life: 15, max: 3, cost: 25, color: '#ff8a3a', desc: 'Past vybuchne, když se k ní přiblíží nepřítel (max. 3).' },
  sting:    { name: 'Hadí žihadlo', glyph: '🐍', type: 'projectile', elem: 'nature', speed: 260, dmg: 1.2, size: 2, arrow: true, dot: { elem: 'nature', pct: 1.0, dur: 8 }, cost: 15, color: '#8be07a', desc: 'Otrávený šíp, jed zraňuje 8 s.' },
  // Druid
  wrath:    { name: 'Hněv', glyph: '❈', primary: true, type: 'projectile', elem: 'nature', speed: 200, dmg: 1.0, size: 2, color: '#8be07a', desc: 'Základní přírodní kouzlo.' },
  rejuv:    { name: 'Omlazení', glyph: '✚', type: 'heal', pct: 0.35, dur: 6, cost: 20, cd: 12, color: '#7fe07f', desc: 'Během 6 s doplní 35 % života.' },
  moonfire: { name: 'Měsíční oheň', glyph: '☾', type: 'ground', elem: 'arcane', r: 26, delay: 0.15, dmg: 2.2, beam: true, dot: { elem: 'arcane', pct: 0.5, dur: 6 }, cost: 25, color: '#c8b0ff', desc: 'Paprsek měsíce zraní cíl a pálí ho dál.' },
  starfall: { name: 'Hvězdopád', glyph: '✶', type: 'ground', elem: 'arcane', r: 62, delay: 0.2, dur: 4, tick: 0.25, dmg: 0.45, rain: true, cost: 60, cd: 12, color: '#e0d0ff', desc: 'Na oblast padají hvězdy.' },
  rend:     { name: 'Rozdrásání', glyph: '⚚', type: 'melee', elem: 'phys', range: 26, arc: 130, dmg: 1.6, dot: { elem: 'phys', pct: 0.5, dur: 6 }, cost: 15, color: '#e0a080', desc: 'Drápy rozdrásají nepřátele před tebou.' },
  bear:     { name: 'Medvědí podoba', glyph: '🐻', type: 'buff', dur: 12, stats: { hpPct: 0.4, def: 10, dmgRed: 0.15, atkPct: 0.15 }, transform: true, cd: 25, color: '#a07040', desc: 'Na 12 s: +40 % života, +10 obrany, -15 % přijatého poškození, +15 % útok.' },
  treant:   { name: 'Vyvolej enta', glyph: '🌳', type: 'summon', pet: 'treant', count: 1, dur: 20, cost: 40, cd: 20, color: '#5a9a3a', desc: 'Na 20 s přivolá stromového enta.' },
  roots:    { name: 'Spoutání', glyph: '❦', type: 'ground', elem: 'nature', r: 46, delay: 0.3, dmg: 1.5, stun: 2.0, cost: 30, cd: 10, color: '#6ad04a', desc: 'Kořeny zraní a spoutají nepřátele v oblasti.' }
};

// Mazlíčci: dmg = násobek útoku hrdiny, ranged střílí
const PETS = {
  wolf:   { name: 'Vlk', sprite: 'wolf', scale: 1, speed: 80, dmg: 0.5, cd: 1.0, range: 14, elem: 'phys' },
  imp:    { name: 'Skřet', sprite: 'imp', scale: 1, speed: 60, dmg: 0.45, cd: 1.3, range: 110, ranged: true, elem: 'fire', proj: '#ff8a3a' },
  treant: { name: 'Ent', sprite: 'treant', scale: 1.3, speed: 45, dmg: 0.9, cd: 1.4, range: 16, elem: 'nature' }
};

// Úprava v1.0.2: přebíjení kouzel a doplňování zdroje základním útokem
(() => {
  const cds = { mortal: 2, cleave: 1.5, fireball: 1.5, amissiles: 2, aorb: 3, blizzard: 6, agony: 2, plague: 4, imp: 8, chaos: 3,
    aimed: 2.5, volley: 3, trap: 4, sting: 3, moonfire: 2, rend: 1.5, whirl: 6 };
  for (const id in cds) if (SKILLS[id]) SKILLS[id].cd = Math.max(SKILLS[id].cd || 0, cds[id]);
  // základní útok kouzelníků a lovce doplní trochu zdroje (v1.13 sníženo z 3 na 2, mana má omezovat víc než přebíjení)
  const PRIMARY_GEN = 2;
  ['missile', 'sbolt', 'shot', 'wrath'].forEach(id => { if (SKILLS[id]) SKILLS[id].gen = Math.max(SKILLS[id].gen || 0, PRIMARY_GEN); });
})();
