const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { ITEMS, RARITIES } = require('./gameData');

// Active trade rooms: { roomId: { players: [socketId, socketId], state: {...} } }
const tradeRooms = new Map();
// Online players: { socketId: { userId, username } }
const onlinePlayers = new Map();

function genUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

module.exports = function setupSockets(io) {

  // Authenticate socket on connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('username coins inventory');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] ${socket.username} connected (${socket.id})`);

    // Add to online players
    onlinePlayers.set(socket.id, { userId: socket.userId, username: socket.username });
    
    // Broadcast updated online list
    broadcastOnlinePlayers(io);

    // ── CHAT ───────────────────────────────────────────────
    socket.on('chat:message', (msg) => {
      const text = String(msg).trim().slice(0, 200);
      if (!text) return;
      io.emit('chat:message', {
        username: socket.username,
        text,
        ts: Date.now(),
      });
    });

    // ── TRADE REQUEST ──────────────────────────────────────
    socket.on('trade:request', ({ targetSocketId }) => {
      const target = onlinePlayers.get(targetSocketId);
      if (!target) return socket.emit('trade:error', 'Player is offline');
      if (targetSocketId === socket.id) return socket.emit('trade:error', 'Cannot trade with yourself');

      io.to(targetSocketId).emit('trade:incoming', {
        fromSocketId: socket.id,
        fromUsername: socket.username,
      });
    });

    socket.on('trade:accept-request', ({ fromSocketId }) => {
      // Create a trade room
      const roomId = genUID();
      const room = {
        roomId,
        players: {
          [socket.id]: { userId: socket.userId, username: socket.username, items: [], accepted: false, finalAccepted: false },
          [fromSocketId]: { userId: null, username: null, items: [], accepted: false, finalAccepted: false },
        },
        locked: false,
        countdownActive: false,
      };

      // Get from player info
      const fromPlayer = onlinePlayers.get(fromSocketId);
      if (fromPlayer) {
        room.players[fromSocketId].userId = fromPlayer.userId;
        room.players[fromSocketId].username = fromPlayer.username;
      }

      tradeRooms.set(roomId, room);
      socket.join(roomId);
      io.sockets.sockets.get(fromSocketId)?.join(roomId);

      io.to(roomId).emit('trade:room-joined', { roomId, players: sanitizeRoom(room) });
    });

    socket.on('trade:decline-request', ({ fromSocketId }) => {
      io.to(fromSocketId).emit('trade:request-declined', { username: socket.username });
    });

    // ── TRADE ROOM ─────────────────────────────────────────
    socket.on('trade:add-item', async ({ roomId, uniqueId }) => {
      const room = tradeRooms.get(roomId);
      if (!room || !room.players[socket.id]) return;

      const user = await User.findById(socket.userId).select('inventory');
      const invItem = user?.inventory.find(i => i.uniqueId === uniqueId);
      if (!invItem) return socket.emit('trade:error', 'Item not in inventory');

      const already = room.players[socket.id].items.find(i => i.uniqueId === uniqueId);
      if (already) return;

      const itemData = ITEMS.find(i => i.id === invItem.itemId);
      if (!itemData) return;

      room.players[socket.id].items.push({ uniqueId, itemId: invItem.itemId, ...itemData });

      // Reset accepts on change
      resetAccepts(room, roomId, io, 'Item added to trade.');
    });

    socket.on('trade:remove-item', ({ roomId, uniqueId }) => {
      const room = tradeRooms.get(roomId);
      if (!room || !room.players[socket.id]) return;

      room.players[socket.id].items = room.players[socket.id].items.filter(i => i.uniqueId !== uniqueId);
      resetAccepts(room, roomId, io, 'Item removed from trade.');
    });

    socket.on('trade:accept', ({ roomId }) => {
      const room = tradeRooms.get(roomId);
      if (!room || !room.players[socket.id]) return;
      if (room.locked) return;

      room.players[socket.id].accepted = true;

      const playerIds = Object.keys(room.players);
      const allAccepted = playerIds.every(id => room.players[id].accepted);

      io.to(roomId).emit('trade:state-update', { players: sanitizeRoom(room) });

      if (allAccepted) {
        // Start countdown phase
        room.locked = true;
        room.countdownActive = true;
        playerIds.forEach(id => room.players[id].finalAccepted = false);
        io.to(roomId).emit('trade:countdown-start', { seconds: 5 });
      }
    });

    socket.on('trade:final-accept', async ({ roomId }) => {
      const room = tradeRooms.get(roomId);
      if (!room || !room.players[socket.id]) return;
      if (!room.countdownActive) return socket.emit('trade:error', 'Countdown not finished');

      room.players[socket.id].finalAccepted = true;
      io.to(roomId).emit('trade:state-update', { players: sanitizeRoom(room) });

      const playerIds = Object.keys(room.players);
      const allFinal = playerIds.every(id => room.players[id].finalAccepted);

      if (allFinal) {
        // Execute the trade
        await executeTrade(room, roomId, io);
      }
    });

    socket.on('trade:cancel', ({ roomId }) => {
      const room = tradeRooms.get(roomId);
      if (!room) return;
      io.to(roomId).emit('trade:cancelled', { message: `${socket.username} cancelled the trade.` });
      tradeRooms.delete(roomId);
    });

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.username} disconnected`);
      onlinePlayers.delete(socket.id);
      broadcastOnlinePlayers(io);

      // Cancel any trades this player was in
      for (const [roomId, room] of tradeRooms.entries()) {
        if (room.players[socket.id]) {
          io.to(roomId).emit('trade:cancelled', { message: `${socket.username} disconnected.` });
          tradeRooms.delete(roomId);
        }
      }
    });
  });
};

// ── HELPERS ───────────────────────────────────────────────

function broadcastOnlinePlayers(io) {
  const list = Array.from(onlinePlayers.entries()).map(([sid, data]) => ({
    socketId: sid,
    username: data.username,
  }));
  io.emit('players:online', list);
}

function sanitizeRoom(room) {
  return Object.entries(room.players).reduce((acc, [sid, p]) => {
    acc[sid] = {
      username: p.username,
      items: p.items,
      accepted: p.accepted,
      finalAccepted: p.finalAccepted,
    };
    return acc;
  }, {});
}

function resetAccepts(room, roomId, io, message) {
  for (const id of Object.keys(room.players)) {
    room.players[id].accepted = false;
    room.players[id].finalAccepted = false;
  }
  room.locked = false;
  room.countdownActive = false;
  io.to(roomId).emit('trade:reset', { message, players: sanitizeRoom(room) });
}

async function executeTrade(room, roomId, io) {
  try {
    const playerIds = Object.keys(room.players);
    const [aId, bId] = playerIds;
    const aData = room.players[aId];
    const bData = room.players[bId];

    const userA = await User.findById(aData.userId);
    const userB = await User.findById(bData.userId);
    if (!userA || !userB) {
      io.to(roomId).emit('trade:error', 'Could not find players in DB');
      return;
    }

    // Remove items from A, add to B
    for (const ti of aData.items) {
      const idx = userA.inventory.findIndex(i => i.uniqueId === ti.uniqueId);
      if (idx === -1) { io.to(roomId).emit('trade:error', 'Item mismatch — trade cancelled'); return; }
      const [removed] = userA.inventory.splice(idx, 1);
      userB.inventory.push({ ...removed.toObject(), uniqueId: genUID(), obtainedAt: new Date() });
    }

    // Remove items from B, add to A
    for (const ti of bData.items) {
      const idx = userB.inventory.findIndex(i => i.uniqueId === ti.uniqueId);
      if (idx === -1) { io.to(roomId).emit('trade:error', 'Item mismatch — trade cancelled'); return; }
      const [removed] = userB.inventory.splice(idx, 1);
      userA.inventory.push({ ...removed.toObject(), uniqueId: genUID(), obtainedAt: new Date() });
    }

    // Log trade history for both
    const tradeId = genUID();
    const ts = new Date();
    userA.tradeHistory.push({
      tradeId, partnerId: bData.userId, partnerName: bData.username,
      itemsGiven: aData.items.map(i => ({ itemId: i.itemId, name: i.name, rarity: i.rarity, value: i.value })),
      itemsReceived: bData.items.map(i => ({ itemId: i.itemId, name: i.name, rarity: i.rarity, value: i.value })),
      timestamp: ts,
    });
    userB.tradeHistory.push({
      tradeId, partnerId: aData.userId, partnerName: aData.username,
      itemsGiven: bData.items.map(i => ({ itemId: i.itemId, name: i.name, rarity: i.rarity, value: i.value })),
      itemsReceived: aData.items.map(i => ({ itemId: i.itemId, name: i.name, rarity: i.rarity, value: i.value })),
      timestamp: ts,
    });

    // Update total values
    const calcVal = (user) => user.inventory.reduce((s, inv) => {
      const it = ITEMS.find(i => i.id === inv.itemId); return s + (it ? it.value : 0);
    }, 0);
    userA.totalValue = calcVal(userA);
    userB.totalValue = calcVal(userB);

    await userA.save();
    await userB.save();

    io.to(roomId).emit('trade:complete', {
      message: 'Trade completed successfully!',
      aItems: aData.items,
      bItems: bData.items,
    });

    tradeRooms.delete(roomId);
  } catch (err) {
    console.error('Trade execution error:', err);
    io.to(roomId).emit('trade:error', 'Trade failed due to server error');
  }
}
