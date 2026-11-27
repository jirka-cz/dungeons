// Hra více hráčů: místnost s kódem (PeerJS / WebRTC), společné město, výběr úrovně s hlasováním,
// společné podzemí (hostitel počítá hru, ostatní posílají vstup a dostávají stav), odměny do uložení každého hráče.
//
// Role: 'host' (založil místnost, u něj běží podzemí) nebo 'guest'. Město si každý počítá sám a vidí v něm
// ostatní hráče (G.heroes s h.ghost). V podzemí hostitel posílá hostům snímky stavu 15× za sekundu,
// hosté posílají svou polohu a kouzla. Vlastní pohyb hosta je okamžitý (rozhoduje o něm jeho hra).

const NET_MAX = 4;                   // max. hráčů v místnosti
const NET_PREFIX = 'wd-dungeons-';   // předpona ID místnosti na serveru PeerJS
const NET_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NET_SNAP_DT = 1 / 15, NET_IN_DT = 1 / 20, NET_POS_DT = 1 / 12;
const NET_VOTE_TIME = 30;            // s na odpověď na návrh úrovně
const NET_TIMEOUT = 20000;           // ms bez zprávy = spojení ztraceno
const NET_RANGE = 440;               // jak daleko od hosta se mu posílají nepřátelé a efekty
const COOP_DEAD_T = 6;               // v družině se čeká na oživení déle (spoluhráč tě oživí rychleji)
const COOP_REVIVE_T = 2;             // s stání u padlého spoluhráče = oživení na místě

const Net = {
  role: null, code: null, peer: null, myId: null,
  conn: null, hostSeen: 0, hostScene: 'town', hostLevel: 0,   // host
  mem: {},                                                      // hostitel: id → člen
  members: [],                                                  // seznam pro rozhraní: { id, name, race, cls, level, scene, host }
  clientRift: false,                                            // host právě hraje podzemí hostitele
  prop: null,                                                   // probíhající návrh úrovně
  fxBuf: [], fxRec: 0, snapIdx: 0,
  t: { in: 0, pos: 0, snap: 0, chr: 0 },
  lastCharSig: '', cache: {}, bbSent: null, bnSent: null
};

function netLive() { return !!Net.role && (Net.role === 'guest' || Object.keys(Net.mem).length > 0); }
function netIsHost() { return Net.role === 'host'; }
function netOpts() {
  const q = new URLSearchParams(location.search).get('peer');   // jen pro testy: ?peer=127.0.0.1:9000
  if (q) {
    const [host, port] = q.split(':'), o = { host, port: +port || 9000, path: '/', secure: false, debug: 0 };
    if (new URLSearchParams(location.search).get('noice')) o.config = { iceServers: [], iceTransportPolicy: 'relay' };   // test: přímé spojení selže
    return o;
  }
  return { debug: 0 };
}
function netCode() { let s = ''; for (let i = 0; i < 5; i++) s += NET_CODE_CHARS[Math.floor(Math.random() * NET_CODE_CHARS.length)]; return s; }
function netCharFor(ch) {
  return { id: ch.id, name: ch.name, race: ch.race, cls: ch.cls, level: ch.level, xp: ch.xp, talents: ch.talents, equip: ch.equip, bar: ch.bar,
           maxRift: ch.maxRift, recentBosses: ch.recentBosses || [], invN: ch.inv.length };
}
function netSelfInfo() { const c = G.char; return { id: Net.myId, name: c.name, race: c.race, cls: c.cls, level: c.level, scene: G.scene === 'rift' ? 'rift' : 'town', host: netIsHost() }; }

// ---------- Založení, připojení, odchod ----------

function netCreate() {
  if (Net.role) return;
  if (typeof Peer === 'undefined') { toast('Knihovna pro spojení se nenačetla.'); return; }
  if (G.scene !== 'town') { toast('Místnost můžeš založit jen ve městě.'); return; }
  const code = netCode();
  const peer = new Peer(NET_PREFIX + code, netOpts());
  Net.peer = peer; Net.code = code; Net.creating = true; Net.joinError = null;
  setTimeout(() => { if (Net.peer === peer && !Net.role) { netDestroy(); toast('Server pro spojení neodpovídá. Zkontroluj internet a zkus to znovu.'); netUi(); } }, 15000);
  peer.on('open', id => {
    Net.role = 'host'; Net.myId = id; Net.mem = {};
    netRefreshMembers(); toast(`Místnost ${code} je založená`); netUi();
  });
  peer.on('connection', conn => netHostAccept(conn));
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && !Net.role) { netDestroy(); netCreate(); return; }
    if (!Net.role) { netDestroy(); toast('Místnost se nepodařilo založit. Zkontroluj připojení k internetu.'); netUi(); }
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
}

