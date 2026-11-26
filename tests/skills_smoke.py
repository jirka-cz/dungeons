import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
JS = r"""
(() => {
  const out = [];
  G.headless = true;
  const run = (n) => { for (let i = 0; i < n; i++) update(1/30); };
  const spawnRing = (k, hp) => { const h = G.hero; for (let i = 0; i < k; i++) { const a = i / k * 6.28; const p = nearestFree(G.world, h.x + Math.cos(a) * 30, h.y + Math.sin(a) * 30, 5); const m = spawnMonster('zombie', p.x, p.y); m.hp = m.maxHp = hp || 400; m.aggro = true; } };
  for (const cls of ['warrior','mage','warlock','hunter','druid']) {
    G.save.chars = [newChar('T', cls === 'druid' ? 'elf' : 'orc', cls, G.save)]; G.save.current = 0; playChar(0);
    G.char.level = 60;
    talentNodes(talentKey(G.char)).forEach(n => { if (n.type === 'skill') G.char.talents[n.id] = 1; });
    invalidate(); startRift(3); G.monsters.forEach(m => m.dead = true); G.monsters = [];
    G.st = heroStats();
    for (const id of knownSkills(G.char)) {
      G.monsters.forEach(m => m.dead = true); G.monsters = []; G.projs = []; G.zones = [];
      const h = G.hero; h.res = 999; h.cds = {}; h.castLock = 0; h.atkCd = 0; h.hp = G.st.maxHp; h.buffs = []; invalidate(); G.st = heroStats();
      spawnRing(6);
      const t = G.monsters[0];
      const hpBefore = G.monsters.reduce((s, m) => s + m.hp, 0), pets0 = G.pets.length, hp0 = h.hp, res0 = h.res;
      const ok = castSkill(id, t.x, t.y - 6, t);
      run(90);
      const hpAfter = G.monsters.reduce((s, m) => s + (m.dead ? 0 : m.hp), 0);
      const S = SKILLS[id];
      const eff = [];
      if (hpAfter < hpBefore) eff.push('dmg ' + Math.round(hpBefore - hpAfter));
      if (G.pets.length > pets0) eff.push('pets +' + (G.pets.length - pets0));
      if (h.buffs.length) eff.push('buffs ' + h.buffs.map(b => b.id).join('/'));
      if (G.traps.length) eff.push('traps ' + G.traps.length);
      if (S.type === 'tap') eff.push('hp ' + Math.round(hp0) + '->' + Math.round(h.hp));
      out.push(`${cls} ${id} (${S.type}) cast=${ok} ${eff.join(', ') || 'ŽÁDNÝ EFEKT'}`);
    }
  }
  return out.join('\n');
})()
"""
MECH = r"""
(() => {
  const out = []; G.headless = true;
  const run = n => { for (let i = 0; i < n; i++) update(1/30); };
  const setup = (cls, talents) => { G.save.chars = [newChar('T','orc',cls,G.save)]; G.save.current=0; playChar(0); G.char.level=60; Object.assign(G.char.talents, talents); invalidate(); startRift(2); G.monsters.forEach(m=>m.dead=true); G.monsters=[]; G.st=heroStats(); };
  const mon = (dx, hp) => { const h=G.hero; const p=nearestFree(G.world,h.x+dx,h.y,5); const m=spawnMonster('zombie',p.x,p.y); m.hp=m.maxHp=hp||500; return m; };
  // rozzuření stále
  setup('warrior', {'fury.K1':1}); run(5); out.push('enrageAlways: ' + G.hero.buffs.some(b=>b.id==='enrage') + ' spd ' + G.st.spd.toFixed(2));
  // dvě zbraně: podmíněný bonus
  setup('warrior', {'fury.M1':3}); const w2 = makeItem(10,'green',G.save.nextUid++,'weapon','warrior'); while (itemHand(w2)!==1) Object.assign(w2, makeItem(10,'green',G.save.nextUid++,'weapon','warrior'));
  const before = heroStats().spd; G.char.equip.off = w2; invalidate(); out.push('dw_spdPct: ' + before.toFixed(3) + ' -> ' + heroStats().spd.toFixed(3) + ' dw=' + gearConds(G.char).dw);
  // tříštění
  setup('mage', {'frost.K1':1}); const a = mon(20, 5), b2 = mon(30, 500); stunMonster(a, 3, 'freeze'); const hb = b2.hp; heroHit(a, 5, 'frost'); out.push('shatter: neighbour hp ' + hb + ' -> ' + Math.round(b2.hp));
  // nákazlivost
  setup('warlock', {'aff.K2':1}); const c1 = mon(20, 5), c2 = mon(40, 500); applyDot(c1,'agony','shadow',10,8); heroHit(c1, 9, 'shadow'); out.push('dotSpread: c2 dots ' + Object.keys(c2.dots).join(','));
  // manový štít
  setup('mage', {}); G.hero.res = 100; G.hero.buffs.push({id:'mshield', stats:{manaShield:0.6}, t:10}); invalidate(); G.st=heroStats(); const hp0=G.hero.hp; hurtHero(20,'phys',null); out.push('manaShield: hp -' + Math.round(hp0-G.hero.hp) + ' res ' + Math.round(G.hero.res));
  // osamělý vlk
  setup('hunter', {'mm.Ph':1}); out.push('loneWolf pets: ' + G.pets.length + ' atkPct ' + G.st.mods.atkPct.toFixed(2));
  setup('hunter', {}); out.push('bez osamělého vlka pets: ' + G.pets.length);
  // zatmění
  setup('druid', {'balance.Pc':2}); const t1 = mon(40, 99999); for (let i=0;i<9;i++){ G.hero.atkCd=0; G.hero.castLock=0; castSkill('wrath', t1.x, t1.y, t1); } out.push('eclipse buff: ' + G.hero.buffs.some(b=>b.id==='eclipse'));
  // podoba + podmíněný bonus
  setup('druid', {'feral.S2':1, 'feral.Pc':2}); const d0 = heroStats().def; G.hero.res=99; castSkill('bear', G.hero.x+10, G.hero.y); out.push('bear_def: ' + d0.toFixed(1) + ' -> ' + G.st.def.toFixed(1));
  // aura hurikánu
  setup('druid', {'balance.S5':1}); const t2 = mon(20, 9999); G.hero.res=99; castSkill('hurricane', t2.x, t2.y); run(60); out.push('hurricane aura dmg: ' + Math.round(9999 - t2.hp));
  // zranitelnost
  setup('warrior', {'arms.S4':1}); const t3 = mon(18, 99999); G.hero.res=99; castSkill('smash', t3.x, t3.y, t3); out.push('vuln: ' + (t3.vulnT>0));
  // past mrazivá
  setup('hunter', {'core.CS3':1}); G.hero.res=99; const t4 = mon(60, 9999); castSkill('ftrap', t4.x, t4.y, t4); run(5); t4.x = G.traps[0].x+3; t4.y = G.traps[0].y; run(30); out.push('ftrap freeze: ' + (t4.stunKind) + ' ' + (t4.stunT>0));
  // primCount + primPierce
  setup('mage', {'core.Ca':1}); const t5 = mon(60, 99999); G.hero.atkCd=0; castSkill('missile', t5.x, t5.y, t5); out.push('primCount projs: ' + G.projs.length);
  // cdr + skillCost
  setup('warrior', {'arms.S1':1,'arms.S2':1,'arms.S2c':2}); out.push('skillCost cleave: ' + skillCost('cleave') + ' cd ' + skillParams('cleave', G.st).cd);
  // petSpd + petLs
  setup('hunter', {'bm.K2':1}); out.push('petSpd ' + G.st.petSpd + ' petLs ' + G.st.petLs);
  return out.join('\n');
})()
"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
        await pg.goto(GAME); await pg.wait_for_timeout(300)
        print(await pg.evaluate(JS))
        print('---'); print(await pg.evaluate(MECH))
        print('errors', errs); await b.close()
asyncio.run(main())
