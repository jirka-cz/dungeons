# Technika

## Engine
- Plátno (canvas) s logickým rozlišením 460 × 260 (na nízkých obrazovkách 196 na výšku), zvětšuje se pixelově.
- Dlaždice 16 px, světelná vrstva (pochodně, tma podle tématu).
- Pohyb nepřátel přes BFS flow field (`flowField`), hledání cest pro hrdinu (`findPath`).
- Herní smyčka `update(dt)` v `js/engine.js`. Režim `G.headless` slouží pro testy.
- Zvuky se syntetizují přes WebAudio (`js/sfx.js`), žádné zvukové soubory.

## Ukládání (`js/save.js`)
- `localStorage` klíč `wd_save`, `SAVE_VERSION = 5`.
- Obsah: postavy, sdílené zlato a truhla, nastavení.
- Export/import kódem `WD5:…` (base64 JSON) – tak si hráč přenese postavy mezi zařízeními.
- **Migrace** v `migrateSave`:
  - verze < 5 (idle 0.x) začíná nově, zlato zůstane;
  - `talentVer 2` vrátí body po přestavbě stromů;
  - `sellFix103` jednou vypne automatický prodej;
  - `resCap14` (u postavy i u uložení) jednou ořízne odolnosti předmětů na 10 % na živel;
  - `classItems12` (u postavy) přesune nasazené legendárky a sety, které třída už nesmí nosit, do batohu (nebo truhly).
- Když se mění struktura uložení, vždy přidat migraci, aby kamarádům nezmizely postavy.

## Testy (`tests/`)
Předpoklady: Node.js a Python s Playwrightem (`pip install playwright` a `python3 -m playwright install chromium`). Spouštět z kořene repozitáře. Snímky obrazovky jdou do `/tmp/wd-shots` (jiné místo nastaví proměnná `WD_SHOTS`).

| Test | Co ověřuje |
|---|---|
| `node tests/validate_talents.js` | všechny talenty, klíče statů a dovednosti existují a jsou implementované |
| `tests/bot.py` | automatický hráč projde rifty, vypíše časy, smrti, chyby. Spouští se s JSON: `python3 tests/bot.py '{"cls":"mage","race":"human","start":1,"rifts":6,"maxTicks":30000,"branch":0}'` |
| `tests/skills_smoke.py` | každá dovednost má účinek |
| `tests/talents_ui.py`, `talents_mob.py`, `draft.py`, `land_tal.py` | okno talentů na počítači a mobilu, +/−, potvrzení, rozložení na šířku |
| `tests/calc.py` | kalkulačka talentů |
| `tests/controls.py`, `czkeys.py` | ovládání, česká klávesnice, recall |
| `tests/mobauto.py`, `mob2.py` | dotykové ovládání a automatický útok |
| `tests/flows.py`, `panels.py` | průchod menu a okny |
| `tests/racecls.py`, `autosell.py`, `shrine.py` | omezení rasa/třída, automatický prodej, svatyně |
| `tests/items.py` | atributy, váha zbroje, legendárky a sety podle tříd, chytrá kořist, migrace, snímky okna postavy |

## Nasazení
- GitHub Pages z větve `main`, složka `/ (root)`. Soubor `.nojekyll` vypíná zpracování Jekyllem.
- Po pushi se hra aktualizuje během 1–2 minut. Hráčům stačí obnovit stránku.
- Uložené postavy jsou vázané na adresu stránky. Při změně adresy by si je hráči museli přenést exportním kódem.

## Verze
- Číslo verze je v `GAME_VERSION` (`js/data.js`) a historie v `README.md`.
- Malé opravy zvyšují poslední číslo (1.1.6 → 1.1.7), nové systémy prostřední (1.2.0).

## Licence
Ikony z game-icons.net (Lorc, Delapouite a další), CC BY 3.0. Uvedeno v legendě hry, v README a v patičce kalkulačky.
