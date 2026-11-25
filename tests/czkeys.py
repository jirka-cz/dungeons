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
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.save.chars=[newChar('W','orc','warrior',G.save)]; G.save.current=0; playChar(0); G.char.level=10; G.char.talents['arms.S1']=1; G.char.bar[2]='mortal'; G.char.talents['fury.S1']=1; G.char.bar[3]='bloodthirst'; invalidate(); startRift(1); G.hero.res=100; window.casts=[]; const oc=castSkill; castSkill=function(id){ const r=oc.apply(this,arguments); if(r) casts.push(id); return r; }; })()")
        await pg.mouse.move(800,360)
        # česká klávesnice: znak '+' a 'ě', fyzicky Digit1 a Digit2
        for key, code in [('+','Digit1'), ('ě','Digit2')]:
            await pg.evaluate(f"window.dispatchEvent(new KeyboardEvent('keydown', {{key:'{key}', code:'{code}', bubbles:true}}))")
            await pg.wait_for_timeout(250)
            await pg.evaluate(f"window.dispatchEvent(new KeyboardEvent('keyup', {{key:'{key}', code:'{code}', bubbles:true}}))")
            await pg.wait_for_timeout(100)
        await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(100)
        print('casts', await pg.evaluate("casts"), 'keys left', await pg.evaluate("[...G.input.keys]"), errs)
        await b.close()
asyncio.run(main())
