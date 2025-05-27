import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const GRID_SIZE = 13;
const CELL_SIZE = 40;
const HEADER_HEIGHT = 30;

export default function Game() {
  const canvasRef = useRef();
  const socketRef = useRef();
  const [state, setState] = useState({ players: {}, bombs: [], staticWalls: [], breakableWalls: [], explosions: [] });
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;
    socket.on('state', data => setState(data));
    socket.on('dead', () => setDead(true));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = GRID_SIZE * CELL_SIZE;
    const height = GRID_SIZE * CELL_SIZE + HEADER_HEIGHT;
    canvas.width = width;
    canvas.height = height;

    // fundo geral
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // cabeçalho com título
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    const title = 'BomberJS';
    const textW = ctx.measureText(title).width;
    ctx.fillText(title, (width - textW) / 2, 20);

    // desenha área de jogo abaixo do cabeçalho
    ctx.translate(0, HEADER_HEIGHT);

    // grid
    ctx.strokeStyle = '#bbb';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i*CELL_SIZE,0); ctx.lineTo(i*CELL_SIZE,GRID_SIZE*CELL_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*CELL_SIZE); ctx.lineTo(GRID_SIZE*CELL_SIZE,i*CELL_SIZE); ctx.stroke();
    }

    // paredes estáticas
    state.staticWalls.forEach(w=>{
      ctx.fillStyle='#666';
      ctx.fillRect(w.x*CELL_SIZE, w.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    // paredes destrutíveis
    state.breakableWalls.forEach(w=>{
      ctx.fillStyle='#8b4513';
      ctx.fillRect(w.x*CELL_SIZE, w.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    // explosões
    state.explosions.forEach(e=>{
      ctx.fillStyle='rgba(255,69,0,0.6)';
      ctx.fillRect(e.x*CELL_SIZE, e.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    // bombas
    state.bombs.forEach(b=>{
      ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(b.x*CELL_SIZE + CELL_SIZE/2, b.y*CELL_SIZE + CELL_SIZE/2, CELL_SIZE/4, 0, 2*Math.PI); ctx.fill();
    });
    // jogadores
    Object.entries(state.players).forEach(([id,p])=>{
      if(p.dead) return;
      ctx.fillStyle = id===socketRef.current.id ? '#1e90ff' : '#dc143c';
      ctx.fillRect(p.x*CELL_SIZE+8, p.y*CELL_SIZE+8, CELL_SIZE-16, CELL_SIZE-16);
    });

    // HUD de bomba
    const me = state.players[socketRef.current.id];
    if(me) {
      ctx.font='14px sans-serif'; ctx.fillStyle='#333';
      const hud = me.canBomb ? '💣 Pronta' : `⌛ ${me.cooldown}s`;
      ctx.fillText(hud, 5, GRID_SIZE*CELL_SIZE - 5);
    }

    // mensagem de morte
    if(dead) {
      ctx.font='24px sans-serif'; ctx.fillStyle='#333';
      ctx.fillText('Você morreu!', (GRID_SIZE*CELL_SIZE)/2 - 60, (GRID_SIZE*CELL_SIZE)/2);
    }
  });

  useEffect(() => {
    const handleKey = e => {
      if(dead) return;
      const dirs = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
      if(dirs[e.key]) socketRef.current.emit('move', dirs[e.key]);
      if(e.key===' ') socketRef.current.emit('bomb');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dead]);

  return <canvas ref={canvasRef} />;
}
