// Rozhraní: menu postav, okna (postava, talenty, obchodník, kovář, truhla, výběr riftu, nastavení, legenda),
// přetahování předmětů a dovedností, vysvětlivky.

const UI = { modalKind: null, sel: null, detail: false, invSort: 'score', pickSkill: null, newChar: { race: 'human', cls: 'warrior', name: '' } };
const GI = '<span class="gold">●</span>';
const P = v => `${Math.round(v * 100)} %`;

// ---------- Okna ----------

// ---------- Celá obrazovka ----------
function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
const FS_HELP = 'Celou obrazovku tady prohlížeč nepovolil. Otevři hru přímo (GitHub Pages) nebo ji v prohlížeči přidej na plochu telefonu – pak se spouští přes celou obrazovku.';
function toggleFullscreen(silent) {
  if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  const fail = () => { if (!silent) toast(FS_HELP); };
  if (!req || document.fullscreenEnabled === false) return fail();
  try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(fail); } catch (e) { fail(); }
}

function showModal(html, wide, kind) {
  UI.modalKind = kind || 'menu';
  $('modal-box').dataset.kind = UI.modalKind;
  $('tip').hidden = true; $('itip').hidden = true;
  $('modal-box').innerHTML = `<button class="modal-x" onclick="closeMenu()" aria-label="Zavřít">✕</button>` + html;
  $('modal-box').classList.toggle('wide', !!wide);
  $('modal').hidden = false;
  drawIcons();
}
function hideModal() { $('modal').hidden = true; UI.modalKind = null; $('itip').hidden = true; if (G.char && G.scene !== 'menu') buildHud(); }
function modalOpen() { return !$('modal').hidden; }
function closeMenu() { if (UI.modalKind === 'talents' && talentsDirty()) { closeTalentsAsk(); return; } if (UI.modalKind === 'talents') UI.tDraft = null; hideModal(); UI.sel = null; UI.pickSkill = null; }

let confirmAction = null;
function askConfirm(text, yesLabel, action) {
  confirmAction = action;
  showModal(`<p>${text}</p><div class="actions"><button class="danger" onclick="runConfirm()">${yesLabel}</button><button onclick="closeMenu()">Zpět</button></div>`);
}
function runConfirm() { const a = confirmAction; confirmAction = null; if (a) a(); }

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function drawIcons() {
  document.querySelectorAll('canvas[data-icon]').forEach(cv => {
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    drawIcon(g, cv.dataset.icon, 0, 0, cv.width / 12, cv.dataset.gem, !!cv.dataset.mono);
  });
  document.querySelectorAll('canvas[data-race]').forEach(cv => {
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    drawSprite(g, cv.dataset.race, 0, 0, cv.width / 16, { palOverride: classPal(cv.dataset.race, cv.dataset.cls) });
  });
}

// ---------- Hlavní menu: výběr a tvorba postavy ----------

function showMenu() {
  G.scene = 'menu';
  hideModal();
  $('hud').hidden = true; $('menu').hidden = false;
  const chars = G.save.chars;
  $('menu-chars').innerHTML = chars.map((c, i) => `
    <div class="char-card ${i === G.save.current ? 'sel' : ''}" onclick="selectChar(${i})" ondblclick="playChar(${i})">
      <canvas width="64" height="64" data-race="${c.race}" data-cls="${c.cls}"></canvas>
      <div><b>${c.name}</b><div class="muted small">${RACES[c.race].name} – ${CLASSES[c.cls].name}</div>
      <div class="small">Úroveň ${c.level} · rift ${c.maxRift}</div></div>
      <button class="ghost del" onclick="event.stopPropagation();deleteChar(${i})" aria-label="Smazat">✕</button>
    </div>`).join('') || '<p class="muted">Zatím nemáš žádnou postavu.</p>';
  $('menu-play').hidden = !chars.length;
  $('menu-gold').textContent = fmt(G.save.gold);
  drawIcons();
}
function selectChar(i) { G.save.current = i; showMenu(); }
function playChar(i) {
  if (i !== undefined) G.save.current = i;
  const c = G.save.chars[G.save.current];
  if (!c) return;
  G.char = c; invalidate();
  if (isTouchUi() && G.save.settings.autoFullscreen !== false && !isFs() && !G.headless) toggleFullscreen(true);   // na mobilu rovnou přes celou obrazovku
  $('menu').hidden = true; $('hud').hidden = false;
  buildHud();
  enterTown();
}
function deleteChar(i) {
  const c = G.save.chars[i];
  askConfirm(`Opravdu smazat postavu <b>${c.name}</b>? Nejde to vrátit. (Sdílená truhla a zlato zůstávají.)`, 'Smazat', () => {
    G.save.chars.splice(i, 1);
    G.save.current = Math.min(G.save.current, G.save.chars.length - 1);
    persist(); hideModal(); showMenu();
  });
}

function showCreate() {
  const n = UI.newChar;
  if (!raceAllows(n.race, n.cls)) n.cls = RACE_CLASSES[n.race][0];
  const races = Object.keys(RACES).map(id => `<button class="pick-card ${n.race === id ? 'sel' : ''}" onclick="UI.newChar.race='${id}';showCreate()">
      <canvas width="48" height="48" data-race="${id}" data-cls="${n.cls}"></canvas><div class="pc-name">${RACES[id].name}</div><div class="pc-desc">${RACES[id].desc}</div></button>`).join('');
  const classes = Object.keys(CLASSES).map(id => { const c = CLASSES[id], ok = raceAllows(n.race, id);
    return `<button class="pick-card ${n.cls === id ? 'sel' : ''} ${ok ? '' : 'locked'}" ${ok ? `onclick="UI.newChar.cls='${id}';showCreate()"` : 'disabled'}
      ${ok ? '' : `data-tip="${RACES[n.race].name} nemůže být ${c.name.toLowerCase()}"`}>
      <span class="swatch" style="background:${c.colors[0]}"></span><div class="pc-name">${c.name}</div><div class="pc-desc">${c.desc}</div>
      <div class="pc-specs">${ok ? TALENTS[id].specs.map(t => t.icon + ' ' + t.name).join(' · ') : `Nedostupné pro rasu: ${RACES[n.race].name}`}</div></button>`; }).join('');
  showModal(`<h2>Nová postava</h2>
    <label class="field">Jméno <input id="nc-name" maxlength="16" value="${n.name}" placeholder="Jméno hrdiny" oninput="UI.newChar.name=this.value"></label>
    <h3>Rasa</h3><div class="pick-grid">${races}</div>
    <h3>Třída <span class="muted small">(nabídka závisí na rase)</span></h3><div class="pick-grid">${classes}</div>
    <p class="muted small">Rasa a třída jsou u postavy napevno. Můžeš mít víc postav, truhla a zlato jsou sdílené.</p>
    <div class="actions"><button class="primary" onclick="createChar()">Vytvořit</button><button onclick="closeMenu()">Zpět</button></div>`, true);
}
function createChar() {
  const n = UI.newChar, name = (n.name || '').trim() || `${RACES[n.race].name} ${CLASSES[n.cls].name.toLowerCase()}`;
  if (G.save.chars.length >= 8) { toast('Maximálně 8 postav'); return; }
  if (!raceAllows(n.race, n.cls)) { toast('Tahle rasa nemůže hrát tuto třídu'); return; }
  G.save.chars.push(newChar(name, n.race, n.cls, G.save));
  G.save.current = G.save.chars.length - 1;
  UI.newChar.name = '';
  persist(); hideModal(); showMenu();
}

function showGameMenu() {
  const inRift = G.scene === 'rift';
  showModal(`<h2>Menu</h2><div class="menu-list">
    ${inRift ? `<button class="primary" onclick="closeMenu();startRecall()">⌂ Teleport do města (5 s)</button>
      <p class="muted small" style="margin:-4px 0 4px;text-align:center">${G.rift.done ? 'Rift je dokončený.' : 'Rozehraný rift propadne.'} Pohyb nebo útok teleport přeruší.</p>` : ''}
    <button onclick="closeMenu()">Pokračovat</button>
    <button onclick="showCharacter()">Postava a batoh (I)</button>
    <button onclick="showTalents()">Talenty a dovednosti (K)</button>
    <button onclick="showLegend()">Legenda a ovládání</button>
    <button onclick="showSettings()">Nastavení</button>
    <button onclick="confirmToMenu()">Výběr postavy</button>
  </div>`);
}

