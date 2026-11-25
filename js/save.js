// Ukládání: postavy, sdílená truhla a zlato, nastavení. localStorage + export/import kódem.

const SAVE_KEY = 'wd_save';
const SAVE_VERSION = 5;

function newSave() {
  return {
    v: SAVE_VERSION,
    chars: [], current: -1,
    gold: 0, stash: [], nextUid: 1,
    resCap14: true,
    settings: { autoSell: { gray: false, green: false, purple: false, orange: false, diamond: false }, dmgNumbers: true, sound: true, autoAttack: false, sellFix103: true },
    lastSeen: Date.now()
  };
}

function newChar(name, race, cls, save) {
  const ch = { id: Date.now() + Math.floor(Math.random() * 1000), name, race, cls, level: 1, xp: 0, talents: {}, equip: {}, inv: [], maxRift: 1,
               bar: [CLASSES[cls].base[0], CLASSES[cls].base[1], null, null, null, null], talentVer: 2, classItems12: true, resCap14: true, created: Date.now() };
  const w = starterWeapon(cls, save.nextUid++);
  ch.equip[w.slot === 'weapon' ? 'main' : 'off'] = w;
  return ch;
}

function migrateSave(s) {
  if (!s || (s.v || 1) < 5) {
    // verze 0.x měly úplně jiný systém (patra, perky) — začíná se nově, zlato zůstává
    const out = newSave();
    if (s && typeof s.gold === 'number') out.gold = Math.floor(s.gold);
    out._notice = 'World & Dungeons 1.0: nový způsob hry! Vytvoř si postavu. Zlato ze staré verze ti zůstalo.';
    return out;
  }
  const out = Object.assign(newSave(), s);
  out.settings = Object.assign(newSave().settings, s.settings || {});
  out.settings.autoSell = Object.assign(newSave().settings.autoSell, (s.settings || {}).autoSell || {});
  // v1.0.3: automatický prodej je nově ve výchozím stavu vypnutý (jednorázově vypnout i ve starších uloženích)
  if (!(s.settings || {}).sellFix103) { for (const r in out.settings.autoSell) out.settings.autoSell[r] = false; out.settings.sellFix103 = true; }
  out.chars.forEach(ch => {
    ch.bar = ch.bar || [null, null, null, null, null, null]; ch.talents = ch.talents || {}; ch.inv = ch.inv || []; ch.equip = ch.equip || {};
    // v1.4: odolnosti na předmětech max 10 % na živel (rebalanc), jednou pro všechny předměty postavy
    if (!ch.resCap14) {
      let n = 0;
      Object.values(ch.equip).concat(ch.inv).forEach(it => { if (it && capItemRes(it)) n++; });
      ch.resCap14 = true;
      if (n) out._resNotice = true;
    }
    // v1.2: legendárky a sety jsou jen pro určité třídy – nevhodné nasazené kusy se přesunou do batohu (nebo do truhly)
    if (!ch.classItems12) {
      const moved = [];
      Object.keys(ch.equip).forEach(sl => {
        const it = ch.equip[sl];
        if (!it || canClassUse(it, ch.cls)) return;
        delete ch.equip[sl];
        if (ch.inv.length < INV_MAX || out.stash.length >= STASH_MAX) ch.inv.push(it); else out.stash.push(it);
        moved.push(it.name);
      });
      ch.classItems12 = true;
      if (moved.length) out._notice = (out._notice ? out._notice + ' ' : '') + `Legendárky a sety jsou nově jen pro určité třídy. Postava ${ch.name} je už nemůže nosit, najdeš je v batohu nebo v truhle: ${moved.join(', ')}.`;
    }
    // v1.1: úplně nové talentové stromy – body se vrátí
    if (ch.talentVer !== 2) {
      const had = Object.keys(ch.talents).length > 0;
      ch.talents = {}; ch.talentVer = 2;
      ch.bar = ch.bar.map(id => id && CLASSES[ch.cls].base.includes(id) ? id : null);
      if (had) out._notice = 'Talentové stromy jsou úplně nové (strom třídy + 2 specializace). Všechny body ti byly vráceny – rozděl je znovu v Talentech (K).';
    }
  });
  if (!s.resCap14) { out.stash.forEach(it => { if (capItemRes(it)) out._resNotice = true; }); out.resCap14 = true; }
  if (out._resNotice) { out._notice = (out._notice ? out._notice + ' ' : '') + 'Odolnosti na předmětech byly vyváženy: nejvýš 10 % proti jednomu živlu na předmět.'; delete out._resNotice; }
  return out;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newSave();
    return migrateSave(JSON.parse(raw));
  } catch (e) {
    console.warn('Save se nepodařilo načíst', e);
    return newSave();
  }
}

function writeSave(s) {
  try { s.lastSeen = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; }
  catch (e) { console.warn('Uložení selhalo', e); return false; }
}

function exportSave(s) { return 'WD5:' + btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
function importSave(code) {
  code = (code || '').trim();
  if (!/^WD\d:/.test(code)) throw new Error('Neplatný kód');
  const s = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
  if (typeof s !== 'object' || s === null) throw new Error('Neplatný kód');
  return migrateSave(s);
}
