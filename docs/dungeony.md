# Dungeony (rifty)

Ve hře se rifty jmenují **Podzemí** (od 1.7.2). V kódu a v dokumentaci zůstává slovo rift.

## Jak to funguje teď (v1.6.0)
- Na obelisku ve městě si hráč zvolí úroveň riftu: nejvyšší odemčenou, poslední dokončenou, nebo libovolnou dokončenou (tlačítka −10 / − / + / +10 nebo napsat číslo; od 1.7.0). Poražením strážce se odemkne další úroveň.
- Ve hře více hráčů (příprava od 1.7.0, viz `docs/kooperace.md`) přidá každý další hráč +10 % nepřátel, jejich života a poškození.
- Rift je náhodná mapa s náhodným tématem.
- **Kořist z nepřátel:** koule zdraví (vyléčí 20 % života) a od v1.16 **lahvička many** (modrá, doplní 25 % many nebo jiného zdroje, válečníkovi zuřivost; `GLOBE_RES`). Běžný nepřítel 5 % (v davu polovina), elita 45 %, objekty 15 %.
- Zabíjením nepřátel roste postup. Na 100 % se **u hráče** objeví strážce (boss). Po jeho zabití se **u bosse** otevře portál do města. Při vstupu do portálu se hra zeptá „Vrátit se do města?“ (Do města / Zůstat, na PC i Enter), aby hráč omylem neodešel bez kořisti; po „Zůstat“ se zeptá znovu až po odchodu a návratu (`portalCheck` v `js/engine.js`, platí i pro hosty ve hře více hráčů).
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
- Mají víc života (×2,6) a útoku (×1,25) a dávají víc XP, postupu a zlata (`ELITE_MULT`). Od 1.10.0 je doprovází 4–6 běžných nepřátel.
- Šance na elitu roste s úrovní (max. 50 %).

## Jatka – velké skupiny (od v1.10.0)
Cíl: hodně nepřátel jako v Diablu 3, ale bez záplavy zlata. Nastavení v `RIFT` (`js/data.js`), rozmístění v `populateRift` (`js/rift.js`), slabší dav v `spawnMonster` (`js/entities.js`).

| Co | Hodnota |
|---|---|
| Velikost běžné skupiny | 3× víc (`crowd`): 9–18 nepřátel, hejna netopýrů ×2,1 (11–17) |
| Smíšená skupina | 35 % šance (`mixChance`), že 30 % skupiny je jiný druh z tématu |
| Elitní skupina | 3 elity + 4–6 běžných nepřátel stejného druhu (`eliteFollowers`) |
| Běžný nepřítel v davu | 40 % života (`crowdHp`), 50 % útoku (`crowdAtk`) |
| Odměny za běžného nepřítele | ⅓ zlata, XP, postupu a šance na předmět (`m.rw`); dělí se i slizy po rozpůlení |
| Koule zdraví | šance z běžného nepřítele ×0,5 (`crowdGlobe`) → za podzemí 1,5× víc koulí |
| Elity, strážci, přivolaní pomocníci | beze změny |

Počet skupin a elit na mapě zůstal stejný (rozmísťují se podle postupu), takže je v podzemí ~280–370 nepřátel místo ~100–145. Součet zlata, XP a postupu všech nepřátel je stejný jako dřív (změřeno: podzemí 1 ≈ 330 zlata, 10 ≈ 1 100, 20 ≈ 4 250), takže dál platí `riftRunGold` a ceny u obchodníka.

Bot testy (v1.10.0, rifty 1–6, 4 třídy): vyčištění do strážce trvá asi o 20–40 % déle než dřív, smrti, úrovně, zlato i počet předmětů za podzemí vychází stejně. Výkon: 470 nepřátel v podzemí 40, z toho 84 útočících – výpočet snímku 0,6 ms.

## Strážci (bossové) – od v1.6.0
Data jsou v `BOSSES` (`js/data.js`), logika, útoky a animace v `js/bosses.js`.

### Proč předělávka
Do v1.5 stačilo u bosse stát a mlátit: souboj trval 10–20 s, hráč skoro nepotřeboval lektvar (bot test `tests/bossfight.py`, styl „stand“: 0 smrtí, min. život 45–70 %). Boss měl jen 3–4 útoky a jednu změnu (zrychlení na 50 %).

