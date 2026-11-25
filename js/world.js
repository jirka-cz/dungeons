// Svět: generování riftů (jeskyně / krypty), městečko, předkreslení mapy, kolize a hledání cest.

function hash2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); }
function rnd(n) { return Math.floor(Math.random() * n); }

// ---------- Generátory ----------

function emptyWorld(w, h, fill) {
  return { w, h, tiles: new Uint8Array(w * h).fill(fill), explored: new Uint8Array(w * h), decor: [], torches: [], npcs: [] };
}
function tileAt(W, tx, ty) { return (tx < 0 || ty < 0 || tx >= W.w || ty >= W.h) ? 0 : W.tiles[ty * W.w + tx]; }
function setTile(W, tx, ty, v) { if (tx > 0 && ty > 0 && tx < W.w - 1 && ty < W.h - 1) W.tiles[ty * W.w + tx] = v; }
function isFloor(W, tx, ty) { return tileAt(W, tx, ty) >= 1; }

// Ponechá jen největší souvislou oblast podlahy
function keepLargest(W) {
  const seen = new Int32Array(W.w * W.h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  for (let i = 0; i < W.tiles.length; i++) {
    if (!W.tiles[i] || seen[i] >= 0) continue;
    let size = 0; const q = [i]; seen[i] = id;
    while (q.length) {
      const c = q.pop(); size++;
      const x = c % W.w, y = (c / W.w) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const n = (y + dy) * W.w + x + dx;
        if (W.tiles[n] && seen[n] < 0) { seen[n] = id; q.push(n); }
      });
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  for (let i = 0; i < W.tiles.length; i++) if (W.tiles[i] && seen[i] !== best) W.tiles[i] = 0;
  return bestSize;
}

function genCave(w, h) {
  let W;
  for (let attempt = 0; attempt < 6; attempt++) {
    W = emptyWorld(w, h, 0);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) W.tiles[y * w + x] = Math.random() < 0.55 ? 1 : 0;
    for (let it = 0; it < 5; it++) {
      const nt = W.tiles.slice();
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!W.tiles[(y + dy) * w + x + dx]) walls++;
        nt[y * w + x] = walls >= 5 ? 0 : 1;
      }
      W.tiles = nt;
    }
    if (keepLargest(W) > w * h * 0.32) break;
  }
  return W;
}

function genRooms(w, h) {
  const W = emptyWorld(w, h, 0), rooms = [];
  for (let i = 0; i < 60 && rooms.length < 16; i++) {
    const rw = 5 + rnd(8), rh = 4 + rnd(6), rx = 2 + rnd(w - rw - 4), ry = 2 + rnd(h - rh - 4);
    if (rooms.some(r => rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y)) continue;
    rooms.push({ x: rx, y: ry, w: rw, h: rh });
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) setTile(W, x, y, 1);
  }
  rooms.sort((a, b) => a.x - b.x);
  const center = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
  for (let i = 1; i < rooms.length; i++) {
    const [x1, y1] = center(rooms[i - 1]), [x2, y2] = center(rooms[i]);
    const carve = (x, y) => { setTile(W, x, y, 1); setTile(W, x, y + 1, 1); };
    if (Math.random() < 0.5) { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y1); for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x2, y); }
    else { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x1, y); for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y2); }
  }
  // pár spojek navíc kvůli smyčkám
  for (let i = 0; i < 3 && rooms.length > 3; i++) {
    const a = rooms[rnd(rooms.length)], b = rooms[rnd(rooms.length)];
    const [x1, y1] = center(a), [x2, y2] = center(b);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setTile(W, x, y1, 1);
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) setTile(W, x2, y, 1);
  }
  keepLargest(W);
  W.rooms = rooms;
  return W;
}

function floorTiles(W) {
  const out = [];
  for (let y = 1; y < W.h - 1; y++) for (let x = 1; x < W.w - 1; x++) if (W.tiles[y * W.w + x]) out.push([x, y]);
  return out;
}

// Otevřená dlaždice (podlaha i kolem) — vhodná pro spawn
function isOpen(W, x, y, r = 1) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!isFloor(W, x + dx, y + dy)) return false;
  return true;
}

