// Výpis všech hodnot talentů podle klíče (kontrola rozpočtu, docs/herni-design.md kap. 4b): node tools/talent-audit.js
const fs=require('fs'),vm=require('vm');const c={console,Math,Object,Array,JSON,Set,Map};vm.createContext(c);
for (const f of ['data','classes','talents']) vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8').replace(/^(const|let) /gm,'var '),c);
const {CLASSES,RACE_CLASSES,classTrees}=c;
const mode=process.argv[2]||'keys';
const agg={}; // key -> list of [cls,tree,node,perRank,max]
for (const cls in CLASSES) for (const race of Object.keys(RACE_CLASSES).filter(r=>RACE_CLASSES[r].includes(cls)).slice(0,1).concat(Object.keys(RACE_CLASSES).filter(r=>RACE_CLASSES[r].includes(cls)).slice(1))) {
  for (const t of classTrees(cls+':'+race)) { if (t.isRace && race!==race) continue;
    for (const n of t.nodes) { const opts=n.type==='choice'?n.opts.map(o=>o.stats):[n.stats];
      opts.forEach((st,i)=>{ for (const k in st) { const id=(t.isRace?race:cls)+'/'+t.key+'/'+n.slot+(n.type==='choice'?'#'+(i+1):''); (agg[k]=agg[k]||{}); agg[k][id]=[st[k],n.type==='choice'||n.type==='key'||n.type==='enh'?1:(n.max||1),n.type]; } }); } } }
if (mode==='keys') { for (const k of Object.keys(agg).sort()) { const v=Object.entries(agg[k]); console.log(k.padEnd(22), v.length, v.map(([id,[x,m,ty]])=>id.replace(/^(\w+)\/\w+\//,'$1:')+'='+x+(m>1?'x'+m:'')).join(' ')); } }
