// Ukládání: postavy, sdílená truhla a zlato, nastavení. localStorage + export/import kódem.

const SAVE_KEY = 'wd_save';
const SAVE_VERSION = 5;

function newSave() {
  return {
    v: SAVE_VERSION,
    chars: [], current: -1,
    gold: 0, stash: [], nextUid: 1,
    resCap14: true, orbFix118: true, uniqFix1181: true, uniqFix119: true,
    settings: { autoSell: { gray: false, green: false, purple: false, orange: false, diamond: false }, dmgNumbers: true, sound: true, autoAttack: false, sellFix103: true },
    lastSeen: Date.now()
  };
}

function newChar(name, race, cls, save) {
  const ch = { id: Date.now() + Math.floor(Math.random() * 1000), name, race, cls, level: 1, xp: 0, talents: {}, equip: {}, inv: [], maxRift: 1,
               bar: [CLASSES[cls].base[0], CLASSES[cls].base[1], null, null, null, null, null, null], talentVer: 3, classItems12: true, resCap14: true, gearRules118: true, gearRules1181: true, gearRules119: true, created: Date.now(),
               vendor: { lvl: 0, rolls: 0, stock: null } };
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
    ch.bar = ch.bar || [];
    while (ch.bar.length < 8) ch.bar.push(null);   // v1.15: lišta má 8 pozic (LMB, RMB, 1–6)
    ch.talents = ch.talents || {}; ch.inv = ch.inv || []; ch.equip = ch.equip || {};
    // v1.9: obchodník u postavy (úroveň, placená obnovení, uložené zboží)
    ch.vendor = ch.vendor || { lvl: 0, rolls: 0, stock: null };
    // v1.4: odolnosti na předmětech max 10 % na živel (rebalanc), jednou pro všechny předměty postavy
    if (!ch.resCap14) {
      let n = 0;
      Object.values(ch.equip).concat(ch.inv).forEach(it => { if (it && capItemRes(it)) n++; });
      ch.resCap14 = true;
      if (n) out._resNotice = true;
    }
    // v1.18: těžká zbroj jen válečník a druid, kouzelníci jen Knihu kouzel – nevhodné nasazené kusy do batohu,
    // mág/černokněžník, který přišel o zbraň, dostane Knihu kouzel stejné úrovně a rarity (legendární/set → epická)
    if (!ch.gearRules118 || !ch.gearRules1181 || !ch.gearRules119) {   // 1.18.1 druid jen kroužky, 1.19 materiály zbroje (stejná kontrola znovu)
      const moved = []; let lostWeapon = null;
      Object.values(ch.equip).concat(ch.inv, (ch.vendor && ch.vendor.stock) || []).forEach(it => { syncUniqueType(it); convertOldBook(it); });
      // kniha nasazená v levé ruce: do pravé, když je volná nebo v ní zůstat nesmí (hůlka, hůl, meč)
      if (ch.equip.off && ch.equip.off.type === 'orb') {
        const main = ch.equip.main;
        if (!main || !canClassUse(main, ch.cls)) { if (main) { lostWeapon = main; ch.inv.push(main); moved.push(main.name); } ch.equip.main = ch.equip.off; delete ch.equip.off; }
      }
      Object.keys(ch.equip).forEach(sl => {
        if (sl === 'off' && ch.equip.off && ch.equip.main && !handsOk(ch.equip.main, ch.equip.off, false)) { const it = ch.equip.off; delete ch.equip.off; ch.inv.push(it); moved.push(it.name); return; }
        const it = ch.equip[sl];
        if (!it || canClassUse(it, ch.cls)) return;
        delete ch.equip[sl];
        if (sl === 'main') lostWeapon = it;
        if (ch.inv.length < INV_MAX || out.stash.length >= STASH_MAX) ch.inv.push(it); else out.stash.push(it);
        moved.push(it.name);
      });
      let given = null;
      if (lostWeapon && CLASSES[ch.cls].weapons.length === 1 && !ch.equip.main) {
        const rar = ['gray', 'green', 'purple'].includes(lostWeapon.rarity) ? lostWeapon.rarity : 'purple';
        given = ch.equip.main = makeItem(lostWeapon.ilvl, rar, out.nextUid++, 'weapon', ch.cls);
      }
      ch.gearRules118 = ch.gearRules1181 = ch.gearRules119 = true;
      if (moved.length) {
        if (!out._gear118) { out._gear118 = true; out._notice = (out._notice ? out._notice + ' ' : '') + 'Nová pravidla výbavy: zbroj je látková, kožená, kroužková a plátová. Mág a černokněžník nosí jen látku, lovec kůži, druid kroužky, válečník plát (každý i lehčí materiály). Mág a černokněžník drží jen Knihu kouzel.'; }
        out._notice += ` ${ch.name}: do batohu přesunuto ${moved.join(', ')}.` + (given ? ` Náhradou dostává ${given.name}.` : '');
      }
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
    // v1.13: rebalanc tříd a ras, nový rasový strom – body se znovu vrátí (talentVer 3)
    if (ch.talentVer !== 3) {
      const had = Object.keys(ch.talents).length > 0;
      ch.talents = {}; ch.talentVer = 3;
      ch.bar = ch.bar.map(id => id && CLASSES[ch.cls].base.includes(id) ? id : null);
      if (had) out._notice = 'Velký rebalanc tříd, ras a talentů: každá rasa má nový strom s vlastní dovedností a třídy mají své rysy. Všechny talentové body ti byly vráceny – rozděl je znovu v Talentech (K).';
    }
  });
  delete out._gear118;
  if (!s.orbFix118 || !s.uniqFix1181 || !s.uniqFix119) { out.stash.forEach(it => { syncUniqueType(it); convertOldBook(it); }); out.orbFix118 = out.uniqFix1181 = out.uniqFix119 = true; }
  if (!s.resCap14) { out.stash.forEach(it => { if (capItemRes(it)) out._resNotice = true; }); out.resCap14 = true; }
  if (out._resNotice) { out._notice = (out._notice ? out._notice + ' ' : '') + 'Odolnosti na předmětech byly vyváženy: nejvýš 10 % proti jednomu živlu na předmět.'; delete out._resNotice; }
  return out;
}

