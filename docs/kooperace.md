# Kooperace (hra více hráčů)

## Cíl
Hráč si postavu vyexpí sám a stejnou postavu pak použije ve společné hře s kamarády (2–4 hráči). Postava zůstává uložená v prohlížeči každého hráče. Při společné hře ji „přinese s sebou“ a XP, zlato a kořist se mu ukládají do jeho vlastního uložení.

## Stav
| Etapa | Co | Stav |
|---|---|---|
| 1 | Jádro pro víc hrdinů, zesílení nepřátel, výběr úrovně podzemí | hotovo v 1.7.0 |
| 2 | Místnost s kódem, společné město, výběr úrovně s potvrzením ostatních | hotovo v 1.8.0 |
| 3 | Společné podzemí po síti, odměny do uložení každého hráče | hotovo v 1.8.0 |
| 4 | Rámečky spoluhráčů, oživení u těla, návrat do rozehraného podzemí, odpojení | hotovo v 1.8.0 |

## Jak se hraje
1. Všichni jsou ve městě se svou postavou. Jeden otevře **Menu → 👥 Hrát s přáteli → Založit místnost** a pošle ostatním **kód** (5 znaků).
2. Ostatní: **Menu → 👥 Hrát s přáteli**, napíšou kód, **Připojit**. Ve městě se navzájem vidí.
3. Kdokoli jde k **obelisku**, vybere úroveň a dá **Navrhnout**. Ostatním vyskočí okno „X chce jít do Podzemí N“ (síla nepřátel, kořist) s odpočtem 30 s. Až všichni přijmou, jde se.
4. V podzemí: postup je společný, kořist každý svoje. Po bossovi se otevře portál do města.
5. **Hostitel** (kdo místnost založil) má mít hru otevřenou na popředí – u něj běží celé podzemí.

## Rozhodnutí (25. 11. 2026)
- **2–4 hráči.** Spojení napřímo mezi prohlížeči (WebRTC) přes knihovnu **PeerJS** a její bezplatný zprostředkovací server (schválená výjimka z „bez knihoven“, vlastní kopie v `js/lib/`).
- **Hostitel** počítá podzemí (nepřátelé, bossové, kořist). Hosté posílají svou polohu a kouzla a dostávají stav.
- **Kořist každý svoje.** Koule zdraví jsou společné.
- **Po bossovi** portál do města (nikdo se nepřesouvá do další úrovně). Další úroveň se odemkne **všem** v podzemí.
- **Společné město.** Obchod, kovář a truhla zůstávají každému zvlášť (jsou to jen okna u každého hráče).
- **Výběr úrovně:** kdokoli navrhne, ostatní potvrdí. Vybírá se z úrovní, které má odemčené navrhovatel. Odmítnutí kýmkoli návrh zruší (navrhovatel vidí kdo), bez odpovědi do 30 s = odmítnuto, naráz jen jeden návrh.

## Pravidla družiny
- **Obtížnost:** každý další hráč +10 % nepřátel (větší skupiny), jejich života (i bosse a jeho objektů) a poškození. 2 = ×1,1, 3 = ×1,2, 4 = ×1,3. Určí se při vstupu do podzemí; kdo se připojí později, už ji nemění.
- **Zkušenosti** za každého nepřítele dostane každý hrdina v podzemí.
- **Nepřátelé** útočí na nejbližšího živého hrdinu (cíl drží ~1 s, boss ~4 s). Plošné útoky, střely, vlny, výbuchy a vír bosse působí na všechny.
- **Smrt v družině:** oživení na začátku podzemí za **6 s** (sólo 3 s). Když u padlého spoluhráč **2 s** stojí, vstane **na místě** s polovinou života (kroužek nad padlým). Nepřátelé se uklidní, jen když padnou všichni.
- **Svatyně** dá bonus tomu, kdo se jí dotkne.
- **Odchod z podzemí:** host, který vejde do portálu nebo se teleportuje (T), jde do svého města; u obelisku pak může **„Připojit se k družině“** a vrátí se na začátek rozehraného podzemí. Když odejde **hostitel**, končí podzemí pro všechny (všichni do města).
- **Odpojení:** bez zprávy 20 s = hráč odpojen. Odejde-li host, hostitel hraje dál. Odejde-li hostitel, ostatní se vrátí do města a místnost zanikne.
- **Různé verze hry** se nespojí (hláška „obnovte stránku“).
- Ve hře více hráčů se hra s otevřeným oknem (batoh, talenty) **nezastavuje**.

## Prodleva a spravedlnost
- Vlastní pohyb hosta je okamžitý (o poloze rozhoduje jeho hra). Kouzla: animace, zvuk a přebíjení hned, výsledek (poškození, výbuch, střela) za dobu odezvy (typicky 30–100 ms).
- Pohyb, který způsobí hra (skok, výpad, hák, vír, oživení), určí hostitel a host se přizpůsobí.
- Plošné útoky zasahují hosty s **tolerancí 3 px** (`NET_LENIENCY`), aby zpoždění nebylo nespravedlivé. Plně „rozhoduje hra hosta“ to není – je to zjednodušení, v praxi by mělo stačit.
- Ostatní hrdinové a nepřátelé se u hosta posouvají plynule mezi snímky (15× za sekundu).

