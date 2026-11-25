# Město

## Jak to funguje teď (v1.1.6)
Mapa 40 × 28 dlaždic, obklopená lesem, s cestami a pochodněmi (`genTown()` v `js/world.js`).

| Místo | Co dělá | Okno |
|---|---|---|
| Obchodník (dům „Obchod“) | prodej a nákup předmětů pro tvoji třídu, prodej všeho do zvolené rarity | `showVendor` |
| Kovář (dům „Kovárna“, kovadlina) | oprava předmětů (jednotlivě nebo vše) | `showSmith` |
| Truhla | sdílené úložiště všech postav (60 míst) | `showStash` |
| Obelisk riftů | volba úrovně riftu (jakákoli už dosažená) | `showRiftSelect` |
| Studna, dva domy bez funkce | dekorace, místo pro budoucí obsah | – |

- Do města se jde portálem po zabití strážce, nebo teleportem: Esc/T → „Teleport do města“, sesílá se 5 s a přeruší ho pohyb nebo útok.
- Ve městě jde resetovat potvrzené talenty.

### Odolnost předmětů
- Každý předmět má odolnost podle rarity (30–60).
- Smrt v riftu vezme 10 % maximální odolnosti nasazených předmětů (`RIFT.deathDurability`).
- Opravu dělá kovář za zlato (`repairCost`, `repairAll` v `js/inventory.js`).

### Obchod
- Nabídka se generuje podle úrovně a třídy (`vendorStock`).
- Ceny podle rarity a úrovně předmětu (`buyPrice`, `sellValue` v `js/items.js`).

## Kde v kódu
- `js/world.js` – `genTown` (rozložení, NPC, dekorace);
- `js/rift.js` – `enterTown`;
- `js/inventory.js` – obchod, oprava, truhla;
- `js/ui.js` – okna;
- `js/engine.js` – interakce s NPC a recall.

## Otevřené nápady
- Dva prázdné domy a studna se dají využít (např. další obchodník, crafting) – jen pokud to Jirka zadá.

## Testy
`python3 tests/panels.py` (okna obchodu, kováře, truhly), `tests/flows.py`, `tests/mobauto.py` (město na mobilu).
