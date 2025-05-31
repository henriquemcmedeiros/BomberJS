# BomberJS 🎮🔥

**BomberJS** é um jogo multiplayer inspirado no clássico *Bomberman*, desenvolvido com **React** no frontend e **Node.js + Socket.IO** no backend.

---

## 🧱 Funcionalidades

- ✅ Multiplayer em tempo real via WebSocket
- ✅ Movimento fluido no grid
- ✅ Colocação de bombas com detonação
- ✅ Explosão em cruz que afeta múltiplas direções
- ✅ Colisão com jogadores, paredes e caixas
- ✅ Jogadores eliminados deixam o jogo

---

## 🎮 Controles

- **Setas**: mover personagem  
- **Espaço**: colocar bomba

---

## 📦 Requisitos

- Node.js (v16 ou superior)
- npm (v7 ou superior)

---

## 🛠️ Instalação e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/henriquemcmedeiros/BomberJS.git
cd BomberJS
```

### 2. Inicie o Backend

```bash
cd bomberman-server
npm install
npm start
```

### 3. Inicie o Frontend

```bash
cd bomberman-client
npm install
npm start
```

---

## 🗂️ Estrutura do Projeto

```
BomberJS/
├── bomberman-client/  # Frontend com React
│   ├── public/        # Arquivos estáticos
│   └── src/           # Componentes e lógica do jogo
└── bomberman-server/  # Servidor WebSocket
```