function genRift(themeId) {
  const T = THEMES[themeId];
  const W = T.gen === 'rooms' ? genRooms(84, 64) : genCave(84, 64);
  W.theme = themeId; W.kind = 'rift';
  const floors = floorTiles(W);
  const open = floors.filter(([x, y]) => isOpen(W, x, y));
  const sp = open[rnd(open.length)] || floors[0];
  W.spawn = { x: sp[0] * TILE + 8, y: sp[1] * TILE + 8 };
  // pochodně u stěn
  floors.forEach(([x, y]) => {
    if (!isFloor(W, x, y - 1) && isFloor(W, x, y + 1) && hash2(x, y, 7) % 23 === 0) W.torches.push({ x: x * TILE + 8, y: y * TILE + 2 });
    else if (hash2(x, y, 3) % 19 === 0) W.decor.push({ x, y, type: T.decor[hash2(x, y, 5) % T.decor.length] });
  });
  return W;
}

// ---------- Městečko ----------

const TOWN_PAL = { grass: ['#3e6a2e', '#3a6429', '#437234'], path: ['#7a6e5a', '#726652', '#83765f'], tree: '#24461c', treeTop: '#2e5a24' };

function genTown() {
  const w = 40, h = 28, W = emptyWorld(w, h, 1);
  W.kind = 'town'; W.theme = 'town';
  W.ground = new Uint8Array(w * h);   // 0 tráva, 1 cesta
  const solid = (x0, y0, x1, y1, deco) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.tiles[y * w + x] = 0;
    if (deco) W.decor.push(Object.assign({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, deco));
  };
  const path = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.ground[y * w + x] = 1; };
  // okraj lesa
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (edge < 2 || (edge === 2 && hash2(x, y, 1) % 3 === 0)) { W.tiles[y * w + x] = 0; W.decor.push({ x, y, type: 'tree' }); }
  }
  path(4, 13, 35, 14); path(19, 4, 20, 24); path(14, 10, 25, 17);
  solid(4, 4, 10, 8, { type: 'house', roof: '#8a3a2a', name: 'Obchod' });
  solid(29, 4, 35, 8, { type: 'house', roof: '#3a4a6a', name: 'Kovárna' });
  solid(4, 19, 9, 23, { type: 'house', roof: '#6a5a2a' });
  solid(30, 19, 35, 23, { type: 'house', roof: '#5a2a4a' });
  path(6, 9, 8, 12); path(31, 9, 33, 12);
  solid(19, 10, 20, 11, { type: 'obelisk' });
  solid(33, 10, 33, 10, { type: 'anvil' });
  solid(16, 16, 16, 16, { type: 'chest' });
  solid(23, 16, 24, 16, { type: 'well' });
  W.npcs = [
    { id: 'vendor', name: 'Obchodník', x: 7 * TILE + 8, y: 10 * TILE + 8, sprite: 'human', pal: { b: '#3a7a4a', d: '#24502e', h: '#c8c8c8' } },
    { id: 'smith', name: 'Kovář', x: 32 * TILE + 8, y: 10 * TILE + 8, sprite: 'dwarf', pal: { b: '#5a3a1a', m: '#5a5a5a', M: '#3a3a3a' } },
    { id: 'obelisk', name: 'Obelisk riftů', x: 20 * TILE, y: 12 * TILE + 4, obj: true },
    { id: 'stash', name: 'Truhla', x: 16 * TILE + 8, y: 17 * TILE, obj: true }
  ];
  W.spawn = { x: 20 * TILE, y: 15 * TILE };
  for (let i = 0; i < 18; i++) {
    const x = 3 + rnd(34), y = 3 + rnd(22);
    if (W.tiles[y * w + x] && !W.ground[y * w + x]) W.decor.push({ x, y, type: 'flower', c: ['#e05a5a', '#e0d05a', '#a05ae0', '#ffffff'][rnd(4)] });
  }
  W.torches.push({ x: 18 * TILE, y: 10 * TILE }, { x: 22 * TILE, y: 10 * TILE }, { x: 11 * TILE + 8, y: 9 * TILE }, { x: 28 * TILE + 8, y: 9 * TILE });
  return W;
}

// ---------- Předkreslení mapy do offscreen plátna ----------

