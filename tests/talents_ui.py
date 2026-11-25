import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e))); pg.on('console', lambda m: m.type=='error' and errs.append('CON:'+m.text))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        # migrace starého uložení
        await pg.evaluate("(()=>{ const s=newSave(); const c=newChar('Old','human','warrior',s); delete c.talentVer; c.talents={'0_0_0':1,'1_0_1':3}; c.bar=['slash','leap','mortal',null,null,null]; s.chars.push(c); writeSave(s); })()")
        await pg.reload(); await pg.wait_for_timeout(300)
        print('migrace', await pg.evaluate("JSON.stringify({t:G.save.chars[0].talents, bar:G.save.chars[0].bar, ver:G.save.chars[0].talentVer})"))
        await pg.evaluate("(()=>{ G.save.current=0; playChar(0); G.char.level=30; invalidate(); G.st=heroStats(); })()"); await pg.wait_for_timeout(200)
        r = await pg.evaluate("""(()=>{
          const out=[]; const tl = id => { const before=TD()[id]||0; learnTalent(id); return (TD()[id]||0)>before; };
          out.push('S2 před bránou: '+tl('fury.S2'));  // potřebuje Pa
          out.push('S1: '+tl('fury.S1'));
          out.push('Pa x3: '+[tl('fury.Pa'),tl('fury.Pa'),tl('fury.Pa'),tl('fury.Pa')].join(','));
          out.push('S2: '+tl('fury.S2'));
          out.push('S2e (řádek 3, 5 bodů nad?): '+tl('fury.S2e'));
          out.push('S1e: '+tl('fury.S1e'));
          out.push('S2e po 6 bodech: '+tl('fury.S2e'));
          learnTalent('fury.S1c', 2); confirmTalents();
          out.push('volba S1c='+G.char.talents['fury.S1c']);
          out.push('bar '+JSON.stringify(G.char.bar));
          out.push('volné '+talentPointsFree()+' spent '+talentsSpent(G.char));
          out.push('offhand mod '+G.st.mods.offhand+' enrage skill '+G.st.mods.skenrage_bloodthirst);
          return out.join('\\n'); })()""")
        print(r)
        await pg.evaluate("UI.tTree='fury'; UI.tSel='fury.S1c'; showTalents()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS + '/tal_fury.png', full_page=False)
        await pg.evaluate("document.getElementById('modal-box').scrollTop=400"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=SHOTS + '/tal_fury2.png')
        await pg.evaluate("UI.tTree='core'; UI.tSel='core.Ck'; showTalents()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS + '/tal_core.png')
        # klepnutí myší na uzel a tlačítko
        await pg.evaluate("UI.tTree='arms'; UI.tSel=null; showTalents()"); await pg.wait_for_timeout(100)
        await pg.click('.tn.t-skill >> nth=0'); await pg.wait_for_timeout(100)
        await pg.click('.tn-pm .pm-plus'); await pg.wait_for_timeout(100); await pg.click('.tconfirm button.primary'); await pg.wait_for_timeout(100)
        print('arms S1 po kliknutí', await pg.evaluate("G.char.talents['arms.S1']"))
        print('errors', errs); await b.close()
asyncio.run(main())