// Připojení probíhá ve 3 krocích (Net.joinStage), aby bylo vidět, kde se zaseklo:
// 'server' = hledám místnost na serveru PeerJS, 'peer' = prohlížeče navazují přímé spojení, 'host' = čekám na odpověď hostitele
const NET_JOIN_STAGES = { server: 'Hledám místnost na serveru…', peer: 'Navazuji spojení s hostitelem…', host: 'Spojeno, čekám na hostitele…' };
function netJoin(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (Net.role || !code) return;
  if (typeof Peer === 'undefined') { toast('Knihovna pro spojení se nenačetla.'); return; }
  if (G.scene !== 'town') { toast('K místnosti se můžeš připojit jen ve městě.'); return; }
  const peer = new Peer(netOpts());
  Net.peer = peer; Net.code = code; Net.joining = true; Net.joinStage = 'server'; Net.joinError = null; netUi();
  const fail = why => { if (Net.peer !== peer || Net.role === 'guest') return; netJoinFail(why); };
  setTimeout(() => fail(Net.joinStage === 'server' ? 'server' : Net.joinStage === 'peer' ? 'ice' : 'host'), 20000);
  peer.on('open', id => {
    Net.myId = id; Net.joinStage = 'peer'; netUi();
    const conn = peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' });
    Net.conn = conn;
    conn.on('iceStateChanged', st => { if (st === 'failed' && Net.role !== 'guest') fail('ice'); });
    conn.on('open', () => { Net.joinStage = 'host'; netUi(); netRaw(conn, { t: 'hello', ver: GAME_VERSION, name: G.char.name, char: netCharFor(G.char), autoSell: G.save.settings.autoSell }); });
    conn.on('data', d => { Net.hostSeen = Date.now(); d = netUnchunk(conn, d); if (!d) return; try { netGuestMsg(d); } catch (e) { console.warn('Chybná zpráva od hostitele', e); } });
    conn.on('close', () => { if (Net.role === 'guest') netHostLost(); else fail(Net.joinStage === 'host' ? 'host' : 'ice'); });
    conn.on('error', () => { if (Net.role === 'guest') netHostLost(); else fail('ice'); });
  });
  peer.on('error', e => {
    if (Net.role === 'guest') { const inClient = Net.clientRift; netDestroy(); if (inClient) netToLocalTown(); toast('Spojení s hostitelem se přerušilo'); netUi(); return; }
    fail(e.type === 'peer-unavailable' ? 'nocode' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed' ? 'server' : 'other');
  });
}
const NET_JOIN_ERR = {
  nocode: c => `Místnost <b>${c}</b> neexistuje. Zkontroluj kód (hostitel musí mít místnost pořád otevřenou).`,
  server: () => 'Nepodařilo se spojit se serverem pro spojení. Zkontroluj internet (firemní síť nebo VPN může server blokovat).',
  ice: () => 'Místnost existuje, ale <b>přímé spojení mezi prohlížeči síť zablokovala</b>. Typicky firemní síť, VPN nebo přísný firewall. Zkus, ať jeden z vás použije mobilní data (nebo hotspot z mobilu) či domácí Wi-Fi.',
  host: () => 'Spojení vzniklo, ale hostitel neodpovídá. Má hostitel hru otevřenou na popředí a je ve městě?',
  other: () => 'Připojení se nepodařilo. Zkus to znovu.'
};
function netJoinFail(why) {
  const code = Net.code;
  netDestroy();
  Net.joinError = { why, code };
  if (UI.modalKind !== 'net') toast(NET_JOIN_ERR[why](code).replace(/<[^>]+>/g, ''));   // v otevřeném okně je hláška vidět přímo
  netUi();
}

function netLeave() {
  if (!Net.role && !Net.peer) return;
  if (netIsHost()) { netBroadcast({ t: 'closed' }); if (G.scene === 'rift') netEndRiftForGuests(); }
  else if (Net.conn) { try { Net.conn.send({ t: 'bye' }); } catch (e) {} }
  const inClient = Net.clientRift;
  setTimeout(netDestroy, 150);
  Net.role = null;
  netRemoveGhosts();
  if (inClient) netToLocalTown();
  toast('Opustil jsi místnost');
  netUi();
}

function netDestroy() {
  try { Object.values(Net.mem).forEach(m => m.conn.close()); } catch (e) {}
  try { if (Net.conn) Net.conn.close(); } catch (e) {}
  try { if (Net.peer) Net.peer.destroy(); } catch (e) {}
  Object.assign(Net, { role: null, peer: null, conn: null, mem: {}, members: [], prop: null, clientRift: false, joining: false, creating: false, code: null, cache: {} });
  netRemoveGhosts();
  if (G.scene === 'rift' && G.heroes.length > 1) G.heroes = G.heroes.filter(h => !h.netId);
}

function netHostLost() {
  if (Net.role !== 'guest' && !Net.joining) return;
  const inClient = Net.clientRift;
  netDestroy();
  if (inClient) netToLocalTown();
  toast('Spojení s hostitelem se přerušilo');
  netUi();
}

// ---------- Posílání ----------

// PeerJS odmítne zprávu delší než ~16 kB (a spojení spadne) – dlouhé zprávy se proto posílají po kouscích
const NET_CK = 5000;   // znaků v kousku (i s českými znaky bezpečně pod limitem)
let netCkId = 0;
function netRaw(conn, msg) {
  if (!conn || !conn.open) return;
  try {
    const s = JSON.stringify(msg);
    if (s.length <= NET_CK) { conn.send(msg); return; }
    const id = ++netCkId, n = Math.ceil(s.length / NET_CK);
    for (let i = 0; i < n; i++) conn.send({ t: 'ck', id, i, n, s: s.slice(i * NET_CK, (i + 1) * NET_CK) });
  } catch (e) { console.warn('Zprávu se nepodařilo odeslat', e); }
}
// Složí kousky zpět; vrátí celou zprávu, nebo null (čeká se na další kousky)
function netUnchunk(conn, d) {
  if (!d || d.t !== 'ck') return d;
  const B = conn.ckBuf || (conn.ckBuf = {}), b = B[d.id] || (B[d.id] = { n: d.n, parts: [], got: 0 });
  if (b.parts[d.i] === undefined) { b.parts[d.i] = d.s; b.got++; }
  if (b.got < b.n) return null;
  delete B[d.id];
  try { return JSON.parse(b.parts.join('')); } catch (e) { console.warn('Poškozená zpráva', e); return null; }
}
function netSendTo(id, msg) { const m = Net.mem[id]; if (m) netRaw(m.conn, msg); }
function netBroadcast(msg, except) { for (const id in Net.mem) if (id !== except) netSendTo(id, msg); }
function netSend(msg) { netRaw(Net.conn, msg); }

// ---------- Hostitel: příjem hostů ----------

function netHostAccept(conn) {
  toast('Někdo se připojuje…');
  conn.on('iceStateChanged', st => { if (st === 'failed' && !Net.mem[conn.peer]) toast('Připojení hráče se nezdařilo – síť blokuje přímé spojení (firemní síť, VPN?)'); });
  conn.on('data', d => { d = netUnchunk(conn, d); if (!d) return; try { netHostMsg(conn, d); } catch (e) { console.warn('Chybná zpráva od hráče', e); } });
  conn.on('close', () => netRemoveMember(conn.peer, 'odešel'));
  conn.on('error', () => netRemoveMember(conn.peer, 'odešel'));
}

function netHostMsg(conn, d) {
  const id = conn.peer, mb = Net.mem[id];
  if (mb) mb.seen = Date.now();
  switch (d.t) {
    case 'hello': {
      if (d.ver !== GAME_VERSION) { conn.send({ t: 'reject', why: `Máte různé verze hry (hostitel ${GAME_VERSION}, ty ${d.ver}). Obnovte stránku.` }); setTimeout(() => conn.close(), 300); return; }
      if (Object.keys(Net.mem).length + 1 >= NET_MAX) { conn.send({ t: 'reject', why: `Místnost je plná (max. ${NET_MAX} hráči).` }); setTimeout(() => conn.close(), 300); return; }
      Net.mem[id] = { id, conn, name: d.name, char: d.char, autoSell: d.autoSell || {}, in: null, casts: [], pot: false, hero: null, scene: 'town', seen: Date.now(),
                      save: { gold: 0, nextUid: 1e9, settings: { autoSell: d.autoSell || {} } }, sent: {}, fxq: [] };
      conn.send({ t: 'welcome', id, code: Net.code, hostScene: G.scene === 'rift' ? 'rift' : 'town', level: G.rift.level || 0 });
      netRefreshMembers();
      toast(`${d.name} se připojil`);
      return;
    }
    case 'char': if (mb) { mb.char = d.char; mb.autoSell = d.autoSell || mb.autoSell; mb.save.settings.autoSell = mb.autoSell; netApplyReplica(mb); netRefreshMembers(); } return;
    case 'in': if (mb) { const was = mb.scene; mb.in = d; mb.scene = d.scene; if (was !== d.scene) netRefreshMembers(); } return;
    case 'cast': if (mb && mb.hero) mb.casts.push(d); return;
    case 'pot': if (mb && mb.hero) mb.pot = true; return;
    case 'need': if (mb) (d.ids || []).forEach(n => { delete mb.sent[n]; }); return;
    case 'propose': netHostPropose(id, d.level); return;
    case 'vote': netHostVote(id, !!d.yes); return;
    case 'cancel': if (Net.prop && Net.prop.by === id) netHostPropEnd(false, 'cancel'); return;
    case 'town': if (mb) { netRemoveGuestHero(mb); mb.scene = 'town'; netRefreshMembers(); } return;
    case 'rejoin': if (mb && G.scene === 'rift' && !mb.hero) netAddGuestToRift(mb); return;
    case 'bye': netRemoveMember(id, 'odešel'); return;
  }
}

function netRemoveMember(id, why) {
  const mb = Net.mem[id];
  if (!mb) return;
  netRemoveGuestHero(mb);
  delete Net.mem[id];
  try { mb.conn.close(); } catch (e) {}
  if (Net.prop && (Net.prop.by === id || Net.prop.voters.includes(id))) netHostPropEnd(false, 'left', mb.name);
  netRemoveGhosts(id);
  netRefreshMembers();
  toast(`${mb.name} ${why}`);
}

function netRefreshMembers() {
  if (!netIsHost()) return;
  const list = [netSelfInfo()].concat(Object.values(Net.mem).map(m => ({ id: m.id, name: m.name, race: m.char.race, cls: m.char.cls, level: m.char.level, scene: m.scene, host: false })));
  Net.members = list;
  netBroadcast({ t: 'members', list, hostScene: G.scene === 'rift' ? 'rift' : 'town', level: G.rift.level || 0 });
  netUi();
}

// Náhradní postava hosta u hostitele (staty se počítají z jeho výbavy a talentů)
function netReplicaChar(mb) { return Object.assign({}, mb.char, { inv: new Array(mb.char.invN || 0).fill(null) }); }
function netApplyReplica(mb) {
  const h = mb.hero;
  if (!h) return;
  const keepInv = h.char.inv;
  const ch = netReplicaChar(mb);
  ch.inv = new Array(mb.char.invN || 0).fill(null);
  if (keepInv.length > ch.inv.length) ch.inv.length = keepInv.length;   // předměty sebrané od poslední zprávy
  h.char = ch; h.member.char = ch;
  withHero(h, () => { const before = G.st ? G.st.maxHp : 0; invalidate(); G.st = heroStats(); if (before) h.hp = Math.min(G.st.maxHp, h.hp * G.st.maxHp / before); });
}

// ---------- Hostitel: ovládání hrdiny hosta ----------

function netControlFor(mb) {
  return dt => {
    const h = G.hero, inp = mb.in;
    // když hrdinou pohnula hra (skok, výpad, hák, vír, oživení), chvíli rozhoduje o poloze hostitel
    if (h.netX !== undefined && (Math.abs(h.x - h.netX) > 0.5 || Math.abs(h.y - h.netY) > 0.5)) h.authT = G.time + 0.4;
    if (h.leap || h.dash || h.hooked || h.frozen > 0) h.authT = G.time + 0.4;
    if (inp && inp.scene === 'rift' && G.time > (h.authT || 0) && !h.dead) {
      if (!circleBlocked(G.world, inp.x, inp.y, 2)) { h.x = inp.x; h.y = inp.y; }
      if (inp.face) h.face = inp.face;
      h.walk = inp.walk ? (h.walk || 0) + dt : 0;
    }
    h.netX = h.x; h.netY = h.y;
    if (h.dead) { mb.casts.length = 0; mb.pot = false; return; }
    while (mb.casts.length) {
      const c = mb.casts.shift(), t = c.tid ? G.monsters.find(m => m.nid === c.tid) : null;
      if (!SKILLS[c.id] || !isFinite(c.tx) || !isFinite(c.ty)) continue;
      if (h.atkCd < 0.1) h.atkCd = 0;
      if (h.castLock < 0.1) h.castLock = 0;   // drobné zpoždění sítě nemá zahodit útok
      castSkill(c.id, c.tx, c.ty, t);
    }
    if (mb.pot) { mb.pot = false; usePotion(); }
  };
}

function netPartyMember(mb) {
  return { name: mb.name, char: netReplicaChar(mb), save: mb.save, control: netControlFor(mb), netId: mb.id };
}

// Hostitel spustí podzemí pro celou družinu (po hlasování)
function netHostStartRift(level) {
  const guests = Object.values(Net.mem);
  G.party = guests.map(netPartyMember);
  startRift(level);
  G.party = [];
  guests.forEach(mb => { mb.hero = G.heroes.find(h => h.netId === mb.id) || null; mb.scene = 'rift'; mb.casts = []; mb.sent = {}; mb.in = null; netSendRift(mb); });
  netRefreshMembers();
}

function netAddGuestToRift(mb) {
  const W = G.world;
  mb.hero = addPartyHero(netPartyMember(mb), W.spawn.x, W.spawn.y);
  mb.scene = 'rift'; mb.casts = []; mb.sent = {}; mb.in = null;
  netSendRift(mb);
  netRefreshMembers();
  toast(`${mb.name} se připojil do podzemí`);
}

function netSendRift(mb) {
  netSendTo(mb.id, { t: 'rift', level: G.rift.level, theme: G.rift.theme, world: netPackWorld(G.world), mul: G.partyMul, x: mb.hero.x, y: mb.hero.y });
}

function netRemoveGuestHero(mb) {
  if (!mb.hero) return;
  const i = G.heroes.indexOf(mb.hero);
  if (i >= 0 && G.scene === 'rift') G.heroes.splice(i, 1);
  mb.hero = null;
}

// Hostitel opouští podzemí → všichni do města
function netEndRiftForGuests() {
  Object.values(Net.mem).forEach(mb => { if (mb.hero || mb.scene === 'rift') { netSendTo(mb.id, { t: 'end' }); mb.hero = null; mb.scene = 'town'; } });
}

// ---------- Hlasování o úrovni ----------

function netPropose(level) {
  if (netIsHost()) netHostPropose(Net.myId, level);
  else netSend({ t: 'propose', level });
}
function netVote(yes) { if (netIsHost()) netHostVote(Net.myId, yes); else netSend({ t: 'vote', yes }); hideModal(); }
function netCancelProp() { if (netIsHost()) { if (Net.prop && Net.prop.by === Net.myId) netHostPropEnd(false, 'cancel'); } else netSend({ t: 'cancel' }); hideModal(); }

function netHostPropose(by, level) {
  const name = by === Net.myId ? G.char.name : (Net.mem[by] || {}).name;
  const reply = (msg) => by === Net.myId ? netGuestMsg(msg) : netSendTo(by, msg);
  if (G.scene !== 'town') return reply({ t: 'propEnd', ok: false, why: 'busy' });
  if (Net.prop) return reply({ t: 'propEnd', ok: false, why: 'other' });
  level = Math.max(1, Math.floor(+level || 1));
  const voters = [Net.myId].concat(Object.keys(Net.mem)).filter(id => id !== by);
  if (!voters.length) { netHostStartRift(level); return; }
  Net.prop = { by, name, level, voters, votes: {}, end: Date.now() + NET_VOTE_TIME * 1000 };
  const msg = { t: 'prop', by, name, level, voters, left: NET_VOTE_TIME };
  netBroadcast(msg); netGuestMsg(msg);
}

function netHostVote(id, yes) {
  const P = Net.prop;
  if (!P || !P.voters.includes(id)) return;
  P.votes[id] = yes;
  if (!yes) { netHostPropEnd(false, 'no', id === Net.myId ? G.char.name : Net.mem[id].name); return; }
  const st = { t: 'propState', votes: P.votes };
  netBroadcast(st); netGuestMsg(st);
  if (P.voters.every(v => P.votes[v])) { const L = P.level; netHostPropEnd(true); netHostStartRift(L); }
}

function netHostPropEnd(ok, why, who) {
  const P = Net.prop;
  if (!P) return;
  Net.prop = null;
  const msg = { t: 'propEnd', ok, why, who, level: P.level, by: P.by };
  netBroadcast(msg); netGuestMsg(msg);
}

function netNameOf(id) { const m = Net.members.find(x => x.id === id); return m ? m.name : '?'; }

function showVoteModal(p) {
  UI.vote = p;
  showModal(`<h2>Návrh podzemí</h2>
    <p><b>${p.name}</b> chce jít do <b>Podzemí ${p.level}</b>.</p>
    <p class="muted small">${riftInfoText(p.level)}</p>
    <p class="muted small">Tvoje nejvyšší odemčené: ${G.char.maxRift}</p>
    <div class="vote-time" id="vote-time"></div>
    <div class="actions"><button class="primary" onclick="netVote(true)">Přijmout</button><button class="danger" onclick="netVote(false)">Odmítnout</button></div>`, false, 'vote');
  netVoteTimer();
}
function showWaitModal(p) {
  UI.vote = p;
  const rows = p.voters.map(id => `<li>${netNameOf(id)}: <b id="vote-${id}">čeká se…</b></li>`).join('');
  showModal(`<h2>Podzemí ${p.level}</h2><p>Čeká se na potvrzení ostatních:</p><ul class="vote-list">${rows}</ul>
    <div class="vote-time" id="vote-time"></div>
    <div class="actions"><button onclick="netCancelProp()">Zrušit návrh</button></div>`, false, 'vote');
  netVoteTimer();
}
function netVoteTimer() {
  clearInterval(UI.voteTimer);
  const end = Date.now() + (UI.vote.left || NET_VOTE_TIME) * 1000;
  const tick = () => { const el = $('vote-time'); if (!el || UI.modalKind !== 'vote') { clearInterval(UI.voteTimer); return; } el.textContent = `Zbývá ${Math.max(0, Math.ceil((end - Date.now()) / 1000))} s`; };
  tick(); UI.voteTimer = setInterval(tick, 250);
}

// ---------- Host: zprávy od hostitele ----------

function netGuestMsg(d) {
  switch (d.t) {
    case 'welcome':
      Net.role = 'guest'; Net.joining = false; Net.joinError = null; Net.myId = d.id; Net.hostScene = d.hostScene; Net.hostLevel = d.level; Net.hostSeen = Date.now();
      toast(`Připojeno do místnosti ${d.code}`); netUi(); return;
    case 'reject': toast(d.why); netDestroy(); netUi(); return;
    case 'members':
      Net.members = d.list; Net.hostScene = d.hostScene; Net.hostLevel = d.level;
      netRemoveGhosts(null, d.list.map(m => m.id)); netUi(); return;
    case 'pos': if (G.scene === 'town' && !Net.clientRift) netSyncGhosts(d.list); return;
    case 'prop':
      if (d.by === Net.myId) showWaitModal(d);
      else if (d.voters.includes(Net.myId)) showVoteModal(d);
      return;
    case 'propState':
      Object.keys(d.votes).forEach(id => { const el = $('vote-' + id); if (el && d.votes[id]) { el.textContent = 'souhlasí'; el.className = 'ok'; } });
      return;
    case 'propEnd': {
      if (UI.modalKind === 'vote') hideModal();
      UI.vote = null;
      if (d.ok) return;
      const msg = d.why === 'no' ? `${d.who} odmítl Podzemí ${d.level}` : d.why === 'timeout' ? `Návrh vypršel – neodpověděl: ${d.who}` : d.why === 'cancel' ? 'Návrh byl zrušen'
        : d.why === 'left' ? `${d.who} odešel z místnosti` : d.why === 'busy' ? 'Družina je právě v podzemí' : 'Už běží jiný návrh';
      toast(msg); return;
    }
    case 'rift': netEnterClientRift(d); return;
    case 's': if (Net.clientRift) netApplySnap(d); return;
    case 'r': netApplyReward(d); return;
    case 'toast': toast(d.msg); return;
    case 'banner': G[d.key] = d.v; return;
    case 'end': if (Net.clientRift) { netToLocalTown(); toast('Družina se vrátila do města'); } return;
    case 'closed': { const inClient = Net.clientRift; netDestroy(); if (inClient) netToLocalTown(); toast('Hostitel zavřel místnost'); netUi(); return; }
  }
}

// ---------- Město: ostatní hráči jako „duchové“ (jen se vykreslují a plynule posouvají) ----------

function netSyncGhosts(list) {
  const seen = new Set();
  list.forEach(p => {
    if (p.id === Net.myId) return;
    seen.add(p.id);
    let g = G.heroes.find(h => h.ghost && h.netId === p.id);
    if (!g) {
      g = { ghost: true, netId: p.id, x: p.x, y: p.y, tx: p.x, ty: p.y, r: 5, z: 0, face: 1, walk: 0, buffs: [], cds: {}, hp: 1, atkAnim: 0, hitT: 0, invuln: 0,
            char: { name: p.name, race: p.race, cls: p.cls, level: p.level, talents: {}, equip: {} }, name: p.name };
      G.heroes.push(g);
    }
    g.tx = p.x; g.ty = p.y; g.face = p.face || g.face; g.moving = !!p.walk;
    g.char.level = p.level; g.char.race = p.race; g.char.cls = p.cls;
  });
  G.heroes = G.heroes.filter(h => !h.ghost || seen.has(h.netId));
}
function netGhostStep(h, dt) {
  const k = Math.min(1, dt * 12);
  if (Math.hypot(h.tx - h.x, h.ty - h.y) > 120) { h.x = h.tx; h.y = h.ty; }
  h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k;
  h.walk = h.moving ? h.walk + dt : 0;
}
function netRemoveGhosts(id, keepIds) {
  if (!G.heroes) return;
  G.heroes = G.heroes.filter(h => !h.ghost || (id ? h.netId !== id : keepIds ? keepIds.includes(h.netId) : false));
}

// ---------- Pravidelné odesílání (volá se z herní smyčky i když je otevřené okno) ----------

function netTick(dt) {
  if (!Net.role) return;
  const T = Net.t;
  if (netIsHost()) {
    const now = Date.now();
    Object.values(Net.mem).forEach(mb => { if (now - mb.seen > NET_TIMEOUT) netRemoveMember(mb.id, 'ztratil spojení'); });
    if ((T.mem = (T.mem || 0) - dt) <= 0) {   // úroveň a místo hráčů se mění – obnovit seznam, když se něco změnilo
      T.mem = 2;
      const sig = JSON.stringify([netSelfInfo()].concat(Object.values(Net.mem).map(m => [m.char.level, m.scene])));
      if (sig !== Net.memSig) { Net.memSig = sig; netRefreshMembers(); }
    }
    if (Net.prop && now > Net.prop.end) netHostPropEnd(false, 'timeout', Net.prop.voters.filter(v => !Net.prop.votes[v]).map(netNameOf).join(', '));
    // poloha hráčů ve městě
    if ((T.pos -= dt) <= 0) {
      T.pos = NET_POS_DT;
      const list = [];
      if (G.scene === 'town' && G.me) list.push(Object.assign(netSelfInfo(), { x: Math.round(G.me.x), y: Math.round(G.me.y), face: G.me.face, walk: G.me.walk > 0 }));
      Object.values(Net.mem).forEach(mb => { if (mb.scene === 'town' && mb.in && mb.in.scene === 'town') list.push({ id: mb.id, name: mb.name, race: mb.char.race, cls: mb.char.cls, level: mb.char.level, x: mb.in.x, y: mb.in.y, face: mb.in.face, walk: mb.in.walk }); });
      if (G.scene === 'town') netSyncGhosts(list);
      netBroadcast({ t: 'pos', list });
    }
    // snímky podzemí
    if (G.scene === 'rift' && (T.snap -= dt) <= 0) {
      T.snap = NET_SNAP_DT; Net.snapIdx++;
      Object.values(Net.mem).forEach(mb => { if (mb.hero && isHero(mb.hero)) netSendTo(mb.id, netBuildSnap(mb)); });
      Net.fxBuf = []; netAfterSnaps();
    }
  } else if (Net.role === 'guest') {
    if (Date.now() - Net.hostSeen > NET_TIMEOUT) { netHostLost(); return; }
    if ((T.in -= dt) <= 0 && G.me) {
      T.in = NET_IN_DT;
      const h = G.me;
      netSend({ t: 'in', x: Math.round(h.x * 10) / 10, y: Math.round(h.y * 10) / 10, face: h.face, walk: h.walk > 0, scene: Net.clientRift ? 'rift' : 'town' });
    }
    if ((T.chr -= dt) <= 0) {
      T.chr = 1;
      const c = netCharFor(G.char), sig = JSON.stringify([c.level, c.talents, c.equip, c.bar, c.maxRift, c.invN, G.save.settings.autoSell]);
      if (sig !== Net.lastCharSig) { Net.lastCharSig = sig; netSend({ t: 'char', char: c, autoSell: G.save.settings.autoSell }); }
    }
  }
}
// Spojení udržovat i v pozadí (karta prohlížeče v pozadí nevolá herní smyčku)
setInterval(() => {
  if (Net.role === 'guest') netSend({ t: 'in', x: G.me ? G.me.x : 0, y: G.me ? G.me.y : 0, face: 1, walk: false, scene: Net.clientRift ? 'rift' : 'town', ka: 1 });
  else if (netIsHost() && document.hidden) netBroadcast({ t: 'pos', list: [] });
}, 2000);

// ---------- Svět: zabalení a rozbalení mapy ----------

function netB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }
function netUnB64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function netPackWorld(W) { return { w: W.w, h: W.h, tiles: netB64(W.tiles), decor: W.decor, torches: W.torches, theme: W.theme, kind: W.kind, spawn: W.spawn, rooms: W.rooms || null }; }
function netUnpackWorld(p) {
  return { w: p.w, h: p.h, tiles: netUnB64(p.tiles), explored: new Uint8Array(p.w * p.h), decor: p.decor, torches: p.torches, npcs: [], theme: p.theme, kind: p.kind, spawn: p.spawn, rooms: p.rooms };
}

