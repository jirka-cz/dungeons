# World & Dungeons

2D akční RPG v prohlížeči ve stylu Diabla 3/4: rifty s náhodnými mapami, stovky nepřátel, náhodný strážce na konci, kořist, talenty a aktivní dovednosti. Běží na počítači i mobilu.

## Spuštění
- Lokálně: otevři `index.html` v prohlížeči.
- Online: GitHub Pages (viz níže).

## Nasazení na GitHub Pages
1. Veřejný repozitář `jirka-cz/dungeons` s obsahem této složky.
2. Settings → Pages → Branch `main`, složka `/ (root)` → Save.
3. Hra poběží na `https://jirka-cz.github.io/dungeons/`, kalkulačka talentů na `https://jirka-cz.github.io/dungeons/kalkulacka/`.

## Talenty (v1.1)
Každá třída má **strom třídy** a **dvě specializace**:

| Třída | Strom třídy | Specializace 1 | Specializace 2 |
|---|---|---|---|
| Válečník | Válečník (štít, pokřik) | Zuřivost (dvě zbraně, rozzuření) | Zbraně (obouručka, krvácení, popravy) |
| Mág | Arkána (mana, štít) | Oheň (výbuchy, hoření) | Mráz (zpomalení, zmrazení, tříštění) |
| Černokněžník | Temná magie (pakt, chaos) | Kletby (DoT, nákaza) | Démonologie (skřeti, ohař, proměna) |
| Lovec | Lovec (pasti, jedy) | Lučištník (přesné šípy, popravy) | Pán šelem (smečka, Divoký hněv) |
| Druid | Příroda (léčení, enti) | Rovnováha (měsíc a hvězdy) | Divočina (medvěd, vlk) |

Tvary uzlů jako ve WoW: čtverec = dovednost, malý čtverec s + = zesílení dovednosti, osmiúhelník = volba jedné ze dvou, kruh = pasivka, velký zlatý kruh = klíčová pasivka (v každém stromu smíš mít jen jednu). Řádky se odemykají utracenými body ve stromu (5 / 12 / 20 / 26). Bod za úroveň, na úrovni 60 máš 59 bodů a stromy jedné třídy mají 115 úrovní talentů.

## Ovládání
- **Počítač:** WASD / šipky = pohyb, držení levého tlačítka = základní útok ke kurzoru (pravý klik na 1. slot lišty zapne automatický útok), pravé tlačítko a 1–4 = dovednosti, Q = lektvar, I = postava, K = talenty, M = mapa, T nebo Esc → teleport do města (5 s).
- **Mobil:** joystick vlevo, vpravo velké tlačítko útoku a kolečka dovedností.

## Herní smyčka
Město (obchodník, kovář, truhla, obelisk) → rift zvolené úrovně → plnění postupu → strážce riftu → portál zpět. Vyšší úroveň = silnější nepřátelé, lepší kořist. Výbava se opotřebovává (smrt -10 %), opravuje kovář.

## Struktura
- `js/data.js` – rasy, nepřátelé, elitní afixy, bossové, témata riftů, škálování
- `js/classes.js` – třídy, zdroje, výchozí dovednosti, mazlíčci
- `js/talents.js` – 35 dalších dovedností a talentové stromy (strom třídy + 2 specializace pro každou třídu)
- `js/items.js` – předměty, rarity, sety, legendárky, odolnost
- `js/sprites.js` – pixel art postav, nepřátel a ikon
- `js/world.js` – generátor map (jeskyně, krypty), městečko, kolize, hledání cest
- `js/fx.js` – částice, výbuchy, čísla poškození
- `js/sfx.js` – syntetizované zvuky (WebAudio, bez souborů)
- `js/entities.js` – staty, souboj, AI nepřátel, mazlíčci, projektily, kořist, XP
- `js/skills.js` – sesílání dovedností
- `js/rift.js` – průběh riftu, svatyně, smrt
- `js/bosses.js` – bossové: fáze, mechaniky, útoky a animace
- `js/inventory.js` – výbava, batoh, truhla, obchod, oprava
- `js/ui.js`, `js/hud.js` – rozhraní a HUD
- `js/engine.js` – herní smyčka, ovládání, kamera, vykreslování
- `kalkulacka/` – kalkulačka talentů (používá soubory hry)
- `tests/` – automatické testy
- `PROJEKT.md` a `docs/` – dokumentace pro další vývoj

