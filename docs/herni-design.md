# Herní design a balanc – znalostní báze pro AI

**Přečti před každou prací na rasách, třídách, dovednostech, talentech, předmětech nebo obtížnosti.** Shrnuje research z listopadu 2026 (Diablo 3, Diablo 4, WoW, Grim Dawn, Path of Exile) a pravidla, na kterých se Jirka shodl. Cílem je nedělat research znovu a neodbočit od směru hry. Konkrétní místa v kódu jsou v `docs/rozsireni.md`, podrobnosti rebalancu 1.13 v `docs/rebalanc.md`.

## 1. Co Jirka chce (zadání, neměnit bez dotazu)
- Rasa, třída i talenty musí mít **přímý a viditelný vliv na hraní**. Ne jen vzhled a ne jen „+X % poškození“. Hráč má rozdíl poznat do minuty hraní.
- Fantazie musí sedět: válečník vydrží a bojuje zblízka, trpaslík je odolný a pomalý, elf mrštný a křehký, ork zuřivý, nemrtvý oživuje padlé, lovec je mrštný střelec jako démonický lovec z D3 (běhá a střílí).
- Hra má být **zábavná, ne repetitivní**: dovednosti mají mít užitek (pohyb, kontrola davu, obrana, mazlíčci), ne jen poškození.
- **Čísla nesmí utéct do nesmyslu.** Úroveň hrdiny a výbava musí odpovídat podzemí a vyšší podzemí musí být výzva (příklad: úroveň 200 → podzemí 250 jde podle výbavy, podzemí 350 nejde).

## 2. Research – co jsem zjistil a k čemu to je
| Zdroj | Poznatek | Jak je použitý u nás |
|---|---|---|
| Diablo 3 | Třídy na blízko (barbar, křižák, mnich) mají vrozených **-30 % přijatého poškození**, protože musí stát v davu | Válečník *Železná kůže* -25 % (`dr`) |
| Diablo 3 | Démonický lovec: *Strafe* (střelba do všech stran při pohybu), *Vault* (úskok, levný a častý), „skleněné dělo s pohybovou dovedností“ | Lovec *Palba za běhu*, *Úskok* s pastí, bonus za vzdálenost |
| Diablo 3 | Nekromant: Skeletal Mage max. 10 kusů, každý jen ~6 s; Command Skeletons max. 7; kostlivci = „dočasná armáda“ | Kostlivci nemrtvých: max. 4 (+3 talentem), 10–15 s |
| Diablo 3 | Runy dovedností: jedna dovednost, několik variant, které **mění chování** (ne jen čísla) | Uzly `enh` a `choice` mají měnit chování (vtahování, zmrazení, past…) |
| Diablo 3 – Velké rifty | Život nepřátel ×1,17 za úroveň, poškození ×1,13 (1–25), ×1,07 (26–70), ×1,023 (71+). Život roste rychleji než poškození → výzva je hlavně v čase zabíjení, ne v okamžité smrti | Naše křivky: poškození nepřátel roste pomaleji než život, aby se dalo přežít |
| Diablo 4 | Každá třída má **vlastní třídní mechaniku** (barbar Arsenal, nekromant Kniha mrtvých, čarodějka Očarování, druid Duchovní dary, zloděj Kombo body) | Každá třída má třídní rys (`trait`) |
| Diablo 4 | Druid = měňavec, v podobě šelmy bojuje zblízka; zloděj kombinuje blízko i dálku | Druid *Proměnlivost* (drápy v podobě šelmy) |
| WoW | **Rasové schopnosti** jsou aktivní i pasivní a odpovídají fantazii: trpaslík *Stoneform*, noční elf *Shadowmeld* a *Quickness*, ork *Blood Fury* a *Command* (mazlíčci), nemrtvý *Will of the Forsaken* a *Cannibalize*, člověk *Every Man for Himself* a *Human Spirit* | Rasové stromy s rasovou dovedností (`RACE_TALENTS`) |
| WoW | Útok na nepřítele o víc úrovní výš: míjení +11 % za úroveň nad 3 úrovně, -1 % krit za úroveň, „glancing blows“ | Postih za rozdíl úrovní (`levelGapMul`) |
| Grim Dawn / PoE | Úroveň nepřátel podle oblasti, PoE má bezpečné pásmo úrovní a pak postih XP | Doporučená úroveň podzemí (`recLevel`) |

## 3. Pravidla identity (kontrolní otázky pro každou novinku)
Každá rasa a každá třída musí mít jasný profil v těchto osách. Nová rasa nebo třída se nesmí profilem kopírovat s existující:

| Osa | Příklady nástrojů v kódu |
|---|---|
| Dosah (blízko / dálka / obojí) | typ základní dovednosti, `rangeBonus`, `effSkill` |
| Odolnost (tank / střed / křehký) | `hp`, `def`, `dr`, `barrier`, `resAll` |
| Pohyblivost | `ms` (pohyb), pohybové dovednosti (`leap`, `dash`, `teleport`), `moveCdr`, `elfDash` |
| Udržitelnost (jak se léčí) | `ls`, `dotLeech`, `killHeal`, `regen`, léčivé dovednosti |
| Vlastní mechanika | rys + aspoň jedna dovednost, kterou nikdo jiný nemá |

