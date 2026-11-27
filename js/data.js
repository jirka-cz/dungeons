// Herní data a balanc. Změna čísla = jiná obtížnost.

const GAME_VERSION = '1.18.0';
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

// Rasy: základní staty (rostou s úrovní), pohyb, pasivní bonusy a rasový rys (od 1.13.0 má každá rasa i vlastní strom
// talentů s aktivní rasovou dovedností – RACE_TALENTS v js/talents.js).
// spd = rychlost útoku a sesílání, ms = rychlost pohybu, dodge = úhyb, trait = rasový rys (logika v js/entities.js a js/skills.js)
const RACES = {
  human:  { name: 'Člověk',   hp: 105, atk: 11, def: 3, spd: 1.00, ms: 1.00, crit: 0.05, bonus: { xpPct: 0.10, mfPct: 0.10, ccRed: 0.20 },
            trait: 'Přizpůsobivost', desc: 'Vyvážený ve všem. +10 % zkušeností, +10 % lepší kořist, o 20 % kratší zmrazení a zpomalení.' },
  dwarf:  { name: 'Trpaslík', hp: 135, atk: 9,  def: 7, spd: 0.92, ms: 0.86, crit: 0.05, bonus: { goldPct: 0.15, titanGrip: 1, resAll: 0.08, ccRed: 0.15 },
            trait: 'Horská výdrž', desc: 'Nejodolnější, ale pomalý (-14 % pohyb, -8 % rychlost útoku). +8 % všechny odolnosti, +15 % zlata. Horský stisk: obouruční meč nebo kladivo udrží v každé ruce.' },
  elf:    { name: 'Elf',      hp: 85,  atk: 10, def: 2, spd: 1.08, ms: 1.14, crit: 0.10, bonus: { dodge: 0.08, elfDash: 1 },
            trait: 'Lesní mrštnost', desc: 'Nejrychlejší a nejmrštnější, ale křehký. +14 % pohyb, +8 % úhyb, +10 % krit. šance. Po pohybové dovednosti máš 2 s +30 % pohyb a +15 % úhyb.' },
  orc:    { name: 'Ork',      hp: 115, atk: 13, def: 2, spd: 0.97, ms: 1.00, crit: 0.05, bonus: { atkPct: 0.10, orcRage: 1 },
            trait: 'Krvavý vztek', desc: 'Hrubá síla, slabší obrana. +10 % útok. Pod 50 % života +20 % útok a +10 % rychlost útoku.' },
  undead: { name: 'Nemrtvý',  hp: 95,  atk: 10, def: 3, spd: 1.00, ms: 0.95, crit: 0.05, ls: 0.06, bonus: { shadowPct: 0.10, killHeal: 0.01 },
            trait: 'Neživot', desc: 'Vysává 6 % poškození jako život a každé zabití ho vyléčí o 1 %. +10 % stínové poškození. Rasový strom: kostlivci.' }
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
// XP na další úroveň: do úrovně 30 +17 % za úroveň jako dřív, pak růst zpomaluje k +1,5 % (úroveň 100 ≈ 3 mil., 200 ≈ 33 mil.)
// Velká čísla zkráceně: 12 345 → „12,3 tis.“, 4 500 000 → „4,5 mil.“
function fmtBig(v) {
  const a = Math.abs(v), f = (x, u) => (Math.round(x * 10) / 10).toLocaleString('cs-CZ') + u;
  if (a < 1e4) return f(v, '');
  if (a < 1e6) return f(v / 1e3, ' tis.');
  if (a < 1e9) return f(v / 1e6, ' mil.');
  if (a < 1e12) return f(v / 1e9, ' mld.');
  return f(v / 1e12, ' bil.');
}
function xpToNext(lvl) { return Math.round(100 * Math.exp(growthSum(Math.max(1, lvl), 30, Math.log(1.17), 0.015, 40))); }

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
  // růst života, útoku a zkušeností podle úrovně: RIFT_HP_CURVE, RIFT_ATK_CURVE, RIFT_XP_CURVE níže
  density: 0.03,                                // +3 % nepřátel za úroveň
  // „Jatka“ (od 1.10.0): skupiny běžných nepřátel jsou 3× větší. Každý z nich dává jen třetinu XP, zlata, postupu
  // a šance na předmět, takže za celé podzemí vychází odměny stejně jako dřív (sedí i ceny u obchodníka, riftRunGold).
  crowd: 3,
  crowdHp: 0.4, crowdAtk: 0.5,                  // běžní nepřátelé v davu jsou křehčí a slabší (elity a bossové beze změny)
  crowdGlobe: 0.5,                              // šance na kouli zdraví z běžného nepřítele ×0,5 (za podzemí 1,5× víc koulí)
  eliteFollowers: [4, 6],                       // elitní skupina má s sebou 4–6 běžných nepřátel stejného druhu
  mixChance: 0.35,                              // šance, že ve skupině je přimíchaný i druhý druh nepřítele
  mfMax: 2.0, mfHalf: 40,                       // lepší kořist z riftu: roste se zpomalením, v riftu 41 polovina z max. +200 %
  dropPerLevel: 0.01,                           // +1 % šance na předmět za úroveň
  progressGoal: 100,
  dropChance: 0.08, eliteDrop: 0.45, globeChance: 0.06, manaGlobeChance: 0.05,
  deathDurability: 0.10,                        // smrt: -10 % maximální odolnosti nasazených předmětů
  eliteChance: lvl => Math.min(0.5, 0.18 + lvl * 0.015)
};

