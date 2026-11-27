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
  bloodthirst: { name: 'Krvežíznivost', glyph: '🩸', type: 'melee', elem: 'phys', range: 26, arc: 80, dmg: 1.7, healPct: 0.08, enrageChance: 0.3, gen: 8, cd: 3, color: '#ff4040', desc: 'Úder, který tě vyléčí o 8 % poškození a s 30% šancí rozzuří.' },
  rampage:     { name: 'Běsnění', glyph: '✸', type: 'melee', elem: 'phys', range: 26, arc: 100, dmg: 0.75, hits: 4, cost: 35, cd: 2, color: '#ff8060', desc: 'Čtyři rychlé údery za sebou.' },
  berserk:     { name: 'Berserkr', glyph: '😡', type: 'buff', dur: 6, stats: { spdPct: 0.2, dmgRed: 0.1 }, enrage: true, gen: 30, cd: 20, color: '#ff3030', desc: 'Okamžitě tě rozzuří, na 6 s +20 % rychlost útoku a -10 % přijatého poškození. +30 zuřivosti.' },
  roar:        { name: 'Hromový řev', glyph: '📢', type: 'nova', elem: 'phys', r: 60, dmg: 1.3, dot: { elem: 'phys', pct: 0.4, dur: 6 }, cost: 30, cd: 12, color: '#ffd060', desc: 'Řev zraní nepřátele kolem tebe a rozkrvácí je.' },
  // Válečník – Zbraně
  execute:     { name: 'Poprava', glyph: '⚰', type: 'melee', elem: 'phys', range: 28, arc: 70, dmg: 1.5, exec: 2.0, cost: 20, cd: 4, color: '#c0c0c0', desc: 'Úder, který nepřátelům pod 30 % života způsobí trojnásobné poškození.' },
  smash:       { name: 'Kolosální úder', glyph: '🔨', type: 'melee', elem: 'phys', range: 30, arc: 90, dmg: 2.6, vuln: 6, cost: 25, cd: 8, color: '#e0a060', desc: 'Drtivý úder, zasažení jsou 6 s zranitelní (+20 % poškození).' },
  avatar:      { name: 'Avatar', glyph: '🗿', type: 'buff', form: 'avatar', dur: 12, stats: { atkPct: 0.15, hpPct: 0.15 }, gen: 20, cd: 30, color: '#e0c080', desc: 'Na 12 s zmohutníš: +15 % útok a +15 % života.' },
  // Mág – Oheň
  firewall:    { name: 'Ohnivá stěna', glyph: '▤', type: 'ground', elem: 'fire', r: 34, delay: 0.1, dur: 5, tick: 0.5, dmg: 0.45, cost: 30, cd: 6, color: '#ff6a2a', desc: 'Pás ohně na zemi pálí vše, co jím projde.' },
  breath:      { name: 'Dračí dech', glyph: '🐉', type: 'melee', elem: 'fire', range: 58, arc: 90, dmg: 2.0, dot: { elem: 'fire', pct: 0.5, dur: 4 }, stun: 0.8, cost: 30, cd: 8, color: '#ff8a3a', desc: 'Kužel ohně před tebou zapálí a omráčí nepřátele.' },
  combust:     { name: 'Spalování', glyph: '♨', type: 'buff', dur: 8, stats: { crit: 0.15, firePct: 0.15 }, cd: 25, color: '#ffb040', desc: 'Na 8 s +15 % krit. šance a +15 % ohnivé poškození.' },
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
  dsoul:       { name: 'Temná duše', glyph: '☾', type: 'buff', dur: 12, stats: { dotPct: 0.3, spdPct: 0.15 }, cd: 30, color: '#8040c0', desc: 'Na 12 s +30 % poškození v čase a +15 % rychlost útoku.' },
  felhound:    { name: 'Pekelný ohař', glyph: '🐕', type: 'summon', pet: 'felhound', max: 1, cost: 50, cd: 10, color: '#d04060', desc: 'Vyvolá stálého pekelného ohaře, který trhá nepřátele zblízka.' },
  gateway:     { name: 'Brána démonů', glyph: '⛩', type: 'summon', pet: 'imp', count: 4, dur: 10, cost: 60, cd: 25, color: '#ff6020', desc: 'Na 10 s otevře bránu a vypustí 4 skřety.' },
  meta:        { name: 'Démonická proměna', glyph: '😈', type: 'buff', form: 'meta', dur: 12, stats: { atkPct: 0.2, hpPct: 0.2, dmgRed: 0.1 }, aura: { r: 34, tick: 0.5, dmg: 0.35, elem: 'fire' }, cd: 40, color: '#40e070', desc: 'Na 12 s se proměníš v démona: +20 % útok a život, -10 % poškození, ohnivá aura.' },
  // Lovec
  eshot:       { name: 'Výbušný šíp', glyph: '💥', type: 'projectile', elem: 'fire', speed: 260, dmg: 1.4, size: 2, arrow: true, explode: { r: 34, dmg: 1.6 }, cost: 25, cd: 4, color: '#ff8a3a', desc: 'Šíp při zásahu vybuchne.' },
  rapid:       { name: 'Rychlá palba', glyph: '⇶', type: 'buff', dur: 4, stats: { spdPct: 0.7 }, cd: 15, color: '#ffe080', desc: 'Na 4 s +70 % rychlost útoku.' },
  kshot:       { name: 'Smrtící výstřel', glyph: '☩', type: 'projectile', elem: 'phys', speed: 420, dmg: 2.0, exec: 2.0, size: 2, arrow: true, cost: 20, cd: 6, color: '#ffffff', desc: 'Silný výstřel, nepřátelům pod 30 % života trojnásobné poškození.' },
  ftrap:       { name: 'Mrazivá past', glyph: '❄', type: 'trap', elem: 'frost', r: 40, dmg: 1.0, freeze: 2.5, arm: 0.5, life: 20, max: 2, cost: 20, cd: 8, color: '#8fd8ff', desc: 'Past zmrazí nepřátele v okolí na 2,5 s.' },
  barbed:      { name: 'Ostnatá střela', glyph: '➳', type: 'projectile', elem: 'phys', speed: 300, dmg: 1.0, size: 1, arrow: true, dot: { elem: 'phys', pct: 0.7, dur: 6 }, selfBuff: { id: 'frenzy', name: 'Šílenství smečky', stats: { petSpd: 0.4 }, dur: 8, color: '#e0a060' }, cost: 15, cd: 4, color: '#e0c080', desc: 'Krvácivý šíp, mazlíčci na 8 s útočí o 40 % rychleji.' },
  bwrath:      { name: 'Divoký hněv', glyph: '🦁', type: 'buff', dur: 10, stats: { petPct: 0.4, atkPct: 0.1 }, cd: 25, color: '#ff9040', desc: 'Na 10 s: mazlíčci +40 % síla, ty +10 % útok.' },
  stampede:    { name: 'Stampédo', glyph: '🐃', type: 'summon', pet: 'wolf', count: 5, dur: 7, cost: 40, cd: 30, color: '#c0a080', desc: 'Na 7 s přivolá 5 divokých zvířat.' },
  // Druid
  starsurge:   { name: 'Hvězdný výboj', glyph: '✴', type: 'projectile', elem: 'arcane', speed: 220, dmg: 3.0, size: 4, explode: { r: 26, dmg: 1.0 }, cost: 35, cd: 3, color: '#d8c0ff', desc: 'Silný hvězdný projektil, při zásahu vybuchne.' },
  moonkin:     { name: 'Měsíční podoba', glyph: '🦉', type: 'buff', form: 'moonkin', dur: 15, stats: { arcanePct: 0.15, naturePct: 0.15, def: 6 }, cd: 30, color: '#b0a0ff', desc: 'Na 15 s: +15 % arkánní a přírodní poškození, +6 obrana.' },
  hurricane:   { name: 'Hurikán', glyph: '🌪', type: 'buff', dur: 6, aura: { r: 48, tick: 0.4, dmg: 0.35, elem: 'nature', slow: 0.3 }, cost: 40, cd: 14, color: '#9be89b', desc: 'Na 6 s tě obklopí vichřice, zraňuje a zpomaluje nepřátele kolem.' },
  wolf:        { name: 'Vlčí podoba', glyph: '🐺', type: 'buff', form: 'wolf', dur: 15, stats: { spdPct: 0.2, msPct: 0.25, crit: 0.06 }, cd: 25, color: '#a0a0b0', desc: 'Na 15 s: +20 % rychlost útoku, +25 % pohyb, +6 % krit. šance.' },
  maul:        { name: 'Drtivý úder', glyph: '🐾', type: 'melee', elem: 'phys', range: 30, arc: 120, dmg: 2.4, stun: 0.6, cost: 25, cd: 3, color: '#c09060', desc: 'Mohutný úder tlapou, omráčí zasažené.' },
  fcharge:     { name: 'Divoký skok', glyph: '⤳', type: 'dash', elem: 'phys', dist: 90, r: 22, dmg: 1.6, stun: 1.0, cd: 8, color: '#e0b080', desc: 'Skok vpřed, omráčí nepřátele v cestě.' },
  bark:        { name: 'Dubová kůra', glyph: '🌰', type: 'buff', dur: 8, stats: { dmgRed: 0.25, thorns: 0.2 }, cd: 20, color: '#a07040', desc: 'Na 8 s -25 % přijatého poškození a +20 % trny.' }
});
SKILLS.bear.form = 'bear'; delete SKILLS.bear.transform;

PETS.felhound = { name: 'Pekelný ohař', sprite: 'wolf', scale: 1.15, speed: 85, dmg: 0.8, cd: 1.0, range: 14, elem: 'shadow', tint: '#a02040' };

