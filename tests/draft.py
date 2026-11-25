import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':1000})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.save.chars=[newChar('W','orc','warrior',G.save)]; G.save.current=0; playChar(0); G.char.level=12; invalidate(); G.st=heroStats(); UI.tTree='fury'; showTalents(); })()")
        await pg.wait_for_timeout(200)
        # klik na uzel a +
        await pg.click('.tn.t-skill >> nth=0'); await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100)
        await pg.click('.tn.t-passive >> nth=0'); await pg.click('.tn-pm .pm-plus'); await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100)
        print('návrh', await pg.evaluate("JSON.stringify(UI.tDraft)"), 'potvrzené', await pg.evaluate("JSON.stringify(G.char.talents)"))
        await pg.click('.tn-pm .pm-minus'); await pg.wait_for_timeout(100)
        print('po −', await pg.evaluate("JSON.stringify(UI.tDraft)"))
        await pg.screenshot(path=SHOTS + '/draft1.png')
        # zavřít s nepotvrzenými → dotaz → Zpět
        await pg.click('.modal-x'); await pg.wait_for_timeout(100)
        print('dotaz', await pg.inner_text('#modal-box'))
        await pg.click('text=Zpět'); await pg.wait_for_timeout(100)
        print('návrh zachován', await pg.evaluate("JSON.stringify(UI.tDraft)"))
        await pg.click('text=✔ Potvrdit talenty'); await pg.wait_for_timeout(100)
        print('potvrzeno', await pg.evaluate("JSON.stringify(G.char.talents)"), 'lišta', await pg.evaluate("JSON.stringify(G.char.bar)"))
        # mimo město: potvrzený bod nejde vrátit, nepotvrzený ano
        await pg.evaluate("G.scene='rift'; showTalents()"); await pg.wait_for_timeout(100)
        await pg.click('.tn.t-passive >> nth=0'); await pg.wait_for_timeout(100)
        print('− na potvrzeném v riftu disabled:', await pg.evaluate("document.querySelector('.tn-pm .pm-minus').disabled"))
        await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100)
        print('− na nepotvrzeném v riftu disabled:', await pg.evaluate("document.querySelector('.tn-pm .pm-minus').disabled"))
        # volba
        await pg.evaluate("G.scene='town'; UI.tDraft=null; G.char.talents={'fury.S1':1,'fury.S1e':1}; showTalents()")
        await pg.click('[onclick*="fury.S1c#2"]'); await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100)
        await pg.click('[onclick*="fury.S1c#1"]'); await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100)
        print('volba v návrhu přepnuta:', await pg.evaluate("UI.tDraft['fury.S1c']"))
        await pg.screenshot(path=SHOTS + '/draft2.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100); await pg.click('text=Zahodit'); await pg.wait_for_timeout(100)
        print('zahozeno', await pg.evaluate("JSON.stringify(G.char.talents)"), await pg.evaluate("UI.tDraft"), await pg.evaluate("modalOpen()"))
        print(errs); await b.close()
asyncio.run(main())
