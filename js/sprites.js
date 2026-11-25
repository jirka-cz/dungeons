// Pixel-art sprity 16x16. Každé písmeno = barva z palety, "." = průhledné.
// Úprava postavy = přepsání řádků nebo barev v paletě.
const SPRITES = {
  human: {
    pal: { k:'#1a1a2e', h:'#6b3e1f', s:'#f2c39b', e:'#1a1a2e', b:'#3b6fd1', d:'#26478f', l:'#7a4a22', g:'#d4d9e0', y:'#e0b030', p:'#4a3a2a', o:'#2b2b2b' },
    px: [
      "................",
      "......kkkk......",
      ".....khhhhk.....",
      "....khhhhhhk....",
      "....khsssshk..g.",
      "....ksessesk..g.",
      "....kssssssk..g.",
      ".....kssssk...g.",
      "...kbbbbbbbbk.g.",
      "..ksbbbddbbbskg.",
      "..ksbbbddbbbsyyy",
      "...kllllllllk.y.",
      "...kbbbbbbbbk...",
      "....kppppppk....",
      "....kppkkppk....",
      "....kook.kook..."]
  },
  dwarf: {
    pal: { k:'#1a1a2e', m:'#9aa3ad', M:'#6b737c', s:'#e8b08a', e:'#1a1a2e', r:'#c4622d', R:'#8a3f1a', b:'#8a2b2b', l:'#5a3a1a', y:'#e0b030', p:'#4a3a2a', o:'#2b2b2b', a:'#d4d9e0', w:'#7a4a22' },
    px: [
      "................",
      "................",
      "................",
      ".....kkkkkk.....",
      "....kmmmmmmk....",
      "...kMmmmmmmMk...",
      "...kkkkkkkkkk.aa",
      "...ksessssesk.aa",
      "...krrssssrrk.aa",
      "..krrrRrrRrrrkw.",
      "..ksrrrrrrrrskw.",
      "..kbbrrRRrrbbkw.",
      "..kllllyyllllkw.",
      "...kpppkpppk..w.",
      "..koookkoook....",
      "..kkkkkkkkkk...."]
  },
  elf: {
    pal: { k:'#1a1a2e', g:'#3f8a3a', G:'#2a5e27', h:'#f0d27a', s:'#f6d7b8', e:'#2f7a4a', b:'#5aaa4a', l:'#6a4a2a', p:'#5a4a32', o:'#2b2b2b', w:'#8a5a2a', t:'#dddddd' },
    px: [
      ".....kkkkk......",
      "....kgggggk.....",
      "...kgGgggggk....",
      "...kghhhhhhgk...",
      "..skssessessksw.",
      "...kssssssssk.wt",
      "....khsssshk..wt",
      "....kbbbbbbk..wt",
      "...kbbGbbGbbk.wt",
      "...ksbbbbbbskswt",
      "....kllllllk..wt",
      "....kbbbbbbk..w.",
      "....kppppppk....",
      "....kppkkppk....",
      "....kpk..kpk....",
      "....kook.kook..."]
  },
  orc: {
    pal: { k:'#1a1a2e', h:'#222222', s:'#6fae4a', S:'#4a7f2e', e:'#e03030', t:'#f5f0dc', a:'#6b5a4a', A:'#4a3c30', m:'#9aa3ad', l:'#5a3a1a', p:'#4a3a2a', o:'#2b2b2b', c:'#7a4a22', C:'#5a3418' },
    px: [
      "......khk.......",
      ".....khhhk......",
      "...kssssssssk...",
      "...kSeSssSeSk...",
      "...kssssssssk...",
      "...kstsssstsk...",
      "....ksSSSSsk..cc",
      "..mmkaaaaaakmmcc",
      ".kmmaaAaaAaammkC",
      ".kssaaaaaaaasskC",
      ".kSSkllllllkSSk.",
      "....kppppppk....",
      "...kppppppppk...",
      "...kpppkkpppk...",
      "...koook.koook..",
      "...kkkkk.kkkkk.."]
  },
  undead: {
    pal: { k:'#1a1a2e', w:'#e8e4d4', W:'#b8b29e', e:'#7ff0ff', c:'#4a3a6a', C:'#2e2444', m:'#8a9099' },
    glow: ['#7ff0ff', '#3aa8bc'],
    px: [
      "................",
      ".....kkkkkk.....",
      "....kwwwwwwk....",
      "...kwwwwwwwwk...",
      "...kwkekkekwk...",
      "...kwwwkkwwwk...",
      "....kWkwkwkWk...",
      "...ckkwwwwkkc.m.",
      "..cCcwkwwkwcCcm.",
      "..cCcwwwwwwcCcm.",
      "..cCcwkwwkwcCwm.",
      "..cCccwwwwccCc..",
      ".cCcCckwwkcCcCc.",
      ".cCcCcw..wcCcCc.",
      "..cC.kw..wk.Cc..",
      ".....kk..kk....."]
  },

  // --- Nepřátelé ---
  slime: {
    pal: { k:'#1a1a2e', g:'#5ec45e', G:'#3a8a3a', w:'#c8f5c8', e:'#1a1a2e' },
    px: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "......kkkk......",
      "....kkggggkk....",
      "...kgwwggggGk...",
      "..kgwggggggGk...",
      "..kgggeggeggGk..",
      ".kGggggggggggGk.",
      ".kGGggggggggGGk.",
      "..kkkkkkkkkkkk..",
      "................"]
  },
  bat: {
    pal: { k:'#1a1a2e', b:'#5a4a7a', B:'#3a2e52', e:'#ff4040', w:'#7a6aa0', t:'#ffffff' },
    glow: ['#ff4040', '#b02020'],
    px: [
      "................",
      "................",
      "................",
      "......k..k......",
      "kk....kbbk....kk",
      "kwk..kbbbbk..kwk",
      "kwwk.kbebek.kwwk",
      "kwwwkbbbbbbkwwwk",
      "kwwwwbbttbbwwwwk",
      ".kwwBbbbbbbBwwk.",
      "..kwkBbbbbBkwk..",
      "...k..kBBk..k...",
      "................",
      "................",
      "................",
      "................"]
  },
  goblin: {
    pal: { k:'#1a1a2e', s:'#8ac040', S:'#5a8a28', e:'#ffdd33', c:'#7a5a3a', C:'#5a402a', d:'#d4d9e0', h:'#5a3418' },
    px: [
      "................",
      "................",
      "................",
      "....kkkkkk......",
      "kk.kssssssk.kk..",
      "kssksesseskssk..",
      "...ksSSSSsk.....",
      "...kccccccck.dd.",
      "..kscCccCccskd..",
      "...kccccccckh...",
      "...kcCcccCck....",
      "....kSSkSSk.....",
      "....kkk.kkk.....",
      "................",
      "................",
      "................"]
  },
  skeleton: {
    base: 'undead',
    pal: { c:'#7a5a3a', C:'#4a3424', e:'#ff5050' },
    glow: ['#ff5050', '#a02828']
  },
  wolf: {
    pal: { k:'#1a1a2e', g:'#8a8f99', G:'#5f646d', e:'#ffdd33', w:'#d8dbe0' },
    px: [
      "................",
      "................",
      "................",
      "................",
      "...........k.k..",
      "..........kgkgk.",
      "k.........kgegkk",
      "kk.......kggggwk",
      ".kgkkkkkkgggggk.",
      "..kgggggggggGk..",
      "..kgGgggggggk...",
      "..kgk.kgk.kgk...",
      "..kgk..kk.kgk...",
      "..kk.......kk...",
      "................",
      "................"]
  },
  imp: {
    pal: { k:'#1a1a2e', r:'#c0392b', R:'#7a1f1a', e:'#ffdd33', h:'#f5e6a8' },
    px: [
      "................",
      "................",
      "................",
      "....h....h......",
      "....kh..hk......",
      "....krrrrk......",
      "...krerrerk.....",
      "...krrRRrrk.....",
      "....krrrrk......",
      "...krkrrkrk.....",
      "...k.krrk.k.....",
      ".....krrk.......",
      ".....k..k.......",
      "................",
      "................",
      "................"]
  },
  zombie: {
    pal: { k:'#1a1a2e', s:'#7a9a6a', S:'#5a7a4a', e:'#e0e060', c:'#5a4a6a', C:'#3a2e48', p:'#4a3a2a' },
    px: [
      "................",
      "......kkkk......",
      ".....kssSsk.....",
      "....kssssssk....",
      "....kseSseSk....",
      "....kssssssk....",
      "....ksSkkSsk....",
      ".....kssssk.....",
      "...kccccccckssk.",
      "...kcCcccCcksssk",
      "...kccccccck....",
      "...kcCcCcCck....",
      "....kppppppk....",
      "....kppkkppk....",
      "....kpk..kpk....",
      "....kkk..kkk...."]
  },
  spider: {
    pal: { k:'#1a1a2e', b:'#3a3a3a', B:'#262626', e:'#ff4040', m:'#a03030' },
    px: [
      "................",
      "................",
      "................",
      "................",
      "...kkkkk........",
      "..kbbbbbk.......",
      ".kbbmbmbbk......",
      ".kbbbmbbbkkkk...",
      ".kbbmbmbbkBBBk..",
      "..kbbbbbkBeBek..",
      "...kkkkkkBBBBk..",
      "..k.k.kk.kkkk...",
      ".k.k.k..k.k.k...",
      "k..k..k...k..k..",
      "................",
      "................"]
  },
  cultist: {
    pal: { k:'#1a1a2e', r:'#6a1a1a', R:'#3e0e0e', s:'#d8b8a0', e:'#ffdd33', y:'#e0b030', w:'#7a4a22', g:'#c040ff' },
    px: [
      "......kkkk......",
      ".....kRRRRk.....",
      "....kRrrrrRk....",
      "....kRseesRk..g.",
      "....kRssssRk.gwg",
      ".....kRkkRk...w.",
      "....krrrrrrk..w.",
      "...krryrryrrk.w.",
      "...krrryyrrrksw.",
      "...krrrrrrrrk.w.",
      "...kRrrrrrrRk.w.",
      "...kRrrrrrrRk.w.",
      "..kRRrrrrrrRRkw.",
      "..kRRRRRRRRRRk..",
      "..kkkkkkkkkkkk..",
      "................"]
  },
  bloater: {
    pal: { k:'#1a1a2e', g:'#7a9a3a', G:'#5a7a2a', p:'#c0d060', e:'#ff4040' },
    px: [
      "................",
      "................",
      ".....kkkkkk.....",
      "...kkggggggkk...",
      "..kggpgggggGgk..",
      ".kggggegggeggGk.",
      ".kgggggggggggGk.",
      "kggpgkkkkkggggGk",
      "kgggkGGGGkgpgGGk",
      "kggggkkkkggggGGk",
      "kgpgggggggggGGk.",
      ".kgggggpggggGk..",
      "..kGgggggggGGk..",
      "...kkGGGGGGkk...",
      "....k..kk..k....",
      "................"]
  },
  treant: {
    pal: { k:'#1a1a2e', w:'#6a4a2a', W:'#4a3018', l:'#4a9a3a', L:'#2e6a24', e:'#ffdd33' },
    px: [
      "....llll.lll....",
      "..llLllllLlll...",
      ".lLlllLllllLll..",
      "..lllLlllLlll...",
      "....kwwwwwk.....",
      "....kweWewk.....",
      "....kwwwwwk.....",
      "..kwkwWwWwkwk...",
      ".kw.kwwwwwk.wk..",
      ".k..kwWwwwk..k..",
      "....kwwwWwk.....",
      "....kwwwwwk.....",
      "...kwWk.kWwk....",
      "...kwk...kwk....",
      "..kwWk...kWwk...",
      "..kkkk...kkkk..."]
  },
  golem: {
    pal: { k:'#1a1a2e', m:'#8a8f99', M:'#5f646d', e:'#ff8a30' },
    glow: ['#ff8a30', '#c04a10'],
    px: [
      "................",
      "....kkkkkkkk....",
      "...kmmmmmmmmk...",
      "...kmMemmeMmk...",
      "...kmmmMMmmmk...",
      "..kkkmmmmmmkkk..",
      ".kmmkkkkkkkkmmk.",
      "kmmMmmmMmmmMmmmk",
      "kmMmmmmmmmmmmMmk",
      "kmmkmmMmmMmmkmmk",
      "kmmkmmmmmmmmkmmk",
      ".kkkmmMmmMmmkkk.",
      "...kmmmkkmmmk...",
      "...kmmmkkmmmk...",
      "..kMMMMkkMMMMk..",
      "..kkkkkkkkkkkk.."]
  },
  // ---- bossové a jejich objekty ----
  icequeen: {
    pal: { k:'#1a1a2e', c:'#cff4ff', h:'#e8f4ff', s:'#d8e8f0', e:'#40e0ff', r:'#5aa0d8', R:'#2a5a8a', w:'#ffffff', g:'#8fe8ff', t:'#a0c8e0' },
    glow: ['#40e0ff', '#a0f4ff'],
    px: [
      "....c..cc..c..g.",
      "....cccccccc.ggg",
      "...khhhhhhhhk.g.",
      "...khseessehk.t.",
      "...khssssssshkt.",
      "...hkhsssshkh.t.",
      "..hhkwrrrrwkhht.",
      "..hkrrrwwrrrk.t.",
      "...krRrwwrRrkst.",
      "...krrrwwrrrk.t.",
      "...kRrrwwrrRk.t.",
      "..kRrrrwwrrrRkt.",
      "..kRRrrwwrrRRkt.",
      "..kRRRrwwrRRRk..",
      ".kRRRRRRRRRRRRk.",
      ".kkkkkkkkkkkkkk."]
  },
  shade: {
    pal: { k:'#0e0818', d:'#2a1a3e', D:'#1a0e28', p:'#5a3a8a', P:'#3a2560', e:'#e080ff', v:'#9a50e0' },
    glow: ['#e080ff', '#9a40d0'],
    px: [
      "......kkkk......",
      ".....kDddDk.....",
      "....kDddddDk....",
      "....kdkkkkdk....",
      "....kdekkedk....",
      "....kdkkkkdk....",
      "...kpDddddDpk...",
      "..kvpppppppppvk.",
      ".kv.kppPPppk.vk.",
      ".v..kpppppppk.v.",
      "....kpPpppPpk...",
      "....kppPppppk...",
      "....kpppPppk....",
      ".....kpp.ppk....",
      ".....kp..kpk....",
      "......k...k....."]
  },
  crystal: {
    pal: { k:'#1a1a2e', c:'#7ff0ff', C:'#2a8ab0', w:'#ffffff', s:'#5a5468', S:'#3a3448' },
    px: [
      "................",
      ".......kk.......",
      "......kcwk......",
      "......kcwk......",
      ".....kccwck.....",
      ".....kcccCk.....",
      ".....kcccCk.....",
      ".....kccCCk.....",
      ".....kcccCk.....",
      "......kcCk......",
      "......kcCk......",
      ".....kkkkkk.....",
      "....kssssssk....",
      "....kSSSSSSk....",
      ".....kkkkkk.....",
      "................"]
  },
  egg: {
    pal: { k:'#1a1a2e', w:'#e8e0c8', W:'#b8a888', g:'#8be07a', G:'#4a7a3a' },
    px: [
      "................",
      "................",
      "................",
      "......kkkk......",
      ".....kwwwWk.....",
      "....kwwgwwWk....",
      "....kwgwwgWk....",
      "...kwwwgwwWWk...",
      "...kwgwwwgwWk...",
      "...kwwgwgwWWk...",
      "...kWwwwwwWWk...",
      "....kWWwWWWk....",
      "....kGWWWWGk....",
      "...kGGkkkkGGk...",
      "................",
      "................"]
  },
  gate: {
    pal: { k:'#1a0a0a', s:'#5a3030', S:'#2e1616', f:'#ff6020', F:'#ffd040', r:'#a01818' },
    px: [
      "................",
      ".....kkkkkk.....",
      "...kkssSSsskk...",
      "..ksskkkkkkssk..",
      "..ksk.rrrr.ksk..",
      "..kskrffffrksk..",
      "..kskfFffFfksk..",
      "..kskffFFffksk..",
      "..kskfFffFfksk..",
      "..kskffFFffksk..",
      "..kskfffFffksk..",
      "..kskrffffrksk..",
      ".kSskrrrrrrksSk.",
      ".kSSkkkkkkkkSSk.",
      ".kkkkkkkkkkkkkk.",
      "................"]
  }
};

