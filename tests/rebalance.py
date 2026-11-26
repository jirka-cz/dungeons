"""Mechaniky rebalancu 1.13: rysy ras a tříd, rasové dovednosti a talenty, nové mechaniky talentů, rozdíl úrovní.
Vypíše řádky OK / CHYBA. Spuštění: python3 tests/rebalance.py"""
import pathlib, asyncio
from playwright.async_api import async_playwright
GAME = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()

JS = r"""
() => {
  const out = []; G.headless = true;
  const ok = (name, cond, info) => out.push((cond ? 'OK     ' : 'CHYBA  ') + name + (info !== undefined ? '  (' + info + ')' : ''));
  const run = n => { for (let i = 0; i < n; i++) update(1/30); };
  const setup = (race, cls, talents, L) => {
    G.save.chars = [newChar('T', race, cls, G.save)]; G.save.current = 0; playChar(0);
    G.char.level = 60; Object.assign(G.char.talents, talents || {}); invalidate();
    startRift(L || 2); G.monsters.forEach(m => m.dead = true); G.monsters = []; G.pets = G.pets.filter(p => p.classPet); G.st = heroStats();
    G.hero.hp = G.st.maxHp; G.hero.res = 999;
    return G.hero;
  };
  const mon = (dx, hp, dy) => { const h = G.hero; const p = nearestFree(G.world, h.x + dx, h.y + (dy || 0), 5); const m = spawnMonster('zombie', p.x, p.y); m.hp = m.maxHp = hp || 500; m.aggro = true; return m; };
  const cast = (id, t) => { const h = G.hero; h.cds = {}; h.castLock = 0; h.atkCd = 0; return castSkill(id, t ? t.x : h.x + 30, t ? t.y - 6 : h.y, t); };

  // --- rasy: pohyb a odolnost ---
  setup('dwarf', 'warrior'); const msDw = G.st.moveSpeed, hpDw = G.st.maxHp;
  setup('elf', 'hunter'); const msElf = G.st.moveSpeed, dodgeElf = G.st.dodge;
  setup('human', 'warrior'); const msHu = G.st.moveSpeed;
  ok('trpaslík je pomalejší než člověk a elf rychlejší', msDw < msHu && msElf > msHu * 1.1, `trp ${msDw.toFixed(1)} člo ${msHu.toFixed(1)} elf ${msElf.toFixed(1)}`);
  ok('elf má úhyb', dodgeElf >= 0.08, dodgeElf);

  // --- třídy: válečník Železná kůže ---
  setup('human', 'warrior'); const dtW = G.st.dmgTaken; setup('human', 'mage'); const dtM = G.st.dmgTaken;
  ok('válečník dostává o 25 % méně', Math.abs(dtW / dtM - 0.75) < 0.01, `${dtW} vs ${dtM}`);

  // mág: bariéra pohltí zásah
  let h = setup('human', 'mage'); run(5); const bar0 = h.barrier, hp0 = h.hp; hurtHero(G.st.maxHp * 0.05, 'phys', null);
  ok('mág: bariéra pohltí poškození', bar0 > 0 && h.hp === hp0 && h.barrier < bar0, `bariéra ${Math.round(bar0)} → ${Math.round(h.barrier)}`);
  G.time += 6; run(30); ok('mág: bariéra se obnoví po 5 s', h.barrier >= bar0 * 0.99, Math.round(h.barrier));

  // černokněžník: kletby léčí
  h = setup('orc', 'warlock'); h.hp = G.st.maxHp * 0.5; const m1 = mon(40, 1e6); applyDot(m1, 'x', 'shadow', G.st.atk * 5, 8); const hpW = h.hp; run(70);
  ok('černokněžník: DoT léčí', h.hp > hpW, `${Math.round(hpW)} → ${Math.round(h.hp)}`);

  // lovec: poškození roste se vzdáleností
  h = setup('human', 'hunter'); const near = mon(30, 1e6), far = mon(200, 1e6); near.x = h.x + 30; near.y = h.y; far.x = h.x + 220; far.y = h.y;
  G.st.crit = 0; let dN = 0, dF = 0; for (let i = 0; i < 30; i++) { dN += heroHit(near, 1, 'phys', { noProc: true }); dF += heroHit(far, 1, 'phys', { noProc: true }); }
  ok('lovec: vzdálený cíl dostane víc', dF > dN * 1.08, `${dN} vs ${dF}`);

  // druid: drápy v medvědí podobě, dvě střely v měsíční, proměna léčí
  h = setup('elf', 'druid', { 'feral.S2': 1, 'balance.S4': 1 }); h.hp = G.st.maxHp * 0.5; const hpD = h.hp;
  cast('bear'); ok('druid: proměna léčí', h.hp > hpD); ok('druid: v medvědovi útočí drápy', effSkill('wrath') === 'claw');
  h.buffs = []; invalidate(); G.st = heroStats(); cast('moonkin'); G.projs = []; const tg = mon(60, 1e6); cast('wrath', tg);
  ok('druid: v měsíční podobě Hněv dvakrát', G.projs.filter(p => p.skill === 'wrath').length === 2, G.projs.length);

  // --- rasové dovednosti ---
  h = setup('human', 'warrior', { 'race.R1': 1, 'race.R1e': 1 }); h.frozen = 3; h.hp = G.st.maxHp * 0.5; const hpH = h.hp;
  ok('člověk: Lidská vůle jde použít ve zmrazení', cast('hwill') && h.frozen <= 0); ok('člověk: Neochvějná vůle léčí', h.hp > hpH);

  h = setup('dwarf', 'warrior', { 'race.R1': 1, 'race.R1e': 1, 'race.R1c': 2 }); cast('stoneform');
  ok('trpaslík: Kamenná podoba snižuje poškození', G.st.dmgTaken < 0.5, G.st.dmgTaken.toFixed(2));
  const q = mon(30, 1e6); h.buffs.find(b => b.id === 'stoneform').t = 0.01; run(3);
  ok('trpaslík: Otřes na konci podoby', q.hp < q.maxHp && q.stunT > 0, Math.round(q.maxHp - q.hp));

  h = setup('elf', 'hunter', { 'race.R1': 1 }); const e1 = mon(25, 1e6); run(10); cast('shadowmeld');
  const hpE = h.hp; run(60); ok('elf: ve stínu na něj nepřátelé neútočí', h.hp >= hpE && h.stealth > 0, Math.round(hpE - h.hp));
  G.projs = []; cast('shot', e1); run(20); ok('elf: útok ze stínu je silný', e1.maxHp - e1.hp > G.st.atk * 1.6, Math.round(e1.maxHp - e1.hp));

  h = setup('orc', 'warrior'); const o1 = mon(20, 1e6); G.st.crit = 0;
  const avg = () => { let t = 0; for (let i = 0; i < 30; i++) t += heroHit(o1, 1, 'phys', { noProc: true }); return Math.round(t / 30); };
  const dFull = avg(); h.hp = G.st.maxHp * 0.3; const dLow = avg();
  ok('ork: pod 50 % života silnější', dLow > dFull * 1.1, `${dFull} vs ${dLow}`);

  h = setup('undead', 'warlock', { 'race.R1': 1, 'race.R1e': 1, 'race.R1c': 2, 'race.R3': 1 }); cast('raise');
  ok('nemrtvý: Povstání vyvolá 3 kostlivce (s talentem)', skeletonsOf(h).length === 3, skeletonsOf(h).length);
  ok('nemrtvý: jeden je kostěný mág', skeletonsOf(h).some(p => p.type === 'skelmage'));
  cast('raise'); ok('nemrtvý: nejvýš 4 kostlivci', skeletonsOf(h).length === 4, skeletonsOf(h).length);
  const hpU = h.hp; hurtHero(100, 'phys', null); const lostU = hpU - h.hp;
  ok('nemrtvý: Kostěný štít snižuje poškození', lostU < 100 * G.st.dmgTaken * 1.1 * 0.95, Math.round(lostU));
  h = setup('undead', 'warrior', { 'race.R2': 1, 'race.K1': 1 }); let raised = 0;
  for (let i = 0; i < 40; i++) { const z = mon(30, 1); heroHit(z, 5, 'phys'); } raised = skeletonsOf(h).length;
  ok('nemrtvý: Vzkříšení padlých (25 %)', raised >= 3 && raised <= 7, raised);

  // --- nové mechaniky talentů ---
  h = setup('human', 'hunter', { 'mm.S4': 1 }); mon(80, 1e6); mon(-80, 1e6); cast('strafe'); G.projs = []; run(8);
  ok('lovec: Palba za běhu střílí sama', G.projs.filter(p => p.skill === 'strafe').length >= 1, G.projs.length);
  h = setup('human', 'hunter', { 'core.Cc': 1 }); G.traps = []; cast('vault'); ok('lovec: Úskok nechá past', G.traps.length === 1);
  h = setup('human', 'mage', { 'core.Cc': 1 }); const fz = mon(20, 1e6); cast('blink'); ok('mág: Teleport zmrazí okolí', fz.stunT > 0 && fz.stunKind === 'freeze');
  h = setup('human', 'mage', { 'frost.K2': 1 }); const fa = mon(15, 1e6); hurtHero(10, 'phys', fa); ok('mág: Ledová zbroj zmrazí útočníka', fa.stunT > 0);
  h = setup('orc', 'warrior', { 'arms.S3': 1, 'arms.K1': 1 }); const ex = mon(20, 1000); ex.hp = 150; cast('execute', ex); ok('válečník: Popravčí zabije pod 20 %', ex.dead);
  h = setup('orc', 'warrior', { 'fury.S2': 1, 'fury.S2c': 2 }); const pw = mon(55, 1e6); const d0 = dist(pw, h); cast('whirl', pw); run(20);
  ok('válečník: Bouře ocele vtahuje', dist(pw, h) < d0 - 5, `${d0.toFixed(0)} → ${dist(pw, h).toFixed(0)}`);

  // --- rozdíl úrovní ---
  h = setup('human', 'warrior', {}, 100); G.char.level = 50; invalidate(); G.st = heroStats();
  ok('rozdíl úrovní: o 30 níž = víc poškození', G.st.gap > 2, G.st.gap.toFixed(2));
  G.char.level = 95; invalidate(); G.st = heroStats(); ok('rozdíl úrovní: nad doporučenou slabší nepřátelé', G.st.gap < 1, G.st.gap.toFixed(2));
  ok('doporučená úroveň 250 → 200, 350 → 280', recLevel(250) === 200 && recLevel(350) === 280);
  ok('čísla bez nesmyslu: život v podzemí 500 < 10^9', riftHpMul(500) < 1e9, fmtBig(riftHpMul(500)));
  return out.join('\n');
}
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(400)
        print(await pg.evaluate(JS))
        print('chyby stránky:', errs[:5]); await b.close()
asyncio.run(main())
