# Talenty

## Jak to funguje teď (v1.13.0)
- Každá třída má **strom třídy** (19 uzlů) a **dvě specializace** (každá 30 uzlů). Od 1.13.0 má navíc každá rasa **rasový strom** (12 uzlů, 18 úrovní) – čtvrtá záložka. Hráč může body dávat do všech čtyř stromů.
- Celkem 395 uzlů tříd + 60 uzlů ras, 115 úrovní talentů na třídu + 18 rasových.
- 1.13.0: body se všem vrátily (`talentVer 3` v `js/save.js`), protože se změnily uzly a přibyly rasové stromy.
- **Body:** 1 za úroveň do úrovně 60 (na 60 je 59 bodů), dál 1 bod za každé 3 úrovně (`talentPointsTotal` v `js/talents.js`).
- **Řádky se odemykají utracenými body ve stromu:** specializace 5 / 12 / 20 / 26 bodů (od řádků 3 / 5 / 8 / 9), strom třídy 8 / 14 bodů (od řádků 4 / 6), rasový strom 3 / 6 / 10 bodů (od řádků 2 / 3 / 5) – `SPEC_GATES`, `CORE_GATES`, `RACE_GATES`.
- **Návaznost:** uzel vyžaduje aspoň 1 bod v jednom z rodičů (stačí kterýkoli).
- **Klíčová pasivka:** nejvýš jedna v každém stromu (ve specializaci jsou na výběr tři).

### Typy uzlů (tvary jako ve WoW)
| Typ | Tvar | Význam |
|---|---|---|
| `base` | čtverec | výchozí dovednost třídy |
| `skill` | čtverec | nová aktivní dovednost |
| `enh` | malý čtverec s + | zesílení dovednosti |
| `choice` | dva malé osmiúhelníky | volba jedné ze dvou možností, druhá se zamkne |
| `passive` | kruh | pasivní bonus, více úrovní |
| `key` | velký zlatý kruh | klíčová pasivka |

### Stromy
| Třída | Strom třídy | Specializace 1 | Specializace 2 |
|---|---|---|---|
| Válečník | Válečník | Zuřivost (dvě zbraně, rozzuření) | Zbraně (obouručka, krvácení, popravy) |
| Mág | Arkána | Oheň (hoření, výbuchy) | Mráz (zpomalení, zmrazení, tříštění) |
| Černokněžník | Temná magie | Kletby (DoT, nákaza) | Démonologie (skřeti, ohař, proměna) |
| Lovec | Lovec | Lučištník (přesné šípy) | Pán šelem (smečka) |
| Druid | Příroda | Rovnováha (měsíc a hvězdy) | Divočina (medvěd, vlk) |

Klíčové pasivky specializací:
- **Válečník**
  - Zuřivost: Nekonečná zuřivost / Dvojitý úder / Krvavé šílenství
  - Zbraně: Popravčí / Kolosální síla / Krvavé řemeslo
- **Mág**
  - Oheň: Spalování / Esuova zuřivost / Ohnivá smršť
  - Mráz: Tříštění / Lavina / Věčná zima
- **Černokněžník**
  - Kletby: Temná sklizeň / Epidemie / Vysavač duší
  - Démonologie: Démonický pán / Věčná proměna / Pekelný pakt
- **Lovec**
  - Lučištník: Smrtící přesnost / Průrazné šípy / Lovec hlav
  - Pán šelem: Smečka / Divoké pouto / Pán šelem
- **Druid**
  - Rovnováha: Měsíční bohyně / Dokonalá bouře / Věčné zatmění
  - Divočina: Medvědí síla / Vlčí zuřivost / Krvavá divočina

### Rasové stromy (od 1.13.0, `RACE_TALENTS`, rozložení `RACE_LAYOUT`)
| Rasa | Rasová dovednost (R1) | Hlavní mechaniky | Klíčové pasivky |
|---|---|---|---|
| Lidé | Lidská vůle (zruší zmrazení, imunita, +20 % útok) | Druhý dech (pod 30 % života +25 %), Taktik, Rychlé učení | Hrdina lidstva / Zlatá horečka |
| Trpaslíci | Kamenná podoba (-40 % poškození, pomalejší) | Otřes na konci podoby, Kamenná krev (automatický štít pod 35 %), Žulová podoba (trny) | Horský král / Kladivo hor |
| Elfové | Splynutí se stínem (neviditelnost, útok ze stínu ×2 a krit) | Vítr v zádech (-25 % přebíjení pohybu), Rychlé reflexy (po úhybu +20 % útok) | Tanečník s čepelemi / Elfí přesnost |
| Orkové | Krvavá zuřivost (+30 % útok, -50 % léčení) | Pomsta, Velitel (+15 % mazlíčci) | Krvavý válečník / Nezastavitelný |
| Nemrtví | Povstání mrtvých (2 kostlivci, 15 s, max. 4) | Kostěná armáda, Kostěný mág, **Vzkříšení padlých** (zabitý nepřítel povstane jako kostlivec), Kostěný štít | Armáda mrtvých / Pán smrti |

