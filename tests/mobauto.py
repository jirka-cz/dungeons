import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{ G.touch=true; G.save.chars.push(newChar('T','orc','warrior',G.save)); G.save.current=0; playChar(0); startRift(1); G.monsters=[]; G.pets=[]; window.casts=0; const oc=castSkill; castSkill=function(){ const r=oc.apply(this,arguments); if(r) casts++; return r; }; const h=G.hero; let p=null; for(let a=0;a<6.3&&!p;a+=0.3){ const q={x:h.x+Math.cos(a)*14,y:h.y+Math.sin(a)*14}; if(!circleBlocked(G.world,q.x,q.y,5)) p=q; } spawnMonster('zombie',p.x,p.y); G.monsters[0].hp=G.monsters[0].maxHp=9999; })()")
        await pg.wait_for_timeout(1500)
        print('mobile melee auto casts', await pg.evaluate("casts"), 'hp', await pg.evaluate("Math.round(G.monsters[0].hp)"))
        await pg.evaluate("G.monsters[0].dead=true"); await pg.wait_for_timeout(200)
        await pg.tap('[data-tb="portal"]'); await pg.wait_for_timeout(5300)
        print('portal btn -> scene', await pg.evaluate("G.scene"))
        await pg.screenshot(path=SHOTS + '/mob_town.png')
        print('errors', errs); await b.close()
asyncio.run(main())