// Vyřeší sprity odvozené z jiných (base + přebarvení)
function getSprite(id) {
  const s = SPRITES[id];
  if (!s.base) return s;
  const b = SPRITES[s.base];
  return { px: b.px, pal: Object.assign({}, b.pal, s.pal), glow: s.glow || b.glow };
}

// Vykreslí sprite. opts: { flip, flash, alpha, blink, palOverride, t }
function drawSprite(ctx, id, x, y, scale, opts = {}) {
  const sp = getSprite(id);
  const pal = opts.palOverride ? Object.assign({}, sp.pal, opts.palOverride) : sp.pal;
  const t = opts.t || 0;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  for (let row = 0; row < 16; row++) {
    const line = sp.px[row];
    for (let col = 0; col < 16; col++) {
      const ch = line[col];
      if (!ch || ch === '.') continue;
      let color = pal[ch];
      if (ch === 'e') {
        if (sp.glow) color = Math.sin(t / 180) > 0 ? sp.glow[0] : sp.glow[1];
        else if (opts.blink) color = pal.s || color;
      }
      if (opts.tint && ch !== 'k') color = mixHex(color, opts.tint, 0.5);
      if (opts.frozen && ch !== 'k') color = mixHex(color, '#bfe8ff', 0.6);
      if (opts.flash && ch !== 'k') color = '#ffffff';
      ctx.fillStyle = color;
      const cx = opts.flip ? 15 - col : col;
      ctx.fillRect(Math.round(x + cx * scale), Math.round(y + row * scale), scale, scale);
    }
  }
  ctx.restore();
}

