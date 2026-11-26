import pathlib, os, json, asyncio
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)

# v1.12: vektorové ikony předmětů, znaky očarování a setů, mýtický tier (padání, efekty 3/6 dílů), trpasličí úchop.
CHECKS = r"""(()=>{
  const out = { errors: [] }, E = m => out.errors.push(m);
  // ikony pro všechny typy předmětů a znaky setů/očarování
  Object.keys(ITEM_TYPES).forEach(t => { if (!ITEM_GI[t]) E('chybí ikona typu ' + t); });
  Object.values(SETS).forEach(s => { if (!ITEM_GI[s.glyph] || !s.color) E('set bez znaku/barvy ' + s.name); });
  Object.keys(ENCHANTS).forEach(e => { if (!ITEM_GI['ench_' + e]) E('chybí znak očarování ' + e); });
  // mýtické sety: jeden pro každou třídu, zbraně použitelné třídou
  Object.keys(CLASSES).forEach(c => {
    const ms = Object.values(SETS).filter(s => s.mythic && s.cls.includes(c));
    if (ms.length !== 1) E('mýtický set pro ' + c + ': ' + ms.length);
    ms.forEach(s => Object.entries(s.pieces).forEach(([k, [n, t]]) => {
      if (!ITEM_KINDS[k].types.includes(t)) E('typ ' + t + ' nepatří do ' + k);
      if ((k === 'weapon' || k === 'offhand') && !CLASSES[c].weapons.includes(t)) E(c + ' nemůže držet ' + t);
    }));
  });
  // diamantové nikdy mýtické, mýtické vždy mýtický set
  for (let i = 0; i < 300; i++) { const d = makeItem(160, 'diamond', 1, null, 'mage'); if (SETS[d.set].mythic) E('diamant z mýtického setu');
    const m = makeItem(160, 'mythic', 1, null, 'mage'); if (!SETS[m.set] || !SETS[m.set].mythic) E('mýtický bez mýtického setu'); }
  out.mythicSample = makeItem(160, 'mythic', 1, null, 'warrior');
  // padání: boss v podzemí 150 s náhodou pod 1 % pustí mýtický, v 149 nikdy, běžný nepřítel nikdy
  const ch = newChar('V', 'human', 'warrior', G.save); G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
  const drop = (L, boss, rnd) => { startRift(L); G.st = heroStats(); G.loot = []; const old = Math.random; Math.random = () => rnd;
    const m = G.monsters.find(x => !x.boss) || G.monsters[0]; m.boss = boss ? 'x' : null; m.hp = 0;
    try { killMonster(m); } finally { Math.random = old; } return G.loot.filter(l => l.kind === 'item').map(l => l.item.rarity); };
  out.drop150boss = drop(150, true, 0.005); out.drop149boss = drop(149, true, 0.005); out.drop150boss_hi = drop(150, true, 0.5); out.drop150mob = drop(150, false, 0.005);
  if (!out.drop150boss.includes('mythic')) E('boss 150 nepustil mýtický');
  if (out.drop149boss.includes('mythic') || out.drop150boss_hi.includes('mythic') || out.drop150mob.includes('mythic')) E('mýtický padl tam, kde nemá');
  // očarování
  const it = makeItem(40, 'purple', 1, 'weapon', 'warrior'); it.affixes = { firePct: 0.08, str: 5 };
  out.ench = itemEnchant(it); if (out.ench !== 'fire') E('očarování ohně nepoznáno');
  it.affixes = { goldPct: 0.2 }; if (itemEnchant(it) !== 'gold') E('očarování zlata nepoznáno');
  it.rarity = 'gray'; if (itemEnchant(it)) E('šedý předmět má očarování');
  return out;
})()"""

GRIP = r"""(()=>{ const r = {};
  for (const [race, cls] of [['dwarf', 'warrior'], ['human', 'warrior'], ['dwarf', 'hunter']]) {
    const ch = newChar('G', race, cls, G.save); G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
    const w = makeItem(30, 'gray', G.save.nextUid++, 'weapon', cls); w.type = cls === 'hunter' ? 'bow' : 'greatsword'; w.affixes = {};
    r[race + '_' + cls] = slotsFor(w);
    if (race === 'dwarf' && cls === 'warrior') {
      ch.equip.main = w; invalidate(); const a1 = heroStats().atk;
      const w2 = JSON.parse(JSON.stringify(w)); w2.uid = G.save.nextUid++; ch.equip.off = w2; onGearChange(); const a2 = heroStats().atk;
      r.offKept = !!ch.equip.off; r.offShare = +(((a2 - a1) / (w.base.atk * (1 + heroStats().mods.atkPct))) ).toFixed(2);
    }
    if (race === 'human') { ch.equip.main = w; const w2 = JSON.parse(JSON.stringify(w)); ch.equip.off = w2; onGearChange(); r.humanOffKept = !!ch.equip.off; }
  } return r; })()"""