// ---------- Rasové dovednosti (od 1.13.0) ----------
// Každá rasa má vlastní strom talentů (záložka „Rasa“) a v něm aktivní rasovou dovednost (jako rasové schopnosti ve WoW).
// Rasové dovednosti nestojí zdroj (každá třída má jiný), omezuje je jen přebíjení. race = která rasa je smí mít.
Object.assign(SKILLS, {
  hwill:      { name: 'Lidská vůle', glyph: '✊', type: 'buff', race: 'human', breakCc: true, dur: 4, stats: { ccRed: 1, atkPct: 0.15 }, cd: 30, color: '#ffe08a',
                desc: 'Okamžitě zruší zmrazení a zpomalení. Na 4 s jsi vůči nim imunní a máš +15 % útok. Jde použít i ve zmrazení.' },
  stoneform:  { name: 'Kamenná podoba', glyph: '🗿', type: 'buff', race: 'dwarf', dur: 8, stats: { dmgRed: 0.4, ccRed: 1, msPct: -0.2 }, cd: 30, color: '#b0a090',
                desc: 'Na 8 s zkameníš: -40 % přijatého poškození a imunita vůči zpomalení, ale -20 % rychlost pohybu.' },
  shadowmeld: { name: 'Splynutí se stínem', glyph: '🌑', type: 'buff', race: 'elf', stealth: true, dur: 3, stats: { msPct: 0.4 }, cd: 20, color: '#8a7ac8',
                desc: 'Na 3 s zmizíš: nepřátelé tě ztratí z očí a přestanou útočit, +40 % pohyb. První útok ze stínu je kritický a má +100 % poškození.' },
  bloodfury:  { name: 'Krvavá zuřivost', glyph: '🩸', type: 'buff', race: 'orc', dur: 12, stats: { atkPct: 0.2, spdPct: 0.1, healPct: -0.5 }, cd: 45, color: '#e04030',
                desc: 'Na 12 s +20 % útok a +10 % rychlost útoku, ale léčení je o polovinu slabší.' },
  raise:      { name: 'Povstání mrtvých', glyph: '💀', type: 'summon', race: 'undead', pet: 'skeleton', count: 2, dur: 15, skel: true, cd: 20, color: '#d8d0b8',
                desc: 'Ze země povstanou 2 kostlivci a 15 s bojují za tebe (najednou nejvýš 4 kostlivci).' }
});
// Kostlivci nemrtvých: bojovník zblízka a mág na dálku (talent Kostěný mág)
PETS.skeleton = { name: 'Kostlivec', sprite: 'skeleton', scale: 1, speed: 70, dmg: 0.45, cd: 1.0, range: 14, elem: 'phys', skel: true, ring: '#7dffb0', pal: { c: '#2a6a4a', C: '#1a4a32', e: '#7dffb0' } };
PETS.skelmage = { name: 'Kostěný mág', sprite: 'skeleton', scale: 1, speed: 55, dmg: 0.5, cd: 1.4, range: 110, ranged: true, elem: 'frost', proj: '#9fe0ff', skel: true, ring: '#7fe0ff', pal: { c: '#3a5a8a', C: '#24365a', e: '#7fe0ff' } };
const SKEL_MAX = 4;   // nejvíc kostlivců najednou (talenty přidávají)

