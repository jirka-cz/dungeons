# Město

## Jak to funguje teď (v1.9.0)
Mapa 40 × 28 dlaždic, obklopená lesem, s cestami a pochodněmi (`genTown()` v `js/world.js`).

| Místo | Co dělá | Okno |
|---|---|---|
| Obchodník (dům „Obchod“) | prodej a nákup předmětů pro tvoji třídu, prodej všeho do zvolené rarity, obnovení zboží a vylepšení obchodníka za zlato | `showVendor` |
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

### Obchod (v1.9.0)
- Nabídka 10 kusů podle nejvyššího odemčeného podzemí a třídy (`vendorStock`). Ceny podle rarity a úrovně předmětu (`buyPrice`, `sellValue` v `js/items.js`).
- **Stav obchodníka je u každé postavy** a ukládá se (`ch.vendor = { lvl, rolls, stock }`): úroveň obchodníka, počet placených obnovení, aktuální zboží. Zboží tedy nezmizí znovunačtením stránky ani teleportem do města.
- **Nové zboží zdarma jen po dokončeném podzemí** (zabitý strážce, `vendorRiftDone`; ve hře více hráčů to hostitel pošle i spoluhráčům). Dřív se zboží měnilo při každém návratu do města – i teleportem.

**Ekonomika – měřítkem je „jeden běh“** (`riftRunGold(L)` v `js/data.js`): odhad zlata za dokončené podzemí bez bonusů z výbavy = zlato z nepřátel potřebných na 100 % postupu + strážce + prodej kořisti. Bere se nejvyšší odemčené podzemí postavy. Ceny se zaokrouhlují na 3 platné číslice (`niceGold`).

| Podzemí | 1 běh | 1. obnovení | 1. vylepšení | zelená / fialová / oranžová / diamant u obchodníka |
|---|---|---|---|---|
| 1 | ≈ 310 | 31 | 310 | 180 / – / – / – |
| 10 | ≈ 1 100 | 113 | 1 130 | 510 / 2 000 / 6 800 / – |
| 20 | ≈ 4 500 | 453 | 4 530 | 1 600 / 6 500 / 22 000 / 33 000 |
| 30 | ≈ 17 000 | 1 740 | 17 400 | 5 200 / 21 000 / 70 000 / 105 000 |
| 50 | ≈ 240 000 | 23 800 | 238 000 | 54 000 / 216 000 / 720 000 / 1,1 mil. |

- **Obnovení zboží za zlato** (`vendorReroll`): 10 % běhu, každé další o 5 % běhu dražší (10, 15, 20, 25 % …). Po dokončeném podzemí začíná znovu od 10 %.
- **Vylepšení obchodníka** (`vendorUpgrade`): úroveň n stojí n běhů (1, 2, 3 …), nejvýš úroveň 20 (celkem 210 běhů). Po vylepšení se hned ukáže nové zboží.
- Každá úroveň přidá šanci na kus zboží: **+0,5 % epické, +0,3 % legendární, +0,1 % diamantové** (diamantové jen od úrovně 1 obchodníka a od podzemí 16, `VENDOR` v `js/data.js`). Skutečné šance (hody se překrývají, `vendorChances`) ukazuje okno obchodníka:

| Úroveň obchodníka | Epické | Legendární | Diamantové |
|---|---|---|---|
| 0 | 32,2 % | 8,0 % | – |
| 10 | 35,2 % | 10,9 % | 1,0 % |
| 20 | 37,9 % | 13,7 % | 2,0 % |

- Diamantový předmět stojí 1,5× legendárku (`RARITIES.diamond.price = 3000`); v podzemí 20 ≈ 7 běhů. V podzemí padá diamant zhruba jednou za 11 běhů, takže obchodník je pohodlnější cesta jen pro toho, kdo do něj hodně investoval.

## Kde v kódu
- `js/world.js` – `genTown` (rozložení, NPC, dekorace);
- `js/rift.js` – `enterTown`;
- `js/inventory.js` – obchod, oprava, truhla;
- `js/ui.js` – okna;
- `js/engine.js` – interakce s NPC a recall.

## Otevřené nápady
- Dva prázdné domy a studna se dají využít (např. další obchodník, crafting) – jen pokud to Jirka zadá.

## Testy
`python3 tests/vendor.py` (obnovení a vylepšení obchodníka, uložení zboží, snímky počítač/mobil), `python3 tests/panels.py` (okna obchodu, kováře, truhly), `tests/flows.py`, `tests/mobauto.py` (město na mobilu).
