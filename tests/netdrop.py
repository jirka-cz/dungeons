# Výpadek spojení uprostřed podzemí: (1) náhlé přerušení spojení, (2) host 25 s nic neposílá (zhasnutá obrazovka).
# Host se má sám znovu připojit a vrátit do podzemí; v okně „Hrát s přáteli“ je záznam spojení. Snímek netdrop.png.
# Předpoklady jako tests/net.py (Node.js + npm install peer).  Spuštění: python3 tests/netdrop.py
import pathlib, os, asyncio, sys, subprocess, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
HTTP, PEER = 8125, 9002
URL = f'http://127.0.0.1:{HTTP}/index.html?peer=127.0.0.1:{PEER}'

async def main():
    procs = [subprocess.Popen(['node', str(ROOT / 'tests' / 'peer_server.js'), str(PEER)], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT),
             subprocess.Popen([sys.executable, '-m', 'http.server', str(HTTP), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(1.5)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); errs = []
            A = await (await b.new_context(viewport={'width': 1280, 'height': 720})).new_page()
            B = await (await b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True)).new_page()
            for n, pg in (('A', A), ('B', B)):
                pg.on('pageerror', lambda e, n=n: errs.append(n + ':' + str(e)))
                await pg.goto(URL); await pg.wait_for_timeout(400)
            await A.evaluate("(()=>{ G.save.chars.push(newChar('Táta','human','warrior',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
            await B.evaluate("(()=>{ G.save.chars.push(newChar('Syn','elf','hunter',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()")
            await A.evaluate("netCreate()"); await A.wait_for_function("Net.role === 'host'", timeout=15000); code = await A.evaluate("Net.code")
            await B.evaluate(f"netJoin('{code}')"); await B.wait_for_function("Net.role === 'guest' && Net.members.length === 2", timeout=15000)
            await A.evaluate("netPropose(1)"); await B.wait_for_function("UI.modalKind === 'vote'"); await B.evaluate("netVote(true)")
            await B.wait_for_function("Net.clientRift", timeout=10000)
            await B.wait_for_timeout(1500)
            # 1) náhlé přerušení spojení
            t = time.time()
            await B.evaluate("Net.conn.peerConnection.close()")
            await B.wait_for_function("G.scene === 'town'", timeout=30000)
            await B.wait_for_function("Net.clientRift === true", timeout=60000)
            await A.wait_for_function("G.heroes.length === 2 && Object.keys(Net.mem).length === 1", timeout=10000)
            print(f'1) přerušení: zpět v podzemí za {time.time() - t:.1f} s | členů u hostitele:', await A.evaluate("Object.keys(Net.mem).length"), '| hrdinů:', await A.evaluate("G.heroes.length"))
            # 2) host 25 s nic neposílá
            t = time.time()
            await B.evaluate("window.__raw = netRaw; window.netRaw = () => {}; setTimeout(() => { window.netRaw = window.__raw; }, 25000); 0")
            await A.wait_for_function("Object.keys(Net.mem).length === 0", timeout=40000)
            print(f'2) hostitel hosta vyřadil po {time.time() - t:.1f} s')
            await B.wait_for_function("Net.clientRift === true && Net.role === 'guest'", timeout=150000)
            await A.wait_for_function("G.heroes.length === 2", timeout=10000)
            print(f'   zpět v podzemí za {time.time() - t:.1f} s | členů:', await A.evaluate("Object.keys(Net.mem).length"))
            await B.evaluate("showNetModal(); document.querySelector('.net-log').open = true"); await B.wait_for_timeout(200)
            print('záznam hosta:'); [print('  ', l) for l in await B.evaluate("NetLog.slice(0, 10).map(l => l.t + ' ' + l.msg)")]
            print('záznam hostitele:'); [print('  ', l) for l in await A.evaluate("NetLog.slice(0, 6).map(l => l.t + ' ' + l.msg)")]
            await B.screenshot(path=SHOTS + '/netdrop.png')
            print('errors', errs); await b.close()
    finally:
        for pr in procs: pr.terminate()
asyncio.run(main())
