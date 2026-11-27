# Nepovedené připojení: špatný kód a zablokované přímé spojení (?noice=1 vypne zprostředkující servery).
# Ověřuje, že hra ukáže konkrétní hlášku v okně a hostitel vidí pokus o připojení. Snímky net_fail_*.png.
# Předpoklady jako tests/net.py (Node.js + npm install peer).  Spuštění: python3 tests/netfail.py
import pathlib, os, asyncio, sys, subprocess, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
HTTP, PEER = 8124, 9001
BASE = f'http://127.0.0.1:{HTTP}/index.html?peer=127.0.0.1:{PEER}'

async def main():
    procs = [subprocess.Popen(['node', str(ROOT / 'tests' / 'peer_server.js'), str(PEER)], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT),
             subprocess.Popen([sys.executable, '-m', 'http.server', str(HTTP), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(1.5)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); errs = []
            async def page(url, vp):
                pg = await (await b.new_context(viewport=vp)).new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(url); await pg.wait_for_timeout(400)
                await pg.evaluate("(()=>{ G.save.chars.push(newChar('X','human','mage',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
                return pg
            A = await page(BASE, {'width': 1280, 'height': 720})
            B = await page(BASE + '&noice=1', {'width': 390, 'height': 844})
            await A.evaluate("netCreate()"); await A.wait_for_function("Net.role === 'host'", timeout=15000)
            code = await A.evaluate("Net.code")
            # špatný kód
            await B.evaluate("showNetModal(); netJoin('ZZZZZ'); showNetModal()")
            await B.wait_for_function("!!Net.joinError", timeout=15000)
            print('wrong code:', await B.evaluate("Net.joinError.why"), '|', (await B.evaluate("document.querySelector('.net-err').innerText"))[:90])
            # zablokované přímé spojení
            await B.evaluate(f"netJoin('{code}'); showNetModal()")
            await B.wait_for_timeout(1200)
            stages = await B.evaluate("document.querySelector('.net-stages') ? document.querySelector('.net-stages').innerText : '(hotovo)'")
            await B.screenshot(path=SHOTS + '/net_fail_joining.png')
            await B.wait_for_function("!!Net.joinError && Net.joinError.why !== 'nocode'", timeout=30000)
            print('blocked:', await B.evaluate("Net.joinError.why"), '| kroky:', stages.replace('\n', ' / '))
            print('message:', (await B.evaluate("document.querySelector('.net-err').innerText"))[:140])
            print('host toast:', await A.evaluate("$('toast').textContent"), '| members:', await A.evaluate("Net.members.length"))
            await B.screenshot(path=SHOTS + '/net_fail_blocked.png')
            print('errors', errs); await b.close()
    finally:
        for pr in procs: pr.terminate()
asyncio.run(main())
