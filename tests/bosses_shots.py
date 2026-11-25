# Snímky všech bossů: nástup, velký útok, 2. fáze (mechanika). Hrdina je nesmrtelný.
# python3 tests/bosses_shots.py [boss,boss...] [mobile]
import pathlib, os, sys, asyncio
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)

async def main():
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    mobile = len(sys.argv) > 2 and sys.argv[2] == 'mobile'
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True) if mobile else await b.new_context(viewport={'width': 1280, 'height': 720})
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type in ('error', 'warning') else None)
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate("(()=>{ G.save.settings.autoFullscreen = false; G.save.chars.push(newChar('S','human','mage',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
        ids = only or await pg.evaluate("Object.keys(BOSSES)")
        for bid in ids:
            await pg.evaluate(f"(()=>{{ startRift(5); G.monsters = []; G.rift.progress = 100; G.hero.invuln = 9999; spawnBoss('{bid}'); }})()")
            await pg.wait_for_timeout(2600)
            await pg.screenshot(path=f'{SHOTS}/boss_{bid}_1.png')
            await pg.evaluate("(()=>{ const m = G.rift.boss; m.act = null; m.sigT = 0; m.spec = 9; })()")
            await pg.wait_for_timeout(1300)
            await pg.screenshot(path=f'{SHOTS}/boss_{bid}_2sig.png')
            await pg.evaluate("(()=>{ const m = G.rift.boss; m.exposedT = 0; m.act = null; m.channel = null; m.hp = m.maxHp * 0.6; bossClampHp(m); })()")
            await pg.wait_for_timeout(3200)
            await pg.screenshot(path=f'{SHOTS}/boss_{bid}_3phase.png')
            print(bid, await pg.evaluate("(()=>{ const m = G.rift.boss; return m ? `fáze ${m.phase} hp ${Math.round(m.hp/m.maxHp*100)} % objekty ${G.monsters.filter(o=>o.obj).length} stav: ${bossStatusText(m)}` : 'mrtvý'; })()"))
        print('errors', errs[:10]); await b.close()
asyncio.run(main())