// ---------- Hostitel: snímek stavu pro jednoho hosta ----------

const NET_SKIP = new Set(['def', 'tgt', 'tgtT', 'owner', 'src', 'onFire', 'onHit', 'onDeath', 'tick', 'list', 'hits', 'member', 'control', 'path', 'char', 'save', 'st', 'mods', 'land', 'appear', 'done', 'brk', 'onHold', 'holdTick', 'S', 'hitSet', 'lastPool']);
function netSer(v, d = 3) {
  if (v === null || v === undefined) return v;
  const ty = typeof v;
  if (ty === 'function') return undefined;
  if (ty === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : (v > 0 ? 1e9 : -1e9);
  if (ty !== 'object') return v;
  if (v.kind === 'monster' || v.kind === 'pet' || v.netId !== undefined || G.heroes.includes(v)) return { ref: v.nid || 1, x: Math.round(v.x), y: Math.round(v.y), dead: !!v.dead };
  if (d <= 0 || v instanceof Set || v instanceof Map || ArrayBuffer.isView(v)) return undefined;
  if (Array.isArray(v)) return v.map(x => netSer(x, d - 1));
  const o = {};
  for (const k in v) { if (NET_SKIP.has(k)) continue; const s = netSer(v[k], d - 1); if (s !== undefined) o[k] = s; }
  return o;
}
const R1 = v => Math.round(v * 10) / 10;

function netMonSnap(m, mb) {
  if (m.boss || m.obj) { const o = netSer(m, 3); o.nid = m.nid; o.full = 1; return o; }
  const o = { n: m.nid, x: R1(m.x), y: R1(m.y), hp: Math.round(m.hp), f: m.face, w: m.walk > 0 && m.stunT <= 0 ? 1 : 0 };
  if (m.stunT > 0) o.st = m.stunKind === 'freeze' ? 2 : 1;
  if (m.slowT > 0) o.sl = 1;
  if (m.wind > 0) o.wi = 1;
  if (m.atkAnim > 0) o.aa = R1(m.atkAnim);
  if (m.knock > 0) o.kn = 1;
  if (m.fuse !== undefined) o.fu = 1;
  if (m.hitT > 0) o.ht = 1;
  if (m.z) o.z = R1(m.z);
  if (m.aggro) o.ag = 1;
  const dk = Object.values(m.dots).map(x => x.elem); if (dk.length) o.dt = dk;
  // stálé údaje jen poprvé (nebo když byl nepřítel chvíli mimo dosah)
  if (mb.sent[m.nid] !== Net.snapIdx - 1) Object.assign(o, { ty: m.type, sp: m.sprite, pal: m.pal, ti: m.tint || null, nm: m.name, sc: m.scale, r: m.r, fl: m.fly ? 1 : 0, bo: R1(m.bob), mh: m.maxHp, el: m.elite || null, mi: m.minion ? 1 : 0 });
  mb.sent[m.nid] = Net.snapIdx;
  return o;
}

function netHeroSnap(h) {
  const st = heroSt(h) || {};
  return { id: h.netId || Net.myId, x: R1(h.x), y: R1(h.y), f: h.face, w: h.walk > 0 ? 1 : 0, dead: h.dead ? 1 : 0, hp: Math.round(h.hp), mhp: Math.round(st.maxHp || 1),
           name: h.name || h.char.name, race: h.char.race, cls: h.char.cls, level: h.char.level,
           aa: R1(h.atkAnim || 0), ag: R1(h.atkAng || 0), ht: h.hitT > 0 ? 1 : 0, inv: h.invuln > 0 ? 1 : 0, fr: h.frozen > 0 ? 1 : 0, z: R1(h.z || 0), wh: h.whirl > 0 ? 1 : 0,
           hk: h.hooked && h.hooked.m ? h.hooked.m.nid : 0, cu: h.curse ? R1(h.curse.t) : 0, ch: h.channel > 0 ? R1(h.channel) : 0, rv: R1(h.revT || 0),
           bf: h.buffs.map(b => ({ id: b.id, form: b.form || null, color: b.color || null })) };
}

function netBuildSnap(mb) {
  const me = mb.hero, near = (o, extra = 0) => Math.abs(o.x - me.x) < NET_RANGE + extra && Math.abs(o.y - me.y) < NET_RANGE * 0.8 + extra;
  const R = G.rift, st = heroSt(me) || {};
  const s = {
    t: 's', i: Net.snapIdx,
    heroes: G.heroes.filter(h => !h.ghost).map(netHeroSnap),
    mons: G.monsters.concat(G.offstage).filter(m => !m.dead && near(m, m.boss ? 400 : 0)).map(m => netMonSnap(m, mb)),
    projs: G.projs.filter(p => near(p)).map(p => [R1(p.x), R1(p.y), R1(p.vx), R1(p.vy), Math.round(p.speed), p.size, p.color, p.arrow ? 1 : 0, p.friendly ? 1 : 0, p.chain && !p.chain.dead ? p.chain.nid : 0, p.trail ? 1 : 0]),
    haz: G.hazards.filter(z => near(z, (z.r || 0) + (z.len || 0) + (z.maxR || 0))).map(z => netSer(z, 3)),
    zones: G.zones.filter(z => near(z, z.r || 0)).map(z => netSer(z, 2)),
    traps: G.traps.filter(t => near(t)).map(t => netSer(t, 2)),
    pets: G.pets.filter(p => near(p)).map(p => ({ n: p.nid, ty: p.type, x: R1(p.x), y: R1(p.y), f: p.face, w: p.walk > 0 ? 1 : 0, aa: R1(p.atkAnim || 0) })),
    loot: G.loot.filter(l => (!l.owner || l.owner === me) && near(l)).map(l => ({ k: l.kind, x: R1(l.x), y: R1(l.y), t: R1(l.t), it: l.item || null })),
    decals: G.decals.filter(d => near(d, d.r || 0)).map(d => netSer(d, 2)),
    shrines: (G.shrines || []).map(x => ({ x: x.x, y: x.y, type: x.type, used: x.used })),
    portal: G.portal ? { x: G.portal.x, y: G.portal.y } : null,
    rift: { level: R.level, theme: R.theme, progress: R.progress, done: R.done, bs: R.bossSpawned, boss: R.boss && !R.boss.dead ? R.boss.nid : 0 },
    dark: R1(G.darkness),
    me: { hp: R1(me.hp), res: R1(me.res), dead: me.dead ? 1 : 0, dt: R1(me.deadT || 0), bf: netSer(me.buffs, 3), cds: netSer(me.cds, 1), pc: R1(me.potionCd || 0),
          fr: R1(me.frozen || 0), slT: R1(me.slowT || 0), slP: me.slowP || 0, inv: R1(me.invuln || 0), cu: me.curse ? R1(me.curse.t) : 0, hk: me.hooked && me.hooked.m ? me.hooked.m.nid : 0,
          wh: R1(me.whirl || 0), ch: R1(me.channel || 0), force: G.time < (me.authT || 0) ? 1 : 0, x: R1(me.x), y: R1(me.y), z: R1(me.z || 0), rv: R1(me.revT || 0), mhp: Math.round(st.maxHp || 1) },
    fx: Net.fxBuf.filter(e => e.x === undefined || near(e, 60)).map(e => e.a).concat(mb.fxq)
  };
  mb.fxq = [];
  if (G.bannerBig && G.bannerBig !== Net.bbSent) s.bb = G.bannerBig;
  if (G.banner && G.banner !== Net.bnSent) s.bn = G.banner;
  return s;
}
// banner se pošle jednou: po rozeslání snímků se poznamená
function netAfterSnaps() { Net.bbSent = G.bannerBig; Net.bnSent = G.banner; }

// ---------- Hostitel: záznam efektů pro hosty ----------

const NET_FX = ['burst', 'smoke', 'debris', 'vfx', 'floatText', 'shake'];
function netHookFx() {
  NET_FX.forEach(name => {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.netHooked) return;
    const f = function () {
      if (Net.fxRec === 0 && netIsHost() && G.scene === 'rift' && !Net.applying) {
        const a = [name].concat(Array.prototype.slice.call(arguments).map(x => netSer(x, 2)));
        const e = { a };
        if (typeof arguments[0] === 'number') { e.x = arguments[0]; e.y = arguments[1]; }
        else if (arguments[0] && typeof arguments[0].x === 'number') { e.x = arguments[0].x; e.y = arguments[0].y; }
        if (Net.fxBuf.length < 400) Net.fxBuf.push(e);
      }
      Net.fxRec++;
      try { return orig.apply(this, arguments); } finally { Net.fxRec--; }
    };
    f.netHooked = true;
    window[name] = f;
  });
}
// Zvuky: veřejné všem hostům, osobní (zlato, zranění…) jen tomu, koho se týkají
function netSfx(name, priv) {
  if (!netIsHost() || G.scene !== 'rift' || Net.applying) return;
  if (priv) { if (G.remoteCtx && G.hero && G.hero.netId && Net.mem[G.hero.netId]) Net.mem[G.hero.netId].fxq.push(['sfx', name]); return; }
  if (Net.fxBuf.length < 400) Net.fxBuf.push({ a: ['sfx', name] });
}
// Oznámení pro hosta (rozbitý předmět, plný batoh, úroveň…)
function netToastRemote(msg) { if (netIsHost() && G.hero && G.hero.netId) netSendTo(G.hero.netId, { t: 'toast', msg }); }
function personalBanner(key, v) {
  if (!G.remoteCtx) { G[key] = v; return; }
  if (netIsHost() && G.hero && G.hero.netId) netSendTo(G.hero.netId, { t: 'banner', key, v });
}
// Odměna pro hosta: zkušenosti, zlato, předmět, odemčená úroveň, odolnost předmětu
function netReward(r) {
  if (!netIsHost() || !G.hero || !G.hero.netId) return;
  r.t = 'r';
  netSendTo(G.hero.netId, r);
}

