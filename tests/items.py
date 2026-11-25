import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright

# Předměty v1.2: atributy, váha zbroje, legendárky a sety jen pro třídy, chytrá kořist, migrace.
CHECKS = r"""(()=>{
  const out = { errors: [] }, E = m => out.errors.push(m);
  const clsIds = Object.keys(CLASSES);
  // 1) data legendárek a setů
  LEGENDARIES.forEach(l => {
    if (!l.cls || !l.cls.length) E('leg bez cls: ' + l.id);
    l.cls.forEach(c => { if (!CLASSES[c]) E('leg neznámá třída: ' + l.id + ' ' + c);
      if ((l.slot === 'weapon' || l.slot === 'offhand') && !CLASSES[c].weapons.includes(l.type)) E('třída nemůže držet typ: ' + l.id + ' ' + c); });
    Object.keys(l.stats).forEach(k => { if (!STAT_LABELS[k]) E('neznámý stat ' + k + ' v ' + l.id); });
    if (!ITEM_KINDS[l.slot].types.includes(l.type)) E('typ nepatří do slotu: ' + l.id);
  });
  Object.entries(SETS).forEach(([id, s]) => {
    if (!s.cls || !s.cls.length) E('set bez cls: ' + id);
    Object.entries(s.pieces).forEach(([kind, [n, t]]) => {
      if (!ITEM_KINDS[kind].types.includes(t)) E('set typ nepatří do slotu: ' + id + ' ' + kind);
      if (kind === 'weapon' || kind === 'offhand') s.cls.forEach(c => { if (!CLASSES[c].weapons.includes(t)) E('set zbraň pro třídu: ' + id + ' ' + c); });
    });
    Object.values(s.bonus).forEach(b => Object.keys(b).forEach(k => { if (!STAT_LABELS[k]) E('neznámý stat ' + k + ' v setu ' + id); }));
  });
  Object.keys(AFFIXES).forEach(k => { if (!AFFIXES[k].family && !STAT_LABELS[k]) E('afix bez popisku: ' + k); });
  // rodiny afixů a popisky všech náhodně vygenerovaných statů
  const seen = new Set(), fallbacks = new Set();
  clsIds.forEach(c => { for (let i = 0; i < 600; i++) { const it = makeItem(40, i % 2 ? 'purple' : 'orange', 1, null, i % 5 ? c : null);
    Object.keys(it.affixes).forEach(k => { seen.add(k.includes('_') ? k.split('_')[0] === 'skd' ? 'skd_*' : '*_atkPct' : k);
      if (statLine(k, it.affixes[k]).startsWith(k)) fallbacks.add(k); if (!affixSuffix(k)) fallbacks.add('suf:' + k);
      if (AFFIXES[k] && AFFIXES[k].slots && !AFFIXES[k].slots.includes(it.slot)) E('afix na špatném slotu ' + k + ' ' + it.slot); });
    Object.keys(it.affixes).filter(k => k.endsWith('_atkPct')).forEach(k => { if (!CLASSES[c].weapons.includes(k.split('_')[0]) && i % 5) out.wrongWeapon = (out.wrongWeapon || 0) + 1; });
  } });
  out.affixKinds = seen.size; out.fallbacks = [...fallbacks];
  if (fallbacks.size) E('staty bez popisku: ' + [...fallbacks].join(','));
  const missing = Object.keys(AFFIXES).filter(k => !AFFIXES[k].family && !seen.has(k));
  if (missing.length) E('afixy, které nepadly: ' + missing.join(','));
  out.perClass = {};
  clsIds.forEach(c => {
    const legs = LEGENDARIES.filter(l => l.cls.includes(c)).length, sets = Object.values(SETS).filter(s => s.cls.includes(c)).length;
    out.perClass[c] = { legs, sets, main: CLASSES[c].main };
    if (legs < 3) E('málo legendárek pro ' + c); if (sets < 1) E('žádný set pro ' + c);
  });
  // 2) chytrá kořist
  out.smart = {};
  clsIds.forEach(c => {
    let leg = 0, set = 0, legMain = 0, armorPref = 0, armorN = 0, mainAff = 0, affN = 0;
    for (let i = 0; i < 1500; i++) {
      const a = makeItem(40, 'orange', 1, null, c); if (canClassUse(a, c)) leg++;
      if (CLASSES[c].main.some(k => a.base[k])) legMain++;
      const d = makeItem(40, 'diamond', 1, null, c); if (canClassUse(d, c)) set++;
      const g = makeItem(40, 'purple', 1, 'chest', c);
      if (armorWeight(g)) { armorN++; if (armorWeight(g) === CLASSES[c].armor) armorPref++; }
      affN++; if (CLASSES[c].main.some(k => g.affixes[k])) mainAff++;
    }
    out.smart[c] = { legUsable: +(leg / 1500).toFixed(2), setUsable: +(set / 1500).toFixed(2), legMainShare: +(legMain / 1500).toFixed(2),
                     armorPref: CLASSES[c].armor ? +(armorPref / armorN).toFixed(2) : null, mainAffix: +(mainAff / affN).toFixed(2) };
    if (leg / 1500 < 0.8) E('málo použitelných legendárek pro ' + c);
  });
  // náhodné (nechytré) legendárky musí jít padnout pro všechny
  let anyCls = new Set(); for (let i = 0; i < 400; i++) { const a = makeItem(20, 'orange', 1, null, null); itemClasses(a).forEach(c => anyCls.add(c)); }
  if (anyCls.size !== clsIds.length) E('náhodné legendárky nepokrývají všechny třídy');
  // 3) váha zbroje
  const heavy = makeItem(40, 'gray', 1, 'chest'); heavy.type = 'plate'; heavy.base = rollBase(baseDefsFor('chest', 'plate'), 40, 1);
  const light = { base: rollBase(baseDefsFor('chest', 'robe'), 40, 1) };
  out.armor = { plate: heavy.base, robe: light.base };
  if (!(heavy.base.def > light.base.def * 2)) E('těžká zbroj nemá výrazně víc obrany');
  if (!light.base.resAll || heavy.base.resAll) E('lehká zbroj nemá odolnosti');
  return out;
})()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        res = await pg.evaluate(CHECKS)
        print('per class', json.dumps(res['perClass'], ensure_ascii=False))
        print('smart', json.dumps(res['smart']))
        print('armor', json.dumps(res['armor']))
        print('affix kinds rolled', res['affixKinds'], 'wrong weapon bonus (smart)', res.get('wrongWeapon', 0))
        print('data errors', res['errors'])

        # 4) účinek atributů: válečník vs mág se stejným prstenem +20 síly / +20 intelektu
        eff = await pg.evaluate("""(()=>{
          const r = {};
          for (const [cls, race] of [['warrior','human'], ['mage','human']]) {
            const ch = newChar('T', race, cls, G.save); ch.level = 20; G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
            invalidate(); const a = heroStats();
            const ring = makeItem(20, 'green', G.save.nextUid++, 'ring', null); ring.base = {}; ring.affixes = { str: 20, int: 20, agi: 20, sta: 20 };
            ch.equip.ring1 = ring; invalidate(); const b = heroStats();
            r[cls] = { atkGain: +(b.atk / a.atk - 1).toFixed(3), defGain: +(b.def - a.def).toFixed(1), critGain: +(b.crit - a.crit).toFixed(3),
                       resGain: +(b.res.fire - a.res.fire).toFixed(3), hpGain: +(b.maxHp / a.maxHp - 1).toFixed(3), attrs: b.attrs };
          }
          return r; })()""")
        print('attr effects', json.dumps(eff))
        w, m = eff['warrior'], eff['mage']
        ok = w['defGain'] == 10 and abs(w['critGain'] - 0.02) < 1e-6 and abs(w['resGain'] - 0.06) < 1e-6 and abs(w['hpGain'] - 0.2) < 0.01
        print('attr effects ok', ok and w['atkGain'] > 0.15 and m['atkGain'] > 0.15)
        sel = await pg.evaluate("""(()=>{ const r = {};
          for (const cls of ['warrior', 'mage', 'hunter', 'druid']) {
            const ch = newChar('S', cls === 'druid' ? 'elf' : 'human', cls, G.save); G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
            invalidate(); const a = heroStats().atk; r[cls] = {};
            for (const k of ['str', 'agi', 'int']) { ch.equip.ring1 = { uid: -1, slot: 'ring', type: 'ring', rarity: 'green', ilvl: 1, base: {}, affixes: { [k]: 10 }, dur: 10, maxDur: 10 };
              invalidate(); r[cls][k] = +(heroStats().atk / a - 1).toFixed(2); }
          } return r; })()""")
        print('main stat atk gain per class (10 bodů)', json.dumps(sel))
        # 4b) Duch, sesílání, elity, cena, zbraň, druhy nepřátel, obrana
        fx = await pg.evaluate("""(()=>{ const r = {};
          const mk = (cls, race) => { const ch = newChar('X', race, cls, G.save); G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar(); return ch; };
          const ring = (aff) => ({ uid: -1, slot: 'ring', type: 'ring', rarity: 'green', ilvl: 1, base: {}, affixes: aff, dur: 10, maxDur: 10 });
          let ch = mk('mage', 'human'); invalidate(); let a = heroStats();
          ch.equip.ring1 = ring({ spi: 20, castPct: 0.2, wpnSpd: 0.5, costRed: 0.2, eliteDmg: 0.3, vsUndead: 0.5, eliteRed: 0.2, rangedRed: 0.2, areaRed: 0.2, ccRed: 0.3, resMax: 15 });
          invalidate(); let b = heroStats(); G.st = b;
          r.mage = { regen: +(b.resRegen / a.resRegen).toFixed(2), resMax: b.resMax - a.resMax, cast: b.castMul, wpnSpd: b.wpnSpdMul,
            cost: +(skillCost('fireball') / (SKILLS.fireball.cost || 1)).toFixed(2), elite: b.eliteDmg, undead: b.vs.undead, taken: [b.eliteTaken, b.rangedTaken, b.areaTaken, b.ccRed] };
          // rychlost sesílání: cooldown základního kouzla
          startRift(1); G.st = heroStats(); G.hero.atkCd = 0; G.hero.castLock = 0; castSkill('missile', G.hero.x + 60, G.hero.y);
          r.atkCdMage = +G.hero.atkCd.toFixed(3); r.atkCdMageExpected = +(1 / (G.st.spd * 1.2)).toFixed(3); G.st.mods && 0;
          // poškození elitě a nemrtvému vs. normálnímu
          const dmgTo = (mods) => { const m = { dead: false, hp: 1e9, maxHp: 1e9, res: {}, dots: {}, x: 0, y: 0, r: 5, def: { fam: mods.fam }, elite: mods.elite }; const old = Math.random; Math.random = () => 0.5; const d = dealDamage(m, 1000, 'arcane', { noProc: true }); Math.random = old; return d; };
          r.dmg = { plain: dmgTo({}), undead: dmgTo({ fam: 'undead' }), elite: dmgTo({ elite: ['fast'] }), beast: dmgTo({ fam: 'beast' }) };
          ch = mk('warrior', 'human'); invalidate(); a = heroStats();
          ch.equip.ring1 = ring({ spi: 20, axe_atkPct: 0.5 }); invalidate(); b = heroStats();
          r.warrior = { gen: +(b.genMul - a.genMul).toFixed(2), atkNoAxe: +(b.atk / a.atk).toFixed(2) };
          ch.equip.main = makeItem(1, 'gray', 999, 'weapon', 'warrior'); ch.equip.main.type = 'axe'; ch.equip.main.affixes = {}; ch.equip.main.base = { atk: 3 };
          invalidate(); const c1 = heroStats(); delete ch.equip.ring1; invalidate(); const c0 = heroStats();
          r.warrior.atkWithAxe = +(c1.atk / c0.atk).toFixed(2);
          return r; })()""")
        print('new stat effects', json.dumps(fx))
        okfx = (fx['atkCdMage'] == fx['atkCdMageExpected'] and fx['mage']['regen'] == 1.3 and fx['mage']['resMax'] == 15 and fx['mage']['cast'] == 1.2 and fx['mage']['cost'] == 0.8
                and fx['dmg']['undead'] > fx['dmg']['plain'] * 1.45 and fx['dmg']['elite'] > fx['dmg']['plain'] * 1.25 and fx['dmg']['beast'] == fx['dmg']['plain']
                and fx['warrior']['gen'] == 0.2 and fx['warrior']['atkNoAxe'] == 1.0 and fx['warrior']['atkWithAxe'] == 1.5)
        print('new stat effects ok', okfx)

        # 5) migrace: mág s Titánovou helmou a Sekerou Krvavého měsíce
        await pg.evaluate("""(()=>{ const s = newSave(); const ch = newChar('Starý', 'human', 'mage', s); delete ch.classItems12;
          const t = makeItem(20, 'diamond', s.nextUid++, null, 'warrior'); t.set = 'titan'; t.slot = 'head'; t.type = 'helm'; t.name = 'Titánova helma';
          ch.equip.head = t; s.chars.push(ch); writeSave(s); })()""")
        await pg.reload(); await pg.wait_for_timeout(400)
        mig = await pg.evaluate("(()=>{ const ch = G.save.chars[0]; return { head: !!ch.equip.head, inv: ch.inv.map(i => i.name), flag: ch.classItems12 }; })()")
        print('migration', json.dumps(mig, ensure_ascii=False), 'ok', (not mig['head']) and 'Titánova helma' in mig['inv'] and mig['flag'])

        # 6) snímky: okno postavy s vybranou legendárkou (počítač, mobil na výšku i na šířku)
        setup = """(()=>{ const ch = newChar('Jirka', 'dwarf', 'warrior', G.save); ch.level = 30; ch.maxRift = 20; G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
          ['head','chest','gloves','legs','boots','ring1','neck'].forEach(sl => { const it = makeItem(30, sl === 'chest' ? 'orange' : 'purple', G.save.nextUid++, sl === 'ring1' ? 'ring' : sl, 'warrior'); ch.equip[sl] = it; });
          const leg = makeItem(30, 'orange', G.save.nextUid++, null, 'warrior'); ch.inv.push(leg);
          const foreign = makeItem(30, 'diamond', G.save.nextUid++, null, null); foreign.set = 'archmage'; foreign.slot = 'chest'; foreign.type = 'robe'; foreign.name = 'Róba Arcimága'; ch.inv.push(foreign);
          for (let i = 0; i < 6; i++) ch.inv.push(makeItem(30, ['green','purple'][i % 2], G.save.nextUid++, null, 'warrior'));
          invalidate(); G.st = heroStats(); UI.sel = 'inv:' + leg.uid; showCharacter(); return foreign.uid; })()"""
        fuid = await pg.evaluate(setup); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS + '/items_char.png')
        await pg.evaluate(f"UI.sel='inv:{fuid}'; showCharacter()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS + '/items_foreign.png')
        print('foreign tooltip', await pg.evaluate("(document.querySelector('.cls-only')||{}).textContent"))
        for name, vp in [('mob_portrait', {'width': 390, 'height': 844}), ('mob_landscape', {'width': 844, 'height': 390})]:
            mp = await b.new_page(viewport=vp, has_touch=True, is_mobile=True)
            mp.on('pageerror', lambda e: errs.append('MOB:' + str(e)))
            await mp.goto(GAME); await mp.wait_for_timeout(300)
            await mp.evaluate("G.touch=true"); await mp.evaluate(setup); await mp.wait_for_timeout(300)
            await mp.screenshot(path=SHOTS + f'/items_{name}.png')
            await mp.close()
        print('errors', errs[:6])
        await b.close()
asyncio.run(main())
