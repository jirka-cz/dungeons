import pathlib, os, asyncio, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
# v1.15: Kniha dovedností, lišta s 8 pozicemi a dalšími řádky, klávesy 1–9 a Shift+1–9, mobil se dvěma kruhy.
SETUP = r"""((cls) => { const ch = newChar('Kniha', 'human', cls, G.save); ch.level = 80; G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
  talentNodes(talentKey(ch)).forEach(n => { if (n.type === 'skill') ch.talents[n.id] = 1; });
  invalidate(); G.st = heroStats(); buildHud(); return knownSkills(ch).length; })"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        n = await pg.evaluate(SETUP + "('mage')"); print('known skills', n)
        await pg.keyboard.press('p'); await pg.wait_for_timeout(200)
        print('modal', await pg.evaluate("UI.modalKind"), 'cards', await pg.locator('.sb-card').count())
        await pg.screenshot(path=f'{SHOTS}/sb_pc.png')
        # klik: dovednost → pozice 3 (index 4)
        sk = await pg.evaluate("knownSkills(G.char).find(id => !G.char.bar.includes(id))")
        await pg.click(f'.sb-card[data-skill="{sk}"]'); await pg.click('.sb-bar [data-bar="4"]'); await pg.wait_for_timeout(100)
        r = {'click': await pg.evaluate(f"G.char.bar[4] === '{sk}'")}
        # tažení: další dovednost → pozice 4 (index 5)
        sk2 = await pg.evaluate("knownSkills(G.char).find(id => !G.char.bar.includes(id))")
        src = pg.locator(f'.sb-card[data-skill="{sk2}"]'); dst = pg.locator('.sb-bar [data-bar="5"]')
        a = await src.bounding_box(); d = await dst.bounding_box()
        await pg.mouse.move(a['x'] + 20, a['y'] + 20); await pg.mouse.down(); await pg.mouse.move(a['x'] + 60, a['y'] + 40, steps=5)
        await pg.mouse.move(d['x'] + 20, d['y'] + 20, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(150)
        r['drag'] = await pg.evaluate(f"G.char.bar[5] === '{sk2}'")
        # přesun: klik na obsazenou pozici a pak na prázdnou
        await pg.click('.sb-bar [data-bar="5"]'); await pg.click('.sb-bar [data-bar="6"]'); await pg.wait_for_timeout(100)
        r['move'] = await pg.evaluate(f"G.char.bar[6] === '{sk2}' && G.char.bar[5] === null")
        # odebrání
        await pg.click('.sb-bar [data-bar="6"]'); await pg.click('text=Odebrat z lišty'); r['remove'] = await pg.evaluate(f"!G.char.bar.includes('{sk2}')")
        # zaplnění 1. řádku → 2. řádek
        await pg.evaluate("knownSkills(G.char).forEach(id => { if (!G.char.bar.includes(id)) { const f = barFirstFree(G.char); if (f >= 0) G.char.bar[f] = id; } }); normBar(G.char); buildHud(); showSpellbook();")
        r['barLen'] = await pg.evaluate("G.char.bar.length"); r['hudRows'] = await pg.locator('#action-bar .ab-row').count()
        r['keys'] = await pg.evaluate("[0,1,2,7,8,10,11,15].map(barKey)")
        await pg.screenshot(path=f'{SHOTS}/sb_pc_rows.png')
        # klávesy v podzemí
        await pg.evaluate("hideModal(); startRift(5); G.st = heroStats(); window._cast = []; const o = castSkill; window.castSkill = (id, ...a) => { _cast.push(id); return o(id, ...a); };")
        await pg.keyboard.press('Digit7'); await pg.keyboard.press('Shift+Digit1'); await pg.keyboard.press('Digit1')
        r['keyCast'] = await pg.evaluate("[_cast, G.char.bar[8], G.char.bar[11], G.char.bar[2]]")
        await pg.screenshot(path=f'{SHOTS}/sb_hud_pc.png')
        print(json.dumps(r, ensure_ascii=False))
        seq = [x for i, x in enumerate(r['keyCast'][0]) if x and (i == 0 or x != r['keyCast'][0][i - 1])]
        okk = seq == [r['keyCast'][1], r['keyCast'][2], r['keyCast'][3]]
        print('ok', all([r['click'], r['drag'], r['move'], r['remove']]) and r['barLen'] == 16 and r['hudRows'] == 2 and okk)
        # staré uložení: lišta se 6 pozicemi
        await pg.evaluate("""(()=>{ const s = newSave(); const ch = newChar('Stary', 'human', 'mage', s); ch.bar = ['missile', 'blink', null, null, null, null]; s.chars.push(ch); writeSave(s); })()""")
        await pg.reload(); await pg.wait_for_timeout(300)
        print('migrace délka', await pg.evaluate("G.save.chars[0].bar.length"))
        # mobil
        for name, vp in [('portrait', {'width': 390, 'height': 844}), ('landscape', {'width': 844, 'height': 390})]:
            m = await b.new_page(viewport=vp, has_touch=True, is_mobile=True); m.on('pageerror', lambda e: errs.append(str(e)))
            await m.goto(GAME); await m.wait_for_timeout(300); await m.evaluate("G.touch=true"); await m.evaluate(SETUP + "('druid')")
            await m.evaluate("startRift(5); G.st=heroStats(); buildHud();"); await m.wait_for_timeout(500)
            await m.screenshot(path=f'{SHOTS}/sb_mob_hud_{name}.png')
            await m.evaluate("showSpellbook()"); await m.wait_for_timeout(200)
            sk = await m.evaluate("knownSkills(G.char).find(id => !G.char.bar.includes(id))")
            await m.tap(f'.sb-card[data-skill="{sk}"]'); await m.tap('.sb-bar [data-bar="7"]'); await m.wait_for_timeout(100)
            print('mobil', name, 'tap-tap', await m.evaluate(f"G.char.bar[7] === '{sk}'"), 'kroužky', await m.locator('#tbtns .tb.skill').count())
            await m.screenshot(path=f'{SHOTS}/sb_mob_{name}.png')
            await m.close()
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