function renderMap(W) {
  const c = document.createElement('canvas');
  c.width = W.w * TILE; c.height = W.h * TILE;
  const g = c.getContext('2d');
  const town = W.kind === 'town';
  const T = town ? null : THEMES[W.theme];
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const px = x * TILE, py = y * TILE, hsh = hash2(x, y);
    if (isFloor(W, x, y) || town) {
      // podlaha: jednotný základ + jemný šum (bez výrazné mřížky)
      const pal = town ? (W.ground[y * W.w + x] ? TOWN_PAL.path : TOWN_PAL.grass) : T.floor;
      g.fillStyle = pal[0]; g.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 10; i++) { const h2 = hash2(x, y, i + 10); g.fillStyle = pal[1 + (h2 >> 9) % (pal.length - 1)]; g.fillRect(px + h2 % 16, py + (h2 >> 4) % 16, 2 + (h2 >> 12) % 3, 1 + (h2 >> 14) % 2); }
      g.fillStyle = 'rgba(0,0,0,0.14)';
      for (let i = 0; i < 3; i++) { const h2 = hash2(x, y, i + 40); g.fillRect(px + h2 % 16, py + (h2 >> 4) % 16, 1, 1); }
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 2; i++) { const h2 = hash2(x, y, i + 30); g.fillRect(px + h2 % 16, py + (h2 >> 4) % 16, 1, 1); }
      // dlažba v kryptě a cesty ve městě
      if ((town && W.ground[y * W.w + x]) || (T && T.gen === 'rooms')) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        if ((x + y) % 2 === 0) g.fillRect(px, py, TILE, 1);
        g.fillRect(px + ((y % 2) ? 0 : 8), py, 1, TILE);
      }
      // praskliny
      if (!town && hsh % 13 === 0) { g.fillStyle = 'rgba(0,0,0,0.25)'; const ox = hsh % 9, oy = (hsh >> 5) % 9; g.fillRect(px + ox, py + oy, 4, 1); g.fillRect(px + ox + 3, py + oy + 1, 3, 1); }
      // stín pod stěnou a u stěn po stranách
      if (!town && !isFloor(W, x, y - 1)) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px, py, TILE, 3); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(px, py + 3, TILE, 2); }
      if (!town && !isFloor(W, x - 1, y)) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px, py, 2, TILE); }
      if (!town && !isFloor(W, x + 1, y)) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px + 14, py, 2, TILE); }
    } else {
      // stěna: vršek + čelní stěna, pokud je pod ní podlaha
      g.fillStyle = T.wall; g.fillRect(px, py, TILE, TILE);
      if (isFloor(W, x, y + 1)) {
        g.fillStyle = T.wallFace; g.fillRect(px, py + 6, TILE, 10);
        g.fillStyle = T.wallLine;
        g.fillRect(px, py + 6, TILE, 1); g.fillRect(px, py + 11, TILE, 1);
        g.fillRect(px + (hsh % 2 ? 4 : 10), py + 6, 1, 5); g.fillRect(px + (hsh % 2 ? 12 : 2), py + 11, 1, 5);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px, py + 7, TILE, 1);
      } else if (hsh % 7 === 0) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(px + 3, py + 3, 3, 3); }
      // obrys horní plochy stěny tam, kde sousedí s podlahou
      g.fillStyle = T.wallFace;
      if (isFloor(W, x - 1, y)) g.fillRect(px, py, 1, isFloor(W, x, y + 1) ? 6 : TILE);
      if (isFloor(W, x + 1, y)) g.fillRect(px + 15, py, 1, isFloor(W, x, y + 1) ? 6 : TILE);
      if (isFloor(W, x, y - 1)) g.fillRect(px, py, TILE, 1);
    }
  }
  W.decor.forEach(d => drawDecor(g, d, W));
  return c;
}

