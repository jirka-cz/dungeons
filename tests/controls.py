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
        await pg.evaluate("(()=>{ G.save.chars.push(newChar('T','human','hunter',G.save)); G.save.current=0; playChar(0); startRift(1); G.monsters.forEach(m=>m.dead=true); G.monsters=[]; G.pets=[]; window.casts=0; const oc=castSkill; castSkill=function(){ const r=oc.apply(this,arguments); if(r) casts++; return r; }; })()")
        await pg.wait_for_timeout(300)
        pos=lambda: pg.evaluate("[Math.round(G.hero.x),Math.round(G.hero.y)]")
        a=await pos(); await pg.keyboard.down('d'); await pg.wait_for_timeout(500); await pg.keyboard.up('d'); b1=await pos()
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(400); await pg.keyboard.up('ArrowUp'); c=await pos()
        print('WASD', a, '->', b1, 'arrows ->', c)
        # držení levého = střelba ke kurzoru
        n0=await pg.evaluate("G.projs.length")
        await pg.mouse.move(900,300); await pg.mouse.down(); await pg.wait_for_timeout(1200)
        print('LMB hold casts:', await pg.evaluate("casts"), 'hero moved?', await pos()==c); await pg.mouse.up()
        await pg.wait_for_timeout(800)
        # auto útok: monstrum poblíž
        await pg.evaluate("(()=>{ const h=G.hero; let p=null; for(let a=0;a<6.3&&!p;a+=0.3){ const q={x:h.x+Math.cos(a)*70,y:h.y+Math.sin(a)*70}; if(!circleBlocked(G.world,q.x,q.y,5)&&lineClear(G.world,h.x,h.y,q.x,q.y,3)) p=q; } spawnMonster('zombie',p.x,p.y); G.monsters[0].hp=G.monsters[0].maxHp=9999; })()")
        await pg.wait_for_timeout(600); print('auto off, casts', await pg.evaluate("casts"))
        slot=await pg.query_selector('#action-bar .ab-slot[data-slot="0"]'); await slot.click(button='right'); await pg.wait_for_timeout(1500)
        print('auto on:', await pg.evaluate("G.save.settings.autoAttack"), 'class', await slot.get_attribute('class'), 'casts', await pg.evaluate("casts"))
        print(await pg.evaluate("JSON.stringify({n:G.monsters.length, d:G.monsters[0]&&Math.round(dist(G.monsters[0],G.hero)), pir:!!primaryInRange(), auto:autoAttackOn(), modal:modalOpen(), cd:G.hero.atkCd, r:G.input.r, l:G.input.l, keys:[...G.input.keys], recall:G.hero.recall})"))
        await pg.screenshot(path=SHOTS + '/ctl_auto.png')
        await pg.evaluate("G.monsters.forEach(m=>m.dead=true)"); await pg.wait_for_timeout(200)
        # Esc menu
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS + '/ctl_menu.png')
        await pg.click('text=Teleport do města'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=SHOTS + '/ctl_recall.png')
        print('recall t', await pg.evaluate("G.hero.recall && G.hero.recall.t.toFixed(1)"))
        await pg.keyboard.down('a'); await pg.wait_for_timeout(100); await pg.keyboard.up('a')
        print('after move recall', await pg.evaluate("G.hero.recall"), 'scene', await pg.evaluate("G.scene"))
        await pg.keyboard.press('t'); await pg.wait_for_timeout(5400)
        print('after T+5.4s scene', await pg.evaluate("G.scene"))
        # město: klik na obchodníka
        await pg.evaluate("(()=>{ const n=G.world.npcs.find(n=>n.id==='vendor'); G.hero.x=n.x+30; G.hero.y=n.y+14; })()"); await pg.wait_for_timeout(200)
        sc=await pg.evaluate("(()=>{ const n=G.world.npcs.find(n=>n.id==='vendor'); return [(n.x-G.cam.x)*G.cssScale,(n.y-6-G.cam.y)*G.cssScale]; })()")
        await pg.mouse.click(sc[0],sc[1]); await pg.wait_for_timeout(1500)
        print('vendor open', await pg.evaluate("modalOpen()"))
        print('errors', errs); await b.close()
asyncio.run(main())
