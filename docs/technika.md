# Technika

## Engine
- Plátno (canvas) s logickým rozlišením 460 × 260 (na nízkých obrazovkách 196 na výšku), zvětšuje se pixelově.
- Dlaždice 16 px, světelná vrstva (pochodně, tma podle tématu).
- Pohyb nepřátel přes BFS flow field (`flowField`), hledání cest pro hrdinu (`findPath`).
- Herní smyčka `update(dt)` v `js/engine.js`. Režim `G.headless` slouží pro testy.
- Seznamy, do kterých během zpracování přibývají nové položky (střely, nebezpečí, plochy), se procházejí přes `filterKeepNew(key, fn)` – jinak se nově vzniklé položky ztratí (chyba úlomků Ledové koule do 1.7.0).
- Více hrdinů (od 1.7.0): `G.heroes`, `G.me`, přepínání kontextu `withHero(h, fn)` – podrobně v `docs/kooperace.md`. Při úpravách kódu: nové střely, plochy, pasti a mazlíčky hrdiny označit `owner: G.hero`; co zasahuje hrdinu plošně, projít přes `eachHero`.
- Zvuky se syntetizují přes WebAudio (`js/sfx.js`), žádné zvukové soubory.

## Ukládání (`js/save.js`)
- `localStorage` klíč `wd_save`, `SAVE_VERSION = 5`.
- Obsah: postavy, sdílené zlato a truhla, nastavení.
- Export/import kódem `WD5:…` (base64 JSON) – tak si hráč přenese postavy mezi zařízeními.
- **Migrace** v `migrateSave`:
  - verze < 5 (idle 0.x) začíná nově, zlato zůstane;
  - `talentVer 2` vrátí body po přestavbě stromů;
  - `sellFix103` jednou vypne automatický prodej;
  - lišta se doplní na 8 pozic (v1.15, `migrateSave`);
  - `resCap14` (u postavy i u uložení) jednou ořízne odolnosti předmětů na 10 % na živel;
  - `talentVer 3` (1.13.0) vrátí body po rebalancu a přidání rasových stromů;
  - `classItems12` (u postavy) přesune nasazené legendárky a sety, které třída už nesmí nosit, do batohu (nebo truhly).
- Když se mění struktura uložení, vždy přidat migraci, aby kamarádům nezmizely postavy.

## Ikony předmětů
- `js/item-icons.js` generuje `tools/gen-item-icons.js` z balíčku `@iconify-json/game-icons` (`npm i @iconify-json/game-icons`, pak `NODE_PATH=<node_modules> node tools/gen-item-icons.js`). Mapování typ předmětu → ikona je v tom skriptu.
- Pixelové ikony 12×12 (`ICONS` v `js/sprites.js`) zůstávají jen pro předměty ležící na zemi v podzemí.

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
| `tests/regen.py` | obnova v boji/mimo boj, lahvička many (padání z elit, sebrání) |
| `tests/spellbook.py` | Kniha dovedností (klik, tažení, přesun, odebrání), řádky lišty, klávesy 1–9 a Shift, migrace lišty, mobil (dvě klepnutí, dva kruhy) |
| `tests/portal.py` | portál po bossovi se ptá (Do města / Zůstat, Enter), PC i mobil |
| `tests/visuals.py` | ikony předmětů, očarování a sety, mýtický tier (padání, efekty 3/6 dílů, snímky inventáře a podzemí), trpasličí úchop |
| `tests/racecls.py`, `autosell.py`, `shrine.py` | omezení rasa/třída, automatický prodej, svatyně |
| `tests/bossfight.py` | souboje s každým bossem dvěma styly – „stand“ (jen stojí) a „dodge“ (uhýbá); vypíše čas, smrti, lektvary. Volba `dbg` vypíše poškození podle útoků |
| `tests/bosses_shots.py` | snímky všech bossů (nástup, velký útok, 2. fáze); `mobile` = telefon na výšku |
| `tests/coop.py` | více hrdinů: zesílení nepřátel, XP a kořist zvlášť, útoky na spoluhráče, mazlíčci podle majitele (spoluhráče řídí bot) |
| `tests/riftsel.py` | výběr riftu u obelisku (nejvyšší, poslední, libovolný), snímky počítač/mobil |
| `tests/npcwin.py` | město: okno objektu se otevře přiblížením a zavře odchodem (klávesy, joystick), ruční zavření, klik na postavu |
| `tests/vendor.py` | obchodník: ceny obnovení a vylepšení, uložení zboží, nové zboží po podzemí, statistika rarit, snímky počítač/mobil |
| `tests/rebalance.py` | rebalanc 1.13: rysy ras a tříd, rasové dovednosti a stromy (kostlivci, stín, kamenná podoba…), nové mechaniky talentů, rozdíl úrovní |
| `tests/balance.py` | balanc: `table` = síla hrdiny vs. nepřátelé po podzemích, `fit` = podklady pro křivky v `js/data.js`, `bot` = bot se syntetickou postavou (úroveň a výbava podle podzemí) |
| `tests/items.py` | atributy, váha zbroje, legendárky a sety podle tříd, chytrá kořist, migrace, snímky okna postavy |

## Hra více hráčů – testy a provoz
- `js/net.js` + `js/lib/peerjs.min.js`. Prohlížeče se spojují přes bezplatný server PeerJS (`0.peerjs.com`) a jeho TURN servery. Hra sama žádný server nemá.
- Test přes skutečné WebRTC: `python3 tests/net.py '{"secs":110}'` – spustí lokální server PeerJS (`tests/peer_server.js`, potřebuje `npm install peer`) a stránku přes `http.server`; hra se otevře s `?peer=127.0.0.1:9000`. Tři okna (počítač, mobil na šířku, mobil na výšku). Snímky `net_*.png`.
- Pokud `peer` není nainstalovaný globálně, spustit s `NODE_PATH=<složka>/node_modules`.

## Nasazení
- GitHub Pages z větve `main`, složka `/ (root)`. Soubor `.nojekyll` vypíná zpracování Jekyllem.
- Po pushi se hra aktualizuje během 1–2 minut. Hráčům stačí obnovit stránku.
- Uložené postavy jsou vázané na adresu stránky. Při změně adresy by si je hráči museli přenést exportním kódem.

## Verze
- Číslo verze je v `GAME_VERSION` (`js/data.js`) a historie v `README.md`.
- Malé opravy zvyšují poslední číslo (1.1.6 → 1.1.7), nové systémy prostřední (1.2.0).

## Licence
Ikony z game-icons.net (Lorc, Delapouite a další), CC BY 3.0. Uvedeno v legendě hry, v README a v patičce kalkulačky.