### Společná pravidla všech bossů
| Pravidlo | Co dělá | Co hráč musí |
|---|---|---|
| **3 fáze** | přechod na 66 % a 33 % života; nejde přeskočit jedním zásahem; boss zařve (1,3 s nezranitelný) a spustí vlastní mechaniku | reagovat na mechaniku |
| **Velký útok** (`sig`, každých 14–18 s) | dlouhé varování, zásah sebere velkou část života (část poškození je v % max. života, aby byl nebezpečný při každé výbavě) | uhnout, dovednost pohybu, nebo lektvar |
| **Vyčerpání** | po velkém útoku, rozbití štítu nebo přerušení boss chvíli stojí a dostává **+50 %** poškození (ukazatel zežloutne, hvězdičky) | šetřit si silné dovednosti na tuto chvíli |
| **Přerušitelné sesílání** | ukazatel nad bossem; přeruší ho omráčení/zmrazení nebo 5 % jeho života poškozením; jinak výbuch v červeném kruhu | přerušit, nebo utéct |
| **Běsnění** | po 120 s rychlejší útoky a +50 % poškození | nezdržovat se |
| **Bez opakování** | stejný boss se neobjeví 3 rifty po sobě (`char.recentBosses`) | – |
| **Slabší začátek** | rift 1 = 68 % života bosse, od riftu 5 plný; % část poškození roste do riftu 8 | – |

### Bossové
| Boss | Útoky | Velký útok | Mechanika při změně fáze | Animace |
|---|---|---|---|---|
| Kamenný kolos | úder, padající kameny, otřesy, praskliny v zemi (od 2. fáze) | **Zemětřesení** – vyskočí, drtí vše kolem sebe | **Kamenný štít** (12 % života, 8 s): když ho nerozbiješ, přijde lavina | těžké kroky, otřes, praskliny na zemi, kameny obíhající štít |
| Lich Mor'thal | vějíř střel, mrazivá nova, kostlivci, teleport, pronásledující duše | **Bouře duší** – přeruš, nebo uteč | **Fylakterie**: nezranitelný, dokud nezničíš 3 krystaly | vznáší se, obíhající duše, paprsky z krystalů |
| Pekelný démon | ohnivý dech, výpad, meteory, ohnivý puls (2. f.), ohnivý kruh s mezerou (3. f.) | **Trojitý výpad** – nechává ohnivou stopu | vzlétne, dopadne na hrdinu a otevře **2 pekelné brány**, ze kterých lezou skřeti | křídla, plameny, stopa přízraků při výpadu, spáleniště |
| Pavoučí královna | plivance, pavučina (zpomalí), vajíčka, potěr | **Jedový déšť** – vyšplhá do stropu, prší jed, dopadne na hrdinu | znovu šplhá a klade vajíčka | vlákno ke stropu, pavučiny na zemi, pulzující kokony |
| Kostěný král | kostěná kopí, skok, vír (vtahuje), garda | **Královský vír** – silně vtahuje | **Královská garda**: každý kostlivec = −15 % poškození krále (max. −60 %) | koruna, točení, zlatá pouta ke gardě |
| Ledová vědma Ysolda *(nová)* | ledové střepy, rampouchy ve dvou vlnách, vánice, která pronásleduje | **Absolutní nula** – zasáhne všechno kromě teplého kruhu | **Ledové přeludy**: 3 kopie, které střílí a po zničení zmrazí okolí; skutečná má kruh pod nohama a krystaly kolem | vznáší se, ledové krystaly, sníh, mráz přes obrazovku |
| Hnilobný Gorgul *(nový)* | hák (přitáhne tě k sobě), zvracení, nadutci, požírání (od 2. f.) | **Skok břichem** – velká jedová louže | břicho praskne – jedové kapky a slizy; požírá služebníky a léčí se (+4 % za každého) | kývající se břicho, řetěz háku, mouchy |
| Xal'Vor, Pán stínů *(nový)* | stínové koule (sledují), krok stínem (útok zezadu), prázdnota pod nohama, prokletí | **Zatmění** – přeruš, nebo uteč | prokletí + prázdnota + teleport | pohltí světlo (tma), bliká, stopa přízraků |

