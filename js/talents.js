// Talentové stromy (v1.1)
//
// Inspirace: WoW Dragonflight (strom třídy + strom specializace, čtverec = dovednost,
// kruh = pasivka, osmiúhelník = volba jedné ze dvou, brány po utracených bodech)
// a Diablo 4 (dovednost → Zesílení → volba ze dvou vylepšení, na konci klíčové pasivky,
// smíš mít jen jednu v každém stromu).
//
// Každá třída má:
//   • strom třídy (základ: obě výchozí dovednosti, jejich zesílení, 3 užitkové dovednosti)
//   • 2 specializace, každá s 5 dovednostmi, 12 pasivkami a 3 klíčovými pasivkami
// Body: 1 za úroveň (na max. úrovni 59), stromy dohromady mají ~110 úrovní talentů,
// takže je potřeba vybírat.
//
// Klíče bonusů:
//   běžné staty (hpPct, crit, firePct …), viz STAT_LABELS a TALENT_KEYS
//   podmíněné: dw_ (dvě zbraně), dw1_ (dvě jednoruční), th_ (obouručka), sh_ (štít),
//              <id buffu>_ (během buffu: enrage_, bear_, wolf_, moonkin_, meta_, avatar_, combust_, rapid_, bwrath_, dsoul_)
//   dovednost: skd_ poškození %, skr_ plocha/dosah %, skc_ počet, skdur_ trvání s, skcd_ přebíjení -s,
//              skcost_ cena -%, skgen_ zdroj +, skpierce_ průraz, skstun_ omráčení s, skslow_ zpomalení,
//              skdot_ síla DoT %, skheal_ léčení z poškození, skvuln_ zranitelnost s, skburn_/skbleed_ přidá DoT,
//              skfreeze_ šance zmrazit, skexec_ +% pod 30 % života, skenrage_ rozzuří, skhits_ údery navíc,
//              skkillres_ zdroj za zabití

// ---------- Nové dovednosti ----------
Object.assign(SKILLS, {
  // Válečník – Zuřivost
  bloodthirst: { name: 'Krvežíznivost', glyph: '🩸', type: 'melee', elem: 'phys', range: 26, arc: 80, dmg: 1.7, healPct: 0.3, enrageChance: 0.3, gen: 8, cd: 3, color: '#ff4040', desc: 'Úder, který tě vyléčí o 30 % poškození a s 30% šancí rozzuří.' },
  rampage:     { name: 'Běsnění', glyph: '✸', type: 'melee', elem: 'phys', range: 26, arc: 100, dmg: 0.75, hits: 4, cost: 35, cd: 2, color: '#ff8060', desc: 'Čtyři rychlé údery za sebou.' },
  berserk:     { name: 'Berserkr', glyph: '😡', type: 'buff', dur: 6, stats: { spdPct: 0.2, dmgRed: 0.1 }, enrage: true, gen: 30, cd: 20, color: '#ff3030', desc: 'Okamžitě tě rozzuří, na 6 s +20 % rychlost útoku a -10 % přijatého poškození. +30 zuřivosti.' },
  roar:        { name: 'Hromový řev', glyph: '📢', type: 'nova', elem: 'phys', r: 60, dmg: 1.3, dot: { elem: 'phys', pct: 0.4, dur: 6 }, cost: 30, cd: 12, color: '#ffd060', desc: 'Řev zraní nepřátele kolem tebe a rozkrvácí je.' },
  // Válečník – Zbraně
  execute:     { name: 'Poprava', glyph: '⚰', type: 'melee', elem: 'phys', range: 28, arc: 70, dmg: 1.5, exec: 2.0, cost: 20, cd: 4, color: '#c0c0c0', desc: 'Úder, který nepřátelům pod 30 % života způsobí trojnásobné poškození.' },
  smash:       { name: 'Kolosální úder', glyph: '🔨', type: 'melee', elem: 'phys', range: 30, arc: 90, dmg: 2.6, vuln: 6, cost: 25, cd: 8, color: '#e0a060', desc: 'Drtivý úder, zasažení jsou 6 s zranitelní (+20 % poškození).' },
  avatar:      { name: 'Avatar', glyph: '🗿', type: 'buff', form: 'avatar', dur: 12, stats: { atkPct: 0.2, hpPct: 0.2 }, gen: 20, cd: 30, color: '#e0c080', desc: 'Na 12 s zmohutníš: +20 % útok a +20 % života.' },
  // Mág – Oheň
  firewall:    { name: 'Ohnivá stěna', glyph: '▤', type: 'ground', elem: 'fire', r: 34, delay: 0.1, dur: 5, tick: 0.5, dmg: 0.45, cost: 30, cd: 6, color: '#ff6a2a', desc: 'Pás ohně na zemi pálí vše, co jím projde.' },
  breath:      { name: 'Dračí dech', glyph: '🐉', type: 'melee', elem: 'fire', range: 58, arc: 90, dmg: 2.0, dot: { elem: 'fire', pct: 0.5, dur: 4 }, stun: 0.8, cost: 30, cd: 8, color: '#ff8a3a', desc: 'Kužel ohně před tebou zapálí a omráčí nepřátele.' },
  combust:     { name: 'Spalování', glyph: '♨', type: 'buff', dur: 8, stats: { crit: 0.25, firePct: 0.2 }, cd: 25, color: '#ffb040', desc: 'Na 8 s +25 % krit. šance a +20 % ohnivé poškození.' },
  // Mág – Mráz
  frostbolt:   { name: 'Mrazivý šíp', glyph: '❅', type: 'projectile', elem: 'frost', speed: 200, dmg: 1.9, size: 3, slow: 0.4, cost: 12, cd: 1, color: '#8fd8ff', desc: 'Ledový šíp zraní a zpomalí cíl o 40 %.' },
  cone:        { name: 'Kužel chladu', glyph: '◢', type: 'melee', elem: 'frost', range: 62, arc: 80, dmg: 1.6, slow: 0.5, cost: 25, cd: 6, color: '#bfe8ff', desc: 'Mrazivý kužel před tebou zraní a zpomalí nepřátele.' },
  forb:        { name: 'Ledová koule', glyph: '❆', type: 'projectile', elem: 'frost', speed: 70, dmg: 0.8, size: 5, pierce: 99, range: 200, shards: { every: 0.2, dmg: 0.45 }, cost: 40, cd: 8, color: '#a0e0ff', desc: 'Pomalá koule prolétá nepřáteli a rozstřikuje ledové úlomky.' },
  // Mág – Arkána (strom třídy)
  mshield:     { name: 'Arkánní štít', glyph: '⛉', type: 'buff', dur: 10, stats: { manaShield: 0.6 }, cd: 20, color: '#b0a0ff', desc: 'Na 10 s pohlcuje mana 60 % poškození, které dostaneš.' },
  // Černokněžník
  tap:         { name: 'Životní pakt', glyph: '♥', type: 'tap', lifeCost: 0.12, resGain: 35, cd: 6, color: '#c03060', desc: 'Obětuješ 12 % života a získáš 35 many.' },
  ua:          { name: 'Nestabilní utrpení', glyph: '☍', type: 'projectile', elem: 'shadow', speed: 190, dmg: 0.6, size: 3, dot: { elem: 'shadow', pct: 1.2, dur: 8 }, cost: 20, cd: 3, color: '#b060ff', desc: 'Kletba, která cíl stravuje 8 s.' },
  harvest:     { name: 'Žeň duší', glyph: '☬', type: 'nova', elem: 'shadow', r: 70, dmg: 1.2, dotBonus: 1.0, cost: 40, cd: 10, color: '#a040ff', desc: 'Stínová vlna kolem tebe, prokletým nepřátelům dvojnásobné poškození.' },
  dsoul:       { name: 'Temná duše', glyph: '☾', type: 'buff', dur: 12, stats: { dotPct: 0.5, spdPct: 0.15 }, cd: 30, color: '#8040c0', desc: 'Na 12 s +50 % poškození v čase a +15 % rychlost útoku.' },
  felhound:    { name: 'Pekelný ohař', glyph: '🐕', type: 'summon', pet: 'felhound', max: 1, cost: 50, cd: 10, color: '#d04060', desc: 'Vyvolá stálého pekelného ohaře, který trhá nepřátele zblízka.' },
  gateway:     { name: 'Brána démonů', glyph: '⛩', type: 'summon', pet: 'imp', count: 4, dur: 10, cost: 60, cd: 25, color: '#ff6020', desc: 'Na 10 s otevře bránu a vypustí 4 skřety.' },
  meta:        { name: 'Démonická proměna', glyph: '😈', type: 'buff', form: 'meta', dur: 12, stats: { atkPct: 0.3, hpPct: 0.3, dmgRed: 0.1 }, aura: { r: 34, tick: 0.5, dmg: 0.35, elem: 'fire' }, cd: 40, color: '#40e070', desc: 'Na 12 s se proměníš v démona: +30 % útok a život, -10 % poškození, ohnivá aura.' },
  // Lovec
  eshot:       { name: 'Výbušný šíp', glyph: '💥', type: 'projectile', elem: 'fire', speed: 260, dmg: 1.4, size: 2, arrow: true, explode: { r: 34, dmg: 1.6 }, cost: 25, cd: 4, color: '#ff8a3a', desc: 'Šíp při zásahu vybuchne.' },
  rapid:       { name: 'Rychlá palba', glyph: '⇶', type: 'buff', dur: 4, stats: { spdPct: 0.7 }, cd: 15, color: '#ffe080', desc: 'Na 4 s +70 % rychlost útoku.' },
  kshot:       { name: 'Smrtící výstřel', glyph: '☩', type: 'projectile', elem: 'phys', speed: 420, dmg: 2.0, exec: 2.0, size: 2, arrow: true, cost: 20, cd: 6, color: '#ffffff', desc: 'Silný výstřel, nepřátelům pod 30 % života trojnásobné poškození.' },
  ftrap:       { name: 'Mrazivá past', glyph: '❄', type: 'trap', elem: 'frost', r: 40, dmg: 1.0, freeze: 2.5, arm: 0.5, life: 20, max: 2, cost: 20, cd: 8, color: '#8fd8ff', desc: 'Past zmrazí nepřátele v okolí na 2,5 s.' },
  barbed:      { name: 'Ostnatá střela', glyph: '➳', type: 'projectile', elem: 'phys', speed: 300, dmg: 1.0, size: 1, arrow: true, dot: { elem: 'phys', pct: 0.7, dur: 6 }, selfBuff: { id: 'frenzy', name: 'Šílenství smečky', stats: { petSpd: 0.4 }, dur: 8, color: '#e0a060' }, cost: 15, cd: 4, color: '#e0c080', desc: 'Krvácivý šíp, mazlíčci na 8 s útočí o 40 % rychleji.' },
  bwrath:      { name: 'Divoký hněv', glyph: '🦁', type: 'buff', dur: 10, stats: { petPct: 0.6, atkPct: 0.15 }, cd: 25, color: '#ff9040', desc: 'Na 10 s: mazlíčci +60 % síla, ty +15 % útok.' },
  stampede:    { name: 'Stampédo', glyph: '🐃', type: 'summon', pet: 'wolf', count: 5, dur: 7, cost: 40, cd: 30, color: '#c0a080', desc: 'Na 7 s přivolá 5 divokých zvířat.' },
  // Druid
  starsurge:   { name: 'Hvězdný výboj', glyph: '✴', type: 'projectile', elem: 'arcane', speed: 220, dmg: 3.0, size: 4, explode: { r: 26, dmg: 1.0 }, cost: 35, cd: 3, color: '#d8c0ff', desc: 'Silný hvězdný projektil, při zásahu vybuchne.' },
  moonkin:     { name: 'Měsíční podoba', glyph: '🦉', type: 'buff', form: 'moonkin', dur: 15, stats: { arcanePct: 0.25, naturePct: 0.25, def: 6 }, cd: 30, color: '#b0a0ff', desc: 'Na 15 s: +25 % arkánní a přírodní poškození, +6 obrana.' },
  hurricane:   { name: 'Hurikán', glyph: '🌪', type: 'buff', dur: 6, aura: { r: 48, tick: 0.4, dmg: 0.35, elem: 'nature', slow: 0.3 }, cost: 40, cd: 14, color: '#9be89b', desc: 'Na 6 s tě obklopí vichřice, zraňuje a zpomaluje nepřátele kolem.' },
  wolf:        { name: 'Vlčí podoba', glyph: '🐺', type: 'buff', form: 'wolf', dur: 15, stats: { spdPct: 0.3, msPct: 0.25, crit: 0.1 }, cd: 25, color: '#a0a0b0', desc: 'Na 15 s: +30 % rychlost útoku, +25 % pohyb, +10 % krit. šance.' },
  maul:        { name: 'Drtivý úder', glyph: '🐾', type: 'melee', elem: 'phys', range: 30, arc: 120, dmg: 2.4, stun: 0.6, cost: 25, cd: 3, color: '#c09060', desc: 'Mohutný úder tlapou, omráčí zasažené.' },
  fcharge:     { name: 'Divoký skok', glyph: '⤳', type: 'dash', elem: 'phys', dist: 90, r: 22, dmg: 1.6, stun: 1.0, cd: 8, color: '#e0b080', desc: 'Skok vpřed, omráčí nepřátele v cestě.' },
  bark:        { name: 'Dubová kůra', glyph: '🌰', type: 'buff', dur: 8, stats: { dmgRed: 0.25, thorns: 0.2 }, cd: 20, color: '#a07040', desc: 'Na 8 s -25 % přijatého poškození a +20 % trny.' }
});
SKILLS.bear.form = 'bear'; delete SKILLS.bear.transform;

