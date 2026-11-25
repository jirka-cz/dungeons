# Postavy

## Jak to funguje teď (v1.1.6)
- Hráč má víc postav. Zlato a truhla jsou sdílené, výbava a talenty patří postavě.
- Postava = jméno + rasa + třída. Vzhled je pixelový sprite, obarvený podle třídy.

### Rasy (`RACES` v `js/data.js`)
| Rasa | Vlastnosti | Bonus | Povolené třídy |
|---|---|---|---|
| Člověk | vyvážený | +10 % lepší kořist, +5 % šance na předmět | válečník, mág, lovec |
| Trpaslík | odolný, pomalejší | +15 % zlata | válečník, lovec |
| Elf | rychlý, víc kritických zásahů, méně života | +15 % léčení | mág, lovec, druid |
| Ork | silný, slabší obrana | +10 % útok | válečník, černokněžník, lovec |
| Nemrtvý | vysává 6 % poškození jako život | +10 % stínové poškození | válečník, mág, černokněžník |

Povolené kombinace: `RACE_CLASSES` a `raceAllows()` v `js/data.js`. Obrazovka tvorby postavy nepovolené třídy zamyká.

### Třídy (`CLASSES` v `js/classes.js`)
| Třída | Zdroj | Element | Zbraně | Výchozí dovednosti |
|---|---|---|---|---|
| Válečník | Zuřivost (útoky ji generují, sama klesá) | fyzické | meč, sekera, palcát, obouruční meč/kladivo, štít | Sek, Drtivý skok |
| Mág | Mana | arkána | hůlka, hůl, koule, dýka, meč | Magická střela, Teleport |
| Černokněžník | Mana, vysává 4 % života | stín | hůlka, dýka, hůl, koule | Stínový šíp, Vysátí |
| Lovec | Soustředění, má vlka | fyzické | luk, dýka, meč, sekera | Výstřel, Úskok |
| Druid | Duch, pomalá regenerace života | příroda | hůl, palcát, koule, dýka | Hněv, Omlazení |

- Ostatní dovednosti se odemykají talenty (`docs/talenty.md`).
- Základní útoky (`primary`) generují 3 jednotky zdroje.
- Silné dovednosti mají přebíjení (úprava v1.0.2 na konci `js/classes.js`).

### Mazlíčci (`PETS`)
- **Vlk** (lovec, Divoká smečka), **Skřet** (černokněžník), **Ent** (druid), **Pekelný ohař** (Démonologie).
- Útočí sami, síla se odvíjí od útoku hrdiny.
- Talenty mohou přidat rychlost (`petSpd`) a vysávání (`petLs`).

### Podoby
- Medvědí, Vlčí a Měsíční podoba (druid), Démonická proměna (černokněžník).
- Podoby se navzájem vylučují. Hrdina se v nich přebarví a zvětší.

### Úrovně a staty
- Bez stropu úrovně. XP na další úroveň: `100 × 1,17^(úroveň−1)`.
- Růst s úrovní: život +9 %, útok +7 %, obrana +0,5 za úroveň (`LVL_HP`, `LVL_ATK`, `LVL_DEF`).
- Výpočet všech statů: `heroStats()` v `js/entities.js` (rasa × třída × úroveň × výbava × talenty × buffy).

## Kde v kódu
- `js/data.js` – rasy, růst, XP;
- `js/classes.js` – třídy, základní dovednosti, mazlíčci;
- `js/talents.js` – další dovednosti;
- `js/entities.js` – staty, souboj, mazlíčci;
- `js/skills.js` – sesílání;
- `js/sprites.js` – vzhled;
- `js/ui.js` – `showCreate` (tvorba postavy) a `showCharacter` (okno postavy).

## Rozhodnutí
- Portréty zůstávají pixelové. Malované portréty ve stylu Etsy byly zamítnuté.
- Omezení rasa/třída viz tabulka výše.

## Otevřené nápady
- Žádné zadané.

## Testy
`python3 tests/racecls.py`, `tests/skills_smoke.py`, `tests/bot.py` (průchod rifty pro všechny třídy a specializace).
