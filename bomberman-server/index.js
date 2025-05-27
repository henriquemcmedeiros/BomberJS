const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const GRID_SIZE = 13;
const players = {};
const bombs = [];
const explosions = [];

// Defina paredes estáticas (bordas e internas)
const staticWalls = [];
for (let i = 0; i < GRID_SIZE; i++) {
  staticWalls.push({ x: i, y: 0 });
  staticWalls.push({ x: i, y: GRID_SIZE - 1 });
  staticWalls.push({ x: 0, y: i });
  staticWalls.push({ x: GRID_SIZE - 1, y: i });
}
for (let x = 2; x < GRID_SIZE - 2; x += 2) {
  for (let y = 2; y < GRID_SIZE - 2; y += 2) {
    staticWalls.push({ x, y });
  }
}

// Paredes destrutíveis iniciais
let breakableWalls = [
  { x: 3, y: 3 }, { x: 5, y: 5 }, { x: 7, y: 3 }
];

// Pontos de spawn possíveis e área proibida para caixas
const SPAWN_POINTS = [
  { x: 1, y: 1 },
  { x: 1, y: GRID_SIZE - 2 },
  { x: GRID_SIZE - 2, y: 1 },
  { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }
];
const forbidden = new Set();
SPAWN_POINTS.forEach(pt => {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const fx = pt.x + dx;
      const fy = pt.y + dy;
      if (fx >= 0 && fx < GRID_SIZE && fy >= 0 && fy < GRID_SIZE) {
        forbidden.add(`${fx},${fy}`);
      }
    }
  }
});

function calcExplosionArea(bomb) {
  const area = [{ x: bomb.x, y: bomb.y }];
  const dirs = [ { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 } ];
  for (const { dx, dy } of dirs) {
    let nx = bomb.x + dx;
    let ny = bomb.y + dy;
    while (
nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE &&
      !staticWalls.find(w => w.x === nx && w.y === ny)
    ) {
      area.push({ x: nx, y: ny });
      if (breakableWalls.find(w => w.x === nx && w.y === ny)) break;
      nx += dx;
      ny += dy;
    }
  }
  return area;
}

function getRandomSpawn() {
  const shuffled = [...SPAWN_POINTS].sort(() => 0.5 - Math.random());
  for (const pt of shuffled) {
    const occupied = staticWalls.concat(breakableWalls, bombs)
      .find(w => w.x === pt.x && w.y === pt.y) ||
      Object.values(players).find(p => p.x === pt.x && p.y === pt.y);
    if (!occupied) return pt;
  }
  return { x: 1, y: 1 };
}

function addRandomBoxes(count) {
  let attempts = 0;
  while (count > 0 && attempts < 200) {
    const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    const key = `${x},${y}`;
    const occupied = staticWalls.concat(breakableWalls, bombs)
      .find(w => w.x === x && w.y === y) ||
      Object.values(players).find(p => p.x === x && p.y === y);
    if (!occupied && !forbidden.has(key)) {
      breakableWalls.push({ x, y });
      count--;
    }
    attempts++;
  }
}

io.on('connection', socket => {
  const spawn = getRandomSpawn();
  players[socket.id] = { x: spawn.x, y: spawn.y, dead: false, lastBomb: 0 };
  addRandomBoxes(3);
  emitState();

  socket.on('move', dir => {
    const p = players[socket.id]; if (!p || p.dead) return;
    let nx = p.x, ny = p.y;
    if (dir === 'left') nx--; if (dir === 'right') nx++;
    if (dir === 'up') ny--; if (dir === 'down') ny++;
    if (nx < 1 || nx > GRID_SIZE - 2 || ny < 1 || ny > GRID_SIZE - 2) return;
    if (staticWalls.find(w => w.x === nx && w.y === ny)) return;
    if (breakableWalls.find(w => w.x === nx && w.y === ny)) return;
    if (bombs.find(b => b.x === nx && b.y === ny)) return;
    if (Object.values(players).find(pl => pl.x === nx && pl.y === ny && !pl.dead)) return;
    p.x = nx; p.y = ny; emitState();
  });

  socket.on('bomb', () => {
    const p = players[socket.id]; if (!p || p.dead) return;
    const now = Date.now(); if (now - p.lastBomb < 3000) return;
    p.lastBomb = now; const bomb = { x: p.x, y: p.y };
    bombs.push(bomb); emitState(); setTimeout(() => explodeBomb(bomb), 3000);
  });

  socket.on('disconnect', () => { delete players[socket.id]; emitState(); });

  function emitState() {
    const now = Date.now(); const enriched = {};
    Object.entries(players).forEach(([id, pl]) => {
      const diff = now - pl.lastBomb;
      enriched[id] = { x: pl.x, y: pl.y, dead: pl.dead,
        canBomb: diff >= 3000, cooldown: diff >= 3000 ? 0 : Math.ceil((3000 - diff)/1000)
      };
    });
    io.emit('state', { players: enriched, bombs, staticWalls, breakableWalls, explosions });
  }

  function explodeBomb(bomb) {
    const idx = bombs.findIndex(b => b.x===bomb.x&&b.y===bomb.y);
    if (idx>-1) bombs.splice(idx,1);
    const area = calcExplosionArea(bomb);
    area.forEach(c=>{const wi=breakableWalls.findIndex(w=>w.x===c.x&&w.y===c.y);if(wi>-1) breakableWalls.splice(wi,1);});
    explosions.push(...area);
    Object.entries(players).forEach(([id,pl])=>{if(!pl.dead&&area.find(c=>c.x===pl.x&&c.y===pl.y)){pl.dead=true;io.to(id).emit('dead');}});
    emitState(); setTimeout(()=>{explosions.length=0; emitState();},1000);
  }
});

const PORT = 3001;
server.listen(PORT, ()=>console.log(`Servidor ouvindo na porta ${PORT}`));