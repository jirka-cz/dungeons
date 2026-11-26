import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright

# Obchodník: placené obnovení zboží, vylepšení obchodníka, uložení zboží, nové zboží po dokončeném podzemí.
CHECK = r"""() => {
  const out = {}, ch = G.char, V = vendorState();
  ch.maxRift = 1; V.stock = null; V.rolls = 0; V.lvl = 0;
  out.run1 = Math.round(riftRunGold(1));
  out.reroll = []; G.save.gold = 1e6;
  for (let i = 0; i < 4; i++) { out.reroll.push(vendorRerollCost()); const uids = vendorStock().map(x => x.uid).join(); vendorReroll(); out.changed = uids !== vendorStock().map(x => x.uid).join(); }
  out.up = []; for (let i = 0; i < 3; i++) { out.up.push(vendorUpgradeCost()); vendorUpgrade(); }
  out.lvl = V.lvl;
  // teleport do města zboží nemění
  const before = vendorStock().map(x => x.uid).join();
  enterTown(); out.townKeeps = before === vendorStock().map(x => x.uid).join();
  // uložení a načtení
  writeSave(G.save); const s2 = loadSave(); const c2 = s2.chars[s2.current];
  out.saved = c2.vendor && c2.vendor.lvl === 3 && c2.vendor.rolls === 4 && c2.vendor.stock.map(x => x.uid).join() === before;
  // dokončené podzemí: nové zboží a obnovení od 10 %
  startRift(1); const b = { boss: 'x', x: G.hero.x, y: G.hero.y, xp: 0 }; bossDefeated(b);
  out.afterRift = { stockNull: V.stock === null, rolls: V.rolls, maxRift: ch.maxRift };
  enterTown();
  // nedostatek zlata
  G.save.gold = 0; out.poor = vendorReroll() === false && vendorUpgrade() === false;
  // strop úrovně
  V.lvl = VENDOR.upMax; G.save.gold = 1e12; out.maxBlocked = vendorUpgrade() === false;
  // šance na úrovni 0/10/20 v podzemí 20, pro informaci
  out.chances = [0, 10, 20].map(l => { const c = vendorChances(l, 20); return [l, +(c.purple*100).toFixed(1), +(c.orange*100).toFixed(1), +(c.diamond*100).toFixed(1)]; });
  // statistika zboží: 2000 nabídek na úrovni 20 v podzemí 20
  ch.maxRift = 20; V.lvl = 20; const cnt = { green: 0, purple: 0, orange: 0, diamond: 0 }; let n = 0;
  for (let i = 0; i < 2000; i++) { V.stock = null; vendorStock().forEach(it => { cnt[it.rarity]++; n++; }); }
  out.sample = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, +(v / n * 100).toFixed(2)]));
  out.diamondPrice = buyPrice(makeItem(riftIlvl(20), 'diamond', 1, null, ch.cls));
  out.costsAt = [1, 10, 20, 30, 50].map(L => { ch.maxRift = L; V.rolls = 0; V.lvl = 0; return [L, Math.round(riftRunGold(L)), vendorRerollCost(), vendorUpgradeCost()]; });
  V.lvl = 4; V.rolls = 2; V.stock = null; ch.maxRift = 18;
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate("(()=>{ G.headless=true; G.save.chars.push(newChar('Obchod','human','mage',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
        await pg.wait_for_timeout(200)
        r = await pg.evaluate(CHECK)
        for k, v in r.items(): print(k, v)
        await pg.evaluate("(()=>{ G.headless=false; G.save.gold=48000; showVendor(); })()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS + '/vendor_pc.png')
        # klik na tlačítko obnovení
        g0 = await pg.evaluate("G.save.gold")
        await pg.click('text=Obnovit zboží'); await pg.wait_for_timeout(200)
        print('click reroll gold', g0, '->', await pg.evaluate("G.save.gold"), 'rolls', await pg.evaluate("vendorState().rolls"))
        await pg.click('text=Vylepšit obchodníka'); await pg.wait_for_timeout(200)
        print('click upgrade lvl', await pg.evaluate("vendorState().lvl"))
        for name, vp in [('mob_land', {'width': 844, 'height': 390}), ('mob_port', {'width': 390, 'height': 844})]:
            m = await b.new_page(viewport=vp, has_touch=True, is_mobile=True)
            m.on('pageerror', lambda e: errs.append('MOB:' + str(e)))
            await m.goto(GAME); await m.wait_for_timeout(300)
            await m.evaluate("(()=>{ G.touch=true; G.save.chars.push(newChar('Mobil','orc','hunter',G.save)); G.save.current=G.save.chars.length-1; playChar(); G.char.maxRift=18; vendorState().lvl=4; G.save.gold=30000; showVendor(); })()")
            await m.wait_for_timeout(400)
            await m.screenshot(path=SHOTS + f'/vendor_{name}.png')
            await m.evaluate("document.querySelector('.vendor-odds') && document.querySelector('.vendor-odds').scrollIntoView()"); await m.wait_for_timeout(150)
            await m.screenshot(path=SHOTS + f'/vendor_{name}2.png')
        print('errors', errs[:6]); await b.close()

asyncio.run(main())
