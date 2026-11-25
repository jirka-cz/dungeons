# Dungeony (rifty)

## Jak to funguje teď (v1.1.6)
- Na obelisku ve městě si hráč zvolí úroveň riftu – kteroukoli od 1 po nejvyšší odemčenou. Poražením strážce se odemkne další úroveň.
- Rift je náhodná mapa s náhodným tématem.
- Zabíjením nepřátel roste postup. Na 100 % se **u hráče** objeví strážce (boss). Po jeho zabití se **u bosse** otevře portál do města.
- Smrt: oživení v riftu, ztráta odolnosti výbavy.

### Témata a mapy (`THEMES` v `js/data.js`, generátory v `js/world.js`)
| Téma | Generátor | Nepřátelé |
|---|---|---|
| Krypta | místnosti (`genRooms`) | kostlivci, lučištníci, zombie, kultisté, netopýři |
| Ohnivé hlubiny | jeskyně (`genCave`) | ohniví skřeti, goblini, pekelní psi, nadutci, kultisté |
| Ledové jeskyně | jeskyně | ledoví vlci, kostlivci, lučištníci, netopýři, kultisté |
| Jedovatá bažina | jeskyně | pavouci, slizy, zombie, nadutci, goblini |

### Nepřátelé (`MONSTERS`)
- 12 druhů. Chování (`ai`): melee, ranged, charger (výpad), caster, exploder (vybuchne), swarm (hejno).
- Každý druh má odolnosti a slabiny vůči elementům.

### Elity (`ELITE_AFFIXES`)
- Skupina s 1–2 afixy: Ohnivý, Mrazivý, Jedovatý, Obrněný, Rychlý, Upíří.
- Mají víc života (×2,6) a útoku (×1,25) a dávají víc XP, postupu a zlata (`ELITE_MULT`).
- Šance na elitu roste s úrovní (max. 50 %).

### Strážci (`BOSSES`)
| Boss | Útoky |
|---|---|
| Kamenný kolos | drtivé údery, otřesy, padající kameny |
| Lich Mor'thal | vějíř stínových střel, mrazivá nova, kostlivci, teleport |
| Pekelný démon | ohnivý dech, meteory, výpad |
| Pavoučí královna | jedovaté plivance, pavučiny, potěr |
| Kostěný král | vír, skoky, vyvolávání mrtvých |

### Svatyně (`SHRINES`)
Náhodně v riftu, dotykem dají dočasný bonus:
- síla: +50 % útok;
- rychlost: rychlejší útok a pohyb;
- ochrana: −40 % přijatého poškození;
- bohatství: +100 % zlata a +50 % lepší kořist.

### Obtížnost a odměny (`RIFT` v `js/data.js`)
- Za každou úroveň: život nepřátel ×1,24, útok ×1,15, XP ×1,13, zlato ×1,12, +3 % nepřátel.
- Kořist: +4 % lepší kořist a +1 % šance na předmět za úroveň. Úroveň předmětů = 2 × úroveň riftu + 1.
- Bot testy (v1.1.x): všechny třídy a specializace projdou rifty 1–6 bez problémů, od riftu 7 obtížnost znatelně roste (smrti, delší časy). To je záměr.

## Kde v kódu
- `js/data.js` – data a škálování;
- `js/world.js` – generování map, kolize, hledání cest (BFS flow field);
- `js/rift.js` – průběh riftu, svatyně, boss a jeho útoky, smrt;
- `js/entities.js` – AI nepřátel, elitní afixy, kořist.

## Otevřené nápady
- Žádné zadané. Typická další témata: nová témata map, noví bossové, mechaniky elit, žebříček časů.

## Testy
`python3 tests/bot.py` (automatický hráč projde několik riftů a vypíše časy, smrti, bosse), `tests/shrine.py`, `tests/flows.py`.
