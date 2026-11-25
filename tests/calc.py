import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'index.html').as_uri()
CALC = (ROOT / 'kalkulacka' / 'index.html').as_uri()
SHOTS = os.environ.get('WD_SHOTS', '/tmp/wd-shots'); os.makedirs(SHOTS, exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,vp in [('desk',{'width':1500,'height':950}),('mob',{'width':412,'height':860})]:
            pg=await b.new_page(viewport=vp, device_scale_factor=1 if name=='desk' else 2)
            errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(CALC); await pg.wait_for_timeout(300)
            # naučit pár uzlů dvojklikem
            for id in ['fury.S1','fury.Pa','fury.Pa','fury.S1e','fury.Pb','fury.S2','core.Cb']:
                if name=='mob' and id.startswith('core'): await pg.click('[data-tab="0"]')
                await pg.click(f'[data-id="{id}"]'); await pg.click('.pm .pp')
            if name=='mob': await pg.click('[data-tab="1"]')
            await pg.click('[data-id="fury.S1c#1"]'); await pg.click('.pm .pp')
            await pg.click('[data-id="fury.S1"]')
            await pg.fill('#q', 'rozzu')
            await pg.wait_for_timeout(200)
            await pg.screenshot(path=SHOTS + f'/calc_{name}.png', full_page=(name=='desk'))
            print(name, 'free', await pg.inner_text('#free'), 'errors', errs)
        await b.close()
asyncio.run(main())