PETS.felhound = { name: 'Pekelný ohař', sprite: 'wolf', scale: 1.15, speed: 85, dmg: 0.8, cd: 1.0, range: 14, elem: 'shadow', tint: '#a02040' };

// ---------- Rozložení stromů ----------
// [sloupec 0–6, řádek, rodiče]
const SPEC_LAYOUT = {
  S1: [3, 0, []],
  Pa: [1, 1, ['S1']], S1e: [3, 1, ['S1']], Pb: [5, 1, ['S1']],
  S2: [0, 2, ['Pa']], S1c: [3, 2, ['S1e']], S3: [6, 2, ['Pb']],
  S2e: [0, 3, ['S2']], Pc: [2, 3, ['S1c', 'S2']], Pd: [4, 3, ['S1c', 'S3']], S3e: [6, 3, ['S3']],
  S2c: [0, 4, ['S2e']], M1: [3, 4, ['Pc', 'Pd']], S3c: [6, 4, ['S3e']],
  Pe: [0, 5, ['S2c']], S4: [2, 5, ['Pc', 'M1']], S5: [4, 5, ['Pd', 'M1']], Pf: [6, 5, ['S3c']],
  S4e: [2, 6, ['S4']], Pg: [3, 6, ['S4', 'S5']], S5e: [4, 6, ['S5']],
  S4c: [2, 7, ['S4e']], Ph: [3, 7, ['Pg']], S5c: [4, 7, ['S5e']],
  Pi: [1, 8, ['S4c', 'Pe']], Pj: [3, 8, ['Ph']], Pk: [5, 8, ['S5c', 'Pf']],
  K1: [1, 9, ['Pi', 'Pj']], K2: [3, 9, ['Pi', 'Pj', 'Pk']], K3: [5, 9, ['Pj', 'Pk']]
};
const CORE_LAYOUT = {
  B1: [2, 0, []], B2: [4, 0, []],
  Ca: [1, 1, ['B1']], Cb: [3, 1, ['B1', 'B2']], Cc: [5, 1, ['B2']],
  CS1: [0, 2, ['Ca']], Cd: [3, 2, ['Cb']], CS2: [6, 2, ['Cc']],
  CS1e: [0, 3, ['CS1']], Ce: [2, 3, ['Cd', 'CS1']], Cf: [4, 3, ['Cd', 'CS2']], CS2e: [6, 3, ['CS2']],
  Cg: [1, 4, ['CS1e', 'Ce']], CS3: [3, 4, ['Ce', 'Cf']], Ch: [5, 4, ['Cf', 'CS2e']],
  Ci: [2, 5, ['Cg', 'CS3']], CS3e: [3, 5, ['CS3']], Cj: [4, 5, ['CS3', 'Ch']],
  Ck: [3, 6, ['Ci', 'CS3e', 'Cj']]
};
// Brány: od řádku R je potřeba N bodů v tomto stromu
const SPEC_GATES = [[3, 5], [5, 12], [8, 20], [9, 26]];
const CORE_GATES = [[4, 8], [6, 14]];

// ---------- Pomocníci pro zápis uzlů ----------
const tP = (name, desc, max, stats) => ({ type: 'passive', name, desc, max, stats });
const tK = skill => ({ type: 'skill', skill, max: 1, stats: {} });
const tE = (name, desc, stats) => ({ type: 'enh', name, desc, max: 1, stats });
const tC = (a, b) => ({ type: 'choice', max: 1, opts: [{ name: a[0], desc: a[1], stats: a[2] }, { name: b[0], desc: b[1], stats: b[2] }] });
const tKEY = (name, desc, stats) => ({ type: 'key', name, desc, max: 1, stats });
const tBASE = skill => ({ type: 'base', skill, max: 0, stats: {} });