// Druid v medvědí a vlčí podobě útočí drápy zblízka (třídní rys Proměnlivost)
SKILLS.claw = { name: 'Drápnutí', glyph: '🐾', primary: true, type: 'melee', elem: 'phys', range: 26, arc: 130, dmg: 1.15, gen: 4, color: '#e0c090', desc: 'Základní útok v podobě šelmy: drápy zasáhnou nepřátele před tebou.' };
// Lovec: střelba v pohybu (inspirace Strafe z Diabla 3)
SKILLS.strafe = { name: 'Palba za běhu', glyph: '🌀', type: 'buff', strafe: { every: 0.2, dmg: 0.6, range: 150 }, dur: 3, stats: { msPct: 0.2 }, cost: 30, cd: 8, color: '#e8e4d4',
  desc: 'Na 3 s střílíš do všech stran: každých 0,2 s šíp na nepřítele do vzdálenosti 150 (60 % útoku). Můžeš se volně pohybovat, +20 % pohyb.' };

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
      Ca: tE('Zesílený Sek', 'Sek +12 % poškození a generuje o 4 zuřivosti víc.', { skd_slash: 0.12, skgen_slash: 4 }),
      Cb: tP('Železná vůle', '+3 % života.', 3, { hpPct: 0.03 }),
      Cc: tE('Zesílený Drtivý skok', 'Drtivý skok má o 3 s kratší přebíjení a omráčí o 0,4 s déle.', { skcd_leap: 3, skstun_leap: 0.4 }),
      CS1: tK('bash'), Cd: tP('Bojová zuřivost', '+10 % získané zuřivosti.', 3, { genPct: 0.1 }), CS2: tK('shout'),
      CS1e: tE('Těžký štít', 'Úder štítem +20 % poškození a omráčí o 0,5 s déle.', { skd_bash: 0.2, skstun_bash: 0.5 }),
      Ce: tP('Zocelení', '+3 obrana.', 2, { def: 3 }),
      Cf: tP('Dlouhý pokřik', 'Bojový pokřik trvá o 3 s déle.', 2, { skdur_shout: 3 }),
      CS2e: tE('Zesílený Bojový pokřik', 'Bojový pokřik má o 5 s kratší přebíjení.', { skcd_shout: 5 }),
      Cg: tP('Ostnatá zbroj', '+5 % trny (vrací poškození útočníkům).', 2, { thorns: 0.05 }),
      CS3: tK('quake'),
      Ch: tP('Neúnavnost', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      Ci: tP('Štítonoš', 'Se štítem +5 % blok a +2 obrana.', 2, { sh_block: 0.05, sh_def: 2 }),
      CS3e: tE('Zesílené Zemětřesení', 'Zemětřesení +30 % plocha a zasažení jsou 4 s zranitelní.', { skr_quake: 0.3, skvuln_quake: 4 }),
      Cj: tP('Druhý dech', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
      Ck: tC(['Nezlomný', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Krvavý obchod', '+2 % vysávání života.', { ls: 0.02 }])
    } },
    specs: [
      { id: 'fury', name: 'Zuřivost', icon: '⚔', desc: 'Dvě zbraně, rozzuření a nekonečná smršť seků.', nodes: {
        S1: tK('bloodthirst'),
        Pa: tP('Dvojí ovládání', 'Zbraň v levé ruce dává o 10 % útoku víc (základ 70 %).', 3, { offhand: 0.1 }),
        S1e: tE('Zesílená Krvežíznivost', 'Krvežíznivost +15 % poškození a léčí o 5 % poškození víc.', { skd_bloodthirst: 0.15, skheal_bloodthirst: 0.05 }),
        Pb: tP('Zuřivé údery', '+2 % rychlost útoku.', 3, { spdPct: 0.02 }),
        S2: tK('whirl'),
        S1c: tC(['Krvavá lázeň', 'Krvežíznivost rozkrvácí cíl (80 % útoku za s, 5 s).', { skbleed_bloodthirst: 0.8 }], ['Šílená žízeň', 'Krvežíznivost tě vždy rozzuří.', { skenrage_bloodthirst: 1 }]),
        S3: tK('rampage'),
        S2e: tE('Zesílená Vichřice', 'Vichřice trvá o 1 s déle a má +10 % poškození.', { skdur_whirl: 1, skd_whirl: 0.1 }),
        Pc: tP('Rozzuření', 'Kritický zásah tě s 15% šancí rozzuří (+10 % útok, +15 % rychlost útoku na 5 s).', 2, { enrageChance: 0.15 }),
        Pd: tP('Brutalita', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        S3e: tE('Zesílené Běsnění', 'Běsnění udeří ještě jednou navíc.', { skhits_rampage: 1 }),
        S2c: tC(['Krvavá vichřice', 'Vichřice tě léčí o 3 % poškození.', { skheal_whirl: 0.03 }], ['Bouře ocele', 'Vichřice +20 % plocha a vtahuje nepřátele k tobě.', { skr_whirl: 0.2, whirlPull: 1 }]),
        M1: tP('Mistr dvou čepelí', 'Se dvěma zbraněmi +2,5 % rychlost útoku a +1 % krit. šance.', 3, { dw_spdPct: 0.025, dw_crit: 0.01 }),
        S3c: tC(['Krvavé běsnění', 'Běsnění tě vždy rozzuří.', { skenrage_rampage: 1 }], ['Masakr', 'Běsnění +50 % poškození nepřátelům pod 30 % života.', { skexec_rampage: 0.5 }]),
        Pe: tP('Neukojitelnost', 'Zabití obnoví 5 zuřivosti.', 2, { killRes: 5 }),
        S4: tK('berserk'), S5: tK('roar'),
        Pf: tP('Krvežíznivec', '+0,5 % vysávání života.', 2, { ls: 0.005 }),
        S4e: tE('Zesílený Berserkr', 'Berserkr má o 6 s kratší přebíjení.', { skcd_berserk: 6 }),
        Pg: tP('Nespoutaná zuřivost', 'Během rozzuření +5 % útok.', 2, { enrage_atkPct: 0.05 }),
        S5e: tE('Zesílený Hromový řev', 'Hromový řev +30 % plocha.', { skr_roar: 0.3 }),
        S4c: tC(['Zuřivec', 'Během rozzuření +7,5 % krit. poškození.', { enrage_critDmg: 0.075 }], ['Nezastavitelný', 'Během rozzuření -5 % přijatého poškození.', { enrage_dmgRed: 0.05 }]),
        Ph: tC(['Titánský stisk', 'Obouruční meč nebo kladivo můžeš držet v každé ruce (levá dává 50 % útoku). Trpaslík to umí od narození – dostane místo toho +8 % útok se dvěma obouručními zbraněmi.', { titanGrip: 1 }], ['Jednoruční zuřivost', 'Se dvěma jednoručními zbraněmi +6 % útok.', { dw1_atkPct: 0.06 }]),
        S5c: tC(['Krvavý řev', 'Krvácení z Hromového řevu +25 %.', { skdot_roar: 0.25 }], ['Děsivý řev', 'Hromový řev omráčí na 1 s.', { skstun_roar: 1 }]),
        Pi: tP('Rychlé ruce', '+3 % rychlost útoku.', 2, { spdPct: 0.03 }),
        Pj: tP('Rudá mlha', 'Rozzuření trvá o 2 s déle a dává navíc +3 % rychlost útoku.', 2, { enrageDur: 2, enrage_spdPct: 0.03 }),
        Pk: tP('Hrubá síla', '+3 % fyzické poškození.', 2, { physPct: 0.03 }),
        K1: tKEY('Nekonečná zuřivost', 'Jsi trvale rozzuřený.', { enrageAlways: 1 }),
        K2: tKEY('Dvojitý úder', '+12 % šance, že základní útok udeří dvakrát.', { doubleChance: 0.12 }),
        K3: tKEY('Krvavé šílenství', 'Pod 50 % života způsobuješ +17 % poškození.', { lowHpDmg: 0.17 })
      } },
      { id: 'arms', name: 'Zbraně', icon: '🗡', desc: 'Obouruční zbraň, krvácení a popravy.', nodes: {
        S1: tK('mortal'),
        Pa: tP('Obouruční mistr', 'S obouruční zbraní +3 % útok.', 3, { th_atkPct: 0.03 }),
        S1e: tE('Zesílený Smrtící úder', 'Smrtící úder +12 % poškození a zasažení jsou 3 s zranitelní.', { skd_mortal: 0.12, skvuln_mortal: 3 }),
        Pb: tP('Hluboké rány', '+7 % poškození v čase (krvácení).', 3, { dotPct: 0.07 }),
        S2: tK('cleave'),
        S1c: tC(['Ostří', 'Krvácení ze Smrtícího úderu +30 %.', { skdot_mortal: 0.3 }], ['Kladivo', 'Smrtící úder omráčí na 0,8 s.', { skstun_mortal: 0.8 }]),
        S3: tK('execute'),
        S2e: tE('Zesílené Rozsekání', 'Rozsekání +25 % dosah.', { skr_cleave: 0.25 }),
        Pc: tP('Taktik', '+1 % krit. šance.', 2, { crit: 0.01 }),
        Pd: tP('Zabiják', '+7 % poškození nepřátelům pod 30 % života.', 2, { execPct: 0.07 }),
        S3e: tE('Zesílená Poprava', 'Poprava má o 2 s kratší přebíjení.', { skcd_execute: 2 }),
        S2c: tC(['Krvavé rozsekání', 'Krvácení z Rozsekání +30 %.', { skdot_cleave: 0.3 }], ['Smršť', 'Rozsekání má o 1 s kratší přebíjení a stojí o 25 % méně.', { skcd_cleave: 1, skcost_cleave: 0.25 }]),
        M1: tP('Hluboké seky', 'Základní útok rozkrvácí cíl (25 % útoku za s, 4 s).', 3, { bleedHit: 0.25 }),
        S3c: tC(['Náhlá smrt', 'Poprava +25 % poškození.', { skd_execute: 0.25 }], ['Sklizeň', 'Zabití Popravou obnoví 20 zuřivosti.', { skkillres_execute: 20 }]),
        Pe: tP('Ocelová kůže', 'S obouruční zbraní +3 obrana.', 2, { th_def: 3 }),
        S4: tK('smash'), S5: tK('avatar'),
        Pf: tP('Krutost', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        S4e: tE('Zesílený Kolosální úder', 'Zranitelnost z Kolosálního úderu trvá o 3 s déle.', { skvuln_smash: 3 }),
        Pg: tP('Drtič zbroje', 'Ignoruje 3,5 % zbroje.', 2, { armorPen: 0.035 }),
        S5e: tE('Zesílený Avatar', 'Avatar trvá o 4 s déle.', { skdur_avatar: 4 }),
        S4c: tC(['Rozdrcení', 'Kolosální úder +20 % poškození.', { skd_smash: 0.2 }], ['Bez slitování', 'Zranitelní nepřátelé dostávají o 5 % víc.', { vulnPct: 0.05 }]),
        Ph: tC(['Široký záběr', 'Rozsekání a Smrtící úder +20 % dosah.', { skr_cleave: 0.2, skr_mortal: 0.2 }], ['Přesnost', 'Ignoruje 7,5 % zbroje.', { armorPen: 0.075 }]),
        S5c: tC(['Titán', 'Během Avatara +7,5 % krit. šance.', { avatar_crit: 0.075 }], ['Neohroženost', 'Během Avatara -7,5 % přijatého poškození.', { avatar_dmgRed: 0.075 }]),
        Pi: tP('Krvavá stopa', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Mistr zbraní', '+3 % fyzické poškození.', 2, { physPct: 0.03 }),
        Pk: tP('Válečná zkušenost', '+3 % života.', 2, { hpPct: 0.03 }),
        K1: tKEY('Popravčí', 'Poprava okamžitě zabije běžné nepřátele i elity pod 20 % života a zabití jí obnoví přebíjení. +20 % poškození nepřátelům pod 30 % života.', { execPct: 0.2, executeKill: 1 }),
        K2: tKEY('Kolosální síla', 'Smrtící úder, Rozsekání a Poprava +20 % poškození.', { skd_mortal: 0.2, skd_cleave: 0.2, skd_execute: 0.2 }),
        K3: tKEY('Krvavé řemeslo', 'Krvácení a další poškození v čase +30 %.', { dotPct: 0.3 })
      } }
    ]
  },
  // =====================================================================
  mage: {
    core: { name: 'Arkána', icon: '✦', desc: 'Arkánní magie, mana a ochranná kouzla – základ každého mága.', nodes: {
      B1: tBASE('missile'), B2: tBASE('blink'),
      Ca: tE('Zesílená Magická střela', 'Magická střela vystřelí 2 střely.', { primCount: 1 }),
      Cb: tP('Arkánní intelekt', '+10 maximální many.', 3, { resMax: 10 }),
      Cc: tE('Zesílený Teleport', 'Teleport má o 2 s kratší přebíjení a na místě, odkud zmizíš, vybuchne mrazivá vlna (zmrazí na 1,2 s).', { skcd_blink: 2, blinkNova: 1.2 }),
      CS1: tK('amissiles'), Cd: tP('Arkánní tok', '+15 % obnova many.', 3, { resRegenPct: 0.15 }), CS2: tK('mshield'),
      CS1e: tE('Zesílené Arkánní střely', 'Arkánní střely vystřelí 2 střely navíc.', { skc_amissiles: 2 }),
      Ce: tP('Arkánní síla', '+3 % arkánní poškození.', 2, { arcanePct: 0.03 }),
      Cf: tP('Rychlé sesílání', '-3 % přebíjení dovedností.', 2, { cdr: 0.03 }),
      CS2e: tE('Zesílený Arkánní štít', 'Arkánní štít trvá o 5 s déle.', { skdur_mshield: 5 }),
      Cg: tP('Soustředění', '+1 % krit. šance.', 2, { crit: 0.01 }),
      CS3: tK('aorb'),
      Ch: tP('Ochranná magie', '+6 % odolnost vůči všem živlům.', 2, { resAll: 0.06 }),
      Ci: tP('Arkánní ozvěna', '+3,5 % šance, že základní útok vystřelí dvakrát.', 2, { doubleChance: 0.035 }),
      CS3e: tE('Zesílená Arkánní koule', 'Výbuch Arkánní koule +30 % plocha.', { skr_aorb: 0.3 }),
      Cj: tP('Mana z duší', 'Zabití obnoví 4 many.', 2, { killRes: 4 }),
      Ck: tC(['Zastavený čas', 'Jednou v každém podzemí tě smrtelný zásah nezabije (vstaneš se 40 % života).', { rebirth: 1 }], ['Arkánní moc', '+7,5 % poškození dovedností (mimo základní útok).', { skillPct: 0.075 }])
    } },
    specs: [
      { id: 'fire', name: 'Oheň', icon: '🔥', desc: 'Výbuchy, hoření a kritické zásahy.', nodes: {
        S1: tK('fireball'),
        Pa: tP('Žhnoucí plamen', '+2,5 % ohnivé poškození.', 3, { firePct: 0.025 }),
        S1e: tE('Zesílená Ohnivá koule', 'Výbuch Ohnivé koule +30 % plocha.', { skr_fireball: 0.3 }),
        Pb: tP('Vznícení', 'Ohnivé zásahy s 10% šancí zapálí (40 % útoku za s, 4 s).', 3, { ignite: 0.1 }),
        S2: tK('firewall'),
        S1c: tC(['Pyroblast', 'Ohnivá koule +17 % poškození.', { skd_fireball: 0.17 }], ['Ohnivý déšť', 'Ohnivá koule vystřelí 2 koule.', { skc_fireball: 1 }]),
        S3: tK('breath'),
        S2e: tE('Zesílená Ohnivá stěna', 'Ohnivá stěna trvá o 2 s déle.', { skdur_firewall: 2 }),
        Pc: tP('Spálení', '+5 % poškození hořícím nepřátelům.', 2, { burnBonus: 0.05 }),
        Pd: tP('Žár', 'Ignoruje 3,5 % odolností.', 2, { resPen: 0.035 }),
        S3e: tE('Zesílený Dračí dech', 'Dračí dech +25 % dosah.', { skr_breath: 0.25 }),
        S2c: tC(['Pekelná stěna', 'Ohnivá stěna +20 % poškození.', { skd_firewall: 0.2 }], ['Široká stěna', 'Ohnivá stěna +40 % plocha.', { skr_firewall: 0.4 }]),
        M1: tP('Hořící zem', '+7 % poškození v čase (hoření).', 3, { dotPct: 0.07 }),
        S3c: tC(['Dračí zuřivost', 'Dračí dech má o 3 s kratší přebíjení.', { skcd_breath: 3 }], ['Žhavé uhlíky', 'Hoření z Dračího dechu +40 %.', { skdot_breath: 0.4 }]),
        Pe: tP('Plamenný štít', '+6 % odolnost vůči ohni a +2 obrana.', 2, { resFire: 0.06, def: 2 }),
        S4: tK('meteor'), S5: tK('combust'),
        Pf: tP('Spalující krit', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        S4e: tE('Zesílený Meteor', 'Meteor +25 % plocha.', { skr_meteor: 0.25 }),
        Pg: tP('Ohnivá mysl', 'Kritický zásah obnoví 2 many.', 2, { critRes: 2 }),
        S5e: tE('Zesílené Spalování', 'Spalování trvá o 4 s déle.', { skdur_combust: 4 }),
        S4c: tC(['Meteorický roj', 'Meteor má o 2 s kratší přebíjení.', { skcd_meteor: 2 }], ['Pád hvězdy', 'Meteor +20 % poškození.', { skd_meteor: 0.2 }]),
        Ph: tC(['Fénix', 'Jednou v každém podzemí povstaneš z popela se 40 % života.', { rebirth: 1 }], ['Pyromanie', '+4 % ohnivé poškození a +1,5 % krit. šance.', { firePct: 0.04, crit: 0.015 }]),
        S5c: tC(['Vzplanutí', 'Spalování má o 8 s kratší přebíjení.', { skcd_combust: 8 }], ['Ohnivá bouře', 'Během Spalování +10 % útok.', { combust_atkPct: 0.1 }]),
        Pi: tP('Vytrvalé plameny', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Plamenný mág', '+3 % ohnivé poškození.', 2, { firePct: 0.03 }),
        Pk: tP('Ohnivá krev', '+3 % života.', 2, { hpPct: 0.03 }),
        K1: tKEY('Spalování', 'Hoření a další poškození v čase +20 % a po smrti nepřítele přeskočí na 2 další.', { dotPct: 0.2, dotSpread: 2 }),
        K2: tKEY('Esuova zuřivost', '+6 % krit. šance a +15 % krit. poškození.', { crit: 0.06, critDmg: 0.15 }),
        K3: tKEY('Ohnivá smršť', 'Ohnivé zásahy vždy zapálí a hořícím nepřátelům způsobuješ +10 % poškození.', { ignite: 1, burnBonus: 0.1 })
      } },
      { id: 'frost', name: 'Mráz', icon: '❄', desc: 'Zpomalení, zmrazení a tříštění ledu.', nodes: {
        S1: tK('frostbolt'),
        Pa: tP('Mrazivé kopí', '+2,5 % mrazivé poškození.', 3, { frostPct: 0.025 }),
        S1e: tE('Zesílený Mrazivý šíp', 'Mrazivý šíp +12 % poškození a proletí 1 nepřítelem.', { skd_frostbolt: 0.12, skpierce_frostbolt: 1 }),
        Pb: tP('Hluboký chlad', 'Zpomalení je o 5 % silnější.', 3, { slowPct: 0.05 }),
        S2: tK('nova'),
        S1c: tC(['Ledové kopí', 'Mrazivý šíp s 20% šancí zmrazí.', { skfreeze_frostbolt: 0.2 }], ['Tříšť', 'Mrazivý šíp vystřelí 3 šípy.', { skc_frostbolt: 2 }]),
        S3: tK('cone'),
        S2e: tE('Zesílená Mrazivá nova', 'Mrazivá nova +25 % plocha.', { skr_nova: 0.25 }),
        Pc: tP('Omrzliny', '+5 % poškození zpomaleným a zmrazeným nepřátelům.', 2, { slowedBonus: 0.05 }),
        Pd: tP('Zamrznutí', '+3 % šance zmrazit při zásahu.', 2, { freezeChance: 0.03 }),
        S3e: tE('Zesílený Kužel chladu', 'Kužel chladu +25 % dosah.', { skr_cone: 0.25 }),
        S2c: tC(['Ledová past', 'Mrazivá nova má o 3 s kratší přebíjení.', { skcd_nova: 3 }], ['Tříštivá nova', 'Mrazivá nova +30 % poškození.', { skd_nova: 0.3 }]),
        M1: tP('Tříštění', '+7 % poškození zmrazeným a omráčeným nepřátelům.', 3, { stunDmg: 0.07 }),
        S3c: tC(['Zmrazující kužel', 'Kužel chladu vždy zmrazí.', { skfreeze_cone: 1 }], ['Krutý mráz', 'Kužel chladu +20 % poškození.', { skd_cone: 0.2 }]),
        Pe: tP('Ledová zbroj', '+3 obrana.', 2, { def: 3 }),
        S4: tK('blizzard'), S5: tK('forb'),
        Pf: tP('Zimní mysl', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        S4e: tE('Zesílená Vánice', 'Vánice trvá o 2 s déle.', { skdur_blizzard: 2 }),
        Pg: tP('Mrazivá aura', 'Nepřátelé blízko tebe jsou zpomaleni o 12 %.', 2, { slowAura: 0.12 }),
        S5e: tE('Zesílená Ledová koule', 'Ledová koule +15 % poškození.', { skd_forb: 0.15 }),
        S4c: tC(['Ledová bouře', 'Vánice +30 % plocha.', { skr_blizzard: 0.3 }], ['Kroupy', 'Vánice +25 % poškození.', { skd_blizzard: 0.25 }]),
        Ph: tC(['Ledový blok', '-6 % přijatého poškození.', { dmgRed: 0.06 }], ['Zimní chlad', '+5 % mrazivé poškození.', { frostPct: 0.05 }]),
        S5c: tC(['Věčný led', 'Ledová koule s 15% šancí zmrazí.', { skfreeze_forb: 0.15 }], ['Rychlá koule', 'Ledová koule má o 3 s kratší přebíjení.', { skcd_forb: 3 }]),
        Pi: tP('Studený odstup', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
        Pj: tP('Zimní mág', '+3 % mrazivé poškození.', 2, { frostPct: 0.03 }),
        Pk: tP('Ledová krev', '+6 % odolnost vůči mrazu a +2 % života.', 2, { resFrost: 0.06, hpPct: 0.02 }),
        K1: tKEY('Tříštění', 'Zmrazení nepřátelé po smrti explodují (150 % útoku kolem).', { shatter: 1.5 }),
        K2: tKEY('Ledová zbroj', 'Kdo tě zasáhne zblízka, zamrzne na 1,5 s (každý nejvýš jednou za 4 s). +7,5 % poškození zpomaleným a zmrazeným.', { frostArmor: 1.5, slowedBonus: 0.075 }),
        K3: tKEY('Věčná zima', '+12 % šance zmrazit při zásahu.', { freezeChance: 0.12 })
      } }
    ]
  },
  // =====================================================================
  warlock: {
    core: { name: 'Temná magie', icon: '☠', desc: 'Stíny, pakty a chaos – základ každého černokněžníka.', nodes: {
      B1: tBASE('sbolt'), B2: tBASE('drain'),
      Ca: tE('Zesílený Stínový šíp', 'Stínový šíp +7,5 % poškození a proletí 1 nepřítelem.', { skd_sbolt: 0.075, primPierce: 1 }),
      Cb: tP('Démonická kůže', '+3 % života.', 3, { hpPct: 0.03 }),
      Cc: tE('Zesílené Vysátí', 'Vysátí léčí o 10 % poškození víc a má o 1 s kratší přebíjení.', { skheal_drain: 0.1, skcd_drain: 1 }),
      CS1: tK('tap'), Cd: tP('Temná síla', '+2,5 % stínové poškození.', 3, { shadowPct: 0.025 }), CS2: tK('chaos'),
      CS1e: tE('Zesílený Životní pakt', 'Životní pakt bere o 40 % méně života.', { skcost_tap: 0.4 }),
      Ce: tP('Vysátí života', '+0,5 % vysávání života.', 2, { ls: 0.005 }),
      Cf: tP('Rychlá kletba', '-3 % přebíjení dovedností.', 2, { cdr: 0.03 }),
      CS2e: tE('Zesílený Chaotický šíp', 'Chaotický šíp +12 % poškození.', { skd_chaos: 0.12 }),
      Cg: tP('Temná obnova', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
      CS3: tK('cataclysm'),
      Ch: tP('Stínový závoj', '+6 % odolnost vůči stínu a +2 % úhyb.', 2, { resShadow: 0.06, dodge: 0.02 }),
      Ci: tP('Duševní pouto', 'Zabití obnoví 4 many.', 2, { killRes: 4 }),
      CS3e: tE('Zesílená Kataklyzma', 'Kataklyzma +25 % plocha a o 3 s kratší přebíjení.', { skr_cataclysm: 0.25, skcd_cataclysm: 3 }),
      Cj: tP('Krutost', '+5 % krit. poškození.', 2, { critDmg: 0.05 }),
      Ck: tC(['Kámen duše', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Pakt s temnotou', '+7,5 % poškození dovedností (mimo základní útok).', { skillPct: 0.075 }])
    } },
    specs: [
      { id: 'aff', name: 'Kletby', icon: '☣', desc: 'Kletby, mor a pomalá smrt, která se šíří.', nodes: {
        S1: tK('agony'),
        Pa: tP('Rozklad', '+6 % poškození v čase.', 3, { dotPct: 0.06 }),
        S1e: tE('Zesílená Zkáza', 'Zkáza +30 % plocha.', { skr_agony: 0.3 }),
        Pb: tP('Nákaza', 'Poškození v čase trvá o 1 s déle.', 3, { dotDur: 1 }),
        S2: tK('plague'),
        S1c: tC(['Prokletí', 'Zkáza udělá z nepřátel 6 s zranitelné.', { skvuln_agony: 6 }], ['Hlubší kletba', 'Zkáza +20 % poškození v čase.', { skdot_agony: 0.2 }]),
        S3: tK('ua'),
        S2e: tE('Zesílený Mor', 'Mor +25 % plocha.', { skr_plague: 0.25 }),
        Pc: tP('Plíživá smrt', '+5 % přímé poškození nepřátelům, kteří trpí kletbou (DoT).', 2, { dottedBonus: 0.05 }),
        Pd: tP('Temná žeň', '+2,5 % stínové poškození.', 2, { shadowPct: 0.025 }),
        S3e: tE('Zesílené Nestabilní utrpení', 'Nestabilní utrpení +20 % poškození v čase.', { skdot_ua: 0.2 }),
        S2c: tC(['Černá smrt', 'Mor +25 % poškození.', { skd_plague: 0.25 }], ['Morová oblaka', 'Mor trvá o 3 s déle.', { skdur_plague: 3 }]),
        M1: tP('Nákazlivost', 'Po smrti nepřítele přeskočí jeho kletby na 1 dalšího nepřítele (za úroveň).', 3, { dotSpread: 1 }),
        S3c: tC(['Dvojí utrpení', 'Nestabilní utrpení vystřelí 2 střely.', { skc_ua: 1 }], ['Zoufalství', 'Nestabilní utrpení zpomalí o 30 %.', { skslow_ua: 0.3 }]),
        Pe: tP('Žízeň po duších', 'Zabití tě vyléčí o 0,5 % života.', 2, { killHeal: 0.005 }),
        S4: tK('harvest'), S5: tK('dsoul'),
        Pf: tP('Pohlcení duše', 'Zabití obnoví 3 many.', 2, { killRes: 3 }),
        S4e: tE('Zesílená Žeň duší', 'Žeň duší +25 % plocha.', { skr_harvest: 0.25 }),
        Pg: tP('Morový mág', '+5 % poškození v čase.', 2, { dotPct: 0.05 }),
        S5e: tE('Zesílená Temná duše', 'Temná duše trvá o 4 s déle.', { skdur_dsoul: 4 }),
        S4c: tC(['Sklizeň', 'Žeň duší +20 % poškození.', { skd_harvest: 0.2 }], ['Hladová žeň', 'Žeň duší tě léčí o 6 % poškození.', { skheal_harvest: 0.06 }]),
        Ph: tC(['Šířící se mor', 'Kletby po smrti přeskočí na 1 nepřítele navíc.', { dotSpread: 1 }], ['Utrpení', 'Ignoruje 6 % odolností.', { resPen: 0.06 }]),
        S5c: tC(['Věčná temnota', 'Temná duše má o 10 s kratší přebíjení.', { skcd_dsoul: 10 }], ['Duše ve stínu', 'Během Temné duše +10 % stínové poškození.', { dsoul_shadowPct: 0.1 }]),
        Pi: tP('Dlouhá agónie', 'Poškození v čase trvá o 1 s déle.', 2, { dotDur: 1 }),
        Pj: tP('Mistr kleteb', '+3,5 % poškození v čase.', 2, { dotPct: 0.035 }),
        Pk: tP('Temná kůže', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Temná sklizeň', 'Poškození v čase +30 %.', { dotPct: 0.3 }),
        K2: tKEY('Epidemie', 'Kletby po smrti přeskočí na 3 další nepřátele a trvají o 2 s déle.', { dotSpread: 3, dotDur: 2 }),
        K3: tKEY('Vysavač duší', 'Zabití tě vyléčí o 1,5 % života a obnoví 8 many.', { killHeal: 0.015, killRes: 8 })
      } },
      { id: 'demo', name: 'Démonologie', icon: '👹', desc: 'Démoni po tvém boku a pekelný oheň.', nodes: {
        S1: tK('imp'),
        Pa: tP('Démonická síla', '+6 % síla mazlíčků.', 3, { petPct: 0.06 }),
        S1e: tE('Zesílený skřet', 'Mazlíčci útočí o 15 % rychleji.', { petSpd: 0.15 }),
        Pb: tP('Ohnivý pakt', '+2,5 % ohnivé poškození.', 3, { firePct: 0.025 }),
        S2: tK('felhound'),
        S1c: tC(['Skřetí horda', 'Můžeš mít o 1 skřeta víc.', { petCount: 1 }], ['Velký skřet', '+12 % síla mazlíčků.', { petPct: 0.12 }]),
        S3: tK('hellfire'),
        S2e: tE('Zesílený Pekelný ohař', 'Mazlíčci tě léčí o 2 % svého poškození.', { petLs: 0.02 }),
        Pc: tP('Pakt krve', '+3 % života.', 2, { hpPct: 0.03 }),
        Pd: tP('Pekelné trny', '+3,5 % trny.', 2, { thorns: 0.035 }),
        S3e: tE('Zesílený Pekelný oheň', 'Pekelný oheň +30 % plocha.', { skr_hellfire: 0.3 }),
        S2c: tC(['Hladový ohař', 'Mazlíčci tě léčí o dalších 2 % poškození.', { petLs: 0.02 }], ['Divoký ohař', 'Mazlíčci útočí o 20 % rychleji.', { petSpd: 0.2 }]),
        M1: tP('Démonologie', '+5 % síla mazlíčků a +2 obrana.', 3, { petPct: 0.05, def: 2 }),
        S3c: tC(['Peklo', 'Pekelný oheň +25 % poškození.', { skd_hellfire: 0.25 }], ['Věčný oheň', 'Pekelný oheň trvá o 2 s déle.', { skdur_hellfire: 2 }]),
        Pe: tP('Démonická obnova', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
        S4: tK('gateway'), S5: tK('meta'),
        Pf: tP('Spalující pakt', '+5 % krit. poškození.', 2, { critDmg: 0.05 }),
        S4e: tE('Zesílená Brána', 'Démoni z Brány zůstanou o 4 s déle.', { skdur_gateway: 4 }),
        Pg: tP('Pán démonů', '+6 % síla mazlíčků.', 2, { petPct: 0.06 }),
        S5e: tE('Zesílená proměna', 'Démonická proměna trvá o 4 s déle.', { skdur_meta: 4 }),
        S4c: tC(['Velká brána', 'Brána vypustí o 2 skřety víc.', { skc_gateway: 2 }], ['Rychlá brána', 'Brána má o 8 s kratší přebíjení.', { skcd_gateway: 8 }]),
        Ph: tC(['Démonický štít', '-5 % přijatého poškození.', { dmgRed: 0.05 }], ['Pekelná zuřivost', '+4 % útok.', { atkPct: 0.04 }]),
        S5c: tC(['Ohnivá aura', 'Aura Démonické proměny +30 % poškození.', { auraPct: 0.3 }], ['Démon v tobě', 'Během proměny +3 % vysávání života.', { meta_ls: 0.03 }]),
        Pi: tP('Ohnivá krev', '+5 % odolnost vůči ohni a stínu.', 2, { resFire: 0.05, resShadow: 0.05 }),
        Pj: tP('Velitel legií', '+3,5 % síla mazlíčků.', 2, { petPct: 0.035 }),
        Pk: tP('Pekelná moc', '+3 % ohnivé poškození.', 2, { firePct: 0.03 }),
        K1: tKEY('Démonický pán', 'Můžeš mít o 1 skřeta víc a mazlíčci mají +20 % sílu.', { petCount: 1, petPct: 0.2 }),
        K2: tKEY('Věčná proměna', 'Démonická proměna trvá o 12 s déle a má o 15 s kratší přebíjení.', { skdur_meta: 12, skcd_meta: 15 }),
        K3: tKEY('Pekelný pakt', '+12 % ohnivé poškození a +7,5 % útok.', { firePct: 0.12, atkPct: 0.075 })
      } }
    ]
  },
  // =====================================================================
  hunter: {
    core: { name: 'Lovec', icon: '🏹', desc: 'Pasti, jedy a pohyb – základ každého lovce.', nodes: {
      B1: tBASE('shot'), B2: tBASE('vault'),
      Ca: tE('Zesílený Výstřel', 'Výstřel proletí 1 nepřítelem.', { primPierce: 1 }),
      Cb: tP('Výdrž', '+3 % života.', 3, { hpPct: 0.03 }),
      Cc: tE('Zesílený Úskok', 'Úskok má o 1 s kratší přebíjení a na místě, odkud uskočíš, zůstane výbušná past.', { skcd_vault: 1, vaultTrap: 1 }),
      CS1: tK('trap'), Cd: tP('Soustředění', '+15 % obnova soustředění.', 3, { resRegenPct: 0.15 }), CS2: tK('sting'),
      CS1e: tE('Zesílená Výbušná past', 'Můžeš položit o 1 past víc a výbuch má +25 % plochu.', { trapMax: 1, skr_trap: 0.25 }),
      Ce: tP('Mrštnost', '+2 % úhyb.', 2, { dodge: 0.02 }),
      Cf: tP('Přírodní síla', '+3 % přírodní poškození.', 2, { naturePct: 0.03 }),
      CS2e: tE('Zesílené Hadí žihadlo', 'Jed z Hadího žihadla +20 %.', { skdot_sting: 0.2 }),
      Cg: tP('Rychlé nohy', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      CS3: tK('ftrap'),
      Ch: tP('Jed', '+5 % poškození v čase.', 2, { dotPct: 0.05 }),
      Ci: tP('Polní ošetření', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
      CS3e: tE('Zesílená Mrazivá past', 'Mrazivá past +30 % plocha a o 2 s kratší přebíjení.', { skr_ftrap: 0.3, skcd_ftrap: 2 }),
      Cj: tP('Stopař', '+10 % zlata a šance na předmět.', 2, { goldPct: 0.1, dropPct: 0.1 }),
      Ck: tC(['Hra na mrtvého', 'Jednou v každém podzemí přežiješ smrtelný zásah (vstaneš se 40 % života).', { rebirth: 1 }], ['Lovecký instinkt', '+7,5 % poškození dovedností (mimo základní útok).', { skillPct: 0.075 }])
    } },
    specs: [
      { id: 'mm', name: 'Lučištník', icon: '🎯', desc: 'Přesné šípy z dálky, průraz a popravy.', nodes: {
        S1: tK('aimed'),
        Pa: tP('Bystré oko', '+1 % krit. šance.', 3, { crit: 0.01 }),
        S1e: tE('Zesílená Mířená střela', 'Mířená střela +12 % poškození.', { skd_aimed: 0.12 }),
        Pb: tP('Průbojné šípy', 'Ignoruje 3,5 % zbroje.', 3, { armorPen: 0.035 }),
        S2: tK('volley'),
        S1c: tC(['Přesná muška', 'Mířená střela má o 1 s kratší přebíjení.', { skcd_aimed: 1 }], ['Označení cíle', 'Mířená střela udělá z nepřátel 5 s zranitelné.', { skvuln_aimed: 5 }]),
        S3: tK('eshot'),
        S2e: tE('Zesílená Salva', 'Salva vystřelí o 2 šípy víc.', { skc_volley: 2 }),
        Pc: tP('Smrtící střely', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        Pd: tP('Klidná ruka', '+2,5 % fyzické poškození.', 2, { physPct: 0.025 }),
        S3e: tE('Zesílený Výbušný šíp', 'Výbuch Výbušného šípu +30 % plocha.', { skr_eshot: 0.3 }),
        S2c: tC(['Deštná salva', 'Salva +15 % poškození.', { skd_volley: 0.15 }], ['Průrazná salva', 'Šípy Salvy proletí 1 nepřítelem.', { skpierce_volley: 1 }]),
        M1: tP('Dlouhý luk', 'Výstřel +4 % poškození.', 3, { skd_shot: 0.04 }),
        S3c: tC(['Zápalné šípy', 'Výbušný šíp zapálí zasažené (60 % útoku za s, 4 s).', { skburn_eshot: 0.6 }], ['Kazetový šíp', 'Výbušný šíp má o 2 s kratší přebíjení.', { skcd_eshot: 2 }]),
        Pe: tP('Úhyb střelce', '+2 % úhyb.', 2, { dodge: 0.02 }),
        S4: tK('strafe'), S5: tK('kshot'),
        Pf: tP('Odstřelovač', '+6 % poškození nepřátelům pod 30 % života.', 2, { execPct: 0.06 }),
        S4e: tE('Zesílená Palba za běhu', 'Palba za běhu trvá o 1,5 s déle.', { skdur_strafe: 1.5 }),
        Pg: tP('Soustředěná mysl', 'Kritický zásah obnoví 2 soustředění.', 2, { critRes: 2 }),
        S5e: tE('Zesílený Smrtící výstřel', 'Smrtící výstřel má o 2 s kratší přebíjení.', { skcd_kshot: 2 }),
        S4c: tC(['Průstřelná palba', 'Šípy z Palby za běhu proletí 2 nepřáteli a během ní máš +7,5 % krit. šance.', { strafePierce: 2, strafe_crit: 0.075 }], ['Bez oddechu', 'Palba za běhu má o 3 s kratší přebíjení a stojí o 30 % méně.', { skcd_strafe: 3, skcost_strafe: 0.3 }]),
        Ph: tC(['Osamělý vlk', 'Vlk tě nedoprovází, zato máš +20 % útok.', { loneWolf: 0.2 }], ['Multivýstřel', 'Výstřel vystřelí 2 šípy.', { primCount: 1 }]),
        S5c: tC(['Poslední slovo', 'Zabití Smrtícím výstřelem obnoví 25 soustředění.', { skkillres_kshot: 25 }], ['Průstřel', 'Smrtící výstřel proletí všemi nepřáteli.', { skpierce_kshot: 99 }]),
        Pi: tP('Rychlé tětivy', '+3 % rychlost útoku.', 2, { spdPct: 0.03 }),
        Pj: tP('Mistr luku', '+3 % fyzické poškození.', 2, { physPct: 0.03 }),
        Pk: tP('Kožená zbroj', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Smrtící přesnost', '+7,5 % krit. šance a +12 % krit. poškození.', { crit: 0.075, critDmg: 0.12 }),
        K2: tKEY('Průrazné šípy', 'Všechny šípy proletí 2 nepřáteli navíc a ignorují 12 % zbroje.', { arrowPierce: 2, armorPen: 0.12 }),
        K3: tKEY('Lovec hlav', '+30 % poškození nepřátelům pod 30 % života.', { execPct: 0.3 })
      } },
      { id: 'bm', name: 'Pán šelem', icon: '🐺', desc: 'Věrná smečka bojuje za tebe.', nodes: {
        S1: tK('kill'),
        Pa: tP('Pouto', '+6 % síla mazlíčků.', 3, { petPct: 0.06 }),
        S1e: tE('Zesílené Zabij!', 'Zabij! +12 % poškození a o 1 s kratší přebíjení.', { skd_kill: 0.12, skcd_kill: 1 }),
        Pb: tP('Divokost', 'Mazlíčci útočí o 6 % rychleji.', 3, { petSpd: 0.06 }),
        S2: tK('barbed'),
        S1c: tC(['Zabijácký rozkaz', 'Zabij! +20 % poškození.', { skd_kill: 0.2 }], ['Krvavý rozkaz', 'Zabij! obnoví 10 soustředění.', { skgen_kill: 10 }]),
        S3: tK('pack'),
        S2e: tE('Zesílená Ostnatá střela', 'Krvácení z Ostnaté střely +20 %.', { skdot_barbed: 0.2 }),
        Pc: tP('Lovecké pouto', 'Mazlíčci tě léčí o 1 % svého poškození.', 2, { petLs: 0.01 }),
        Pd: tP('Výdrž šelmy', '+3 % života.', 2, { hpPct: 0.03 }),
        S3e: tE('Zesílená smečka', 'Vlci ze Smečky zůstanou o 4 s déle.', { skdur_pack: 4 }),
        S2c: tC(['Šílenství', 'Ostnatá střela má o 1 s kratší přebíjení.', { skcd_barbed: 1 }], ['Divoká střela', 'Ostnatá střela +25 % poškození.', { skd_barbed: 0.25 }]),
        M1: tP('Alfa', '+5 % síla mazlíčků.', 3, { petPct: 0.05 }),
        S3c: tC(['Velká smečka', 'Smečka přivolá o 2 vlky víc.', { skc_pack: 2 }], ['Rychlá smečka', 'Smečka má o 6 s kratší přebíjení.', { skcd_pack: 6 }]),
        Pe: tP('Šelmí kůže', '+3 obrana.', 2, { def: 3 }),
        S4: tK('bwrath'), S5: tK('stampede'),
        Pf: tP('Krvavá kořist', '+0,5 % vysávání života.', 2, { ls: 0.005 }),
        S4e: tE('Zesílený Divoký hněv', 'Divoký hněv trvá o 4 s déle.', { skdur_bwrath: 4 }),
        Pg: tP('Vůdce smečky', '+3,5 % síla mazlíčků a +2 % útok.', 2, { petPct: 0.035, atkPct: 0.02 }),
        S5e: tE('Zesílené Stampédo', 'Stampédo přivolá o 2 zvířata víc.', { skc_stampede: 2 }),
        S4c: tC(['Zuřivá smečka', 'Během Divokého hněvu mazlíčci útočí o 18 % rychleji.', { bwrath_petSpd: 0.18 }], ['Neúprosný hněv', 'Divoký hněv má o 8 s kratší přebíjení.', { skcd_bwrath: 8 }]),
        Ph: tC(['Zvířecí společník', 'Druhý stálý vlk po tvém boku.', { petCount: 1 }], ['Medvědí ochránce', '-5 % přijatého poškození a +7,5 % síla mazlíčků.', { dmgRed: 0.05, petPct: 0.075 }]),
        S5c: tC(['Dupot', 'Stampédo má o 10 s kratší přebíjení.', { skcd_stampede: 10 }], ['Divoké stádo', 'Zvířata ze Stampéda zůstanou o 4 s déle.', { skdur_stampede: 4 }]),
        Pi: tP('Rychlost lovu', '+2,5 % rychlost útoku.', 2, { spdPct: 0.025 }),
        Pj: tP('Duch šelem', '+5 % síla mazlíčků.', 2, { petPct: 0.05 }),
        Pk: tP('Přírodní kůže', '+5 % odolnost vůči všem živlům.', 2, { resAll: 0.05 }),
        K1: tKEY('Smečka', 'Další stálý vlk a +15 % síla mazlíčků.', { petCount: 1, petPct: 0.15 }),
        K2: tKEY('Divoké pouto', 'Mazlíčci útočí o 40 % rychleji a léčí tě o 2 % svého poškození.', { petSpd: 0.4, petLs: 0.02 }),
        K3: tKEY('Pán šelem', '+10 % útok a +10 % síla mazlíčků.', { atkPct: 0.1, petPct: 0.1 })
      } }
    ]
  },
  // =====================================================================
  druid: {
    core: { name: 'Příroda', icon: '🌿', desc: 'Léčení, kořeny a enti – základ každého druida.', nodes: {
      B1: tBASE('wrath'), B2: tBASE('rejuv'),
      Ca: tE('Zesílený Hněv', 'Hněv +10 % poškození a obnoví o 3 ducha víc.', { skd_wrath: 0.1, skgen_wrath: 3 }),
      Cb: tP('Kořeny země', '+3 % života.', 3, { hpPct: 0.03 }),
      Cc: tE('Zesílené Omlazení', 'Omlazení léčí o 15 % víc.', { skd_rejuv: 0.15 }),
      CS1: tK('roots'), Cd: tP('Duch lesa', '+15 % obnova ducha.', 3, { resRegenPct: 0.15 }), CS2: tK('treant'),
      CS1e: tE('Zesílené Spoutání', 'Spoutání drží o 1 s déle.', { skstun_roots: 1 }),
      Ce: tP('Léčivý dotek', '+10 % léčení.', 2, { healPct: 0.1 }),
      Cf: tP('Přírodní síla', '+3 % přírodní poškození.', 2, { naturePct: 0.03 }),
      CS2e: tE('Zesílený ent', 'Ent zůstane o 10 s déle.', { skdur_treant: 10 }),
      Cg: tP('Trnitá kůže', '+3,5 % trny.', 2, { thorns: 0.035 }),
      CS3: tK('bark'),
      Ch: tP('Rychlost jelena', '+5 % rychlost pohybu.', 2, { msPct: 0.05 }),
      Ci: tP('Kořenitá obrana', '+3 obrana.', 2, { def: 3 }),
      CS3e: tE('Zesílená Dubová kůra', 'Dubová kůra trvá o 4 s déle.', { skdur_bark: 4 }),
      Cj: tP('Silný ent', '+9 % síla mazlíčků.', 2, { petPct: 0.09 }),
      Ck: tC(['Znovuzrození', 'Jednou v každém podzemí vstaneš z mrtvých se 40 % života.', { rebirth: 1 }], ['Dar přírody', '+7,5 % poškození dovedností (mimo základní útok).', { skillPct: 0.075 }])
    } },
    specs: [
      { id: 'balance', name: 'Rovnováha', icon: '🌙', desc: 'Síla měsíce a hvězd z dálky.', nodes: {
        S1: tK('moonfire'),
        Pa: tP('Měsíční svit', '+2,5 % arkánní poškození.', 3, { arcanePct: 0.025 }),
        S1e: tE('Zesílený Měsíční oheň', 'Měsíční oheň +20 % poškození v čase.', { skdot_moonfire: 0.2 }),
        Pb: tP('Hvězdná síla', '+2,5 % přírodní poškození.', 3, { naturePct: 0.025 }),
        S2: tK('starsurge'),
        S1c: tC(['Měsíční paprsek', 'Měsíční oheň +30 % plocha a +10 % poškození.', { skr_moonfire: 0.3, skd_moonfire: 0.1 }], ['Úplněk', 'Měsíční oheň má o 1 s kratší přebíjení.', { skcd_moonfire: 1 }]),
        S3: tK('starfall'),
        S2e: tE('Zesílený Hvězdný výboj', 'Výbuch Hvězdného výboje +30 % plocha.', { skr_starsurge: 0.3 }),
        Pc: tP('Zatmění', 'Každý 8. Hněv spustí Zatmění: +6 % arkánní a přírodní poškození na 6 s (za úroveň).', 2, { eclipse: 0.06 }),
        Pd: tP('Hvězdná mysl', '+1 % krit. šance.', 2, { crit: 0.01 }),
        S3e: tE('Zesílený Hvězdopád', 'Hvězdopád trvá o 2 s déle.', { skdur_starfall: 2 }),
        S2c: tC(['Supernova', 'Hvězdný výboj +20 % poškození.', { skd_starsurge: 0.2 }], ['Hvězdná rychlost', 'Hvězdný výboj má o 1,5 s kratší přebíjení.', { skcd_starsurge: 1.5 }]),
        M1: tP('Nebeská moc', '+2,5 % arkánní a přírodní poškození.', 3, { arcanePct: 0.025, naturePct: 0.025 }),
        S3c: tC(['Meteorický déšť', 'Hvězdopád +20 % poškození.', { skd_starfall: 0.2 }], ['Široké nebe', 'Hvězdopád +30 % plocha.', { skr_starfall: 0.3 }]),
        Pe: tP('Měsíční závoj', '+5 % odolnost vůči všem živlům.', 2, { resAll: 0.05 }),
        S4: tK('moonkin'), S5: tK('hurricane'),
        Pf: tP('Sluneční žár', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
        S4e: tE('Zesílená Měsíční podoba', 'Měsíční podoba trvá o 5 s déle.', { skdur_moonkin: 5 }),
        Pg: tP('Rovnováha sil', '-3 % přebíjení dovedností.', 2, { cdr: 0.03 }),
        S5e: tE('Zesílený Hurikán', 'Hurikán +30 % plocha.', { skr_hurricane: 0.3 }),
        S4c: tC(['Měsíční sova', 'V Měsíční podobě +7,5 % krit. šance.', { moonkin_crit: 0.075 }], ['Hvězdný štít', 'V Měsíční podobě -7,5 % přijatého poškození.', { moonkin_dmgRed: 0.075 }]),
        Ph: tC(['Úplné zatmění', 'Zatmění je o 7,5 % silnější.', { eclipse: 0.075 }], ['Hvězdná bouře', '+4 % šance, že Hněv vystřelí dvakrát.', { doubleChance: 0.04 }]),
        S5c: tC(['Tornádo', 'Hurikán +25 % poškození.', { skd_hurricane: 0.25 }], ['Oko bouře', 'Hurikán trvá o 3 s déle.', { skdur_hurricane: 3 }]),
        Pi: tP('Zrychlení', '+2,5 % rychlost útoku.', 2, { spdPct: 0.025 }),
        Pj: tP('Hvězdný druid', '+3 % arkánní poškození.', 2, { arcanePct: 0.03 }),
        Pk: tP('Kůra', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Měsíční bohyně', 'Měsíční oheň a Hvězdopád +25 % a ignorují 7,5 % odolností.', { skd_moonfire: 0.25, skd_starfall: 0.25, resPen: 0.075 }),
        K2: tKEY('Dokonalá bouře', 'Hurikán a Hvězdný výboj +25 % poškození a +20 % plocha.', { skd_hurricane: 0.25, skd_starsurge: 0.25, skr_hurricane: 0.2, skr_starsurge: 0.2 }),
        K3: tKEY('Věčné zatmění', '+10 % arkánní a přírodní poškození.', { arcanePct: 0.1, naturePct: 0.1 })
      } },
      { id: 'feral', name: 'Divočina', icon: '🐻', desc: 'Medvěd, vlk a drápy – boj zblízka v podobě šelmy.', nodes: {
        S1: tK('rend'),
        Pa: tP('Ostré drápy', '+2,5 % fyzické poškození.', 3, { physPct: 0.025 }),
        S1e: tE('Zesílené Rozdrásání', 'Krvácení z Rozdrásání +20 %.', { skdot_rend: 0.2 }),
        Pb: tP('Silná kůže', '+3 % života.', 3, { hpPct: 0.03 }),
        S2: tK('bear'),
        S1c: tC(['Roztrhání', 'Rozdrásání +15 % poškození.', { skd_rend: 0.15 }], ['Divoké drápy', 'Rozdrásání +30 % dosah.', { skr_rend: 0.3 }]),
        S3: tK('wolf'),
        S2e: tE('Zesílená Medvědí podoba', 'Medvědí podoba trvá o 5 s déle.', { skdur_bear: 5 }),
        Pc: tP('Hustá srst', 'V medvědí podobě +3 obrana.', 2, { bear_def: 3 }),
        Pd: tP('Dravost', 'Ve vlčí podobě +3 % rychlost útoku.', 2, { wolf_spdPct: 0.03 }),
        S3e: tE('Zesílená Vlčí podoba', 'Vlčí podoba trvá o 5 s déle.', { skdur_wolf: 5 }),
        S2c: tC(['Medvědí síla', 'V medvědí podobě +5 % útok.', { bear_atkPct: 0.05 }], ['Železná srst', 'V medvědí podobě +4 % trny a +5 % blok.', { bear_thorns: 0.04, bear_block: 0.05 }]),
        M1: tP('Divoký hlad', '+0,5 % vysávání života.', 3, { ls: 0.005 }),
        S3c: tC(['Krvavá luna', 'Ve vlčí podobě +1 % vysávání života.', { wolf_ls: 0.01 }], ['Vlčí rychlost', 'Ve vlčí podobě +10 % rychlost pohybu a +2,5 % krit. šance.', { wolf_msPct: 0.1, wolf_crit: 0.025 }]),
        Pe: tP('Lovec', '+1 % krit. šance.', 2, { crit: 0.01 }),
        S4: tK('maul'), S5: tK('fcharge'),
        Pf: tP('Divoká síla', '+3 % šance omráčit při zásahu.', 2, { stunChance: 0.03 }),
        S4e: tE('Zesílený Drtivý úder', 'Drtivý úder omráčí o 0,5 s déle.', { skstun_maul: 0.5 }),
        Pg: tP('Šelma', '+5 % krit. poškození.', 2, { critDmg: 0.05 }),
        S5e: tE('Zesílený Divoký skok', 'Divoký skok má o 2 s kratší přebíjení.', { skcd_fcharge: 2 }),
        S4c: tC(['Drtivá síla', 'Drtivý úder +20 % poškození.', { skd_maul: 0.2 }], ['Otřes', 'Drtivý úder +30 % plocha.', { skr_maul: 0.3 }]),
        Ph: tC(['Lykantrop', 'Všechny podoby trvají o 4 s déle.', { formDur: 4 }], ['Prvotní instinkt', '+5 % poškození omráčeným nepřátelům.', { stunDmg: 0.05 }]),
        S5c: tC(['Krvavý skok', 'Divoký skok rozkrvácí zasažené (60 % útoku za s, 5 s).', { skbleed_fcharge: 0.6 }], ['Zuřivý skok', 'Divoký skok +25 % poškození.', { skd_fcharge: 0.25 }]),
        Pi: tP('Divoké tempo', '+2,5 % rychlost útoku.', 2, { spdPct: 0.025 }),
        Pj: tP('Pán divočiny', '+3 % fyzické poškození.', 2, { physPct: 0.03 }),
        Pk: tP('Pevný postoj', '+3 obrana.', 2, { def: 3 }),
        K1: tKEY('Medvědí síla', 'V medvědí podobě +18 % života a -7,5 % přijatého poškození, podoba trvá o 10 s déle.', { bear_hpPct: 0.18, bear_dmgRed: 0.075, skdur_bear: 10 }),
        K2: tKEY('Vlčí zuřivost', 'Ve vlčí podobě +7,5 % krit. šance a +2 % vysávání života, podoba trvá o 10 s déle.', { wolf_crit: 0.075, wolf_ls: 0.02, skdur_wolf: 10 }),
        K3: tKEY('Krvavá divočina', 'Krvácení a další poškození v čase +25 % a trvají o 2 s déle.', { dotPct: 0.25, dotDur: 2 })
      } }
    ]
  }
};

// ---------- Rasové stromy (od 1.13.0) ----------
// Malý strom pro každou rasu (12 uzlů, 18 úrovní). Body se berou ze stejné zásoby jako u stromů třídy.
const RACE_LAYOUT = {
  R1: [3, 0, []],
  Ra: [1, 1, ['R1']], R1e: [3, 1, ['R1']], Rb: [5, 1, ['R1']],
  Rc: [1, 2, ['Ra']], R1c: [3, 2, ['R1e']], Rd: [5, 2, ['Rb']],
  R2: [2, 3, ['Rc', 'R1c']], R3: [4, 3, ['R1c', 'Rd']],
  Re: [3, 4, ['R2', 'R3']],
  K1: [2, 5, ['Re']], K2: [4, 5, ['Re']]
};
const RACE_GATES = [[2, 3], [3, 6], [5, 10]];
// Ikony klíčových pasivek rasových stromů (id uzlů jsou u všech ras stejná, proto zvlášť)
const RACE_KEY_ICONS = { human: { K1: 'crowned-heart', K2: 'gold-stack' }, dwarf: { K1: 'dwarf-king', K2: 'hammer-drop' }, elf: { K1: 'dodging', K2: 'bowman' },
  orc: { K1: 'orc-head', K2: 'tribal-mask' }, undead: { K1: 'graveyard', K2: 'grim-reaper' } };
const RACE_TALENTS = {
  human: { name: 'Lidé', icon: '👑', desc: 'Všestrannost, odhodlání a štěstí.', nodes: {
    R1: tK('hwill'),
    Ra: tP('Vojenský výcvik', '+2 % útok.', 3, { atkPct: 0.02 }),
    R1e: tE('Neochvějná vůle', 'Lidská vůle tě navíc vyléčí o 15 % života.', { skheal_hwill: 0.15 }),
    Rb: tP('Houževnatost', '+3 % života.', 3, { hpPct: 0.03 }),
    Rc: tP('Rychlé učení', '+5 % zkušeností.', 2, { xpPct: 0.05 }),
    R1c: tC(['Vůdce', 'Lidská vůle trvá o 3 s déle.', { skdur_hwill: 3 }], ['Odhodlání', 'Lidská vůle má o 12 s kratší přebíjení.', { skcd_hwill: 12 }]),
    Rd: tP('Všestrannost', '-2,5 % přebíjení dovedností.', 2, { cdr: 0.025 }),
    R2: tP('Druhý dech', 'Když život klesne pod 30 %, okamžitě se vyléčíš o 25 % (jednou za 60 s).', 1, { secondWind: 0.25 }),
    R3: tP('Taktik', '+4 % síla dovedností (mimo základní útok).', 1, { skillPct: 0.04 }),
    Re: tP('Odolnost', '+5 % všechny odolnosti.', 2, { resAll: 0.05 }),
    K1: tKEY('Hrdina lidstva', '+5 % útok, +6 % života a +8 % rychlost pohybu.', { atkPct: 0.05, hpPct: 0.06, msPct: 0.08 }),
    K2: tKEY('Zlatá horečka', '+30 % zlata, +20 % lepší kořist a +10 % zkušeností.', { goldPct: 0.3, mfPct: 0.2, xpPct: 0.1 })
  } },
  dwarf: { name: 'Trpaslíci', icon: '⛏', desc: 'Kámen, ocel a neochvějná výdrž.', nodes: {
    R1: tK('stoneform'),
    Ra: tP('Kamenná kůže', '-1 % přijatého poškození.', 3, { dmgRed: 0.01 }),
    R1e: tE('Žulová podoba', 'Během Kamenné podoby vracíš 25 % poškození útočníkům.', { stoneform_thorns: 0.25 }),
    Rb: tP('Horská krev', '+3 % života.', 3, { hpPct: 0.03 }),
    Rc: tP('Pivní žaludek', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
    R1c: tC(['Hora', 'Kamenná podoba trvá o 4 s déle.', { skdur_stoneform: 4 }], ['Otřes', 'Na konci Kamenné podoby otřes zraní (300 % útoku) a omráčí nepřátele kolem.', { stoneQuake: 3 }]),
    Rd: tP('Kovaná pěst', '+3 % fyzické poškození.', 2, { physPct: 0.03 }),
    R2: tP('Kamenná krev', 'Když život klesne pod 35 %, na 6 s dostáváš o 30 % méně poškození (jednou za 60 s).', 1, { stoneSkin: 0.3 }),
    R3: tP('Pevný postoj', '-25 % trvání zmrazení a zpomalení.', 1, { ccRed: 0.25 }),
    Re: tP('Horník', '+10 % zlata a +2 obrana.', 2, { goldPct: 0.1, def: 2 }),
    K1: tKEY('Horský král', '+12 % života a -5 % přijatého poškození, ale -5 % rychlost pohybu.', { hpPct: 0.12, dmgRed: 0.05, msPct: -0.05 }),
    K2: tKEY('Kladivo hor', 'S obouruční zbraní +7,5 % útok a +10 % krit. poškození.', { th_atkPct: 0.075, th_critDmg: 0.1 })
  } },
  elf: { name: 'Elfové', icon: '🌙', desc: 'Mrštnost, stíny a přesnost.', nodes: {
    R1: tK('shadowmeld'),
    Ra: tP('Lehký krok', '+3 % rychlost pohybu.', 3, { msPct: 0.03 }),
    R1e: tE('Hluboký stín', 'Splynutí se stínem trvá o 2 s déle.', { skdur_shadowmeld: 2 }),
    Rb: tP('Bystré oko', '+1 % krit. šance.', 3, { crit: 0.01 }),
    Rc: tP('Mrštnost', '+2 % úhyb.', 2, { dodge: 0.02 }),
    R1c: tC(['Stínový tanec', 'Splynutí se stínem má o 8 s kratší přebíjení.', { skcd_shadowmeld: 8 }], ['Smrtící stín', 'Útok ze stínu má +50 % poškození navíc.', { stealthDmg: 0.5 }]),
    Rd: tP('Lesní moudrost', '+10 % obnova zdroje.', 2, { resRegenPct: 0.1 }),
    R2: tP('Vítr v zádech', 'Pohybové dovednosti (skok, úskok, teleport) mají o 25 % kratší přebíjení.', 1, { moveCdr: 0.25 }),
    R3: tP('Rychlé reflexy', 'Po úhybu máš na 3 s +10 % útok.', 1, { dodgeAtk: 0.1 }),
    Re: tP('Dlouhověkost', '+0,2 % života za sekundu.', 2, { regen: 0.002 }),
    K1: tKEY('Tanečník s čepelemi', '+8 % úhyb a +10 % rychlost pohybu.', { dodge: 0.08, msPct: 0.1 }),
    K2: tKEY('Elfí přesnost', '+5 % krit. šance a +15 % krit. poškození.', { crit: 0.05, critDmg: 0.15 })
  } },
  orc: { name: 'Orkové', icon: '🪓', desc: 'Zuřivost, síla a vůdcovství.', nodes: {
    R1: tK('bloodfury'),
    Ra: tP('Hrubá síla', '+2 % útok.', 3, { atkPct: 0.02 }),
    R1e: tE('Neutišitelná zuřivost', 'Krvavá zuřivost už neoslabuje léčení.', { bloodfury_healPct: 0.5 }),
    Rb: tP('Otužilost', '+3 % života.', 3, { hpPct: 0.03 }),
    Rc: tP('Válečný řev', '+6 % krit. poškození.', 2, { critDmg: 0.06 }),
    R1c: tC(['Válečný štvanec', 'Krvavá zuřivost trvá o 6 s déle.', { skdur_bloodfury: 6 }], ['Krvavá lázeň', 'Během Krvavé zuřivosti +3 % vysávání života.', { bloodfury_ls: 0.03 }]),
    Rd: tP('Tvrdá kůže', '-1 % přijatého poškození.', 2, { dmgRed: 0.01 }),
    R2: tP('Pomsta', 'Když tě zásah ubere víc než 10 % života, máš na 4 s +10 % útok.', 1, { revenge: 0.1 }),
    R3: tP('Velitel', '+7,5 % síla mazlíčků a kostlivců.', 1, { petPct: 0.075 }),
    Re: tP('Bojová zkušenost', '+1 % krit. šance.', 2, { crit: 0.01 }),
    K1: tKEY('Krvavý válečník', 'Rasová Krvavá zuřivost pod 50 % života je dvojnásobná (+30 % útok, +20 % rychlost útoku).', { orcRage2: 1 }),
    K2: tKEY('Nezastavitelný', 'Zabití prodlouží Krvavou zuřivost o 1 s a -20 % trvání zmrazení a zpomalení.', { furyExtend: 1, ccRed: 0.2 })
  } },
  undead: { name: 'Nemrtví', icon: '💀', desc: 'Kostlivci, vysávání a nesmrtelnost.', nodes: {
    R1: tK('raise'),
    Ra: tP('Mrtvé maso', '+3 % života.', 3, { hpPct: 0.03 }),
    R1e: tE('Kostěná armáda', 'Povstání mrtvých vyvolá o 1 kostlivce víc.', { skc_raise: 1 }),
    Rb: tP('Síla hrobu', '+7 % síla kostlivců.', 3, { skelPct: 0.07 }),
    Rc: tP('Pojídání mrtvol', 'Zabití tě vyléčí o 0,5 % života.', 2, { killHeal: 0.005 }),
    R1c: tC(['Věčná služba', 'Kostlivci vydrží o 8 s déle.', { skdur_raise: 8 }], ['Kostěný mág', 'Jeden z vyvolaných kostlivců je kostěný mág, který střílí ledové střely.', { skelMage: 1 }]),
    Rd: tP('Vůle opuštěných', '-15 % trvání zmrazení a zpomalení.', 2, { ccRed: 0.15 }),
    R2: tP('Vzkříšení padlých', 'Zabitý nepřítel s 10% šancí povstane jako tvůj kostlivec na 10 s.', 1, { raiseOnKill: 0.1 }),
    R3: tP('Kostěný štít', 'Každý tvůj kostlivec ti snižuje přijaté poškození o 2 %.', 1, { boneShield: 0.02 }),
    Re: tP('Žízeň po krvi', '+0,5 % vysávání života.', 2, { ls: 0.005 }),
    K1: tKEY('Armáda mrtvých', 'Najednou můžeš mít o 3 kostlivce víc a Vzkříšení padlých má šanci 25 %.', { skelMax: 3, raiseOnKill: 0.15 }),
    K2: tKEY('Pán smrti', 'Kostlivci mají +25 % sílu a když zaniknou, vybuchnou (150 % útoku kolem).', { skelPct: 0.25, skelBoom: 1.5 })
  } }
};

// Klíče, které talenty smí používat (kontrola v testech + výchozí 0)
const TALENT_KEYS = ['skillPct', 'cdr', 'resMax', 'resRegenPct', 'genPct', 'killRes', 'critRes', 'killHeal', 'enrageChance', 'enrageDur',
  'enrageAlways', 'bleedHit', 'offhand', 'ignite', 'burnBonus', 'slowedBonus', 'shatter', 'dotSpread', 'dottedBonus', 'vulnPct',
  'manaShield', 'loneWolf', 'petSpd', 'petLs', 'primCount', 'primPierce', 'arrowPierce', 'eclipse', 'trapMax', 'auraPct', 'formDur', 'lowHpDmg', 'msPct',
  'secondWind', 'stoneQuake', 'stoneSkin', 'stealthDmg', 'moveCdr', 'dodgeAtk', 'revenge', 'orcRage2', 'furyExtend', 'skelPct', 'skelMage',
  'raiseOnKill', 'boneShield', 'skelMax', 'skelBoom', 'executeKill', 'whirlPull', 'frostArmor', 'vaultTrap', 'blinkNova', 'dotLeech', 'strafePierce', 'elfDash', 'orcRage'];
const COND_PREFIXES = ['dw', 'dw1', 'dw2', 'th', 'sh'];
const SKILL_KEY_PREFIXES = ['skd', 'skr', 'skc', 'skdur', 'skcd', 'skcost', 'skgen', 'skpierce', 'skstun', 'skslow', 'skdot', 'skheal',
  'skvuln', 'skburn', 'skbleed', 'skfreeze', 'skexec', 'skenrage', 'skhits', 'skkillres'];

// ---------- Strom → seznam uzlů ----------
const _treeCache = {};
// Vrátí stromy třídy: [{ key:'core'|specId, name, icon, desc, gates, nodes:[…] }]
// Klíč stromů: 'warrior' (jen třída) nebo 'warrior:orc' (třída + rasový strom), viz talentKey(ch)
function classTrees(key) {
  if (_treeCache[key]) return _treeCache[key];
  const [cls, race] = key.split(':');
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
  if (race && RACE_TALENTS[race]) {
    const rt = build('race', RACE_TALENTS[race], RACE_LAYOUT, RACE_GATES, false); rt.isRace = true;
    rt.nodes.forEach(n => { if (n.type === 'key') n.icon = (RACE_KEY_ICONS[race] || {})[n.slot]; });
    trees.push(rt);
  }
  _treeCache[key] = trees;
  return trees;
}
// K jaké dovednosti patří zesílení / volba (podle pozice ve stromu)
function skillOfEnh(nodes, slot, isCore) {
  const map = isCore ? { Ca: 'B1', Cc: 'B2', CS1e: 'CS1', CS2e: 'CS2', CS3e: 'CS3' }
    : { S1e: 'S1', S1c: 'S1', S2e: 'S2', S2c: 'S2', S3e: 'S3', S3c: 'S3', S4e: 'S4', S4c: 'S4', S5e: 'S5', S5c: 'S5', R1e: 'R1', R1c: 'R1' };
  const s = map[slot];
  return s && nodes[s] ? nodes[s].skill : null;
}
// Klíč stromů postavy (třída + rasa)
function talentKey(ch) { return ch.race && RACE_TALENTS[ch.race] ? ch.cls + ':' + ch.race : ch.cls; }
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
function treePoints(ch, key) { return classTrees(talentKey(ch)).find(t => t.key === key).nodes.reduce((s, n) => s + nodeSpent(n, ch.talents[n.id]), 0); }
function talentsSpent(ch) { return talentNodes(talentKey(ch)).reduce((s, n) => s + nodeSpent(n, ch.talents[n.id]), 0); }
function gateFor(tree, row) { let need = 0; tree.gates.forEach(([r, n]) => { if (row >= r) need = n; }); return need; }

// Dovednosti, které postava zná (výchozí + odemčené talenty)
function knownSkills(ch) {
  const out = CLASSES[ch.cls].base.slice();
  talentNodes(talentKey(ch)).forEach(n => { if (n.type === 'skill' && (ch.talents[n.id] || 0) > 0) out.push(n.skill); });
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
