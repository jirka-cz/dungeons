# Přenos postav krátkým kódem přes skutečné WebRTC (lokální server PeerJS).
# Ověřuje: odeslání z počítače, příjem na prázdném mobilu (tlačítko v prázdném menu), shodu dat (postavy,
# batoh, truhla, zlato) i po obnovení stránky, velké uložení po více kouscích, potvrzení na zařízení
# s vlastními postavami (Zrušit → odesílatel se to dozví, znovu → Přijmout), neplatný kód, zavření okna
# zruší kód, záložní dlouhý kód. Snímky do WD_SHOTS (xfer_*.png).
#
# Předpoklady navíc: Node.js a balíček peer (npm install peer). Spuštění:
#   python3 tests/transfer.py
import pathlib, os, asyncio, sys, json, subprocess, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
HTTP, PEER = 8124, 9001
URL = f'http://127.0.0.1:{HTTP}/index.html?peer=127.0.0.1:{PEER}'

SETUP_PC = """(()=>{
  const a = newChar('Aragorn','human','warrior',G.save), b = newChar('Elrond','elf','mage',G.save);
  a.level = 23; a.maxRift = 14; a.xp = 1234; b.level = 7;
  for (let i = 0; i < 20; i++) a.inv.push(makeItem(20, 'orange', G.save.nextUid++, null, 'warrior'));
  for (let i = 0; i < 200; i++) G.save.stash.push(makeItem(20, 'purple', G.save.nextUid++));
  G.save.chars.push(a, b); G.save.current = 0; G.save.gold = 98765; persist(); showMenu();
})()"""
STRIP = "JSON.stringify({chars: G.save.chars, stash: G.save.stash, gold: G.save.gold})"

async def main():
    procs = [subprocess.Popen(['node', str(ROOT / 'tests' / 'peer_server.js'), str(PEER)], env=dict(os.environ), stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT),
             subprocess.Popen([sys.executable, '-m', 'http.server', str(HTTP), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(1.5)
    res, errs = {}, []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            async def page(vp, mobile=False):
                ctx = await b.new_context(viewport=vp, has_touch=mobile, is_mobile=mobile)
                pg = await ctx.new_page()
                pg.on('pageerror', lambda e: errs.append('PAGE:' + (e.stack or str(e))[:400]))
                await pg.goto(URL); await pg.wait_for_timeout(400)
                return pg
            A = await page({'width': 1280, 'height': 720})
            B = await page({'width': 390, 'height': 844}, True)
            C = await page({'width': 844, 'height': 390}, True)
            await A.evaluate(SETUP_PC)
            await C.evaluate("(()=>{ G.save.chars.push(newChar('Mobilák','orc','warrior',G.save)); G.save.current=0; G.save.gold=5; persist(); showMenu(); })()")
            src = await A.evaluate(STRIP)
            res['saveKB'] = round(len(await A.evaluate("exportSave(G.save)")) / 1024)

            # 1) odeslání z PC
            await A.click('#menu-xfer')
            await A.screenshot(path=f'{SHOTS}/xfer_pc_open.png')
            await A.click('#xfer-send')
            await A.wait_for_selector('#xfer-code', timeout=15000)
            code = await A.inner_text('#xfer-code')
            res['code'] = code
            await A.screenshot(path=f'{SHOTS}/xfer_pc_code.png')

            # 2) neplatný kód na mobilu
            await B.screenshot(path=f'{SHOTS}/xfer_mob_empty_menu.png')
            await B.click('.menu-empty-xfer')
            await B.fill('#xfer-in', 'ZZZZZ'); await B.click('#xfer-recv')
            await B.wait_for_function("Xfer.state === 'err'", timeout=20000)
            res['badCode'] = await B.inner_text('#xfer-msg')

            # 3) příjem na prázdném mobilu
            await B.fill('#xfer-in', code.lower()); await B.click('#xfer-recv')
            await B.wait_for_function("G.save.chars.length === 2", timeout=20000)
            await A.wait_for_function("Xfer.state === 'done'", timeout=10000)
            res['pcMsg'] = await A.inner_text('#xfer-msg')
            await A.screenshot(path=f'{SHOTS}/xfer_pc_done.png')
            await B.screenshot(path=f'{SHOTS}/xfer_mob_after.png')
            res['sameData'] = (await B.evaluate(STRIP)) == src
            await B.reload(); await B.wait_for_timeout(500)
            res['sameAfterReload'] = (await B.evaluate(STRIP)) == src
            res['pcStillHas'] = await A.evaluate("G.save.chars.length")
            await A.click('text=OK')

            # 4) zařízení s vlastní postavou: Zrušit, pak Přijmout
            await A.click('#xfer-send'); await A.wait_for_selector('#xfer-code', timeout=15000)
            code = await A.inner_text('#xfer-code')
            await C.click('#menu-xfer')
            await C.screenshot(path=f'{SHOTS}/xfer_land_open.png')
            await C.fill('#xfer-in', code); await C.click('#xfer-recv')
            await C.wait_for_selector('text=Přijmout postavy?', timeout=20000)
            await C.screenshot(path=f'{SHOTS}/xfer_land_ask.png')
            await C.click('text=Zrušit')
            await A.wait_for_function("/odmítlo/.test(Xfer.msg)", timeout=10000)
            res['declinedKeptOwn'] = await C.evaluate("G.save.chars.map(c=>c.name).join(',')")
            await C.fill('#xfer-in', code); await C.click('#xfer-recv')
            await C.wait_for_selector('text=Přijmout postavy?', timeout=20000)
            await C.click('#modal-box button.primary')
            await C.wait_for_function("G.save.chars.length === 2", timeout=10000)
            await A.wait_for_function("Xfer.state === 'done'", timeout=10000)
            res['acceptSame'] = (await C.evaluate(STRIP)) == src

            # 5) zavření okna zruší kód
            await A.click('text=OK')
            await A.click('#xfer-send'); await A.wait_for_selector('#xfer-code', timeout=15000)
            code = await A.inner_text('#xfer-code')
            await A.click('.modal-x')
            res['closedStops'] = await A.evaluate("Xfer.peer === null")
            await B.click('#menu-xfer'); await B.fill('#xfer-in', code); await B.click('#xfer-recv')
            await B.wait_for_function("Xfer.state === 'err'", timeout=25000)
            res['closedCodeInvalid'] = await B.evaluate("Xfer.msg")

            # 6) záložní dlouhý kód
            await B.click('details.xfer-old summary')
            await B.screenshot(path=f'{SHOTS}/xfer_mob_open.png', full_page=True)
            await A.click('#menu-xfer'); await A.click('details.xfer-old summary'); await A.click('text=Zkopírovat kód uložení')
            long = await A.input_value('#save-code')
            await B.evaluate("(()=>{G.save.chars=[];persist();})()")
            await B.fill('#save-code', long); await B.click('text=Načíst z kódu')
            res['longCodeOk'] = (await B.evaluate(STRIP)) == src
            res['verNum'] = await B.evaluate("[verNum('1.16.0') < verNum('1.17.0'), verNum('1.9.9') < verNum('1.10.0'), verNum('2.0.0') > verNum('1.99.99')]")
            await b.close()
    finally:
        for pr in procs: pr.kill()
    res['errors'] = errs
    print(json.dumps(res, ensure_ascii=False, indent=1))

asyncio.run(main())
