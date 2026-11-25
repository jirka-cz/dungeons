// Herní data a balanc. Změna čísla = jiná obtížnost.

const GAME_VERSION = '1.6.0';
const TILE = 16;                 // velikost dlaždice v px
const VIEW_W = 460, VIEW_H = 260; // logické rozlišení světa (zvětšuje se pixelově)

// Elementy poškození. "phys" tlumí zbroj, ostatní odolnosti. "chaos" ignoruje obojí.
const ELEMENTS = {
  phys:   { name: 'Fyzické',  icon: '⚔', color: '#ffffff' },
  fire:   { name: 'Oheň',     icon: '🔥', color: '#ff8a3a' },
  frost:  { name: 'Mráz',     icon: '❄', color: '#8fd8ff' },
  shadow: { name: 'Stín',     icon: '🌑', color: '#c77dff' },
  nature: { name: 'Příroda',  icon: '🌿', color: '#8be07a' },
  arcane: { name: 'Arkána',   icon: '✨', color: '#ff8cf0' },
  chaos:  { name: 'Chaos',    icon: '☄', color: '#7dffb0' }
};
const RES_NAMES = { phys: 'Zbroj', fire: 'Oheň', frost: 'Mráz', shadow: 'Stín', nature: 'Příroda', arcane: 'Arkána' };
const HERO_RES_CAP = 0.6;

// Rasy: základní staty (rostou s úrovní) a pasivní bonus
const RACES = {
  human:  { name: 'Člověk',   hp: 105, atk: 11, def: 3, spd: 1.00, crit: 0.05, bonus: { mfPct: 0.10, dropPct: 0.05 },
            desc: 'Vyvážený. Šťastlivec: +10 % lepší kořist, +5 % šance na předmět.' },
  dwarf:  { name: 'Trpaslík', hp: 135, atk: 9,  def: 6, spd: 0.85, crit: 0.05, bonus: { goldPct: 0.15 },
            desc: 'Odolný a pomalejší. Horník: +15 % zlata.' },
  elf:    { name: 'Elf',      hp: 85,  atk: 10, def: 2, spd: 1.30, crit: 0.12, bonus: { healPct: 0.15 },
            desc: 'Rychlý, častěji kriticky zasáhne. Lesní dar: +15 % léčení.' },
  orc:    { name: 'Ork',      hp: 110, atk: 13, def: 2, spd: 0.90, crit: 0.05, bonus: { atkPct: 0.10 },
            desc: 'Slabší obrana. Hrubá síla: +10 % útok.' },
  undead: { name: 'Nemrtvý',  hp: 90,  atk: 10, def: 3, spd: 1.00, crit: 0.05, ls: 0.06, bonus: { shadowPct: 0.10 },
            desc: 'Vysává 6 % poškození jako život. Temná moc: +10 % stínové poškození.' }
};

// Růst postavy s úrovní
// Které třídy může která rasa hrát
const RACE_CLASSES = {
  human:  ['warrior', 'mage', 'hunter'],
  dwarf:  ['warrior', 'hunter'],
  elf:    ['mage', 'hunter', 'druid'],
  orc:    ['warrior', 'warlock', 'hunter'],
  undead: ['warrior', 'mage', 'warlock']
};
function raceAllows(race, cls) { return !RACE_CLASSES[race] || RACE_CLASSES[race].includes(cls); }

const LEVEL_CAP = Infinity;   // bez stropu – vyšší úrovně jdou čím dál pomaleji
const LVL_HP = 0.09, LVL_ATK = 0.07, LVL_DEF = 0.5;
function xpToNext(lvl) { return Math.round(100 * Math.pow(1.17, lvl - 1)); }