function confirmToMenu() {
  askConfirm('Odejít na výběr postav?' + (G.scene === 'rift' ? ' Rozehraný rift propadne.' : ''), 'Odejít', () => { persist(); showMenu(); });
}

// ---------- Předměty ----------

function itemHtml(it, actions) {
  const r = RARITIES[it.rarity];
  const own = Object.assign({}, it.base);
  for (const k in it.affixes) own[k] = (own[k] || 0) + it.affixes[k];
  const leg = it.leg ? LEGENDARIES.find(l => l.id === it.leg) : null;
  const broken = it.dur === 0;
  const mains = classMainStats(G.char.cls);
  let lines = Object.keys(own).map(k => `<div${mains.includes(k) ? ' class="main-attr"' : ''}>${statLine(k, own[k])}</div>`).join('') +
    (leg ? Object.keys(leg.stats).map(k => `<div class="leg">${statLine(k, leg.stats[k])}</div>`).join('') : '');
  if (it.set) {
    const s = SETS[it.set], have = setCounts(G.char)[it.set] || 0;
    lines += `<div class="set-name">${s.name} (${have}/6)</div>` + Object.keys(s.bonus).map(n =>
      `<div class="set-b ${have >= +n ? 'on' : ''}">(${n}) ${Object.keys(s.bonus[n]).map(k => statLine(k, s.bonus[n][k])).join(', ')}</div>`).join('');
  }
  const durTxt = it.dur !== undefined ? `<div class="dur ${broken ? 'broken' : it.dur < it.maxDur * 0.25 ? 'low' : ''}">Odolnost ${it.dur}/${it.maxDur}${broken ? ' – rozbitý, nedává staty' : ''}</div>` : '';
  const only = itemClasses(it), usable = canClassUse(it, G.char.cls);
  const cant = only ? `<div class="cls-only ${usable ? '' : 'broken'}">Pouze: ${only.map(c => CLASSES[c].name).join(', ')}</div>`
    : !usable ? `<div class="broken">Nevhodné pro třídu ${CLASSES[G.char.cls].name}</div>` : '';
  return `<div class="item ${broken ? 'is-broken' : ''}" style="border-color:${r.color}">
    <div class="item-head"><b style="color:${r.color}">${it.name}</b><span class="muted small">${kindLabel(it)} · úr. ${it.ilvl}</span></div>
    <div class="item-stats">${lines}${durTxt}${cant}</div>${actions || ''}</div>`;
}

function iconCell(it, slotIcon, src, selected, label, extra = '') {
  const col = it ? RARITIES[it.rarity].color : 'var(--border)';
  const broken = it && it.dur === 0;
  return `<div class="cell ${selected ? 'sel' : ''} ${it ? '' : 'empty'} ${broken ? 'is-broken' : ''}" style="border-color:${col}" data-src="${src}" ${extra}>
    <canvas width="48" height="48" data-icon="${it ? itemIcon(it) : slotIcon}" data-gem="${it ? RARITIES[it.rarity].color : ''}" data-mono="${it ? '' : 1}"></canvas>
    ${it && it.dur !== undefined && it.dur < it.maxDur * 0.25 ? `<span class="cell-dur ${broken ? 'b' : ''}"></span>` : ''}
    ${label ? `<span class="cell-label">${label}</span>` : ''}</div>`;
}

function itemBySrc(src) {
  if (!src) return null;
  const [w, id] = src.split(':');
  if (w === 'eq') return G.char.equip[id];
  if (w === 'inv') return G.char.inv.find(x => x.uid === +id);
  if (w === 'stash') return G.save.stash.find(x => x.uid === +id);
  if (w === 'shop') return vendorStock().find(x => x.uid === +id);
  return null;
}

function bagCells(where, cap, sel) {
  const L = listOf(where).slice().sort((a, b) => UI.invSort === 'score' ? scoreOf(b) - scoreOf(a)
    : RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.ilvl - a.ilvl);
  const out = [];
  for (let i = 0; i < cap; i++) {
    const it = L[i];
    out.push(it ? iconCell(it, '', `${where}:${it.uid}`, sel === `${where}:${it.uid}`, where === 'inv' && bestTarget(it).gain > 0 ? '<span class="up">▲</span>' : '')
                : `<div class="cell bag-empty" data-drop="${where}"></div>`);
  }
  return out.join('');
}

// ---------- Postava ----------

function statRows(rows) {
  return rows.filter(r => r).map(([n, v, tip]) => `<div class="srow" ${tip ? `data-tip="${tip}"` : ''}><span>${n}</span><b>${v}</b></div>`).join('');
}

function charStatsHtml(st) {
  const ch = G.char, need = xpToNext(ch.level);
  const main = `<div class="big3">
    <div data-tip="Útok: základ poškození všech dovedností."><span>Útok</span><b>${fmt(st.atk)}</b></div>
    <div data-tip="Obrana: snižuje fyzické poškození naplno a elementální napůl."><span>Obrana</span><b>${fmt(st.def)}</b></div>
    <div data-tip="Maximální život."><span>Život</span><b>${fmt(st.maxHp)}</b></div></div>
    <div class="attrs">${ATTR_ORDER.map(k => {
      const isMain = CLASSES[ch.cls].main.includes(k), v = Math.round(st.attrs[k]);
      const tip = `${ATTRS[k].name}: ${ATTRS[k].desc}` + (isMain ? ` Tvůj hlavní atribut: +${Math.round(st.mainVal)} % útoku.` : '');
      return `<div class="${isMain ? 'main' : ''}" data-tip="${tip}"><span>${ATTRS[k].name}${isMain ? ' ★' : ''}</span><b>${v}</b></div>`;
    }).join('')}</div>
    <div class="xpline">Úroveň <b>${ch.level}</b> · ${fmt(ch.xp)} / ${fmt(need)} XP · nejvyšší rift <b>${ch.maxRift}</b></div>`;
  const C = CLASSES[ch.cls], caster = isCasterClass(ch.cls);
  const regenTxt = st.resRegen > 0 ? `+${st.resRegen.toFixed(1).replace('.', ',')} / s` : `útoky +${P(st.genMul - 1)}`;
  const basic = statRows([
    caster ? ['Rychlost sesílání', `${(st.spd * st.castMul).toFixed(2)} / s`, 'Kolikrát za sekundu sešleš základní kouzlo.']
           : ['Rychlost útoku', `${(st.spd * st.wpnSpdMul).toFixed(2)} / s`],
    [C.res.name, `max ${fmt(st.resMax)} · ${st.resRegen > 0 ? regenTxt : 'generují útoky'}`, st.resRegen > 0 ? 'Maximum a obnova za sekundu. Obnovu zrychluje Moudrost.' : 'Zuřivost generují útoky a sama klesá. Moudrost zrychluje generování.'],
    ['Kritická šance', P(st.crit)], ['Kritické poškození', `×${st.critMult.toFixed(2)}`],
    st.dodge && ['Úhyb', P(st.dodge)], st.block && ['Blok', P(st.block), 'Šance zablokovat polovinu poškození.'],
    st.dmgTaken < 1 && ['Snížení poškození', P(1 - st.dmgTaken)], st.ls && ['Vysávání života', P(st.ls)],
    st.regen && ['Regenerace', `${(st.regen * 100).toFixed(2)} % / s`], st.thorns && ['Trny', P(st.thorns)]
  ]);
  let detail = '';
  if (UI.detail) {
    const resRows = ['fire', 'frost', 'shadow', 'nature', 'arcane'].map(e =>
      [`${ELEMENTS[e].icon} ${e === 'nature' ? 'Příroda a jedy' : ELEMENTS[e].name}`, P(st.res[e]) + (st.res[e] >= HERO_RES_CAP ? ' (max)' : ''), `Snižuje poškození typu ${ELEMENTS[e].name.toLowerCase()}. Maximum ${P(HERO_RES_CAP)}.`]);
    const dmgRows = ['phys', 'fire', 'frost', 'shadow', 'nature', 'arcane'].filter(e => st.elemMul[e] !== 1).map(e => [`${ELEMENTS[e].icon} ${ELEMENTS[e].name}`, `+${P(st.elemMul[e] - 1)}`]);
    detail = `<h4>Odolnosti</h4>${statRows(resRows)}
      <h4>Bonus poškození</h4>${statRows(dmgRows.concat([
        st.dotMul > 1 && ['Poškození v čase', `+${P(st.dotMul - 1)}`], st.petMul > 1 && ['Síla mazlíčků', `+${P(st.petMul - 1)}`],
        st.execPct && ['Proti oslabeným (pod 30 %)', `+${P(st.execPct)}`], st.stunDmg && ['Proti omráčeným', `+${P(st.stunDmg)}`],
        st.armorPen && ['Ignoruje zbroj', P(st.armorPen)], st.resPen && ['Ignoruje odolnosti', P(st.resPen)],
        st.eliteDmg && ['Elitám a strážcům', `+${P(st.eliteDmg)}`],
        ...Object.keys(MONSTER_FAMS).map(f => st.vs[f] && [`Proti ${MONSTER_FAMS[f]}`, `+${P(st.vs[f])}`]),
        ...Object.keys(WEAPON_INSTR).map(t => st.mods[t + '_atkPct'] && [`Poškození ${WEAPON_INSTR[t]}`, `+${P(st.mods[t + '_atkPct'])}${gearConds(ch)[t] ? '' : ' (nedržíš)'}`])])) || '<div class="muted small">Žádné</div>'}
      <h4>Zdroj a dovednosti</h4>${statRows([
        ['Max. ' + C.res.name.toLowerCase(), fmt(st.resMax)], st.resRegen > 0 && ['Obnova', regenTxt],
        st.genMul > 1 && ['Generování', `+${P(st.genMul - 1)}`], st.costRed && ['Cena dovedností', `-${P(st.costRed)}`],
        st.cdr && ['Přebíjení dovedností', `-${P(st.cdr)}`], st.skillMul > 1 && ['Síla dovedností', `+${P(st.skillMul - 1)}`],
        st.castMul > 1 && ['Rychlost sesílání', `+${P(st.castMul - 1)}`], st.wpnSpdMul > 1 && ['Rychlost útoku zbraní', `+${P(st.wpnSpdMul - 1)}`],
        st.mods.killRes && ['Zdroj za zabití', `+${fmt(st.mods.killRes)}`]])}
      <h4>Obrana</h4>${statRows([
        st.eliteTaken < 1 && ['Od elit a strážců', `-${P(1 - st.eliteTaken)}`], st.rangedTaken < 1 && ['Od střel', `-${P(1 - st.rangedTaken)}`],
        st.areaTaken < 1 && ['Z plošných útoků', `-${P(1 - st.areaTaken)}`], st.ccRed && ['Kratší zmrazení a zpomalení', `-${P(st.ccRed)}`],
        st.mods.killHeal && ['Léčení za zabití', P(st.mods.killHeal)], st.moveSpeed > 64 && ['Rychlost pohybu', `+${P(st.moveSpeed / 64 - 1)}`]]) || '<div class="muted small">Žádné</div>'}
      <h4>Zvláštní</h4>${statRows([
        st.double && ['Šance zaútočit dvakrát', P(st.double)], st.slowAura && ['Zpomalení nepřátel kolem tebe', P(st.slowAura)],
        st.freezeChance && ['Šance zmrazit', P(st.freezeChance)], st.stunChance && ['Šance omráčit', P(st.stunChance)],
        st.healMul > 1 && ['Silnější léčení', `+${P(st.healMul - 1)}`], st.rebirth && ['Znovuzrození', 'ano'], st.titanGrip && ['Titánský stisk', 'ano']]) || '<div class="muted small">Žádné</div>'}
      <h4>Kořist</h4>${statRows([['Zlato', `+${P(st.goldMul - 1)}`], ['Lepší kořist', `+${P(st.mf)}`], ['Šance na předmět', `+${P(st.dropMul - 1)}`], st.xpMul > 1 && ['Zkušenosti', `+${P(st.xpMul - 1)}`]])}`;
  }
  return main + `<div class="srows">${basic}</div>
    <button class="ghost small-btn" onclick="UI.detail=!UI.detail;showCharacter()">${UI.detail ? 'Skrýt detail ▴' : 'Detail ▾'}</button>
    <div class="srows">${detail}</div>`;
}

