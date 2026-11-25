# Kooperace (hra více hráčů)

## Cíl
Hráč si postavu vyexpí sám (jako dnes) a stejnou postavu pak použije ve společné hře s kamarády. Postava zůstává uložená v prohlížeči každého hráče. Při společné hře ji „přinese s sebou“ a po hře se mu do vlastního uložení zapíše XP, zlato a kořist.

## Plán (etapy)
| Etapa | Co | Stav |
|---|---|---|
| 1 | Jádro pro víc hrdinů (navenek beze změny), zesílení nepřátel, výběr úrovně riftu | **hotovo v 1.7.0** |
| 2 | Založení a připojení do místnosti (kód místnosti) | čeká |
| 3 | Společný rift po síti: pohyb, souboj, XP a kořist každému zvlášť, zápis do uložení každého hráče | čeká |
| 4 | Doladění: oživování spoluhráče, ukazatele spoluhráčů v HUD, odchod/příchod během riftu | čeká |

### Navržený způsob spojení (zatím neschváleno)
- Jeden hráč je **hostitel**: u něj běží celá hra (nepřátelé, bossové, kořist). Ostatní posílají vstup (pohyb, sesílání) a dostávají stav.
- Spojení prohlížečů napřímo (WebRTC) – zdarma, bez vlastního serveru. Pro kód místnosti návrh knihovny PeerJS a jejího bezplatného zprostředkovacího serveru – **čeká na souhlas** (PROJEKT.md říká „bez knihoven“).
- Prodleva se schová předbíháním: vlastní pohyb a kouzla se ukážou hned, výsledek (poškození, smrt nepřítele) přijde od hostitele. O zásahu hráče rozhoduje jeho vlastní hra (spravedlivé uhýbání).
- Otevřené otázky: max. počet hráčů (návrh 2–4), coop jen v riftech (návrh), kořist každý svoje (zatím tak naprogramováno).

## Pravidla (platí od 1.7.0)
- **Obtížnost:** každý další hráč přidá **+10 %** nepřátel (větší skupiny), jejich života (i bosse a objektů bosse) a poškození. 2 hráči = ×1,1, 3 = ×1,2, 4 = ×1,3. (`partyMulFor` v `js/engine.js`, uloženo v `G.partyMul`.)
- **Zkušenosti:** za každého zabitého nepřítele dostane XP každý hrdina v riftu (podle svého bonusu XP).
- **Kořist:** zlato a předměty padají každému zvlášť a vidí/sebere je jen jejich majitel. Koule zdraví jsou společné (sebere je kdokoli).
- **Postup riftu** je společný. Po porážce strážce se další úroveň odemkne **všem** hrdinům v riftu.
- **Nepřátelé** útočí na nejbližšího živého hrdinu (cíl se drží ~1 s, boss ~4 s). Plošné útoky, střely, vlny a výbuchy zasahují všechny hrdiny. Vír bosse vtahuje všechny.
- **Smrt:** každý hrdina se oživí sám (jako dnes). Nepřátelé se uklidní, jen když padnou všichni.
- **Svatyně** dá bonus tomu, kdo se jí dotkne.
- **Výběr riftu** (obelisk): nejvyšší odemčený, poslední dokončený, nebo libovolný dokončený (−10 / − / číslo / + / +10). Hodí se, když je jeden hráč mnohem dál než druhý.

## Jak je to v kódu (etapa 1)
- `G.heroes` = všichni hrdinové v riftu, `G.me` = hrdina tohoto hráče, `G.party` = další členové družiny pro příští rift (`{ char, save, name, control(dt) }`). Ve městě je jen `G.me`.
- Herní kód dál pracuje s „aktuálním hrdinou“ (`G.hero`, `G.char`, `G.st`, `G.mods`). Mimo herní smyčku je to vždy `G.me`. `withHero(h, fn)` dočasně přepne kontext na jiného hrdinu a pak ho vrátí. `eachHero(fn, alive)` spustí `fn` pro každého hrdinu v jeho kontextu.
- V kontextu spoluhráče je `G.remoteCtx = true`: nezobrazí se jeho oznámení (toast), nápisy, záznam kořisti, třesení obrazovky a jeho osobní zvuky.
- Kdo co vlastní (`owner`): střely, plochy, pasti, mazlíčci, poškození v čase (DoT) a kořist. Zpracovávají se v kontextu majitele, takže počítají s jeho staty.
- Nepřítel: `updateMonster` → `monsterTarget` (výběr cíle) → `monsterThink` v kontextu cílového hrdiny.
- Nebezpečí (`updateHazards`) kontrolují všechny hrdiny, zásah se počítá s odolnostmi zasaženého.
- Mapa vzdáleností pro pohyb nepřátel se počítá od všech živých hrdinů (`flowFieldMulti` v `js/world.js`).
- Zlato a čísla předmětů jdou do uložení hrdiny (`heroSave()`), ne vždy do `G.save`.
- `addPartyHero(member, x, y)` v `js/rift.js` přidá spoluhráče. Teď ho v testech řídí bot, v etapě 3 to bude vstup ze sítě.

## Testy
- `python3 tests/coop.py '{"rifts":3,"mateCls":"warlock","mateRace":"orc"}'` – místní hrdina + spoluhráč řízený botem. Vypíše zesílení (počet nepřátel, život bosse, poškození pro 1/2/3 hráče), XP, zlato a kořist zvlášť, kolik nepřátel útočí na spoluhráče, vlastnictví mazlíčků, kontext po aktualizaci. Snímek `coop.png`.
- `python3 tests/riftsel.py` – výběr riftu u obelisku, snímky počítač/mobil.

Výsledky (v1.7.0): život bosse ×1,10 / ×1,20, poškození ×1,11, nepřátel v průměru +7 až +15 % (2 hráči) a +22 až +24 % (3 hráči) – rozptyl je daný náhodnými mapami. Rifty 1–3 se dvěma hrdiny (lovec, černokněžník, druid jako spoluhráč) dokončeny bez chyb.