SETUP = r"""((n, cls, race) => { const ch = newChar('Plamen', race, cls, G.save); ch.level = 170; ch.maxRift = 160; G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
  const S = Object.keys(SETS).find(id => SETS[id].mythic && SETS[id].cls.includes(cls));
  const kinds = Object.keys(SETS[S].pieces);
  kinds.slice(0, n).forEach(k => { const it = makeItem(160, 'mythic', G.save.nextUid++, null, cls); it.set = S; it.slot = k; [it.name, it.type] = SETS[S].pieces[k];
    const sl = k === 'weapon' ? 'main' : k === 'offhand' ? 'off' : k === 'ring' ? 'ring1' : k; ch.equip[sl] = it; });
  ['purple', 'orange', 'diamond', 'green', 'gray', 'mythic'].forEach((r, i) => { const it = makeItem(160, r, G.save.nextUid++, null, cls); if (i === 0) it.affixes.frostPct = 0.2; if (i === 3) it.affixes.goldPct = 0.3; ch.inv.push(it); });
  for (let i = 0; i < 6; i++) ch.inv.push(makeItem(60, ['green', 'purple', 'orange'][i % 3], G.save.nextUid++, null, cls));
  invalidate(); G.st = heroStats(); UI.sel = 'inv:' + ch.inv[0].uid; showCharacter(); return mythicPieces(ch); })"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        res = await pg.evaluate(CHECKS)
        print('drops', res['drop150boss'], res['drop149boss'], res['drop150boss_hi'], res['drop150mob'])
        print('mythic sample', res['mythicSample']['name'], json.dumps(res['mythicSample']['base']), json.dumps(res['mythicSample']['affixes']))
        print('data errors', res['errors'])
        g = await pg.evaluate(GRIP)
        print('grip', json.dumps(g), 'ok', g['dwarf_warrior'] == ['main', 'off'] and g['human_warrior'] == ['main'] and g['dwarf_hunter'] == ['main'] and g['offKept'] and not g['humanOffKept'])
        for n in (3, 6):
            lv = await pg.evaluate(SETUP + f"({n}, 'warrior', 'dwarf')"); await pg.wait_for_timeout(900)
            fx = await pg.evaluate("document.querySelector('.doll-hero').dataset.fx")
            print('mythic pieces', n, '->', lv, 'doll fx', fx)
            await pg.screenshot(path=f'{SHOTS}/vis_char_{n}.png')
        await pg.locator('.doll').screenshot(path=f'{SHOTS}/vis_doll6.png')
        # popisek mýtického a očarovaného předmětu
        await pg.evaluate("UI.sel='eq:main'; showCharacter()"); await pg.wait_for_timeout(200)
        el = pg.locator('.item').first; await el.scroll_into_view_if_needed(); await el.screenshot(path=f'{SHOTS}/vis_tip_mythic.png')
        await pg.evaluate("UI.sel='inv:'+G.char.inv[0].uid; showCharacter()"); await pg.wait_for_timeout(200)
        el = pg.locator('.item').first; await el.scroll_into_view_if_needed(); await el.screenshot(path=f'{SHOTS}/vis_tip_ench.png')
        # v podzemí: hořící postava
        await pg.evaluate("hideModal(); startRift(20); G.st = heroStats();"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{SHOTS}/vis_world6.png')
        for name, vp in [('portrait', {'width': 390, 'height': 844}), ('landscape', {'width': 844, 'height': 390})]:
            mp = await b.new_page(viewport=vp, has_touch=True, is_mobile=True); mp.on('pageerror', lambda e: errs.append('MOB:' + str(e)))
            await mp.goto(GAME); await mp.wait_for_timeout(300); await mp.evaluate("G.touch=true")
            await mp.evaluate(SETUP + "(6, 'mage', 'human')"); await mp.wait_for_timeout(800)
            await mp.screenshot(path=f'{SHOTS}/vis_mob_{name}.png'); await mp.close()
        print('errors', errs[:6])
        await b.close()
asyncio.run(main())
