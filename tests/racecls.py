import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        for race in ['human','dwarf','elf','orc','undead']:
            await pg.evaluate(f"UI.newChar.race='{race}'; UI.newChar.cls='druid'; showCreate()"); await pg.wait_for_timeout(100)
            en=await pg.evaluate("[...document.querySelectorAll('.pick-grid')[1].querySelectorAll('.pick-card')].filter(b=>!b.disabled).map(b=>b.querySelector('.pc-name').innerText)")
            sel=await pg.evaluate("UI.newChar.cls")
            print(race, en, 'selected', sel)
        await pg.evaluate("UI.newChar.race='dwarf'; showCreate()"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=SHOTS + '/racecls.png')
        print('errors', errs); await b.close()
asyncio.run(main())