// ---------- Škálování (od 1.13.0) ----------
// Dřív rostlo všechno exponenciálně (nepřátelé ×1,24 za úroveň podzemí, předměty ×1,06 za úroveň předmětu, XP ×1,17),
// takže od podzemí ~40 nešlo hrát a čísla byla nesmyslná (podzemí 300: život nepřítele 10^29).
// Teď růst postupně zpomaluje. growthSum = součet přírůstků (v logaritmu) od 1 do x: do x0 roste o g0 za krok,
// potom se přírůstek plynule zmenšuje až ke gmin (rychlost změny určuje tau).
function growthSum(x, x0, g0, gmin, tau) {
  if (x <= x0) return g0 * (x - 1);
  const t = x - x0;
  return g0 * (x0 - 1) + gmin * t + (g0 - gmin) * tau * (1 - Math.exp(-t / tau));
}
// Síla předmětů (útok zbraní a rukavic, život na zbroji): do úrovně předmětu 60 +6 % za úroveň jako dřív, pak pomaleji (až +0,5 %)
function itemPow(ilvl) { return Math.exp(growthSum(Math.max(1, ilvl), 60, Math.log(1.06), 0.005, 70)); }
// Zlato roste stejně jako síla předmětů, takže ceny a příjmy zůstávají v poměru
function goldPow(ilvl) { return itemPow(ilvl + 1); }