// ---------- Nepřátelé ----------
// ai: melee | ranged | charger | caster | exploder | swarm
// res: odolnosti (záporné = slabina), atkElem: čím útočí, fam: druh (undead/beast/demon… pro bonusy z předmětů)
const MONSTERS = {
  zombie:   { name: 'Zombie', fam: 'undead',          sprite: 'zombie',   ai: 'melee',    hp: 38, atk: 7, spd: 22, r: 6, xp: 2, pts: 1.2, atkElem: 'phys',   res: { nature: 0.4, fire: -0.25 } },
  skeleton: { name: 'Kostlivec', fam: 'undead',       sprite: 'skeleton', ai: 'melee',    hp: 26, atk: 6, spd: 36, r: 6, xp: 1.5, pts: 1, atkElem: 'phys', res: { phys: 0.3, shadow: 0.5, fire: -0.25 } },
  archer:   { name: 'Kostlivec lučištník', fam: 'undead', sprite: 'skeleton', pal: { c: '#6a5a3a', C: '#4a3c26', e: '#ffd060' }, ai: 'ranged', hp: 20, atk: 6, spd: 32, r: 6, xp: 1.5, pts: 1, atkElem: 'phys', res: { phys: 0.3, shadow: 0.5 }, proj: { color: '#e8e4d4', speed: 150 } },
  goblin:   { name: 'Goblin', fam: 'humanoid',          sprite: 'goblin',   ai: 'melee',    hp: 20, atk: 5, spd: 48, r: 5, xp: 1, pts: 0.8, atkElem: 'phys',   res: {} },
  bat:      { name: 'Netopýr', fam: 'beast',         sprite: 'bat',      ai: 'swarm',    hp: 10, atk: 3, spd: 62, r: 5, xp: 0.5, pts: 0.4, atkElem: 'phys', res: { shadow: 0.3, nature: -0.2 }, fly: true },
  spider:   { name: 'Pavouk', fam: 'beast',          sprite: 'spider',   ai: 'melee',    hp: 18, atk: 5, spd: 56, r: 5, xp: 1, pts: 0.8, atkElem: 'nature', res: { nature: 0.5, fire: -0.3 } },
  slime:    { name: 'Sliz', fam: 'ooze',            sprite: 'slime',    ai: 'melee',    hp: 30, atk: 5, spd: 24, r: 6, xp: 1.5, pts: 1, atkElem: 'nature', res: { phys: 0.2, nature: 0.5, fire: -0.25 }, split: true },
  cultist:  { name: 'Kultista', fam: 'humanoid',        sprite: 'cultist',  ai: 'caster',   hp: 24, atk: 9, spd: 30, r: 6, xp: 2, pts: 1.3, atkElem: 'shadow', res: { shadow: 0.4, arcane: -0.2 } },
  imp:      { name: 'Ohnivý skřet', fam: 'demon',    sprite: 'imp',      ai: 'ranged',   hp: 18, atk: 6, spd: 40, r: 5, xp: 1.5, pts: 1, atkElem: 'fire', res: { fire: 0.6, frost: -0.3 }, proj: { color: '#ff8a3a', speed: 120, elem: 'fire' } },
  hound:    { name: 'Pekelný pes', fam: 'demon',     sprite: 'wolf',     pal: { g: '#8a3a2a', G: '#5a2018', e: '#ffcc33', w: '#c06030' }, ai: 'charger', hp: 26, atk: 8, spd: 50, r: 6, xp: 2, pts: 1.2, atkElem: 'fire', res: { fire: 0.4 } },
  icewolf:  { name: 'Ledový vlk', fam: 'beast',      sprite: 'wolf',     pal: { g: '#c8dceb', G: '#7a9ab0', e: '#5ad0ff', w: '#ffffff' }, ai: 'charger', hp: 26, atk: 8, spd: 52, r: 6, xp: 2, pts: 1.2, atkElem: 'frost', res: { frost: 0.5, fire: -0.25 } },
  bloater:  { name: 'Nadutec', fam: 'undead',         sprite: 'bloater',  ai: 'exploder', hp: 22, atk: 16, spd: 30, r: 7, xp: 2, pts: 1.2, atkElem: 'nature', res: { nature: 0.3 } }
};