- Klíč stromů postavy je `talentKey(ch)` = `'trida:rasa'` (např. `warlock:undead`). `classTrees(klíč)` vrací stromy třídy a za nimi rasový strom (`isRace`). Volání jen s třídou (`classTrees('mage')`) vrací jen stromy třídy – tak to používají starší testy.
- Rasové dovednosti nestojí zdroj, jen přebíjení.

### Mechaniky talentů přidané v 1.13.0
- Válečník: *Popravčí* (`executeKill` – Poprava zabije pod 20 % a obnoví se), *Bouře ocele* (`whirlPull` – Vichřice vtahuje).
- Mág: *Zesílený Teleport* (`blinkNova` – zmrazí okolí), *Ledová zbroj* (`frostArmor` – kdo tě zasáhne zblízka, zamrzne), *Spalování* (hoření přeskakuje).
- Lovec: *Palba za běhu* (nová dovednost `strafe` místo Rychlé palby), *Zesílený Úskok* (`vaultTrap` – past), *Průstřelná palba* (`strafePierce`).

### Okno talentů (klávesa K)
- Klik na uzel ukáže stručný detail a vedle uzlu tlačítka **+** a **−**.
- Body se nejdřív jen „rozpracují“. Tlačítko **Potvrdit vybrané talenty** je uloží, **Zrušit** je zahodí.
- Nepotvrzené body jde odebrat kdekoli. Potvrzené jen ve městě (reset talentů).
- Zvýraznění cest: hlavní cesta k uzlu plnou tyrkysovou čarou, alternativní cesty čárkovaně, přímí potomci fialově.
- Na mobilu na šířku jsou strom a detail ve dvou sloupcích, každý se posouvá zvlášť.
- Při zavírání okna s nepotvrzenými body se hra zeptá.

### Kalkulačka
- Složka `kalkulacka/`, používá stejné soubory jako hra (`../js/classes.js`, `talents.js`, `icons.js`), takže je vždy aktuální.
- Volba třídy a rasy (rasa mění čtvrtý strom), posuvník úrovně 1–120, hledání, stromy po dvou vedle sebe (na mobilu záložky), souhrn buildu.

## Kde v kódu
- `js/talents.js`
  - `TALENTS` – data stromů;
  - pomocníci `tP` (pasivka), `tK` (dovednost), `tE` (zesílení), `tC` (volba), `tKEY` (klíčová), `tBASE`;
  - logika: `talentKey`, `talentNodes`, `talentPointsTotal`, `gateFor`, `knownSkills`, `talentStateValid`, `talentRoutes`;
  - rasové stromy: `RACE_TALENTS`, `RACE_LAYOUT`, `RACE_GATES`, `RACE_KEY_ICONS`, rasové dovednosti v `SKILLS` (`race: 'id'`).
- `js/entities.js` – jak talenty mění staty (`gatherMods`, `nodeStats`, podmíněné bonusy `applyConds`, `heroHit`).
- `js/skills.js` – efekty nových dovedností a mechanik (rozzuření, tříštění, šíření DoT, podoby…).
- `js/ui.js` – okno talentů (`showTalents`, `learnTalent`, `confirmTalents`…).
- `js/icons.js` – ikony uzlů (`SKILL_ICONS`, `STAT_ICONS`, `KEY_ICONS`).

## Klíče statů v talentech (pro Clauda)
- **Podmíněné předpony:** `dw_` (dvě zbraně), `dw1_`, `th_` (obouručka), `sh_` (štít) a předpony podle buffu: `enrage_`, `bear_`, `wolf_`, `moonkin_`, `meta_`, `avatar_`, `combust_`, `rapid_`, `bwrath_`, `dsoul_`.
- **Klíče pro jednu dovednost:**
  - základ: `skd` (poškození), `skr` (dosah/poloměr), `skc` (počet), `skdur` (trvání), `skcd` (přebíjení);
  - zdroj: `skcost` (cena), `skgen` (generování);
  - efekty: `skpierce`, `skstun`, `skslow`, `skdot`, `skheal`, `skvuln`, `skburn`, `skbleed`, `skfreeze`, `skexec`, `skenrage`, `skhits`, `skkillres`.
- Každý nový klíč musí projít `node tests/validate_talents.js` (kontroluje, že všechny klíče a dovednosti existují a jsou implementované).

## Otevřené nápady
- Talent lovce „útočit na nejslabšího nepřítele“. V `js/engine.js` je na to připravený háček `G.mods.targetWeakest`, ale žádný talent ho zatím nenastavuje.
- Jirka zatím nezkoumal sílu klíčových pasivek – může přijít úprava balancu.

## Testy
`node tests/validate_talents.js` (kontroluje i rasové stromy), `python3 tests/rebalance.py`, `python3 tests/talents_ui.py`, `tests/talents_mob.py`, `tests/draft.py`, `tests/land_tal.py`, `tests/calc.py`, `tests/skills_smoke.py`.