// Přebarvení oblečení podle třídy (které písmeno v paletě rasy je oblečení)
const RACE_CLOTH = {
  human:  { b: 0, d: 1 },
  dwarf:  { b: 0 },
  elf:    { b: 0, g: 1 },
  orc:    { a: 0, A: 1 },
  undead: { c: 0, C: 1 }
};
function classPal(race, cls) {
  const map = RACE_CLOTH[race], cols = CLASSES[cls].colors, out = {};
  for (const k in map) out[k] = cols[map[k]];
  return out;
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

// ---------- Ikony předmětů 12×12 (g = drahokam v barvě rarity) ----------
const ICON_PAL = { k: '#1a1a2e', m: '#c9ced6', M: '#8a929c', y: '#e0b030', w: '#8a5a2a', c: '#6a5a8a', C: '#4a3e66',
                   l: '#8a5a32', L: '#5a3a1e', h: '#ffffff', t: '#dddddd' };
const ICONS = {
  sword: ["....mM......", "....mM......", "....mM......", "....mM......", "....mM......", "....mM......", "....mM......",
          "..yyyyyy....", "....ww......", "....ww......", "....gg......", "............"],
  dagger: ["............", "............", "....mM......", "....mM......", "....mM......", "....mM......", "..yyyyyy....",
           "....ww......", "....ww......", "....gg......", "............", "............"],
  greatsword: ["....mmM.....", "....mmM.....", "....mmM.....", "....mmM.....", "....mmM.....", "....mmM.....", "....mmM.....",
               "..yyyyyyy...", ".....w......", ".....w......", ".....w......", ".....g......"],
  axe: ["..mmM.ww....", ".mmmM.ww....", ".mmmMwww....", ".mmmM.ww....", "..mmM.ww....", "......ww....", "......ww....",
        "......ww....", "......ww....", "......ww....", "......gg....", "............"],
  mace: [".....mm.....", "...mmmmmm...", "..mmMggMmm..", "..mmmmmmmm..", "...mmmmmm...", ".....ww.....", ".....ww.....",
         ".....ww.....", ".....ww.....", ".....ww.....", ".....yy.....", "............"],
  hammer: [".mmmmmmmmmm.", ".mmMMggMMmm.", ".mmmmmmmmmm.", ".....ww.....", ".....ww.....", ".....ww.....", ".....ww.....",
           ".....ww.....", ".....ww.....", ".....ww.....", ".....yy.....", "............"],
  wand: ["......g.....", ".....ggg....", "......g.....", "......w.....", "......w.....", ".....w......", ".....w......",
         "....w.......", "....w.......", "...y........", "............", "............"],
  staff: ["....yggy....", "....gggg....", ".....yy.....", ".....ww.....", ".....ww.....", ".....ww.....", ".....ww.....",
          ".....ww.....", ".....ww.....", ".....ww.....", ".....ww.....", ".....ww....."],
  bow: ["....ww......", "...w..t.....", "..w...t.....", "..w...t.....", ".w....t.....", ".wg...t.....", ".wg...t.....",
        ".w....t.....", "..w...t.....", "..w...t.....", "...w..t.....", "....ww......"],
  shield: ["..mmmmmmmm..", ".mMccccccMm.", ".mcccggcccm.", ".mccggggccm.", ".mcccggcccm.", ".mccccccccm.", "..mccccccm..",
           "..mccccccm..", "...mccccm...", "....mccm....", ".....mm.....", "............"],
  orb: ["............", "....gggg....", "...ghggggg..", "...ghggggg..", "...gggggg...", "....gggg....", ".....yy.....",
        "....yyyy....", "...yyyyyy...", "............", "............", "............"],
  helm: ["............", "...mmmmmm...", "..mmmmmmmm..", "..mmMggMmm..", "..mm.kk.mm..", "..mm.kk.mm..", "..mmmmmmmm..",
         "...mm..mm...", "............", "............", "............", "............"],
  hood: ["............", "....cccc....", "...cccccc...", "..cccccccc..", "..ccCkkCcc..", "..cCkkkkCc..", "..cCkkkkCc..",
         "..ccc..ccc..", "...g....g...", "............", "............", "............"],
  chest: ["............", "..mm....mm..", ".mmmmMMmmmm.", ".mmmmMMmmmm.", ".mmmmggmmmm.", "..mmmMMmmm..", "..mmmmmmmm..",
          "..mmmmmmmm..", "..mMMMMMMm..", "..mmmmmmmm..", "............", "............"],
  robe: ["............", "..cc....cc..", ".cccccccccc.", ".ccccggcccc.", ".cccccccccc.", "..ccyyyycc..", "..cccccccc..",
         "..cccccccc..", ".cccccccccc.", ".cCcCcCcCcc.", "............", "............"],
  gloves: ["............", "..l.l.l.....", "..l.l.l.l...", "..lllllll...", "..lllllll...", "..lllllll.l.", "..llllllll..",
           "..lllllll...", "..yyggyyy...", "..LLLLLLL...", "............", "............"],
  legs: ["............", "..llllllll..", "..yyyggyyy..", "..llllllll..", "..lll..lll..", "..lll..lll..", "..lll..lll..",
         "..lll..lll..", "..lll..lll..", "..LLL..LLL..", "............", "............"],
  boots: ["............", "...llll.....", "...llll.....", "...llll.....", "...gggg.....", "...llll.....", "...lllll....",
          "...llllllll.", "...lllllllll", "...LLLLLLLLL", "............", "............"],
  cloak: ["....kyyk....", "...cccccc...", "..cccccccc..", "..cccggccc..", ".cccccccccc.", ".ccCcccCccc.", ".cccccccccc.",
          "cccccccccccc", "ccCccccccCcc", "cccccccccccc", "............", "............"],
  amulet: ["..y......y..", "...y....y...", "....y..y....", ".....yy.....", "....gggg....", "...ghgggg...", "...gggggg...",
           "....gggg....", "............", "............", "............", "............"],
  ring: ["............", "............", ".....gg.....", "....ghgg....", "....yggy....", "...y....y...", "..y......y..",
         "..y......y..", "...y....y...", "....yyyy....", "............", "............"]
};

// Vykreslí ikonu. mono = prázdný slot (šedá silueta)
function drawIcon(ctx, id, x, y, scale, gem, mono) {
  const rows = ICONS[id] || ICONS.ring;
  for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) {
    const ch = rows[r][c];
    if (!ch || ch === '.') continue;
    ctx.fillStyle = mono ? 'rgba(160,150,190,0.22)' : (ch === 'g' ? (gem || '#9d9d9d') : ICON_PAL[ch]);
    ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
  }
}
