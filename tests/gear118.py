import pathlib, os, asyncio, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
# v1.18: těžká zbroj jen válečník a druid, mág a černokněžník drží jen Knihu kouzel (obouruční), hůlka vyřazena.
JS = r"""(() => { const r = {};
  const mk = (kind, type, rar, ilvl) => { const it = makeItem(ilvl || 30, rar || 'purple', G.save.nextUid++, kind, null); it.type = type; it.slot = kind;
    it.base = rollBase(baseDefsFor(kind, type), it.ilvl, RARITIES[it.rarity].mult); return it; };
  // stará postava mága: plátová zbroj, hůlka v pravé ruce, stará kniha (levá ruka, bez útoku)
  const ch = newChar('Old', 'human', 'mage', G.save); delete ch.gearRules118;
  ch.equip = { main: mk('weapon', 'wand'), chest: mk('chest', 'plate'), boots: mk('boots', 'boots'), gloves: mk('gloves', 'gloves'),
    off: { uid: G.save.nextUid++, rarity: 'green', ilvl: 30, slot: 'offhand', type: 'orb', base: { skillPct: 0.1 }, affixes: {}, name: 'Stará kniha' } };
  const ch2 = newChar('Old2', 'human', 'warlock', G.save); delete ch2.gearRules118;
  ch2.equip = { main: mk('weapon', 'staff', 'purple'), head: mk('head', 'helm') };
  const ch3 = newChar('Old3', 'human', 'warrior', G.save); delete ch3.gearRules118; ch3.equip = { chest: mk('chest', 'plate') };
  const raw = JSON.parse(JSON.stringify(G.save)); raw.chars = [ch, ch2, ch3]; delete raw.orbFix118;
  raw.stash = [{ uid: 9999, rarity: 'purple', ilvl: 40, slot: 'offhand', type: 'orb', base: { skillPct: 0.1 }, affixes: {}, name: 'Kniha v truhle' }];
  const s = migrateSave(raw); const m = s.chars[0], w = s.chars[1], wa = s.chars[2];
  r.mage = Object.fromEntries(Object.entries(m.equip).map(([k, v]) => [k, v.type + ':' + v.slot + ':' + (v.base.atk || 0)]));
  r.mageInv = m.inv.map(i => i.type);
  r.warlock = Object.fromEntries(Object.entries(w.equip).map(([k, v]) => [k, v.type + ':' + v.rarity]));
  r.warlockInv = w.inv.map(i => i.type);
  r.warrior = Object.keys(wa.equip); r.stash = s.stash.map(i => i.slot + ':' + (i.base.atk || 0));
  r.notice = s._notice || '';
  // nová pravidla nošení
  r.use = { magePlate: canClassUse(mk('chest', 'plate'), 'mage'), hunterMail: canClassUse(mk('chest', 'mail'), 'hunter'),
    druidPlate: canClassUse(mk('chest', 'plate'), 'druid'), warriorPlate: canClassUse(mk('chest', 'plate'), 'warrior'),
    mageRobe: canClassUse(mk('chest', 'robe'), 'mage'), mageStaff: canClassUse(mk('weapon', 'staff'), 'mage'),
    mageSword: canClassUse(mk('weapon', 'sword'), 'mage'), mageOrb: canClassUse(mk('weapon', 'orb'), 'mage') };
  // kořist: žádná hůlka, mág nedostane těžkou zbroj ani jinou zbraň než knihu
  let wand = 0, heavy = 0, nonBook = 0;
  for (let i = 0; i < 3000; i++) { const it = makeItem(30, 'purple', i, null, 'mage'); if (it.type === 'wand') wand++; if (armorWeight(it) === 'heavy') heavy++; if (it.slot === 'weapon' && it.type !== 'orb') nonBook++; }
  r.drops = { wand, heavy, nonBook };
  // nová postava mága začíná s knihou v pravé ruce
  const nc = newChar('N', 'elf', 'mage', G.save); r.starter = nc.equip.main.type + ':' + nc.equip.main.slot + ':' + itemHand(nc.equip.main);
  return r; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        r = await pg.evaluate(JS); print(json.dumps(r, ensure_ascii=False, indent=1))
        u = r['use']
        ok = (r['mage'].get('main', '').startswith('orb:weapon:') and 'off' not in r['mage'] and 'chest' not in r['mage'] and 'boots' not in r['mage']
              and 'gloves' in r['mage'] and set(['wand', 'plate', 'boots']) <= set(r['mageInv'])
              and r['warlock'].get('main', '').startswith('orb:purple') and 'head' not in r['warlock'] and set(['staff', 'helm']) <= set(r['warlockInv'])
              and r['warrior'] == ['chest'] and r['stash'][0].startswith('weapon:') and r['stash'][0] != 'weapon:0' and 'Nová pravidla' in r['notice']
              and not u['magePlate'] and not u['hunterMail'] and u['druidPlate'] and u['warriorPlate'] and u['mageRobe'] and not u['mageStaff'] and not u['mageSword'] and u['mageOrb']
              and r['drops'] == {'wand': 0, 'heavy': 0, 'nonBook': 0} and r['starter'] == 'orb:weapon:2')
        print('ok', ok, 'errors', errs[:5]); await b.close()
asyncio.run(main())