## Verze
- **1.13.1** – lišta efektů nahoře: všechny buffy, rysy, které právě působí (arkánní bariéra, krvavý vztek, kostlivci, stín) a postihy (zmrazení, zpomalení, nízká úroveň); najetím myší nebo klepnutím se ukáže popis. V okně postavy jsou rasa a třída štítky s popisem rysu a nová sekce Efekty.
- **1.13.0** – velký rebalanc (research Diablo 3/4, WoW, Grim Dawn, PoE – viz `docs/rebalanc.md`): rasy mají rysy a jinou rychlost pohybu (trpaslík pomalý a odolný, elf rychlý a mrštný) a **vlastní rasový strom** s rasovou dovedností (Lidská vůle, Kamenná podoba, Splynutí se stínem, Krvavá zuřivost, Povstání mrtvých – nemrtví oživují padlé jako kostlivce); třídy mají třídní rysy (válečník -25 % poškození, mág arkánní bariéra, černokněžník se léčí kletbami, lovec silnější na dálku, druid útočí drápy v podobě šelmy); lovec má Palbu za běhu, nové mechaniky talentů (Popravčí, Bouře ocele, Ledová zbroj, mrazivý Teleport, past z Úskoku); nové škálování – čísla už neutíkají do nesmyslu, úroveň hrdiny +1 % útoku a života za úroveň, doporučená úroveň podzemí a postih za nižší úroveň (jako WoW); talentové body vráceny.
- **1.12.0** – nové hladké ikony všech předmětů, dlaždice podle rarity, znaky očarování a setů; nová rarita Mýtický (třídní sety, jen z bossů od podzemí 150, animovaný oheň, planoucí oči a hořící postava); ohnisko je teď Kniha kouzel; trpaslík udrží dvě obouruční zbraně na blízko.
- **1.11.0** – město: okno obchodníka, kováře, truhly a obelisku se otevře samo, když k nim přijdeš (blíž než ~2 dlaždice). Když dál držíš pohyb a odejdeš (dál než 3,5 dlaždice), okno se samo zavře; hra se s oknem objektu ve městě nezastavuje. Po ručním zavření se okno znovu otevře až po odchodu a novém příchodu. Klik na postavu funguje dál.
- **1.10.0** – „jatka“ v podzemí: skupiny běžných nepřátel jsou 3× větší (v podzemí je ~280–370 nepřátel místo ~100–145), někdy se do skupiny přimíchá druhý druh a elity mají s sebou 4–6 běžných nepřátel. Běžní nepřátelé v davu mají 40 % života a 50 % útoku a každý dává jen třetinu zlata, XP, postupu a šance na předmět – za celé podzemí tak vychází zlato, zkušenosti i kořist stejně jako dřív. Elity a strážci beze změny.
- **1.9.0** – obchodník: obnovení zboží za zlato (10 % zlata za jeden běh podzemí, každé další o 5 % dráž, po dokončeném podzemí znovu od 10 %) a vylepšení obchodníka (úroveň n stojí n běhů, max. 20; každá úroveň +0,5 % epické, +0,3 % legendární, +0,1 % diamantové zboží). Zboží se ukládá a nové je zdarma jen po dokončeném podzemí (ne po teleportu do města nebo znovunačtení).
- **1.8.1** – hra více hráčů: když se místnost nepodaří založit nebo se k ní nepřipojit (síť, špatný kód), hra to po 15–20 s oznámí místo nekonečného čekání.
- **1.8.0** – hra více hráčů (2–4): v menu „Hrát s přáteli“ se založí místnost s kódem nebo se k ní připojí; společné město, výběr podzemí s potvrzením ostatních (30 s), společné podzemí po internetu (u hostitele běží hra, každý si odnese své XP, zlato a kořist), rámečky spoluhráčů, oživení spoluhráče u těla, návrat do rozehraného podzemí.
- **1.7.2** – rifty se ve hře jmenují „Podzemí“ (obelisk, HUD, okna, talenty, kalkulačka).
- **1.7.1** – oprava: Ledová koule konečně rozstřikuje ledové úlomky; louže po dechu Pekelného démona a Gorgula (a další zóny vzniklé během jiných útoků) se už neztrácejí.
- **1.7.0** – příprava na hru více hráčů: jádro hry počítá s více hrdiny v riftu (zatím jen interně, hraje se dál sám), každý další hráč přidá +10 % nepřátel, jejich života a poškození; obelisk nabízí nejvyšší odemčený, poslední dokončený nebo libovolný dokončený rift.
- **1.6.1** – oprava: na malých mapách bylo občas málo nepřátel na 100 % postupu a boss se neobjevil; teď se nepřátelé vždy rozmístí a když přesto dojdou, boss se objeví i tak.
- **1.6.0** – předělaní bossové: 3 fáze, velké útoky s varováním (část poškození v % života), vyčerpání (+50 % poškození), přerušitelná kouzla, běsnění po 2 minutách; každý boss má vlastní mechaniku a animace (kamenný štít, fylakterie, pekelné brány, vajíčka, garda, ledové přeludy, hák, tma a prokletí); 3 noví bossové: Ledová vědma Ysolda, Hnilobný Gorgul a Xal'Vor, Pán stínů; stejný boss se neopakuje 3 rifty po sobě.
- **1.5.0** – vysoké hodnoty afixů jsou vzácné (legendárky mají nejlepší šanci), procenta celkově menší; vzácné rarity vzácnější; bonus riftu ke kořisti roste se zpomalením místo bez omezení.
- **1.4.0** – atribut Duch přejmenován na Moudrost; rebalanc odolností: nejvýš 10 % proti jednomu živlu na předmět (i u legendárek), nižší odolnosti z lehké zbroje, plášťů a afixů, intelekt +0,2 % za bod; starší předměty se při načtení upraví.
- **1.3.0** – atribut Duch (obnova many a zdroje), rychlost sesílání a rychlost útoku zbraní, velká sada náhodných bonusů (poškození se zbraní, dovednosti, proti elitám, nemrtvým, šelmám a démonům, cena a obnova zdroje, obrana proti střelám a plošným útokům…), přehled zdroje v okně postavy.
- **1.2.0** – atributy Síla, Obratnost, Intelekt a Výdrž; těžká zbroj dává obranu, lehká odolnosti; legendárky a sety jen pro určité třídy (+ 6 nových legendárek, sety pro černokněžníka a druida); chytrá kořist podle třídy.
- **1.1.7** – na mobilu po zapnutí celé obrazovky hra vyplní celý displej (bez prázdného pruhu dole).
- **1.1.6** – celá obrazovka (tlačítko, klávesa F, automaticky na mobilu), instalace na plochu, talenty na mobilu na šířku ve dvou sloupcích.
- **1.1.5** – talenty přes tlačítka + a −, potvrzení vybraných talentů.
- **1.1.4** – stručnější detail talentu, volby rozdělené na dva menší uzly.
- **1.1.3** – dovednosti na klávesách 1–4 fungují i s českou klávesnicí.
- **1.1.2** – klíčová pasivka: jedna v každém stromu.
- **1.1.1** – nové ikony (game-icons.net), zvýraznění cest ve stromu, bez stropu úrovně.
- **1.1.0** – nové talentové stromy (strom třídy + 2 specializace, volby, zesílení, klíčové pasivky), 35 nových dovedností, podmíněné bonusy (dvě zbraně, obouručka, štít, podoby), body se vrátily.
- **1.0.1–1.0.4** – WASD, automatický útok, teleport do města, přebíjení kouzel, těžší rifty, boss u hráče, automatický prodej vypnutý, omezení rasa/třída.
- **1.0.0** – nový způsob hry: rifty jako v Diablu 3, volný pohyb, aktivní dovednosti, bossové, město, postavy s úrovněmi, odolnost předmětů.
- 0.1–0.5 – idle verze (patra, perky, automatický souboj).

## Licence ikon
Ikony dovedností a talentů pocházejí z [game-icons.net](https://game-icons.net) (autoři Lorc, Delapouite a další), licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
