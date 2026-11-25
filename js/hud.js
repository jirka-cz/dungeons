// HUD: koule života a zdroje, lišta dovedností, XP, postup riftu, strážce, kořist; mobilní joystick a tlačítka.

function isTouchUi() { return G.touch || window.matchMedia('(pointer: coarse)').matches; }

function buildHud() {
  const ch = G.char;
  if (!ch) return;
  const res = CLASSES[ch.cls].res;
  $('res-orb').style.setProperty('--res', res.color);
  $('res-name').textContent = res.name;
  $('action-bar').innerHTML = ch.bar.map((id, i) => `
    <div class="ab-slot${i === 0 && G.save.settings.autoAttack ? ' auto' : ''}" data-slot="${i}" ${id ? `data-tip="${SKILLS[id].name}: ${SKILLS[id].desc}${i === 0 ? ' (pravým klikem zapneš/vypneš automatický útok)' : ''}"` : 'data-tip="Prázdný slot – přiřaď dovednost v Talentech (K)"'}>
      ${id ? `<span class="sk-glyph">${skillIcon(id)}</span>` : ''}
      <div class="ab-cd"></div><span class="ab-cdt"></span><span class="key">${BAR_KEYS[i]}</span></div>`).join('') +
    `<div class="ab-slot potion" data-slot="potion" data-tip="Lektvar léčení (Q): doplní ${Math.round(POTION_HEAL * 100)} % života."><span class="sk-glyph">${giSvg('round-potion', '#ff5050')}</span><div class="ab-cd"></div><span class="ab-cdt"></span><span class="key">Q</span></div>`;
  // dotyková tlačítka
  // rozložení kolem velkého tlačítka útoku (jako Diablo Immortal): [úhel, poloměr]
  const pos = [[188, 96], [154, 96], [120, 96], [88, 100], [138, 160]];
  const k = Math.max(0.68, Math.min(1, window.innerHeight / 460));   // nízký displej (mobil na šířku) = menší rozložení
  const place = ([ang, r], size) => { const a = ang * Math.PI / 180, R = r * k, S = size * k, c = 44 * k;
    return `right:${Math.round(c - Math.cos(a) * R - S / 2)}px;bottom:${Math.round(c + Math.sin(a) * R - S / 2)}px;width:${Math.round(S)}px;height:${Math.round(S)}px;font-size:${Math.round(S * 0.42)}px`; };
  $('tbtns').innerHTML = `<button class="tb attack" data-tb="0" style="width:${Math.round(88 * k)}px;height:${Math.round(88 * k)}px;font-size:${Math.round(38 * k)}px">${ch.bar[0] ? `<span class="sk-glyph">${skillIcon(ch.bar[0])}</span>` : '⚔'}</button>` +
    [1, 2, 3, 4, 5].map((i, k) => {
      const id = ch.bar[i];
      return `<button class="tb skill" data-tb="${i}" style="${place(pos[k], 52)}">
        ${id ? `<span class="sk-glyph">${skillIcon(id)}</span>` : ''}<div class="ab-cd"></div><span class="ab-cdt"></span></button>`;
    }).join('') +
    `<button class="tb small potion" data-tb="potion" style="${place([168, 172], 44)}">${giSvg('round-potion', '#ff5050')}<div class="ab-cd"></div></button>` +
    `<button class="tb small portal" data-tb="portal" style="${place([100, 165], 40)}">⌂</button>`;
  $('touch').hidden = !isTouchUi();
  document.body.classList.toggle('touch-ui', isTouchUi());
  $('action-bar').classList.toggle('touch-hidden', isTouchUi());
}

function buffIcon(b) {
  if (SKILL_ICONS[b.id]) return `<span class="bf-i">${skillIcon(b.id)}</span>`;
  const ex = EXTRA_ICONS[b.id] || EXTRA_ICONS[(b.id || '').replace('shrine_', '')];
  return ex ? `<span class="bf-i">${giSvg(ex, b.color)}</span>` : (b.glyph || '✦');
}

function onSceneChange() {
  buildHud();
  $('top-center').classList.toggle('town', G.scene === 'town');
  updateHud();
}

