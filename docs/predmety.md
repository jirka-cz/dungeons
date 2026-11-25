# Předměty a kořist

## Jak to funguje teď (v1.4.0)
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
| Intelekt | +0,2 % všech odolností za bod | +1 % útoku za bod (mág, černokněžník, druid) |
| Výdrž | +1 % života za bod | – |
| Moudrost | +1,5 % obnovy zdroje za bod (válečník +1 % generování zuřivosti) | – |

- Afix atributu: 3 body × (1 + úroveň/40), strop na úrovni 100 (≈ 2–3 body na začátku, 4–6 na úrovni 40, 7–10 na 100). Stejná křivka jako „% útok“, takže hlavní atribut je pro svou třídu o kousek lepší než obecný útok a pro ostatní je slabší.
- Legendárky a sety mají hlavní atribut své třídy vždy jako základní stat (≈ 1,6× afixu).
- Afix „% života“ (vitalita) z náhodných afixů nahradila Výdrž. Staré předměty s ním fungují dál.

### Odolnosti na předmětech (v1.4, `RES_ITEM_CAP`)
- **Na jednom předmětu je nejvýš 10 % proti jednomu živlu** (všechny odolnosti + konkrétní živel dohromady), i u legendárek a setů. Hlídá to `capItemRes` při vzniku předmětu.
- Zdroje: lehká zbroj a plášť max 3 % všech odolností, afix „všechny odolnosti“ max 4 %, afix jednoho živlu max 6 %, legendárky max 8 %.
- Intelekt +0,2 % všech odolností za bod. Strop postavy zůstává 60 %.
- Orientačně: mág ve fialové výbavě na úrovni 35 ≈ 17 %, v samých legendárkách na úrovni 100 ≈ 50 %.
- Starší předměty se jednou při načtení ořežou na 10 % (migrace `resCap14`).

### Váha zbroje (`ARMOR_WEIGHT`, `armor` v `ITEM_TYPES`)
| Váha | Typy | Navíc k základu slotu |
|---|---|---|
| Těžká | helma, kyrys, kroužková zbroj, kovové rukavice, nohavice, boty | obrana (1 + 0,12 za úroveň) |
| Lehká | kápě, čelenka, róba, kožená vesta, rukavice, kalhoty, sandály | všechny odolnosti (1 % + 0,02 % za úroveň, max 3 %) |

- Róba a vesta mají na hrudi méně obrany než kyrys (róba nejméně).
- Nosit smí každý cokoli. Popisek ukazuje „těžká zbroj“ / „lehká zbroj“.
- Plášť, šperky a zbraně váhu nemají.

### Afixy (`AFFIXES`) – 60 druhů + rodiny
Každý afix má `v0` (hodnota na úrovni 1, roste do úrovně 100), `w` (jak často padá, výchozí 1) a případně `slots` (jen na určitých druzích předmětů). Výběr je vážený, atributy padají častěji, speciální bonusy méně.

| Skupina | Afixy |
|---|---|
| Atributy | síla, obratnost, intelekt, výdrž, moudrost |
| Útok | % útok, síla dovedností, rychlost útoku a sesílání, **rychlost sesílání**\*, **rychlost útoku zbraní**\*, krit. šance, krit. poškození, poškození 6 elementů, **poškození elitám a strážcům**, **poškození nemrtvým / šelmám / démonům**, poškození oslabeným (pod 30 %), poškození v čase, ignoruje zbroj, ignoruje odolnosti, šance zaútočit dvakrát, šance omráčit, síla mazlíčků |
| Rodina „zbraň“\* | **+% poškození se sekerou / s mečem / s holí…** (platí, jen když zbraň držíš; na zbrani vždy její typ, chytrá kořist bere zbraně tvé třídy) |
| Rodina „dovednost“ | **+% poškození konkrétní dovednosti** (např. Ohnivá koule); chytrá kořist bere dovednosti tvé třídy včetně talentových |
| Zdroj | **max. zdroj**, **obnova zdroje**, **generování zdroje**, **cena dovedností**\*, přebíjení\*, **zdroj za zabití** |
| Obrana | obrana, vysávání, úhyb, blok, regenerace, léčení, **léčení za zabití**, trny, odolnosti 5 elementů + všechny, **méně poškození od elit**, **od střel**, **z plošných útoků**, **kratší zmrazení a zpomalení**, **rychlost pohybu** (jen boty) |
| Kořist | zlato, lepší kořist, **šance na předmět**, **zkušenosti** |

