# Předměty a kořist

## Jak to funguje teď (v1.5.0)
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

- Afix atributu: 3 body × (1 + úroveň/50), strop na úrovni 100 (viz Hody afixů níže). Stejná křivka jako „% útok“, takže hlavní atribut je pro svou třídu o kousek lepší než obecný útok a pro ostatní je slabší.
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

### Padání kořisti (v1.5)
**Kolik předmětů padá**
- Běžný nepřítel: 8 % × (1 + 0,01 × rift), elita: 45 % × (1 + 0,01 × rift), vynásobeno „šancí na předmět“ z výbavy.
- Strážce riftu (boss): 3–5 předmětů, nikdy šedý, epický a lepší mají dvojnásobnou váhu.
- Za dokončený rift (jen do 100 % postupu + boss) padne zhruba 12 předmětů v riftu 1, 15 v riftu 10–20, 20 v riftu 50 a 24 v riftu 100.

**Jak se losuje rarita** – váhy: šedá 100, zelená 30, fialová 6, oranžová 1, diamantová 0,3. Všechny kromě šedé se násobí (1 + lepší kořist). Lepší kořist = bonus riftu (`riftMf`) + výbava (afix štěstí, člověk +10 %). Fialová padá od riftu 4, oranžová od 10, diamantová od 16.

| Rift | Úr. předmětů | Lepší kořist z riftu | Šedá | Zelená | Fialová | Oranžová | Diamant |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 0 % | 76,9 % | 23,1 % | – | – | – |
| 4 | 9 | +14 % | 70,9 % | 24,2 % | 4,9 % | – | – |
| 10 | 21 | +37 % | 66,4 % | 27,2 % | 5,5 % | 0,9 % | – |
| 16 | 33 | +55 % | 63,4 % | 29,4 % | 5,9 % | 1,0 % | 0,3 % |
| 20 | 41 | +64 % | 62,0 % | 30,6 % | 6,1 % | 1,0 % | 0,3 % |
| 30 | 61 | +84 % | 59,3 % | 32,7 % | 6,6 % | 1,1 % | 0,3 % |
| 50 | 101 | +110 % | 56,1 % | 35,3 % | 7,1 % | 1,2 % | 0,4 % |
| 100 | 201 | +142 % | 52,5 % | 38,2 % | 7,6 % | 1,3 % | 0,4 % |

Boss (od riftu 16): zelená 67 %, fialová 27 %, oranžová 4,5 %, diamant 1,3 %.

**Průměrně za jeden dokončený rift** (bez bonusů z výbavy):

| Rift | Šedé | Zelené | Fialové | Legendární | Diamantové |
|---|---|---|---|---|---|
| 1 | 6,1 | 5,8 | – | – | – |
| 10 | 7,2 | 5,7 | 1,7 | 0,28 (1 za ~3,5 riftu) | – |
| 20 | 7,3 | 6,3 | 1,8 | 0,30 (1 za ~3,3) | 0,09 (1 za ~11) |
| 50 | 8,7 | 8,2 | 2,2 | 0,36 (1 za ~2,8) | 0,11 (1 za ~9) |
| 100 | 10,5 | 10,4 | 2,6 | 0,43 (1 za ~2,3) | 0,13 (1 za ~8) |

Většinu vzácných předmětů dává boss. Čísla jsou spočítaná z herních funkcí (`rollRarity`, `populateRift`); při změně vah je přepočítat.

**Co roste s vyšším riftem:** úroveň předmětů (vyšší základní staty a strop afixů do úrovně 100), šance na předmět (+1 % za úroveň), lepší kořist (`riftMf`, zpomaluje se), odemykání rarit (4 / 10 / 16).

### Hody afixů (v1.5)
- Hodnota = základ × (1 + úroveň/50, strop na úrovni 100 → max 3×) × hod 50–100 %.
- Hod je vychýlený k nízkým hodnotám (`affixRoll`, `q` v `RARITIES`). Vysoké hodnoty jsou vzácné a nejčastěji je mají legendárky:

| Rarita | Průměrný hod | Šance na hod nad 90 % |
|---|---|---|
| Zelená | 62 % | 7 % |
| Fialová | 66 % | 10 % |
| Legendární, diamantová | 72 % | 16 % |

