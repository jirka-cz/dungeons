import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':412,'height':860}, has_touch=True, is_mobile=True, device_scale_factor=2)
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.touch=true; G.save.chars.push(newChar('H','elf','hunter',G.save)); G.save.current=0; playChar(0); G.char.level=40; invalidate(); G.st=heroStats(); ['bm.S1','bm.Pa','bm.Pa','bm.S1e','bm.Pb','bm.S2','bm.S3'].forEach(id=>learnTalent(id)); learnTalent('bm.S1c',1); confirmTalents(); UI.tTree='bm'; UI.tSel='bm.Ph'; showTalents(); })()")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS + '/tal_mob1.png')
        await pg.evaluate("document.getElementById('modal-box').scrollTop=450"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=SHOTS + '/tal_mob2.png')
        await pg.tap('.tn.t-key >> nth=1'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS + '/tal_mob3.png')
        print('errors', errs); await b.close()
asyncio.run(main())
