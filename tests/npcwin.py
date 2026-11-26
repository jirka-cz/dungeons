import pathlib, os, json
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright

# Okna objektů ve městě: přiblížení je otevře, odchod (držený pohyb) je zavře.
ST = "JSON.stringify({ open: modalOpen(), kind: UI.modalKind, npc: UI.npcWin && UI.npcWin.id, x: Math.round(G.hero.x), y: Math.round(G.hero.y) })"

async def hold(pg, key, ms):
    await pg.keyboard.down(key); await pg.wait_for_timeout(ms); await pg.keyboard.up(key); await pg.wait_for_timeout(80)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate("(()=>{ G.save.chars.push(newChar('Okna','human','warrior',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
        await pg.wait_for_timeout(500)
        print('po příchodu do města', await pg.evaluate(ST))
        # od spawnu nahoru k obelisku
        await pg.keyboard.down('w'); await pg.wait_for_timeout(700)
        print('u obelisku (drží W)', await pg.evaluate(ST))
        await pg.keyboard.up('w')
        await pg.screenshot(path=SHOTS + '/npc_obelisk.png')
        # držím S → odchod → zavře se
        await pg.keyboard.down('s'); await pg.wait_for_timeout(250)
        print('odchází (krátce S, ještě blízko)', await pg.evaluate(ST))
        await pg.wait_for_timeout(700); await pg.keyboard.up('s'); await pg.wait_for_timeout(80)
        print('odešel', await pg.evaluate(ST))
        # obchodník: postav hrdinu pod něj na cestu
        await pg.evaluate("(()=>{ G.hero.x = 7*TILE+8; G.hero.y = 14*TILE; })()"); await pg.wait_for_timeout(100)
        await hold(pg, 'w', 700)
        print('u obchodníka', await pg.evaluate(ST))
        # ruční zavření Esc → neotevře se znovu, dokud neodejde
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        print('po Esc (stojí u něj)', await pg.evaluate(ST))
        await hold(pg, 's', 900); await hold(pg, 'w', 900)
        print('odešel a vrátil se', await pg.evaluate(ST))
        # okno postavy přes obchodníka se odchodem nezavře (hra stojí)
        await pg.evaluate("showCharacter()"); await pg.wait_for_timeout(100)
        await hold(pg, 's', 600)
        print('okno postavy + S', await pg.evaluate(ST))
        await pg.evaluate("closeMenu()")
        # kliknutí na obchodníka z dálky stále funguje
        await pg.evaluate("(()=>{ G.hero.x = 20*TILE; G.hero.y = 14*TILE; G.world.npcs.forEach(n=>n.near=false); })()"); await pg.wait_for_timeout(100)
        await pg.evaluate("(()=>{ const n=G.world.npcs.find(n=>n.id==='smith'); const h=G.hero; h.interact=n; h.path=findPath(G.world,h.x,h.y,n.x,n.y+14); })()")
        await pg.wait_for_timeout(3500)
        print('klik na kováře', await pg.evaluate(ST))
        # mobil: joystick držený přes otevřené okno
        m = await b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True)
        m.on('pageerror', lambda e: errs.append('MOB:' + str(e)))
        await m.goto(GAME); await m.wait_for_timeout(300)
        await m.evaluate("(()=>{ G.touch=true; G.save.chars.push(newChar('Mobil','orc','hunter',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
        await m.wait_for_timeout(300)
        await m.evaluate("(()=>{ G.input.joy.on=true; G.input.joy.x=0; G.input.joy.y=-1; })()"); await m.wait_for_timeout(700)
        print('mobil u obelisku', await m.evaluate(ST))
        await m.screenshot(path=SHOTS + '/npc_mobile.png')
        await m.evaluate("(()=>{ G.input.joy.y=1; })()"); await m.wait_for_timeout(900)
        await m.evaluate("(()=>{ G.input.joy.on=false; G.input.joy.y=0; })()")
        print('mobil odešel', await m.evaluate(ST))
        print('errors', errs[:6]); await b.close()

asyncio.run(main())
