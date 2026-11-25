# Hra více hráčů přes skutečné WebRTC: 2 okna prohlížeče (hostitel + host) spojená přes lokální server PeerJS.
# Ověřuje: založení a připojení, společné město, odmítnutí / vypršení / přijetí návrhu úrovně, společné podzemí
# (host vidí nepřátele, jeho útoky zraňují, dostává XP, zlato a předměty do svého uložení), odchod a návrat do
# podzemí, konec podzemí, odpojení hosta i hostitele. Snímky do WD_SHOTS (net_*.png).
#
# Předpoklady navíc: Node.js a balíček peer (npm install peer). Spuštění:
#   python3 tests/net.py '{"secs":120}'
import pathlib, os, asyncio, sys, json, subprocess, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
HTTP, PEER = 8123, 9000
URL = f'http://127.0.0.1:{HTTP}/index.html?peer=127.0.0.1:{PEER}'

# Bot pro obě okna: jde k nejbližšímu nepříteli a útočí (dotykové ovládání), v portálu jde do města
BOT = r"""
(cfg) => {
  window.__bot = { on: true, portal: cfg.portal !== false, kills: 0 };
  clearInterval(window.__botT);
  window.__botT = setInterval(() => {
    const h = G.me; if (!h || !window.__bot.on) return;
    G.touch = true; G.input.keys.clear();
    if (G.scene !== 'rift' || h.dead) { G.input.atk = false; G.input.joy.on = false; return; }
    if (G.rift.done && !window.__bot.portal) { G.input.atk = false; h.path = null; return; }   // po bossovi stát (do portálu jen na pokyn)
    if (G.portal && window.__bot.portal) {
      G.input.atk = false;
      const dx = G.portal.x - h.x, dy = G.portal.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (!h.path || !h.path.length) h.path = findPath(G.world, h.x, h.y, G.portal.x, G.portal.y);
      return;
    }
    let t = null, bd = 1e9;
    G.monsters.forEach(m => { if (m.dead || m.immune) return; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < bd) { bd = d; t = m; } });
    const near = autoTarget(200);
    G.input.atk = !!near;
    if (!near && t && (!h.path || !h.path.length || Math.random() < 0.05)) h.path = findPath(G.world, h.x, h.y, t.x, t.y);
    if (!t && (!h.path || !h.path.length)) {   // nikdo v dohledu: jdi náhodně dál od začátku
      const fl = floorTiles(G.world), p = fl[Math.floor(Math.random() * fl.length)];
      h.path = findPath(G.world, h.x, h.y, p[0] * TILE + 8, p[1] * TILE + 8);
    }
    if (near && dist(near, h) < 120) for (let s = 1; s < 6; s++) if (G.char.bar[s] && !skillBlocked(G.char.bar[s]) && Math.random() < 0.15) castSkill(G.char.bar[s], near.x, near.y - 6, near);
    if (h.hp < G.st.maxHp * 0.4) usePotion();
  }, 50);
}
"""

