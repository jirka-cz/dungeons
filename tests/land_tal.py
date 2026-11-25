import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name, vp in [('land',{'width':860,'height':390}),('portrait',{'width':412,'height':860}),('desk',{'width':1280,'height':900})]:
            mob = name!='desk'
            pg=await b.new_page(viewport=vp, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
            errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(GAME); await pg.wait_for_timeout(300)
            await pg.evaluate("(()=>{ G.touch=%s; G.save.chars=[newChar('W','orc','warrior',G.save)]; G.save.current=0; playChar(0); G.char.level=30; invalidate(); G.st=heroStats(); UI.tTree='fury'; showTalents(); })()" % ('true' if mob else 'false'))
            await pg.wait_for_timeout(200)
            # posunout strom, kliknout na uzel dole, zkontrolovat, že posunutí zůstane
            sel = '.tal-main' if name=='land' else '#modal-box'
            await pg.evaluate(f"document.querySelector('{sel}').scrollTop = 300")
            await pg.click('.tn.t-skill >> nth=0', force=True)
            st_before = await pg.evaluate(f"document.querySelector('{sel}').scrollTop")
            await pg.evaluate(f"document.querySelector('{sel}').scrollTop = 300")
            await pg.evaluate("UI.tSel='fury.Pa'; showTalents()"); await pg.wait_for_timeout(100)
            st = await pg.evaluate(f"document.querySelector('{sel}').scrollTop")
            await pg.screenshot(path=SHOTS + f'/lt_{name}.png')
            info = await pg.evaluate("(()=>{ const m=document.querySelector('.tal-main').getBoundingClientRect(), s=document.querySelector('.tal-side').getBoundingClientRect(); return {main:[Math.round(m.left),Math.round(m.width)], side:[Math.round(s.left),Math.round(s.width)], boxH: Math.round(document.getElementById('modal-box').getBoundingClientRect().height)}; })()")
            print(name, 'scroll po kliknutí', st, info, errs)
        await b.close()
asyncio.run(main())