// Úroveň hrdiny: +1 % útoku a života za každou úroveň (násobí všechno ostatní)
const LVL_MUL = 0.01;
function levelMul(lvl) { return 1 + LVL_MUL * (lvl - 1); }
// Doporučená úroveň hrdiny pro podzemí L (podzemí 100 → 80, 250 → 200, 350 → 280)
function recLevel(L) { return Math.max(1, Math.round(0.8 * (L - 1)) + 1); }
// Úroveň, na které běžně hráč je, když hraje podzemí L (pro testy balancu)
function naturalLevel(L) { return Math.max(1, Math.round(0.8 * (L - 1) + 1 + 12 * (1 - Math.exp(-L / 10)))); }
// Rozdíl úrovní (jako ve WoW a Grim Dawn): za každou úroveň pod doporučenou dávají nepřátelé hrdinovi o 3 % víc
// poškození a hrdina jim o 3 % míň (násobí se, 20 úrovní ≈ ×1,8, 80 úrovní ≈ ×10). Nad doporučenou úrovní
// je to naopak −1 % za úroveň, nejvýš 15 úrovní.
const LVL_GAP = { under: 1.03, over: 0.99, overMax: 15 };
function levelGapMul(L, lvl) {
  const d = recLevel(L) - lvl;
  return d > 0 ? Math.pow(LVL_GAP.under, d) : Math.pow(LVL_GAP.over, Math.min(LVL_GAP.overMax, -d));
}
// Nepřátelé: násobek života a útoku podle úrovně podzemí (bez rozdílu úrovní)
// Hodnoty jsou nastavené podle simulace (tests/balance.py): hrdina na přirozené úrovni s výbavou z daného podzemí
// zabije elitu zhruba za 2–3 s v podzemí 1, 7 s v podzemí 20, 13 s ve 100 a 18 s ve 300 a elita ho zabije
// asi za 30 zásahů v podzemí 1, 17 ve 20 a 12 od podzemí 100 výš (válečník vydrží víc, mág méně). Mezi body se dopočítává plynule, za posledním bodem
// roste dál stejným tempem (život i útok ~+1,3 % za úroveň).
const RIFT_HP_CURVE  = [[1, 1], [5, 2.4], [10, 6.5], [20, 42], [30, 180], [40, 750], [60, 3900], [80, 12000], [100, 26500],
  [150, 92000], [200, 207000], [250, 427000], [300, 865000], [400, 3540000]];
const RIFT_ATK_CURVE = [[1, 1], [5, 1.9], [10, 3.9], [20, 11.5], [30, 34.5], [40, 100], [60, 510], [80, 1360], [100, 3000],
  [150, 8900], [200, 19100], [250, 39000], [300, 74400], [400, 251000]];
// Zkušenosti za nepřítele (tempo: na přirozené úrovni dá jedno podzemí 30 → ½ úrovně, 100 → ⅕, 300 → 1/10 úrovně)
const RIFT_XP_CURVE  = [[1, 1], [5, 1.63], [10, 3.0], [20, 10.2], [30, 29.7], [60, 245], [100, 1093], [150, 3100], [200, 6080],
  [300, 17900], [400, 51400]];
// Plynulé dopočítání mezi body tabulky (v logaritmu), za koncem pokračuje posledním sklonem
function curveAt(tab, x) {
  let i = 1;
  while (i < tab.length - 1 && x > tab[i][0]) i++;
  const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
  return Math.exp(Math.log(y0) + (Math.log(y1) - Math.log(y0)) * (x - x0) / (x1 - x0));
}
function riftHpMul(L) { return curveAt(RIFT_HP_CURVE, Math.max(1, L)); }
function riftAtkMul(L) { return curveAt(RIFT_ATK_CURVE, Math.max(1, L)); }
function riftXpMul(L) { return curveAt(RIFT_XP_CURVE, Math.max(1, L)); }
// v1.14: zpomalení levelování – násobek XP podle podzemí, aby jedno podzemí na doporučené úrovni dalo
// v podzemí 10 ~1 úroveň, ve 30 ~½, ve 100 ~⅕ a ve 300 ~1/10 (dřív v podzemí 10 přes 4 úrovně)
const XP_RATE_CURVE = [[1, 0.3], [10, 0.23], [30, 0.14], [60, 0.22], [100, 0.48], [200, 0.7], [300, 0.77]];
function xpRate(L) { return curveAt(XP_RATE_CURVE, Math.max(1, L)); }
// Pro testy: síla nepřátel vůči hrdinovi úrovně lvl (rozdíl úrovní se ve hře počítá u hrdiny – každý v družině zvlášť)
function riftMonMul(L, lvl) { const g = levelGapMul(L, lvl); return { hp: riftHpMul(L) * g, atk: riftAtkMul(L) * g }; }
function riftIlvl(lvl) { return 2 * lvl + 1; }
// Bonus „lepší kořist“ z úrovně riftu (rift 1 = 0, rift 10 ≈ +37 %, 20 ≈ +64 %, 40 ≈ +99 %, 100 ≈ +142 %, strop +200 %)
function riftMf(lvl) { return RIFT.mfMax * (lvl - 1) / (lvl - 1 + RIFT.mfHalf); }

