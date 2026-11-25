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
