import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        # staré uložení s gray=true
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ const s=newSave(); delete s.settings.sellFix103; s.settings.autoSell.gray=true; s.chars.push(newChar('A','human','warrior',s)); writeSave(s); })()")
        await pg.reload(); await pg.wait_for_timeout(300)
        print('migrated gray', await pg.evaluate("G.save.settings.autoSell.gray"), 'new default', await pg.evaluate("newSave().settings.autoSell.gray"))
        await pg.evaluate("(()=>{ G.save.current=0; playChar(0); showCharacter(); })()"); await pg.wait_for_timeout(300)
        await pg.click('.autosell-row label:has-text("Šedá"), .autosell-row label >> nth=0'); await pg.wait_for_timeout(100)
        print('toggled in char panel', await pg.evaluate("G.save.settings.autoSell.gray"))
        await pg.screenshot(path=SHOTS + '/autosell.png')
        print('errors', errs); await b.close()
asyncio.run(main())