## Jak je to v kódu
### Jádro (`js/engine.js`, etapa 1)
- `G.heroes` = všichni hrdinové, `G.me` = hrdina tohoto hráče, `G.party` = členové pro příští podzemí (`{ char, save, name, control(dt), netId }`).
- Herní kód pracuje s „aktuálním hrdinou“ (`G.hero`, `G.char`, `G.st`, `G.mods`). Mimo herní smyčku je to vždy `G.me`. `withHero(h, fn)` přepne kontext, `eachHero(fn, alive)` projde hrdiny (bez duchů a kopií).
- V kontextu spoluhráče `G.remoteCtx = true`: jeho oznámení, nápisy a osobní zvuky se neukazují tomuto hráči (u hostitele se posílají tomu hostovi).
- Vlastnictví (`owner`) mají střely, plochy, pasti, mazlíčci, DoTy a kořist. Každý nepřítel a mazlíček má `nid` (síťové číslo).

### Síť (`js/net.js`)
- **Role:** `Net.role` = `'host'` / `'guest'`. ID místnosti na serveru PeerJS = `wd-dungeons-<KÓD>`.
- **Město:** každý si počítá své město. Ostatní hráči jsou „duchové“ (`h.ghost`) – jen se vykreslují a plynule posouvají podle zpráv `pos` (12×/s, hostitel přeposílá).
- **Hlasování:** `netPropose(level)` → hostitel (`netHostPropose`) → zprávy `prop`, `propState`, `propEnd` → `netHostStartRift(level)`.
- **Podzemí:** hostitel spustí `startRift` s `G.party` z členů, každý host dostane mapu (`netPackWorld`, dlaždice v base64). Hrdinu hosta u hostitele řídí `netControlFor` (poloha ze zpráv `in`, kouzla `cast`, lektvar `pot`).
- **Snímek** (`netBuildSnap`, 15×/s pro každého hosta zvlášť, jen věci do ~440 px): hrdinové, nepřátelé (stálé údaje jen poprvé, `mb.sent`), boss a jeho objekty celé (`netSer`), střely, nebezpečí, plochy, pasti, mazlíčci, kořist hosta, otisky, svatyně, portál, postup, tma, stav vlastního hrdiny (`me`) a efekty (`fx`: burst, vfx, text, třesení, zvuky).
- **Host:** `Net.clientRift = true`, herní smyčka = `guestUpdate` (vlastní ovládání + plynulé posouvání ostatního). `castSkill` → `netCast`, `usePotion` → `netPotion`, `goTown` → `netGuestLeaveRift`. Když mu chybí stálé údaje nepřítele, požádá o ně (`need`). Nepřátelé, kteří zmizeli ze snímku, se označí jako mrtví (aby na ně host neútočil dál).
- **Odměny** (`netReward` u hostitele → `netApplyReward` u hosta): `xp`, `gold`, `item` (dostane nové `uid`; plný batoh → truhla), `maxRift`, `dur` (odolnost předmětu), `log` (záznam kořisti). Host posílá změny své postavy (`char`: úroveň, výbava, talenty, lišta) a hostitel podle nich přepočítá staty.

## Testy
- `python3 tests/net.py '{"secs":110}'` – **skutečné WebRTC**, 3 okna (hostitel + 2 hosté): založení, připojení, město, odmítnutí, vypršení, přijetí návrhu, společné podzemí s boty (XP, zlato, předměty, smrt), odchod a návrat do podzemí, konec podzemí, uložení hostů, odpojení hosta, zavření místnosti. Potřebuje `npm install peer`.
- `python3 tests/coop.py` – více hrdinů bez sítě (spoluhráče řídí bot): zesílení, kořist zvlášť, útoky na spoluhráče, mazlíčci, **oživení u těla**.
- `python3 tests/riftsel.py` – výběr podzemí u obelisku.

Výsledek (v1.8.0, 3 hráči): zesílení ×1,2, podzemí 2 dokončeno, oba hosté úroveň 1 → 6, zlato a předměty uložené u každého zvlášť, další úroveň odemčená všem, žádné chyby.

## Známá omezení
- **Hostitel musí mít hru na popředí.** Prohlížeč v pozadí herní smyčku zastaví → podzemí stojí všem. (Host v pozadí jen nevidí, hra u hostitele běží dál.)
- Spojení přes bezplatný server PeerJS – když nepůjde, zkusit jinou síť (mobilní data / Wi-Fi). Bez internetu nefunguje. Ve skutečném internetu (mimo test) zatím nevyzkoušeno.
- U hosta chybí některé drobné průběžné efekty (stopy částic aur), hlavní efekty (výbuchy, kruhy, čísla, zvuky) se přenášejí.
- Postava se nekontroluje proti podvádění (mezi kamarády záměrně).