// v1.18: Kniha kouzel je obouruční zbraň – staré knihy (levá ruka, bez útoku) dostanou útok podle úrovně a rarity
// v1.18.1: legendárka/set, jejíž typ se změnil (hůl → kniha, plát → kroužková…), dostane nový typ a základ (hlavní atribut zůstává)
function syncUniqueType(it) {
  if (!it || (!it.leg && !it.set)) return;
  let type = null;
  if (it.leg) { const d = LEGENDARIES.find(l => l.id === it.leg); if (d) type = d.type; }
  else if (SETS[it.set]) { const p = SETS[it.set].pieces[it.slot] || (it.type === 'orb' && SETS[it.set].pieces.weapon); if (p) type = p[1]; }
  if (!type || type === it.type) return;
  const kind = ITEM_KINDS.weapon.types.includes(type) ? 'weapon' : it.slot === 'offhand' ? 'weapon' : it.slot;
  const keep = {}; Object.keys(ATTRS).forEach(k => { if (it.base && it.base[k]) keep[k] = it.base[k]; });
  it.type = type; it.slot = kind;
  it.base = Object.assign(rollBase(baseDefsFor(kind, type), it.ilvl || 1, (RARITIES[it.rarity] || RARITIES.gray).mult), keep);
}
function convertOldBook(it) {
  if (!it || it.type !== 'orb' || it.slot !== 'offhand') return;
  it.slot = 'weapon';
  it.base = Object.assign(rollBase([['atk', WEAPON_ATK[2], 0, true]], it.ilvl || 1, (RARITIES[it.rarity] || RARITIES.gray).mult), it.base);
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
// Kód se cestou (e-mail, chat) často poškodí: ztratí úvodní „WD5:“, rozdělí se na řádky, „+“ se změní na mezeru,
// přibudou neviditelné znaky. Načítání proto tyhle drobnosti opraví. Chyba má e.why = 'empty' / 'broken' a e.len.
function importSave(code) {
  let c = String(code || '').trim().replace(/[\r\n\t\u200B-\u200D\u2060\uFEFF"'<>]/g, '');
  const m = c.match(/WD\d:/i);
  if (m) c = c.slice(m.index + m[0].length);
  c = c.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const bad = e => { const err = new Error('Neplatný kód'); err.why = e; err.len = c.length; return err; };
  if (c.length < 20) throw bad('empty');
  if (/[^A-Za-z0-9+/]/.test(c)) throw bad('broken');
  while (c.length % 4) c += '=';
  let s;
  try { s = JSON.parse(decodeURIComponent(escape(atob(c)))); } catch (e) { throw bad('broken'); }
  if (typeof s !== 'object' || s === null || !Array.isArray(s.chars)) throw bad('broken');
  try { return migrateSave(s); }
  catch (e) { const err = bad('migrate'); err.detail = String(e && e.message || e); console.error('Převod uložení selhal', e); throw err; }
}
