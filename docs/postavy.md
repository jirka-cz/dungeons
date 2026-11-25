# Postavy

## Jak to funguje teď (v1.4.0)
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
| Třída | Zdroj | Element | Hlavní atribut | Zbroj | Zbraně | Výchozí dovednosti |
|---|---|---|---|---|---|---|
| Válečník | Zuřivost (útoky ji generují, sama klesá) | fyzické | Síla | těžká | meč, sekera, palcát, obouruční meč/kladivo, štít | Sek, Drtivý skok |
| Mág | Mana | arkána | Intelekt | lehká | hůlka, hůl, koule, dýka, meč | Magická střela, Teleport |
| Černokněžník | Mana, vysává 4 % života | stín | Intelekt | lehká | hůlka, dýka, hůl, koule | Stínový šíp, Vysátí |
| Lovec | Soustředění, má vlka | fyzické | Obratnost | obojí | luk, dýka, meč, sekera | Výstřel, Úskok |
| Druid | Duch, pomalá regenerace života | příroda | Intelekt / Obratnost | obojí | hůl, palcát, koule, dýka | Hněv, Omlazení |

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

### Atributy (od v1.2)
| Atribut | Účinek pro všechny | Hlavní atribut třídy (+1 % útoku za bod) |
|---|---|---|
| Síla | +0,5 obrany za bod | válečník |
| Obratnost | +0,1 % krit. šance za bod | lovec, druid |
| Intelekt | +0,2 % všech odolností za bod | mág, černokněžník, druid |
| Výdrž | +1 % života za bod | – |
| Moudrost | +1,5 % rychlosti obnovy zdroje za bod (mana, soustředění, duch); válečníkovi +1 % generování zuřivosti | – |

- Hlavní atribut je `main` v `CLASSES`. Druid bere vyšší z intelektu a obratnosti (Rovnováha i Divočina).
- Atributy jsou jen z výbavy. V okně postavy je pět políček, hlavní atribut má hvězdičku.
- Okno postavy ukazuje i zdroj (maximum a obnovu za sekundu) a u kouzelníků rychlost sesílání. Detail má sekce Zdroj a dovednosti a Obrana.
- Konstanty účinků `ATTR_FX` v `js/items.js`, výpočet v `heroStats()`.

### Rychlost útoku a sesílání
- Základní útok mága, černokněžníka a druida je kouzlo (není fyzický) → zrychluje ho **rychlost sesílání** (`castPct`). Válečník a lovec útočí zbraní → **rychlost útoku zbraní** (`wpnSpd`).
- Obecná „rychlost útoku a sesílání“ (`spdPct`) platí pro všechny.
- Ostatní dovednosti jsou okamžité, omezuje je přebíjení a cena.

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
`python3 tests/racecls.py`, `tests/items.py`, `tests/skills_smoke.py`, `tests/bot.py` (průchod rifty pro všechny třídy a specializace).