// Tematické sady: barvy mapy + nepřátelé
const THEMES = {
  crypt: { name: 'Krypta',        gen: 'rooms', floor: ['#3a3446', '#35303f', '#403a4c'], wall: '#1c1826', wallFace: '#4a4258', wallLine: '#2c2638',
           ambient: 0.80, torch: '#ffb040', monsters: ['skeleton', 'archer', 'zombie', 'cultist', 'bat'], decor: ['bones', 'skull', 'candle'] },
  lava:  { name: 'Ohnivé hlubiny', gen: 'cave', floor: ['#3a2622', '#34211d', '#40291f'], wall: '#1a0e0c', wallFace: '#5a2a1e', wallLine: '#2e1610',
           ambient: 0.72, torch: '#ff6020', monsters: ['imp', 'goblin', 'hound', 'bloater', 'cultist'], decor: ['lava', 'rock', 'bones'] },
  ice:   { name: 'Ledové jeskyně', gen: 'cave', floor: ['#2e3a4a', '#2a3544', '#344254'], wall: '#121a26', wallFace: '#4a6a8a', wallLine: '#22324a',
           ambient: 0.74, torch: '#8fd8ff', monsters: ['icewolf', 'skeleton', 'archer', 'bat', 'cultist'], decor: ['crystal', 'rock', 'skull'] },
  swamp: { name: 'Jedovatá bažina', gen: 'cave', floor: ['#2a3626', '#263122', '#2f3c2a'], wall: '#101a0e', wallFace: '#3a5a2e', wallLine: '#1c2a16',
           ambient: 0.78, torch: '#9be060', monsters: ['spider', 'slime', 'zombie', 'bloater', 'goblin'], decor: ['mushroom', 'puddle', 'bones'] }
};

// Elitní afixy (elitní skupina má 1–2 afixy, víc života a lepší kořist)
const ELITE_AFFIXES = {
  molten:  { name: 'Ohnivý',    color: '#ff6a2a', res: { fire: 0.6 }, atkElem: 'fire',   desc: 'Zanechává hořící stopu a po smrti vybuchne.' },
  frozen:  { name: 'Mrazivý',   color: '#7ad0ff', res: { frost: 0.6 }, atkElem: 'frost', desc: 'Kolem tebe vytváří mrazivé koule, které vybuchnou a zmrazí.' },
  plagued: { name: 'Jedovatý',  color: '#6ad04a', res: { nature: 0.6 }, atkElem: 'nature', desc: 'Pod tebou vytváří jedovaté louže.' },
  armored: { name: 'Obrněný',   color: '#a0a8b8', res: { phys: 0.6 },                       desc: 'Silná zbroj proti fyzickému poškození.' },
  fast:    { name: 'Rychlý',    color: '#ffe060', res: {},                                  desc: 'Pohybuje se a útočí rychleji.' },
  vampire: { name: 'Upíří',     color: '#d04060', res: { shadow: 0.4 }, atkElem: 'shadow', desc: 'Léčí se z poškození, které ti způsobí.' }
};
const ELITE_MULT = { hp: 2.6, atk: 1.25, xp: 4, pts: 4, gold: 3 };

