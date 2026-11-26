# Rozšiřování hry: nové rasy, třídy, typy zbraní a předmětů

Návod pro AI. Jirka bude postupně přidávat nové rasy, třídy a typy zbraní (případně zbroje). Každá novinka musí dostat **i vzhled**, ne jen data. Tady je kompletní seznam míst v kódu a pravidla, jak má vzhled vypadat.

## Jak postupovat
1. Přečti tento dokument a dokument tématu (`docs/postavy.md`, `docs/predmety.md`).
2. **Vzhled navrhni dřív, než ho zapracuješ.** Udělej náhled (HTML → snímek přes Playwright) se 2–4 variantami a nech Jirku vybrat. Takhle vznikly současné ikony (kola návrhů v chatu „vybavení a atributy“, listopad 2026): Jirka vybírá vylučovací metodou, nejdřív hrubý styl, pak detaily.
3. Zapracuj, spusť testy (hlavně `tests/visuals.py`, `tests/items.py`, `tests/racecls.py`, `node tests/validate_talents.js`), udělej snímky PC i mobilu a podívej se na ně.
4. Aktualizuj dokumentaci a tento seznam, pokud přibylo nové místo v kódu.

## Pravidla vzhledu (rozhodnuto, neměnit bez dotazu)
| Co | Jak to vypadá | Kde v kódu |
|---|---|---|
| Ikona předmětu | hladký **bílý** symbol z game-icons.net (ne pixel art), jeden symbol na typ | `tools/gen-item-icons.js` → `js/item-icons.js` (`ITEM_GI`) |
| Dlaždice | styl **C1**: pozadí prosvícené barvou rarity + rámeček v barvě rarity, legendární a diamantové jemně září | `iconCell`, `itemTileInner` v `js/ui.js`, `.cell.rar` v `css/style.css` |
| Očarování | styl **O1**: kulatý znak živlu vpravo dole | `ENCHANTS`, `itemEnchant` v `js/items.js` |
| Set | styl **S1**: čtvercový znak setu v jeho barvě vlevo nahoře | `color`, `glyph` v `SETS` |
| Mýtický | styl **E2**: bez rámečku, animovaný ohnivý prstenec, rudě žhnoucí ikona; 3 díly = planoucí oči, 6 = hořící postava | `mythicFire` v `js/ui.js`, `startDollFx`, `drawHero` v `js/engine.js` |
| Postavy | **pixel art 16×16** (portréty zůstávají pixelové) | `SPRITES` v `js/sprites.js` |
| Předmět na zemi | malá pixelová ikona 12×12 + světelný sloup podle rarity | `ICONS` v `js/sprites.js`, `engine.js` (kořist) |

Výběr ikony z game-icons.net: ikona musí být poznat i na 40 px. Pozor na směr (šíp musí mířit **od** střelce, kladivo má **tupou** hlavu). Kandidáty vyrenderuj vedle sebe a vyber nejčitelnější; když si nejsi jistý, dej Jirkovi 2–3 na výběr. Knihovna: `npm i @iconify-json/game-icons` (obsahuje všech ~4100 ikon).

## Nový typ zbraně (nebo druhé ruky)
1. `js/items.js` → `ITEM_TYPES`: `noun: 'Jméno:rod'` (m/f/n/p kvůli koncovkám přídavných jmen), `icon` (pixelová ikona na zemi – nový klíč v `ICONS`, nebo existující podobný), `hand: 1|2`, případně `base`.
2. `js/items.js` → `ITEM_KINDS.weapon.types` (nebo `offhand.types`).
3. `js/items.js` → `WEAPON_INSTR` (7. pád: „s kopím“) a `WEAPON_SUF` (přípona jména: „kopiníka“) – bez nich nefunguje bonus „+X % poškození s …“. Netýká se druhé ruky (štít, kniha).
4. Obouruční zbraň na blízko → přidat do `TITAN_GRIP_TYPES` (dvě v rukou: trpaslík, talent Titánský stisk). Střelná nebo kouzelnická obouruční zbraň tam nepatří.
5. `js/classes.js` → `weapons` u tříd, které ji smí nosit (případně `starter`).
6. **Ikona:** do `ITEM` v `tools/gen-item-icons.js` přidat `typ: 'nazev-ikony'` a spustit `NODE_PATH=<node_modules> node tools/gen-item-icons.js`. Výsledný `js/item-icons.js` commitnout.
7. **Pixelová ikona na zemi:** 12×12 v `ICONS` (`js/sprites.js`), písmena podle `ICON_PAL` (`g` = drahokam v barvě rarity).
8. Případně legendárka nebo díl setu s tímto typem (`LEGENDARIES`, `SETS`).
9. `tests/visuals.py` ověří, že každý typ má ikonu; `tests/items.py`, že třídy umí držet zbraně svých legendárek a setů.