function drawDecor(g, d, W) {
  const px = d.x * TILE, py = d.y * TILE, h = hash2(d.x, d.y, 9);
  const ox = 3 + h % 8, oy = 4 + (h >> 3) % 8;
  switch (d.type) {
    case 'bones': g.fillStyle = '#d8d2c0'; g.fillRect(px + ox, py + oy, 5, 1); g.fillRect(px + ox + 1, py + oy + 2, 4, 1); g.fillRect(px + ox, py + oy - 1, 1, 3); break;
    case 'skull': g.fillStyle = '#d8d2c0'; g.fillRect(px + ox, py + oy, 4, 3); g.fillStyle = '#1a1a2e'; g.fillRect(px + ox + 1, py + oy + 1, 1, 1); g.fillRect(px + ox + 3, py + oy + 1, 1, 1); break;
    case 'candle': g.fillStyle = '#e8e0c0'; g.fillRect(px + ox, py + oy, 2, 4); g.fillStyle = '#ffb040'; g.fillRect(px + ox, py + oy - 2, 2, 2); break;
    case 'rock': g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + ox, py + oy + 3, 7, 2); g.fillStyle = '#5a5050'; g.fillRect(px + ox, py + oy, 6, 4); g.fillStyle = '#787070'; g.fillRect(px + ox + 1, py + oy, 3, 1); break;
    case 'lava': g.fillStyle = '#7a1e0a'; g.fillRect(px + ox - 2, py + oy, 9, 3); g.fillStyle = '#ff7a20'; g.fillRect(px + ox, py + oy + 1, 5, 1); break;
    case 'crystal': g.fillStyle = '#5ab0e0'; g.fillRect(px + ox + 1, py + oy - 4, 2, 7); g.fillRect(px + ox + 4, py + oy - 1, 2, 4); g.fillStyle = '#c8f0ff'; g.fillRect(px + ox + 1, py + oy - 4, 1, 3); break;
    case 'mushroom': g.fillStyle = '#e0d8c0'; g.fillRect(px + ox + 1, py + oy + 1, 1, 3); g.fillStyle = '#c04aa0'; g.fillRect(px + ox, py + oy, 3, 2); break;
    case 'puddle': g.fillStyle = '#3a5a2a'; g.fillRect(px + ox - 2, py + oy, 9, 3); g.fillStyle = '#5a8a3a'; g.fillRect(px + ox, py + oy + 1, 4, 1); break;
    case 'flower': g.fillStyle = d.c; g.fillRect(px + ox, py + oy, 2, 2); g.fillStyle = '#2a5a1e'; g.fillRect(px + ox, py + oy + 2, 1, 2); break;
    case 'tree':
      g.fillStyle = TOWN_PAL.tree; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = TOWN_PAL.treeTop; g.fillRect(px + 2, py + 1, 12, 10);
      g.fillStyle = '#3a6e2c'; g.fillRect(px + 4, py + 2, 5, 4);
      g.fillStyle = '#4a3018'; g.fillRect(px + 7, py + 11, 2, 5); break;
    case 'house': {
      const x0 = px, y0 = py, ww = d.w * TILE, hh = d.h * TILE;
      g.fillStyle = '#6a5a48'; g.fillRect(x0, y0 + hh * 0.45, ww, hh * 0.55);
      g.fillStyle = '#4a3e30'; for (let i = 0; i < ww; i += 8) g.fillRect(x0 + i, y0 + hh * 0.45, 1, hh * 0.55);
      g.fillStyle = d.roof; g.fillRect(x0 - 2, y0, ww + 4, hh * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 4; i < hh * 0.5; i += 5) g.fillRect(x0 - 2, y0 + i, ww + 4, 1);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x0 - 2, y0, ww + 4, 2);
      g.fillStyle = '#3a2410'; g.fillRect(x0 + ww / 2 - 5, y0 + hh - 14, 10, 14);
      g.fillStyle = '#ffd880'; g.fillRect(x0 + 8, y0 + hh * 0.6, 7, 6); g.fillRect(x0 + ww - 15, y0 + hh * 0.6, 7, 6);
      if (d.name) { g.fillStyle = '#e0c080'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText(d.name, x0 + ww / 2, y0 + hh * 0.42); }
      break;
    }
    case 'anvil': g.fillStyle = '#3a3a44'; g.fillRect(px + 2, py + 7, 12, 4); g.fillRect(px + 5, py + 11, 6, 4); g.fillStyle = '#6a6a78'; g.fillRect(px + 2, py + 7, 12, 1); break;
    case 'chest': g.fillStyle = '#6a3a1a'; g.fillRect(px + 1, py + 5, 14, 10); g.fillStyle = '#8a5a2a'; g.fillRect(px + 1, py + 5, 14, 3); g.fillStyle = '#e0b030'; g.fillRect(px + 7, py + 8, 2, 3); g.fillRect(px + 1, py + 9, 14, 1); break;
    case 'well': g.fillStyle = '#5a5a60'; g.fillRect(px + 2, py + 4, 28, 12); g.fillStyle = '#1a2a4a'; g.fillRect(px + 6, py + 6, 20, 7); g.fillStyle = '#4a3018'; g.fillRect(px + 3, py - 6, 2, 10); g.fillRect(px + 27, py - 6, 2, 10); g.fillRect(px + 3, py - 7, 26, 2); break;
    case 'obelisk': break;   // kreslí se živě (svítí)
  }
}

// ---------- Kolize ----------

function solidAt(W, px, py) { return !isFloor(W, Math.floor(px / TILE), Math.floor(py / TILE)); }