// ---------- Host: hra v podzemí hostitele ----------

function netEnterClientRift(d) {
  if (UI.modalKind) hideModal();
  resetEntities();
  Net.clientRift = true; Net.cache = {}; Net.applying = false;
  G.scene = 'rift';
  G.world = netUnpackWorld(d.world);
  G.mapImg = renderMap(G.world);
  invalidate(); G.st = heroStats();
  setLocalHero(newHero(d.x, d.y));
  G.hero.res = G.st.resMax * (G.char.cls === 'warrior' ? 0 : 1);
  G.hero.cdPred = {};
  G.partyMul = d.mul || 1;
  G.rift = { level: d.level, theme: d.theme, progress: 0, boss: null, bossSpawned: false, done: false, time: 0, deaths: 0, kills: 0 };
  G.bannerBig = { text: `Podzemí ${d.level}`, sub: THEMES[d.theme].name, t: 0 };
  G.flow = null;
  onSceneChange();
  netRefreshGuestMembersScene();
}
function netRefreshGuestMembersScene() { netUi(); }

// Host odchází z podzemí (portál, teleport) nebo podzemí skončilo → vlastní město
function netGuestLeaveRift() {
  netSend({ t: 'town' });
  netToLocalTown();
}
function netToLocalTown() {
  Net.clientRift = false; Net.cache = {};
  persist(); sfx('portal');
  enterTown();
}

