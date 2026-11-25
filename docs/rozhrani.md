# Rozhraní a ovládání

## Ovládání na počítači
| Akce | Klávesa / myš |
|---|---|
| Pohyb | WASD nebo šipky |
| Základní útok | držet levé tlačítko (míří ke kurzoru). Pravý klik na 1. slot lišty zapne automatický útok ke kurzoru (také v Nastavení). |
| Dovednosti | pravé tlačítko a klávesy 1–4 (čtou se přes `e.code`, takže fungují i na české klávesnici) |
| Lektvar | Q |
| Postava / Talenty / Mapa | I / K / M |
| Teleport do města | Esc nebo T → menu → teleport (5 s) |
| Celá obrazovka | F |

## Ovládání na mobilu
- Joystick vlevo.
- Vpravo velké tlačítko útoku a kolečka dovedností. Velikost se přizpůsobuje výšce obrazovky.
- Útok vždy automaticky míří na nejbližšího nepřítele. Držení tlačítka útoku hrdinu k nepříteli přiblíží.
- Naučená dovednost se objeví na liště hned.

## HUD a okna
- **HUD:** koule života a zdroje, XP lišta, lišta dovedností (SVG ikony), buffy, ukazatel postupu riftu, tlačítka Postava / Talenty / Celá obrazovka / Menu. Na tlačítku Talenty svítí tečka, když jsou volné body.
- **Okna** (`showModal` v `js/ui.js`):
  - Menu, Tvorba postavy, Herní menu, Postava, Talenty, Obchod, Kovář, Truhla, Volba riftu, Nastavení, Legenda;
  - každé má nahoře křížek ✕.
- **Nastavení:**
  - zvuk;
  - automatický útok;
  - automatická celá obrazovka;
  - čísla poškození;
  - automatický prodej po raritách.

## Celá obrazovka
- Tlačítko ⛶ v menu a v HUD, klávesa F. Na dotykových zařízeních se zapne automaticky po „Hrát“ (dá se vypnout v Nastavení).
- Když prohlížeč nebo okno Claude celou obrazovku nedovolí, hra to oznámí hláškou.
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