async def main():
    cfg = {"secs": 150}
    if len(sys.argv) > 1: cfg.update(json.loads(sys.argv[1]))
    env = dict(os.environ)
    procs = [subprocess.Popen(['node', str(ROOT / 'tests' / 'peer_server.js'), str(PEER)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT),
             subprocess.Popen([sys.executable, '-m', 'http.server', str(HTTP), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(1.5)
    out = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            errs = {'A': [], 'B': []}
            async def page(name, vp, mobile=False):
                ctx = await b.new_context(viewport=vp, has_touch=mobile, is_mobile=mobile)
                pg = await ctx.new_page()
                pg.on('pageerror', lambda e: errs[name].append('PAGE:' + (e.stack or str(e))[:600]))
                pg.on('console', lambda m: errs[name].append('console:' + m.text) if m.type == 'error' else None)
                await pg.goto(URL); await pg.wait_for_timeout(500)
                return pg
            A = await page('A', {'width': 1280, 'height': 720})
            B = await page('B', {'width': 844, 'height': 390}, True)
            errs['C'] = []
            C = await page('C', {'width': 390, 'height': 844}, True)
            await A.evaluate("""(()=>{ G.save.chars.push(newChar('Hostitel','human','mage',G.save)); G.save.current=G.save.chars.length-1; G.save.chars[G.save.current].maxRift = 3; playChar(); })()""")
            await B.evaluate("""(()=>{ G.save.chars.push(newChar('Host','orc','warrior',G.save)); G.save.current=G.save.chars.length-1; G.save.chars[G.save.current].maxRift = 2; playChar(); window.__gold0 = G.save.gold; })()""")
            await C.evaluate("""(()=>{ G.save.chars.push(newChar('Třetí','elf','hunter',G.save)); G.save.current=G.save.chars.length-1; G.save.chars[G.save.current].maxRift = 1; playChar(); window.__gold0 = G.save.gold; })()""")
            await A.wait_for_timeout(300)
            # 1) založení a připojení
            await A.evaluate("netCreate()")
            await A.wait_for_function("Net.role === 'host'", timeout=15000)
            code = await A.evaluate("Net.code")
            await B.evaluate(f"netJoin('{code}')")
            await B.wait_for_function("Net.role === 'guest' && Net.members.length === 2", timeout=15000)
            await C.evaluate(f"netJoin('{code}')")
            await C.wait_for_function("Net.role === 'guest' && Net.members.length === 3", timeout=15000)
            await A.wait_for_function("Net.members.length === 3", timeout=5000)
            out['join'] = {'code': code, 'membersA': await A.evaluate("Net.members.map(m => m.name)"), 'membersB': await B.evaluate("Net.members.map(m => m.name)")}
            # 2) město: host se pohne, hostitel ho vidí
            await B.evaluate("G.me.x += 30; G.me.y += 10")
            await A.wait_for_timeout(700)
            out['town'] = await A.evaluate("(()=>{ const g = G.heroes.find(h => h.ghost); return g ? { ghost: g.name, x: Math.round(g.x), y: Math.round(g.y) } : null; })()")
            out['townB'] = await B.evaluate("(()=>{ const g = G.heroes.find(h => h.ghost); return g ? { ghost: g.name } : null; })()")
            await A.evaluate("showNetModal()"); await A.wait_for_timeout(200)
            await A.screenshot(path=SHOTS + '/net_room_host.png')
            await A.evaluate("closeMenu()")
            await B.screenshot(path=SHOTS + '/net_town_guest.png')
            # 3) návrh: odmítnutí, vypršení, přijetí
            await B.evaluate("netPropose(2)")
            await A.wait_for_function("UI.modalKind === 'vote'", timeout=5000)
            await C.wait_for_function("UI.modalKind === 'vote'", timeout=5000)
            await A.screenshot(path=SHOTS + '/net_vote_host.png'); await C.screenshot(path=SHOTS + '/net_vote_portrait.png')
            await B.screenshot(path=SHOTS + '/net_wait_guest.png')
            await A.evaluate("netVote(false)")
            await B.wait_for_function("UI.modalKind !== 'vote'", timeout=5000)
            out['decline'] = {'toastB': await B.evaluate("$('toast').textContent"), 'sceneA': await A.evaluate("G.scene")}
            await A.evaluate("netPropose(3)")
            await B.wait_for_function("UI.modalKind === 'vote'", timeout=5000)
            await C.evaluate("netVote(true)")
            vtxt = await B.evaluate("$('modal-box').innerText")
            await A.evaluate("Net.prop.end = Date.now()")
            await A.wait_for_function("UI.modalKind !== 'vote'", timeout=5000)
            out['timeout'] = {'voteText': vtxt.replace('\n', ' | ')[:160], 'toastA': await A.evaluate("$('toast').textContent")}
            await B.evaluate("netPropose(2)")
            await A.wait_for_function("UI.modalKind === 'vote'", timeout=5000)
            await C.wait_for_function("UI.modalKind === 'vote'", timeout=5000)
            await A.evaluate("netVote(true)"); await C.evaluate("netVote(true)")
            await C.wait_for_function("Net.clientRift === true", timeout=10000)
            await B.wait_for_function("Net.clientRift === true && G.scene === 'rift'", timeout=10000)
            await A.wait_for_function("G.scene === 'rift' && G.heroes.length === 3", timeout=5000)
            out['start'] = {'mulA': await A.evaluate("G.partyMul"), 'levelB': await B.evaluate("G.rift.level"), 'heroesA': await A.evaluate("G.heroes.length")}
            # 4) společné podzemí s boty
            await A.evaluate(BOT, {'portal': False}); await B.evaluate(BOT, {'portal': False}); await C.evaluate(BOT, {'portal': False})
            stats = []
            t0 = time.time(); shot = False
            while time.time() - t0 < cfg['secs']:
                await A.wait_for_timeout(5000)
                sa = await A.evaluate("({ prog: Math.round(G.rift.progress), done: G.rift.done, mons: G.monsters.length, scene: G.scene, gHp: (G.heroes[1]||{}).hp|0, gx: Math.round((G.heroes[1]||{}).x||0) })")
                sc = await C.evaluate("({ mons: G.monsters.length, lvl: G.char.level, gold: Math.round(G.save.gold - window.__gold0), inv: G.char.inv.length, hp: Math.round(G.me.hp), heroes: G.heroes.length })")
                sb = await B.evaluate("({ scene: G.scene, client: Net.clientRift, mons: G.monsters.length, projs: G.projs.length, lvl: G.char.level, xp: G.char.xp, gold: Math.round(G.save.gold - window.__gold0), inv: G.char.inv.length, hp: Math.round(G.me.hp), x: Math.round(G.me.x), dead: G.me.dead, heroes: G.heroes.length })")
                stats.append({'t': int(time.time() - t0), 'A': sa, 'B': sb, 'C': sc})
                if not shot and sb['mons'] >= 3:
                    shot = True
                    await B.evaluate("window.__bot.on = false"); await B.wait_for_timeout(600)
                    await B.screenshot(path=SHOTS + '/net_rift_guest.png'); await A.screenshot(path=SHOTS + '/net_rift_host.png'); await C.screenshot(path=SHOTS + '/net_rift_portrait.png')
                    await B.evaluate("window.__bot.on = true")
                if sa['done']: break
            out['play'] = stats
            # host odejde do města a vrátí se k družině
            await B.evaluate("window.__bot.on = false; goTown()")
            await B.wait_for_timeout(800)
            out['leave'] = {'sceneB': await B.evaluate("G.scene + ' client=' + Net.clientRift"), 'heroesA': await A.evaluate("G.heroes.length"), 'memberSceneA': await A.evaluate("Net.members.map(m => m.scene)")}
            await B.evaluate("showRiftSelect()"); await B.wait_for_timeout(200)
            rj = await B.evaluate("$('modal-box').innerText")
            out['hostSceneBeforeRejoin'] = await A.evaluate("G.scene")
            await B.evaluate("hideModal(); netSend({ t: 'rejoin' })")
            if out['hostSceneBeforeRejoin'] == 'rift':
              try: await B.wait_for_function("Net.clientRift === true", timeout=8000)
              except Exception as e: out['rejoinFail'] = {'A': await A.evaluate("({ scene: G.scene, mem: Object.values(Net.mem).map(m => [m.scene, !!m.hero]), done: G.rift.done })"), 'B': await B.evaluate("({ scene: G.scene, role: Net.role, hostScene: Net.hostScene, toast: $('toast').textContent })"), 'errs': errs}; raise
              out['rejoin'] = {'obelisk': rj.replace('\n', ' | ')[:120], 'heroesA': await A.evaluate("G.heroes.length")}
            # dokončit podzemí, pokud ještě není
            await B.evaluate("window.__bot.on = true")
            t1 = time.time()
            while time.time() - t1 < cfg['secs'] and not await A.evaluate("G.rift.done"):
                await A.wait_for_timeout(4000)
            out['done'] = {'doneA': await A.evaluate("G.rift.done"), 'maxRiftB': await B.evaluate("G.char.maxRift"), 'portalB': await B.evaluate("!!G.portal")}
            # hostitel vejde do portálu → všichni do města
            await A.evaluate("window.__bot.on = false; goTown()")
            await B.wait_for_function("G.scene === 'town' && !Net.clientRift", timeout=8000)
            await B.wait_for_timeout(700)
            out['end'] = {'sceneB': await B.evaluate("G.scene"), 'ghostB': await B.evaluate("G.heroes.filter(h => h.ghost).map(h => h.name)"),
                          'savedB': await B.evaluate("(()=>{ const s = JSON.parse(localStorage.getItem('wd_save')); const c = s.chars[s.current]; return { lvl: c.level, inv: c.inv.length, maxRift: c.maxRift, gold: s.gold }; })()")}
            out['missLog'] = await B.evaluate("(Net.missLog || []).slice(0, 8)")
            out['savedC'] = await C.evaluate("(()=>{ const s = JSON.parse(localStorage.getItem('wd_save')); const c = s.chars[s.current]; return { lvl: c.level, inv: c.inv.length, maxRift: c.maxRift, gold: s.gold }; })()")
            # 5) odpojení hosta, pak hostitel zavře místnost
            await B.close()
            await A.wait_for_function("Net.members.length === 2", timeout=25000)
            out['guestGone'] = await A.evaluate("$('toast').textContent")
            await A.evaluate("netLeave()")
            await C.wait_for_function("!Net.role", timeout=10000)
            out['hostClosed'] = {'toastC': await C.evaluate("$('toast').textContent"), 'sceneC': await C.evaluate("G.scene")}
            out['errors'] = errs
            await b.close()
    finally:
        for pr in procs: pr.terminate()
        if 'rejoinFail' in out: print('rejoinFail', json.dumps(out['rejoinFail'], ensure_ascii=False))
    for k, v in out.items():
        if k == 'play':
            for s in v: print('play', json.dumps(s, ensure_ascii=False))
        else: print(k, json.dumps(v, ensure_ascii=False))
try: asyncio.run(main())
except Exception as e: print('FAIL', e)