// Hostitel může hrdinu hosta přenést (skok, hák, oživení) – host se přizpůsobí
function netApplySnap(s) {
  Net.applying = true;
  try {
    const h = G.me, mine = s.me;
    // vlastní hrdina
    h.hp = mine.hp; h.res = mine.res;
    if (mine.dead && !h.dead) { h.path = null; h.recall = null; }
    h.dead = !!mine.dead; h.deadT = mine.dt; h.revT = mine.rv;
    const bfSig = JSON.stringify(mine.bf);
    if (bfSig !== h.bfSig) { h.bfSig = bfSig; h.buffs = (mine.bf || []).map(b => Object.assign({}, b, { t: b.t >= 1e8 ? Infinity : b.t })); invalidate(); G.st = heroStats(); }
    const now = G.time;
    for (const id in mine.cds) { if (!(h.cdPred[id] > now)) h.cds[id] = mine.cds[id]; }
    for (const id in h.cds) if (!(id in mine.cds) && !(h.cdPred[id] > now)) h.cds[id] = 0;
    if (!(h.potPred > now)) h.potionCd = mine.pc;
    h.frozen = mine.fr; h.slowT = mine.slT; h.slowP = mine.slP; h.invuln = mine.inv; h.whirl = mine.wh; h.channel = mine.ch; h.z = mine.z;
    h.curse = mine.cu ? { t: mine.cu } : null;
    if (mine.force || h.dead) { h.forceT = now + 0.15; h.fx = mine.x; h.fy = mine.y; }
    // ostatní hrdinové
    const reps = [];
    s.heroes.forEach(o => {
      if (o.id === Net.myId) return;
      let r = G.heroes.find(x => x.rep && x.netId === o.id);
      if (!r) r = { rep: true, netId: o.id, x: o.x, y: o.y, r: 5, buffs: [], cds: {}, walk: 0, char: {} };
      Object.assign(r, { tx: o.x, ty: o.y, face: o.f, moving: !!o.w, dead: !!o.dead, hp: o.hp, mhp: o.mhp, name: o.name, atkAnim: o.aa, atkAng: o.ag, hitT: o.ht ? 0.1 : 0,
        invuln: o.inv ? 0.2 : 0, frozen: o.fr ? 0.2 : 0, z: o.z, whirl: o.wh ? 0.2 : 0, channel: o.ch, curse: o.cu ? { t: o.cu } : null, revT: o.rv,
        buffs: o.bf.map(b => ({ id: b.id, form: b.form, color: b.color })) });
      r.char.name = o.name; r.char.race = o.race; r.char.cls = o.cls; r.char.level = o.level;
      reps.push(r);
    });
    // nepřátelé
    const C = Net.cache, live = {}, mons = [], off = [];
    s.mons.forEach(o => {
      const id = o.full ? o.nid : o.n;
      let m = C[id];
      if (o.full) {
        if (!m) m = C[id] = { kind: 'monster' };
        const keepX = m.x, keepY = m.y;
        Object.assign(m, o); m.nid = id; m.kind = 'monster';
        m.def = m.boss ? BOSSES[m.boss] : m.obj ? BOSS_OBJECTS[m.obj] : MONSTERS[m.type];
        m.tx = o.x; m.ty = o.y; if (keepX !== undefined) { m.x = keepX; m.y = keepY; }
        if (m.dots && !Array.isArray(m.dots)) { /* objekt DoTů – stačí pro částice */ } else m.dots = {};
      } else {
        if (!m && !o.ty) { (Net.need = Net.need || []).push(id); if ((Net.missLog = Net.missLog || []).length < 20) Net.missLog.push({ id, i: s.i, last: Net.lastI }); return; }   // chybí stálé údaje – požádat znovu
        if (!m) m = C[id] = { kind: 'monster', nid: id, dots: {}, x: o.x, y: o.y, cd: 0, res: {} };
        if (o.ty) { m.type = o.ty; m.def = MONSTERS[o.ty]; m.sprite = o.sp; m.pal = o.pal; m.tint = o.ti || undefined; m.name = o.nm; m.scale = o.sc; m.r = o.r; m.fly = !!o.fl; m.bob = o.bo; m.maxHp = o.mh; m.elite = o.el || undefined; m.minion = !!o.mi; m.ai = m.def ? m.def.ai : 'melee'; }
        m.tx = o.x; m.ty = o.y; m.hp = o.hp; m.face = o.f; m.moving = !!o.w;
        m.stunT = o.st ? 0.2 : 0; m.stunKind = o.st === 2 ? 'freeze' : 'stun'; m.slowT = o.sl ? 0.2 : 0; m.wind = o.wi ? 0.1 : 0;
        if (o.aa) m.atkAnim = o.aa; m.knock = o.kn ? 0.05 : 0; m.fuse = o.fu ? 1 : undefined; m.hitT = o.ht ? 0.1 : 0; m.z = o.z || 0; m.aggro = !!o.ag;
        m.dots = {}; (o.dt || []).forEach((e, i) => m.dots[i] = { elem: e });
      }
      if (m.x === undefined) { m.x = m.tx; m.y = m.ty; }
      live[id] = 1;
      (m.hidden ? off : mons).push(m);
    });
    for (const id in C) if (!live[id]) { C[id].dead = true; delete C[id]; }   // zmizel (zemřel nebo je mimo dosah) – nesmí zůstat jako cíl
    Net.lastI = s.i;
    if (Net.need && Net.need.length) { netSend({ t: 'need', ids: Net.need }); Net.need = []; }
    G.monsters = mons; G.offstage = off;
    G.heroes = [h].concat(reps);
    if (mine.hk && C[mine.hk]) h.hooked = { m: C[mine.hk], t: 1 }; else h.hooked = null;
    reps.forEach((r, i) => { const o = s.heroes.find(x => x.id === r.netId); r.hooked = o && o.hk && C[o.hk] ? { m: C[o.hk] } : null; });
    // střely, nebezpečí, plochy, pasti, mazlíčci, kořist, otisky
    G.projs = s.projs.map(p => ({ x: p[0], y: p[1], vx: p[2], vy: p[3], speed: p[4], size: p[5], color: p[6], arrow: !!p[7], friendly: !!p[8], chain: p[9] ? C[p[9]] : null, trail: !!p[10] }));
    G.hazards = s.haz; G.zones = s.zones; G.traps = s.traps; G.decals = s.decals; G.shrines = s.shrines;
    G.pets = s.pets.map(p => { const P = PETS[p.ty]; return { kind: 'pet', nid: p.n, type: p.ty, def: P, scale: P ? P.scale : 1, x: p.x, y: p.y, face: p.f, walk: p.w ? 1 : 0, atkAnim: p.aa }; });
    G.loot = s.loot.map(l => ({ kind: l.k, x: l.x, y: l.y, t: l.t, item: l.it }));
    G.portal = s.portal;
    G.darkness = s.dark;
    const R = G.rift;
    R.level = s.rift.level; R.theme = s.rift.theme; R.progress = s.rift.progress; R.done = s.rift.done; R.bossSpawned = s.rift.bs;
    R.boss = s.rift.boss ? C[s.rift.boss] || null : null;
    if (s.bb) G.bannerBig = s.bb;
    if (s.bn) G.banner = s.bn;
    // efekty
    (s.fx || []).forEach(a => {
      const f = a[0], args = a.slice(1);
      if (f === 'sfx') sfx(args[0]);
      else if (typeof window[f] === 'function') { try { window[f].apply(null, args); } catch (e) {} }
    });
  } finally { Net.applying = false; }
}