## Nový typ zbroje nebo šperku
Stejně jako zbraň, jen bez kroků 3–5: `ITEM_TYPES` (+ `armor: 'heavy'|'light'` u zbroje), `ITEM_KINDS.<slot>.types`, ikona v `tools/gen-item-icons.js`, pixelová ikona v `ICONS`.

## Nová třída
1. `js/classes.js` → `CLASSES`: jméno, staty (`hp`, `atk`, `def`, `spd`, případně `ms` = pohyb), **třídní rys `trait` { name, desc }** a jeho číselné pole (`dr`, `barrier`, `dotLeech`, `rangeBonus`, `shapeshift` – logika v `heroStats`/`heroHit`/`hurtHero` v `js/entities.js`; viz `docs/rebalanc.md`), `elem`, zdroj `res` (jméno, max, regen; záporný regen = generuje se útoky jako zuřivost), `main` (hlavní atribut), `armor` (preferovaná zbroj), `weapons`, `starter`, `colors` (barvy oblečení na postavě), `base` (2 výchozí dovednosti; první určuje, jestli je třída „kouzelník“ → rychlost sesílání, viz `isCasterClass`), případně `pet`.
2. Dovednosti v `SKILLS` (`js/classes.js` / `js/talents.js`) včetně ikon (`SKILL_ICONS` v `js/icons.js`).
3. **Talentový strom** v `js/talents.js` (2 specializace, viz `docs/talenty.md`); kalkulačka v `kalkulacka/` ho převezme sama.
4. `js/data.js` → `RACE_CLASSES`: které rasy ji smí hrát (rozhodnutí o kombinacích je v `PROJEKT.md`, změnu potvrdit s Jirkou).
5. **Předměty pro třídu:** aspoň 3 legendárky (`LEGENDARIES`, `cls`), 1 běžný set (`SETS`, s `color` a `glyph`) a **1 mýtický set** (`mythic: true`, 6 dílů, zbraně, které třída smí držet). Znaky setů přidat do `GLYPH` v `tools/gen-item-icons.js` a přegenerovat.
6. Vzhled postavy: barvy oblečení `colors` se aplikují přes `RACE_CLOTH`/`classPal` automaticky.
7. Pozor na místa, kde je třída napsaná natvrdo: start se zdrojem 0 pro válečníka (`rift.js`, `net.js` – `cls === 'warrior'`). Novou třídu se zdrojem „generuje se útoky“ tam přidat (nebo to přepsat obecně podle `res.regen <= 0`).
8. Testy: `node tests/validate_talents.js`, `tests/skills_smoke.py`, `tests/items.py`, `tests/visuals.py`, `tests/racecls.py`, bot `tests/bot.py` pro novou třídu.

## Nová rasa
1. `js/data.js` → `RACES`: jméno, staty (`hp`, `atk`, `def`, `spd` = rychlost útoku, **`ms` = rychlost pohybu**, `crit`), `bonus` (staty nebo schopnosti, např. trpaslík `titanGrip`, elf `elfDash`, ork `orcRage`), **`trait`** (jméno rasového rysu) a `desc` (krátký český popis včetně bonusu). Rasa musí být znát ve hře (pohyb, odolnost, mechanika), ne jen v číslech.
1b. **Rasový strom** v `js/talents.js` → `RACE_TALENTS[rasa]` (rozložení `RACE_LAYOUT`, 12 uzlů): `R1` = aktivní rasová dovednost (nová položka v `SKILLS` s `race: 'id'`, bez ceny zdroje, jen přebíjení) + ikona v `SKILL_ICONS`, zesílení `R1e`, volba `R1c`, pasivky, dvě klíčové pasivky `K1`/`K2`. Nové klíče přidat do `TALENT_KEYS` a naprogramovat. Kalkulačka strom převezme sama.
2. `js/data.js` → `RACE_CLASSES` (povolené třídy) a zápis do rozhodnutí v `PROJEKT.md`.
3. **Pixelová postava** 16×16 v `SPRITES` (`js/sprites.js`):
   - `k` = obrys, **`e` = oči** (nutné: mýtický set rozžhaví právě pixely `e`, blikání je taky přes `e`),
   - písmena oblečení zaregistrovat v `RACE_CLOTH` (jinak se oblečení nepřebarví podle třídy),
   - Jirka chce výrazné, čitelné siluety; návrh dát na výběr (2–3 varianty, snímek zvětšený).
4. Okno tvorby postavy a menu berou rasy z `RACES` samy.
5. Testy: `tests/racecls.py`, `tests/visuals.py` (efekt očí na nové rase), `node tests/validate_talents.js` (kontroluje i rasové stromy), `tests/rebalance.py` (doplnit test rasové mechaniky), snímek okna tvorby postavy.
