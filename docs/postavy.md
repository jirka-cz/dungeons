# Postavy

## Jak to funguje teď (v1.13.0)

Od 1.13.0 velký rebalanc – rasy mají rysy, pohyb a vlastní strom talentů, třídy mají třídní rysy. Podrobně a s odkazy na inspiraci: `docs/rebalanc.md`.
- Hráč má víc postav. Zlato a truhla jsou sdílené, výbava a talenty patří postavě.
- Postava = jméno + rasa + třída. Vzhled je pixelový sprite, obarvený podle třídy.

### Rasy (`RACES` v `js/data.js`)
| Rasa | Život / útok / obrana | Rychl. útoku | Pohyb | Rys (bonus) | Rasová dovednost | Povolené třídy |
|---|---|---|---|---|---|---|
| Člověk | 105 / 11 / 3 | 100 % | 100 % | Přizpůsobivost: +10 % XP, +10 % lepší kořist, -20 % trvání zmrazení/zpomalení | Lidská vůle | válečník, mág, lovec |
| Trpaslík | 135 / 9 / 7 | 92 % | 86 % | Horská výdrž: +8 % odolnosti, +15 % zlata, Horský stisk, -15 % CC | Kamenná podoba | válečník, lovec |
| Elf | 85 / 10 / 2, krit 10 % | 108 % | 114 % | Lesní mrštnost: +8 % úhyb; po pohybové dovednosti 2 s +30 % pohyb a +15 % úhyb (`elfDash`) | Splynutí se stínem | mág, lovec, druid |
| Ork | 115 / 13 / 2 | 97 % | 100 % | Krvavý vztek: +10 % útok; pod 50 % života +20 % útok a +10 % rychlost útoku (`orcRage`) | Krvavá zuřivost | válečník, černokněžník, lovec |
| Nemrtvý | 95 / 10 / 3 | 100 % | 95 % | Neživot: vysává 6 %, zabití léčí 1 %, +10 % stín | Povstání mrtvých (kostlivci) | válečník, mág, černokněžník |

- `spd` = rychlost útoku a sesílání, `ms` = rychlost pohybu (dřív rasa měnila jen rychlost útoku).
- **Rasový strom**: čtvrtá záložka v Talentech (`RACE_TALENTS` v `js/talents.js`), viz `docs/talenty.md`.
- **Kostlivci nemrtvých** (`PETS.skeleton`, `PETS.skelmage`, `raiseSkeleton` v `js/entities.js`): najednou nejvýš 4 (`SKEL_MAX`, talent Armáda mrtvých +3), mají omezenou dobu života, nejstarší zmizí.

Povolené kombinace: `RACE_CLASSES` a `raceAllows()` v `js/data.js`. Obrazovka tvorby postavy nepovolené třídy zamyká.