// Strážci riftu (náhodný boss na konci). Logika a animace jsou v js/bosses.js.
// phases: útoky v 1., 2. a 3. fázi (fáze se mění na 66 % a 33 % života), sig: velký útok s varováním, sigCd: jak často.
const BOSSES = {
  colossus: { name: 'Kamenný kolos', fam: 'construct', sprite: 'golem', scale: 2.2, hp: 720, atk: 11, spd: 20, r: 14, res: { phys: 0.5, nature: 0.3 }, atkElem: 'phys',
              phases: [['slam', 'rocks', 'quakeRing'], ['slam', 'fissure', 'rocks', 'quakeRing'], ['fissure', 'rocks', 'slam', 'fissure', 'quakeRing']], sig: 'earthquake', sigCd: 15,
              desc: 'Drtivé údery, praskliny v zemi a padající kameny. Při změně fáze se obalí kamenným štítem – rozbij ho, než spustí lavinu.' },
  lich:     { name: 'Lich Mor\'thal', fam: 'undead', sprite: 'cultist', pal: { r: '#3a2a5a', R: '#22183a', s: '#c8d0c0', e: '#7ff0ff', y: '#7ff0ff' }, scale: 2, hp: 610, atk: 10, spd: 26, r: 11,
              res: { shadow: 0.5, frost: 0.3, fire: -0.25 }, atkElem: 'shadow', float: true,
              phases: [['boltFan', 'summonSkel', 'frostNova', 'teleport'], ['boltFan', 'soulOrbs', 'frostNova', 'teleport', 'summonSkel'], ['soulOrbs', 'boltFan', 'teleport', 'frostNova', 'soulOrbs']], sig: 'soulStorm', sigCd: 16,
              desc: 'Udržuje si odstup. Sesílá Bouři duší – přeruš ji. Při změně fáze je nezranitelný, dokud nezničíš fylakterie.' },
  demon:    { name: 'Pekelný démon', fam: 'demon',  sprite: 'imp', scale: 2.6, hp: 670, atk: 11, spd: 30, r: 13, res: { fire: 0.6, frost: -0.3 }, atkElem: 'fire',
              phases: [['breath', 'charge', 'meteors'], ['breath', 'firePulse', 'meteors', 'charge'], ['ringOfFire', 'breath', 'firePulse', 'meteors', 'charge']], sig: 'tripleCharge', sigCd: 14,
              desc: 'Ohnivý dech, výpady a meteory. Při změně fáze vzlétne, dopadne na tebe a otevře pekelné brány.' },
  queen:    { name: 'Pavoučí královna', fam: 'beast', sprite: 'spider', pal: { b: '#5a2a6e', B: '#38184a', e: '#ff4040' }, scale: 2.4, hp: 640, atk: 10, spd: 34, r: 13,
              res: { nature: 0.6, fire: -0.3 }, atkElem: 'nature',
              phases: [['spit', 'web', 'eggs'], ['spit', 'web', 'eggs', 'spit', 'brood'], ['spit', 'eggs', 'web', 'brood', 'spit']], sig: 'ascend', sigCd: 18,
              desc: 'Klade vajíčka (znič je, než se vylíhnou), plive jed, šplhá do stropu a prší z ní jed.' },
  bonelord: { name: 'Kostěný král', fam: 'undead', sprite: 'skeleton', pal: { c: '#c8a030', C: '#8a6a1a', e: '#ff5050', w: '#f0ead8' }, scale: 2.2, hp: 690, atk: 10, spd: 30, r: 12,
              res: { phys: 0.35, shadow: 0.5, fire: -0.2 }, atkElem: 'phys',
              phases: [['boneSpear', 'leapSlam', 'whirlwind'], ['summonSkel', 'boneSpear', 'leapSlam', 'whirlwind'], ['boneSpear', 'whirlwind', 'summonSkel', 'leapSlam', 'boneSpear']], sig: 'royalWhirl', sigCd: 15,
              desc: 'Kostěná kopí, skoky a vír, který tě vtahuje. Jeho kostlivci mu dávají ochranu – zabij je.' },
  frostwitch: { name: 'Ledová vědma Ysolda', fam: 'humanoid', sprite: 'icequeen', scale: 2, hp: 610, atk: 10, spd: 28, r: 11, res: { frost: 0.6, fire: -0.3 }, atkElem: 'frost', float: true,
              phases: [['iceShards', 'icicles', 'blizzard'], ['iceShards', 'icicles', 'blizzard', 'iceShards'], ['icicles', 'iceShards', 'blizzard', 'icicles']], sig: 'absoluteZero', sigCd: 17,
              desc: 'Ledové střepy, rampouchy a vánice, která tě pronásleduje. Absolutní nula – utíkej do tepla. Při změně fáze vytvoří ledové přeludy.' },
  gorgul:   { name: 'Hnilobný Gorgul', fam: 'undead', sprite: 'bloater', pal: { g: '#7a6a8a', G: '#4e3e5e', p: '#b0d050', e: '#ffd020' }, scale: 2.6, hp: 740, atk: 11, spd: 22, r: 14,
              res: { nature: 0.5, fire: -0.25 }, atkElem: 'nature',
              phases: [['hook', 'vomit', 'bloaters'], ['hook', 'vomit', 'devour', 'bloaters'], ['hook', 'bloaters', 'vomit', 'devour', 'hook']], sig: 'bellyFlop', sigCd: 15,
              desc: 'Hák tě přitáhne k němu, zvrací jed a posílá nadutce. Ve 2. fázi požírá své služebníky a léčí se.' },
  shade:    { name: 'Xal\'Vor, Pán stínů', fam: 'demon', sprite: 'shade', scale: 2.2, hp: 620, atk: 10, spd: 34, r: 11, res: { shadow: 0.6, phys: 0.2, arcane: -0.3 }, atkElem: 'shadow', float: true,
              phases: [['shadowOrbs', 'shadowStep', 'voidZones'], ['shadowOrbs', 'curse', 'shadowStep', 'voidZones'], ['shadowStep', 'shadowOrbs', 'curse', 'voidZones', 'shadowStep']], sig: 'eclipse', sigCd: 17,
              desc: 'Pohltí světlo, mizí ve stínech a útočí zezadu. Prokletí smyješ jen ve sloupu světla. Zatmění musíš přerušit.' }
};
// Pomocné objekty bossů (nehýbou se, nedávají postup ani kořist)
const BOSS_OBJECTS = {
  phylactery: { name: 'Fylakterie',    sprite: 'crystal', pal: { c: '#7ff0ff', C: '#2a8ab0' }, r: 7, hpPct: 0.035 },
  eggsac:     { name: 'Vaječný kokon', sprite: 'egg',     r: 7, hpPct: 0.025 },
  hellgate:   { name: 'Pekelná brána', sprite: 'gate',    r: 8, hpPct: 0.04 }
};
const BOSS_PHASES = [0.66, 0.33];   // přechod do 2. a 3. fáze
const BOSS_ENRAGE = 120;            // po 120 s boss běsní (víc poškození, rychlejší)
const BOSS_EXPOSED_MUL = 1.5;       // vyčerpaný boss dostává +50 % poškození

