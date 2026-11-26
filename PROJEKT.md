# World & Dungeons – projektový dokument

Tohle je hlavní vstupní bod pro každý nový chat s Claudem. Popisuje, co hra je, jak je kód poskládaný, co už je rozhodnuté a jak se pracuje. Podrobnosti k jednotlivým oblastem jsou v `docs/`.

## Co to je
- 2D akční RPG v prohlížeči ve stylu Diabla 3/4. Rifty s náhodnými mapami, strážce na konci, kořist, talenty, aktivní dovednosti.
- Hraje se na počítači i na mobilu (na výšku i na šířku).
- Zdarma pro kamarády. Každý má vlastní uložené postavy v prohlížeči (localStorage) a může je přenést exportním kódem.
- Autor (Jirka) neprogramuje. Všechno vzniká přes zadání v češtině, Claude píše kód, testuje ho a vysvětluje změny srozumitelně.
- Aktuální verze: **1.13.1** (konstanta `GAME_VERSION` v `js/data.js`).

## Kde hra běží
| Co | Kde |
|---|---|
| Kód | GitHub repozitář `jirka-cz/dungeons` (tento) |
| Hra pro kamarády | GitHub Pages: `https://jirka-cz.github.io/dungeons/` |
| Kalkulačka talentů | `https://jirka-cz.github.io/dungeons/kalkulacka/` |
| Starší kopie v Claude | artefakt hry `5323df1b-fc12-4e4c-b9b7-feba75985f9b`, artefakt kalkulačky `7bf6f806-59e3-42e3-a7af-21be9ca15783` |

Hlavní je verze na GitHub Pages. Artefakty v Claude se aktualizují jen na požádání (`publish_files` se slug výše, `base_version` zjistit přes `get_artifact`).

## Témata a dokumenty
Každé větší téma má vlastní dokument a vlastní chat (viz `docs/CHATY.md`):

| Téma | Dokument | Obsah |
|---|---|---|
| Jak pokračovat v chatech | `docs/CHATY.md` | instrukce projektu a úvodní zprávy |
| Talenty | `docs/talenty.md` | stromy tříd i ras, uzly, body, okno talentů, kalkulačka |
| **Herní design a balanc** | `docs/herni-design.md` | **znalostní báze: research (D3, D4, WoW, Grim Dawn, PoE), co Jirka chce, pravidla identity ras a tříd, cílová čísla balancu, postup a chyby, kterých se vyvarovat** |
| Rebalanc 1.13 | `docs/rebalanc.md` | research (D3, D4, WoW, Grim Dawn, PoE), rysy ras a tříd, rasové stromy, škálování a rozdíl úrovní |
| Postavy | `docs/postavy.md` | rasy, třídy, dovednosti, mazlíčci, úrovně, staty |
| Město | `docs/mesto.md` | obchodník (ekonomika zlata, obnovení, vylepšení), kovář, truhla, obelisk, odolnost |
| Dungeony | `docs/dungeony.md` | rifty, mapy, nepřátelé, elity, bossové a jejich mechaniky, svatyně, obtížnost |
| Předměty | `docs/predmety.md` | rarity, atributy, zbroj, afixy, legendárky a sety podle tříd, chytrá kořist, automatický prodej |
| Rozhraní | `docs/rozhrani.md` | ovládání PC/mobil, HUD, okna, nastavení, celá obrazovka |
| Technika | `docs/technika.md` | engine, ukládání a migrace, testy, nasazení, verze |
| Kooperace | `docs/kooperace.md` | hra více hráčů: etapy, pravidla družiny, více hrdinů v kódu |
| Rozšiřování | `docs/rozsireni.md` | **nová rasa, třída, typ zbraně/zbroje: kompletní seznam míst v kódu a pravidla vzhledu** |

## Struktura kódu
Čisté HTML + JavaScript + CSS, bez knihoven a bez sestavování. Výjimka (schválená): pro hru více hráčů se použije knihovna PeerJS na spojení přes kód místnosti. Skripty jsou globální (bez modulů) a načítají se v tomto pořadí (`index.html`):

`data → classes → talents → icons → items → sprites → world → fx → sfx → save → entities → skills → rift → bosses → inventory → ui → hud → lib/peerjs.min → net → engine`

