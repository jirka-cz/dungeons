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
function hideModal() { if (UI.modalKind === 'xfer') xferStop(); $('modal').hidden = true; UI.modalKind = null; UI.npcWin = null; $('itip').hidden = true; if (G.char && G.scene !== 'menu') buildHud(); }
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
  if (G.remoteCtx) { netToastRemote(msg); return; }   // zprávu o hostovi dostane jen on   // zprávy o spoluhráčích (rozbitý předmět, plný batoh, úroveň) se tomuto hráči neukazují
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
    if (+cv.dataset.fx >= 3) { startDollFx(cv); return; }
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    drawSprite(g, cv.dataset.race, 0, 0, cv.width / 16, { palOverride: classPal(cv.dataset.race, cv.dataset.cls) });
  });
}

// ---------- Mýtický set: oheň na postavě v inventáři (3 díly = planoucí oči, 6 dílů = hořící postava) ----------
const DOLL_FX = { list: [], raf: 0 };
const FIRE_COLS = ['255,220,140', '255,120,30', '210,40,15', '70,20,20'];
function spriteEyes(race) {
  const px = getSprite(race).px, eyes = [], edge = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = px[y][x]; if (!c || c === '.') continue;
    if (c === 'e') eyes.push([x, y]);
    if ([[1, 0], [-1, 0], [0, -1], [0, 1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X > 15 || Y > 15 || px[Y][X] === '.'; })) edge.push([x, y]);
  }
  return { eyes, edge };
}
function startDollFx(cv) {
  if (DOLL_FX.list.some(d => d.cv === cv)) return;
  DOLL_FX.list.push(Object.assign({ cv, parts: [] }, spriteEyes(cv.dataset.race)));
  if (!DOLL_FX.raf) DOLL_FX.raf = requestAnimationFrame(dollFxFrame);
}
function dollFxFrame(time) {
  DOLL_FX.list = DOLL_FX.list.filter(d => d.cv.isConnected);
  if (!DOLL_FX.list.length) { DOLL_FX.raf = 0; return; }
  const tick = time / 1000;
  DOLL_FX.list.forEach(d => {
    const cv = d.cv, g = cv.getContext('2d'), W = cv.width, S = W / 16, lvl = +cv.dataset.fx, burn = lvl >= 6;
    g.clearRect(0, 0, W, cv.height);
    const spawn = (x, y, big) => d.parts.push({ x, y, vx: (Math.random() - 0.5) * S * 0.06, vy: -S * (0.06 + Math.random() * 0.09) * (big ? 1.3 : 1),
      life: 0, max: 30 + Math.random() * 25, r: S * (big ? 0.42 : 0.3) * (0.6 + Math.random() * 0.6), front: Math.random() < 0.12 });
    if (burn) {
      const gr = g.createRadialGradient(W / 2, W * 0.62, S, W / 2, W * 0.56, W * 0.5);
      gr.addColorStop(0, 'rgba(255,80,20,0.35)'); gr.addColorStop(1, 'rgba(255,40,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, cv.height);
      for (let i = 0; i < 4; i++) { const e = d.edge[Math.random() * d.edge.length | 0]; spawn((e[0] + Math.random()) * S, (e[1] + Math.random()) * S, true); }
    }
    if (Math.random() < 0.6 && d.eyes.length) { const e = d.eyes[Math.random() * d.eyes.length | 0]; spawn((e[0] + 0.5) * S, (e[1] + 0.3) * S, false); }
    d.parts.forEach(p => { p.life++; p.x += p.vx + Math.sin((p.life + p.y) * 0.08) * S * 0.02; p.y += p.vy; });
    d.parts = d.parts.filter(p => p.life < p.max);
    const draw = front => {
      g.globalCompositeOperation = 'lighter';
      d.parts.forEach(p => {
        if (p.front !== front) return;
        const k = p.life / p.max, r = p.r * (1 - k * 0.6), col = FIRE_COLS[k < 0.25 ? 0 : k < 0.55 ? 1 : k < 0.8 ? 2 : 3], a = (front ? 0.35 : 0.6) * (1 - k);
        const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, p.y - r * 0.4, r * 1.1, r * 1.9, 0, 0, 7); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    };
    draw(false);
    const eyeCol = Math.sin(tick * 9) > -0.3 ? '#ffe08a' : '#ff8a2a';
    drawSprite(g, cv.dataset.race, 0, 0, S, { palOverride: Object.assign({}, classPal(cv.dataset.race, cv.dataset.cls), { e: eyeCol }) });
    if (burn) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,90,30,${0.12 + 0.05 * Math.sin(tick * 5)})`; g.fillRect(0, 0, W, cv.height); g.globalCompositeOperation = 'source-over'; }
    g.globalCompositeOperation = 'lighter';
    d.eyes.forEach(([x, y]) => {
      const cx = (x + 0.5) * S, cy = (y + 0.5) * S, rr = S * (1.6 + 0.3 * Math.sin(tick * 7));
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, 'rgba(255,220,140,0.9)'); gr.addColorStop(0.4, 'rgba(255,100,20,0.45)'); gr.addColorStop(1, 'rgba(255,40,10,0)');
      g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    });
    g.globalCompositeOperation = 'source-over';
    draw(true);
  });
  DOLL_FX.raf = requestAnimationFrame(dollFxFrame);
}

// ---------- Hlavní menu: výběr a tvorba postavy ----------

function showMenu() {
  if (Net.role || Net.peer) netLeave();
  G.scene = 'menu';
  hideModal();
  $('hud').hidden = true; $('menu').hidden = false;
  const chars = G.save.chars;
  $('menu-chars').innerHTML = chars.map((c, i) => `
    <div class="char-card ${i === G.save.current ? 'sel' : ''}" onclick="selectChar(${i})" ondblclick="playChar(${i})">
      <canvas width="64" height="64" data-race="${c.race}" data-cls="${c.cls}"></canvas>
      <div><b>${c.name}</b><div class="muted small">${RACES[c.race].name} – ${CLASSES[c.cls].name}</div>
      <div class="small">Úroveň ${c.level} · podzemí ${c.maxRift}</div></div>
      <button class="ghost del" onclick="event.stopPropagation();deleteChar(${i})" aria-label="Smazat">✕</button>
    </div>`).join('') || '<p class="muted">Zatím nemáš žádnou postavu.</p><button class="menu-empty-xfer" onclick="showTransfer()">⇄ Přenést postavy z jiného zařízení</button>';
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
      <canvas width="48" height="48" data-race="${id}" data-cls="${n.cls}"></canvas><div class="pc-name">${RACES[id].name}</div><div class="pc-desc"><b>${RACES[id].trait}:</b> ${RACES[id].desc}</div>
      <div class="pc-specs">${RACE_TALENTS[id].icon} ${SKILLS[RACE_TALENTS[id].nodes.R1.skill].name}</div></button>`).join('');
  const classes = Object.keys(CLASSES).map(id => { const c = CLASSES[id], ok = raceAllows(n.race, id);
    return `<button class="pick-card ${n.cls === id ? 'sel' : ''} ${ok ? '' : 'locked'}" ${ok ? `onclick="UI.newChar.cls='${id}';showCreate()"` : 'disabled'}
      ${ok ? '' : `data-tip="${RACES[n.race].name} nemůže být ${c.name.toLowerCase()}"`}>
      <span class="swatch" style="background:${c.colors[0]}"></span><div class="pc-name">${c.name}</div><div class="pc-desc">${c.desc}<br><b>${c.trait.name}:</b> ${c.trait.desc}</div>
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
      <p class="muted small" style="margin:-4px 0 4px;text-align:center">${G.rift.done ? 'Podzemí je dokončené.' : 'Rozehrané podzemí propadne.'} Pohyb nebo útok teleport přeruší.</p>` : ''}
    <button onclick="closeMenu()">Pokračovat</button>
    <button onclick="showNetModal()">👥 Hrát s přáteli${Net.role ? ` (místnost ${Net.code})` : ''}</button>
    <button onclick="showCharacter()">Postava a batoh (I)</button>
    <button onclick="showTalents()">Talenty a dovednosti (K)</button>
    <button onclick="showLegend()">Legenda a ovládání</button>
    <button onclick="showSettings()">Nastavení</button>
    <button onclick="confirmToMenu()">Výběr postavy</button>
  </div>`);
}

function confirmToMenu() {
  askConfirm('Odejít na výběr postav?' + (G.scene === 'rift' ? ' Rozehrané podzemí propadne.' : ''), 'Odejít', () => { persist(); showMenu(); });
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
    lines += `<div class="set-name" style="color:${s.color}"><span class="setb inl" style="--s:${s.color}">${giIcon(s.glyph, 'bi')}</span>${s.name} (${have}/6)${s.mythic ? ' · 3 díly: planoucí oči, 6 dílů: hořící postava' : ''}</div>` + Object.keys(s.bonus).map(n =>
      `<div class="set-b ${have >= +n ? 'on' : ''}">(${n}) ${Object.keys(s.bonus[n]).map(k => statLine(k, s.bonus[n][k])).join(', ')}</div>`).join('');
  }
  const durTxt = it.dur !== undefined ? `<div class="dur ${broken ? 'broken' : it.dur < it.maxDur * 0.25 ? 'low' : ''}">Odolnost ${it.dur}/${it.maxDur}${broken ? ' – rozbitý, nedává staty' : ''}</div>` : '';
  const only = itemClasses(it), usable = canClassUse(it, G.char.cls);
  const cant = only ? `<div class="cls-only ${usable ? '' : 'broken'}">Pouze: ${only.map(c => CLASSES[c].name).join(', ')}</div>`
    : !usable ? `<div class="broken">Nevhodné pro třídu ${CLASSES[G.char.cls].name}</div>` : '';
  return `<div class="item ${broken ? 'is-broken' : ''}" style="border-color:${r.color}">
    <div class="item-head"><b style="color:${r.color}">${it.name}</b><span class="muted small">${r.name} · ${kindLabel(it)} · úr. ${it.ilvl}</span>${(e => e ? `<span class="ench-line" style="color:${ENCHANTS[e].color}"><span class="ench inl" style="--e:${ENCHANTS[e].color}">${giIcon('ench_' + e, 'bi')}</span>Očarování: ${ENCHANTS[e].name}</span>` : '')(itemEnchant(it))}</div>
    <div class="item-stats">${lines}${durTxt}${cant}</div>${actions || ''}</div>`;
}

// ---------- Ikony předmětů (vektorové, styl C1: bílá ikona, dlaždice podle rarity) ----------
const SLOT_GI = { sword: 'sword', shield: 'shield', helm: 'helm', amulet: 'amulet', cloak: 'cloak', chest: 'plate', gloves: 'gloves', legs: 'pants', boots: 'boots', ring: 'ring' };
function giIcon(key, cls) { return `<svg class="${cls || 'ii'}" viewBox="0 0 512 512" aria-hidden="true">${ITEM_GI[key] || ITEM_GI.ring}</svg>`; }
let mfireSeq = 0;
// Animovaný ohnivý prstenec mýtického předmětu (varianta E2)
function mythicFire() {
  const id = 'mf' + (mfireSeq++), sd = 3 + (mfireSeq % 7), d = (3 + mfireSeq % 3);
  return `<svg class="mfire" viewBox="0 0 64 64" aria-hidden="true"><defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="${sd}"><animate attributeName="baseFrequency" dur="${d}s" values="0.07;0.095;0.07" repeatCount="indefinite"/></feTurbulence>
    <feDisplacementMap in="SourceGraphic" scale="14"><animate attributeName="scale" dur="1.7s" values="11;16;11" repeatCount="indefinite"/></feDisplacementMap><feGaussianBlur stdDeviation="0.6"/></filter></defs>
    <g filter="url(#${id})"><circle cx="32" cy="32" r="29" fill="url(#mfire-grad)"><animate attributeName="opacity" dur="0.9s" values="1;.82;.95;1" repeatCount="indefinite"/></circle></g></svg>`;
}
// Vnitřek políčka: ikona + znak setu (vlevo nahoře) + znak očarování (vpravo dole) + oheň u mýtických
function itemTileInner(it) {
  const S = it.set && SETS[it.set], e = itemEnchant(it);
  return (it.rarity === 'mythic' ? mythicFire() : '') + giIcon(it.type) +
    (S ? `<span class="setb" style="--s:${S.color}" data-tip="${S.name}">${giIcon(S.glyph, 'bi')}</span>` : '') +
    (e ? `<span class="ench" style="--e:${ENCHANTS[e].color}" data-tip="Očarování: ${ENCHANTS[e].name}">${giIcon('ench_' + e, 'bi')}</span>` : '');
}
function rarClass(it) { return `rar r-${it.rarity}`; }
function miniTile(it) { return `<span class="mini ${rarClass(it)}" style="--c:${RARITIES[it.rarity].color}">${it.rarity === 'mythic' ? mythicFire() : ''}${giIcon(it.type)}</span>`; }

function iconCell(it, slotIcon, src, selected, label, extra = '') {
  const broken = it && it.dur === 0;
  return `<div class="cell ${it ? rarClass(it) : 'empty'} ${selected ? 'sel' : ''} ${broken ? 'is-broken' : ''}" style="${it ? `--c:${RARITIES[it.rarity].color}` : ''}" data-src="${src}" ${extra}>
    ${it ? itemTileInner(it) : giIcon(SLOT_GI[slotIcon] || 'ring', 'ii mono')}
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

// Rysy rasy a třídy a právě aktivní efekty (buffy, postihy) s popisem – v okně postavy
function effectsHtml(st) {
  const ch = G.char, R = RACES[ch.race], C = CLASSES[ch.cls];
  const rows = [
    { name: `Rys rasy: ${R.trait}`, icon: `<span class="bf-i">${giSvg(RACE_KEY_ICONS[ch.race].K1, '#e0c080')}</span>`, desc: R.desc, time: 'trvale' },
    { name: `Rys třídy: ${C.trait.name}`, icon: `<span class="bf-i">${skillIcon(C.base[0])}</span>`, desc: C.trait.desc, time: 'trvale' }
  ].concat(G.hero ? heroEffects(G.hero, st) : []);
  return `<div class="effects"><h4>Efekty</h4>${rows.map(e => `<div class="eff ${e.bad ? 'bad' : ''}">${e.icon}<div><b>${e.name}</b><br><span class="muted">${e.desc}</span></div><span class="t">${e.time || ''}</span></div>`).join('')}</div>`;
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
    <div class="xpline">Úroveň <b>${ch.level}</b> · ${fmt(ch.xp)} / ${fmt(need)} XP · nejvyšší podzemí <b>${ch.maxRift}</b></div>
    <div class="traits small"><span data-tip="${RACES[ch.race].desc}">${RACES[ch.race].name}: <b>${RACES[ch.race].trait}</b></span> · <span data-tip="${CLASSES[ch.cls].trait.desc}">${CLASSES[ch.cls].name}: <b>${CLASSES[ch.cls].trait.name}</b></span></div>`;
  const C = CLASSES[ch.cls], caster = isCasterClass(ch.cls);
  const regenTxt = st.resRegen > 0 ? `+${st.resRegen.toFixed(1).replace('.', ',')} / s` : `útoky +${P(st.genMul - 1)}`;
  const basic = statRows([
    caster ? ['Rychlost sesílání', `${(st.spd * st.castMul).toFixed(2)} / s`, 'Kolikrát za sekundu sešleš základní kouzlo.']
           : ['Rychlost útoku', `${(st.spd * st.wpnSpdMul).toFixed(2)} / s`],
    [C.res.name, `max ${fmt(st.resMax)} · ${st.resRegen > 0 ? regenTxt : 'generují útoky'}`, st.resRegen > 0 ? 'Maximum a obnova za sekundu. Obnovu zrychluje Moudrost.' : 'Zuřivost generují útoky a sama klesá. Moudrost zrychluje generování.'],
    ['Kritická šance', P(st.crit)], ['Kritické poškození', `×${st.critMult.toFixed(2)}`],
    ['Rychlost pohybu', P(st.moveSpeed / 64), 'Závisí na rase (trpaslík pomalý, elf rychlý), botách a talentech.'],
    st.barrier && ['Arkánní bariéra', fmt(st.maxHp * st.barrier), 'Pohltí poškození, obnoví se po 5 s bez zásahu.'],
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
  return main + `<div class="srows">${basic}</div>${effectsHtml(st)}
    <button class="ghost small-btn" onclick="UI.detail=!UI.detail;showCharacter()">${UI.detail ? 'Skrýt detail ▴' : 'Detail ▾'}</button>
    <div class="srows">${detail}</div>`;
}

function dollHtml(sel) {
  const ch = G.char, st = heroStats();
  const slot = s => iconCell(ch.equip[s], EQUIP_SLOTS[s].icon, `eq:${s}`, sel === `eq:${s}`, EQUIP_SLOTS[s].name, `data-drop="eq:${s}"`);
  const twoH = ch.equip.main && itemHand(ch.equip.main) === 2 && !ch.equip.off && !(st.titanGrip && TITAN_GRIP_TYPES.includes(ch.equip.main.type));
  const offCell = twoH ? `<div class="cell ghost-2h" data-drop="eq:off" data-tip="Obouruční zbraň zabírá obě ruce.">${giIcon(ch.equip.main.type, 'ii mono')}<span class="cell-label">Levá ruka</span></div>` : slot('off');
  return `<div class="doll">
    <div class="doll-col">${['head', 'neck', 'cloak', 'chest', 'gloves'].map(slot).join('')}</div>
    <div class="doll-mid"><canvas width="128" height="128" data-race="${ch.race}" data-cls="${ch.cls}" data-fx="${mythicPieces(ch)}" class="doll-hero"></canvas>
      <div class="doll-hands">${slot('main')}${offCell}</div></div>
    <div class="doll-col">${['ring1', 'ring2', 'legs', 'boots'].map(slot).join('')}</div></div>`;
}

function showCharacter() {
  const ch = G.char, st = heroStats();
  if (UI.sel && !itemBySrc(UI.sel)) UI.sel = null;
  const R = RACES[ch.race], C = CLASSES[ch.cls];
  const raceTip = `${R.name} – ${R.trait}: ${R.desc} Rasová dovednost: ${SKILLS[RACE_TALENTS[ch.race].nodes.R1.skill].name} (strom Rasa v Talentech).`;
  const clsTip = `${C.name} – ${C.trait.name}: ${C.trait.desc}`;
  showModal(`<h2>${ch.name} <span class="char-chip" data-tip="${raceTip}">${R.name}</span><span class="char-chip" data-tip="${clsTip}">${C.name}</span></h2>
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
  const V = vendorState(), L = G.char.maxRift, chn = vendorChances(V.lvl, L), maxed = V.lvl >= VENDOR.upMax;
  const pc = v => (v * 100).toFixed(1).replace('.', ',') + ' %';
  const odds = [['purple', 'epické'], ['orange', 'legendární'], ['diamond', 'diamantové']].filter(([r]) => chn[r] > 0)
    .map(([r, n]) => `<span style="color:${RARITIES[r].color}">${n} ${pc(chn[r])}</span>`).join(' · ');
  const rc = vendorRerollCost(), uc = maxed ? 0 : vendorUpgradeCost();
  showModal(`<h2>Obchodník <span class="muted small">zboží pro třídu ${CLASSES[G.char.cls].name}, úroveň podzemí ${L}</span></h2>
    <p>Máš <b class="gold">${fmt(G.save.gold)} ●</b>. Nové zboží po každém dokončeném podzemí.</p>
    <div class="two-bags">
      <div><div class="bag-head"><b>Zboží</b> <span class="muted small">obchodník úr. ${V.lvl}/${VENDOR.upMax}</span></div>
        <div class="bag shop" data-drop="sell">${cells || '<p class="muted small">Vyprodáno.</p>'}</div>
        ${odds ? `<div class="vendor-odds small">${odds}</div>` : ''}
        <div class="bag-actions">
          <button ${G.save.gold < rc ? 'class="cant"' : ''} onclick="vendorReroll();UI.sel=null;showVendor()">Obnovit zboží ${fmt(rc)} ${GI}</button>
          ${maxed ? '<span class="muted small">Obchodník je na nejvyšší úrovni</span>'
            : `<button ${G.save.gold < uc ? 'class="cant"' : ''} title="Další úroveň: +0,5 % epické, +0,3 % legendární, +0,1 % diamantové (od podzemí 16)" onclick="vendorUpgrade();UI.sel=null;showVendor()">Vylepšit obchodníka ${fmt(uc)} ${GI}</button>`}
        </div>
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
    return `<div class="smith-row">${miniTile(it)}
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
  const ch = G.char, max = ch.maxRift, done = max - 1;
  // družina je v podzemí hostitele → jen návrat k ní
  if (Net.role === 'guest' && Net.hostScene === 'rift') {
    showModal(`<h2>Obelisk podzemí</h2><p>Družina je v <b>Podzemí ${Net.hostLevel}</b>.</p>
      <div class="actions"><button class="primary" onclick="hideModal();netSend({ t: 'rejoin' })">Připojit se k družině</button><button onclick="closeMenu()">Zavřít</button></div>`, false, 'obelisk');
    return;
  }
  UI.riftSel = clamp(UI.riftSel || done || 1, 1, max);
  const row = (L, note, top) => `<button class="rift-row ${top ? 'top' : ''}" onclick="hideModal();riftGo(${L})">
      <b>Podzemí ${L}</b><span>${note} · <span class="${ch.level < recLevel(L) ? 'gap-bad' : ''}">doporučená úroveň ${recLevel(L)}</span></span><span class="loot">${riftLootText(L)}</span></button>`;
  const rows = [row(max, max > 1 ? 'Nejvyšší odemčené – posuň se dál' : 'První podzemí', true)];
  if (done >= 1) rows.push(row(done, 'Poslední dokončené'));
  const pick = max > 1 ? `<div class="rift-pick">
      <div class="rp-head">Libovolné dokončené podzemí</div>
      <div class="rp-ctl">
        <button onclick="riftSelStep(-10)">−10</button><button onclick="riftSelStep(-1)">−</button>
        <input id="rift-lvl" type="number" inputmode="numeric" min="1" max="${max}" value="${UI.riftSel}" oninput="riftSelSet(this.value)" onkeydown="if(event.key==='Enter'){hideModal();riftGo(UI.riftSel)}">
        <button onclick="riftSelStep(1)">+</button><button onclick="riftSelStep(10)">+10</button>
        <button class="primary" onclick="hideModal();riftGo(UI.riftSel)">${netLive() ? 'Navrhnout' : 'Vstoupit'}</button>
      </div>
      <div id="rift-info" class="rp-info">${riftInfoText(UI.riftSel)}</div></div>` : '';
  showModal(`<h2>Obelisk podzemí</h2>
    <p class="muted small">Zabíjej nepřátele, dokud se nenaplní ukazatel postupu. Pak se objeví strážce podzemí, náhodný boss. Po jeho porážce se odemkne další úroveň.
      Vyšší úroveň znamená silnější nepřátele, ale lepší kořist, víc zlata a zkušeností.</p>
    ${netLive() ? '<p class="net-note">Hraješ v družině: vybranou úroveň musí potvrdit ostatní hráči.</p>' : ''}
    <div class="rift-list">${rows.join('')}</div>
    ${pick}
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>`, true, 'obelisk');
}
// Vstup do podzemí: sólo hned, v družině návrh, který potvrdí ostatní
function riftGo(L) { if (netLive()) netPropose(L); else startRift(L); }
function riftLootText(L) { return `Kořist +${Math.round(riftMf(L) * 100)} %, předměty úr. ${riftIlvl(L)}`; }
function riftInfoText(L) {
  const rec = recLevel(L), lvl = G.char ? G.char.level : rec, d = rec - lvl, g = levelGapMul(L, lvl);
  const gap = d > 0 ? `<span class="gap-bad">Jsi o ${d} ${d === 1 ? 'úroveň' : d < 5 ? 'úrovně' : 'úrovní'} níž: nepřátelé ti dávají ×${g.toFixed(g < 10 ? 2 : 0).replace('.', ',')} poškození a ty jim ×${(1 / g).toFixed(2).replace('.', ',')}.</span>`
    : d < 0 ? `<span class="gap-ok">Máš o ${-d} víc – nepřátelé jsou o ${Math.round((1 - g) * 100)} % slabší.</span>` : '';
  return `Doporučená úroveň <b>${rec}</b> ${gap}<br>Nepřátelé: život ×${fmtBig(riftHpMul(L))}, poškození ×${fmtBig(riftAtkMul(L))} · <span class="loot">${riftLootText(L)}</span>`;
}
function riftSelSet(v, fromStep) {
  const n = parseInt(v, 10);
  if (!isFinite(n)) return;
  UI.riftSel = clamp(n, 1, G.char.maxRift);
  const inp = $('rift-lvl'), info = $('rift-info');
  if (inp && (fromStep || String(UI.riftSel) !== inp.value)) inp.value = UI.riftSel;
  if (info) info.innerHTML = riftInfoText(UI.riftSel);
}
function riftSelStep(d) { riftSelSet(UI.riftSel + d, true); }

// ---------- Talenty a lišta dovedností ----------

function talentPointsFree() { const ch = G.char; return talentPointsTotal(ch.level) - talentsSpent(ch); }
const TALENT_TYPE = { skill: 'Dovednost', enh: 'Zesílení dovednosti', choice: 'Volba – vyber jednu ze dvou', passive: 'Pasivní bonus', key: 'Klíčová pasivka (v tomto stromu smíš mít jen jednu)', base: 'Výchozí dovednost' };

// ---- Návrh talentů: body se rozdělují nanečisto a uloží se až tlačítkem Potvrdit ----
function TD() { if (!UI.tDraft) UI.tDraft = Object.assign({}, G.char.talents); return UI.tDraft; }
function draftFree() { return talentPointsTotal(G.char.level) - talentsSpent({ cls: G.char.cls, race: G.char.race, talents: TD() }); }
function talentsDirty() { if (!UI.tDraft) return false; const a = UI.tDraft, b = G.char.talents; return Object.keys(Object.assign({}, a, b)).some(k => (a[k] || 0) !== (b[k] || 0)); }

// Lze přidat bod (u volby: zvolit danou možnost)?
function canLearn(n, opt) {
  const t = TD(), v = t[n.id] || 0;
  if (n.type === 'base') return false;
  if (n.type === 'choice' && v) return v !== opt && canSwitchChoice(n);
  if (draftFree() <= 0 || v >= n.max) return false;
  return talentStateValid(talentKey(G.char), Object.assign({}, t, { [n.id]: n.type === 'choice' ? (opt || 1) : v + 1 }));
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
  return talentStateValid(talentKey(G.char), t2);
}
// Proč uzel nejde naučit (text pro hráče)
function learnBlockReason(n) {
  const ch = G.char, t = TD(), tree = classTrees(talentKey(ch)).find(x => x.key === n.tree);
  if (draftFree() <= 0) return 'Nemáš volný bod – získáš ho za každou úroveň.';
  if (n.req.length && !n.req.some(r => { const p = nodeById(talentKey(ch), r); return p.type === 'base' || (t[r] || 0) > 0; }))
    return 'Nejdřív potřebuješ bod v: ' + n.req.map(r => nodeTitle(nodeById(talentKey(ch), r))).join(' nebo ') + '.';
  const need = gateFor(tree, n.row), below = tree.nodes.filter(x => x.row < n.row).reduce((s, x) => s + nodeSpent(x, t[x.id]), 0);
  if (below < need) return `Potřebuješ ${need} bodů ve vyšších řádcích tohoto stromu (máš ${below}).`;
  if (n.type === 'key') return 'V tomto stromu už máš jinou klíčovou pasivku (v každém stromu smí být jen jedna).';
  return '';
}
function nodeTitle(n) { return n.type === 'choice' ? n.opts.map(o => o.name).join(' / ') : n.name; }

// + : přidá bod do návrhu
function learnTalent(id, opt) {
  const n = nodeById(talentKey(G.char), id), t = TD();
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
  const n = nodeById(talentKey(G.char), id), t = TD();
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
  added.forEach(id => { if (!ch.bar.includes(id)) { const f = barFirstFree(ch); if (f >= 0) ch.bar[f] = id; } });
  normBar(ch);
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

// ---------- Lišta dovedností ----------
// Řádek má 8 pozic: [LMB, RMB, 1–6], další řádky po 8 (7, 8, 9, ⇧1 … ⇧9). Nový řádek se ukáže, až se zaplní všechny předchozí a zbývá dovednost.
const BAR_COLS = 8, BAR_MAX_ROWS = 3;
function barKey(i) { if (i === 0) return 'LMB'; if (i === 1) return 'RMB'; const n = i - 1; return n <= 9 ? String(n) : n <= 18 ? '⇧' + (n - 9) : ''; }
// index pozice pro číselnou klávesu (shift = druhá devítka)
function barIndexForKey(d, shift) { return (shift ? d + 9 : d) + 1; }
function barRows(ch) {
  const bar = ch.bar; let last = -1;
  bar.forEach((id, i) => { if (id) last = i; });
  let rows = Math.max(1, Math.floor(last / BAR_COLS) + 1);
  const full = r => { for (let i = 0; i < r * BAR_COLS; i++) if (!bar[i]) return false; return true; };
  if (rows < BAR_MAX_ROWS && full(rows) && knownSkills(ch).some(id => !bar.includes(id))) rows++;   // nový řádek jen když se další dovednost nevejde
  return rows;
}
// Délka lišty = počet zobrazených řádků × 8 (doplní prázdné, uřízne prázdné řádky navíc)
function normBar(ch) {
  const n = barRows(ch) * BAR_COLS;
  while (ch.bar.length < n) ch.bar.push(null);
  if (ch.bar.length > n) ch.bar.length = n;
  return ch.bar;
}
function barFirstFree(ch) { normBar(ch); return ch.bar.indexOf(null); }
function barSlotsHtml() {
  const bar = normBar(G.char), rows = bar.length / BAR_COLS;
  let h = '';
  for (let r = 0; r < rows; r++) h += `<div class="bar-row">${bar.slice(r * BAR_COLS, (r + 1) * BAR_COLS).map((id, j) => { const i = r * BAR_COLS + j;
    return `<div class="bar-slot ${id && UI.pickSkill === id ? 'sel' : ''}" data-bar="${i}" ${id ? `data-tip="${SKILLS[id].name}: ${SKILLS[id].desc}"` : ''}>
    ${id ? `<span class="sk-glyph">${skillIcon(id)}</span>` : ''}<span class="key">${barKey(i)}</span></div>`; }).join('')}</div>`;
  return h;
}

function refreshSkillWindows() { if (UI.modalKind === 'talents') showTalents(); else if (UI.modalKind === 'spellbook') showSpellbook(); }
function assignSkill(id, slot) {
  const bar = G.char.bar, old = bar.indexOf(id);
  if (old >= 0) bar[old] = bar[slot] || null;
  bar[slot] = id;
  UI.pickSkill = null;
  normBar(G.char);
  persist(); buildHud();
  refreshSkillWindows();
}
function removeFromBar(id) {
  const bar = G.char.bar, i = bar.indexOf(id);
  if (i >= 0) bar[i] = null;
  UI.pickSkill = null; normBar(G.char); persist(); buildHud(); refreshSkillWindows();
}

// ---------- Kniha dovedností ----------
function showSpellbook() {
  const ch = G.char; if (!ch) return;
  normBar(ch);
  const known = knownSkills(ch), base = CLASSES[ch.cls].base, pick = UI.pickSkill, touch = isTouchUi();
  const card = id => {
    const S = SKILLS[id], at = ch.bar.indexOf(id), info = skillInfo(id);
    return `<div class="sb-card ${pick === id ? 'sel' : ''}" data-skill="${id}" onclick="UI.pickSkill=UI.pickSkill==='${id}'?null:'${id}';showSpellbook()">
      <span class="sk-glyph">${skillIcon(id)}</span>
      <div class="sb-txt"><b>${S.name}</b>${at >= 0 ? `<span class="sb-on">${barKey(at)}</span>` : ''}
        <div class="muted small">${info || 'zdarma'}</div><div class="small sb-desc">${S.desc}</div></div></div>`;
  };
  const groups = [['Základní', known.filter(id => base.includes(id))], ['Z talentů', known.filter(id => !base.includes(id))]].filter(g => g[1].length);
  showModal(`<h2>Kniha dovedností</h2>
    <p class="muted small">${touch ? 'Klepni na dovednost a pak na místo na liště.' : 'Přetáhni dovednost na lištu, nebo na ni klikni a pak klikni na pozici.'} Nové dovednosti odemkneš v talentech.</p>
    ${groups.map(([t, ids]) => `<h4>${t}</h4><div class="sb-grid">${ids.map(card).join('')}</div>`).join('')}
    <h4>Lišta</h4>
    <div class="bar-edit sb-bar">${barSlotsHtml()}</div>
    <p class="muted small">${touch ? 'Na mobilu: LMB = velké tlačítko útoku, RMB a 1–3 vnitřní kruh, 4–8 vnější kruh.' : 'Když se lišta zaplní, přibude další řádek (klávesy 7–9, pak Shift + 1–9).'}</p>
    <div class="actions">${pick && ch.bar.includes(pick) ? `<button onclick="removeFromBar('${pick}')">Odebrat z lišty</button>` : ''}
      <button onclick="UI.pickSkill=null;showTalents()">Talenty (K)</button><button onclick="closeMenu()">Zavřít</button></div>`, true, 'spellbook');
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
  const ch = G.char, c = CLASSES[ch.cls], trees = classTrees(talentKey(ch)), T = TD(), free = draftFree(), dch = { cls: ch.cls, race: ch.race, talents: T };
  if (!UI.tTree || !trees.find(t => t.key === UI.tTree)) {
    const pts = trees.map(t => treePoints(dch, t.key));
    UI.tTree = trees[pts.slice(1).some(p => p > 0) ? 1 + pts.slice(1).indexOf(Math.max(...pts.slice(1))) : (pts[0] > 0 ? 0 : 1)].key;
  }
  const tree = trees.find(t => t.key === UI.tTree), tp = treePoints(dch, tree.key);
  const known = knownSkills(ch);
  const tabs = trees.map(t => `<button class="ttab ${t.key === UI.tTree ? 'sel' : ''}" onclick="UI.tTree='${t.key}';UI.tSel=null;showTalents()">
      <span class="ttab-ic">${t.icon}</span><span><b>${t.name}</b><small>${t.core ? 'Strom třídy' : t.isRace ? 'Rasa' : 'Specializace'} · ${treePoints(dch, t.key)} b.</small></span></button>`).join('');
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
      <div><div class="muted small">Lišta (myš / 1–9, Shift + 1–9) · <a href="#" onclick="event.preventDefault();showSpellbook()">Kniha dovedností (P)</a>:</div><div class="bar-edit">${barSlotsHtml()}</div></div>
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
  const routes = talentRoutes(talentKey(G.char), TD(), id);
  routes.forEach((r, i) => {
    r.nodes.forEach(x => (i === 0 ? out.anc : out.alt).add(x));
    routeEdges(r, id).forEach(e => (i === 0 ? out.main : out.altE).add(e));
  });
  out.desc = new Set(talentChildren(talentKey(G.char), id));
  return out;
}
function talentDetailHtml() {
  const ch = G.char;
  if (!UI.tSel) return `<div class="muted small">Vyber uzel ve stromu.</div>`;
  const [sid, so] = UI.tSel.split('#');
  const n = nodeById(talentKey(ch), sid);
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
    <p class="muted small">Hra se ukládá automaticky do tohoto prohlížeče. Na jiné zařízení (třeba do mobilu) přeneseš postavy krátkým kódem.</p>
    <button onclick="showTransfer()">⇄ Přenos postav</button>
    <div class="actions"><button onclick="closeMenu()">Zavřít</button></div>
    <p class="muted small">Verze ${GAME_VERSION}</p>`);
}
function doExport() {
  persist();
  const code = exportSave(G.save), n = code.length.toLocaleString('cs-CZ');
  $('save-code').value = code; $('save-code').select();
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast(`Kód zkopírován (${n} znaků)`), () => toast(`Zkopíruj kód z pole (${n} znaků)`));
  else toast(`Zkopíruj kód z pole (${n} znaků)`);
}
function doImport(text) {
  try { G.save = importSave(text !== undefined ? text : $('save-code').value); delete G.save._notice; persist(); showMenu(); toast('Uložení načteno'); }
  catch (e) {
    const n = (e.len || 0).toLocaleString('cs-CZ');
    toast(e.why === 'empty' ? 'Nejdřív vlož kód uložení'
      : e.why === 'migrate' ? `Kód je celý v pořádku, ale uložení se nepodařilo převést (${e.detail}). Pošli tuhle hlášku do chatu s Claudem.`
      : e.why === 'broken' ? `Kód je poškozený nebo neúplný (vloženo ${n} znaků). Porovnej s počtem znaků při kopírování, nebo použij přenos souborem.`
      : `Uložení se nepodařilo načíst (${e && e.message}). Pošli tuhle hlášku do chatu s Claudem.`);
  }
}
// Přenos souborem: nic ho cestou nepoškodí (pošli si ho e-mailem, přes Disk Google, kabelem…)
function doExportFile() {
  persist();
  const blob = new Blob([exportSave(G.save)], { type: 'text/plain' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `world-dungeons-ulozeni-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Soubor s uložením se stahuje');
}
function doImportFile(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => doImport(String(r.result || ''));
  r.onerror = () => toast('Soubor se nepodařilo přečíst');
  r.readAsText(f);
  input.value = '';
}

function showLegend() {
  const row = (a, b) => `<div class="lg-row"><span class="lg-ic">${a}</span><span>${b}</span></div>`;
  showModal(`<h2>Ovládání a legenda</h2>
    <p class="muted small">Ikony: <a href="https://game-icons.net" target="_blank" style="color:var(--soul)">game-icons.net</a> (Lorc, Delapouite a další), CC BY 3.0.</p>
    <h3>Počítač</h3>
    ${row('WASD / šipky', 'Pohyb.')}
    ${row('Levé tlačítko', 'Držení = základní útok směrem ke kurzoru. Klik na postavu ve městě = dojdi k ní a promluv s ní.')}
    ${row('Pravý klik na 1. slot', 'Zapne/vypne automatický základní útok (útočí ke kurzoru, když je nepřítel v dosahu).')}
    ${row('Pravé tlačítko', 'Dovednost ve slotu RMB na místo kurzoru.')}
    ${row('1 – 4', 'Dovednosti z lišty.')}
    ${row('Q', 'Lektvar léčení.')}${row('I / C', 'Postava a batoh.')}${row('K', 'Talenty a dovednosti.')}
    ${row('M / Tab', 'Velká mapa.')}${row('T', 'Teleport do města (5 s, pohyb ho přeruší).')}${row('Esc', 'Menu s teleportem do města.')}
    ${row('Město', 'Přijdi k obchodníkovi, kováři, truhle nebo obelisku a okno se otevře samo. Když dál držíš pohyb a odejdeš, zase se zavře.')}
    <h3>Mobil</h3>
    ${row('Joystick vlevo', 'Pohyb.')}${row('Automaticky', 'Základní útok sám míří na nejbližšího nepřítele v dosahu.')}${row('Velké tlačítko', 'Drž = dojdi k nejbližšímu nepříteli a útoč.')}${row('Kolečka', 'Dovednosti, lektvar a portál.')}
    <h3>Podzemí</h3>
    ${row('Ukazatel nahoře', 'Postup v podzemí. Elitní nepřátelé dávají víc. Na 100 % se objeví strážce podzemí.')}
    ${row('<span style="color:#ff3030">Červený kruh</span>', 'Varování: sem za chvíli dopadne útok. Uteč!')}
    ${row('<span style="color:#7aa0ff">Modré jméno</span>', 'Elitní nepřítel se schopnostmi, víc života, lepší kořist.')}
    ${row('<span style="color:#ff5050">●</span>', 'Koule zdraví: seber ji a vyléčíš se.')}
    ${row('<span style="color:#4a7aff">●</span>', 'Lahvička many: doplní 25 % many nebo jiného zdroje (válečníkovi zuřivost).')}
    ${row('⚔', 'V boji (útočí na tebe a ještě 4 s potom) se život i mana obnovují jen na 25 %, mimo boj na 150 %.')}
    ${Object.values(SHRINES).map(S => row(`<span style="color:${S.color}">${S.glyph}</span>`, `<b>${S.name}</b>: ${S.desc}`)).join('')}
    <h3>Bossové</h3>
    ${row('Fáze', 'Na 66 % a 33 % života boss zařve a spustí svou mechaniku.')}
    ${row('<span style="color:#ffe060">Vyčerpaný</span>', 'Po velkém útoku, rozbití štítu nebo přerušení chvíli stojí a dostává +50 % poškození.')}
    ${row('Ukazatel nad bossem', 'Sesílá kouzlo: přeruš ho omráčením, zmrazením nebo rychlým poškozením, nebo uteč z červeného kruhu.')}
    ${row('<span style="color:#ffc060">Zlatý kruh</span>', 'Bezpečné místo před velkým útokem.')}
    ${row('Běsnění', 'Po 2 minutách boss útočí rychleji a silněji.')}
    ${Object.values(BOSSES).map(B => row(`<b>${B.name}</b>`, B.desc)).join('')}
    <h3>Elementy</h3>${Object.keys(ELEMENTS).map(k => row(`<span style="color:${ELEMENTS[k].color}">${ELEMENTS[k].icon}</span>`, `<b>${ELEMENTS[k].name}</b>${k === 'phys' ? ' – tlumí ho zbroj' : k === 'chaos' ? ' – ignoruje zbroj i odolnosti' : ''}`)).join('')}
    <h3>Rarity</h3>${RARITY_ORDER.map(r => row(`<span style="color:${RARITIES[r].color}">■</span>`, `<b style="color:${RARITIES[r].color}">${RARITIES[r].name}</b> – od podzemí ${RARITIES[r].minRift}${r === 'mythic' ? ', jen z bossů (1 %), díly třídních setů: 3 díly = planoucí oči, 6 = hořící postava' : r === 'orange' || r === 'diamond' ? ', jen pro určité třídy' : ''}`)).join('')}
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
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]') && !(UI.tipPin > Date.now())) tip.hidden = true; });
  // dotyk: klepnutí na buff nebo štítek rasy/třídy ukáže popis na 4 s
  document.addEventListener('click', e => {
    const el = e.target.closest('#buffs [data-tip], .char-chip[data-tip], .traits [data-tip]');
    if (!el) return;
    const touch = G.touch || matchMedia('(pointer: coarse)').matches;
    setTimeout(() => show(el), 0); clearTimeout(UI.tipT);
    if (touch) { UI.tipPin = Date.now() + 4000; UI.tipT = setTimeout(() => { tip.hidden = true; }, 4000); }
  });
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
    if (down.skill && e.pointerType === 'touch' && cell.classList.contains('sb-card')) { down = null; return; }   // v knize na mobilu: klepnutí, ne tažení (aby šlo okno posouvat)
    if (down.src && !itemBySrc(down.src)) down = null;
  });
  document.addEventListener('pointermove', e => {
    if (!down) return;
    if (!drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      itip.hidden = true; $('tip').hidden = true;
      const ghost = document.createElement('div'); ghost.className = 'drag-ghost';
      if (down.src) {
        const it = itemBySrc(down.src);
        ghost.innerHTML = `<div class="cell ${rarClass(it)}" style="--c:${RARITIES[it.rarity].color}">${itemTileInner(it)}</div>`;
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
      if (d.skill) { const slot = el && el.closest('[data-bar]'); if (slot) assignSkill(d.skill, +slot.dataset.bar); else refreshSkillWindows(); return; }
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
    if (!slot) return;
    const i = +slot.dataset.bar, id = G.char.bar[i];
    if (UI.pickSkill) assignSkill(UI.pickSkill, i);
    else if (id) { UI.pickSkill = id; refreshSkillWindows(); }   // klik na obsazenou pozici = vezmi dovednost a přesuň ji jinam
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
  $('menu-xfer').onclick = () => showTransfer();
  $('menu-fs').onclick = () => toggleFullscreen();
}