**Prokletí** (Xal'Vor): odpočet nad hrdinou, smyje se jen ve sloupu světla. Když ne, vybuchne.

### Objekty bossů (`BOSS_OBJECTS`)
Fylakterie, vaječné kokony, pekelné brány (a přeludy Ysoldy). Nehýbou se, nedávají postup ani kořist (25 % šance na kouli zdraví), mají oranžový ukazatel a jméno. Automatický útok na mobilu je cílí, nezranitelné cíle přeskakuje. Po smrti bosse zmizí.

### Ladění (v `js/bosses.js` a `js/data.js`)
- `BOSS_PCT` – síla % části poškození (0,5).
- `BOSS_PHASES`, `BOSS_ENRAGE`, `BOSS_EXPOSED_MUL` – fáze, běsnění, vyčerpání.
- Život a útok bosse: `BOSSES[…].hp/atk` × `riftHpMul` / `riftAtkMul`.

### Výsledky bot testů (v1.6.0, rift 7, postava úr. 19)
| | Stand (jen stojí) | Dodge (uhýbá) |
|---|---|---|
| v1.5 | 10–20 s, 0 smrtí, 0–1 lektvar | – |
| v1.6 | 30–90 s, 1–3 smrti, 2–4 lektvary | 25–100 s, 0–2 smrti, 1–3 lektvary |

Bot uhýbá hůř než člověk (nepoužívá dovednosti pohybu ani přerušení), takže pro hráče by měl být souboj zvládnutelný bez smrti, pokud uhýbá a pije lektvary.

### Svatyně (`SHRINES`)
Náhodně v riftu, dotykem dají dočasný bonus:
- síla: +50 % útok;
- rychlost: rychlejší útok a pohyb;
- ochrana: −40 % přijatého poškození;
- bohatství: +100 % zlata a +50 % lepší kořist.

### Obtížnost a odměny (`RIFT` v `js/data.js`)
- Od 1.13.0: život, útok a XP nepřátel podle tabulek `RIFT_HP_CURVE`, `RIFT_ATK_CURVE`, `RIFT_XP_CURVE` (`riftHpMul`, `riftAtkMul`, `riftXpMul`), zlato a výbava podle `goldPow`/`itemPow`; +3 % nepřátel za úroveň, ale jen do podzemí 100 (`RIFT.densityMax`, od 1.18.2) – dál by se skupiny slévaly do jednoho obřího davu. Dřív ×1,24 / ×1,15 / ×1,13 za úroveň – od podzemí ~40 nehratelné. Podzemí má **doporučenou úroveň** (`recLevel`), za každou úroveň pod ní nepřátelé dávají hrdinovi +3 % a dostávají -3 % (`levelGapMul`). Podrobně `docs/rebalanc.md`.
- Kořist: lepší kořist roste se zpomalením (`riftMf`: rift 10 ≈ +37 %, 20 ≈ +64 %, 50 ≈ +110 %, 100 ≈ +142 %, strop +200 %) a +1 % šance na předmět za úroveň. Úroveň předmětů = 2 × úroveň riftu + 1. Podrobná tabulka v `docs/predmety.md`.
- Bot testy (v1.6.0): všechny třídy projdou rifty 1–8; souboje s bossy jsou delší a bot občas umře.

## Kde v kódu
- `js/data.js` – data, bossové a škálování;
- `js/world.js` – generování map, kolize, hledání cest (BFS flow field);
- `js/rift.js` – průběh riftu, svatyně, konec souboje s bossem, smrt;
- `js/bosses.js` – bossové (fáze, mechaniky, útoky, animace, HUD texty);
- `js/entities.js` – AI nepřátel, elitní afixy, nebezpečné zóny, kořist.

## Postup a pojistka (v1.6.1)
- `populateRift` rozmisťuje skupiny (od 1.10.0 velké, viz Jatka) s rozestupem 7 dlaždic; když se na malou mapu nevejde dost nepřátel (cíl je 145 % postupu), rozestup se postupně zmenší až na 3.
- `checkRiftStuck` (jednou za sekundu): když v riftu nezbývá nikdo, kdo dává postup, a boss ještě nebyl, postup se doplní na 100 % a boss se objeví.

## Otevřené nápady
- Odměny navíc za porážku bosse bez smrti, žebříček časů, bossové vázaní na téma mapy.

## Testy
`python3 tests/bot.py` (automatický hráč projde několik riftů), `tests/bossfight.py` (souboje s každým bossem), `tests/bosses_shots.py` (snímky bossů), `tests/shrine.py`, `tests/flows.py`.