function updateHud() {
  const h = G.hero, st = G.st, ch = G.char;
  if (!h || !st) return;
  const hpP = Math.max(0, h.hp / st.maxHp), resP = Math.max(0, h.res / st.resMax);
  $('hp-fill').style.height = (hpP * 100) + '%';
  $('hp-txt').textContent = `${fmt(Math.max(0, h.hp))}`;
  $('res-fill').style.height = (resP * 100) + '%';
  $('res-txt').textContent = `${fmt(h.res)}`;
  $('xp-fill').style.width = (ch.level >= LEVEL_CAP ? 100 : ch.xp / xpToNext(ch.level) * 100) + '%';
  $('xp-txt').textContent = `Úroveň ${ch.level}`;
  $('hud-gold').textContent = fmt(G.save.gold);
  // lišta a dotyková tlačítka: cooldowny a nedostatek zdroje
  const cdOf = id => id ? Math.max(0, h.cds[id] || 0) : 0;
  const cdMax = id => id && SKILLS[id].cd ? SKILLS[id].cd : 1;
  const paint = (el, id, isPot) => {
    if (!el) return;
    const cd = isPot ? Math.max(0, h.potionCd) : cdOf(id), mx = isPot ? POTION_CD : cdMax(id);
    const ov = el.querySelector('.ab-cd'), tx = el.querySelector('.ab-cdt');
    if (ov) ov.style.height = (cd > 0 ? cd / mx * 100 : 0) + '%';
    if (tx) tx.textContent = cd > 0.05 ? Math.ceil(cd) : '';
    el.classList.toggle('nores', !isPot && !!id && skillCost(id) > h.res);
  };
  document.querySelectorAll('#action-bar .ab-slot').forEach(el => { const s = el.dataset.slot; paint(el, s === 'potion' ? null : ch.bar[+s], s === 'potion'); });
  document.querySelectorAll('#tbtns .tb').forEach(el => { const s = el.dataset.tb; if (s === 'portal') return; paint(el, s === 'potion' ? null : ch.bar[+s], s === 'potion'); });
  $('hb-tal').classList.toggle('has-points', talentPointsFree() > 0);
  // horní panel
  if (G.scene === 'rift') {
    const R = G.rift;
    $('area-name').textContent = `Rift ${R.level} · ${THEMES[R.theme].name}`;
    $('progress-wrap').hidden = false;
    $('progress-bar').style.width = riftProgressPct() + '%';
    $('progress-txt').textContent = R.done ? 'Dokončeno – vstup do portálu' : R.bossSpawned ? 'Strážce riftu!' : `${riftProgressPct()} %`;
    const b = R.boss;
    $('boss-wrap').hidden = !b;
    document.body.classList.toggle('boss-fight', !!b);
    if (b) {
      $('boss-name').textContent = b.name; $('boss-bar').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
      $('boss-shield').style.width = (b.shield > 0 ? Math.min(100, b.shield / b.maxHp * 100 * 3) : 0) + '%';
      $('boss-status').textContent = bossStatusText(b);
      const w = $('boss-wrap');
      w.classList.toggle('exposed', b.exposedT > 0); w.classList.toggle('immune', !!b.immune); w.classList.toggle('enraged', !!b.enraged);
    }
  } else {
    $('area-name').textContent = 'Městečko';
    $('progress-wrap').hidden = true; $('boss-wrap').hidden = true; document.body.classList.remove('boss-fight');
  }
  // buffy
  $('buffs').innerHTML = h.buffs.map(b => `<span class="buff" style="border-color:${b.color || '#888'}">${buffIcon(b)} ${b.t === Infinity ? '∞' : Math.ceil(b.t) + 's'}</span>`).join('');
  // kořist
  $('loot-log').innerHTML = G.lootLog.map(l => `<div style="opacity:${l.t > 6 ? (8 - l.t) / 2 : 1}"><span style="color:${l.color}">${l.name}</span> <span class="muted">${l.note}</span></div>`).join('');
  const bn = $('banner');
  if (G.banner) { bn.hidden = false; bn.textContent = G.banner.text; bn.style.borderColor = G.banner.color; bn.style.color = G.banner.color; }
  else bn.hidden = true;
  // varování: rozbitá výbava
  const broken = EQUIP_ORDER.some(s => ch.equip[s] && ch.equip[s].dur === 0);
  $('warn-broken').hidden = !broken;
}

// ---------- Dotykové ovládání ----------

function initTouch() {
  const zone = $('joy-zone'), base = $('joy-base'), knob = $('joy-knob');
  let joyId = null, ox = 0, oy = 0;
  zone.addEventListener('pointerdown', e => {
    G.touch = true; joyId = e.pointerId; ox = e.clientX; oy = e.clientY;
    base.style.left = (ox - 50) + 'px'; base.style.top = (oy - 50) + 'px'; base.classList.add('on');
    zone.setPointerCapture(e.pointerId);
    G.input.joy.on = true;
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const n = Math.min(1, d / max);
    G.input.joy.x = d > 6 ? dx / Math.max(1, Math.hypot(dx, dy)) * n : 0;
    G.input.joy.y = d > 6 ? dy / Math.max(1, Math.hypot(dx, dy)) * n : 0;
  });
  const end = e => {
    if (e.pointerId !== joyId) return;
    joyId = null; G.input.joy = { x: 0, y: 0, on: false };
    knob.style.transform = ''; base.classList.remove('on');
  };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

  const tb = $('tbtns');
  tb.addEventListener('pointerdown', e => {
    const b = e.target.closest('.tb');
    if (!b) return;
    e.preventDefault(); G.touch = true;
    const s = b.dataset.tb;
    if (s === '0') { G.input.atk = true; b.classList.add('down'); }
    else if (s === 'potion') usePotion();
    else if (s === 'portal') townPortal();
    else { useBarSlot(+s); b.classList.add('down'); b._hold = setInterval(() => useBarSlot(+s), 150); }
  });
  const up = e => {
    const b = e.target.closest('.tb');
    if (!b) return;
    if (b.dataset.tb === '0') G.input.atk = false;
    clearInterval(b._hold); b.classList.remove('down');
  };
  tb.addEventListener('pointerup', up); tb.addEventListener('pointercancel', up); tb.addEventListener('pointerleave', up, true);

  $('hb-char').onclick = showCharacter;
  $('hb-tal').onclick = showTalents;
  $('hb-menu').onclick = showGameMenu;
  $('hb-fs').onclick = () => toggleFullscreen();
  $('action-bar').addEventListener('contextmenu', e => {
    e.preventDefault();
    const s = e.target.closest('.ab-slot');
    if (!s || s.dataset.slot !== '0') return;
    G.save.settings.autoAttack = !G.save.settings.autoAttack; persist();
    s.classList.toggle('auto', G.save.settings.autoAttack);
    toast(G.save.settings.autoAttack ? 'Automatický útok zapnut' : 'Automatický útok vypnut – útoč držením levého tlačítka');
  });
  $('action-bar').addEventListener('click', e => { const s = e.target.closest('.ab-slot'); if (s && s.dataset.slot === 'potion') usePotion(); else if (s && !G.char.bar[+s.dataset.slot]) showTalents(); });
}
