const fs = require('fs'), vm = require('vm');
const ctx = { console, document: { getElementById: () => null }, window: {} };
vm.createContext(ctx);
const D = require('path').join(__dirname, '..', 'js') + '/';
for (const f of ['data.js', 'classes.js', 'talents.js', 'items.js']) vm.runInContext(fs.readFileSync(D + f, 'utf8').replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), ctx);
const { CLASSES, SKILLS, TALENTS, TALENT_KEYS, COND_PREFIXES, SKILL_KEY_PREFIXES, STAT_LABELS, classTrees, talentNodes, PETS } = ctx;
const BUFF_IDS = Object.keys(SKILLS).filter(k => SKILLS[k].type === 'buff').concat(['enrage']);
const known = new Set([...Object.keys(STAT_LABELS), ...TALENT_KEYS]);
let errs = 0, total = 0, ranks = {};
const err = m => { errs++; console.log('ERR', m); };
for (const cls in TALENTS) {
  let r = 0;
  const trees = classTrees(cls);
  const skills = new Set();
  for (const t of trees) for (const n of t.nodes) {
    total++;
    if (n.type === 'base') continue;
    r += n.type === 'choice' ? 1 : n.max;
    if (n.skill) { if (!SKILLS[n.skill]) err(`${cls} ${n.id} chybí dovednost ${n.skill}`); if (skills.has(n.skill)) err(`${cls} dovednost dvakrát ${n.skill}`); skills.add(n.skill); }
    const statsList = n.type === 'choice' ? n.opts.map(o => o.stats) : [n.stats];
    if (!n.name && n.type !== 'choice') err(`${cls} ${n.id} bez jména`);
    for (const st of statsList) for (const k of Object.keys(st)) {
      if (known.has(k)) continue;
      const i = k.indexOf('_'), pre = k.slice(0, i), rest = k.slice(i + 1);
      if (SKILL_KEY_PREFIXES.includes(pre)) { if (!SKILLS[rest]) err(`${cls} ${n.id} klíč ${k}: neznámá dovednost`); else if (!skills.has(rest) && !CLASSES[cls].base.includes(rest) && !talentNodes(cls).some(x => x.skill === rest)) err(`${cls} ${n.id} klíč ${k}: dovednost není u třídy`); continue; }
      if (COND_PREFIXES.includes(pre) || BUFF_IDS.includes(pre)) { if (!known.has(rest)) err(`${cls} ${n.id} podmíněný klíč ${k}: neznámý stat ${rest}`); continue; }
      err(`${cls} ${n.id} neznámý klíč ${k}`);
    }
    for (const q of n.req) if (!t.nodes.find(x => x.id === q)) err(`${cls} ${n.id} rodič ${q} neexistuje`);
  }
  for (const b of CLASSES[cls].base) if (!SKILLS[b]) err('base ' + b);
  ranks[cls] = r;
}
for (const id in SKILLS) { const S = SKILLS[id]; if (S.type === 'summon' && !PETS[S.pet]) err('pet ' + S.pet); }
console.log('uzlů', total, 'úrovní na třídu', JSON.stringify(ranks), 'chyb', errs);