- Příklad „% útok“: úroveň 41 průměr 3,4–3,9 %, max 5,5 % (dřív průměr 5,2 %, max 6,1 %); úroveň 100 průměr 5,6–6,5 %, max 9 % (dřív průměr 8,9 %, max 10,5 %).
- Starší předměty si hodnoty nechávají.

### Automatický prodej
- Nastavuje se po raritách v Nastavení i v okně postavy.
- Ve výchozím stavu je vypnutý pro všechny rarity (rozhodnutí v1.0.3, migrace `sellFix103`).

### Vzhled předmětů (v1.12)
- Ikony jsou hladké bílé symboly z game-icons.net (`js/item-icons.js`), každý typ předmětu má vlastní (meč, dýka, obouruční meč, sekera, palcát, kladivo, hůlka, hůl, luk, štít, kniha kouzel, helma, kápě, čelenka, kyrys, kroužková zbroj, kožená vesta, róba, kovové rukavice, rukavice, nohavice, kalhoty, boty, sandály, plášť, pláštěnka, amulet, talisman, prsten, pečetní prsten).
- **Dlaždice podle rarity** (styl C1): pozadí prosvícené barvou rarity a rámeček v její barvě, legendární a diamantové jemně září.
- **Očarování** (O1): kulatý znak živlu vpravo dole podle nejsilnějšího statu (`ENCHANTS`, `itemEnchant`): oheň, mráz, jed (příroda), stín, magie, zlato (zlato a lepší kořist), krev (vysávání). Šedé předměty očarování nemají. V popisku řádek „Očarování: …“.
- **Sety** (S1): znak setu v jeho barvě vlevo nahoře (`color`, `glyph` v `SETS`): Titán bronzový štít, Arcimág modrá hvězda, Stínový lovec zelená kápě, Pakt Prázdnoty fialový pentagram, Strážce Hvozdu zelený list.
- **Ohnisko** se od v1.12 jmenuje **Kniha kouzel** (starší předměty si název nechávají).

### Mýtický tier (v1.12)
- Nejvzácnější rarita (`mythic`, barva rudá). Nepadá losem rarity: **jen z bossů od podzemí 150, šance 1 %** na každého poraženého bosse (`MYTHIC_CHANCE`).
- Každý mýtický předmět je díl **mýtického setu své třídy** (5 setů po 6 dílech, `mythic: true` v `SETS`), chytrá kořist 85 % pro vlastní třídu:

| Třída | Set | Bonusy (1 / 3 / 6 dílů) |
|---|---|---|
| Válečník | Pekelný dobyvatel | +15 % útok, +10 % život / -12 % poškození, +25 % trny, +3 % vysávání / +50 % útok, +25 % dvojitý úder, +25 % život |
| Mág | Oko věčného plamene | +20 % síla dovedností, +15 % oheň / -20 % přebíjení, +15 % sesílání, +30 % krit. poškození / +50 % útok, +20 % ignoruje odolnosti, +20 % dvojitý úder |
| Černokněžník | Koruna spáleného krále | +20 % stín, +2 % vysávání / +40 % poškození v čase, +2 s, +5 % odolnosti / +50 % útok, +60 % mazlíčci, +4 % vysávání |
| Lovec | Lov rudého měsíce | +5 % krit., +15 % mazlíčci / +40 % krit. poškození, +12 % rychlost zbraní, +15 % průraz / +50 % útok, poprava, +40 % mazlíčci |
| Druid | Srdce hořícího hvozdu | +20 % příroda, +15 % léčení / regenerace, +12 % sesílání, +5 % odolnosti / +50 % útok, +60 % mazlíčci, +25 % život |

- Statistiky: násobek základu 1,9, 4 afixy s nejlepším hodem (`q` 0,7), hlavní atribut třídy 2,2× afixu, odolnost 80.
- **Vzhled:** bez rámečku, živý ohnivý prstenec (animace SVG) a rudě žhnoucí ikona; na zemi z předmětu stoupají jiskry.
- **Efekty na postavě** (`mythicPieces`): **3 díly = planoucí oči**, **6 dílů = hořící postava**. V inventáři animace na panáčkovi (`startDollFx` v `js/ui.js`), v podzemí oči a plameny kolem hrdiny (`drawHero` v `js/engine.js`). Vidí to i spoluhráči.

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
