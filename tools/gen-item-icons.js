// Vygeneruje js/item-icons.js z knihovny game-icons.net (CC BY 3.0, autoři Lorc, Delapouite a další).
// Použití: npm i @iconify-json/game-icons  (kdekoli)  a pak  NODE_PATH=<node_modules> node tools/gen-item-icons.js
const fs = require('fs');
const lib = require('@iconify-json/game-icons/icons.json').icons;
// typ předmětu → ikona
const ITEM = {
  sword: 'broadsword', dagger: 'plain-dagger', greatsword: 'croc-sword', axe: 'battle-axe', mace: 'flanged-mace',
  hammer: 'thor-hammer', wand: 'crystal-wand', staff: 'wizard-staff', bow: 'high-shot', shield: 'checked-shield', orb: 'spell-book',
  helm: 'visored-helm', hood: 'hood', circlet: 'tiara', plate: 'breastplate', mail: 'chain-mail', vest: 'leather-vest', robe: 'robe',
  gauntlets: 'gauntlet', gloves: 'gloves', greaves: 'leg-armor', pants: 'trousers', boots: 'metal-boot', sandals: 'sandal',
  cloak: 'cloak', mantle: 'cape', amulet: 'gem-pendant', talisman: 'tribal-pendant', ring: 'ring', signet: 'power-ring'
};
// znaky očarování a setů
const GLYPH = {
  ench_fire: 'fire', ench_frost: 'snowflake-1', ench_nature: 'poison-bottle', ench_shadow: 'evil-moon', ench_arcane: 'star-swirl',
  ench_gold: 'two-coins', ench_blood: 'drop',
  set_titan: 'checked-shield', set_archmage: 'star-swirl', set_shadow: 'executioner-hood', set_pact: 'pentagram-rose', set_grove: 'oak-leaf',
  set_m_warrior: 'fire-shield', set_m_mage: 'fire-gem', set_m_warlock: 'crowned-skull', set_m_hunter: 'wolf-howl', set_m_druid: 'tree-face'
};
const body = n => { if (!lib[n]) throw new Error('chybí ikona ' + n); return lib[n].body.replace(/ fill="currentColor"/g, ''); };
const out = {};
for (const k in ITEM) out[k] = body(ITEM[k]);
for (const k in GLYPH) out[k] = body(GLYPH[k]);
fs.writeFileSync(__dirname + '/../js/item-icons.js',
  '// VYGENEROVÁNO tools/gen-item-icons.js – ikony předmětů, očarování a setů z game-icons.net (CC BY 3.0). Ručně needitovat.\n' +
  'const ITEM_GI = ' + JSON.stringify(out) + ';\n');
console.log('ikon:', Object.keys(out).length);