| Soubor | Role |
|---|---|
| `js/data.js` | verze, rasy, povolené kombinace rasa/třída, nepřátelé, témata, elitní afixy, bossové, škálování (křivky, doporučená úroveň, rozdíl úrovní, XP), svatyně |
| `js/classes.js` | třídy, zdroje (zuřivost, mana…), základní dovednosti, mazlíčci, přebíjení |
| `js/talents.js` | další dovednosti, rasové dovednosti, talentové stromy tříd a ras, výpočet bodů a platnosti |
| `js/icons.js` | SVG ikony z game-icons.net (vygenerováno, ručně needitovat velké bloky) |
| `js/item-icons.js` | ikony předmětů, očarování a setů z game-icons.net (generuje `tools/gen-item-icons.js`, ručně needitovat) |
| `js/items.js` | typy předmětů, rarity, afixy, legendárky, sety, popisky statů, ceny |
| `js/sprites.js` | pixel art postav, nepřátel a objektů |
| `js/world.js` | generátor map (jeskyně, krypty), město, kolize, hledání cest |
| `js/fx.js`, `js/sfx.js` | částice a čísla poškození, syntetizované zvuky (WebAudio) |
| `js/save.js` | ukládání, migrace starších uložení, export/import |
| `js/entities.js` | výpočet statů, souboj, AI nepřátel, mazlíčci, projektily, kořist, XP |
| `js/skills.js` | sesílání dovedností a jejich efekty |
| `js/rift.js` | průběh riftu, svatyně, konec souboje s bossem, smrt a oživení |
| `js/bosses.js` | bossové: výběr, fáze, štít, vyčerpání, přerušení, běsnění, útoky, mechaniky a animace |
| `js/inventory.js` | výbava, batoh, truhla, obchod, oprava |
| `js/ui.js` | okna (menu, postava, talenty, obchod, nastavení…) |
| `js/hud.js` | HUD, lišta dovedností, rámečky spoluhráčů, dotykové ovládání |
| `js/net.js` | hra více hráčů: místnost, společné město, hlasování o podzemí, snímky stavu, odměny hostům |
| `js/lib/peerjs.min.js` | knihovna PeerJS 1.5.5 (MIT), vlastní kopie – spojení přes WebRTC |
| `js/engine.js` | herní smyčka, více hrdinů (`withHero`, `G.heroes`, `G.me`), ovládání, kamera, vykreslování |
| `css/style.css` | veškerý vzhled |
| `kalkulacka/index.html` | samostatná kalkulačka talentů, používá `../js/classes.js`, `talents.js`, `icons.js` |
| `tests/` | automatické testy (viz `docs/technika.md`) |

## Rozhodnutí, která platí (neměnit bez dotazu)
- **Bez stropu úrovně** (endless). Vyšší úrovně jdou pomaleji, nad úrovní 60 je talentový bod jen za každé 3 úrovně.
- **Klíčová pasivka** (zlatý uzel): nejvýš jedna v každém stromu, ne jedna celkem.
- **Portréty postav zůstávají pixelové.** Malované portréty byly zkoušené a zamítnuté.
- **Ikony** jen z game-icons.net (CC BY 3.0, uvést autory). Žádné emoji jako ikony dovedností.
- **Vzhled předmětů:** bílá hladká ikona na dlaždici v barvě rarity (styl C1), očarování = kulatý znak vpravo dole (O1), set = znak setu vlevo nahoře (S1), mýtický = animovaný ohnivý prstenec bez rámečku (E2). Postavy zůstávají pixelové.
- **Rozšiřování:** Jirka bude přidávat nové rasy, třídy a typy zbraní. Každá novinka musí dostat i vzhled (ikonu předmětu, pixelovou postavu s očima `e`, znaky setů) podle `docs/rozsireni.md`. Vzhled nejdřív ukázat ve 2–4 variantách a nechat Jirku vybrat.
- **Šedé předměty se automaticky neprodávají.** Automatický prodej je ve výchozím stavu vypnutý.
- **Česká klávesnice:** číselné klávesy se čtou přes `e.code` (Digit/Numpad), ne přes `e.key`.
- **Omezení rasa/třída:** člověk bez černokněžníka a druida; trpaslík bez mága, černokněžníka a druida; elf bez černokněžníka a válečníka; ork bez druida a mága; nemrtvý bez lovce a druida.
- **Na mobilu se útočí automaticky na nejbližšího nepřítele.**
- **Kooperace:** 2–4 hráči. Každý další hráč = +10 % nepřátel, jejich života a poškození. Postava se vyexpí sólo a stejná se použije ve společné hře. Kořist každý svoje. Po bossovi portál do města (žádný přesun dál) a další úroveň se odemkne všem v riftu.
- **Rifty se ve hře jmenují „Podzemí“** (rod střední: „Podzemí 12“, „Podzemí dokončeno!“, „strážce podzemí“). V kódu a dokumentaci zůstává slovo rift.
- **Texty ve hře jsou česky** a stručné. V okně talentů nepsat zbytečné nápovědy („Odemyká“, „Nejkratší cesta“ apod.).

## Jak pracovat (pro Clauda)
1. Na začátku chatu si stáhnout repozitář a přečíst `PROJEKT.md` a dokument tématu.
2. Měnit jen to, co Jirka zadal. Když je zadání nejasné nebo má víc rozumných řešení, krátce se zeptat. Nalezené chyby (něco nedělá, co má) rovnou opravit bez schvalování, pokud oprava nemění fungování něčeho jiného – a napsat o tom.
3. Po změně spustit testy, které se změny týkají (`docs/technika.md`), a u vizuálních změn udělat snímky obrazovky (počítač, mobil na výšku i na šířku).
4. Zvýšit `GAME_VERSION` v `js/data.js` a doplnit řádek do sekce Verze v `README.md`. Když se mění struktura uložení, přidat migraci v `js/save.js`.
5. Pokud se změnilo něco, co dokumenty popisují, aktualizovat příslušný `docs/*.md`.
6. Commit a push do `main`. GitHub Pages se aktualizuje sama za 1–2 minuty.
7. Jirkovi stručně česky napsat, co se změnilo a co má vyzkoušet.
8. Při přidání nové rasy, třídy nebo typu zbraně/zbroje projít kontrolní seznam v `docs/rozsireni.md` (data, ikona, pixelová postava, legendárky a sety, testy).
9. **Než navrhneš cokoli k rasám, třídám, dovednostem, talentům, předmětům nebo obtížnosti, přečti `docs/herni-design.md`** (research, pravidla identity, cílová čísla). Nový research dělej jen na to, co tam chybí, a nové poznatky do něj doplň. Po změně balancu spusť `tests/balance.py` a `tests/rebalance.py`.