function dollHtml(sel) {
  const ch = G.char, st = heroStats();
  const slot = s => iconCell(ch.equip[s], EQUIP_SLOTS[s].icon, `eq:${s}`, sel === `eq:${s}`, EQUIP_SLOTS[s].name, `data-drop="eq:${s}"`);
  const twoH = ch.equip.main && itemHand(ch.equip.main) === 2 && !ch.equip.off && !st.titanGrip;
  const offCell = twoH ? `<div class="cell ghost-2h" data-drop="eq:off" data-tip="Obouruční zbraň zabírá obě ruce."><canvas width="48" height="48" data-icon="${itemIcon(ch.equip.main)}" data-mono="1"></canvas><span class="cell-label">Levá ruka</span></div>` : slot('off');
  return `<div class="doll">
    <div class="doll-col">${['head', 'neck', 'cloak', 'chest', 'gloves'].map(slot).join('')}</div>
    <div class="doll-mid"><canvas width="128" height="128" data-race="${ch.race}" data-cls="${ch.cls}" class="doll-hero"></canvas>
      <div class="doll-hands">${slot('main')}${offCell}</div></div>
    <div class="doll-col">${['ring1', 'ring2', 'legs', 'boots'].map(slot).join('')}</div></div>`;
}

function showCharacter() {
  const ch = G.char, st = heroStats();
  if (UI.sel && !itemBySrc(UI.sel)) UI.sel = null;
  showModal(`<h2>${ch.name} <span class="muted small">${RACES[ch.race].name} – ${CLASSES[ch.cls].name}</span></h2>
    <div class="char">
      <div>${dollHtml(UI.sel)}
        <div class="bag-head"><b>Batoh</b> <span class="muted small">${ch.inv.length}/${INV_MAX}</span>
          <span class="muted small hint">Táhni předměty, dvojklik je přesune.</span></div>
        <div class="bag" data-drop="inv">${bagCells('inv', INV_MAX, UI.sel)}</div>
        <div class="bag-actions">
          <button onclick="UI.invSort='${UI.invSort === 'score' ? 'rarity' : 'score'}';showCharacter()">Řadit: ${UI.invSort === 'score' ? 'síla' : 'rarita'}</button>
          <button onclick="bulkSell('gray')">Prodat šedé</button><button onclick="bulkSell('green')">Prodat šedé a zelené</button>
          <div class="sell-zone" data-drop="sell">Sem přetáhni pro prodej ${GI}</div>
        </div>
        <div class="autosell-row"><span class="muted small">Automaticky prodávat sebrané:</span>
          ${RARITY_ORDER.map(r => `<label class="check small"><input type="checkbox" ${G.save.settings.autoSell[r] ? 'checked' : ''} onchange="G.save.settings.autoSell['${r}']=this.checked;persist()"> <span style="color:${RARITIES[r].color}">${RARITIES[r].name}</span></label>`).join('')}
        </div>
      </div>
      <div class="cstats">${charStatsHtml(st)}</div>
    </div>
    <div class="detail-box">${detailHtml()}</div>
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true, 'char');
}

function detailHtml() {
  const it = itemBySrc(UI.sel);
  if (!it) return '<p class="muted small">Klikni na předmět ve výbavě nebo v batohu.</p>';
  const [w] = UI.sel.split(':');
  if (w === 'eq') return itemHtml(it, `<div class="item-act"><button onclick="unequip('${UI.sel.split(':')[1]}');UI.sel=null;refreshPanel()">Sundat</button></div>`);
  const slots = slotsFor(it), best = bestTarget(it);
  const names = { main: 'do pravé ruky', off: 'do levé ruky', ring1: 'jako prsten 1', ring2: 'jako prsten 2' };
  const btns = slots.map(sl => `<button class="${sl === best.slot ? 'primary' : ''}" onclick="equipTo(itemBySrc('${UI.sel}'),'${sl}','${w}');UI.sel=null;refreshPanel()">Nasadit ${slots.length > 1 ? names[sl] : ''}</button>`).join('');
  const g = Math.round(best.gain);
  const cmp = best.slot ? displaced(it, best.slot).map(d => G.char.equip[d]) : [];
  return `<div class="cmp"><div>${itemHtml(it, `<div class="item-act">${slots.length ? `<span class="${g > 0 ? 'up' : 'down'}">${g > 0 ? '▲' : '▼'} ${Math.abs(g)}</span>` : ''}${btns}
      <button onclick="sellItem('${w}',${it.uid});UI.sel=null;refreshPanel()">Prodat +${fmt(sellValue(it))} ${GI}</button></div>`)}</div>
    ${cmp.length ? `<div><div class="muted small">Teď nasazeno:</div>${cmp.map(c => itemHtml(c)).join('')}</div>` : ''}</div>`;
}

function bulkSell(r) {
  const [n, gold] = sellUpTo(r);
  UI.sel = null;
  toast(n ? `Prodáno ${n} předmětů za ${fmt(gold)} zlata` : 'Nic k prodeji');
  refreshPanel();
}

function refreshPanel() {
  const k = UI.modalKind;
  if (k === 'char') showCharacter(); else if (k === 'stash') showStash(); else if (k === 'vendor') showVendor();
  else if (k === 'smith') showSmith(); else if (k === 'talents') showTalents();
}

// ---------- Truhla ----------

function showStash() {
  showModal(`<h2>Sdílená truhla <span class="muted small">pro všechny postavy</span></h2>
    <div class="two-bags">
      <div><div class="bag-head"><b>Truhla</b> <span class="muted small">${G.save.stash.length}/${STASH_MAX}</span></div>
        <div class="bag stash" data-drop="stash">${bagCells('stash', STASH_MAX, UI.sel)}</div></div>
      <div><div class="bag-head"><b>Batoh</b> <span class="muted small">${G.char.inv.length}/${INV_MAX}</span></div>
        <div class="bag" data-drop="inv">${bagCells('inv', INV_MAX, UI.sel)}</div></div>
    </div>
    <p class="muted small">Táhni předměty mezi truhlou a batohem, nebo je přesuň dvojklikem.</p>
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true, 'stash');
}

