# Rozhraní a ovládání

## Ovládání na počítači
| Akce | Klávesa / myš |
|---|---|
| Pohyb | WASD nebo šipky |
| Základní útok | držet levé tlačítko (míří ke kurzoru). Pravý klik na 1. slot lišty zapne automatický útok ke kurzoru (také v Nastavení). |
| Dovednosti | pravé tlačítko a klávesy 1–9, další řádky lišty Shift + 1–9 (čtou se přes `e.code`, takže fungují i na české klávesnici: Shift + „+“ = ⇧1) |
| Kniha dovedností | P (nebo tlačítko s knihou v HUD) |
| Lektvar | Q |
| Postava / Talenty / Mapa | I / K / M |
| Teleport do města | Esc nebo T → menu → teleport (5 s) |
| Celá obrazovka | F |

## Ovládání na mobilu
- Joystick vlevo.
- Vpravo velké tlačítko útoku a dva kruhy koleček dovedností: vnitřní RMB a 1–3, vnější 4–8 (lišta pozice 1–9). Nad nimi lektvar a portál. Velikost se přizpůsobuje výšce obrazovky.
- Útok vždy automaticky míří na nejbližšího nepřítele. Držení tlačítka útoku hrdinu k nepříteli přiblíží.
- Naučená dovednost se objeví na liště hned (na první volné místo).

## Lišta a Kniha dovedností (v1.15)
- **Lišta:** řádek má 8 pozic – LMB, RMB, 1–6 – a lektvar. Když jsou všechny pozice plné a zbývá dovednost, přibude **pod ní další řádek** se stejným počtem pozic (klávesy 7, 8, 9, pak ⇧1 … ⇧9), nejvýš 3 řádky (`BAR_COLS`, `BAR_MAX_ROWS`, `barRows`, `normBar`, `barKey` v `js/ui.js`).
- **Kniha dovedností** (`showSpellbook`): všechny dovednosti postavy (základní + odemčené v talentech, včetně buffů a léčení) s cenou, přebíjením a popisem; u dovednosti na liště je štítek s klávesou.
  - Počítač: přetáhni dovednost na pozici, nebo klikni na dovednost a pak na pozici. Klik na obsazenou pozici dovednost „vezme“ a další klik ji přesune (obsah pozic se prohodí). Tlačítko **Odebrat z lišty**.
  - Mobil: klepni na dovednost a pak na pozici (tažení je vypnuté, aby šlo okno posouvat).
- Prázdná pozice na liště otevře Knihu dovedností. V okně talentů zůstává rychlé přiřazení a odkaz na knihu.

## HUD a okna
- **HUD:** koule života a zdroje, XP lišta, lišta dovedností (SVG ikony), buffy, ukazatel postupu riftu, tlačítka Postava / Talenty / Kniha dovedností / Celá obrazovka / Menu. Na tlačítku Talenty svítí tečka, když jsou volné body.
- **Okna** (`showModal` v `js/ui.js`):
  - Menu, Tvorba postavy, Herní menu, Postava, Talenty, Obchod, Kovář, Truhla, Volba podzemí (obelisk), Nastavení, Legenda, Hrát s přáteli (místnost), Návrh podzemí (hlasování);
  - každé má nahoře křížek ✕.
  - Okna objektů ve městě (Obchod, Kovář, Truhla, obelisk) se otevřou přiblížením a zavřou odchodem (držený pohyb pokračuje i s otevřeným oknem) – podrobně `docs/mesto.md`.
- **Nastavení:**
  - zvuk;
  - automatický útok;
  - automatická celá obrazovka;
  - čísla poškození;
  - automatický prodej po raritách.

## Celá obrazovka
- Tlačítko ⛶ v menu a v HUD, klávesa F. Na dotykových zařízeních se zapne automaticky po „Hrát“ (dá se vypnout v Nastavení).
- Když prohlížeč nebo okno Claude celou obrazovku nedovolí, hra to oznámí hláškou.
- Plátno se vždy roztáhne na celé okno a po přepnutí celé obrazovky nebo otočení telefonu se velikost přeměří ještě se zpožděním (prohlížeč ji hlásí pozdě).
- Pruh nahoře u výřezu kamery může na Androidu zůstat. Ten patří systému/prohlížeči, stránka do něj kreslit nesmí, pokud to telefon nedovolí (nastavení výřezu kamery u aplikace Chrome).
- iPhone nepodporuje celou obrazovku pro stránku. Řešením je „Přidat na plochu“ – hra má manifest (`manifest.webmanifest`, `display: fullscreen`) a ikony `icon-192.png` a `icon-512.png`.

## Kde v kódu
- `js/engine.js` – klávesnice a myš (`keyOf`, `heroControl`, `autoTarget`), recall;
- `js/hud.js` – HUD a dotykové ovládání;
- `js/ui.js` – okna, nastavení, celá obrazovka (`toggleFullscreen`);
- `css/style.css` – vzhled včetně rozložení na mobilu na šířku (`orientation: landscape` a `max-height: 560px`).

## Rozhodnutí
- Na mobilu automatické míření na nejbližšího.
- Stručné texty, žádné zbytečné nápovědy.
- Ikony z game-icons.net, ne emoji.

## Testy
`python3 tests/controls.py`, `tests/czkeys.py`, `tests/mobauto.py`, `tests/mob2.py`, `tests/panels.py`, `tests/land_tal.py`. Vizuální změny vždy ověřit snímky: počítač, mobil na výšku, mobil na šířku.

## Hra více hráčů (od 1.8.0)
- **Herní menu → 👥 Hrát s přáteli:** založit místnost (velký kód k přeposlání) nebo se připojit kódem; seznam hráčů (třída, úroveň, ve městě / v podzemí), Opustit místnost.
- **Rámečky spoluhráčů** vlevo (jméno, úroveň, život, „† padl“, „v podzemí / ve městě“). Na mobilu níž, aby nepřekážely.
- **Návrh podzemí:** u obelisku tlačítko „Navrhnout“; ostatním okno s úrovní, informací o síle a odpočtem 30 s (Přijmout / Odmítnout); navrhovatel vidí, kdo už souhlasí, a může návrh zrušit.
- Nad spoluhráči jejich jméno, kroužek oživování nad padlým.
- V družině se hra s otevřeným oknem nezastavuje.

## Lišta efektů (od 1.13.1)
- Pod ukazatelem podzemí (`#buffs`, `renderBuffs` a `heroEffects` v `js/hud.js`): dočasné buffy, rysy rasy/třídy, které právě působí (arkánní bariéra s aktuální hodnotou, krvavý vztek orka, kostlivci, stín), a postihy červeně (zmrazení, zpomalení, nižší úroveň než doporučená).
- Najetím myší se ukáže popis, na mobilu klepnutím (popis zůstane 4 s). Prvky se nepřekreslují celé, jen text, aby na ně šlo klepnout.
- Okno postavy: rasa a třída jako štítky v nadpisu (popis rysu po najetí/klepnutí) a sekce **Efekty** (trvalé rysy + to samé co lišta, s plným popisem).
- Nový buff nebo efekt: přidat do `heroEffects` (jméno, ikona z game-icons, popis), u dovednosti se popis bere z `SKILLS[id].desc`.