Současné profily:
| | Dosah | Odolnost | Pohyb | Léčení | Mechanika |
|---|---|---|---|---|---|
| Válečník | blízko | tank (-25 %) | skoky | vysávání, Krvežíznivost | zuřivost, rozzuření |
| Mág | dálka | křehký + bariéra | teleport | – | bariéra, zmrazení, výbuchy |
| Černokněžník | dálka | střed | malý | kletby léčí | DoT, démoni |
| Lovec | dálka (víc z dálky) | střed | nejvyšší (úskok, +5 %) | – | střelba v pohybu, pasti, vlk |
| Druid | obojí | střed | podoby | regenerace, Omlazení | proměny |
| Člověk | – | střed | 100 % | – | odolnost vůči CC, XP, kořist |
| Trpaslík | – | nejodolnější | 86 % | – | kamenná podoba, odolnosti |
| Elf | – | křehký, úhyb | 114 % | – | neviditelnost, mrštnost |
| Ork | – | střed | 100 % | – | silnější při nízkém životě, mazlíčci |
| Nemrtvý | – | střed | 95 % | vysávání, zabití | kostlivci |

**Pravidla pro talenty:**
- Klíčová pasivka (`key`) a aspoň jedna možnost u každé volby (`choice`) mají **měnit chování**, ne jen přidat procenta.
- Čisté „+X % poškození“ uzly jsou výplň. Nepřidávat další, raději užitek (pohyb, CC, přežití, mazlíčci).
- Každá nová mechanika = nový klíč v `TALENT_KEYS` + kód + test v `tests/rebalance.py`.
- Rasové dovednosti nestojí zdroj (třídy mají různé zdroje), jen přebíjení 20–45 s.

## 4. Balanc – čísla a jak je nastavit
**Model:** síla hrdiny = výbava (`itemPow` podle úrovně předmětu) × úroveň (`levelMul`, +1 %/úroveň) × kvalita buildu (rarita, atributy, talenty). Nepřátelé = `RIFT_HP_CURVE` a `RIFT_ATK_CURVE` (tabulky v `js/data.js`) × rozdíl úrovní (`levelGapMul`, počítá se u hrdiny – každý v družině zvlášť).

**Cílové hodnoty** (hrdina na přirozené úrovni, výbava z daného podzemí, pomocí `python3 tests/balance.py table`):
| Podzemí | Zabití elity | Elita zabije hrdinu za (zásahů) |
|---|---|---|
| 1 | 2–3 s | ~30 |
| 20 | ~7 s | ~17 |
| 100 | ~13 s | ~12 |
| 300 | 16–18 s | ~12 (válečník víc, mág míň) |

**Pevná pravidla:**
- Nikdy zpátky k čistým exponenciálám bez stropu růstu (dřív ×1,24 za úroveň → v podzemí 300 bylo 10²⁹ života).
- Poškození nepřátel roste pomaleji než jejich život (jako D3).
- Doporučená úroveň = 0,8 × podzemí; pod ní +3 % / -3 % za úroveň (násobí se), nad ní max. -15 %.
- Zlato roste stejně jako výbava (`goldPow`), aby ceny zůstaly v poměru.
- Vyšší úrovně jdou pomaleji (rozhodnutí v `PROJEKT.md`), XP podle `RIFT_XP_CURVE`.
- Rozdíl mezi třídami v „zabití elity“ do ~2× je v pořádku (lovec rychlý, válečník pomalejší, ale vydrží). Větší rozdíl nebo třída, která na cílových úrovních umírá, = chyba balancu.

**Postup při změně čísel nebo přidání třídy/rasy:**
1. `python3 tests/balance.py table` – zkontrolovat sloupce pro všechny třídy.
2. Když se mění křivky: `python3 tests/balance.py fit` a body tabulek přepočítat z cílů výše (výpočet je popsaný v `docs/rebalanc.md`).
3. `python3 tests/balance.py bot '{"cls":"…","race":"…","L":[3,15,40,100,200]}'` – bot musí podzemí dokončit s rozumným počtem smrtí (bot neuhýbá, jednotky smrtí jsou v pořádku, desítky ne).
4. `python3 tests/rebalance.py`, `node tests/validate_talents.js`.

## 5. Čeho se vyvarovat (chyby, které už jednou nastaly)
- Rasa měnila jen rychlost útoku, ne pohyb → „pomalý trpaslík“ nebyl cítit. Pohyb je `ms`.
- Všechny klíčové pasivky byly „+60 % něčeho“ → hraní se nelišilo.
- Simulace s nerealistickou výbavou (legendárky nahradily sloty) dala špatné křivky – výbavu v `tests/balance.py` nechat tak, jak je.
- Testovací bot se u střelců občas zasekne v mapě (chyba bota, ne hry) – výsledek „0 smrtí, nízký postup“ ignorovat a spustit znovu.
- Přátelské jednotky musí být vizuálně odlišené od nepřátel (kostlivci mají zelený kroužek a jiné barvy).
