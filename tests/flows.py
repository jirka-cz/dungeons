import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def drag(pg, a, b):
    ba = await pg.locator(a).first.bounding_box(); bb = await pg.locator(b).first.bounding_box()
    await pg.mouse.move(ba['x']+15, ba['y']+15); await pg.mouse.down()
    await pg.mouse.move(ba['x']+30, ba['y']+30, steps=3); await pg.mouse.move(bb['x']+15, bb['y']+15, steps=6); await pg.mouse.up()
    await pg.wait_for_timeout(150)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.save.chars.push(newChar('Flow','human','hunter',G.save)); G.save.current=0; playChar(0); G.char.level=6; G.char.maxRift=5; G.save.gold=99999; for(let i=0;i<4;i++) G.char.inv.push(makeItem(9,'green',G.save.nextUid++,null,'hunter')); })()")
        await pg.wait_for_timeout(300)
        # truhla: přetáhni z batohu do truhly, dvojklik zpět
        await pg.evaluate("showStash()"); await pg.wait_for_timeout(150)
        await drag(pg, '.bag:not(.stash) [data-src^="inv:"]', '.bag.stash .bag-empty')
        print('stash', await pg.evaluate("G.save.stash.length"), 'inv', await pg.evaluate("G.char.inv.length"))
        await pg.dblclick('.bag.stash [data-src^="stash:"]'); await pg.wait_for_timeout(150)
        print('after dbl stash', await pg.evaluate("G.save.stash.length"), 'inv', await pg.evaluate("G.char.inv.length"))
        # obchod: koupit dvojklikem, prodat přetažením
        await pg.evaluate("showVendor()"); await pg.wait_for_timeout(150)
        g0 = await pg.evaluate("G.save.gold"); n0 = await pg.evaluate("G.char.inv.length")
        await pg.dblclick('.bag.shop [data-src^="shop:"]'); await pg.wait_for_timeout(150)
        print('bought', await pg.evaluate("G.char.inv.length") - n0, 'gold -', g0 - await pg.evaluate("G.save.gold"))
        g1 = await pg.evaluate("G.save.gold")
        await drag(pg, '.bag:not(.shop) [data-src^="inv:"]', '.sell-zone')
        print('sold +', await pg.evaluate("G.save.gold") - g1)
        # talenty: naučit dovednost a přetáhnout na lištu
        await pg.evaluate("showTalents()"); await pg.wait_for_timeout(150)
        await pg.dblclick('.tn.t-skill.ok >> nth=0'); await pg.wait_for_timeout(150); await pg.click('.tconfirm button.primary'); await pg.wait_for_timeout(150)
        print('bar after learn', await pg.evaluate("JSON.stringify(G.char.bar)"))
        await drag(pg, '.skill-chip >> nth=0', '[data-bar="5"]')
        print('bar after drag', await pg.evaluate("JSON.stringify(G.char.bar)"))
        await pg.evaluate("hideModal()")
        # uložení a znovunačtení
        await pg.evaluate("persist()"); await pg.reload(); await pg.wait_for_timeout(400)
        print('reload chars', await pg.evaluate("G.save.chars.map(c=>c.name+':'+c.level).join(',')"), 'stash', await pg.evaluate("G.save.stash.length"))
        # mobil: dotykové tlačítko útoku
        m = await b.new_page(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True)
        m.on('pageerror', lambda e: errs.append('MOB:'+str(e)))
        await m.goto(GAME); await m.wait_for_timeout(300)
        await m.evaluate("(()=>{ G.save.chars.push(newChar('M','orc','warrior',G.save)); G.save.current=G.save.chars.length-1; playChar(); startRift(1); const h=G.hero; const t=nearestMonster(h.x,h.y,9999); const p=nearestFree(G.world,t.x-20,t.y,5); h.x=p.x;h.y=p.y; window._t=t; })()")
        await m.wait_for_timeout(300)
        await m.evaluate("G.touch=true; buildHud()")
        box = await m.locator('.tb.attack').bounding_box()
        await m.touchscreen.tap(box['x']+40, box['y']+40)
        await m.evaluate("G.input.atk=true"); await m.wait_for_timeout(2000); await m.evaluate("G.input.atk=false")
        print('touch attack target hp/dead', await m.evaluate("_t.dead ? 'dead' : _t.hp+'/'+_t.maxHp"))
        await m.screenshot(path=SHOTS + '/p_mobile2.png')
        print('errors', errs[:6]); await b.close()
asyncio.run(main())