// Odměna od hostitele → do vlastního uložení
function netApplyReward(r) {
  const ch = G.char;
  if (r.xp) gainXP(r.xp);
  if (r.gold) G.save.gold += r.gold;
  if (r.item) {
    const it = r.item; it.uid = G.save.nextUid++;
    if (ch.inv.length < INV_MAX) ch.inv.push(it);
    else if (G.save.stash && G.save.stash.length < (typeof STASH_MAX !== 'undefined' ? STASH_MAX : 60)) { G.save.stash.push(it); toast(`${it.name}: batoh je plný, předmět jde do truhly`); }
    else toast(`${it.name}: batoh i truhla jsou plné`);
  }
  if (r.log) { G.lootLog.unshift({ name: r.log[0], color: r.log[1], note: r.log[2], t: 0 }); G.lootLog.length = Math.min(G.lootLog.length, 6); }
  if (r.maxRift) ch.maxRift = Math.max(ch.maxRift, r.maxRift);
  if (r.vendor) vendorRiftDone(ch);
  if (r.dur) { EQUIP_ORDER.forEach(s => { const it = ch.equip[s]; if (it && it.uid === r.dur[0]) { it.dur = r.dur[1]; invalidate(); G.st = heroStats(); } }); }
  if (r.dead) G.rift.deaths = (G.rift.deaths || 0) + 1;
}

// Kouzlo hosta: okamžitá odezva (animace, zvuk, přebíjení) + zpráva hostiteli
function netCast(id, tx, ty, target) {
  const h = G.hero, st = G.st, S = SKILLS[id];
  const why = skillBlocked(id);
  if (why) {
    if (why === 'res' && !(h.resWarn > 0)) { h.resWarn = 0.8; floatText(h.x, h.y - 30, `Málo: ${CLASSES[G.char.cls].res.name.toLowerCase()}`, CLASSES[G.char.cls].res.color, 0.8); }
    return false;
  }
  if (h.castLock > 0) return false;
  if (S.primary && h.atkCd > 0) return false;
  const P = skillParams(id, st);
  const gy = target ? target.y : ty + 6, ang = Math.atan2(gy - h.y, tx - h.x);
  if (Math.abs(Math.cos(ang)) > 0.15) h.face = Math.cos(ang) > 0 ? 1 : -1;
  h.castLock = 0.18;
  if (S.primary) h.atkCd = 1 / (st.spd * (P.elem !== 'phys' ? st.castMul : st.wpnSpdMul));
  h.atkAnim = 0.15; h.atkAng = ang; h.moveLock = S.primary ? 0.16 : 0.12;
  if (P.cd) { h.cds[id] = P.cd * (1 - st.cdr); h.cdPred[id] = G.time + 0.8; }
  h.res = Math.min(st.resMax, h.res - (P.cost || 0) + (P.gen || 0) * st.genMul);
  sfx(skillSfx(P));
  netSend({ t: 'cast', id, tx: R1(tx), ty: R1(ty), tid: target && target.nid ? target.nid : 0 });
  return true;
}
function netPotion() {
  const h = G.hero;
  if (h.dead) return;
  if (h.potionCd > 0) { floatText(h.x, h.y - 30, `Lektvar za ${Math.ceil(h.potionCd)} s`, '#aaa', 0.8); return; }
  h.potionCd = POTION_CD; h.potPred = G.time + 0.8;
  sfx('potion');
  netSend({ t: 'pot' });
}

