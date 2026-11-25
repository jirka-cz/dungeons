// Inventář: nasazování do slotů, batoh, sdílená truhla, nákup a prodej, oprava.

function currentElems() {
  const c = G.char, els = new Set([CLASSES[c.cls].elem]);
  c.bar.forEach(id => { if (!id) return; const S = SKILLS[id]; if (S.elem) els.add(S.elem); if (S.dot) els.add(S.dot.elem); });
  if (CLASSES[c.cls].pet) els.add('phys');
  return [...els];
}
function scoreCtx() {
  const c = G.char, wtypes = ['main', 'off'].map(s => c.equip[s] && c.equip[s].type).filter(Boolean);
  return { elems: currentElems(), cls: c.cls, wtypes, skills: c.bar.filter(Boolean) };
}
function scoreOf(it) { return itemScore(it, scoreCtx()); }
function hasTitanGrip() { return heroStats().titanGrip; }

function slotsFor(it) {
  if (!canClassUse(it, G.char.cls)) return [];
  if (it.slot === 'weapon') return itemHand(it) === 2 ? (hasTitanGrip() ? ['main', 'off'] : ['main']) : ['main', 'off'];
  if (it.slot === 'offhand') return ['off'];
  if (it.slot === 'ring') return ['ring1', 'ring2'];
  return [it.slot];
}

function displaced(it, slot) {
  const eq = G.char.equip, out = [];
  if (eq[slot]) out.push(slot);
  const tg = hasTitanGrip();
  if (!tg && slot === 'main' && itemHand(it) === 2 && eq.off) out.push('off');
  if (!tg && slot === 'off' && eq.main && itemHand(eq.main) === 2) out.push('main');
  return out;
}

function scoreIn(it, slot) { const sc = scoreOf(it); return slot === 'off' && it.slot === 'weapon' ? sc * 0.75 : sc; }

function bestTarget(it) {
  let best = { slot: null, gain: -Infinity };
  slotsFor(it).forEach(sl => {
    const gain = scoreIn(it, sl) - displaced(it, sl).reduce((a, d) => a + scoreIn(G.char.equip[d], d), 0);
    if (gain > best.gain) best = { slot: sl, gain };
  });
  return best;
}

function listOf(where) { return where === 'stash' ? G.save.stash : G.char.inv; }
function capOf(where) { return where === 'stash' ? STASH_MAX : INV_MAX; }
function removeFrom(where, uid) { const L = listOf(where), i = L.findIndex(x => x.uid === uid); if (i >= 0) L.splice(i, 1); }

function addTo(where, it) {
  const L = listOf(where);
  if (L.length >= capOf(where)) { toast(where === 'stash' ? 'Truhla je plná' : 'Batoh je plný'); return false; }
  L.push(it);
  return true;
}
function addToInv(it) { return addTo('inv', it); }

// Nasadí předmět do slotu; from = 'inv' | 'stash' | null (předmět odjinud)
function equipTo(it, slot, from) {
  if (!slotsFor(it).includes(slot)) { toast(canClassUse(it, G.char.cls) ? `${it.name} sem nepatří` : `${CLASSES[G.char.cls].name} nemůže použít: ${it.name}`); return false; }
  const out = displaced(it, slot);
  const free = capOf('inv') - G.char.inv.length + (from === 'inv' ? 1 : 0);
  if (out.length > free) { toast('Batoh je plný'); return false; }
  if (from) removeFrom(from, it.uid);
  out.forEach(d => { const old = G.char.equip[d]; delete G.char.equip[d]; G.char.inv.push(old); });
  G.char.equip[slot] = it;
  onGearChange();
  return true;
}

function unequip(slot, to = 'inv') {
  const it = G.char.equip[slot];
  if (!it) return false;
  if (!addTo(to, it)) return false;
  delete G.char.equip[slot];
  onGearChange();
  return true;
}

function validateHands() {
  const eq = G.char.equip;
  if (!hasTitanGrip() && eq.main && eq.off && (itemHand(eq.main) === 2 || itemHand(eq.off) === 2)) {
    G.char.inv.push(eq.off); delete eq.off; invalidate();
  }
}

function onGearChange() {
  const before = G.st ? G.st.maxHp : 0;
  invalidate();
  validateHands();
  G.st = heroStats();
  if (G.hero && before) G.hero.hp = Math.min(G.st.maxHp, G.hero.hp * G.st.maxHp / before);
  persist();
}

function sellValueOf(it) { return sellValue(it); }

function sellItem(where, uid) {
  const L = listOf(where), it = L.find(x => x.uid === uid);
  if (!it) return;
  G.save.gold += sellValue(it);
  removeFrom(where, uid);
  persist();
}

function sellUpTo(rarity) {
  const max = RARITY_ORDER.indexOf(rarity);
  let n = 0, gold = 0;
  G.char.inv = G.char.inv.filter(it => {
    if (RARITY_ORDER.indexOf(it.rarity) <= max) { gold += sellValue(it); n++; return false; }
    return true;
  });
  G.save.gold += gold;
  persist();
  return [n, gold];
}

// ---------- Obchodník ----------

function vendorStock() {
  if (G.vendorStock) return G.vendorStock;
  const L = G.char.maxRift, ilvl = riftIlvl(L), cls = G.char.cls, items = [];
  const kinds = ['weapon', 'weapon', 'offhand', 'head', 'chest', 'gloves', 'legs', 'boots', 'cloak', 'neck', 'ring'];
  for (let i = 0; i < 10; i++) {
    let rar = 'green';
    if (L >= RARITIES.purple.minRift && Math.random() < 0.35) rar = 'purple';
    if (L >= RARITIES.orange.minRift && Math.random() < 0.08) rar = 'orange';
    const it = makeItem(ilvl, rar, G.save.nextUid++, kinds[i % kinds.length], cls);
    it.price = buyPrice(it);
    items.push(it);
  }
  G.vendorStock = items;
  return items;
}

function buyItem(uid, toSlot) {
  const stock = vendorStock(), it = stock.find(x => x.uid === uid);
  if (!it) return false;
  if (G.save.gold < it.price) { toast('Nemáš dost zlata'); return false; }
  const item = Object.assign({}, it); delete item.price;
  if (toSlot) { if (!equipTo(item, toSlot, null)) return false; }
  else if (!addToInv(item)) return false;
  G.save.gold -= it.price;
  stock.splice(stock.indexOf(it), 1);
  toast(`Koupeno: ${item.name}`);
  persist();
  return true;
}

// ---------- Kovář ----------

function allWorn() { return EQUIP_ORDER.map(s => G.char.equip[s]).filter(Boolean).concat(G.char.inv); }
function repairAllCost() { return allWorn().reduce((a, it) => a + repairCost(it), 0); }
function repairItem(it) {
  const c = repairCost(it);
  if (!c) return;
  if (G.save.gold < c) { toast('Nemáš dost zlata'); return; }
  G.save.gold -= c; it.dur = it.maxDur;
  invalidate(); G.st = heroStats(); persist();
}
function repairAll() {
  const c = repairAllCost();
  if (!c) { toast('Vše je v pořádku'); return; }
  if (G.save.gold < c) { toast('Nemáš dost zlata na opravu všeho'); return; }
  G.save.gold -= c;
  allWorn().forEach(it => { if (it.dur !== undefined) it.dur = it.maxDur; });
  invalidate(); G.st = heroStats(); persist();
  toast(`Opraveno za ${fmt(c)} zlata`);
}