// ---------- Obchodník ----------

function showVendor() {
  const stock = vendorStock();
  const cells = stock.map(it => iconCell(it, '', `shop:${it.uid}`, UI.sel === `shop:${it.uid}`, `<span class="price ${G.save.gold >= it.price ? '' : 'cant'}">${fmt(it.price)}</span>`)).join('');
  let det = '<p class="muted small">Klikni na zboží. Dvojklik nebo přetažení do batohu = koupit. Předmět z batohu prodáš přetažením na obchodníka.</p>';
  const it = itemBySrc(UI.sel);
  if (it && UI.sel.startsWith('shop:')) {
    const b = bestTarget(it), g = Math.round(b.gain);
    det = itemHtml(it, `<div class="item-act">${b.slot ? `<span class="${g > 0 ? 'up' : 'down'}">${g > 0 ? '▲' : '▼'} ${Math.abs(g)}</span>` : ''}
      <button class="primary" onclick="buyItem(${it.uid});UI.sel=null;showVendor()">Koupit za ${fmt(it.price)} ${GI}</button>
      ${b.slot ? `<button onclick="buyItem(${it.uid},'${b.slot}');UI.sel=null;showVendor()">Koupit a nasadit</button>` : ''}</div>`);
  } else if (it) det = itemHtml(it, `<div class="item-act"><button onclick="sellItem('inv',${it.uid});UI.sel=null;showVendor()">Prodat +${fmt(sellValue(it))} ${GI}</button></div>`);
  showModal(`<h2>Obchodník <span class="muted small">zboží pro třídu ${CLASSES[G.char.cls].name}, úroveň riftu ${G.char.maxRift}</span></h2>
    <p>Máš <b class="gold">${fmt(G.save.gold)} ●</b>. Zboží se obnoví po každém návratu z riftu.</p>
    <div class="two-bags">
      <div><div class="bag-head"><b>Zboží</b></div><div class="bag shop" data-drop="sell">${cells || '<p class="muted small">Vyprodáno.</p>'}</div>
        <div class="sell-zone big" data-drop="sell">Sem přetáhni pro prodej ${GI}</div></div>
      <div><div class="bag-head"><b>Batoh</b> <span class="muted small">${G.char.inv.length}/${INV_MAX}</span></div>
        <div class="bag" data-drop="inv">${bagCells('inv', INV_MAX, UI.sel)}</div>
        <div class="bag-actions"><button onclick="bulkSell('gray')">Prodat šedé</button><button onclick="bulkSell('green')">Prodat šedé a zelené</button></div></div>
    </div>
    <div class="detail-box">${det}</div>
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true, 'vendor');
}

// ---------- Kovář ----------

function showSmith() {
  const rows = allWorn().filter(it => it.dur !== undefined).map(it => {
    const c = repairCost(it), pctv = it.dur / it.maxDur;
    return `<div class="smith-row"><canvas width="24" height="24" data-icon="${itemIcon(it)}" data-gem="${RARITIES[it.rarity].color}"></canvas>
      <span style="color:${RARITIES[it.rarity].color}">${it.name}</span>
      <div class="durbar"><div style="width:${pctv * 100}%;background:${pctv === 0 ? '#e04040' : pctv < 0.25 ? '#e0a040' : '#4fc46a'}"></div></div>
      <span class="small">${it.dur}/${it.maxDur}</span>
      ${c ? `<button class="small-btn" onclick="repairItem(itemBySrcByUid(${it.uid}));showSmith()">${fmt(c)} ${GI}</button>` : '<span class="muted small">v pořádku</span>'}</div>`;
  }).join('');
  const total = repairAllCost();
  showModal(`<h2>Kovář</h2>
    <p class="muted small">Boj opotřebovává výbavu, smrt ještě víc (-10 % odolnosti). Rozbitý předmět nedává žádné staty.</p>
    <p>Máš <b class="gold">${fmt(G.save.gold)} ●</b></p>
    <div class="smith-list">${rows || '<p class="muted">Nemáš nic k opravě.</p>'}</div>
    <div class="actions"><button class="primary" onclick="repairAll();showSmith()">Opravit vše za ${fmt(total)} zlata</button><button onclick="closeMenu()">Zavřít</button></div>`, true, 'smith');
}
function itemBySrcByUid(uid) { return allWorn().find(x => x.uid === uid); }

// ---------- Výběr riftu ----------

function showRiftSelect() {
  const ch = G.char, max = ch.maxRift;
  const rows = [];
  for (let L = max; L >= 1; L--) {
    rows.push(`<button class="rift-row ${L === max ? 'top' : ''}" onclick="hideModal();startRift(${L})">
      <b>Rift ${L}</b><span>Nepřátelé: život ×${riftMult(RIFT.hp, L).toFixed(1)}, poškození ×${riftMult(RIFT.atk, L).toFixed(1)}</span>
      <span class="loot">Kořist +${Math.round(RIFT.mfPerLevel * L * 100)} %, předměty úr. ${riftIlvl(L)}</span></button>`);
    if (rows.length > 30) break;
  }
  showModal(`<h2>Obelisk riftů</h2>
    <p class="muted small">Zabíjej nepřátele, dokud se nenaplní ukazatel postupu. Pak se objeví strážce riftu, náhodný boss. Po jeho porážce se odemkne další úroveň.
      Vyšší úroveň znamená silnější nepřátele, ale lepší kořist, víc zlata a zkušeností.</p>
    <div class="rift-list">${rows.join('')}</div>
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true);
}

// ---------- Talenty a lišta dovedností ----------

function talentPointsFree() { const ch = G.char; return talentPointsTotal(ch.level) - talentsSpent(ch); }
const TALENT_TYPE = { skill: 'Dovednost', enh: 'Zesílení dovednosti', choice: 'Volba – vyber jednu ze dvou', passive: 'Pasivní bonus', key: 'Klíčová pasivka (v tomto stromu smíš mít jen jednu)', base: 'Výchozí dovednost' };

// ---- Návrh talentů: body se rozdělují nanečisto a uloží se až tlačítkem Potvrdit ----
function TD() { if (!UI.tDraft) UI.tDraft = Object.assign({}, G.char.talents); return UI.tDraft; }
function draftFree() { return talentPointsTotal(G.char.level) - talentsSpent({ cls: G.char.cls, talents: TD() }); }
function talentsDirty() { if (!UI.tDraft) return false; const a = UI.tDraft, b = G.char.talents; return Object.keys(Object.assign({}, a, b)).some(k => (a[k] || 0) !== (b[k] || 0)); }