// Zlato
const GOLD_BASE = 2;
// Odhad zlata za jeden dokončený běh podzemí bez bonusů z výbavy: zlato z nepřátel a strážce + prodej kořisti.
// Počítá se, že hráč zabije jen tolik nepřátel, kolik je potřeba na 100 % postupu (rozmístí se jich 145 %), a strážce.
// Od 1.10.0 je nepřátel 3× víc, ale každý běžný dává ⅓ zlata (RIFT.crowd) – součet za podzemí zůstal stejný.
// Změřeno z herních funkcí (populateRift, rollRarity): podzemí 1 ≈ 310, 10 ≈ 1 100, 20 ≈ 4 500, 30 ≈ 17 400, 50 ≈ 137 000 (od 1.13.0 roste podle goldPow).
function riftRunGold(L) { return GOLD_BASE * goldPow(riftIlvl(L)) * (130 + 4.1 * (L - 1)); }
// Ceny zaokrouhlené na 3 platné číslice (42, 154, 1 550, 24 000 …)
function niceGold(v) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, v))) - 2)); return Math.max(1, Math.round(v / p) * p); }

// Obchodník: ceny obnovení a vylepšení jsou v násobcích běhu (riftRunGold pro nejvyšší odemčené podzemí postavy)
const VENDOR = {
  size: 10,
  purple: 0.35, orange: 0.08,                         // základní šance na kus zboží (fialová od podzemí 4, oranžová od 10)
  rerollBase: 0.10, rerollStep: 0.05,                 // obnovení zboží: 10 %, 15 %, 20 % … běhu; po dokončeném podzemí znovu od 10 %
  upMax: 20,                                          // nejvyšší úroveň obchodníka; úroveň n stojí n běhů (celkem 210 běhů)
  up: { purple: 0.005, orange: 0.003, diamond: 0.001 } // za každou úroveň: +0,5 % epické, +0,3 % legendární, +0,1 % diamantové (od podzemí 16)
};

// Svatyně v riftu: dotykem dají dočasný bonus
const SHRINES = {
  power:   { name: 'Svatyně síly',     color: '#ff5040', glyph: '⚔', dur: 30, stats: { atkPct: 0.5 }, desc: '+50 % útok na 30 s' },
  speed:   { name: 'Svatyně rychlosti', color: '#50e0ff', glyph: '➤', dur: 30, stats: { spdPct: 0.35, msPct: 0.3 }, desc: '+35 % rychlost útoku a +30 % pohyb na 30 s' },
  protect: { name: 'Svatyně ochrany',  color: '#ffe060', glyph: '⛨', dur: 30, stats: { dmgRed: 0.4 }, desc: '-40 % přijatého poškození na 30 s' },
  fortune: { name: 'Svatyně bohatství', color: '#e0b030', glyph: '●', dur: 60, stats: { goldPct: 1, mfPct: 0.5 }, desc: '+100 % zlata a +50 % lepší kořist na 60 s' }
};

const INV_MAX = 40, STASH_MAX = 60;
const POTION_CD = 15, POTION_HEAL = 0.5, GLOBE_HEAL = 0.2;
const GLOBE_RES = 0.25;          // lahvička many/zdroje doplní 25 % maxima
// Obnova života a zdroje: v boji (útočí na tebe, a ještě COMBAT_T s potom) jen 25 %, mimo boj 150 %
const COMBAT_T = 4, REGEN_COMBAT = 0.25, REGEN_REST = 1.5;
function inCombat(h) { return G.scene === 'rift' && !!h && G.time - (h.attackedT == null ? -99 : h.attackedT) < COMBAT_T; }

