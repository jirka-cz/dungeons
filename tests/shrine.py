import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.save.chars.push(newChar('S','undead','warlock',G.save)); G.save.current=0; playChar(0); startRift(2); const s=G.shrines[0]; const p=nearestFree(G.world,s.x-40,s.y,5); G.hero.x=p.x; G.hero.y=p.y; })()")
        await pg.wait_for_timeout(700); await pg.screenshot(path=SHOTS + '/shrine1.png')
        await pg.evaluate("(()=>{ const s=G.shrines[0]; G.hero.x=s.x; G.hero.y=s.y+4; })()"); await pg.wait_for_timeout(600)
        print('buffs', await pg.evaluate("G.hero.buffs.map(b=>b.name+':'+Math.round(b.t)).join(',')"), 'shrines', await pg.evaluate("G.shrines.length"))
        await pg.screenshot(path=SHOTS + '/shrine2.png')
        print('errors', errs); await b.close()
asyncio.run(main())
