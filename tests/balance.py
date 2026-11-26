"""Balanc: syntetická postava (úroveň, výbava a talenty odpovídající podzemí) a měření obtížnosti.

Použití:
  python3 tests/balance.py table                      – rychlá tabulka (síla hrdiny vs. nepřátelé) pro všechny třídy
  python3 tests/balance.py bot '{"cls":"warrior","race":"orc","L":[5,20,60],"lvlOff":0}'
      – bot projde podzemí L s postavou na „přirozené“ úrovni (lvlOff = posun úrovně) a vypíše čas, smrti, strážce

Postava: úroveň = naturalLevel(L) + lvlOff, výbava = nejlepší z několika náhodných kusů úrovně podzemí
(rarita podle podzemí: zelená → epická → legendární), talenty rozdělí bot (preferuje specializaci `branch`).
"""
import pathlib, os, sys, json, asyncio
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()

SETUP = r"""() => {
window.__mkHero = (cls, race, lvl, L, branch) => {
  const ch = newChar('Sim', race, cls, G.save);
  ch.level = Math.max(1, lvl);
  G.save.chars.push(ch); G.save.current = G.save.chars.length - 1;
  G.char = ch; invalidate();
  // výbava: pro každý slot 4 kusy, nasadí se nejlepší podle skóre hry
  const ilvl = Math.max(1, riftIlvl(L) - 2);
  const rar = L < 4 ? 'green' : L < 12 ? 'purple' : 'orange';
  const kinds = ['weapon', 'weapon', 'offhand', 'head', 'chest', 'gloves', 'legs', 'boots', 'cloak', 'neck', 'ring', 'ring'];
  ch.equip = {};
  for (const k of kinds) for (let i = 0; i < 6; i++) {
    const it = makeItem(ilvl, rar === 'orange' && i % 2 ? 'purple' : rar, G.save.nextUid++, k, cls);
    if (!canClassUse(it, cls)) continue;
    const b = bestTarget(it);
    if (b.slot && b.gain > 0) { const out = displaced(it, b.slot); out.forEach(s => delete ch.equip[s]); ch.equip[b.slot] = it; invalidate(); }
  }
  // talenty: jako bot – dovednosti a klíčové pasivky první, pak shora dolů
  ch.talents = {};
  let g = 0;
  while (talentPointsTotal(ch.level) - talentsSpent(ch) > 0 && g++ < 400) {
    const spec = TALENTS[cls].specs[branch % 2].id;
    const nodes = talentNodes(talentKey(ch)).filter(n => { const v = ch.talents[n.id] || 0; if (n.type === 'base' || v >= (n.type === 'choice' ? 1 : n.max)) return false;
      return talentStateValid(talentKey(ch), Object.assign({}, ch.talents, { [n.id]: n.type === 'choice' ? 1 : v + 1 })); });
    const pref = nodes.filter(n => n.tree === spec); const list = pref.length ? pref : nodes;
    if (!list.length) break;
    list.sort((a, b) => (b.type === 'skill') - (a.type === 'skill') || (b.type === 'key') - (a.type === 'key') || a.row - b.row);
    const n = list[0];
    ch.talents[n.id] = n.type === 'choice' ? 1 : (ch.talents[n.id] || 0) + 1;
  }
  const known = knownSkills(ch);
  ch.bar = [CLASSES[cls].base[0], CLASSES[cls].base[1]].concat(known.filter(id => !CLASSES[cls].base.includes(id) && SKILLS[id].type !== 'buff').slice(-3), known.filter(id => SKILLS[id].type === 'buff').slice(-1)).slice(0, 6);
  while (ch.bar.length < 6) ch.bar.push(null);
  invalidate();
  return ch;
};
}
"""

TABLE = r"""
(Ls) => {
  const out = [];
  for (const cls of Object.keys(CLASSES)) {
    const race = RACE_CLASSES ? Object.keys(RACE_CLASSES).find(r => RACE_CLASSES[r].includes(cls)) : 'human';
    for (const L of Ls) for (let rep = 0; rep < (window.__reps || 1); rep++) {
      const lvl = naturalLevel(L);
      const ch = __mkHero(cls, race, lvl, L, 0);
      G.hero = null; G.rift = { level: L }; G.mods = null;
      const st = heroStats(ch);
      const mul = riftMonMul(L, lvl);
      // přibližné DPS: útok × (1 + krit × (krit. násobek − 1)) × rychlost × prvek
      const el = CLASSES[cls].elem, dps = st.atk * (1 + st.crit * (st.critMult - 1)) * st.spd * (st.elemMul[el] || 1) * st.skillMul;
      const crowdHp = 30 * mul.hp * RIFT.crowdHp, eliteHp = 30 * mul.hp * ELITE_MULT.hp, bossHp = 680 * mul.hp;
      const k = 15 + 4 * L, mit = (k / (k + Math.max(0, st.def))) * st.dmgTaken * (st.classDr || 1);
      const hit = 8 * mul.atk * ELITE_MULT.atk * mit;
      out.push({ ehp: st.maxHp / mit, rawDps: dps, cls, L, lvl, atk: Math.round(st.atk), hp: st.maxHp, dps: Math.round(dps), ttkCrowd: +(crowdHp / dps).toFixed(2), ttkElite: +(eliteHp / dps).toFixed(1), ttkBoss: Math.round(bossHp / dps), hitsToDie: +(st.maxHp / hit).toFixed(1), monHp: Math.round(30 * mul.hp) });
    }
  }
  return out;
}
"""

