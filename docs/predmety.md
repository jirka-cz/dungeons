# Předměty a kořist

## Jak to funguje teď (v1.2.0)
- **Sloty výbavy:** hlavní ruka, druhá ruka, hlava, krk, plášť, hruď, rukavice, nohy, boty, 2 prsteny (`EQUIP_ORDER` v `js/items.js`).
- **Zbraně:** obouruční zbraň dává ≈ 1,9× útoku jednoruční. Zbraň v druhé ruce dává 70 % útoku (dvě zbraně).
- Třída smí nosit jen své typy zbraní a jen legendárky a sety určené pro ni (`canClassUse`).
- **Batoh** má 40 míst, **truhla** 60 (sdílená).

### Rarity (`RARITIES`)
| Rarita | Barva | Afixy | Od riftu | Odolnost | Kdo smí nosit |
|---|---|---|---|---|---|
| Běžný | šedá | 0 | 1 | 30 | všichni (zbraně podle třídy) |
| Neobvyklý | zelená | 1 | 1 | 40 | všichni (zbraně podle třídy) |
| Epický | fialová | 2 | 4 | 50 | všichni (zbraně podle třídy) |
| Legendární | oranžová | 3 + hlavní atribut + unikátní efekt | 10 | 60 | jen třídy v `cls` |
| Diamantový (set) | tyrkysová | 2 + hlavní atribut | 16 | 60 | jen třídy v `cls` |

### Atributy (`ATTRS`, `ATTR_FX`)
| Atribut | Pro všechny | Navíc pro třídu s tímto hlavním atributem |
|---|---|---|
| Síla | +0,5 obrany za bod | +1 % útoku za bod (válečník) |
| Obratnost | +0,1 % krit. šance za bod | +1 % útoku za bod (lovec, druid) |
| Intelekt | +0,3 % všech odolností za bod | +1 % útoku za bod (mág, černokněžník, druid) |
| Výdrž | +1 % života za bod | – |

- Afix atributu: 3 body × (1 + úroveň/40), strop na úrovni 100 (≈ 2–3 body na začátku, 4–6 na úrovni 40, 7–10 na 100). Stejná křivka jako „% útok“, takže hlavní atribut je pro svou třídu o kousek lepší než obecný útok a pro ostatní je slabší.
- Legendárky a sety mají hlavní atribut své třídy vždy jako základní stat (≈ 1,6× afixu).
- Afix „% života“ (vitalita) z náhodných afixů nahradila Výdrž. Staré předměty s ním fungují dál.

### Váha zbroje (`ARMOR_WEIGHT`, `armor` v `ITEM_TYPES`)
| Váha | Typy | Navíc k základu slotu |
|---|---|---|
| Těžká | helma, kyrys, kroužková zbroj, kovové rukavice, nohavice, boty | obrana (1 + 0,12 za úroveň) |
| Lehká | kápě, čelenka, róba, kožená vesta, rukavice, kalhoty, sandály | všechny odolnosti (3 % + 0,05 % za úroveň, max 12 %) |

- Róba a vesta mají na hrudi méně obrany než kyrys (róba nejméně).
- Nosit smí každý cokoli. Popisek ukazuje „těžká zbroj“ / „lehká zbroj“.
- Plášť, šperky a zbraně váhu nemají.

### Afixy (`AFFIXES`) – 30 druhů
Síla, obratnost, intelekt, výdrž, % útok, obrana, rychlost útoku a sesílání, kritický zásah, krit. poškození, vysávání, úhyb, blok, regenerace, **léčení**, **přebíjení dovedností**, trny, poškození 6 elementů, odolnosti 5 elementů + všechny, zlato, lepší kořist.

### Legendárky (`LEGENDARIES`) – 17
| Třída | Legendárky |
|---|---|
| Válečník | Sekera Krvavého měsíce, Štít Věčné hlídky, Fénixova zbroj*, Nohavice Kamenné kůže*, Amulet Popravčího* |
| Mág | Hůl věčného plamene, Koruna Mrazivého krále, Ohnisko Hvězdného prachu, Róba Tisíce run* |
| Černokněžník | Prsten Prázdnoty, Hůlka Žnece duší, Plášť Stínochodce*, Róba Tisíce run*, Prsten Vyvolávače* |
| Lovec | Boty Větrného běžce, Luk Orlího oka, Plášť Stínochodce*, Amulet Popravčího*, Prsten Vyvolávače* |
| Druid | Hůl Srdce dubu, Koruna z parohů, Fénixova zbroj*, Nohavice Kamenné kůže*, Prsten Vyvolávače* |

\* sdílí víc tříd.

### Sety (`SETS`) – 6 dílů, bonusy za 1, 3 a 6
| Set | Třída |
|---|---|
| Zbroj Titána | válečník |
| Odkaz Arcimága | mág |
| Pakt Prázdnoty | černokněžník |
| Stínový lovec | lovec |
| Strážce Hvozdu | druid |

### Chytrá kořist (`makeItem` s parametrem třídy)
- 80 % padajících předmětů je „chytrých“ (pro třídu hráče), obchodník prodává vždy chytré.
- Chytrá legendárka/set: 85 % šance, že je pro tvou třídu (jako Diablo 3). Zbytek jde do truhly pro jinou postavu nebo na prodej.
- Chytrá zbroj: 70 % šance na váhu, kterou třída preferuje (válečník těžkou, mág a černokněžník lehkou, lovec a druid bez preference).
- Chytrý předmět s afixy: 40 % šance, že jeden afix nahradí hlavní atribut třídy.
- **Porovnání předmětů** (`itemScore`) počítá s třídou: hlavní atribut má vyšší váhu, cizí atribut jen vedlejší účinek.

### Zásady balancu (research Diablo 3/4 a WoW, listopad 2026)
- Diablo 3: každý atribut má obranný účinek pro všechny (síla → zbroj, obratnost → úhyb, intelekt → odolnosti, vitalita → život) a hlavní atribut navíc zvyšuje poškození své třídy o 1 % za bod. Převzato, jen obratnost dává krit. šanci místo úhybu.
- WoW: těžká zbroj má víc obrany, látková ji má malou a kouzelníci spoléhají na intelekt. Převzato zjednodušeně na 2 váhy bez zákazu nošení.
- Chytrá kořist 85/15 % podle Diabla 3, aby legendárky pro jiné třídy nebyly otravně časté.
- Válečník: síla, výdrž, obrana (těžká zbroj, štít). Kouzelníci: intelekt, odolnosti (lehká zbroj), síla elementu, přebíjení, rychlost sesílání, léčení.

### Automatický prodej
- Nastavuje se po raritách v Nastavení i v okně postavy.
- Ve výchozím stavu je vypnutý pro všechny rarity (rozhodnutí v1.0.3, migrace `sellFix103`).

## Kde v kódu
- `js/items.js` – data, atributy, váha zbroje, generování předmětů (`makeItem`), třídy předmětů (`itemClasses`, `canClassUse`), popisky statů (`STAT_LABELS`), skóre, ceny;
- `js/classes.js` – `main` (hlavní atribut) a `armor` (preferovaná zbroj) u tříd;
- `js/entities.js` – přepočet atributů v `heroStats()`, padání kořisti;
- `js/inventory.js` – nasazování, batoh, truhla, prodej, oprava;
- `js/save.js` – migrace `classItems12`;
- `js/ui.js` – okno postavy (atributy), popisek předmětu („Pouze: …“, zvýrazněný hlavní atribut).

## Otevřené nápady
- Žádné zadané.

## Testy
`python3 tests/items.py`, `tests/autosell.py`, `tests/panels.py`.