function circleBlocked(W, x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (isFloor(W, tx, ty)) continue;
    const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE)), cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
    if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
  }
  return false;
}

// Posun s klouzáním po stěnách; vrací true, pokud se pohnul
function moveEntity(W, e, dx, dy) {
  let moved = false;
  if (dx && !circleBlocked(W, e.x + dx, e.y, e.r)) { e.x += dx; moved = true; }
  if (dy && !circleBlocked(W, e.x, e.y + dy, e.r)) { e.y += dy; moved = true; }
  return moved;
}

function lineOfSight(W, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) if (solidAt(W, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}

// Volná cesta pro těleso o poloměru r (na rozdíl od výhledu počítá s šířkou)
function lineClear(W, x0, y0, x1, y1, r) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 4);
  for (let i = 1; i <= n; i++) if (circleBlocked(W, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r)) return false;
  return true;
}

// Mapa vzdáleností od cíle (BFS) — nepřátelé podle ní obcházejí stěny
function flowField(W, px, py, maxD = 30) {
  const dist = new Int16Array(W.w * W.h).fill(-1);
  const sx = Math.floor(px / TILE), sy = Math.floor(py / TILE);
  if (!isFloor(W, sx, sy)) return dist;
  const q = [sy * W.w + sx]; dist[q[0]] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], d = dist[c];
    if (d >= maxD) continue;
    const x = c % W.w, y = (c / W.w) | 0;
    for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ddx, ny = y + ddy, n = ny * W.w + nx;
      if (isFloor(W, nx, ny) && dist[n] < 0) { dist[n] = d + 1; q.push(n); }
    }
  }
  return dist;
}

// Mapa vzdáleností k nejbližšímu z více bodů (všichni hrdinové) – nepřátelé jdou k tomu nejbližšímu
function flowFieldMulti(W, pts, maxD = 30) {
  if (pts.length === 1) return flowField(W, pts[0].x, pts[0].y, maxD);
  const dist = new Int16Array(W.w * W.h).fill(-1), q = [];
  pts.forEach(p => {
    const sx = Math.floor(p.x / TILE), sy = Math.floor(p.y / TILE), c = sy * W.w + sx;
    if (isFloor(W, sx, sy) && dist[c] < 0) { dist[c] = 0; q.push(c); }
  });
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], d = dist[c];
    if (d >= maxD) continue;
    const x = c % W.w, y = (c / W.w) | 0;
    for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ddx, ny = y + ddy, n = ny * W.w + nx;
      if (isFloor(W, nx, ny) && dist[n] < 0) { dist[n] = d + 1; q.push(n); }
    }
  }
  return dist;
}

// Cesta pro hrdinu (BFS + vyhlazení přímou viditelností)
function findPath(W, x0, y0, x1, y1) {
  const sx = Math.floor(x0 / TILE), sy = Math.floor(y0 / TILE);
  let tx = Math.floor(x1 / TILE), ty = Math.floor(y1 / TILE);
  if (!isFloor(W, tx, ty)) return null;
  const prev = new Int32Array(W.w * W.h).fill(-1), start = sy * W.w + sx, goal = ty * W.w + tx;
  const q = [start]; prev[start] = start;
  for (let qi = 0; qi < q.length && qi < 6000; qi++) {
    const c = q[qi];
    if (c === goal) break;
    const x = c % W.w, y = (c / W.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * W.w + nx;
      if (!isFloor(W, nx, ny) || prev[n] >= 0) continue;
      if (dx && dy && (!isFloor(W, x + dx, y) || !isFloor(W, x, y + dy))) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return null;
  const pts = [];
  for (let c = goal; c !== start; c = prev[c]) pts.push({ x: (c % W.w) * TILE + 8, y: ((c / W.w) | 0) * TILE + 8 });
  pts.reverse();
  pts[pts.length - 1] = { x: x1, y: y1 };
  // vyhlazení: přeskoč body, na které je přímý výhled
  const out = []; let cx = x0, cy = y0, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(W, cx, cy, pts[j].x, pts[j].y, 5)) j--;
    out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1;
  }
  return out;
}

// Najde nejbližší volné místo kolem bodu
function nearestFree(W, x, y, r) {
  for (let rad = 0; rad < 12; rad++) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a / 16 * Math.PI * 2) * rad * 8, py = y + Math.sin(a / 16 * Math.PI * 2) * rad * 8;
    if (!circleBlocked(W, px, py, r)) return { x: px, y: py };
  }
  return { x, y };
}
