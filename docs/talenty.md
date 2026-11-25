# Talenty

## Jak to funguje teď (v1.1.6)
- Každá třída má **strom třídy** (19 uzlů) a **dvě specializace** (každá 30 uzlů). Hráč může body dávat do všech tří stromů.
- Celkem 395 uzlů, 115 úrovní talentů na třídu.
- **Body:** 1 za úroveň do úrovně 60 (na 60 je 59 bodů), dál 1 bod za každé 3 úrovně (`talentPointsTotal` v `js/talents.js`).
- **Řádky se odemykají utracenými body ve stromu:** specializace 5 / 12 / 20 / 26 bodů (od řádků 3 / 5 / 8 / 9), strom třídy 8 / 14 bodů (od řádků 4 / 6) – `SPEC_GATES`, `CORE_GATES`.
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

### Okno talentů (klávesa K)
- Klik na uzel ukáže stručný detail a vedle uzlu tlačítka **+** a **−**.
- Body se nejdřív jen „rozpracují“. Tlačítko **Potvrdit vybrané talenty** je uloží, **Zrušit** je zahodí.
- Nepotvrzené body jde odebrat kdekoli. Potvrzené jen ve městě (reset talentů).
- Zvýraznění cest: hlavní cesta k uzlu plnou tyrkysovou čarou, alternativní cesty čárkovaně, přímí potomci fialově.
- Na mobilu na šířku jsou strom a detail ve dvou sloupcích, každý se posouvá zvlášť.
- Při zavírání okna s nepotvrzenými body se hra zeptá.

### Kalkulačka
- Složka `kalkulacka/`, používá stejné soubory jako hra (`../js/classes.js`, `talents.js`, `icons.js`), takže je vždy aktuální.
- Volba třídy, posuvník úrovně 1–120, hledání, tři stromy vedle sebe (na mobilu záložky), souhrn buildu.

## Kde v kódu
- `js/talents.js`
  - `TALENTS` – data stromů;
  - pomocníci `tP` (pasivka), `tK` (dovednost), `tE` (zesílení), `tC` (volba), `tKEY` (klíčová), `tBASE`;
  - logika: `talentNodes`, `talentPointsTotal`, `gateFor`, `knownSkills`, `talentStateValid`, `talentRoutes`.
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
`node tests/validate_talents.js`, `python3 tests/talents_ui.py`, `tests/talents_mob.py`, `tests/draft.py`, `tests/land_tal.py`, `tests/calc.py`, `tests/skills_smoke.py`.
