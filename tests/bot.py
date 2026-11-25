import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio, sys, json
from playwright.async_api import async_playwright
BOT = r"""
(cfg) => {
  const out = [];
  const step = (n) => { for (let i = 0; i < n; i++) {
    const h = G.hero;
    if (!h.dead && G.scene === 'rift') {
      // bot: cíl = nejbližší nepřítel, jinak jdi k nejbližšímu neprozkoumanému nepříteli
      let t = null, bd = 1e9;
      if (G.flow) G.monsters.forEach(m => { if (m.dead) return; const v = G.flow[Math.floor(m.y/TILE)*G.world.w + Math.floor(m.x/TILE)]; const d = v >= 0 ? v : 999 + dist(m,h)/16; if (d < bd) { bd = d; t = m; } });
      G.touch = true; G.input.keys.clear();
      const near = autoTarget(200);
      G.input.atk = !!near && !G.portal;
      if (!near && t && (!h.path || !h.path.length || Math.random() < 0.03)) h.path = findPath(G.world, h.x, h.y, t.x, t.y);
      if (t && dist(t, h) < 120 && !G.portal) { for (let s = 1; s < 6; s++) if (G.char.bar[s] && !skillBlocked(G.char.bar[s]) && Math.random() < 0.3) castSkill(G.char.bar[s], t.x, t.y - 6, t); }
      if (h.hp < G.st.maxHp * 0.4) usePotion();
      if (G.portal) { G.input.atk = false; h.target = null; h.path = findPath(G.world, h.x, h.y, G.portal.x, G.portal.y); }
    }
    update(1/30);
    if (G.scene !== 'rift') return 'town';
  } return 'rift'; };
  G.headless = true;
  const res = { levels: [] }; window.__errs = [];
  for (let L = cfg.start; L < cfg.start + cfg.rifts; L++) {
    startRift(L);
    const R = G.rift;
    let state = 'rift', ticks = 0;
    while (state === 'rift' && ticks < cfg.maxTicks) { state = step(300); ticks += 300; }
    res.levels.push({ L, done: R.done, prog: Math.round(R.progress), time: Math.round(R.time), bossT: R.bossT ? Math.round(R.bossT) : '-', deaths: R.deaths, bossName: R.bossName,
      lvl: G.char.level, gold: Math.round(G.save.gold), inv: G.char.inv.length, boss: G.rift.boss ? G.rift.boss.name + ' ' + Math.round(G.rift.boss.hp/G.rift.boss.maxHp*100)+'%' : '-', monstersLeft: G.monsters.length });
    if (state === 'rift') enterTown();
    // automaticky nasadit lepší věci a naučit talenty
    G.char.inv.slice().forEach(it => { const b = bestTarget(it); if (b.slot && b.gain > 0) equipTo(it, b.slot, 'inv'); });
    let g = 0; while (talentPointsFree() > 0 && g++ < 80) {
      const spec = TALENTS[G.char.cls].specs[cfg.branch % 2].id;
      const nodes = talentNodes(G.char.cls).filter(n => canLearn(n, 1));
      const pref = nodes.filter(n => n.tree === spec); const list = pref.length ? pref : nodes;
      if (!list.length) break;
      list.sort((a,b) => (b.type==='skill')-(a.type==='skill') || (b.type==='key')-(a.type==='key') || a.row-b.row);
      const n = list[0];
      G.char.talents[n.id] = n.type === 'choice' ? 1 + (Math.random() < 0.5 ? 1 : 0) : (G.char.talents[n.id]||0)+1;
      if (!talentStateValid(G.char.cls, G.char.talents)) { G.char.talents[n.id] = 1; }
      if (n.skill && !G.char.bar.includes(n.skill)) { const f = G.char.bar.indexOf(null); if (f>=0) G.char.bar[f]=n.skill; }
      invalidate(); G.st = heroStats();
    }
    repairAll();
  }
  return res;
}
"""
async def main():
    cfg = json.loads(sys.argv[1])
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate(f"""(()=>{{ G.save.chars.push(newChar('Bot','{cfg['race']}','{cfg['cls']}',G.save)); G.save.current=G.save.chars.length-1; playChar(); }})()""")
        await pg.wait_for_timeout(300)
        res = await pg.evaluate(BOT, cfg)
        for l in res['levels']: print(l)
        await pg.screenshot(path=SHOTS + '/bot_end.png')
        print('errors', errs[:8]); await b.close()
asyncio.run(main())
