# Souboje s bossy: postava se nejdřív vybaví v několika riftech (jako bot.py),
# pak bojuje s každým bossem dvěma styly: "stand" (jen stojí a útočí, lektvar pod 40 %)
# a "dodge" (uhýbá varováním na zemi, běží do bezpečných zón, ničí objekty).
# Spuštění: python3 tests/bossfight.py '{"cls":"warrior","race":"orc","prep":8,"level":8,"tries":2}'
import pathlib, os, asyncio, sys, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()

JS = r"""
(cfg) => {
  G.headless = true; window.__errs = [];
  const tickBot = (mode) => {
    const h = G.hero;
    if (h.dead || G.scene !== 'rift') return;
    G.touch = true; G.input.keys.clear(); G.input.joy.on = false; G.input.joy.x = G.input.joy.y = 0;
    const near = autoTarget(200);
    G.input.atk = !!near && !G.portal;
    if (h.hp < G.st.maxHp * 0.4) { if (h.potionCd <= 0) G.stat.pots++; usePotion(); }
    let t = near;
    if (t && dist(t, h) < 120) { for (let s = 1; s < 6; s++) if (G.char.bar[s] && !skillBlocked(G.char.bar[s]) && Math.random() < 0.3) castSkill(G.char.bar[s], t.x, t.y - 6, t); }
    if (mode !== 'dodge') return;
    // uhýbání
    let vx = 0, vy = 0;
    (G.hazards || []).forEach(z => {
      if (z.safe) { if (!z.fired) { const d = dist(z, h); if (d > z.r * 0.6) { vx += (z.x - h.x) / d * 3; vy += (z.y - h.y) / d * 3; } } return; }
      if (z.pillar) { if (h.curse) { const d = dist(z, h); if (d > 4) { vx += (z.x - h.x) / d * 2; vy += (z.y - h.y) / d * 2; } } return; }
      if (z.line) { // čára výpadu: uhni kolmo
        const dx = h.x - z.x, dy = h.y - z.y, along = dx * Math.cos(z.ang) + dy * Math.sin(z.ang), perp = -dx * Math.sin(z.ang) + dy * Math.cos(z.ang);
        if (along > -10 && along < z.len + 10 && Math.abs(perp) < 28) { const s = perp >= 0 ? 1 : -1; vx += -Math.sin(z.ang) * s; vy += Math.cos(z.ang) * s; }
        return;
      }
      if (z.cone) { if (z.t < z.delay) { const d = dist(z, h); if (d < z.len + 6) { const a = Math.atan2(h.y - z.y, h.x - z.x); const da = ((a - z.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(da) < z.arc / 2 + 0.3) { const s = da >= 0 ? 1 : -1; vx += Math.cos(z.ang + s * Math.PI / 2); vy += Math.sin(z.ang + s * Math.PI / 2); } } } return; }
      if (z.wave) return;
      const live = (!z.fired && z.delay && z.dmg) || (z.dps && z.dur && (z.t < z.delay + z.dur));
      if (!live) return;
      const d = dist(z, h), R = z.r + h.r + 4;
      if (d < R) { const k = d || 1; vx += (h.x - z.x) / k * (z.dps && z.fired ? 0.6 : 1.5); vy += (h.y - z.y) / k * (z.dps && z.fired ? 0.6 : 1.5); if (!d) vx += 1; }
    });
    G.projs.forEach(p => { if (p.friendly) return; const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy); if (d < 50 && (dx * p.vx + dy * p.vy) > 0) { vx += -p.vy * 0.8; vy += p.vx * 0.8; } });
    const b = G.rift.boss;
    if (b && b.channel && b.channel.r && dist(b, h) < b.channel.r + 12) { vx += (h.x - b.x) / dist(b, h) * 2; vy += (h.y - b.y) / dist(b, h) * 2; }
    if (b && b.act && b.act.type === 'whirl' && dist(b, h) < 70) { vx += (h.x - b.x) / dist(b, h); vy += (h.y - b.y) / dist(b, h); }
    if (vx || vy) { G.bias = G.bias || { x: Math.random() - 0.5, y: Math.random() - 0.5 }; vx += G.bias.x * 0.3; vy += G.bias.y * 0.3; } else G.bias = null;
    const m = Math.hypot(vx, vy);
    if (m > 0.2) { G.input.joy.on = true; G.input.joy.x = vx / m; G.input.joy.y = vy / m; }
    else if (b && !G.portal) {
      // drž se v rozumné vzdálenosti od bosse (ne v jeho nohou)
      const d = dist(b, h), melee = SKILLS[G.char.bar[0]].type === 'melee';
      if (!melee && d < 55) { G.input.joy.on = true; G.input.joy.x = (h.x - b.x) / d; G.input.joy.y = (h.y - b.y) / d; }
    }
  };
  const step = (n, mode) => { for (let i = 0; i < n; i++) {
    const h = G.hero;
    if (!h.dead && G.scene === 'rift') {
      let t = null, bd = 1e9;
      if (G.flow) G.monsters.forEach(m => { if (m.dead || m.immune) return; const v = G.flow[Math.floor(m.y/TILE)*G.world.w + Math.floor(m.x/TILE)]; const d = v >= 0 ? v : 999 + dist(m,h)/16; if (d < bd) { bd = d; t = m; } });
      tickBot(mode);
      const near = autoTarget(200);
      if (!near && t && (!h.path || !h.path.length || Math.random() < 0.03)) h.path = findPath(G.world, h.x, h.y, t.x, t.y);
      if (G.portal) return 'done';
    }
    update(1/30);
    if (G.scene !== 'rift') return 'town';
  } return 'rift'; };
  const gear = () => {
    G.char.inv.slice().forEach(it => { const b = bestTarget(it); if (b.slot && b.gain > 0) equipTo(it, b.slot, 'inv'); });
    let g = 0; while (talentPointsFree() > 0 && g++ < 80) {
      const spec = TALENTS[G.char.cls].specs[0].id;
      const nodes = talentNodes(G.char.cls).filter(n => canLearn(n, 1));
      const pref = nodes.filter(n => n.tree === spec); const list = pref.length ? pref : nodes;
      if (!list.length) break;
      list.sort((a,b) => (b.type==='skill')-(a.type==='skill') || (b.type==='key')-(a.type==='key') || a.row-b.row);
      const n = list[0];
      G.char.talents[n.id] = n.type === 'choice' ? 1 : (G.char.talents[n.id]||0)+1;
      if (!talentStateValid(G.char.cls, G.char.talents)) { G.char.talents[n.id] = 1; }
      if (n.skill && !G.char.bar.includes(n.skill)) { const f = G.char.bar.indexOf(null); if (f>=0) G.char.bar[f]=n.skill; }
      invalidate(); G.st = heroStats();
    }
    repairAll();
  };
  G.stat = { pots: 0 };
  const _hh = hurtHero;
  window.hurtHero = function (raw, elem, src, pct) { const before = G.hero.hp; const r = _hh(raw, elem, src, pct); if (G.dbg && r) { const b = G.rift.boss; const key = (b && b.lastAtk) || '?'; const k2 = (pct ? 'P' : 'R') + ':' + key; G.dbg[k2] = (G.dbg[k2] || 0) + r / G.st.maxHp; } return r; };
  hurtHero = window.hurtHero;
  // příprava: projdi rifty
  for (let L = 1; L <= cfg.prep; L++) { startRift(L); let s = 'rift', k = 0; while (s === 'rift' && k < 40000) { s = step(300, 'stand'); k += 300; } if (G.scene === 'rift') enterTown(); gear(); }
  const out = [];
  const ids = cfg.bosses || Object.keys(BOSSES);
  for (const id of ids) for (const mode of ['stand', 'dodge']) for (let tr = 0; tr < cfg.tries; tr++) {
    enterTown(); startRift(cfg.level);
    G.monsters = []; G.hero.hp = G.st.maxHp; G.hero.potionCd = 0; G.rift.progress = RIFT.progressGoal; G.rift.bossSpawned = true;
    spawnBoss(id); G.stat = { pots: 0 }; G.dbg = cfg.dbg ? {} : null; let minHp = 1, k = 0, s = 'rift';
    const R = G.rift, t0 = R.time;
    while (s === 'rift' && k < cfg.maxTicks) { s = step(30, mode); k += 30; if (!G.hero.dead) minHp = Math.min(minHp, G.hero.hp / G.st.maxHp); }
    const b = R.boss;
    out.push({ id, mode, done: !!R.done, t: Math.round(R.time - t0), deaths: R.deaths, pots: G.stat.pots, minHp: Math.round(minHp * 100), left: b ? Math.round(b.hp / b.maxHp * 100) : 0, dbg: G.dbg ? Object.fromEntries(Object.entries(G.dbg).map(([k, v]) => [k, Math.round(v * 100)])) : undefined });
  }
  return { lvl: G.char.level, out, errs: window.__errs };
}
"""

async def main():
    cfg = {"cls": "warrior", "race": "orc", "prep": 6, "level": 6, "tries": 1, "maxTicks": 9000}
    cfg.update(json.loads(sys.argv[1]) if len(sys.argv) > 1 else {})
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate(f"""(()=>{{ G.save.chars.push(newChar('Bot','{cfg['race']}','{cfg['cls']}',G.save)); G.save.current=G.save.chars.length-1; playChar(); }})()""")
        await pg.wait_for_timeout(300)
        res = await pg.evaluate(JS, cfg)
        print('úroveň postavy', res['lvl'], cfg['cls'])
        for o in res['out']: print(o)
        print('errors', errs[:8]); await b.close()
asyncio.run(main())