\* jen na zbraních, levé ruce, rukavicích, šperkech a hlavě (jako v Diablu 3).

Nepřátelé mají druh `fam` v `MONSTERS` a `BOSSES`: nemrtví (zombie, kostlivci, nadutec, Lich, Kostěný král), šelmy (netopýr, pavouk, ledový vlk, Pavoučí královna), démoni (ohnivý skřet, pekelný pes, Pekelný démon), ostatní bez bonusu. Elity a strážci riftu se počítají jako „elity“.

### Legendárky (`LEGENDARIES`) – 17
| Třída | Legendárky |
|---|---|
| Válečník | Sekera Krvavého měsíce, Štít Věčné hlídky, Fénixova zbroj*, Nohavice Kamenné kůže*, Amulet Popravčího* |
| Mág | Hůl věčného plamene, Koruna Mrazivého krále, Ohnisko Hvězdného prachu, Róba Tisíce run* (nově rychlost sesílání) |
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
- **Porovnání předmětů** (`itemScore`, `statWeight`) počítá s třídou, drženou zbraní a dovednostmi na liště: hlavní atribut a bonus k držené zbrani nebo dovednosti na liště mají plnou váhu, cizí málo; rychlost sesílání se počítá jen kouzelníkům, rychlost útoku zbraní jen válečníkovi a lovci.

### Zásady balancu (research Diablo 3/4 a WoW, listopad 2026)
- Diablo 3: každý atribut má obranný účinek pro všechny (síla → zbroj, obratnost → úhyb, intelekt → odolnosti, vitalita → život) a hlavní atribut navíc zvyšuje poškození své třídy o 1 % za bod. Převzato, jen obratnost dává krit. šanci místo úhybu.
- WoW: těžká zbroj má víc obrany, látková ji má malou a kouzelníci spoléhají na intelekt. Převzato zjednodušeně na 2 váhy bez zákazu nošení.
- Chytrá kořist 85/15 % podle Diabla 3, aby legendárky pro jiné třídy nebyly otravně časté.
- Válečník: síla, výdrž, obrana (těžká zbroj, štít). Kouzelníci: intelekt, odolnosti (lehká zbroj), síla elementu, přebíjení, rychlost sesílání, léčení.
- v1.3 (Grim Dawn, D3, WoW): Moudrost (ve WoW a Grim Dawnu „Spirit“) jako ve WoW a Grim Dawnu zrychluje obnovu many. Rychlost sesílání je oddělená od rychlosti útoku (WoW spell haste vs. attack haste, Grim Dawn casting speed). Bonusy k typu zbraně a ke konkrétní dovednosti podle Diabla 3/4, poškození elitám a od elit podle D3, poškození proti druhům nepřátel podle Grim Dawnu, rychlost pohybu jen na botách podle D3.

### Automatický prodej
- Nastavuje se po raritách v Nastavení i v okně postavy.
- Ve výchozím stavu je vypnutý pro všechny rarity (rozhodnutí v1.0.3, migrace `sellFix103`).

## Kde v kódu
- `js/items.js` – data, atributy, váha zbroje, generování předmětů (`makeItem`), třídy předmětů (`itemClasses`, `canClassUse`), popisky statů (`STAT_LABELS`), skóre, ceny;
- `js/classes.js` – `main` (hlavní atribut) a `armor` (preferovaná zbroj) u tříd;
- `js/entities.js` – přepočet atributů a bonusů v `heroStats()`, bonusy proti elitám a druhům nepřátel (`dealDamage`), obrana proti elitám, střelám a plochám (`hurtHero`, projektily, `updateHazards`), padání kořisti;
- `js/skills.js` – rychlost sesílání / útoku zbraní u základního útoku;
- `js/inventory.js` – nasazování, batoh, truhla, prodej, oprava;
- `js/save.js` – migrace `classItems12`;
- `js/ui.js` – okno postavy (atributy), popisek předmětu („Pouze: …“, zvýrazněný hlavní atribut).

## Otevřené nápady
- Žádné zadané.

## Testy
`python3 tests/items.py`, `tests/autosell.py`, `tests/panels.py`.
