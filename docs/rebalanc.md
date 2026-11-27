# Rebalanc 1.13 – třídy, rasy, talenty a škálování

Cíl (zadání Jirky): aby rasa, třída i talenty měly **přímý a viditelný vliv** na hraní – ne jen vzhled a „poškození, poškození, poškození“. Válečník vydrží a bojuje zblízka, trpaslík je pomalý, elf mrštný, nemrtvý oživuje padlé jako kostlivce, lovec střílí v pohybu jako démonický lovec z Diabla 3. A čísla nesmí utéct do nesmyslu – úroveň hrdiny a výbava musí odpovídat podzemí a vyšší podzemí musí být výzva.

## Z čeho jsem vycházel (research)
| Hra | Co jsem převzal |
|---|---|
| **Diablo 3** | Třídy na blízko (barbar, křižák, mnich) mají vrozených **-30 % přijatého poškození**, protože dostávají víc ran → válečník *Železná kůže*. Démonický lovec: *Strafe* (střelba do všech stran v pohybu) a *Vault* (úskok) → lovec *Palba za běhu* a vylepšený *Úskok*. Nekromant: kostlivci s omezeným časem a počtem (Skeletal Mage max. 10, 6 s) → kostlivci nemrtvých. Škálování Velkých riftů: život nepřátel ×1,17 za úroveň, poškození jen ×1,02 nad úrovní 70 – život roste rychleji než poškození. |
| **Diablo 4** | Každá třída má **vlastní třídní mechaniku** (barbar Arsenal, nekromant Kniha mrtvých, čarodějka Očarování, druid Duchovní dary, zloděj Kombo body) → každá naše třída dostala třídní rys. Druid je měňavec, který v podobě šelmy bojuje zblízka. |
| **WoW** | **Rasové schopnosti** (Kamenná podoba trpaslíků, Splynutí se stínem nočních elfů, Krvavá zuřivost orků, Vůle opuštěných a Pojídání mrtvol nemrtvých, Každý sám za sebe u lidí, Velení – silnější mazlíčci u orků) → rasové dovednosti a rasové stromy. **Rozdíl úrovní**: proti silnějšímu nepříteli míjíš a dostáváš víc → postih za nízkou úroveň. |
| **Grim Dawn / Path of Exile** | Úroveň nepřátel podle oblasti, postih za velký rozdíl úrovní (PoE: bezpečné pásmo, pak postih) → doporučená úroveň podzemí. |

## 1. Rasy
| Rasa | Život | Útok | Obrana | Rychl. útoku | Pohyb | Rys | Rasová dovednost |
|---|---|---|---|---|---|---|---|
| Člověk | 105 | 11 | 3 | 100 % | 100 % | **Přizpůsobivost**: +10 % XP, +10 % lepší kořist, o 20 % kratší zmrazení a zpomalení | **Lidská vůle** – zruší zmrazení i ve zmrazení, 4 s imunita a +20 % útok |
| Trpaslík | 135 | 9 | 7 | 92 % | **86 %** | **Horská výdrž**: +8 % odolnosti, +15 % zlata, Horský stisk | **Kamenná podoba** – 8 s -40 % poškození, imunita na zpomalení, ale -20 % pohyb |
| Elf | 85 | 10 | 2 | 108 % | **114 %** | **Lesní mrštnost**: +8 % úhyb, +10 % krit; po pohybové dovednosti 2 s +30 % pohyb a +15 % úhyb | **Splynutí se stínem** – 3 s neviditelný (běžní nepřátelé neútočí), první útok kritický a ×2 |
| Ork | 115 | 13 | 2 | 97 % | 100 % | **Krvavý vztek**: +10 % útok; pod 50 % života +15 % útok a +10 % rychlost útoku | **Krvavá zuřivost** – 12 s +30 % útok a +15 % rychlost, ale polovina léčení |
| Nemrtvý | 95 | 10 | 3 | 100 % | 95 % | **Neživot**: vysává 4 %, zabití léčí 0,5 %, +10 % stín | **Povstání mrtvých** – 2 kostlivci na 15 s (najednou max. 4) |

**Rasový strom** (čtvrtá záložka v Talentech, 12 uzlů / 18 úrovní, body ze stejné zásoby): rasová dovednost, její zesílení a volba, pasivky a dvě klíčové pasivky (smíš mít jednu). Nejdůležitější mechaniky:
- **Nemrtví**: Kostěná armáda (+1 kostlivec), Kostěný mág (střílí ledové střely), **Vzkříšení padlých** (zabitý nepřítel s 10% šancí povstane jako tvůj kostlivec na 10 s), Kostěný štít (-3 % poškození za každého kostlivce), klíčové: *Armáda mrtvých* (+3 kostlivci, vzkříšení 25 %) nebo *Pán smrti* (+50 % síla, kostlivec při zániku vybuchne).
- **Trpaslíci**: Otřes na konci Kamenné podoby, Kamenná krev (pod 35 % života automaticky -40 % poškození), Žulová podoba (trny).
- **Elfové**: Vítr v zádech (pohybové dovednosti o 25 % kratší přebíjení), Rychlé reflexy (po úhybu +20 % útok), Smrtící stín.
- **Orkové**: Pomsta (po velkém zásahu +15 % útok), Velitel (+15 % mazlíčci), Krvavý válečník (dvojnásobný vztek).
- **Lidé**: Druhý dech (pod 30 % života okamžitě +25 %), Taktik, Zlatá horečka.

