import pathlib, os, asyncio, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
# v1.16: obnova života a zdroje v boji 25 %, mimo boj 150 %; lahvička many.
JS = r"""(() => { const r = {};
  const ch = newChar('R', 'elf', 'druid', G.save); ch.level = 20; G.save.chars.push(ch); G.save.current = G.save.chars.length - 1; playChar();
  startRift(3); G.monsters.forEach(m => m.dead = true); G.monsters = []; G.st = heroStats(); const h = G.hero, st = G.st;
  const gain = (fight) => { h.hp = st.maxHp * 0.3; h.res = 10; const hp0 = h.hp, r0 = h.res; h.attackedT = fight ? G.time : -99;
    for (let i = 0; i < 60; i++) { if (fight) h.attackedT = G.time; update(1 / 60); } return { hp: +((h.hp - hp0) / st.maxHp * 100).toFixed(3), res: +(h.res - r0).toFixed(2) }; };
  r.regenStat = st.regen; r.resRegen = st.resRegen;
  r.fight = gain(true); r.rest = gain(false);
  // po 4 s bez útoku se přepne na odpočinek
  h.attackedT = G.time; r.combatNow = inCombat(h); h.attackedT = G.time - COMBAT_T - 0.1; r.combatAfter = inCombat(h);
  // lahvička many
  h.res = 0; G.loot = [{ kind: 'mglobe', x: h.x, y: h.y, t: 1 }]; update(1 / 60); r.globeRes = Math.round(h.res); r.lootLeft = G.loot.length;
  // padání lahviček z elit
  let mg = 0, n = 0; for (let k = 0; k < 10; k++) { startRift(3); G.st = heroStats(); G.monsters.filter(m => m.elite && !m.boss).slice(0, 20).forEach(m => { G.loot = []; m.hp = 0;
    try { killMonster(m); } catch (e) { r.killErr = String(e); } n++; mg += G.loot.filter(l => l.kind === 'mglobe').length; }); }
  mg = n ? mg / n * 200 : 0;
  r.eliteManaGlobes = mg / 200;
  return r; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        r = await pg.evaluate(JS); print(json.dumps(r))
        ok = r['fight']['hp'] < r['rest']['hp'] / 5 and r['fight']['res'] < r['rest']['res'] / 5 and r['combatNow'] and not r['combatAfter'] and r['globeRes'] == 25 and r['lootLeft'] == 0 and 0.3 < r['eliteManaGlobes'] < 0.6
        print('ok', ok, 'errors', errs[:5]); await b.close()
asyncio.run(main())