const TALENTS = {
  // =====================================================================
  warrior: {
    core: { name: 'Válečník', icon: '🛡', desc: 'Štít, válečný pokřik a odolnost – základ každého válečníka.', nodes: {
      B1: tBASE('slash'), B2: tBASE('leap'),
      Ca: tE('Zesílený Sek', 'Sek +25 % poškození a generuje o 4 zuřivosti víc.', { skd_slash: 0.25, skgen_slash: 4 }),
      Cb: tP('Železná vůle', '+4 % života.', 3, { hpPct: 0.04 }),
      Cc: tE('Zesílený Drtivý skok', 'Drtivý skok má o 3 s kratší přebíjení a omráčí o 0,4 s déle.', { skcd_leap: 3, skstun_leap: 0.4 }),
      CS1: tK('bash'), Cd: tP('Bojová zuřivost', '+10 % získané zuřivosti.', 3, { genPct: 0.10 }), CS2: tK('shout'),
      CS1e: tE('Těžký štít', 'Úder štítem +40 % poškození a omráčí o 0,5 s déle.', { skd_bash: 0.4, skstun_bash: 0.5 }),
      Ce: tP('Zocelení', '+3 obrana.', 2, { def: 3 }),
      Cf: tP('Dlouhý pokřik', 'Bojový pokřik trvá o 3 s déle.', 2, { skdur_shout: 3 }),
      CS2e: tE('Zesílený Bojový pokřik', 'Bojový pokřik má o 5 s kratší přebíjení.', { skcd_shout: 5 }),
      Cg: tP('Ostnatá zbroj', '+8 % trny (vrací poškození útočníkům).', 2, { thorns: 0.08 }),
      CS3: tK('quake'),
      Ch: tP('Neúnavnost', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      Ci: tP('Štítonoš', 'Se štítem +5 % blok a +2 obrana.', 2, { sh_block: 0.05, sh_def: 2 }),
      CS3e: tE('Zesílené Zemětřesení', 'Zemětřesení +30 % plocha a zasažení jsou 4 s zranitelní.', { skr_quake: 0.3, skvuln_quake: 4 }),
      Cj: tP('Druhý dech', '+0,3 % života za sekundu.', 2, { regen: 0.003 }),
      Ck: tC(['Nezlomný', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Krvavý obchod', '+3 % vysávání života.', { ls: 0.03 }])
    } },
    specs: [
      { id: 'fury', name: 'Zuřivost', icon: '⚔', desc: 'Dvě zbraně, rozzuření a nekonečná smršť seků.', nodes: {
        S1: tK('bloodthirst'),
        Pa: tP('Dvojí ovládání', 'Zbraň v levé ruce dává o 10 % útoku víc (základ 70 %).', 3, { offhand: 0.10 }),
        S1e: tE('Zesílená Krvežíznivost', 'Krvežíznivost +30 % poškození a léčí o 25 % poškození víc.', { skd_bloodthirst: 0.3, skheal_bloodthirst: 0.25 }),
        Pb: tP('Zuřivé údery', '+3 % rychlost útoku.', 3, { spdPct: 0.03 }),
        S2: tK('whirl'),
        S1c: tC(['Krvavá lázeň', 'Krvežíznivost rozkrvácí cíl (80 % útoku za s, 5 s).', { skbleed_bloodthirst: 0.8 }], ['Šílená žízeň', 'Krvežíznivost tě vždy rozzuří.', { skenrage_bloodthirst: 1 }]),
        S3: tK('rampage'),
        S2e: tE('Zesílená Vichřice', 'Vichřice trvá o 1 s déle a má +20 % poškození.', { skdur_whirl: 1, skd_whirl: 0.2 }),
        Pc: tP('Rozzuření', 'Kritický zásah tě s 15% šancí rozzuří (+10 % útok, +15 % rychlost útoku na 5 s).', 2, { enrageChance: 0.15 }),
        Pd: tP('Brutalita', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        S3e: tE('Zesílené Běsnění', 'Běsnění udeří ještě jednou navíc.', { skhits_rampage: 1 }),
        S2c: tC(['Krvavá vichřice', 'Vichřice tě léčí o 10 % poškození.', { skheal_whirl: 0.10 }], ['Bouře ocele', 'Vichřice +30 % plocha.', { skr_whirl: 0.3 }]),
        M1: tP('Mistr dvou čepelí', 'Se dvěma zbraněmi +4 % rychlost útoku a +2 % krit. šance.', 3, { dw_spdPct: 0.04, dw_crit: 0.02 }),
        S3c: tC(['Krvavé běsnění', 'Běsnění tě vždy rozzuří.', { skenrage_rampage: 1 }], ['Masakr', 'Běsnění +50 % poškození nepřátelům pod 30 % života.', { skexec_rampage: 0.5 }]),
        Pe: tP('Neukojitelnost', 'Zabití obnoví 5 zuřivosti.', 2, { killRes: 5 }),
        S4: tK('berserk'), S5: tK('roar'),
        Pf: tP('Krvežíznivec', '+1 % vysávání života.', 2, { ls: 0.01 }),
        S4e: tE('Zesílený Berserkr', 'Berserkr má o 6 s kratší přebíjení.', { skcd_berserk: 6 }),
        Pg: tP('Nespoutaná zuřivost', 'Během rozzuření +8 % útok.', 2, { enrage_atkPct: 0.08 }),
        S5e: tE('Zesílený Hromový řev', 'Hromový řev +30 % plocha.', { skr_roar: 0.3 }),
        S4c: tC(['Zuřivec', 'Během rozzuření +15 % krit. poškození.', { enrage_critDmg: 0.15 }], ['Nezastavitelný', 'Během rozzuření -10 % přijatého poškození.', { enrage_dmgRed: 0.10 }]),
        Ph: tC(['Titánský stisk', 'Obouruční zbraň můžeš držet v každé ruce.', { titanGrip: 1 }], ['Jednoruční zuřivost', 'Se dvěma jednoručními zbraněmi +12 % útok.', { dw1_atkPct: 0.12 }]),
        S5c: tC(['Krvavý řev', 'Krvácení z Hromového řevu +50 %.', { skdot_roar: 0.5 }], ['Děsivý řev', 'Hromový řev omráčí na 1 s.', { skstun_roar: 1 }]),
        Pi: tP('Rychlé ruce', '+5 % rychlost útoku.', 2, { spdPct: 0.05 }),
        Pj: tP('Rudá mlha', 'Rozzuření trvá o 2 s déle a dává navíc +5 % rychlost útoku.', 2, { enrageDur: 2, enrage_spdPct: 0.05 }),
        Pk: tP('Hrubá síla', '+5 % fyzické poškození.', 2, { physPct: 0.05 }),
        K1: tKEY('Nekonečná zuřivost', 'Jsi trvale rozzuřený.', { enrageAlways: 1 }),
        K2: tKEY('Dvojitý úder', '+25 % šance, že základní útok udeří dvakrát.', { doubleChance: 0.25 }),
        K3: tKEY('Krvavé šílenství', 'Pod 50 % života způsobuješ +35 % poškození.', { lowHpDmg: 0.35 })
      } },
      { id: 'arms', name: 'Zbraně', icon: '🗡', desc: 'Obouruční zbraň, krvácení a popravy.', nodes: {
        S1: tK('mortal'),
        Pa: tP('Obouruční mistr', 'S obouruční zbraní +5 % útok.', 3, { th_atkPct: 0.05 }),
        S1e: tE('Zesílený Smrtící úder', 'Smrtící úder +25 % poškození a zasažení jsou 3 s zranitelní.', { skd_mortal: 0.25, skvuln_mortal: 3 }),
        Pb: tP('Hluboké rány', '+12 % poškození v čase (krvácení).', 3, { dotPct: 0.12 }),
        S2: tK('cleave'),
        S1c: tC(['Ostří', 'Krvácení ze Smrtícího úderu +60 %.', { skdot_mortal: 0.6 }], ['Kladivo', 'Smrtící úder omráčí na 0,8 s.', { skstun_mortal: 0.8 }]),
        S3: tK('execute'),
        S2e: tE('Zesílené Rozsekání', 'Rozsekání +25 % dosah.', { skr_cleave: 0.25 }),
        Pc: tP('Taktik', '+2 % krit. šance.', 2, { crit: 0.02 }),
        Pd: tP('Zabiják', '+12 % poškození nepřátelům pod 30 % života.', 2, { execPct: 0.12 }),
        S3e: tE('Zesílená Poprava', 'Poprava má o 2 s kratší přebíjení.', { skcd_execute: 2 }),
        S2c: tC(['Krvavé rozsekání', 'Krvácení z Rozsekání +60 %.', { skdot_cleave: 0.6 }], ['Smršť', 'Rozsekání má o 1 s kratší přebíjení a stojí o 25 % méně.', { skcd_cleave: 1, skcost_cleave: 0.25 }]),
        M1: tP('Hluboké seky', 'Základní útok rozkrvácí cíl (25 % útoku za s, 4 s).', 3, { bleedHit: 0.25 }),
        S3c: tC(['Náhlá smrt', 'Poprava +50 % poškození.', { skd_execute: 0.5 }], ['Sklizeň', 'Zabití Popravou obnoví 20 zuřivosti.', { skkillres_execute: 20 }]),
        Pe: tP('Ocelová kůže', 'S obouruční zbraní +3 obrana.', 2, { th_def: 3 }),
        S4: tK('smash'), S5: tK('avatar'),
        Pf: tP('Krutost', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        S4e: tE('Zesílený Kolosální úder', 'Zranitelnost z Kolosálního úderu trvá o 3 s déle.', { skvuln_smash: 3 }),
        Pg: tP('Drtič zbroje', 'Ignoruje 6 % zbroje.', 2, { armorPen: 0.06 }),
        S5e: tE('Zesílený Avatar', 'Avatar trvá o 4 s déle.', { skdur_avatar: 4 }),
        S4c: tC(['Rozdrcení', 'Kolosální úder +40 % poškození.', { skd_smash: 0.4 }], ['Bez slitování', 'Zranitelní nepřátelé dostávají o 10 % víc.', { vulnPct: 0.10 }]),
        Ph: tC(['Široký záběr', 'Rozsekání a Smrtící úder +20 % dosah.', { skr_cleave: 0.2, skr_mortal: 0.2 }], ['Přesnost', 'Ignoruje 15 % zbroje.', { armorPen: 0.15 }]),
        S5c: tC(['Titán', 'Během Avatara +15 % krit. šance.', { avatar_crit: 0.15 }], ['Neohroženost', 'Během Avatara -15 % přijatého poškození.', { avatar_dmgRed: 0.15 }]),
        Pi: tP('Krvavá stopa', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Mistr zbraní', '+5 % fyzické poškození.', 2, { physPct: 0.05 }),
        Pk: tP('Válečná zkušenost', '+4 % života.', 2, { hpPct: 0.04 }),
        K1: tKEY('Popravčí', '+80 % poškození nepřátelům pod 30 % života.', { execPct: 0.8 }),
        K2: tKEY('Kolosální síla', 'Smrtící úder, Rozsekání a Poprava +40 % poškození.', { skd_mortal: 0.4, skd_cleave: 0.4, skd_execute: 0.4 }),
        K3: tKEY('Krvavé řemeslo', 'Krvácení a další poškození v čase +60 %.', { dotPct: 0.6 })
      } }
    ]
  },
  // =====================================================================
  mage: {
    core: { name: 'Arkána', icon: '✦', desc: 'Arkánní magie, mana a ochranná kouzla – základ každého mága.', nodes: {
      B1: tBASE('missile'), B2: tBASE('blink'),
      Ca: tE('Zesílená Magická střela', 'Magická střela vystřelí 2 střely.', { primCount: 1 }),
      Cb: tP('Arkánní intelekt', '+10 maximální many.', 3, { resMax: 10 }),
      Cc: tE('Zesílený Teleport', 'Teleport má o 3 s kratší přebíjení.', { skcd_blink: 3 }),
      CS1: tK('amissiles'), Cd: tP('Arkánní tok', '+15 % obnova many.', 3, { resRegenPct: 0.15 }), CS2: tK('mshield'),
      CS1e: tE('Zesílené Arkánní střely', 'Arkánní střely vystřelí 2 střely navíc.', { skc_amissiles: 2 }),
      Ce: tP('Arkánní síla', '+5 % arkánní poškození.', 2, { arcanePct: 0.05 }),
      Cf: tP('Rychlé sesílání', '-5 % přebíjení dovedností.', 2, { cdr: 0.05 }),
      CS2e: tE('Zesílený Arkánní štít', 'Arkánní štít trvá o 5 s déle.', { skdur_mshield: 5 }),
      Cg: tP('Soustředění', '+2 % krit. šance.', 2, { crit: 0.02 }),
      CS3: tK('aorb'),
      Ch: tP('Ochranná magie', '+6 % odolnost vůči všem živlům.', 2, { resAll: 0.06 }),
      Ci: tP('Arkánní ozvěna', '+6 % šance, že základní útok vystřelí dvakrát.', 2, { doubleChance: 0.06 }),
      CS3e: tE('Zesílená Arkánní koule', 'Výbuch Arkánní koule +30 % plocha.', { skr_aorb: 0.3 }),
      Cj: tP('Mana z duší', 'Zabití obnoví 4 many.', 2, { killRes: 4 }),
      Ck: tC(['Zastavený čas', 'Jednou v každém podzemí tě smrtelný zásah nezabije (vstaneš se 40 % života).', { rebirth: 1 }], ['Arkánní moc', '+15 % poškození dovedností (mimo základní útok).', { skillPct: 0.15 }])
    } },
    specs: [
      { id: 'fire', name: 'Oheň', icon: '🔥', desc: 'Výbuchy, hoření a kritické zásahy.', nodes: {
        S1: tK('fireball'),
        Pa: tP('Žhnoucí plamen', '+4 % ohnivé poškození.', 3, { firePct: 0.04 }),
        S1e: tE('Zesílená Ohnivá koule', 'Výbuch Ohnivé koule +30 % plocha.', { skr_fireball: 0.3 }),
        Pb: tP('Vznícení', 'Ohnivé zásahy s 10% šancí zapálí (40 % útoku za s, 4 s).', 3, { ignite: 0.10 }),
        S2: tK('firewall'),
        S1c: tC(['Pyroblast', 'Ohnivá koule +35 % poškození.', { skd_fireball: 0.35 }], ['Ohnivý déšť', 'Ohnivá koule vystřelí 2 koule.', { skc_fireball: 1 }]),
        S3: tK('breath'),
        S2e: tE('Zesílená Ohnivá stěna', 'Ohnivá stěna trvá o 2 s déle.', { skdur_firewall: 2 }),
        Pc: tP('Spálení', '+8 % poškození hořícím nepřátelům.', 2, { burnBonus: 0.08 }),
        Pd: tP('Žár', 'Ignoruje 6 % odolností.', 2, { resPen: 0.06 }),
        S3e: tE('Zesílený Dračí dech', 'Dračí dech +25 % dosah.', { skr_breath: 0.25 }),
        S2c: tC(['Pekelná stěna', 'Ohnivá stěna +40 % poškození.', { skd_firewall: 0.4 }], ['Široká stěna', 'Ohnivá stěna +40 % plocha.', { skr_firewall: 0.4 }]),
        M1: tP('Hořící zem', '+12 % poškození v čase (hoření).', 3, { dotPct: 0.12 }),
        S3c: tC(['Dračí zuřivost', 'Dračí dech má o 3 s kratší přebíjení.', { skcd_breath: 3 }], ['Žhavé uhlíky', 'Hoření z Dračího dechu +80 %.', { skdot_breath: 0.8 }]),
        Pe: tP('Plamenný štít', '+6 % odolnost vůči ohni a +2 obrana.', 2, { resFire: 0.06, def: 2 }),
        S4: tK('meteor'), S5: tK('combust'),
        Pf: tP('Spalující krit', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        S4e: tE('Zesílený Meteor', 'Meteor +25 % plocha.', { skr_meteor: 0.25 }),
        Pg: tP('Ohnivá mysl', 'Kritický zásah obnoví 2 many.', 2, { critRes: 2 }),
        S5e: tE('Zesílené Spalování', 'Spalování trvá o 4 s déle.', { skdur_combust: 4 }),
        S4c: tC(['Meteorický roj', 'Meteor má o 2 s kratší přebíjení.', { skcd_meteor: 2 }], ['Pád hvězdy', 'Meteor +40 % poškození.', { skd_meteor: 0.4 }]),
        Ph: tC(['Fénix', 'Jednou v každém podzemí povstaneš z popela se 40 % života.', { rebirth: 1 }], ['Pyromanie', '+8 % ohnivé poškození a +3 % krit. šance.', { firePct: 0.08, crit: 0.03 }]),
        S5c: tC(['Vzplanutí', 'Spalování má o 8 s kratší přebíjení.', { skcd_combust: 8 }], ['Ohnivá bouře', 'Během Spalování +20 % útok.', { combust_atkPct: 0.2 }]),
        Pi: tP('Vytrvalé plameny', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Plamenný mág', '+5 % ohnivé poškození.', 2, { firePct: 0.05 }),
        Pk: tP('Ohnivá krev', '+4 % života.', 2, { hpPct: 0.04 }),
        K1: tKEY('Spalování', 'Hoření a další poškození v čase +60 %.', { dotPct: 0.6 }),
        K2: tKEY('Esuova zuřivost', '+12 % krit. šance a +30 % krit. poškození.', { crit: 0.12, critDmg: 0.3 }),
        K3: tKEY('Ohnivá smršť', 'Ohnivé zásahy vždy zapálí a hořícím nepřátelům způsobuješ +20 % poškození.', { ignite: 1, burnBonus: 0.2 })
      } },
      { id: 'frost', name: 'Mráz', icon: '❄', desc: 'Zpomalení, zmrazení a tříštění ledu.', nodes: {
        S1: tK('frostbolt'),
        Pa: tP('Mrazivé kopí', '+4 % mrazivé poškození.', 3, { frostPct: 0.04 }),
        S1e: tE('Zesílený Mrazivý šíp', 'Mrazivý šíp +25 % poškození a proletí 1 nepřítelem.', { skd_frostbolt: 0.25, skpierce_frostbolt: 1 }),
        Pb: tP('Hluboký chlad', 'Zpomalení je o 5 % silnější.', 3, { slowPct: 0.05 }),
        S2: tK('nova'),
        S1c: tC(['Ledové kopí', 'Mrazivý šíp s 20% šancí zmrazí.', { skfreeze_frostbolt: 0.2 }], ['Tříšť', 'Mrazivý šíp vystřelí 3 šípy.', { skc_frostbolt: 2 }]),
        S3: tK('cone'),
        S2e: tE('Zesílená Mrazivá nova', 'Mrazivá nova +25 % plocha.', { skr_nova: 0.25 }),
        Pc: tP('Omrzliny', '+8 % poškození zpomaleným a zmrazeným nepřátelům.', 2, { slowedBonus: 0.08 }),
        Pd: tP('Zamrznutí', '+3 % šance zmrazit při zásahu.', 2, { freezeChance: 0.03 }),
        S3e: tE('Zesílený Kužel chladu', 'Kužel chladu +25 % dosah.', { skr_cone: 0.25 }),
        S2c: tC(['Ledová past', 'Mrazivá nova má o 3 s kratší přebíjení.', { skcd_nova: 3 }], ['Tříštivá nova', 'Mrazivá nova +60 % poškození.', { skd_nova: 0.6 }]),
        M1: tP('Tříštění', '+12 % poškození zmrazeným a omráčeným nepřátelům.', 3, { stunDmg: 0.12 }),
        S3c: tC(['Zmrazující kužel', 'Kužel chladu vždy zmrazí.', { skfreeze_cone: 1 }], ['Krutý mráz', 'Kužel chladu +40 % poškození.', { skd_cone: 0.4 }]),
        Pe: tP('Ledová zbroj', '+3 obrana.', 2, { def: 3 }),
        S4: tK('blizzard'), S5: tK('forb'),
        Pf: tP('Zimní mysl', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        S4e: tE('Zesílená Vánice', 'Vánice trvá o 2 s déle.', { skdur_blizzard: 2 }),
        Pg: tP('Mrazivá aura', 'Nepřátelé blízko tebe jsou zpomaleni o 12 %.', 2, { slowAura: 0.12 }),
        S5e: tE('Zesílená Ledová koule', 'Ledová koule +30 % poškození.', { skd_forb: 0.3 }),
        S4c: tC(['Ledová bouře', 'Vánice +30 % plocha.', { skr_blizzard: 0.3 }], ['Kroupy', 'Vánice +50 % poškození.', { skd_blizzard: 0.5 }]),
        Ph: tC(['Ledový blok', '-12 % přijatého poškození.', { dmgRed: 0.12 }], ['Zimní chlad', '+10 % mrazivé poškození.', { frostPct: 0.10 }]),
        S5c: tC(['Věčný led', 'Ledová koule s 15% šancí zmrazí.', { skfreeze_forb: 0.15 }], ['Rychlá koule', 'Ledová koule má o 3 s kratší přebíjení.', { skcd_forb: 3 }]),
        Pi: tP('Studený odstup', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
        Pj: tP('Zimní mág', '+5 % mrazivé poškození.', 2, { frostPct: 0.05 }),
        Pk: tP('Ledová krev', '+6 % odolnost vůči mrazu a +3 % života.', 2, { resFrost: 0.06, hpPct: 0.03 }),
        K1: tKEY('Tříštění', 'Zmrazení nepřátelé po smrti explodují (150 % útoku kolem).', { shatter: 1.5 }),
        K2: tKEY('Lavina', '+25 % poškození zpomaleným a zmrazeným nepřátelům.', { slowedBonus: 0.25 }),
        K3: tKEY('Věčná zima', '+12 % šance zmrazit při zásahu.', { freezeChance: 0.12 })
      } }
    ]
  },
  // =====================================================================
  warlock: {
    core: { name: 'Temná magie', icon: '☠', desc: 'Stíny, pakty a chaos – základ každého černokněžníka.', nodes: {
      B1: tBASE('sbolt'), B2: tBASE('drain'),
      Ca: tE('Zesílený Stínový šíp', 'Stínový šíp +15 % poškození a proletí 1 nepřítelem.', { skd_sbolt: 0.15, primPierce: 1 }),
      Cb: tP('Démonická kůže', '+4 % života.', 3, { hpPct: 0.04 }),
      Cc: tE('Zesílené Vysátí', 'Vysátí léčí o 25 % poškození víc a má o 1 s kratší přebíjení.', { skheal_drain: 0.25, skcd_drain: 1 }),
      CS1: tK('tap'), Cd: tP('Temná síla', '+4 % stínové poškození.', 3, { shadowPct: 0.04 }), CS2: tK('chaos'),
      CS1e: tE('Zesílený Životní pakt', 'Životní pakt bere o 40 % méně života.', { skcost_tap: 0.4 }),
      Ce: tP('Vysátí života', '+1 % vysávání života.', 2, { ls: 0.01 }),
      Cf: tP('Rychlá kletba', '-5 % přebíjení dovedností.', 2, { cdr: 0.05 }),
      CS2e: tE('Zesílený Chaotický šíp', 'Chaotický šíp +25 % poškození.', { skd_chaos: 0.25 }),
      Cg: tP('Temná obnova', '+0,3 % života za sekundu.', 2, { regen: 0.003 }),
      CS3: tK('cataclysm'),
      Ch: tP('Stínový závoj', '+6 % odolnost vůči stínu a +2 % úhyb.', 2, { resShadow: 0.06, dodge: 0.02 }),
      Ci: tP('Duševní pouto', 'Zabití obnoví 4 many.', 2, { killRes: 4 }),
      CS3e: tE('Zesílená Kataklyzma', 'Kataklyzma +25 % plocha a o 3 s kratší přebíjení.', { skr_cataclysm: 0.25, skcd_cataclysm: 3 }),
      Cj: tP('Krutost', '+8 % krit. poškození.', 2, { critDmg: 0.08 }),
      Ck: tC(['Kámen duše', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Pakt s temnotou', '+15 % poškození dovedností (mimo základní útok).', { skillPct: 0.15 }])
    } },
    specs: [
      { id: 'aff', name: 'Kletby', icon: '☣', desc: 'Kletby, mor a pomalá smrt, která se šíří.', nodes: {
        S1: tK('agony'),
        Pa: tP('Rozklad', '+10 % poškození v čase.', 3, { dotPct: 0.10 }),
        S1e: tE('Zesílená Zkáza', 'Zkáza +30 % plocha.', { skr_agony: 0.3 }),
        Pb: tP('Nákaza', 'Poškození v čase trvá o 1 s déle.', 3, { dotDur: 1 }),
        S2: tK('plague'),
        S1c: tC(['Prokletí', 'Zkáza udělá z nepřátel 6 s zranitelné.', { skvuln_agony: 6 }], ['Hlubší kletba', 'Zkáza +40 % poškození v čase.', { skdot_agony: 0.4 }]),
        S3: tK('ua'),
        S2e: tE('Zesílený Mor', 'Mor +25 % plocha.', { skr_plague: 0.25 }),
        Pc: tP('Plíživá smrt', '+8 % přímé poškození nepřátelům, kteří trpí kletbou (DoT).', 2, { dottedBonus: 0.08 }),
        Pd: tP('Temná žeň', '+4 % stínové poškození.', 2, { shadowPct: 0.04 }),
        S3e: tE('Zesílené Nestabilní utrpení', 'Nestabilní utrpení +40 % poškození v čase.', { skdot_ua: 0.4 }),
        S2c: tC(['Černá smrt', 'Mor +50 % poškození.', { skd_plague: 0.5 }], ['Morová oblaka', 'Mor trvá o 3 s déle.', { skdur_plague: 3 }]),
        M1: tP('Nákazlivost', 'Po smrti nepřítele přeskočí jeho kletby na 1 dalšího nepřítele (za úroveň).', 3, { dotSpread: 1 }),
        S3c: tC(['Dvojí utrpení', 'Nestabilní utrpení vystřelí 2 střely.', { skc_ua: 1 }], ['Zoufalství', 'Nestabilní utrpení zpomalí o 30 %.', { skslow_ua: 0.3 }]),
        Pe: tP('Žízeň po duších', 'Zabití tě vyléčí o 2 % života.', 2, { killHeal: 0.02 }),
        S4: tK('harvest'), S5: tK('dsoul'),
        Pf: tP('Pohlcení duše', 'Zabití obnoví 3 many.', 2, { killRes: 3 }),
        S4e: tE('Zesílená Žeň duší', 'Žeň duší +25 % plocha.', { skr_harvest: 0.25 }),
        Pg: tP('Morový mág', '+8 % poškození v čase.', 2, { dotPct: 0.08 }),
        S5e: tE('Zesílená Temná duše', 'Temná duše trvá o 4 s déle.', { skdur_dsoul: 4 }),
        S4c: tC(['Sklizeň', 'Žeň duší +40 % poškození.', { skd_harvest: 0.4 }], ['Hladová žeň', 'Žeň duší tě léčí o 20 % poškození.', { skheal_harvest: 0.2 }]),
        Ph: tC(['Šířící se mor', 'Kletby po smrti přeskočí na 1 nepřítele navíc.', { dotSpread: 1 }], ['Utrpení', 'Ignoruje 12 % odolností.', { resPen: 0.12 }]),
        S5c: tC(['Věčná temnota', 'Temná duše má o 10 s kratší přebíjení.', { skcd_dsoul: 10 }], ['Duše ve stínu', 'Během Temné duše +20 % stínové poškození.', { dsoul_shadowPct: 0.2 }]),
        Pi: tP('Dlouhá agónie', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Mistr kleteb', '+6 % poškození v čase.', 2, { dotPct: 0.06 }),
        Pk: tP('Temná kůže', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Temná sklizeň', 'Poškození v čase +60 %.', { dotPct: 0.6 }),
        K2: tKEY('Epidemie', 'Kletby po smrti přeskočí na 3 další nepřátele a trvají o 2 s déle.', { dotSpread: 3, dotDur: 2 }),
        K3: tKEY('Vysavač duší', 'Zabití tě vyléčí o 5 % života a obnoví 8 many.', { killHeal: 0.05, killRes: 8 })
      } },
      { id: 'demo', name: 'Démonologie', icon: '👹', desc: 'Démoni po tvém boku a pekelný oheň.', nodes: {
        S1: tK('imp'),
        Pa: tP('Démonická síla', '+10 % síla mazlíčků.', 3, { petPct: 0.10 }),
        S1e: tE('Zesílený skřet', 'Mazlíčci útočí o 15 % rychleji.', { petSpd: 0.15 }),
        Pb: tP('Ohnivý pakt', '+4 % ohnivé poškození.', 3, { firePct: 0.04 }),
        S2: tK('felhound'),
        S1c: tC(['Skřetí horda', 'Můžeš mít o 1 skřeta víc.', { petCount: 1 }], ['Velký skřet', '+25 % síla mazlíčků.', { petPct: 0.25 }]),
        S3: tK('hellfire'),
        S2e: tE('Zesílený Pekelný ohař', 'Mazlíčci tě léčí o 5 % svého poškození.', { petLs: 0.05 }),
        Pc: tP('Pakt krve', '+4 % života.', 2, { hpPct: 0.04 }),
        Pd: tP('Pekelné trny', '+6 % trny.', 2, { thorns: 0.06 }),
        S3e: tE('Zesílený Pekelný oheň', 'Pekelný oheň +30 % plocha.', { skr_hellfire: 0.3 }),
        S2c: tC(['Hladový ohař', 'Mazlíčci tě léčí o dalších 5 % poškození.', { petLs: 0.05 }], ['Divoký ohař', 'Mazlíčci útočí o 20 % rychleji.', { petSpd: 0.20 }]),
        M1: tP('Démonologie', '+8 % síla mazlíčků a +2 obrana.', 3, { petPct: 0.08, def: 2 }),
        S3c: tC(['Peklo', 'Pekelný oheň +50 % poškození.', { skd_hellfire: 0.5 }], ['Věčný oheň', 'Pekelný oheň trvá o 2 s déle.', { skdur_hellfire: 2 }]),
        Pe: tP('Démonická obnova', '+0,3 % života za sekundu.', 2, { regen: 0.003 }),
        S4: tK('gateway'), S5: tK('meta'),
        Pf: tP('Spalující pakt', '+8 % krit. poškození.', 2, { critDmg: 0.08 }),
        S4e: tE('Zesílená Brána', 'Démoni z Brány zůstanou o 4 s déle.', { skdur_gateway: 4 }),
        Pg: tP('Pán démonů', '+10 % síla mazlíčků.', 2, { petPct: 0.10 }),
        S5e: tE('Zesílená proměna', 'Démonická proměna trvá o 4 s déle.', { skdur_meta: 4 }),
        S4c: tC(['Velká brána', 'Brána vypustí o 2 skřety víc.', { skc_gateway: 2 }], ['Rychlá brána', 'Brána má o 8 s kratší přebíjení.', { skcd_gateway: 8 }]),
        Ph: tC(['Démonický štít', '-10 % přijatého poškození.', { dmgRed: 0.10 }], ['Pekelná zuřivost', '+8 % útok.', { atkPct: 0.08 }]),
        S5c: tC(['Ohnivá aura', 'Aura Démonické proměny +60 % poškození.', { auraPct: 0.6 }], ['Démon v tobě', 'Během proměny +10 % vysávání života.', { meta_ls: 0.10 }]),
        Pi: tP('Ohnivá krev', '+5 % odolnost vůči ohni a stínu.', 2, { resFire: 0.05, resShadow: 0.05 }),
        Pj: tP('Velitel legií', '+6 % síla mazlíčků.', 2, { petPct: 0.06 }),
        Pk: tP('Pekelná moc', '+5 % ohnivé poškození.', 2, { firePct: 0.05 }),
        K1: tKEY('Démonický pán', 'Můžeš mít o 1 skřeta víc a mazlíčci mají +40 % sílu.', { petCount: 1, petPct: 0.4 }),
        K2: tKEY('Věčná proměna', 'Démonická proměna trvá o 12 s déle a má o 15 s kratší přebíjení.', { skdur_meta: 12, skcd_meta: 15 }),
        K3: tKEY('Pekelný pakt', '+25 % ohnivé poškození a +15 % útok.', { firePct: 0.25, atkPct: 0.15 })
      } }
    ]
  },
  // =====================================================================
  hunter: {
    core: { name: 'Lovec', icon: '🏹', desc: 'Pasti, jedy a pohyb – základ každého lovce.', nodes: {
      B1: tBASE('shot'), B2: tBASE('vault'),
      Ca: tE('Zesílený Výstřel', 'Výstřel proletí 1 nepřítelem.', { primPierce: 1 }),
      Cb: tP('Výdrž', '+4 % života.', 3, { hpPct: 0.04 }),
      Cc: tE('Zesílený Úskok', 'Úskok má o 2 s kratší přebíjení.', { skcd_vault: 2 }),
      CS1: tK('trap'), Cd: tP('Soustředění', '+15 % obnova soustředění.', 3, { resRegenPct: 0.15 }), CS2: tK('sting'),
      CS1e: tE('Zesílená Výbušná past', 'Můžeš položit o 1 past víc a výbuch má +25 % plochu.', { trapMax: 1, skr_trap: 0.25 }),
      Ce: tP('Mrštnost', '+2 % úhyb.', 2, { dodge: 0.02 }),
      Cf: tP('Přírodní síla', '+5 % přírodní poškození.', 2, { naturePct: 0.05 }),
      CS2e: tE('Zesílené Hadí žihadlo', 'Jed z Hadího žihadla +40 %.', { skdot_sting: 0.4 }),
      Cg: tP('Rychlé nohy', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      CS3: tK('ftrap'),
      Ch: tP('Jed', '+8 % poškození v čase.', 2, { dotPct: 0.08 }),
      Ci: tP('Polní ošetření', '+0,3 % života za sekundu.', 2, { regen: 0.003 }),
      CS3e: tE('Zesílená Mrazivá past', 'Mrazivá past +30 % plocha a o 2 s kratší přebíjení.', { skr_ftrap: 0.3, skcd_ftrap: 2 }),
      Cj: tP('Stopař', '+10 % zlata a šance na předmět.', 2, { goldPct: 0.10, dropPct: 0.10 }),
      Ck: tC(['Hra na mrtvého', 'Jednou v každém podzemí přežiješ smrtelný zásah (vstaneš se 40 % života).', { rebirth: 1 }], ['Lovecký instinkt', '+15 % poškození dovedností (mimo základní útok).', { skillPct: 0.15 }])
    } },
    specs: [
      { id: 'mm', name: 'Lučištník', icon: '🎯', desc: 'Přesné šípy z dálky, průraz a popravy.', nodes: {
        S1: tK('aimed'),
        Pa: tP('Bystré oko', '+2 % krit. šance.', 3, { crit: 0.02 }),
        S1e: tE('Zesílená Mířená střela', 'Mířená střela +25 % poškození.', { skd_aimed: 0.25 }),
        Pb: tP('Průbojné šípy', 'Ignoruje 6 % zbroje.', 3, { armorPen: 0.06 }),
        S2: tK('volley'),
        S1c: tC(['Přesná muška', 'Mířená střela má o 1 s kratší přebíjení.', { skcd_aimed: 1 }], ['Označení cíle', 'Mířená střela udělá z nepřátel 5 s zranitelné.', { skvuln_aimed: 5 }]),
        S3: tK('eshot'),
        S2e: tE('Zesílená Salva', 'Salva vystřelí o 2 šípy víc.', { skc_volley: 2 }),
        Pc: tP('Smrtící střely', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        Pd: tP('Klidná ruka', '+4 % fyzické poškození.', 2, { physPct: 0.04 }),
        S3e: tE('Zesílený Výbušný šíp', 'Výbuch Výbušného šípu +30 % plocha.', { skr_eshot: 0.3 }),
        S2c: tC(['Deštná salva', 'Salva +30 % poškození.', { skd_volley: 0.3 }], ['Průrazná salva', 'Šípy Salvy proletí 1 nepřítelem.', { skpierce_volley: 1 }]),
        M1: tP('Dlouhý luk', 'Výstřel +8 % poškození.', 3, { skd_shot: 0.08 }),
        S3c: tC(['Zápalné šípy', 'Výbušný šíp zapálí zasažené (60 % útoku za s, 4 s).', { skburn_eshot: 0.6 }], ['Kazetový šíp', 'Výbušný šíp má o 2 s kratší přebíjení.', { skcd_eshot: 2 }]),
        Pe: tP('Úhyb střelce', '+2 % úhyb.', 2, { dodge: 0.02 }),
        S4: tK('rapid'), S5: tK('kshot'),
        Pf: tP('Odstřelovač', '+10 % poškození nepřátelům pod 30 % života.', 2, { execPct: 0.10 }),
        S4e: tE('Zesílená Rychlá palba', 'Rychlá palba trvá o 2 s déle.', { skdur_rapid: 2 }),
        Pg: tP('Soustředěná mysl', 'Kritický zásah obnoví 2 soustředění.', 2, { critRes: 2 }),
        S5e: tE('Zesílený Smrtící výstřel', 'Smrtící výstřel má o 2 s kratší přebíjení.', { skcd_kshot: 2 }),
        S4c: tC(['Ostrostřelec', 'Během Rychlé palby +15 % krit. šance.', { rapid_crit: 0.15 }], ['Bez oddechu', 'Rychlá palba má o 5 s kratší přebíjení.', { skcd_rapid: 5 }]),
        Ph: tC(['Osamělý vlk', 'Vlk tě nedoprovází, zato máš +20 % útok.', { loneWolf: 0.20 }], ['Multivýstřel', 'Výstřel vystřelí 2 šípy.', { primCount: 1 }]),
        S5c: tC(['Poslední slovo', 'Zabití Smrtícím výstřelem obnoví 25 soustředění.', { skkillres_kshot: 25 }], ['Průstřel', 'Smrtící výstřel proletí všemi nepřáteli.', { skpierce_kshot: 99 }]),
        Pi: tP('Rychlé tětivy', '+5 % rychlost útoku.', 2, { spdPct: 0.05 }),
        Pj: tP('Mistr luku', '+5 % fyzické poškození.', 2, { physPct: 0.05 }),
        Pk: tP('Kožená zbroj', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Smrtící přesnost', '+15 % krit. šance a +25 % krit. poškození.', { crit: 0.15, critDmg: 0.25 }),
        K2: tKEY('Průrazné šípy', 'Všechny šípy proletí 2 nepřáteli navíc a ignorují 25 % zbroje.', { arrowPierce: 2, armorPen: 0.25 }),
        K3: tKEY('Lovec hlav', '+60 % poškození nepřátelům pod 30 % života.', { execPct: 0.6 })
      } },
      { id: 'bm', name: 'Pán šelem', icon: '🐺', desc: 'Věrná smečka bojuje za tebe.', nodes: {
        S1: tK('kill'),
        Pa: tP('Pouto', '+10 % síla mazlíčků.', 3, { petPct: 0.10 }),
        S1e: tE('Zesílené Zabij!', 'Zabij! +25 % poškození a o 1 s kratší přebíjení.', { skd_kill: 0.25, skcd_kill: 1 }),
        Pb: tP('Divokost', 'Mazlíčci útočí o 6 % rychleji.', 3, { petSpd: 0.06 }),
        S2: tK('barbed'),
        S1c: tC(['Zabijácký rozkaz', 'Zabij! +40 % poškození.', { skd_kill: 0.4 }], ['Krvavý rozkaz', 'Zabij! obnoví 10 soustředění.', { skgen_kill: 10 }]),
        S3: tK('pack'),
        S2e: tE('Zesílená Ostnatá střela', 'Krvácení z Ostnaté střely +40 %.', { skdot_barbed: 0.4 }),
        Pc: tP('Lovecké pouto', 'Mazlíčci tě léčí o 3 % svého poškození.', 2, { petLs: 0.03 }),
        Pd: tP('Výdrž šelmy', '+4 % života.', 2, { hpPct: 0.04 }),
        S3e: tE('Zesílená smečka', 'Vlci ze Smečky zůstanou o 4 s déle.', { skdur_pack: 4 }),
        S2c: tC(['Šílenství', 'Ostnatá střela má o 1 s kratší přebíjení.', { skcd_barbed: 1 }], ['Divoká střela', 'Ostnatá střela +50 % poškození.', { skd_barbed: 0.5 }]),
        M1: tP('Alfa', '+8 % síla mazlíčků.', 3, { petPct: 0.08 }),
        S3c: tC(['Velká smečka', 'Smečka přivolá o 2 vlky víc.', { skc_pack: 2 }], ['Rychlá smečka', 'Smečka má o 6 s kratší přebíjení.', { skcd_pack: 6 }]),
        Pe: tP('Šelmí kůže', '+3 obrana.', 2, { def: 3 }),
        S4: tK('bwrath'), S5: tK('stampede'),
        Pf: tP('Krvavá kořist', '+1 % vysávání života.', 2, { ls: 0.01 }),
        S4e: tE('Zesílený Divoký hněv', 'Divoký hněv trvá o 4 s déle.', { skdur_bwrath: 4 }),
        Pg: tP('Vůdce smečky', '+6 % síla mazlíčků a +3 % útok.', 2, { petPct: 0.06, atkPct: 0.03 }),
        S5e: tE('Zesílené Stampédo', 'Stampédo přivolá o 2 zvířata víc.', { skc_stampede: 2 }),
        S4c: tC(['Zuřivá smečka', 'Během Divokého hněvu mazlíčci útočí o 30 % rychleji.', { bwrath_petSpd: 0.3 }], ['Neúprosný hněv', 'Divoký hněv má o 8 s kratší přebíjení.', { skcd_bwrath: 8 }]),
        Ph: tC(['Zvířecí společník', 'Druhý stálý vlk po tvém boku.', { petCount: 1 }], ['Medvědí ochránce', '-10 % přijatého poškození a +15 % síla mazlíčků.', { dmgRed: 0.10, petPct: 0.15 }]),
        S5c: tC(['Dupot', 'Stampédo má o 10 s kratší přebíjení.', { skcd_stampede: 10 }], ['Divoké stádo', 'Zvířata ze Stampéda zůstanou o 4 s déle.', { skdur_stampede: 4 }]),
        Pi: tP('Rychlost lovu', '+4 % rychlost útoku.', 2, { spdPct: 0.04 }),
        Pj: tP('Duch šelem', '+8 % síla mazlíčků.', 2, { petPct: 0.08 }),
        Pk: tP('Přírodní kůže', '+5 % odolnost vůči všem živlům.', 2, { resAll: 0.05 }),
        K1: tKEY('Smečka', 'Další stálý vlk a +30 % síla mazlíčků.', { petCount: 1, petPct: 0.3 }),
        K2: tKEY('Divoké pouto', 'Mazlíčci útočí o 40 % rychleji a léčí tě o 8 % svého poškození.', { petSpd: 0.4, petLs: 0.08 }),
        K3: tKEY('Pán šelem', '+20 % útok a +20 % síla mazlíčků.', { atkPct: 0.2, petPct: 0.2 })
      } }
    ]
  },
  // =====================================================================
  druid: {
    core: { name: 'Příroda', icon: '🌿', desc: 'Léčení, kořeny a enti – základ každého druida.', nodes: {
      B1: tBASE('wrath'), B2: tBASE('rejuv'),
      Ca: tE('Zesílený Hněv', 'Hněv +20 % poškození a obnoví o 3 ducha víc.', { skd_wrath: 0.2, skgen_wrath: 3 }),
      Cb: tP('Kořeny země', '+4 % života.', 3, { hpPct: 0.04 }),
      Cc: tE('Zesílené Omlazení', 'Omlazení léčí o 30 % víc.', { skd_rejuv: 0.3 }),
      CS1: tK('roots'), Cd: tP('Duch lesa', '+15 % obnova ducha.', 3, { resRegenPct: 0.15 }), CS2: tK('treant'),
      CS1e: tE('Zesílené Spoutání', 'Spoutání drží o 1 s déle.', { skstun_roots: 1 }),
      Ce: tP('Léčivý dotek', '+10 % léčení.', 2, { healPct: 0.10 }),
      Cf: tP('Přírodní síla', '+5 % přírodní poškození.', 2, { naturePct: 0.05 }),
      CS2e: tE('Zesílený ent', 'Ent zůstane o 10 s déle.', { skdur_treant: 10 }),
      Cg: tP('Trnitá kůže', '+6 % trny.', 2, { thorns: 0.06 }),
      CS3: tK('bark'),
      Ch: tP('Rychlost jelena', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      Ci: tP('Kořenitá obrana', '+3 obrana.', 2, { def: 3 }),
      CS3e: tE('Zesílená Dubová kůra', 'Dubová kůra trvá o 4 s déle.', { skdur_bark: 4 }),
      Cj: tP('Silný ent', '+15 % síla mazlíčků.', 2, { petPct: 0.15 }),
      Ck: tC(['Znovuzrození', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Dar přírody', '+15 % poškození dovedností (mimo základní útok).', { skillPct: 0.15 }])
    } },
    specs: [
      { id: 'balance', name: 'Rovnováha', icon: '🌙', desc: 'Síla měsíce a hvězd z dálky.', nodes: {
        S1: tK('moonfire'),
        Pa: tP('Měsíční svit', '+4 % arkánní poškození.', 3, { arcanePct: 0.04 }),
        S1e: tE('Zesílený Měsíční oheň', 'Měsíční oheň +40 % poškození v čase.', { skdot_moonfire: 0.4 }),
        Pb: tP('Hvězdná síla', '+4 % přírodní poškození.', 3, { naturePct: 0.04 }),
        S2: tK('starsurge'),
        S1c: tC(['Měsíční paprsek', 'Měsíční oheň +30 % plocha a +20 % poškození.', { skr_moonfire: 0.3, skd_moonfire: 0.2 }], ['Úplněk', 'Měsíční oheň má o 1 s kratší přebíjení.', { skcd_moonfire: 1 }]),
        S3: tK('starfall'),
        S2e: tE('Zesílený Hvězdný výboj', 'Výbuch Hvězdného výboje +30 % plocha.', { skr_starsurge: 0.3 }),
        Pc: tP('Zatmění', 'Každý 8. Hněv spustí Zatmění: +10 % arkánní a přírodní poškození na 6 s (za úroveň).', 2, { eclipse: 0.10 }),
        Pd: tP('Hvězdná mysl', '+2 % krit. šance.', 2, { crit: 0.02 }),
        S3e: tE('Zesílený Hvězdopád', 'Hvězdopád trvá o 2 s déle.', { skdur_starfall: 2 }),
        S2c: tC(['Supernova', 'Hvězdný výboj +40 % poškození.', { skd_starsurge: 0.4 }], ['Hvězdná rychlost', 'Hvězdný výboj má o 1,5 s kratší přebíjení.', { skcd_starsurge: 1.5 }]),
        M1: tP('Nebeská moc', '+4 % arkánní a přírodní poškození.', 3, { arcanePct: 0.04, naturePct: 0.04 }),
        S3c: tC(['Meteorický déšť', 'Hvězdopád +40 % poškození.', { skd_starfall: 0.4 }], ['Široké nebe', 'Hvězdopád +30 % plocha.', { skr_starfall: 0.3 }]),
        Pe: tP('Měsíční závoj', '+5 % odolnost vůči všem živlům.', 2, { resAll: 0.05 }),
        S4: tK('moonkin'), S5: tK('hurricane'),
        Pf: tP('Sluneční žár', '+10 % krit. poškození.', 2, { critDmg: 0.10 }),
        S4e: tE('Zesílená Měsíční podoba', 'Měsíční podoba trvá o 5 s déle.', { skdur_moonkin: 5 }),
        Pg: tP('Rovnováha sil', '-5 % přebíjení dovedností.', 2, { cdr: 0.05 }),
        S5e: tE('Zesílený Hurikán', 'Hurikán +30 % plocha.', { skr_hurricane: 0.3 }),
        S4c: tC(['Měsíční sova', 'V Měsíční podobě +15 % krit. šance.', { moonkin_crit: 0.15 }], ['Hvězdný štít', 'V Měsíční podobě -15 % přijatého poškození.', { moonkin_dmgRed: 0.15 }]),
        Ph: tC(['Úplné zatmění', 'Zatmění je o 15 % silnější.', { eclipse: 0.15 }], ['Hvězdná bouře', '+8 % šance, že Hněv vystřelí dvakrát.', { doubleChance: 0.08 }]),
        S5c: tC(['Tornádo', 'Hurikán +50 % poškození.', { skd_hurricane: 0.5 }], ['Oko bouře', 'Hurikán trvá o 3 s déle.', { skdur_hurricane: 3 }]),
        Pi: tP('Zrychlení', '+4 % rychlost útoku.', 2, { spdPct: 0.04 }),
        Pj: tP('Hvězdný druid', '+5 % arkánní poškození.', 2, { arcanePct: 0.05 }),
        Pk: tP('Kůra', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Měsíční bohyně', 'Měsíční oheň a Hvězdopád +50 % a ignorují 15 % odolností.', { skd_moonfire: 0.5, skd_starfall: 0.5, resPen: 0.15 }),
        K2: tKEY('Dokonalá bouře', 'Hurikán a Hvězdný výboj +50 % poškození a +20 % plocha.', { skd_hurricane: 0.5, skd_starsurge: 0.5, skr_hurricane: 0.2, skr_starsurge: 0.2 }),
        K3: tKEY('Věčné zatmění', '+20 % arkánní a přírodní poškození.', { arcanePct: 0.2, naturePct: 0.2 })
      } },
      { id: 'feral', name: 'Divočina', icon: '🐻', desc: 'Medvěd, vlk a drápy – boj zblízka v podobě šelmy.', nodes: {
        S1: tK('rend'),
        Pa: tP('Ostré drápy', '+4 % fyzické poškození.', 3, { physPct: 0.04 }),
        S1e: tE('Zesílené Rozdrásání', 'Krvácení z Rozdrásání +40 %.', { skdot_rend: 0.4 }),
        Pb: tP('Silná kůže', '+4 % života.', 3, { hpPct: 0.04 }),
        S2: tK('bear'),
        S1c: tC(['Roztrhání', 'Rozdrásání +30 % poškození.', { skd_rend: 0.3 }], ['Divoké drápy', 'Rozdrásání +30 % dosah.', { skr_rend: 0.3 }]),
        S3: tK('wolf'),
        S2e: tE('Zesílená Medvědí podoba', 'Medvědí podoba trvá o 5 s déle.', { skdur_bear: 5 }),
        Pc: tP('Hustá srst', 'V medvědí podobě +3 obrana.', 2, { bear_def: 3 }),
        Pd: tP('Dravost', 'Ve vlčí podobě +5 % rychlost útoku.', 2, { wolf_spdPct: 0.05 }),
        S3e: tE('Zesílená Vlčí podoba', 'Vlčí podoba trvá o 5 s déle.', { skdur_wolf: 5 }),
        S2c: tC(['Medvědí síla', 'V medvědí podobě +10 % útok.', { bear_atkPct: 0.10 }], ['Železná srst', 'V medvědí podobě +8 % trny a +5 % blok.', { bear_thorns: 0.08, bear_block: 0.05 }]),
        M1: tP('Divoký hlad', '+1 % vysávání života.', 3, { ls: 0.01 }),
        S3c: tC(['Krvavá luna', 'Ve vlčí podobě +2 % vysávání života.', { wolf_ls: 0.02 }], ['Vlčí rychlost', 'Ve vlčí podobě +10 % rychlost pohybu a +5 % krit. šance.', { wolf_msPct: 0.10, wolf_crit: 0.05 }]),
        Pe: tP('Lovec', '+2 % krit. šance.', 2, { crit: 0.02 }),
        S4: tK('maul'), S5: tK('fcharge'),
        Pf: tP('Divoká síla', '+3 % šance omráčit při zásahu.', 2, { stunChance: 0.03 }),
        S4e: tE('Zesílený Drtivý úder', 'Drtivý úder omráčí o 0,5 s déle.', { skstun_maul: 0.5 }),
        Pg: tP('Šelma', '+8 % krit. poškození.', 2, { critDmg: 0.08 }),
        S5e: tE('Zesílený Divoký skok', 'Divoký skok má o 2 s kratší přebíjení.', { skcd_fcharge: 2 }),
        S4c: tC(['Drtivá síla', 'Drtivý úder +40 % poškození.', { skd_maul: 0.4 }], ['Otřes', 'Drtivý úder +30 % plocha.', { skr_maul: 0.3 }]),
        Ph: tC(['Lykantrop', 'Všechny podoby trvají o 4 s déle.', { formDur: 4 }], ['Prvotní instinkt', '+10 % poškození omráčeným nepřátelům.', { stunDmg: 0.10 }]),
        S5c: tC(['Krvavý skok', 'Divoký skok rozkrvácí zasažené (60 % útoku za s, 5 s).', { skbleed_fcharge: 0.6 }], ['Zuřivý skok', 'Divoký skok +50 % poškození.', { skd_fcharge: 0.5 }]),
        Pi: tP('Divoké tempo', '+4 % rychlost útoku.', 2, { spdPct: 0.04 }),
        Pj: tP('Pán divočiny', '+5 % fyzické poškození.', 2, { physPct: 0.05 }),
        Pk: tP('Pevný postoj', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Medvědí síla', 'V medvědí podobě +30 % života a -15 % přijatého poškození, podoba trvá o 10 s déle.', { bear_hpPct: 0.3, bear_dmgRed: 0.15, skdur_bear: 10 }),
        K2: tKEY('Vlčí zuřivost', 'Ve vlčí podobě +15 % krit. šance a +5 % vysávání života, podoba trvá o 10 s déle.', { wolf_crit: 0.15, wolf_ls: 0.05, skdur_wolf: 10 }),
        K3: tKEY('Krvavá divočina', 'Krvácení a další poškození v čase +50 % a trvají o 2 s déle.', { dotPct: 0.5, dotDur: 2 })
      } }
    ]
  }
};

// Klíče, které talenty smí používat (kontrola v testech + výchozí 0)
const TALENT_KEYS = ['skillPct', 'cdr', 'resMax', 'resRegenPct', 'genPct', 'killRes', 'critRes', 'killHeal', 'enrageChance', 'enrageDur',
  'enrageAlways', 'bleedHit', 'offhand', 'ignite', 'burnBonus', 'slowedBonus', 'shatter', 'dotSpread', 'dottedBonus', 'vulnPct',
  'manaShield', 'loneWolf', 'petSpd', 'petLs', 'primCount', 'primPierce', 'arrowPierce', 'eclipse', 'trapMax', 'auraPct', 'formDur', 'lowHpDmg', 'msPct'];
const COND_PREFIXES = ['dw', 'dw1', 'th', 'sh'];
const SKILL_KEY_PREFIXES = ['skd', 'skr', 'skc', 'skdur', 'skcd', 'skcost', 'skgen', 'skpierce', 'skstun', 'skslow', 'skdot', 'skheal',
  'skvuln', 'skburn', 'skbleed', 'skfreeze', 'skexec', 'skenrage', 'skhits', 'skkillres'];

// ---------- Strom → seznam uzlů ----------
const _treeCache = {};
// Vrátí stromy třídy: [{ key:'core'|specId, name, icon, desc, gates, nodes:[…] }]
function classTrees(cls) {
  if (_treeCache[cls]) return _treeCache[cls];
  const T = TALENTS[cls];
  const build = (key, def, layout, gates, isCore) => {
    const nodes = Object.keys(layout).map(slot => {
      const raw = def.nodes[slot];
      if (!raw) throw new Error(`Chybí uzel ${cls}/${key}/${slot}`);
      const [col, row, req] = layout[slot];
      const n = Object.assign({}, raw, { id: `${key}.${slot}`, slot, tree: key, col, row, req: req.map(r => `${key}.${r}`) });
      if (n.skill) { const S = SKILLS[n.skill]; n.name = S.name; n.desc = S.desc; n.glyph = S.glyph; n.color = S.color; }
      if (n.type === 'enh') { const sk = skillOfEnh(def.nodes, slot, isCore); if (sk) { n.glyph = SKILLS[sk].glyph; n.color = SKILLS[sk].color; n.forSkill = sk; } }
      if (n.type === 'choice') { const sk = skillOfEnh(def.nodes, slot, isCore); if (sk) { n.glyph = SKILLS[sk].glyph; n.color = SKILLS[sk].color; n.forSkill = sk; } }
      return n;
    });
    return { key, name: def.name, icon: def.icon, desc: def.desc, gates, nodes, core: isCore, rows: Math.max(...nodes.map(n => n.row)) + 1 };
  };
  const trees = [build('core', T.core, CORE_LAYOUT, CORE_GATES, true)].concat(T.specs.map(s => build(s.id, s, SPEC_LAYOUT, SPEC_GATES, false)));
  _treeCache[cls] = trees;
  return trees;
}
// K jaké dovednosti patří zesílení / volba (podle pozice ve stromu)
function skillOfEnh(nodes, slot, isCore) {
  const map = isCore ? { Ca: 'B1', Cc: 'B2', CS1e: 'CS1', CS2e: 'CS2', CS3e: 'CS3' }
    : { S1e: 'S1', S1c: 'S1', S2e: 'S2', S2c: 'S2', S3e: 'S3', S3c: 'S3', S4e: 'S4', S4c: 'S4', S5e: 'S5', S5c: 'S5' };
  const s = map[slot];
  return s && nodes[s] ? nodes[s].skill : null;
}
function talentNodes(cls) { return classTrees(cls).flatMap(t => t.nodes); }
function nodeById(cls, id) { return talentNodes(cls).find(n => n.id === id); }
// Body utracené za uzel (volba = 1 bod, hodnota 1/2 = zvolená možnost)
function nodeSpent(n, v) { return !v || n.type === 'base' ? 0 : (n.type === 'choice' ? 1 : v); }
function nodeStats(n, v) {
  if (!v || n.type === 'base') return null;
  if (n.type === 'choice') return n.opts[v - 1] ? n.opts[v - 1].stats : null;
  return n.stats;
}
// Talentové body: do úrovně 60 bod za každou úroveň, potom bod za každé 3 úrovně
function talentPointsTotal(level) { return level <= 60 ? level - 1 : 59 + Math.floor((level - 60) / 3); }
function treePoints(ch, key) { return classTrees(ch.cls).find(t => t.key === key).nodes.reduce((s, n) => s + nodeSpent(n, ch.talents[n.id]), 0); }
function talentsSpent(ch) { return talentNodes(ch.cls).reduce((s, n) => s + nodeSpent(n, ch.talents[n.id]), 0); }
function gateFor(tree, row) { let need = 0; tree.gates.forEach(([r, n]) => { if (row >= r) need = n; }); return need; }

// Dovednosti, které postava zná (výchozí + odemčené talenty)
function knownSkills(ch) {
  const out = CLASSES[ch.cls].base.slice();
  talentNodes(ch.cls).forEach(n => { if (n.type === 'skill' && (ch.talents[n.id] || 0) > 0) out.push(n.skill); });
  return out;
}

// Nejkratší cesta k uzlu: řetěz předchůdců s nejmenším počtem nenaučených uzlů
// (končí u naučeného uzlu nebo u vrcholu stromu). Vrací pole id bez cílového uzlu.
function talentPath(cls, talents, id) {
  const tree = classTrees(cls).find(t => t.nodes.some(n => n.id === id));
  if (!tree) return [];
  const byId = {}; tree.nodes.forEach(n => byId[n.id] = n);
  const have = n => n.type === 'base' || (talents[n.id] || 0) > 0;
  const dist = { [id]: 0 }, prev = {}, open = [id], done = new Set();
  while (open.length) {
    open.sort((a, b) => dist[a] - dist[b]);
    const u = open.shift();
    if (done.has(u)) continue;
    done.add(u);
    const n = byId[u];
    if (u !== id && (have(n) || !n.req.length)) {   // konec řetězu
      const path = []; let c = u;
      while (c !== id) { path.push(c); c = prev[c]; }
      return path;
    }
    if (u === id && have(n)) return [];
    n.req.forEach(r => {
      const d = dist[u] + (have(byId[r]) ? 0 : 1) + 0.001 * Math.abs(byId[r].col - n.col);
      if (dist[r] === undefined || d < dist[r]) { dist[r] = d; prev[r] = u; open.push(r); }
    });
  }
  return [];
}
// Cesty přes každého přímého předchůdce ("stačí jeden"): [{ via, nodes:[shora dolů], cost }], nejkratší první
function talentRoutes(cls, talents, id) {
  const n = nodeById(cls, id);
  if (!n || !n.req.length) return [];
  const have = x => x.type === 'base' || (talents[x.id] || 0) > 0;
  return n.req.map(p => {
    const nodes = talentPath(cls, talents, p).concat([p]);
    return { via: p, nodes, cost: nodes.filter(x => !have(nodeById(cls, x))).length };
  }).sort((a, b) => a.cost - b.cost);
}
// Hrany cesty jako "rodič>potomek"
function routeEdges(route, id) { const e = new Set(); route.nodes.forEach((x, i) => e.add(x + '>' + (route.nodes[i + 1] || id))); return e; }
function talentChildren(cls, id) { const tree = classTrees(cls).find(t => t.nodes.some(n => n.id === id)); return tree ? tree.nodes.filter(n => n.req.includes(id)).map(n => n.id) : []; }

// Je celé rozložení talentů platné? (rodiče, brány, max. jedna klíčová pasivka)
function talentStateValid(cls, talents) {
  for (const tree of classTrees(cls)) {
    let keys = 0;   // klíčová pasivka: nejvýš jedna v každém stromu
    const pts = tree.nodes.reduce((s, n) => s + nodeSpent(n, talents[n.id]), 0);
    for (const n of tree.nodes) {
      const v = talents[n.id] || 0;
      if (!v || n.type === 'base') continue;
      if (n.type === 'key' && ++keys > 1) return false;
      if (v > (n.type === 'choice' ? 2 : n.max)) return false;
      if (n.req.length && !n.req.some(r => { const p = tree.nodes.find(x => x.id === r); return p.type === 'base' || (talents[r] || 0) > 0; })) return false;
      // brána: body v nižších řádcích stromu
      const below = tree.nodes.filter(x => x.row < n.row).reduce((s, x) => s + nodeSpent(x, talents[x.id]), 0);
      if (below < gateFor(tree, n.row)) return false;
    }
  }
  return true;
}