## 2. Třídní rysy (jako třídní mechaniky v Diablu 4)
| Třída | Rys | Jak se hraje |
|---|---|---|
| Válečník | **Železná kůže**: -25 % přijatého poškození (mimo strop 60 %) | Tank na blízko, skáče do boje |
| Mág | **Arkánní bariéra**: štít 15 % života, obnoví se po 5 s bez zásahu | Skleněné dělo, drží se v odstupu a teleportuje |
| Černokněžník | **Temný pakt**: kletby (DoT) ho léčí o 10 % svého poškození | Prokleje skupinu a žije z jejího utrpení |
| Lovec | **Lovec na dálku**: +1 % poškození za 10 bodů vzdálenosti nad 40 (max. +20 %), +5 % pohyb | Drží odstup, střílí v pohybu |
| Druid | **Proměnlivost**: v medvědí/vlčí podobě útočí drápy zblízka, v měsíční Hněv dvakrát, proměna léčí 10 % | Měňavec mezi dálkou a blízkem |

## 3. Nové dovednosti a mechaniky talentů
- Lovec: **Palba za běhu** (místo Rychlé palby v Lučištníkovi) – 3 s střílí sám do všech stran, volný pohyb. **Úskok** nechá výbušnou past.
- Mág: **Teleport** zmrazí nepřátele na místě, odkud zmizíš. Mráz – klíčová *Ledová zbroj*: kdo tě zasáhne zblízka, zamrzne. Oheň – *Spalování*: hoření přeskakuje.
- Válečník: Zbraně – *Popravčí*: Poprava okamžitě zabije nepřítele pod 20 % a obnoví se. Zuřivost – *Bouře ocele*: Vichřice vtahuje nepřátele.
- Druid: drápy v podobě šelmy (*Drápnutí*).

## 4. Škálování – čísla bez nesmyslu a výzva
**Problém:** všechno rostlo exponenciálně – život nepřátel ×1,24 za úroveň podzemí, výbava jen ×1,12. Od podzemí ~40 se nedalo hrát (elitu bys zabíjel minuty) a v podzemí 300 měl nepřítel 10^29 života.

**Nově** (`js/data.js`, nastaveno simulací `tests/balance.py`):
- **Výbava** roste do úrovně předmětu 60 stejně jako dřív (+6 %/úroveň), pak pomaleji (až +0,5 %). Zlato roste stejně jako výbava, takže ceny zůstávají v poměru.
- **Nepřátelé** podle tabulek `RIFT_HP_CURVE` a `RIFT_ATK_CURVE`: hrdina na běžné úrovni s výbavou z podzemí zabije elitu za ~2–3 s v podzemí 1, ~7 s ve 20, ~13 s ve 100 a ~16–18 s ve 300; elita ho zabije zhruba za 30 zásahů v podzemí 1, ~17 ve 20 a ~12 od podzemí 100 (válečník vydrží víc, mág míň). Podzemí 300: život nepřítele ~26 mil., podzemí 500 ~14,5 mil. × základ – žádné 10^29.
- **Úroveň hrdiny**: +1 % útoku a života za úroveň (násobí vše), takže úroveň je cítit.
- **Doporučená úroveň** podzemí = 0,8 × úroveň podzemí (100 → 80, 250 → 200, 350 → 280). Za každou úroveň **pod** doporučenou ti nepřátelé dávají o 3 % víc a ty jim o 3 % míň (násobí se: 20 úrovní ≈ ×1,8, 80 úrovní ≈ ×10). Nad doporučenou jsou o 1 % slabší za úroveň (max. -15 %). Platí pro každého hráče v družině zvlášť.
  - Příklad ze zadání: hrdina úrovně 200 v podzemí 250 (doporučeno 200) – záleží na výbavě; v podzemí 350 (doporučeno 280) je o 80 úrovní níž → nepřátelé ho ničí 10× silněji a on jim dává desetinu. Nedá se.
- **Zkušenosti**: do úrovně 30 jako dřív, pak XP na úroveň roste jen o 1,5 % za úroveň (úroveň 100 ≈ 3 mil. XP, 200 ≈ 33 mil.) a XP z nepřátel podle `RIFT_XP_CURVE`. Jedno podzemí na doporučené úrovni dá v podzemí 10 asi 1 úroveň, ve 30 asi ½, ve 100 asi ⅕ a ve 300 asi 1/10 – vyšší úrovně jdou pomaleji, jak je rozhodnuto. Od v1.14 to zajišťuje násobek `XP_RATE_CURVE` (`xpRate` v `js/data.js`); do té doby dávalo podzemí 10 přes 4 úrovně a podzemí 30 tři a půl.
- Velká čísla se ukazují zkráceně (12,3 tis., 4,5 mil.).

## Testy
- `python3 tests/rebalance.py` – všechny nové mechaniky ras, tříd a talentů a rozdíl úrovní.
- `python3 tests/balance.py table` – tabulka síly hrdiny a nepřátel po podzemích pro všechny třídy; `fit` – podklady pro tabulky křivek; `bot` – bot projde podzemí se syntetickou postavou.