BOT = r"""
(cfg) => {
  const step = (n) => { for (let i = 0; i < n; i++) {
    const h = G.hero;
    if (!h.dead && G.scene === 'rift') {
      let t = null, bd = 1e9;
      if (G.flow) G.monsters.forEach(m => { if (m.dead || m.obj) return; const v = G.flow[Math.floor(m.y/TILE)*G.world.w + Math.floor(m.x/TILE)]; const d = v >= 0 ? v : 999 + dist(m,h)/16; if (d < bd) { bd = d; t = m; } });
      G.touch = true; G.input.keys.clear();
      const near = autoTarget(200);
      G.input.atk = !!near && !G.portal;
      if (!near && t && (!h.path || !h.path.length || Math.random() < 0.03)) h.path = findPath(G.world, h.x, h.y, t.x, t.y) || [{ x: t.x, y: t.y }];
      if (t && dist(t, h) < 120 && !G.portal) { for (let s = 1; s < 6; s++) if (G.char.bar[s] && !skillBlocked(G.char.bar[s]) && Math.random() < 0.3) castSkill(G.char.bar[s], t.x, t.y - 6, t); }
      if (h.hp < G.st.maxHp * 0.4) usePotion();
      if (G.portal) { G.input.atk = false; h.target = null; h.path = findPath(G.world, h.x, h.y, G.portal.x, G.portal.y); }
    }
    update(1/30);
    if (G.scene !== 'rift') return 'town';
  } return 'rift'; };
  G.headless = true;
  const res = [];
  for (const L of cfg.L) {
    const lvl = naturalLevel(L) + (cfg.lvlOff || 0);
    __mkHero(cfg.cls, cfg.race, lvl, L, cfg.branch || 0);
    playChar();
    startRift(L);
    const R = G.rift;
    let state = 'rift', ticks = 0;
    while (state === 'rift' && ticks < cfg.maxTicks) { state = step(300); ticks += 300; }
    res.push({ L, lvl, done: R.done, prog: Math.round(R.progress), time: Math.round(R.time), bossT: R.bossT ? Math.round(R.bossT) : '-', deaths: R.deaths,
      boss: R.boss ? R.boss.name + ' ' + Math.round(R.boss.hp / R.boss.maxHp * 100) + '%' : '-' });
    if (state === 'rift') enterTown();
  }
  return res;
}
"""

async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'table'
    cfg = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate(SETUP)
        if mode == 'fit':
            await pg.evaluate('() => { window.__reps = 4; }')
            rows = await pg.evaluate(TABLE, cfg.get('L', [1, 5, 10, 20, 30, 40, 60, 80, 100, 150, 200, 250, 300, 400]))
            import collections
            agg = collections.defaultdict(list)
            for r in rows: agg[r['L']].append((r['rawDps'], r['ehp']))
            import math
            for L in sorted(agg):
                d = math.exp(sum(math.log(x[0]) for x in agg[L]) / len(agg[L])); e = math.exp(sum(math.log(x[1]) for x in agg[L]) / len(agg[L]))
                print(f"L{L:>4}  dps {d:14.1f}  ehp {e:14.1f}")
        elif mode == 'table':
            rows = await pg.evaluate(TABLE, cfg.get('L', [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300]))
            last = None
            for r in rows:
                if r['cls'] != last: print('\n' + r['cls']); last = r['cls']
                print(f"  L{r['L']:>3} lvl{r['lvl']:>3}  atk {r['atk']:>12,}  hp {r['hp']:>12,}  monHp {r['monHp']:>14,}  TTK dav {r['ttkCrowd']:>6}s elita {r['ttkElite']:>6}s boss {r['ttkBoss']:>5}s  zásahů do smrti {r['hitsToDie']}")
        else:
            cfg.setdefault('maxTicks', 45000); cfg.setdefault('race', 'human')
            for r in await pg.evaluate(BOT, cfg): print(r)
        print('errors', errs[:6]); await b.close()
asyncio.run(main())