// Lze přidat bod (u volby: zvolit danou možnost)?
function canLearn(n, opt) {
  const t = TD(), v = t[n.id] || 0;
  if (n.type === 'base') return false;
  if (n.type === 'choice' && v) return v !== opt && canSwitchChoice(n);
  if (draftFree() <= 0 || v >= n.max) return false;
  return talentStateValid(G.char.cls, Object.assign({}, t, { [n.id]: n.type === 'choice' ? (opt || 1) : v + 1 }));
}
// Volbu lze přepnout, pokud ještě není potvrzená, nebo ve městě
function canSwitchChoice(n) { return !(G.char.talents[n.id] || 0) || G.scene === 'town'; }
// Lze ubrat bod? Nepotvrzené body vždy, potvrzené jen ve městě
function canUnlearn(n) {
  const t = TD(), v = t[n.id] || 0, conf = G.char.talents[n.id] || 0;
  if (!v || n.type === 'base') return false;
  const pending = n.type === 'choice' ? !conf : v > conf;
  if (!pending && G.scene !== 'town') return false;
  const t2 = Object.assign({}, t);
  if (n.type === 'choice' || v === 1) delete t2[n.id]; else t2[n.id] = v - 1;
  return talentStateValid(G.char.cls, t2);
}
// Proč uzel nejde naučit (text pro hráče)
function learnBlockReason(n) {
  const ch = G.char, t = TD(), tree = classTrees(ch.cls).find(x => x.key === n.tree);
  if (draftFree() <= 0) return 'Nemáš volný bod – získáš ho za každou úroveň.';
  if (n.req.length && !n.req.some(r => { const p = nodeById(ch.cls, r); return p.type === 'base' || (t[r] || 0) > 0; }))
    return 'Nejdřív potřebuješ bod v: ' + n.req.map(r => nodeTitle(nodeById(ch.cls, r))).join(' nebo ') + '.';
  const need = gateFor(tree, n.row), below = tree.nodes.filter(x => x.row < n.row).reduce((s, x) => s + nodeSpent(x, t[x.id]), 0);
  if (below < need) return `Potřebuješ ${need} bodů ve vyšších řádcích tohoto stromu (máš ${below}).`;
  if (n.type === 'key') return 'V tomto stromu už máš jinou klíčovou pasivku (v každém stromu smí být jen jedna).';
  return '';
}
function nodeTitle(n) { return n.type === 'choice' ? n.opts.map(o => o.name).join(' / ') : n.name; }

// + : přidá bod do návrhu
function learnTalent(id, opt) {
  const n = nodeById(G.char.cls, id), t = TD();
  if (!n) return;
  const v = t[id] || 0;
  if (n.type === 'choice' && v) {
    if (v === opt) return;
    if (!canSwitchChoice(n)) { toast('Potvrzenou volbu můžeš změnit jen ve městě'); return; }
    t[id] = opt;
  } else {
    if (!canLearn(n, opt)) { const why = learnBlockReason(n); if (why) toast(why); return; }
    t[id] = n.type === 'choice' ? (opt || 1) : v + 1;
  }
  sfx('click');
  UI.tSel = n.type === 'choice' ? `${id}#${t[id]}` : id;
  showTalents();
}
// − : ubere bod z návrhu
function unlearnTalent(id) {
  const n = nodeById(G.char.cls, id), t = TD();
  if (!canUnlearn(n)) { toast(G.scene !== 'town' && (G.char.talents[id] || 0) >= (t[id] || 0) ? 'Potvrzené body můžeš vracet jen ve městě' : 'Tento bod nejde vrátit – závisí na něm jiné talenty'); return; }
  if (n.type === 'choice' || t[id] === 1) delete t[id]; else t[id]--;
  showTalents();
}
// Potvrdí návrh: talenty se uloží, nové dovednosti jdou na lištu
function confirmTalents() {
  const ch = G.char, before = knownSkills(ch);
  ch.talents = Object.assign({}, TD());
  const now = knownSkills(ch);
  ch.bar = ch.bar.map(id => id && !now.includes(id) ? null : id);
  const added = now.filter(id => !before.includes(id));
  added.forEach(id => { if (!ch.bar.includes(id)) { const f = ch.bar.indexOf(null); if (f >= 0) ch.bar[f] = id; } });
  UI.tDraft = null;
  onGearChange(); buildHud(); sfx('levelup');
  toast(added.length ? `Talenty potvrzeny · na lištu: ${added.map(id => SKILLS[id].name).join(', ')}` : 'Talenty potvrzeny');
  if (UI.modalKind === 'talents') showTalents();
}
function discardTalents() { UI.tDraft = null; if (UI.modalKind === 'talents') showTalents(); }
function resetTalents() {
  if (G.scene !== 'town') { toast('Talenty můžeš resetovat jen ve městě'); return; }
  UI.tDraft = {};
  showTalents();
}
// Zavření okna s nepotvrzenými talenty
function closeTalentsAsk() {
  showModal(`<p>Máš nepotvrzené talenty. Co s nimi?</p><div class="actions">
    <button class="primary" onclick="confirmTalents();hideModal()">Potvrdit</button>
    <button class="danger" onclick="UI.tDraft=null;hideModal()">Zahodit</button>
    <button onclick="showTalents()">Zpět</button></div>`);
}

function skillInfo(id) {
  const S = SKILLS[id], rn = CLASSES[G.char.cls].res.name.toLowerCase();
  return [S.cost ? `${Math.round(skillCost(id))} ${rn}` : '', S.gen ? `+${S.gen} ${rn}` : '', S.cd ? `přebíjení ${S.cd} s` : '', S.lifeCost ? `${Math.round(S.lifeCost * 100)} % života` : ''].filter(Boolean).join(' · ');
}
function skillChip(id, attrs = '') {
  const S = SKILLS[id], info = skillInfo(id);
  return `<div class="skill-chip ${UI.pickSkill === id ? 'sel' : ''}" data-skill="${id}" ${attrs} data-tip="${S.name}: ${S.desc}${info ? ' (' + info + ')' : ''}">
    <span class="sk-glyph">${skillIcon(id)}</span><span class="sk-name">${S.name}</span></div>`;
}

const BAR_KEYS = ['LMB', 'RMB', '1', '2', '3', '4'];
function barSlotsHtml() {
  return G.char.bar.map((id, i) => `<div class="bar-slot" data-bar="${i}" ${id ? `data-tip="${SKILLS[id].name}: ${SKILLS[id].desc}"` : ''}>
    ${id ? `<span class="sk-glyph">${skillIcon(id)}</span>` : ''}<span class="key">${BAR_KEYS[i]}</span></div>`).join('');
}

function assignSkill(id, slot) {
  const bar = G.char.bar, old = bar.indexOf(id);
  if (old >= 0) bar[old] = bar[slot];
  bar[slot] = id;
  UI.pickSkill = null;
  persist(); buildHud();
  if (UI.modalKind === 'talents') showTalents();
}

const TROW = 60;   // výška řádku stromu v px
// Ikona pasivky podle hlavního bonusu
function passiveGlyph(n) {
  const st = n.type === 'choice' ? n.opts[0].stats : n.stats, k = Object.keys(st)[0] || '';
  const b = k.includes('_') && !k.startsWith('sk') ? k.split('_')[1] : k;
  const map = { hpPct: '❤', def: '⛨', dmgRed: '⛨', block: '⛨', crit: '✧', critDmg: '✹', spdPct: '»', msPct: '➤', ls: '❦', regen: '✚', healPct: '✚', thorns: '✶',
    firePct: '🔥', frostPct: '❄', shadowPct: '☾', naturePct: '❀', arcanePct: '✦', physPct: '⚔', atkPct: '⚔', dotPct: '☠', dotDur: '☠', petPct: '🐾', petSpd: '🐾', petLs: '🐾', petCount: '🐾',
    resAll: '◈', resFire: '◈', resFrost: '◈', resShadow: '◈', armorPen: '➶', resPen: '➶', execPct: '☩', rebirth: '✟', goldPct: '●', killRes: '◆', killHeal: '◆', resMax: '◆', resRegenPct: '◆', genPct: '◆', cdr: '⟳',
    enrageChance: '💢', enrageDur: '💢', enrageAlways: '💢', offhand: '⚔', bleedHit: '🩸', ignite: '🔥', burnBonus: '🔥', slowedBonus: '❄', slowPct: '❄', slowAura: '❄', freezeChance: '❄', stunDmg: '✺', stunChance: '✺',
    shatter: '❆', dotSpread: '☣', dottedBonus: '☣', vulnPct: '🎯', titanGrip: '⚔', loneWolf: '🐺', primCount: '⁂', primPierce: '➶', arrowPierce: '➶', eclipse: '🌗', formDur: '🐻', doubleChance: '⁑', skillPct: '✦', lowHpDmg: '🩸', auraPct: '🌀', trapMax: '✹', dodge: '↯' };
  return map[b] || '◆';
}