### Třídy (`CLASSES` v `js/classes.js`)
| Třída | Zdroj | Element | Hlavní atribut | Zbroj | Zbraně | Výchozí dovednosti | Třídní rys |
|---|---|---|---|---|---|---|---|
| Válečník | Zuřivost (útoky ji generují, sama klesá) | fyzické | Síla | těžká | meč, sekera, palcát, obouruční meč/kladivo, štít | Sek, Drtivý skok | **Železná kůže**: -25 % přijatého poškození (`dr`, mimo strop 60 %) |
| Mág | Mana | arkána | Intelekt | lehká | jen Kniha kouzel (obouruční) | Magická střela, Teleport | **Arkánní bariéra**: štít 15 % života, obnoví se po 5 s bez zásahu (`barrier`) |
| Černokněžník | Mana, vysává 4 % života | stín | Intelekt | lehká | jen Kniha kouzel (obouruční) | Stínový šíp, Vysátí | **Temný pakt**: DoT léčí o 10 % svého poškození (`dotLeech`) |
| Lovec | Soustředění, má vlka | fyzické | Obratnost | lehká | luk, dýka, meč, sekera | Výstřel, Úskok | **Lovec na dálku**: +1 % poškození za 10 bodů vzdálenosti nad 40 (max. +20 %), +5 % pohyb (`rangeBonus`, `ms`) |
| Druid | Duch, pomalá regenerace života | příroda | Intelekt / Obratnost | lehká + kroužková zbroj | hůl, palcát, koule, dýka | Hněv, Omlazení | **Proměnlivost**: v medvědí/vlčí podobě Drápnutí zblízka místo Hněvu, v měsíční 2 střely, proměna léčí 10 % (`shapeshift`, `effSkill` v `js/skills.js`) |

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
- Bez stropu úrovně. XP na další úroveň (`xpToNext`): do úrovně 30 `100 × 1,17^(úroveň−1)` jako dřív, pak růst zpomaluje až k +1,5 % za úroveň (od 1.13.0, aby čísla nebyla nesmyslná).
- Růst s úrovní: základní život +9 %, útok +7 %, obrana +0,5 za úroveň (`LVL_HP`, `LVL_ATK`, `LVL_DEF`) a od 1.13.0 navíc **+1 % útoku i života za úroveň násobí všechno** (`levelMul`).
- **Doporučená úroveň podzemí** = 0,8 × úroveň podzemí (`recLevel`). Pod ní: za každou úroveň nepřátelé dávají +3 % poškození a hrdina jim -3 % (násobí se, `levelGapMul`, `st.gap`); nad ní jsou nepřátelé o 1 % slabší za úroveň (max. -15 %). Počítá se u každého hrdiny zvlášť (družina). Podrobně `docs/rebalanc.md`.
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
`python3 tests/racecls.py`, `tests/items.py`, `tests/skills_smoke.py`, `tests/rebalance.py` (rysy ras a tříd, rasové dovednosti, rozdíl úrovní), `tests/balance.py` (síla vs. podzemí), `tests/bot.py` (průchod rifty pro všechny třídy a specializace).

### Dvě obouruční zbraně (v1.12)
- Obouruční zbraň zabírá obě ruce. Výjimka: **Titánský stisk** – obouruční meč nebo válečné kladivo v každé ruce (ne luk, ne hůl; `TITAN_GRIP_TYPES`, `handsOk` v `js/items.js`).
- Titánský stisk má **trpaslík od narození** (rasový bonus „Horský stisk“) a válečník si ho může vzít v talentu stromu Zuřivost.
- Obouruční zbraň v levé ruce dává 50 % útoku (`OFFHAND_2H_MULT`), jednoruční 70 %.
- Trpaslík, který si talent stejně vezme, dostane +8 % útok se dvěma obouručními zbraněmi.

### Obnova zdroje (v1.14)
- Mana, soustředění a duch se obnovují pomaleji, aby kouzla omezovala mana, ne jen přebíjení: mág 1,4/s, černokněžník 1,2/s, lovec 1,6/s, druid 1,2/s (dřív 3,5 / 3 / 4 / 3). Základní útok (Magická střela, Stínový šíp, Výstřel, Hněv) doplní +2 (dřív +3), konstanta `PRIMARY_GEN` v `js/classes.js`.
- Zuřivost válečníka beze změny (generují ji útoky, sama klesá).

### Obnova v boji a mimo boj (v1.16)
- Když na hrdinu útočí nepřítel (i když uhne), je **v boji** ještě 4 s po posledním útoku (`inCombat`, `COMBAT_T` v `js/data.js`, `attackedT` v `hurtHero`).
- V boji se život i mana/soustředění/duch obnovují jen na **25 %**, mimo boj na **150 %** (`REGEN_COMBAT`, `REGEN_REST`). Ve městě beze změny (+10 % života za sekundu). Zuřivost válečníka se nemění.
- Lišta efektů ukazuje „V boji“ (červeně) nebo „Odpočinek“ (zeleně).

