# Výběr riftu u obelisku: nejvyšší odemčený, poslední dokončený, libovolný dokončený (−10/−/+/+10, psaní čísla).
# Snímky: počítač, mobil na výšku a na šířku.  Spuštění: python3 tests/riftsel.py
import pathlib, os, asyncio
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)

async def run(p, name, vp, touch):
    b = await p.chromium.launch(); ctx = await b.new_context(viewport=vp, has_touch=touch, is_mobile=touch); pg = await ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(GAME); await pg.wait_for_timeout(300)
    await pg.evaluate("""(()=>{ G.headless = true; const c = newChar('Obelisk','human','mage',G.save); c.maxRift = 45; G.save.chars.push(c); G.save.current=G.save.chars.length-1; playChar(); showRiftSelect(); })()""")
    await pg.wait_for_timeout(200)
    rows = await pg.eval_on_selector_all('.rift-row b', 'els => els.map(e => e.textContent)')
    await pg.screenshot(path=f'{SHOTS}/riftsel_{name}.png')
    await pg.click('.rp-ctl button:has-text("−10")'); await pg.click('.rp-ctl button:has-text("−10")'); await pg.click('.rp-ctl button:text-is("+")')
    a = await pg.evaluate('UI.riftSel')
    await pg.fill('#rift-lvl', '99'); b2 = await pg.evaluate('UI.riftSel')
    await pg.fill('#rift-lvl', '7'); await pg.press('#rift-lvl', 'Enter'); await pg.wait_for_timeout(100)
    st = await pg.evaluate('[G.scene, G.rift.level]')
    print(name, 'rows', rows, 'steps 44-20+1 =', a, 'clamp 99 ->', b2, 'enter ->', st, 'errors', errs)
    await b.close()

async def main():
    async with async_playwright() as p:
        await run(p, 'pc', {'width': 1280, 'height': 720}, False)
        await run(p, 'portrait', {'width': 390, 'height': 844}, True)
        await run(p, 'land', {'width': 844, 'height': 390}, True)
asyncio.run(main())