function showTalents() {
  const ch = G.char, c = CLASSES[ch.cls], trees = classTrees(ch.cls), T = TD(), free = draftFree(), dch = { cls: ch.cls, talents: T };
  if (!UI.tTree || !trees.find(t => t.key === UI.tTree)) {
    const pts = trees.map(t => treePoints(dch, t.key));
    UI.tTree = trees[pts.slice(1).some(p => p > 0) ? 1 + pts.slice(1).indexOf(Math.max(...pts.slice(1))) : (pts[0] > 0 ? 0 : 1)].key;
  }
  const tree = trees.find(t => t.key === UI.tTree), tp = treePoints(dch, tree.key);
  const known = knownSkills(ch);
  const tabs = trees.map(t => `<button class="ttab ${t.key === UI.tTree ? 'sel' : ''}" onclick="UI.tTree='${t.key}';UI.tSel=null;showTalents()">
      <span class="ttab-ic">${t.icon}</span><span><b>${t.name}</b><small>${t.core ? 'Strom třídy' : 'Specializace'} · ${treePoints(dch, t.key)} b.</small></span></button>`).join('');
  // návaznosti vybraného uzlu: předchůdci (co potřebuje) a následníci (co odemyká)
  const selId = (UI.tSel || '').split('#')[0];
  const { anc, alt, main, altE, desc } = talentRelations(tree, selId);
  // čáry
  const pos = n => [n.col + 0.5, n.row + 0.5];
  const lines = tree.nodes.flatMap(n => n.req.map(r => {
    const p = tree.nodes.find(x => x.id === r), a = pos(p), b = pos(n);
    const on = (T[n.id] || n.type === 'base') && (T[p.id] || p.type === 'base');
    const can = (T[p.id] || p.type === 'base');
    const e = p.id + '>' + n.id, hl = main.has(e) ? 'up' : altE.has(e) ? 'alt' : (desc.has(n.id) && p.id === selId) ? 'down' : '';
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${on ? 'on' : can ? 'can' : ''} ${hl}" vector-effect="non-scaling-stroke"/>`;
  })).join('');
  const gates = tree.gates.map(([r, need]) => `<div class="tgate ${tp >= need ? 'ok' : ''}" style="top:${r * TROW}px"><span>${need} bodů</span></div>`).join('');
  const nodes = tree.nodes.map(n => {
    const v = T[n.id] || 0, conf = ch.talents[n.id] || 0, pend = n.type === 'choice' ? v !== conf : v > conf;
    const rel = anc.has(n.id) ? 'anc' : alt.has(n.id) ? 'altn' : desc.has(n.id) ? 'desc' : '';
    const top = (n.row + 0.5) * TROW, x = (n.col + 0.5) / 7 * 100;
    if (n.type === 'choice') {   // volba = dva menší uzly vedle sebe, zvolením jednoho se druhý zamkne
      return n.opts.map((o, i) => {
        const chosen = v === i + 1, st = chosen ? 'max' : v ? 'excl' : canLearn(n, i + 1) ? 'ok' : 'lock', sid = `${n.id}#${i + 1}`;
        return `<button class="tn t-opt ${st} ${rel} ${chosen && pend ? 'pend' : ''} ${UI.tSel === sid ? 'sel' : ''}" style="left:calc(${x}% + ${(i ? 18 : -18) + (n.col === 0 ? 12 : n.col === 6 ? -12 : 0)}px);top:${top}px"
          onclick="UI.tSel='${sid}';showTalents()" ondblclick="learnTalent('${n.id}', ${i + 1})"><span class="tn-g">${optIconHtml(o, n)}</span></button>`;
      }).join('');
    }
    const state = n.type === 'base' ? 'base' : v >= n.max ? 'max' : v > 0 ? 'part' : canLearn(n) ? 'ok' : 'lock';
    const rank = n.type === 'base' ? '' : `<span class="tn-r ${pend ? 'pend' : ''}">${v}/${n.max}</span>`;
    return `<button class="tn t-${n.type} ${state} ${rel} ${pend ? 'pend' : ''} ${UI.tSel === n.id ? 'sel' : ''}" style="left:${x}%;top:${top}px"
      onclick="UI.tSel='${n.id}';showTalents()" ondblclick="learnTalent('${n.id}')"><span class="tn-g">${nodeIconHtml(n)}</span>${n.type === 'enh' ? '<span class="tn-plus">+</span>' : ''}${rank}</button>`;
  }).join('') + talentPmHtml(tree);
  const dirty = talentsDirty(), diff = talentsSpent(dch) - talentsSpent(ch);
  // zachovat posunutí stromu a bočního panelu při překreslení
  const keepScroll = UI.modalKind === 'talents' ? ['.tal-main', '.tal-side', ''].map(q => { const e = q ? document.querySelector('#modal-box ' + q) : $('modal-box'); return e ? e.scrollTop : 0; }) : null;
  showModal(`<h2>Talenty – ${c.name}</h2>
    <div class="tal-layout">
      <div class="tal-side">
    <div class="talent-top"><span>Volné body: <b class="${free > 0 ? 'gold' : ''}">${free}</b> <span class="muted small">· rozděleno ${talentsSpent(dch)} z ${talentPointsTotal(ch.level)}</span></span>
      <span class="muted small">Klikni na uzel a přidej bod tlačítkem +</span></div>
    <div class="skills-box">
      <div><div class="muted small">Tvoje dovednosti – přetáhni na lištu (nebo klikni na dovednost a pak na slot):</div>
        <div class="skill-list">${known.map(id => skillChip(id, `onclick="UI.pickSkill='${id}';showTalents()"`)).join('')}</div></div>
      <div><div class="muted small">Lišta (myš / 1–4):</div><div class="bar-edit">${barSlotsHtml()}</div></div>
    </div>
    <div class="tdetail">${talentDetailHtml()}
      ${dirty ? `<div class="tconfirm"><span>Nepotvrzené změny${diff ? ` (${diff > 0 ? '+' : ''}${diff} ${Math.abs(diff) === 1 ? 'bod' : Math.abs(diff) < 5 ? 'body' : 'bodů'})` : ''}</span>
        <button class="primary" onclick="confirmTalents()">✔ Potvrdit talenty</button><button onclick="discardTalents()">Zrušit</button></div>` : ''}</div>
    <div class="actions">
      <button class="danger" onclick="resetTalents()">Resetovat vše (jen ve městě)</button>
      <button onclick="closeMenu()">Zavřít</button>
    </div>
      </div>
      <div class="tal-main">
    <div class="ttabs">${tabs}</div>
    <p class="muted small tdesc-line">${tree.icon} <b>${tree.name}</b> – ${tree.desc}</p>
    <div class="ttree-wrap"><div class="ttree" style="height:${tree.rows * TROW}px">
      <svg class="tlines" viewBox="0 0 7 ${tree.rows}" preserveAspectRatio="none">${lines}</svg>${gates}${nodes}
    </div></div>
      </div>
    </div>`, true, 'talents');
  if (keepScroll) ['.tal-main', '.tal-side', ''].forEach((q, i) => { const e = q ? document.querySelector('#modal-box ' + q) : $('modal-box'); if (e) e.scrollTop = keepScroll[i]; });
}

// Tlačítka + a − u vybraného uzlu
function talentPmHtml(tree) {
  if (!UI.tSel) return '';
  const [sid, so] = UI.tSel.split('#'), n = tree.nodes.find(x => x.id === sid);
  if (!n || n.type === 'base') return '';
  const opt = n.type === 'choice' ? (+so || 1) : undefined, v = TD()[n.id] || 0;
  const canMinus = n.type === 'choice' ? v === opt && canUnlearn(n) : canUnlearn(n), canPlus = canLearn(n, opt);
  let x = `${(n.col + 0.5) / 7 * 100}%`, off = n.type === 'key' ? 40 : n.type === 'skill' ? 38 : n.type === 'enh' ? 31 : 36;
  const dx = n.type === 'choice' ? (opt === 2 ? 18 + 22 : -18 - 22) + (n.col === 0 ? 12 : n.col === 6 ? -12 : 0) : (n.col >= 5 ? -off : off);
  const side = dx < 0 ? 'left' : 'right';
  return `<div class="tn-pm ${side}" style="left:calc(${x} + ${dx}px);top:${(n.row + 0.5) * TROW}px">
    <button class="pm-plus" ${canPlus ? '' : 'disabled'} onclick="event.stopPropagation();learnTalent('${n.id}'${opt ? ', ' + opt : ''})" title="Přidat bod">+</button>
    <button class="pm-minus" ${canMinus ? '' : 'disabled'} onclick="event.stopPropagation();unlearnTalent('${n.id}')" title="Ubrat bod">−</button></div>`;
}

