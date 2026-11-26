import pathlib, os, asyncio
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
# v1.14: portál po bossovi se ptá (Do města / Zůstat), nepošle hráče do města hned při dotyku.
async def run(pg, mobile=False):
    await pg.evaluate("""(()=>{ const ch=newChar('P','human','mage',G.save); G.save.chars.push(ch); G.save.current=G.save.chars.length-1; playChar();
      startRift(3); G.st=heroStats(); G.portal={ x: G.hero.x + 60, y: G.hero.y }; })()""")
    tick = "for(let i=0;i<5;i++) update(1/60)"
    r = {}
    await pg.evaluate("G.hero.x=G.portal.x; G.hero.y=G.portal.y;" + tick)
    r['askShown'] = await pg.evaluate("!$('portal-ask').hidden"); r['stillRift1'] = await pg.evaluate("G.scene")
    await pg.screenshot(path=f"{SHOTS}/portal_{'mob' if mobile else 'pc'}.png")
    await pg.click('#pa-no'); await pg.evaluate(tick)
    r['afterStayHidden'] = await pg.evaluate("$('portal-ask').hidden"); r['stillRift2'] = await pg.evaluate("G.scene")
    await pg.evaluate("G.hero.x=G.portal.x+40;" + tick + "; G.hero.x=G.portal.x;" + tick)
    r['askAgain'] = await pg.evaluate("!$('portal-ask').hidden")
    await pg.click('#pa-yes'); await pg.wait_for_timeout(300)
    r['scene'] = await pg.evaluate("G.scene"); r['hiddenInTown'] = await pg.evaluate("$('portal-ask').hidden")
    return r
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        r = await run(pg); print('pc', r)
        ok = r['askShown'] and r['stillRift1'] == 'rift' and r['afterStayHidden'] and r['stillRift2'] == 'rift' and r['askAgain'] and r['scene'] == 'town' and r['hiddenInTown']
        # Enter
        await pg.evaluate("startRift(3); G.st=heroStats(); G.portal={x:G.hero.x,y:G.hero.y}; for(let i=0;i<5;i++) update(1/60)")
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        print('enter ->', await pg.evaluate("G.scene"))
        m = await b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); m.on('pageerror', lambda e: errs.append(str(e)))
        await m.goto(GAME); await m.wait_for_timeout(300); await m.evaluate("G.touch=true")
        r2 = await run(m, True); print('mobile', r2)
        print('ok', ok and r2['scene'] == 'town', 'errors', errs[:5])
        await b.close()
asyncio.run(main())
