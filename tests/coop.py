# Více hrdinů (příprava na kooperaci): místní hrdina + spoluhráč(i) řízený jednoduchým botem.
# Ověřuje: zesílení nepřátel (+10 % počet, život, poškození za každého dalšího hráče), oddělenou kořist
# a zlato, zkušenosti pro všechny, útoky nepřátel na oba hrdiny, mazlíčky podle majitele, žádné chyby.
# Spuštění: python3 tests/coop.py '{"rifts":3,"start":1,"maxTicks":20000,"mateCls":"warlock","mateRace":"orc"}'
import pathlib, os, asyncio, sys, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)

JS = r"""
(cfg) => {
  G.headless = true;
  // spoluhráč: jde k nejbližšímu nepříteli a útočí, jinak se drží u místního hrdiny (běží v jeho kontextu)
  const ctl = function (dt) {
    const h = G.hero;
    if (G.scene !== 'rift' || h.leap || h.dash) return;
    h.minHp = Math.min(h.minHp || 1, h.hp / G.st.maxHp);
    if (h.hp < G.st.maxHp * 0.4) usePotion();
    const t = nearestMonster(h.x, h.y, 200, m => lineOfSight(G.world, h.x, h.y, m.x, m.y));
    const id = G.char.bar[0], S = SKILLS[id];
    if (t) {
      const range = S.type === 'melee' ? S.range + t.r - 2 : 150;
      if (dist(h, t) > range) moveToward(t.x, t.y, dt, true); else castSkill(id, t.x, t.y - 6, t);
      for (let s = 1; s < 6; s++) if (G.char.bar[s] && !skillBlocked(G.char.bar[s]) && Math.random() < 0.05) castSkill(G.char.bar[s], t.x, t.y - 6, t);
    } else if (dist(h, G.me) > 40) moveToward(G.me.x, G.me.y, dt, true);
    else h.walk = 0;
  };
  const mkMember = (name, race, cls) => {
    const save = { gold: 0, nextUid: 5e8, settings: { autoSell: {} }, stash: [] };
    return { name, char: newChar(name, race, cls, save), save, control: ctl };
  };
  const step = (n) => { for (let i = 0; i < n; i++) {
    const h = G.hero;
    if (!h.dead && G.scene === 'rift') {
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

  const out = { checks: {}, levels: [] };
  const L0 = 6;
  // 1) zesílení: průměrný počet nepřátel a život bosse pro 1, 2 a 3 hráče
  const measure = (party) => {
    G.party = party; let cnt = 0, hp = 0, mhp = 0; const N = 30;
    for (let i = 0; i < N; i++) {
      startRift(L0); cnt += G.monsters.length;
      const sk = G.monsters.find(m => m.type === 'skeleton' && !m.elite); if (sk) mhp = sk.maxHp;
      spawnBoss('colossus'); hp = G.rift.boss.maxHp;
    }
    return { mul: G.partyMul, heroes: G.heroes.length, avgMonsters: Math.round(cnt / N), bossHp: hp, skeletonHp: mhp };
  };
  const a = measure([]), b = measure([mkMember('Kamarád', 'elf', 'hunter')]), c = measure([mkMember('Kamarád', 'elf', 'hunter'), mkMember('Třetí', 'orc', 'warlock')]);
  out.checks.scale = { solo: a, duo: b, trio: c, bossRatio2: +(b.bossHp / a.bossHp).toFixed(3), bossRatio3: +(c.bossHp / a.bossHp).toFixed(3), monsterRatio2: +(b.avgMonsters / a.avgMonsters).toFixed(2), monsterRatio3: +(c.avgMonsters / a.avgMonsters).toFixed(2) };
  // poškození: stejný zásah na hrdinu se 2 hráči = ×1,1
  G.party = []; startRift(1); G.hero.invuln = 0; const r0 = Math.random; Math.random = () => 0.5;
  G.st.dodge = 0; G.st.block = 0; const d1 = hurtHero(100, 'phys', null);
  G.party = [mkMember('Kamarád', 'elf', 'hunter')]; startRift(1); G.hero.invuln = 0; G.st.dodge = 0; G.st.block = 0; const d2 = hurtHero(100, 'phys', null);
  Math.random = r0;
  out.checks.dmg = { solo: d1, duo: d2, ratio: +(d2 / d1).toFixed(2) };

  // oživení spoluhráče u těla: 2 s vedle něj = vstane na místě s polovinou života
  G.party = [mkMember('Kamarád', 'elf', 'hunter')]; startRift(1);
  { const mt = G.heroes[1]; mt.control = null; G.monsters.forEach(m => m.dead = true); G.monsters = [];
    withHero(mt, () => { mt.hp = 1; hurtHero(1e6, 'phys', null); });
    const dead = mt.dead, deadT = mt.deadT, px = mt.x, py = mt.y;
    G.me.x = mt.x + 8; G.me.y = mt.y; G.me.control = null;
    for (let i = 0; i < 70; i++) update(1/30);
    out.checks.revive = { wasDead: dead, deadT, alive: !mt.dead, samePlace: Math.hypot(mt.x - px, mt.y - py) < 1, hpPct: Math.round(mt.hp / mt.st.maxHp * 100) }; }

  // 2) hraní s jedním spoluhráčem
  const mate = mkMember('Kamarád', cfg.mateRace || 'elf', cfg.mateCls || 'hunter');
  G.party = [mate];
  window.__errs = [];
  for (let L = cfg.start; L < cfg.start + cfg.rifts; L++) {
    startRift(L);
    const R = G.rift, comp = G.heroes[1];
    comp.minHp = 1;
    const myGold0 = G.save.gold, mateGold0 = mate.save.gold, myInv0 = G.char.inv.length, mateInv0 = mate.char.inv.length;
    let state = 'rift', ticks = 0, sawOwnerSplit = false, compTargeted = 0, petOwners = true; const heroes = G.heroes.length;
    while (state === 'rift' && ticks < cfg.maxTicks) {
      state = step(150); ticks += 150;
      if (G.loot.some(l => l.owner === comp) && G.loot.some(l => l.owner === G.me)) sawOwnerSplit = true;
      compTargeted = Math.max(compTargeted, G.monsters.filter(m => m.tgt === comp && m.aggro).length);
      if (G.pets.some(p => !G.heroes.includes(p.owner))) petOwners = false;
    }
    out.levels.push({ L, done: R.done, time: Math.round(R.time), heroes,
      me: { lvl: G.char.level, gold: Math.round(G.save.gold - myGold0), inv: G.char.inv.length - myInv0, maxRift: G.char.maxRift },
      mate: { lvl: mate.char.level, gold: Math.round(mate.save.gold - mateGold0), inv: mate.char.inv.length - mateInv0, maxRift: mate.char.maxRift, minHp: Math.round((comp.minHp || 1) * 100), dead: !!comp.dead },
      lootSplit: sawOwnerSplit, maxMonstersOnMate: compTargeted, petOwners, contextOk: G.hero === G.me && G.char === G.me.char });
    if (state === 'rift') enterTown();
    G.char.inv.slice().forEach(it => { const b = bestTarget(it); if (b.slot && b.gain > 0) equipTo(it, b.slot, 'inv'); });
    mate.char.inv = [];
    repairAll();
  }
  // 3) obrázek: rift se dvěma hrdiny
  G.party = [mate]; startRift(cfg.start);
  for (let i = 0; i < 120; i++) update(1/30);
  G.heroes[1].x = G.me.x + 22; G.heroes[1].y = G.me.y + 4;
  out.errs = window.__errs;
  return out;
}
"""

async def main():
    cfg = {"rifts": 3, "start": 1, "maxTicks": 20000, "mateCls": "hunter", "mateRace": "elf"}
    if len(sys.argv) > 1: cfg.update(json.loads(sys.argv[1]))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append('PAGE:' + str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        await pg.evaluate("""(()=>{ G.save.chars.push(newChar('Hráč','human','mage',G.save)); G.save.current=G.save.chars.length-1; playChar(); })()""")
        await pg.wait_for_timeout(300)
        res = await pg.evaluate(JS, cfg)
        print('scale', json.dumps(res['checks']['scale'], ensure_ascii=False))
        print('dmg', res['checks']['dmg'])
        print('revive', res['checks']['revive'])
        for l in res['levels']: print(json.dumps(l, ensure_ascii=False))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS + '/coop.png')
        print('errors', errs[:8]); await b.close()
asyncio.run(main())