// Předchůdci a následníci uzlu ve stromu
function talentRelations(tree, id) {
  const out = { anc: new Set(), alt: new Set(), main: new Set(), altE: new Set(), desc: new Set() };
  if (!id || !tree.nodes.some(n => n.id === id)) return out;
  const routes = talentRoutes(G.char.cls, TD(), id);
  routes.forEach((r, i) => {
    r.nodes.forEach(x => (i === 0 ? out.anc : out.alt).add(x));
    routeEdges(r, id).forEach(e => (i === 0 ? out.main : out.altE).add(e));
  });
  out.desc = new Set(talentChildren(G.char.cls, id));
  return out;
}
function talentDetailHtml() {
  const ch = G.char;
  if (!UI.tSel) return `<div class="muted small">Vyber uzel ve stromu.</div>`;
  const [sid, so] = UI.tSel.split('#');
  const n = nodeById(ch.cls, sid);
  if (!n) return '';
  const v = TD()[n.id] || 0, ok = canLearn(n), why = ok ? '' : learnBlockReason(n);
  const head = `<div class="td-head"><span class="td-g">${nodeIconHtml(n)}</span>
    <div><b>${nodeTitle(n)}</b><div class="muted small">${TALENT_TYPE[n.type]}${n.forSkill ? ' · ' + SKILLS[n.forSkill].name : ''}${n.type === 'passive' ? ` · úroveň ${v}/${n.max}` : ''}</div></div></div>`;
  if (n.type === 'choice') {
    const i = Math.max(0, (+so || 1) - 1), o = n.opts[i], other = n.opts[1 - i], chosen = v === i + 1, okO = canLearn(n, i + 1);
    return `<div class="td-head"><span class="td-g">${optIconHtml(o, n)}</span><div><b>${o.name}</b> ${chosen ? '<span class="gold small">✓</span>' : ''}<div class="muted small">Volba${n.forSkill ? ' · ' + SKILLS[n.forSkill].name : ''} · vylučuje se s: ${other.name}</div></div></div>
      <div class="small td-desc">${o.desc}</div>${!v && !okO && why ? `<div class="td-why">${why}</div>` : ''}`;
  }
  const desc = n.skill ? `${n.desc}${skillInfo(n.skill) ? ` <span class="muted">(${skillInfo(n.skill)})</span>` : ''}` : n.desc + (n.max > 1 ? ' <span class="muted">(za každou úroveň)</span>' : '');
  return head + `<div class="small td-desc">${desc}${n.type === 'base' ? ' <span class="muted">Tuhle dovednost máš od začátku.</span>' : ''}</div>${!ok && v < n.max && why && n.type !== 'base' ? `<div class="td-why">${why}</div>` : ''}`;
}

// ---------- Nastavení a legenda ----------

function showSettings() {
  const s = G.save.settings;
  const sellBoxes = RARITY_ORDER.map(r => `<label class="check"><input type="checkbox" ${s.autoSell[r] ? 'checked' : ''}
    onchange="G.save.settings.autoSell['${r}']=this.checked;persist()"> <span style="color:${RARITIES[r].color}">${RARITIES[r].name}</span></label>`).join('');
  showModal(`<h2>Nastavení</h2>
    <label class="check"><input type="checkbox" ${s.sound !== false ? 'checked' : ''} onchange="G.save.settings.sound=this.checked;persist()"> Zvuky</label>
    <label class="check"><input type="checkbox" ${s.autoFullscreen !== false ? 'checked' : ''} onchange="G.save.settings.autoFullscreen=this.checked;persist()"> Na mobilu spouštět hru přes celou obrazovku</label>
    <p class="muted small" style="margin:-4px 0 8px">Celou obrazovku přepneš kdykoli tlačítkem ⛶ (na počítači klávesou F). Když ji prohlížeč nepovolí, přidej si hru na plochu telefonu.</p>
    <label class="check"><input type="checkbox" ${s.autoAttack ? 'checked' : ''} onchange="G.save.settings.autoAttack=this.checked;persist()"> Automatický základní útok (počítač) – útočí směrem ke kurzoru, když je nepřítel v dosahu. Jde přepnout i pravým klikem na první slot lišty.</label>
    <label class="check"><input type="checkbox" ${s.dmgNumbers ? 'checked' : ''} onchange="G.save.settings.dmgNumbers=this.checked;persist()"> Zobrazovat čísla poškození</label>
    <h3>Automaticky prodávat sebrané předměty</h3><p class="muted small">Zaškrtnuté rarity se po sebrání rovnou prodají za zlato. Najdeš to i v okně Postava a batoh.</p><div class="sell-grid">${sellBoxes}</div>
    <h3>Uložení</h3>
    <p class="muted small">Hra se ukládá automaticky do tohoto prohlížeče. Pro přenos na jiné zařízení použij kód.</p>
    <button onclick="doExport()">Zkopírovat kód uložení</button>
    <textarea id="save-code" rows="3" placeholder="Sem vlož kód uložení (WD5:...)"></textarea>
    <div class="actions"><button onclick="doImport()">Načíst z kódu</button><button onclick="closeMenu()">Zavřít</button></div>
    <p class="muted small">Verze ${GAME_VERSION}</p>`);
}
function doExport() {
  persist();
  const code = exportSave(G.save);
  $('save-code').value = code; $('save-code').select();
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('Kód zkopírován'), () => toast('Zkopíruj kód z pole'));
}
function doImport() {
  try { G.save = importSave($('save-code').value); delete G.save._notice; persist(); showMenu(); toast('Uložení načteno'); }
  catch (e) { toast('Neplatný kód uložení'); }
}

