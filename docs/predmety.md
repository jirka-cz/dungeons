# Předměty a kořist

## Jak to funguje teď (v1.1.6)
- **Sloty výbavy:** hlavní ruka, druhá ruka, hlava, krk, plášť, hruď, rukavice, nohy, boty, 2 prsteny (`EQUIP_ORDER` v `js/items.js`).
- **Zbraně:** obouruční zbraň dává ≈ 1,9× útoku jednoruční. Zbraň v druhé ruce dává 70 % útoku (dvě zbraně).
- Třída smí nosit jen své typy zbraní (`canClassUse`).
- **Batoh** má 40 míst, **truhla** 60 (sdílená).

### Rarity (`RARITIES`)
| Rarita | Barva | Afixy | Od riftu | Odolnost |
|---|---|---|---|---|
| Běžný | šedá | 0 | 1 | 30 |
| Neobvyklý | zelená | 1 | 1 | 40 |
| Epický | fialová | 2 | 4 | 50 |
| Legendární | oranžová | 3 + unikátní efekt | 10 | 60 |
| Diamantový | tyrkysová | 2 | 16 | 60 |

- **Afixy:** 25 druhů – síla, vitalita, obrana, rychlost, kritický zásah, vysávání, úhyb, blok, trny, poškození elementů, odolnosti, zlato, lepší kořist (`AFFIXES`).
- **Legendárky:** 11 pevných (`LEGENDARIES`), např. Sekera Krvavého měsíce, Fénixova zbroj, Prsten Vyvolávače.
- **Sety:** Zbroj Titána, Odkaz Arcimága, Stínový lovec. 6 dílů, bonusy za 1, 3 a 6 nasazených dílů (`SETS`).
- **Porovnání předmětů** podle váženého skóre (`itemScore`, `STAT_WEIGHTS`) s ohledem na elementy postavy.

### Automatický prodej
- Nastavuje se po raritách v Nastavení i v okně postavy.
- Ve výchozím stavu je vypnutý pro všechny rarity (rozhodnutí v1.0.3, migrace `sellFix103`).

## Kde v kódu
- `js/items.js` – data, generování předmětů (`makeItem`), popisky statů (`STAT_LABELS`), ceny;
- `js/inventory.js` – nasazování, batoh, truhla, prodej, oprava;
- `js/entities.js` – padání kořisti;
- `js/ui.js` – okno postavy, tooltips.

## Otevřené nápady
- Žádné zadané.

## Testy
`python3 tests/autosell.py`, `tests/panels.py`.
