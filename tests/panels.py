import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate("""(()=>{ G.save.chars.push(newChar('Jirka','dwarf','warrior',G.save)); G.save.chars.push(newChar('Mág','elf','mage',G.save)); G.save.current=0; showMenu(); })()""")
        await pg.wait_for_timeout(200); await pg.screenshot(path=SHOTS + '/p_menu.png')
        await pg.evaluate("""(()=>{ playChar(0); const ch=G.char; ch.level=12; ch.maxRift=6; G.save.gold=5000;
           for(let i=0;i<14;i++){ const it=makeItem(riftIlvl(5), ['gray','green','purple','orange','diamond'][i%5], G.save.nextUid++, null, 'warrior'); if(i%3==0) it.dur=Math.floor(it.maxDur*0.1); ch.inv.push(it);} 
           ch.equip.main.dur=0; for(let i=0;i<6;i++) G.save.stash.push(makeItem(8,'green',G.save.nextUid++)); invalidate(); G.st=heroStats(); })()""")
        await pg.wait_for_timeout(300)
        for name, fn in [('char','showCharacter()'),('tal','showTalents()'),('vendor','showVendor()'),('smith','showSmith()'),('stash','showStash()'),('rift','showRiftSelect()')]:
            await pg.evaluate(fn); await pg.wait_for_timeout(250)
            await pg.screenshot(path=SHOTS + f'/p_{name}.png')
        # talenty: nauč pár bodů a přetáhni dovednost
        await pg.evaluate("showTalents()"); await pg.click('.tn.ok >> nth=0'); await pg.wait_for_timeout(100); await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100); await pg.click('.tconfirm button.primary'); await pg.wait_for_timeout(150)
        print('bar', await pg.evaluate("JSON.stringify(G.char.bar)"), 'free', await pg.evaluate("talentPointsFree()"))
        await pg.evaluate("hideModal()")
        # mobil
        m = await b.new_page(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True)
        m.on('pageerror', lambda e: errs.append('MOB:'+str(e)))
        await m.goto(GAME); await m.wait_for_timeout(300)
        await m.evaluate("""(()=>{ G.touch=true; G.save.chars.push(newChar('Mobil','orc','hunter',G.save)); G.save.current=G.save.chars.length-1; playChar(); startRift(1); })()""")
        await m.wait_for_timeout(1200)
        await m.screenshot(path=SHOTS + '/p_mobile.png')
        print('errors', errs[:6]); await b.close()
asyncio.run(main())