function showLegend() {
  const row = (a, b) => `<div class="lg-row"><span class="lg-ic">${a}</span><span>${b}</span></div>`;
  showModal(`<h2>Ovládání a legenda</h2>
    <p class="muted small">Ikony: <a href="https://game-icons.net" target="_blank" style="color:var(--soul)">game-icons.net</a> (Lorc, Delapouite a další), CC BY 3.0.</p>
    <h3>Počítač</h3>
    ${row('WASD / šipky', 'Pohyb.')}
    ${row('Levé tlačítko', 'Držení = základní útok směrem ke kurzoru. Klik na postavu ve městě = promluv s ní.')}
    ${row('Pravý klik na 1. slot', 'Zapne/vypne automatický základní útok (útočí ke kurzoru, když je nepřítel v dosahu).')}
    ${row('Pravé tlačítko', 'Dovednost ve slotu RMB na místo kurzoru.')}
    ${row('1 – 4', 'Dovednosti z lišty.')}
    ${row('Q', 'Lektvar léčení.')}${row('I / C', 'Postava a batoh.')}${row('K', 'Talenty a dovednosti.')}
    ${row('M / Tab', 'Velká mapa.')}${row('T', 'Teleport do města (5 s, pohyb ho přeruší).')}${row('Esc', 'Menu s teleportem do města.')}
    <h3>Mobil</h3>
    ${row('Joystick vlevo', 'Pohyb.')}${row('Automaticky', 'Základní útok sám míří na nejbližšího nepřítele v dosahu.')}${row('Velké tlačítko', 'Drž = dojdi k nejbližšímu nepříteli a útoč.')}${row('Kolečka', 'Dovednosti, lektvar a portál.')}
    <h3>Rift</h3>
    ${row('Ukazatel nahoře', 'Postup riftu. Elitní nepřátelé dávají víc. Na 100 % se objeví strážce riftu.')}
    ${row('<span style="color:#ff3030">Červený kruh</span>', 'Varování: sem za chvíli dopadne útok. Uteč!')}
    ${row('<span style="color:#7aa0ff">Modré jméno</span>', 'Elitní nepřítel se schopnostmi, víc života, lepší kořist.')}
    ${row('<span style="color:#ff5050">●</span>', 'Koule zdraví: seber ji a vyléčíš se.')}
    ${Object.values(SHRINES).map(S => row(`<span style="color:${S.color}">${S.glyph}</span>`, `<b>${S.name}</b>: ${S.desc}`)).join('')}
    <h3>Elementy</h3>${Object.keys(ELEMENTS).map(k => row(`<span style="color:${ELEMENTS[k].color}">${ELEMENTS[k].icon}</span>`, `<b>${ELEMENTS[k].name}</b>${k === 'phys' ? ' – tlumí ho zbroj' : k === 'chaos' ? ' – ignoruje zbroj i odolnosti' : ''}`)).join('')}
    <h3>Rarity</h3>${RARITY_ORDER.map(r => row(`<span style="color:${RARITIES[r].color}">■</span>`, `<b style="color:${RARITIES[r].color}">${RARITIES[r].name}</b> – od riftu ${RARITIES[r].minRift}${r === 'orange' || r === 'diamond' ? ', jen pro určité třídy' : ''}`)).join('')}
    <h3>Atributy a zbroj</h3>${ATTR_ORDER.map(k => row(`<b>${ATTRS[k].short}</b>`, `<b>${ATTRS[k].name}</b>: ${ATTRS[k].desc}`)).join('')}
    ${row('★', 'Hlavní atribut tvé třídy navíc přidá +1 % útoku za bod.')}
    ${Object.values(ARMOR_WEIGHT).map(w => row('🛡', `<b>${w.name}</b>: ${w === ARMOR_WEIGHT.heavy ? 'víc obrany (válečník)' : 'méně obrany, ale odolnosti proti živlům (kouzelníci)'}. Nosit může každý.`)).join('')}
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true);
}

// ---------- Vysvětlivky ----------

function initTooltips() {
  const tip = $('tip');
  const show = el => {
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = (r.top > 70 ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + 'px';
  };
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el && !drag) show(el); });
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) tip.hidden = true; });
}

function itemTipHtml(src) {
  const it = itemBySrc(src);
  if (!it) return '';
  let html = itemHtml(it);
  const w = src.split(':')[0];
  if (w !== 'eq' && G.char) {
    const b = bestTarget(it);
    if (b.slot) {
      const g = Math.round(b.gain), cur = displaced(it, b.slot).map(d => G.char.equip[d]);
      html += `<div class="tip-cmp"><span class="${g > 0 ? 'up' : 'down'}">${g > 0 ? '▲ lepší' : '▼ slabší'} o ${Math.abs(g)}</span> než nasazené</div>`;
      if (cur.length) html += `<div class="muted small">Teď nasazeno:</div>` + cur.map(c => itemHtml(c)).join('');
    }
    if (w === 'shop') html += `<div class="tip-cmp">Cena: <b class="gold">${fmt(it.price)} ●</b></div>`;
  }
  return html;
}

// ---------- Přetahování (předměty i dovednosti), dvojklik ----------

let drag = null;
function quickMove(src) {
  const [w, id] = src.split(':'), it = itemBySrc(src), k = UI.modalKind;
  if (!it) return;
  if (w === 'shop') return buyItem(it.uid);
  if (k === 'stash') { if (w === 'inv') { if (addTo('stash', it)) removeFrom('inv', it.uid); } else if (w === 'stash') { if (addTo('inv', it)) removeFrom('stash', it.uid); } else if (w === 'eq') unequip(id, 'stash'); persist(); return; }
  if (k === 'vendor' && w === 'inv') return sellItem('inv', it.uid);
  if (w === 'eq') return unequip(id);
  const b = bestTarget(it);
  if (b.slot) equipTo(it, b.slot, w);
  else toast(`${CLASSES[G.char.cls].name} nemůže použít: ${it.name}`);
}

function dropItemTo(src, dst) {
  const [w, id] = src.split(':'), it = itemBySrc(src);
  if (!it || !dst) return;
  const [dw, did] = dst.split(':');
  if (w === 'shop') { if (dw === 'inv') buyItem(it.uid); else if (dw === 'eq') buyItem(it.uid, did); return; }
  if (dw === 'sell') {
    G.save.gold += sellValue(it);
    if (w === 'eq') { delete G.char.equip[id]; onGearChange(); } else removeFrom(w, it.uid);
    toast(`Prodáno: ${it.name} za ${fmt(sellValue(it))} zlata`); persist(); return;
  }
  if (dw === 'eq') {
    if (w === 'eq') {
      if (did === id || !slotsFor(it).includes(did)) return;
      const eq = G.char.equip, other = eq[did];
      eq[did] = it;
      if (other && slotsFor(other).includes(id)) eq[id] = other; else { delete eq[id]; if (other) G.char.inv.push(other); }
      onGearChange();
    } else equipTo(it, did, w);
    return;
  }
  if (dw === 'inv' || dw === 'stash') {
    if (w === dw) return;
    if (w === 'eq') unequip(id, dw);
    else if (addTo(dw, it)) removeFrom(w, it.uid);
    persist();
  }
}

function initDrag() {
  const itip = $('itip');
  let down = null, lastTap = { key: '', t: 0 };
  const placeTip = (x, y) => {
    const w = itip.offsetWidth, h = itip.offsetHeight;
    itip.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, x + 16)) + 'px';
    itip.style.top = Math.max(6, Math.min(window.innerHeight - h - 6, y + 12)) + 'px';
  };
  document.addEventListener('mouseover', e => {
    if (drag) return;
    const cell = e.target.closest('#modal-box [data-src]');
    if (!cell) return;
    const html = itemTipHtml(cell.dataset.src);
    if (!html) { itip.hidden = true; return; }
    itip.innerHTML = html; itip.hidden = false; placeTip(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', e => { if (!itip.hidden && !drag) placeTip(e.clientX, e.clientY); });
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-src]')) itip.hidden = true; });
  document.addEventListener('pointerdown', e => {
    const cell = e.target.closest('#modal-box [data-src], #modal-box [data-skill]');
    if (!cell) return;
    down = { cell, src: cell.dataset.src || null, skill: cell.dataset.skill || null, x: e.clientX, y: e.clientY };
    if (down.src && !itemBySrc(down.src)) down = null;
  });
  document.addEventListener('pointermove', e => {
    if (!down) return;
    if (!drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      itip.hidden = true; $('tip').hidden = true;
      const ghost = document.createElement('div'); ghost.className = 'drag-ghost';
      if (down.src) {
        const it = itemBySrc(down.src), cv = document.createElement('canvas'); cv.width = cv.height = 48;
        drawIcon(cv.getContext('2d'), itemIcon(it), 0, 0, 4, RARITIES[it.rarity].color); ghost.appendChild(cv);
        const [w] = down.src.split(':');
        if (w !== 'shop') slotsFor(it).forEach(s => { const el = document.querySelector(`#modal-box [data-drop="eq:${s}"]`); if (el) el.classList.add('drop-ok'); });
        document.querySelectorAll('#modal-box [data-drop="inv"], #modal-box [data-drop="stash"], #modal-box [data-drop="sell"]').forEach(el => el.classList.add('drop-ok'));
      } else { ghost.innerHTML = `<span class="sk-glyph big">${skillIcon(down.skill)}</span>`; document.querySelectorAll('#modal-box [data-bar]').forEach(el => el.classList.add('drop-ok')); }
      document.body.appendChild(ghost);
      down.cell.classList.add('dragging');
      drag = { ghost };
    }
    if (drag) { drag.ghost.style.left = (e.clientX - 24) + 'px'; drag.ghost.style.top = (e.clientY - 24) + 'px'; e.preventDefault(); }
  });
  document.addEventListener('pointerup', e => {
    if (!down) return;
    const d = down; down = null;
    if (drag) {
      drag.ghost.remove(); drag = null;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (d.skill) { const slot = el && el.closest('[data-bar]'); if (slot) assignSkill(d.skill, +slot.dataset.bar); else showTalents(); return; }
      const t = el && el.closest('#modal-box [data-drop]');
      dropItemTo(d.src, t ? t.dataset.drop : null);
      UI.sel = null; refreshPanel();
      return;
    }
    if (d.skill) return;
    const now = performance.now();
    if (lastTap.key === d.src && now - lastTap.t < 380) { lastTap = { key: '', t: 0 }; itip.hidden = true; quickMove(d.src); UI.sel = null; }
    else { lastTap = { key: d.src, t: now }; UI.sel = d.src; }
    refreshPanel();
  });
  // klik na slot lišty při vybrané dovednosti
  document.addEventListener('click', e => {
    const slot = e.target.closest('#modal-box [data-bar]');
    if (slot && UI.pickSkill) assignSkill(UI.pickSkill, +slot.dataset.bar);
  });
}

function bindUi() {
  let downOnBackdrop = false;
  $('modal').addEventListener('pointerdown', e => { downOnBackdrop = e.target === $('modal'); });
  $('modal').addEventListener('click', e => { if (e.target === $('modal') && downOnBackdrop) closeMenu(); downOnBackdrop = false; });
  initTooltips();
  initDrag();
  initTouch();
  $('menu-new').onclick = showCreate;
  $('menu-play').onclick = () => playChar();
  $('menu-settings').onclick = () => showSettings();
  $('menu-fs').onclick = () => toggleFullscreen();
}