// Herní smyčka hosta v podzemí hostitele: vlastní pohyb a ovládání, ostatní se jen plynule posouvá
function guestUpdate(dt) {
  G.time += dt;
  const h = G.me, st = G.st;
  h.castLock -= dt; h.atkCd = (h.atkCd || 0) - dt; h.moveLock = (h.moveLock || 0) - dt; h.potionCd -= dt; h.hitT -= dt; h.atkAnim -= dt; h.resWarn = (h.resWarn || 0) - dt;
  h.invuln -= dt; h.frozen -= dt; h.slowT = (h.slowT || 0) - dt;
  for (const k in h.cds) h.cds[k] -= dt;
  if (h.forceT > G.time) {   // hostitel hrdinou pohnul (skok, hák…)
    if (Math.hypot(h.fx - h.x, h.fy - h.y) > 40) { h.x = h.fx; h.y = h.fy; }
    else { h.x += (h.fx - h.x) * Math.min(1, dt * 20); h.y += (h.fy - h.y) * Math.min(1, dt * 20); }
  } else if (!h.dead) heroControl(dt);
  const lerp = (o, k) => { if (o.tx === undefined) return; if (Math.hypot(o.tx - o.x, o.ty - o.y) > 80) { o.x = o.tx; o.y = o.ty; } else { o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; } };
  const k = Math.min(1, dt * 14);
  G.heroes.forEach(o => { if (o !== h) { lerp(o, k); o.walk = o.moving ? (o.walk || 0) + dt : 0; } });
  G.monsters.forEach(m => { lerp(m, k); m.walk = m.moving ? (m.walk || 0) + dt : 0; if (m.atkAnim > 0) m.atkAnim -= dt; if (m.animT !== undefined) m.animT += dt; });
  G.offstage.forEach(m => lerp(m, k));
  G.projs.forEach(p => {
    p.x += p.vx * p.speed * dt; p.y += p.vy * p.speed * dt;
    if (p.trail && Math.random() < 0.7) particle(p.x, p.y - 7, { vx: rand(-8, 8), vy: rand(-8, 8), life: 0.3, color: p.color, size: 1, glow: true });
    if (p.color && p.size >= 2) light(p.x, p.y - 7, 14 + p.size * 3, p.color);
  });
  G.hazards.forEach(z => { z.t += dt; if (z.wave && z.t >= z.delay) z.cur = (z.t - z.delay) * z.speed; });
  G.zones.forEach(z => { z.t += dt; if (z.fired && z.dur) light(z.x, z.y, z.r, z.color); });
  G.decals.forEach(d => d.t += dt);
  G.loot.forEach(l => l.t += dt);
  updateFx(dt);
  G.exploreT -= dt;
  if (G.exploreT <= 0) { G.exploreT = 0.25; explore(); }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 3) G.banner = null; }
  if (G.bannerBig) { G.bannerBig.t += dt; if (G.bannerBig.t > 3) G.bannerBig = null; }
  G.lootLog.forEach(l => l.t += dt); G.lootLog = G.lootLog.filter(l => l.t < 8);
  G.saveT -= dt;
  if (G.saveT <= 0) { G.saveT = 15; persist(); }
  if (G.portal) portalCheck(h, netGuestLeaveRift);
}

// ---------- Okno „Hrát s přáteli“ ----------

function showNetModal() {
  const inRoom = !!Net.role;
  let body;
  if (Net.creating && !Net.role) body = `<p>Zakládám místnost…</p><div class="actions"><button onclick="netDestroy();showNetModal()">Zrušit</button></div>`;
  else if (Net.joining && !Net.role) body = `<p>Připojuji se k místnosti <b>${Net.code}</b>…</p>${netStageList()}<div class="actions"><button onclick="netDestroy();showNetModal()">Zrušit</button></div>`;
  else if (!inRoom) {
    const can = G.scene === 'town';
    body = `<p class="muted small">Hrajte spolu podzemí (2–4 hráči). Každý hraje se svou postavou, zkušenosti, zlato a kořist se ukládají každému zvlášť.
        Kořist vidí a sbírá každý svoji. S každým dalším hráčem jsou nepřátelé o 10 % silnější a je jich víc.</p>
      ${can ? '' : '<p class="warn">Místnost můžeš založit nebo se připojit jen ve městě.</p>'}
      ${Net.joinError ? `<p class="net-err">${NET_JOIN_ERR[Net.joinError.why](Net.joinError.code)}</p>` : ''}
      <div class="net-box"><b>Založit místnost</b><p class="muted small">Dostaneš kód, který pošleš kamarádům. U tebe poběží hra, nech ji proto otevřenou na popředí.</p>
        <button class="primary" ${can ? '' : 'disabled'} onclick="netCreate();showNetModal()">Založit místnost</button></div>
      <div class="net-box"><b>Připojit se</b><p class="muted small">Zadej kód od kamaráda.</p>
        <div class="net-join"><input id="net-code" maxlength="6" placeholder="KÓD" autocomplete="off" autocapitalize="characters" onkeydown="if(event.key==='Enter')netJoin(this.value)">
        <button class="primary" ${can ? '' : 'disabled'} onclick="netJoin($('net-code').value);showNetModal()">Připojit</button></div></div>`;
  } else {
    const rows = Net.members.map(m => `<li><span class="net-cls" style="color:${CLASSES[m.cls] ? CLASSES[m.cls].colors[0] : '#ccc'}">●</span> <b>${m.name}</b>${m.id === Net.myId ? ' (ty)' : ''}${m.host ? ' · hostitel' : ''}
      <span class="muted small">${RACES[m.race] ? RACES[m.race].name : ''} ${CLASSES[m.cls] ? CLASSES[m.cls].name : ''} · úr. ${m.level} · ${m.scene === 'rift' ? 'v podzemí' : 've městě'}</span></li>`).join('');
    body = `<div class="net-code">Kód místnosti: <b>${Net.code}</b></div>
      <p class="muted small">${netIsHost() ? 'Pošli kód kamarádům. Do podzemí se jde přes obelisk: kdokoli vybere úroveň a ostatní ji potvrdí.' : 'Do podzemí se jde přes obelisk: kdokoli vybere úroveň a ostatní ji potvrdí.'}</p>
      <ul class="net-list">${rows}</ul>
      <div class="actions"><button class="danger" onclick="netLeave();closeMenu()">Opustit místnost</button></div>`;
  }
  showModal(`<h2>Hrát s přáteli</h2>${body}`, false, 'net');
}
function netStageList() {
  const order = ['server', 'peer', 'host'], cur = order.indexOf(Net.joinStage);
  return `<ol class="net-stages">${order.map((k, i) => `<li class="${i < cur ? 'ok' : i === cur ? 'now' : ''}">${i < cur ? '✓ ' : ''}${NET_JOIN_STAGES[k]}</li>`).join('')}</ol>`;
}
function netUi() { if (UI.modalKind === 'net') showNetModal(); if (typeof buildPartyFrames === 'function') buildPartyFrames(); }

window.addEventListener('load', netHookFx);

// ---------- Přenos uložení na jiné zařízení (krátký kód) ----------
// Odesílající zařízení si na serveru PeerJS zabere ID „wd-xfer-KÓD“ a čeká. Přijímající se připojí přes kód
// a dostane celé uložení (stejný formát jako dlouhý kód WD5:…) po kouscích. Po potvrzení nahradí své uložení.

const XFER_PREFIX = 'wd-xfer-';
const XFER_CHUNK = 16000;            // znaků v jedné zprávě
const XFER_LIFE = 10 * 60 * 1000;    // jak dlouho kód platí
const Xfer = { role: null, side: null, peer: null, code: null, state: '', msg: '', parts: null, head: null, conn: null };   // side = kde zobrazit stav (send/recv)

function verNum(v) { return String(v || '0').split('.').reduce((a, x) => a * 1000 + (+x || 0), 0); }
function xferSummary(s) { return { chars: (s.chars || []).map(c => ({ name: c.name, race: c.race, cls: c.cls, level: c.level })), gold: s.gold || 0 }; }

function xferStop() {
  try { if (Xfer.conn) Xfer.conn.close(); } catch (e) {}
  try { if (Xfer.peer) Xfer.peer.destroy(); } catch (e) {}
  Object.assign(Xfer, { role: null, side: null, peer: null, code: null, state: '', msg: '', parts: null, head: null, conn: null });
}
function xferFail(side, msg) { xferStop(); Xfer.side = side; xferSet('err', msg); }
function xferSet(state, msg) { Xfer.state = state; Xfer.msg = msg || ''; xferUi(); }

