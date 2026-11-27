# Přenos uložení dlouhým kódem a souborem: poškozený kód (bez „WD5:“, rozdělený na řádky, „+“ jako mezera,
# neviditelné znaky) se má načíst, useknutý kód má dát srozumitelnou hlášku. Snímek savecode.png (mobil).
# Spuštění: python3 tests/savecode.py
import pathlib, os, asyncio, tempfile
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, accept_downloads=True)).new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(400)
        await pg.evaluate("(()=>{ G.headless = true; const c = newChar('Přenos','elf','mage',G.save); c.level = 7; G.save.chars.push(c); G.save.current = G.save.chars.length-1; G.save.gold = 12345; playChar(); })()")
        code = await pg.evaluate("exportSave(G.save)")
        variants = {
            'původní': code,
            'bez WD5:': code[4:],
            'řádky a mezery místo +': code[:30] + '\n' + code[30:200].replace('+', ' ') + '\r\n' + code[200:],
            'neviditelné znaky, text okolo': 'Kód: ​' + code + '﻿ ',
        }
        for name, v in variants.items():
            r = await pg.evaluate("(c) => { try { const s = importSave(c); return s.gold + ' / ' + s.chars.find(x => x.name === 'Přenos').level; } catch (e) { return 'CHYBA ' + e.why; } }", v)
            print(f'{name:32s} → {r}')
        r = await pg.evaluate("(c) => { try { importSave(c); return 'načteno?!'; } catch (e) { return e.why + ' ' + e.len; } }", code[:len(code) // 2])
        print(f"{'useknutý napůl':32s} → {r}")
        # UI: okno přenosu, useknutý kód → hláška
        await pg.evaluate("showTransfer(); document.querySelector('details.xfer-old').open = true")
        await pg.fill('#save-code', code[:len(code) // 2])
        await pg.click('text=Načíst z kódu'); await pg.wait_for_timeout(150)
        print('hláška:', await pg.evaluate("$('toast').textContent"))
        await pg.screenshot(path=SHOTS + '/savecode.png')
        # soubor: stáhnout a načíst
        async with pg.expect_download() as dl:
            await pg.click('text=Stáhnout soubor')
        path = os.path.join(tempfile.mkdtemp(), 'ulozeni.txt'); await (await dl.value).save_as(path)
        await pg.evaluate("G.save.gold = 1; persist()")
        await pg.set_input_files('.btn-file input', path); await pg.wait_for_timeout(300)
        print('soubor:', os.path.getsize(path), 'B →', await pg.evaluate("G.save.gold"), '|', await pg.evaluate("$('toast').textContent"))
        print('errors', errs); await b.close()
asyncio.run(main())