// ---------- Škálování riftu ----------
const RIFT = {
  hp: 1.24, atk: 1.15, xp: 1.13, gold: 1.12,   // násobky za úroveň
  density: 0.03,                                // +3 % nepřátel za úroveň
  mfMax: 2.0, mfHalf: 40,                       // lepší kořist z riftu: roste se zpomalením, v riftu 41 polovina z max. +200 %
  dropPerLevel: 0.01,                           // +1 % šance na předmět za úroveň
  progressGoal: 100,
  dropChance: 0.08, eliteDrop: 0.45, globeChance: 0.06,
  deathDurability: 0.10,                        // smrt: -10 % maximální odolnosti nasazených předmětů
  eliteChance: lvl => Math.min(0.5, 0.18 + lvl * 0.015)
};
function riftMult(base, lvl) { return Math.pow(base, lvl - 1); }
function riftIlvl(lvl) { return 2 * lvl + 1; }
// Bonus „lepší kořist“ z úrovně riftu (rift 1 = 0, rift 10 ≈ +37 %, 20 ≈ +64 %, 40 ≈ +99 %, 100 ≈ +142 %, strop +200 %)
function riftMf(lvl) { return RIFT.mfMax * (lvl - 1) / (lvl - 1 + RIFT.mfHalf); }

// Zlato
const GOLD_GROWTH = 1.06;   // za úroveň předmětu (ilvl)
const GOLD_BASE = 2;

// Svatyně v riftu: dotykem dají dočasný bonus
const SHRINES = {
  power:   { name: 'Svatyně síly',     color: '#ff5040', glyph: '⚔', dur: 30, stats: { atkPct: 0.5 }, desc: '+50 % útok na 30 s' },
  speed:   { name: 'Svatyně rychlosti', color: '#50e0ff', glyph: '➤', dur: 30, stats: { spdPct: 0.35, msPct: 0.3 }, desc: '+35 % rychlost útoku a +30 % pohyb na 30 s' },
  protect: { name: 'Svatyně ochrany',  color: '#ffe060', glyph: '⛨', dur: 30, stats: { dmgRed: 0.4 }, desc: '-40 % přijatého poškození na 30 s' },
  fortune: { name: 'Svatyně bohatství', color: '#e0b030', glyph: '●', dur: 60, stats: { goldPct: 1, mfPct: 0.5 }, desc: '+100 % zlata a +50 % lepší kořist na 60 s' }
};

const INV_MAX = 40, STASH_MAX = 60;
const POTION_CD = 15, POTION_HEAL = 0.5, GLOBE_HEAL = 0.2;