function xferSend() {
  if (typeof Peer === 'undefined') { toast('Knihovna pro spojení se nenačetla.'); return; }
  xferStop();
  persist();
  const code = netCode(), peer = new Peer(XFER_PREFIX + code, netOpts());
  Object.assign(Xfer, { role: 'send', side: 'send', peer, code: null });
  xferSet('wait', 'Připravuji kód…');
  setTimeout(() => { if (Xfer.peer === peer && !Xfer.code) xferFail('send', 'Server pro spojení neodpovídá. Zkontroluj internet a zkus to znovu.'); }, 15000);
  setTimeout(() => { if (Xfer.peer === peer && Xfer.state !== 'done') xferFail('send', 'Kód vypršel. Klepni znovu na Odeslat.'); }, XFER_LIFE);
  peer.on('open', () => { Xfer.code = code; xferSet('wait', 'Na druhém zařízení otevři Přenos postav a zadej tento kód.'); });
  peer.on('error', e => {
    if (Xfer.peer !== peer) return;
    if (e.type === 'unavailable-id' && !Xfer.code) { xferSend(); return; }
    if (!Xfer.code) xferFail('send', 'Kód se nepodařilo připravit. Zkontroluj připojení k internetu.');
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('connection', conn => {
    conn.on('open', () => {
      persist();
      const data = exportSave(G.save), n = Math.ceil(data.length / XFER_CHUNK);
      conn.send({ t: 'head', ver: GAME_VERSION, n, sum: xferSummary(G.save) });
      for (let i = 0; i < n; i++) conn.send({ t: 'part', i, s: data.slice(i * XFER_CHUNK, (i + 1) * XFER_CHUNK) });
      xferSet('wait', 'Druhé zařízení se připojilo, čekám na potvrzení…');
    });
    conn.on('data', d => {
      if (!d || Xfer.peer !== peer) return;
      if (d.t === 'ok') { xferSet('done', 'Hotovo! Postavy jsou na druhém zařízení.'); setTimeout(() => { if (Xfer.peer === peer) { try { peer.destroy(); } catch (e) {} Xfer.peer = null; } }, 1000); }
      else if (d.t === 'no') xferSet('wait', 'Druhé zařízení přenos odmítlo. Kód stále platí.');
      else if (d.t === 'old') xferSet('wait', `Druhé zařízení má starší verzi hry (${d.ver}). Ať tam obnoví stránku a zadá kód znovu.`);
    });
    conn.on('close', () => { if (Xfer.peer === peer && Xfer.state === 'wait' && /potvrzení/.test(Xfer.msg)) xferSet('wait', 'Druhé zařízení se odpojilo. Kód stále platí.'); });
  });
}

function xferRecv(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) { toast('Zadej kód z druhého zařízení'); return; }
  if (typeof Peer === 'undefined') { toast('Knihovna pro spojení se nenačetla.'); return; }
  if (Net.role) { toast('Nejdřív opusť místnost s přáteli.'); return; }
  xferStop();
  const peer = new Peer(netOpts());
  Object.assign(Xfer, { role: 'recv', side: 'recv', peer, code });
  xferSet('wait', 'Připojuji se…');
  const fail = msg => { if (Xfer.peer === peer) xferFail('recv', msg); };
  setTimeout(() => { if (Xfer.peer === peer && !Xfer.head) fail('Spojení se nepodařilo navázat. Zkontroluj kód. Pokud je jedno zařízení ve firemní síti nebo na VPN, síť přímé spojení blokuje – použij níže přenos souborem.'); }, 20000);
  peer.on('error', e => fail(e.type === 'peer-unavailable' ? `Kód ${code} neplatí. Zkontroluj ho, nebo na druhém zařízení klepni znovu na Odeslat.` : 'Připojení se nepodařilo. Zkontroluj kód a internet.'));
  peer.on('open', () => {
    const conn = peer.connect(XFER_PREFIX + code, { reliable: true, serialization: 'json' });
    Xfer.conn = conn;
    conn.on('data', d => {
      if (!d || Xfer.peer !== peer) return;
      if (d.t === 'head') {
        if (verNum(d.ver) > verNum(GAME_VERSION)) { conn.send({ t: 'old', ver: GAME_VERSION }); fail(`Tady je starší verze hry (${GAME_VERSION}, na druhém zařízení ${d.ver}). Obnov stránku a zadej kód znovu.`); return; }
        Xfer.head = d; Xfer.parts = [];
        xferSet('wait', 'Přijímám…');
      } else if (d.t === 'part' && Xfer.head) {
        Xfer.parts[d.i] = d.s;
        if (Xfer.parts.filter(x => x !== undefined).length === Xfer.head.n) xferGot(conn);
      }
    });
    conn.on('close', () => { if (Xfer.peer === peer && Xfer.state !== 'done' && Xfer.state !== 'ask') fail('Spojení s druhým zařízením se přerušilo.'); });
  });
}

function xferGot(conn) {
  let s;
  try { s = importSave(Xfer.parts.join('')); } catch (e) { xferFail('recv', 'Přijatá data jsou poškozená. Zkus to znovu.'); return; }
  const apply = () => {
    delete s._notice;
    G.save = s; persist();
    try { conn.send({ t: 'ok' }); } catch (e) {}
    const peer = Xfer.peer;
    setTimeout(() => { try { peer.destroy(); } catch (e) {} }, 800);
    Object.assign(Xfer, { role: null, peer: null, conn: null, state: '', parts: null, head: null });
    showMenu(); toast('Postavy přeneseny');
  };
  if (!G.save.chars.length) { apply(); return; }
  const list = (Xfer.head.sum.chars || []).map(c => `<li><b>${c.name}</b> <span class="muted small">${RACES[c.race] ? RACES[c.race].name : ''} ${CLASSES[c.cls] ? CLASSES[c.cls].name : ''} · úr. ${c.level}</span></li>`).join('') || '<li class="muted">žádné postavy</li>';
  const here = G.save.chars.map(c => `${c.name} (úr. ${c.level})`).join(', ');
  Xfer.state = 'ask';
  Xfer.apply = apply;
  showModal(`<h2>Přijmout postavy?</h2>
    <p>Z druhého zařízení přijde:</p><ul class="net-list">${list}</ul>
    <p class="small">Sdílené zlato: <b class="gold">${fmt(Xfer.head.sum.gold)}</b> ${GI} a truhla.</p>
    <p class="warn">Postavy na tomto zařízení se nahradí: ${here}.</p>
    <div class="actions"><button class="primary" onclick="Xfer.apply()">Přijmout</button><button onclick="xferDecline()">Zrušit</button></div>`, false, 'xfer');
}
function xferDecline() {
  const c = Xfer.conn, p = Xfer.peer;
  try { if (c) c.send({ t: 'no' }); } catch (e) {}
  Object.assign(Xfer, { role: null, side: null, peer: null, conn: null, code: null, state: '', msg: '', parts: null, head: null });
  setTimeout(() => { try { if (p) p.destroy(); } catch (e) {} }, 400);
  showTransfer();
}

// ---------- Okno „Přenos postav“ ----------

function showTransfer() {
  const st = Xfer.state, busy = !!Xfer.role, side = Xfer.side;
  let status = '';
  if (Xfer.role === 'send' && Xfer.code) status = `<div class="net-code">Kód: <b id="xfer-code">${Xfer.code}</b></div>`;
  if (Xfer.msg) status += `<p class="${st === 'err' ? 'warn' : st === 'done' ? 'ok' : 'muted'} small" id="xfer-msg">${Xfer.msg}</p>`;
  const cancel = `<div class="actions"><button onclick="xferStop();showTransfer()">${st === 'done' ? 'OK' : 'Zrušit'}</button></div>`;
  showModal(`<h2>Přenos postav</h2>
    <p class="muted small">Přenese všechny postavy, zlato a truhlu na jiné zařízení (třeba z počítače do mobilu). Obě zařízení musí mít hru otevřenou a být na internetu.
      Na přijímajícím zařízení se dosavadní postavy nahradí.</p>
    <div class="net-box"><b>Odeslat z tohoto zařízení</b>
      ${Xfer.role === 'send' || (side === 'send' && st === 'done') ? status + cancel
        : `<p class="muted small">Dostaneš krátký kód, který zadáš na druhém zařízení.</p>${side === 'send' ? status : ''}
        <button class="primary" id="xfer-send" ${busy ? 'disabled' : ''} onclick="xferSend()">Odeslat postavy</button>`}</div>
    <div class="net-box"><b>Přijmout na tomto zařízení</b>
      ${Xfer.role === 'recv' ? status + cancel
        : `<p class="muted small">Zadej kód z druhého zařízení.</p>${side === 'recv' ? status : ''}
        <div class="net-join"><input id="xfer-in" maxlength="6" placeholder="KÓD" autocomplete="off" autocapitalize="characters" onkeydown="if(event.key==='Enter')xferRecv(this.value)">
        <button class="primary" id="xfer-recv" ${busy ? 'disabled' : ''} onclick="xferRecv($('xfer-in').value)">Přijmout</button></div>`}</div>
    <details class="xfer-old"><summary class="small">Záložně souborem nebo dlouhým kódem (když krátký kód nejde – firemní síť, VPN)</summary>
      <p class="muted small"><b>Soubor</b> (nejspolehlivější): stáhni ho tady, pošli si ho (e-mail, Disk Google…) a na druhém zařízení ho načti.</p>
      <div class="actions" style="justify-content:flex-start"><button onclick="doExportFile()">Stáhnout soubor</button>
        <label class="btn-file"><input type="file" accept=".txt,text/plain" onchange="doImportFile(this)" hidden><span>Načíst ze souboru</span></label></div>
      <p class="muted small"><b>Dlouhý kód</b>: zkopíruj, pošli si ho a na druhém zařízení ho sem vlož a načti.</p>
      <button onclick="doExport()">Zkopírovat kód uložení</button>
      <textarea id="save-code" rows="3" placeholder="Sem vlož kód uložení (WD5:...)"></textarea>
      <div class="actions"><button onclick="doImport()">Načíst z kódu</button></div></details>`, false, 'xfer');
}
function xferUi() { if (UI.modalKind === 'xfer' && Xfer.state !== 'ask') showTransfer(); }
