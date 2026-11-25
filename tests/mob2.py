import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
SETUP="(()=>{ G.touch=true; G.save.chars.push(newChar('M','human','mage',G.save)); G.save.current=0; playChar(0); G.char.level=8; invalidate(); startRift(2); })()"
async def run(p, name, w, h):
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':w,'height':h}, has_touch=True, is_mobile=True, device_scale_factor=2)
    errs=[]; pg.on('pageerror', lambda e: errs.append('PAGE:'+str(e)))
    await pg.goto(GAME); await pg.wait_for_timeout(300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(800)
    await pg.screenshot(path=SHOTS + f'/m_{name}_game.png')
    # naučit fireball přes talenty a zkontrolovat dotyková tlačítka
    await pg.evaluate("showTalents()"); await pg.wait_for_timeout(200)
    await pg.evaluate("(()=>{ const n=talentNodes('mage').find(n=>n.skill==='fireball'); learnTalent(n.id); confirmTalents(); })()"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=SHOTS + f'/m_{name}_tal.png')
    x=await pg.query_selector('.modal-x'); vis=await x.is_visible() if x else False
    await pg.evaluate("document.getElementById('modal-box').scrollTop=2000"); await pg.wait_for_timeout(100)
    bb=await x.bounding_box()
    await pg.screenshot(path=SHOTS + f'/m_{name}_tal_scrolled.png')
    await x.tap(); await pg.wait_for_timeout(200)
    glyphs=await pg.evaluate("[...document.querySelectorAll('#tbtns .tb.skill')].map(b=>b.innerText.trim())")
    print(name, 'X visible', vis, 'X pos after scroll', bb and (round(bb['x']),round(bb['y'])), 'modal open', await pg.evaluate("modalOpen()"), 'touch glyphs', glyphs)
    # překryvy prvků
    ov=await pg.evaluate("""(()=>{ const r=s=>{const e=document.querySelector(s); if(!e||e.offsetParent===null&&getComputedStyle(e).position!=='fixed') return null; const b=e.getBoundingClientRect(); return b.width?b:null;};
      const els={hp:'.orb.hp',res:'#res-orb',top:'#top-center',mini:'#minimap',btns:'.hud-btns'}; document.querySelectorAll('#tbtns .tb').forEach((e,i)=>e.id='tb'+i);
      document.querySelectorAll('#tbtns .tb').forEach((e,i)=>els['tb'+i]='#tb'+i); els.joy='#joy-base';
      const B={}; for(const k in els){ const b=r(els[k]); if(b) B[k]=b; }
      const out=[]; const ks=Object.keys(B); for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const a=B[ks[i]],c=B[ks[j]]; if(a.left<c.right-2&&c.left<a.right-2&&a.top<c.bottom-2&&c.top<a.bottom-2) out.push(ks[i]+'×'+ks[j]); }
      const off=ks.filter(k=>B[k].left<0||B[k].top<0||B[k].right>innerWidth||B[k].bottom>innerHeight);
      return {overlaps:out, offscreen:off}; })()""")
    print(name, ov)
    await pg.screenshot(path=SHOTS + f'/m_{name}_after.png')
    print(name, 'errors', errs); await b.close()
async def main():
    async with async_playwright() as p:
        for n,w,h in [('portrait',412,860),('land',860,390),('landsmall',740,340)]: await run(p,n,w,h)
asyncio.run(main())
