// ============================================================
// CRATEVAULT — MAIN FRONTEND APP
// ============================================================

// ── STATE ────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('cv_token') || null,
  user: null,
  coins: 0,
  inventory: [],
  selectedItems: new Set(),       // for sell multi-select
  currentCrate: null,
  currentLbTab: 'richest',
  lbData: {},
  tradeRoom: null,
  tradeRoomId: null,
  tradePartnerSocket: null,
  tradeMyItems: [],
  tradeTheirItems: [],
  tradeMyAccepted: false,
  tradeTheirAccepted: false,
  tradeCountdownActive: false,
  socket: null,
  onlinePlayers: [],
};

// ── API HELPER ───────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── TOAST ────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ── SCREEN MANAGEMENT ───────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === id);
  });
}

// ── AUTH ─────────────────────────────────────────────────
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(tab.dataset.tab + '-form').classList.remove('hidden');
  });
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'Fill in all fields.'; return; }
  try {
    const data = await api('/auth/login', 'POST', { username, password });
    onLogin(data);
  } catch(e) { errEl.textContent = e.message; }
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'Fill in all fields.'; return; }
  try {
    const data = await api('/auth/register', 'POST', { username, password });
    onLogin(data);
  } catch(e) { errEl.textContent = e.message; }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('cv_token');
  state.token = null;
  state.user = null;
  if (state.socket) state.socket.disconnect();
  showScreen('auth-screen');
  toast('Logged out.');
});

function onLogin(data) {
  state.token = data.token;
  state.user = data.user;
  state.coins = data.user.coins;
  localStorage.setItem('cv_token', data.token);
  document.getElementById('nav-username').textContent = data.user.username;
  updateCoinDisplay(data.user.coins);
  showScreen('game-screen');
  initSocket();
  loadCratesPage();
  showPage('crates');
  loadInventory();
}

function updateCoinDisplay(coins) {
  state.coins = coins;
  document.getElementById('coin-balance').textContent = fmtNum(coins);
  document.getElementById('opening-coin-balance').textContent = fmtNum(coins);
}

// ── AUTO LOGIN ───────────────────────────────────────────
(async () => {
  if (state.token) {
    try {
      const data = await api('/game/profile');
      onLogin({ token: state.token, user: { ...data, username: data.username } });
      const inv = await api('/game/inventory');
      state.inventory = inv.inventory;
      updateCoinDisplay(inv.coins);
    } catch(e) {
      localStorage.removeItem('cv_token');
      state.token = null;
      showScreen('auth-screen');
    }
  } else {
    showScreen('auth-screen');
  }
  spawnAuthParticles();
})();

// ── NAV ──────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    showPage(page);
    if (page === 'inventory') renderInventory();
    if (page === 'trade') renderTradePage();
    if (page === 'leaderboard') loadLeaderboard();
    if (page === 'history') loadTradeHistory();
  });
});

// ══════════════════════════════════════════════════════════
// CRATES PAGE
// ══════════════════════════════════════════════════════════
function loadCratesPage() {
  const grid = document.getElementById('crates-grid');
  grid.innerHTML = '';
  CRATES.forEach(crate => {
    const card = document.createElement('div');
    card.className = 'crate-card';
    card.style.setProperty('--crate-color', crate.color === '#000000' ? '#444' : crate.color);
    card.style.setProperty('--crate-glow', (crate.color === '#000000' ? '#44444444' : crate.color + '33'));
    card.innerHTML = `
      <span class="crate-emoji">${crate.icon}</span>
      <div class="crate-name">${crate.name}</div>
      <div class="crate-desc">${crate.description}</div>
      <div class="crate-price">🪙 ${crate.price.toLocaleString()}</div>
    `;
    card.addEventListener('click', () => openCratePage(crate));
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════════
// CRATE OPENING PAGE
// ══════════════════════════════════════════════════════════
function openCratePage(crate) {
  state.currentCrate = crate;
  document.getElementById('opening-crate-name').textContent = crate.name.toUpperCase();
  document.getElementById('open-price-display').textContent = `Cost: 🪙 ${crate.price.toLocaleString()}`;
  document.getElementById('opening-coin-balance').textContent = fmtNum(state.coins);
  document.getElementById('result-panel').classList.add('hidden');
  document.getElementById('btn-open-crate').disabled = false;

  // Build info panel
  buildCrateInfoPanel(crate);

  // Build spin track (pre-populate with random items)
  buildSpinTrack(crate);

  showPage('opening');
}

document.getElementById('back-from-opening').addEventListener('click', () => showPage('crates'));

function buildCrateInfoPanel(crate) {
  const panel = document.getElementById('crate-info-panel');
  const crateItems = crate.items.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  
  // Group by rarity
  const grouped = {};
  crateItems.forEach(item => {
    if (!grouped[item.rarity]) grouped[item.rarity] = [];
    grouped[item.rarity].push(item);
  });

  const rarityOrder = ['ultra4','ultra3','ultra2','ultra1','divine','mythic','legendary','epic','rare','uncommon','common'];
  
  panel.innerHTML = `
    <div style="flex:1;">
      <div style="font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.1em;color:var(--text-2);margin-bottom:10px;">POSSIBLE DROPS</div>
      <div class="crate-info-items" id="crate-info-items"></div>
    </div>
    <div style="min-width:140px;">
      <div style="font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.1em;color:var(--text-2);margin-bottom:10px;">ODDS</div>
      <div id="crate-odds-list" style="display:flex;flex-direction:column;gap:4px;"></div>
    </div>
  `;

  const itemsEl = document.getElementById('crate-info-items');
  const oddsEl = document.getElementById('crate-odds-list');

  rarityOrder.forEach(rar => {
    if (!grouped[rar]) return;
    const r = RARITIES[rar];
    grouped[rar].forEach(item => {
      const pill = document.createElement('div');
      pill.className = 'crate-item-pill';
      pill.style.setProperty('--pill-color', r.color === 'rainbow' ? '#fff' : r.color);
      pill.style.borderColor = r.color === 'rainbow' ? '#fff' : r.color + '66';
      pill.style.color = r.color === 'rainbow' ? '#fff' : r.color;
      pill.innerHTML = `${item.icon} <span style="color:var(--text-2)">${item.name}</span>`;
      itemsEl.appendChild(pill);
    });
  });

  const rarInCrate = [...new Set(crateItems.map(i => i.rarity))];
  rarityOrder.filter(r => rarInCrate.includes(r)).forEach(rar => {
    const r = RARITIES[rar];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:0.75rem;';
    row.innerHTML = `
      <span style="color:${r.color === 'rainbow' ? '#fff' : r.color};font-family:var(--font-display);font-size:0.65rem;letter-spacing:0.05em;">${r.name}</span>
      <span style="color:var(--text-3);font-family:var(--font-mono);font-size:0.65rem;">${rarityOdds(rar)}</span>
    `;
    oddsEl.appendChild(row);
  });
}

function buildSpinTrack(crate) {
  const track = document.getElementById('spin-track');
  track.innerHTML = '';
  track.style.transform = 'translateX(0)';
  
  const pool = crate.items.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  
  // Generate 60 random items for the track
  for (let i = 0; i < 60; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    const r = RARITIES[item.rarity];
    const el = document.createElement('div');
    el.className = 'spin-item';
    el.style.borderColor = r.color === 'rainbow' ? '#fff' : r.color + '88';
    el.innerHTML = `<span>${item.icon}</span><div class="spin-item-name">${item.name}</div>`;
    track.appendChild(el);
  }
}

// OPEN CRATE BUTTON
document.getElementById('btn-open-crate').addEventListener('click', async () => {
  const crate = state.currentCrate;
  if (!crate) return;
  if (state.coins < crate.price) { toast('Not enough coins! 🪙', 'error'); return; }

  const btn = document.getElementById('btn-open-crate');
  btn.disabled = true;
  document.getElementById('result-panel').classList.add('hidden');

  try {
    // Animate first
    await animateSpin(crate);

    // Make API call
    const result = await api('/game/open-crate', 'POST', { crateId: crate.id });
    updateCoinDisplay(result.coins);
    
    // Update inventory
    await refreshInventory();

    // Show result
    showResult(result.item, result.rarity, result.invItem);

    // Ultra rare?
    if (['ultra1','ultra2','ultra3','ultra4','divine','mythic'].includes(result.item.rarity)) {
      setTimeout(() => showUltraOverlay(result.item), 800);
    }

    btn.disabled = false;
  } catch(e) {
    toast(e.message, 'error');
    btn.disabled = false;
  }
});

function animateSpin(crate) {
  return new Promise(resolve => {
    const track = document.getElementById('spin-track');
    const items = track.querySelectorAll('.spin-item');
    const itemW = 108; // 104px + 4px gap
    
    // Rebuild with fresh items
    buildSpinTrack(crate);
    const freshItems = track.querySelectorAll('.spin-item');

    // Position: land on item index 45 (near end)
    const landIndex = 44 + Math.floor(Math.random() * 3);
    const containerCenter = document.getElementById('spin-container').offsetWidth / 2;
    const targetX = -(landIndex * itemW - containerCenter + itemW/2);

    // Quick spin first
    track.style.transition = 'transform 3.5s cubic-bezier(0.12, 0, 0.08, 1)';
    track.style.transform = `translateX(${targetX}px)`;

    // Highlight landing item
    setTimeout(() => {
      if (freshItems[landIndex]) {
        freshItems[landIndex].classList.add('landing');
      }
      resolve();
    }, 3600);
  });
}

function showResult(item, rarityData, invItem) {
  const r = rarityData || RARITIES[item.rarity];
  const panel = document.getElementById('result-panel');
  const color = r.color === 'rainbow' ? '#fff' : r.color;
  
  panel.style.setProperty('--result-color', color);
  panel.style.setProperty('--result-glow', r.glow || color + '44');
  
  if (item.rarity === 'divine') panel.className = 'result-panel rarity-divine';
  else panel.className = 'result-panel';

  document.getElementById('result-icon').textContent = item.icon;
  document.getElementById('result-name').textContent = item.name;
  document.getElementById('result-rarity').textContent = r.name.toUpperCase();
  document.getElementById('result-rarity').style.color = color;
  document.getElementById('result-rarity').style.borderColor = color + '88';
  document.getElementById('result-value').textContent = `Value: 🪙 ${fmtNum(item.value)}`;
  panel.classList.remove('hidden');

  // Sell button
  document.getElementById('btn-sell-result').onclick = async () => {
    if (!invItem) return;
    try {
      const res = await api('/game/sell', 'POST', { uniqueIds: [invItem.uniqueId] });
      updateCoinDisplay(res.coins);
      toast(`Sold for 🪙 ${fmtNum(res.earned)}!`, 'gold');
      await refreshInventory();
      panel.classList.add('hidden');
    } catch(e) { toast(e.message, 'error'); }
  };

  document.getElementById('btn-keep-item').onclick = () => {
    panel.classList.add('hidden');
    toast(`${item.icon} ${item.name} kept!`, 'success');
  };

  document.getElementById('btn-open-again').onclick = () => {
    panel.classList.add('hidden');
    document.getElementById('btn-open-crate').click();
  };
}

// ══════════════════════════════════════════════════════════
// INVENTORY PAGE
// ══════════════════════════════════════════════════════════
async function refreshInventory() {
  try {
    const data = await api('/game/inventory');
    state.inventory = data.inventory;
    state.coins = data.coins;
  } catch(e) {}
}

async function loadInventory() {
  await refreshInventory();
  if (document.getElementById('page-inventory').classList.contains('active')) renderInventory();
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  const search = document.getElementById('inv-search').value.toLowerCase();
  const sort = document.getElementById('inv-sort').value;

  let items = [...state.inventory];
  if (search) items = items.filter(i => i.item && i.item.name.toLowerCase().includes(search));

  items.sort((a, b) => {
    const ia = a.item, ib = b.item;
    if (!ia || !ib) return 0;
    if (sort === 'rarity')  return (RARITIES[ib.rarity]?.tier || 0) - (RARITIES[ia.rarity]?.tier || 0);
    if (sort === 'value')   return ib.value - ia.value;
    if (sort === 'name')    return ia.name.localeCompare(ib.name);
    if (sort === 'newest')  return new Date(b.obtainedAt) - new Date(a.obtainedAt);
    return 0;
  });

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-3);font-style:italic;font-size:0.85rem;grid-column:1/-1;">Your inventory is empty. Open some crates!</div>';
  } else {
    items.forEach(inv => renderItemCard(inv, grid, true));
  }

  const total = state.inventory.reduce((s, i) => s + (i.item ? i.item.value : 0), 0);
  document.getElementById('inv-count').textContent = `${state.inventory.length} items`;
  document.getElementById('inv-total-value').textContent = `Total value: ${fmtNum(total)} 🪙`;
}

function renderItemCard(inv, container, selectable = false) {
  const item = inv.item;
  if (!item) return;
  const r = RARITIES[item.rarity];
  const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
  const glow = r?.glow || '#9ca3af33';
  
  const card = document.createElement('div');
  card.className = 'item-card' + (item.rarity === 'divine' ? ' rarity-divine' : '');
  card.style.setProperty('--item-color', color + 'aa');
  card.style.setProperty('--item-glow', glow);
  card.dataset.uniqueId = inv.uniqueId;
  
  if (selectable && state.selectedItems.has(inv.uniqueId)) card.classList.add('selected');

  card.innerHTML = `
    <span class="item-icon">${item.icon}</span>
    <div class="item-name">${item.name}</div>
    <div class="item-value-small">🪙 ${fmtNum(item.value)}</div>
  `;

  if (selectable) {
    card.addEventListener('click', () => {
      if (state.selectedItems.has(inv.uniqueId)) {
        state.selectedItems.delete(inv.uniqueId);
        card.classList.remove('selected');
      } else {
        state.selectedItems.add(inv.uniqueId);
        card.classList.add('selected');
      }
    });
  }

  // Tooltip
  card.addEventListener('mouseenter', (e) => showTooltip(e, item, r));
  card.addEventListener('mouseleave', hideTooltip);
  card.addEventListener('mousemove', moveTooltip);

  container.appendChild(card);
  return card;
}

// Sell selected items
document.getElementById('btn-sell-selected').addEventListener('click', async () => {
  const ids = [...state.selectedItems];
  if (ids.length === 0) { toast('Select items to sell first.'); return; }
  try {
    const res = await api('/game/sell', 'POST', { uniqueIds: ids });
    updateCoinDisplay(res.coins);
    state.selectedItems.clear();
    toast(`Sold ${ids.length} item(s) for 🪙 ${fmtNum(res.earned)}!`, 'gold');
    await refreshInventory();
    renderInventory();
  } catch(e) { toast(e.message, 'error'); }
});

document.getElementById('inv-search').addEventListener('input', renderInventory);
document.getElementById('inv-sort').addEventListener('change', renderInventory);

// ── TOOLTIP ─────────────────────────────────────────────
function showTooltip(e, item, r) {
  const tt = document.getElementById('item-tooltip');
  const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
  document.getElementById('tt-icon').textContent = item.icon;
  document.getElementById('tt-name').textContent = item.name;
  document.getElementById('tt-rarity').textContent = r?.name || '';
  document.getElementById('tt-rarity').style.color = color;
  document.getElementById('tt-desc').textContent = item.desc || '';
  document.getElementById('tt-value').textContent = `🪙 ${item.value.toLocaleString()}`;
  tt.classList.remove('hidden');
  positionTooltip(e);
}
function hideTooltip() { document.getElementById('item-tooltip').classList.add('hidden'); }
function moveTooltip(e) { positionTooltip(e); }
function positionTooltip(e) {
  const tt = document.getElementById('item-tooltip');
  const x = Math.min(e.clientX + 12, window.innerWidth - 240);
  const y = Math.min(e.clientY + 12, window.innerHeight - 200);
  tt.style.left = x + 'px';
  tt.style.top = y + 'px';
}

// ══════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════
async function loadLeaderboard() {
  try {
    const data = await api('/game/leaderboard');
    state.lbData = data;
    renderLeaderboard(state.currentLbTab);
  } catch(e) { toast(e.message, 'error'); }
}

function renderLeaderboard(tab) {
  state.currentLbTab = tab;
  const list = document.getElementById('leaderboard-list');
  const rows = state.lbData[tab] || [];

  list.innerHTML = '';
  rows.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';

    const rankClass = i === 0 ? 'lb-rank-1' : i === 1 ? 'lb-rank-2' : i === 2 ? 'lb-rank-3' : '';
    const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;

    let valStr = '';
    if (tab === 'richest')    valStr = `🪙 ${fmtNum(p.coins)}`;
    if (tab === 'mostCrates') valStr = `${p.cratesOpened.toLocaleString()} crates`;
    if (tab === 'mostValue')  valStr = `🪙 ${fmtNum(p.totalValue)}`;

    row.innerHTML = `
      <div class="lb-rank ${rankClass}">${rankLabel}</div>
      <div class="lb-info">
        <div class="lb-username">${p.username}</div>
        <div class="lb-sub">Rarest: ${p.rarestItemIcon || '—'} ${p.rarestItemName || 'None'}</div>
      </div>
      <div class="lb-value">${valStr}</div>
    `;
    list.appendChild(row);
  });

  if (rows.length === 0) {
    list.innerHTML = '<div style="color:var(--text-3);font-style:italic;font-size:0.85rem;padding:16px;">No data yet.</div>';
  }
}

document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLeaderboard(tab.dataset.lb);
  });
});

// ══════════════════════════════════════════════════════════
// TRADE HISTORY
// ══════════════════════════════════════════════════════════
async function loadTradeHistory() {
  try {
    const data = await api('/game/trade-history');
    renderTradeHistory(data.tradeHistory);
  } catch(e) {}
}

function renderTradeHistory(history) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  
  if (!history || history.length === 0) {
    list.innerHTML = '<div style="color:var(--text-3);font-style:italic;font-size:0.85rem;">No trades yet.</div>';
    return;
  }

  [...history].reverse().forEach(trade => {
    const row = document.createElement('div');
    row.className = 'history-row';
    const date = new Date(trade.timestamp).toLocaleString();
    
    const givenHTML = (trade.itemsGiven || []).map(i => {
      const r = RARITIES[i.rarity];
      const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
      return `<span class="history-item-chip" style="color:${color};border-color:${color}66;">${i.name}</span>`;
    }).join('') || '<span style="color:var(--text-3)">Nothing</span>';

    const receivedHTML = (trade.itemsReceived || []).map(i => {
      const r = RARITIES[i.rarity];
      const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
      return `<span class="history-item-chip" style="color:${color};border-color:${color}66;">${i.name}</span>`;
    }).join('') || '<span style="color:var(--text-3)">Nothing</span>';

    row.innerHTML = `
      <div class="history-header">
        <span class="history-partner">Trade with ${trade.partnerName}</span>
        <span class="history-date">${date}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div>
          <div class="history-items-label">YOU GAVE:</div>
          <div class="history-items-list">${givenHTML}</div>
        </div>
        <div>
          <div class="history-items-label">YOU RECEIVED:</div>
          <div class="history-items-list">${receivedHTML}</div>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════
// TRADE PAGE
// ══════════════════════════════════════════════════════════
function renderTradePage() {
  renderOnlinePlayers();
  if (state.tradeRoomId) renderTradeRoom();
}

function renderOnlinePlayers() {
  const list = document.getElementById('online-players-list');
  const others = state.onlinePlayers.filter(p => p.username !== state.user?.username);
  
  list.innerHTML = '';
  if (others.length === 0) {
    list.innerHTML = '<div class="no-players">No other players online</div>';
    return;
  }

  others.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'online-player-chip';
    chip.innerHTML = `
      <div class="online-dot"></div>
      <span class="online-player-name">${p.username}</span>
      <button class="btn-trade-request" data-sid="${p.socketId}">TRADE</button>
    `;
    chip.querySelector('.btn-trade-request').addEventListener('click', () => {
      sendTradeRequest(p.socketId);
    });
    list.appendChild(chip);
  });
}

function sendTradeRequest(targetSocketId) {
  if (!state.socket) return;
  state.socket.emit('trade:request', { targetSocketId });
  toast('Trade request sent!');
}

function renderTradeRoom() {
  document.getElementById('trade-room').classList.remove('hidden');
  
  // Set player names
  if (state.user) document.getElementById('trade-you-name').textContent = state.user.username;
  
  // Render your items
  renderTradeItems('trade-items-you', state.tradeMyItems, true);
  renderTradeItems('trade-items-them', state.tradeTheirItems, false);
  
  // Render mini inventory
  renderTradeInventoryMini();
  
  // Update status indicators
  updateTradeStatus();
}

function renderTradeItems(containerId, items, isYours) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  if (items.length === 0) {
    el.innerHTML = `<div class="trade-empty-hint">${isYours ? 'Click items below to add' : 'Waiting for partner...'}</div>`;
    return;
  }
  items.forEach(item => {
    const r = RARITIES[item.rarity];
    const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.width = '80px';
    card.style.setProperty('--item-color', color + 'aa');
    card.style.setProperty('--item-glow', r?.glow || '#9ca3af33');
    card.innerHTML = `<span class="item-icon" style="font-size:1.5rem">${item.icon}</span><div class="item-name">${item.name}</div>`;
    
    if (isYours) {
      card.title = 'Click to remove';
      card.addEventListener('click', () => removeFromTrade(item.uniqueId));
    }
    card.addEventListener('mouseenter', (e) => showTooltip(e, item, r));
    card.addEventListener('mouseleave', hideTooltip);
    card.addEventListener('mousemove', moveTooltip);
    el.appendChild(card);
  });
}

function renderTradeInventoryMini() {
  const grid = document.getElementById('trade-inventory-mini');
  grid.innerHTML = '';
  const alreadyInTrade = new Set(state.tradeMyItems.map(i => i.uniqueId));
  
  state.inventory.forEach(inv => {
    const item = inv.item;
    if (!item) return;
    const r = RARITIES[item.rarity];
    const color = r?.color === 'rainbow' ? '#fff' : (r?.color || '#9ca3af');
    const inTrade = alreadyInTrade.has(inv.uniqueId);
    
    const card = document.createElement('div');
    card.className = 'item-card' + (inTrade ? ' selected' : '');
    card.style.width = '75px';
    card.style.setProperty('--item-color', color + 'aa');
    card.style.setProperty('--item-glow', r?.glow || '#9ca3af33');
    card.innerHTML = `<span class="item-icon" style="font-size:1.5rem">${item.icon}</span><div class="item-name">${item.name}</div>`;
    
    card.addEventListener('click', () => {
      if (inTrade) removeFromTrade(inv.uniqueId);
      else addToTrade(inv.uniqueId);
    });
    card.addEventListener('mouseenter', (e) => showTooltip(e, item, r));
    card.addEventListener('mouseleave', hideTooltip);
    card.addEventListener('mousemove', moveTooltip);
    grid.appendChild(card);
  });
}

function addToTrade(uniqueId) {
  if (!state.tradeRoomId || !state.socket) return;
  state.socket.emit('trade:add-item', { roomId: state.tradeRoomId, uniqueId });
}

function removeFromTrade(uniqueId) {
  if (!state.tradeRoomId || !state.socket) return;
  state.socket.emit('trade:remove-item', { roomId: state.tradeRoomId, uniqueId });
}

function updateTradeStatus() {
  const youEl = document.getElementById('trade-status-you');
  const themEl = document.getElementById('trade-status-them');
  
  if (state.tradeMyAccepted) {
    youEl.textContent = '✓ ACCEPTED';
    youEl.style.color = '#22c55e';
  } else {
    youEl.textContent = '— Pending';
    youEl.style.color = 'var(--text-3)';
  }

  if (state.tradeTheirAccepted) {
    themEl.textContent = '✓ ACCEPTED';
    themEl.style.color = '#22c55e';
  } else {
    themEl.textContent = '— Pending';
    themEl.style.color = 'var(--text-3)';
  }
}

// Accept trade button
document.getElementById('btn-accept-trade').addEventListener('click', () => {
  if (!state.tradeRoomId || !state.socket) return;
  state.socket.emit('trade:accept', { roomId: state.tradeRoomId });
  state.tradeMyAccepted = true;
  updateTradeStatus();
  toast('You accepted the trade. Waiting for partner...');
});

// Cancel trade
document.getElementById('btn-cancel-trade').addEventListener('click', () => {
  if (!state.tradeRoomId || !state.socket) return;
  state.socket.emit('trade:cancel', { roomId: state.tradeRoomId });
  resetTradeState();
  toast('Trade cancelled.', 'error');
});

function resetTradeState() {
  state.tradeRoomId = null;
  state.tradeMyItems = [];
  state.tradeTheirItems = [];
  state.tradeMyAccepted = false;
  state.tradeTheirAccepted = false;
  state.tradeCountdownActive = false;
  document.getElementById('trade-room').classList.add('hidden');
  document.getElementById('trade-final-modal').classList.add('hidden');
  document.getElementById('trade-message').textContent = '';
}

// Final accept
document.getElementById('btn-final-accept').addEventListener('click', () => {
  if (!state.tradeRoomId || !state.socket) return;
  if (!state.tradeCountdownActive) return;
  state.socket.emit('trade:final-accept', { roomId: state.tradeRoomId });
  document.getElementById('btn-final-accept').disabled = true;
  document.getElementById('btn-final-accept').textContent = 'Waiting for partner...';
});

document.getElementById('btn-cancel-final').addEventListener('click', () => {
  if (!state.tradeRoomId || !state.socket) return;
  state.socket.emit('trade:cancel', { roomId: state.tradeRoomId });
  resetTradeState();
  toast('Trade cancelled.', 'error');
});

function showFinalModal(myItems, theirItems) {
  const modal = document.getElementById('trade-final-modal');
  const summary = document.getElementById('final-trade-summary');
  
  const myName = state.user?.username || 'You';
  const theirName = document.getElementById('trade-them-name').textContent;

  const itemList = (items) => items.map(i => `${i.icon} ${i.name} (${RARITIES[i.rarity]?.name || ''})`).join(', ') || 'Nothing';

  summary.innerHTML = `
    <div style="margin-bottom:8px;"><strong style="color:var(--accent)">${myName} gives:</strong><br/><span>${itemList(myItems)}</span></div>
    <div><strong style="color:var(--gold)">${theirName} gives:</strong><br/><span>${itemList(theirItems)}</span></div>
  `;

  modal.classList.remove('hidden');
  
  // Countdown 5 seconds
  const btn = document.getElementById('btn-final-accept');
  const countEl = document.getElementById('countdown-num');
  btn.disabled = true;
  btn.className = 'btn-final-accept disabled';
  btn.textContent = 'FINAL ACCEPT';
  state.tradeCountdownActive = false;
  
  let count = 5;
  countEl.textContent = count;
  const cd = setInterval(() => {
    count--;
    countEl.textContent = count;
    if (count <= 0) {
      clearInterval(cd);
      btn.disabled = false;
      btn.className = 'btn-final-accept';
      state.tradeCountdownActive = true;
      document.getElementById('countdown-display').textContent = 'You may now FINAL ACCEPT!';
      document.getElementById('countdown-display').style.color = '#22c55e';
    }
  }, 1000);
}

// ══════════════════════════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════════════════════════
function initSocket() {
  const socket = window.io({ auth: { token: state.token } });
  state.socket = socket;

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error:', err.message);
  });

  // Online players list
  socket.on('players:online', (players) => {
    state.onlinePlayers = players;
    if (document.getElementById('page-trade').classList.contains('active')) {
      renderOnlinePlayers();
    }
  });

  // Chat messages
  socket.on('chat:message', (msg) => {
    appendChatMessage(msg.username, msg.text, false);
  });

  // Global announcements (ultra rare drops)
  socket.on('announce:ultra', (data) => {
    appendChatMessage('🌟 SYSTEM', data.message, true, 'chat-msg-announce');
    showGlobalBanner(data.message);
  });

  // Incoming trade request
  socket.on('trade:incoming', ({ fromSocketId, fromUsername }) => {
    showIncomingTradeRequest(fromSocketId, fromUsername);
  });

  socket.on('trade:request-declined', ({ username }) => {
    toast(`${username} declined your trade request.`, 'error');
  });

  // Trade room joined
  socket.on('trade:room-joined', ({ roomId, players }) => {
    state.tradeRoomId = roomId;
    state.tradeMyItems = [];
    state.tradeTheirItems = [];
    state.tradeMyAccepted = false;
    state.tradeTheirAccepted = false;
    
    // Find partner name
    const mySocketId = socket.id;
    const partnerSocketId = Object.keys(players).find(id => id !== mySocketId);
    const partner = partnerSocketId ? players[partnerSocketId] : null;
    if (partner) {
      document.getElementById('trade-them-name').textContent = partner.username;
      state.tradePartnerSocket = partnerSocketId;
    }

    showPage('trade');
    renderTradeRoom();
    toast('Trade room joined!', 'success');
  });

  // Trade state update
  socket.on('trade:state-update', ({ players }) => {
    updateTradeStateFromServer(players);
  });

  // Trade reset (item added/removed)
  socket.on('trade:reset', ({ message, players }) => {
    state.tradeMyAccepted = false;
    state.tradeTheirAccepted = false;
    state.tradeCountdownActive = false;
    document.getElementById('trade-final-modal').classList.add('hidden');
    document.getElementById('trade-message').textContent = `⚠️ ${message}`;
    document.getElementById('trade-message').style.color = 'var(--gold)';
    updateTradeStateFromServer(players);
    updateTradeStatus();
    toast(`⚠️ ${message}`, 'error');
  });

  // Countdown start
  socket.on('trade:countdown-start', ({ seconds }) => {
    const myItems = [...state.tradeMyItems];
    const theirItems = [...state.tradeTheirItems];
    showFinalModal(myItems, theirItems);
  });

  // Trade complete
  socket.on('trade:complete', async ({ message }) => {
    toast(`🎉 ${message}`, 'success');
    document.getElementById('trade-final-modal').classList.add('hidden');
    resetTradeState();
    await refreshInventory();
    if (document.getElementById('page-inventory').classList.contains('active')) renderInventory();
    appendChatMessage('🔄 TRADE', message, true, 'chat-msg-system');
  });

  // Trade cancelled
  socket.on('trade:cancelled', ({ message }) => {
    toast(message, 'error');
    resetTradeState();
    document.getElementById('trade-message').textContent = message;
  });

  // Trade error
  socket.on('trade:error', (message) => {
    toast(message, 'error');
  });
}

function updateTradeStateFromServer(players) {
  const mySocketId = state.socket?.id;
  if (!mySocketId) return;

  const myData = players[mySocketId];
  const partnerSocketId = Object.keys(players).find(id => id !== mySocketId);
  const theirData = partnerSocketId ? players[partnerSocketId] : null;

  if (myData) {
    state.tradeMyItems = myData.items;
    state.tradeMyAccepted = myData.accepted;
  }
  if (theirData) {
    state.tradeTheirItems = theirData.items;
    state.tradeTheirAccepted = theirData.accepted;
    document.getElementById('trade-them-name').textContent = theirData.username || 'Partner';
  }

  renderTradeItems('trade-items-you', state.tradeMyItems, true);
  renderTradeItems('trade-items-them', state.tradeTheirItems, false);
  renderTradeInventoryMini();
  updateTradeStatus();
}

// Incoming trade UI
function showIncomingTradeRequest(fromSocketId, fromUsername) {
  // Remove any existing
  document.querySelectorAll('.incoming-trade-modal').forEach(e => e.remove());
  
  const modal = document.createElement('div');
  modal.className = 'incoming-trade-modal';
  modal.innerHTML = `
    <h4>🤝 TRADE REQUEST</h4>
    <p><strong>${fromUsername}</strong> wants to trade with you!</p>
    <div class="incoming-trade-btns">
      <button class="btn-accept-trade-req">ACCEPT</button>
      <button class="btn-decline-trade-req">DECLINE</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.btn-accept-trade-req').addEventListener('click', () => {
    state.socket.emit('trade:accept-request', { fromSocketId });
    modal.remove();
  });
  modal.querySelector('.btn-decline-trade-req').addEventListener('click', () => {
    state.socket.emit('trade:decline-request', { fromSocketId });
    modal.remove();
    toast('Trade declined.');
  });

  setTimeout(() => modal.remove(), 30000);
}

// ── CHAT HELPERS ─────────────────────────────────────────
document.getElementById('chat-send').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !state.socket) return;
  state.socket.emit('chat:message', text);
  input.value = '';
}

function appendChatMessage(username, text, isSystem = false, extraClass = '') {
  const msgs = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = `chat-msg ${extraClass}`;
  el.innerHTML = isSystem
    ? `<span>${username}:</span> ${text}`
    : `<span class="chat-msg-user">${username}:</span> ${text}`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  
  // Trim old messages
  while (msgs.children.length > 100) msgs.removeChild(msgs.firstChild);
}

// ── GLOBAL BANNER ────────────────────────────────────────
function showGlobalBanner(msg) {
  const banner = document.getElementById('global-banner');
  banner.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 8000);
}

// ── ULTRA OVERLAY ────────────────────────────────────────
function showUltraOverlay(item) {
  const overlay = document.getElementById('ultra-overlay');
  const r = RARITIES[item.rarity];
  document.getElementById('ultra-icon').textContent = item.icon;
  document.getElementById('ultra-text').textContent = r?.name?.toUpperCase() + ' DROP!';
  document.getElementById('ultra-sub').textContent = 
    r?.display ? `Odds: ${r.display}` : `You pulled a ${r?.name} item!`;
  overlay.classList.remove('hidden');
  
  // Broadcast to other players via socket
  if (state.socket && state.user) {
    const rarDesc = r?.display ? `(${r.display})` : '';
    state.socket.emit('chat:message', `🌟 ${state.user.username} just pulled ${item.icon} ${item.name} ${rarDesc}!`);
  }
}

document.getElementById('btn-ultra-close').addEventListener('click', () => {
  document.getElementById('ultra-overlay').classList.add('hidden');
});

// ── AUTH PARTICLES ───────────────────────────────────────
function spawnAuthParticles() {
  const container = document.getElementById('auth-particles');
  if (!container) return;
  
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const dur = Math.random() * 8 + 4;
    const delay = Math.random() * 8;
    p.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      border-radius:50%;
      left:${x}%;top:${y}%;
      background:rgba(79,142,247,${Math.random() * 0.5 + 0.1});
      animation:float ${dur}s ${delay}s infinite ease-in-out;
      box-shadow:0 0 ${size*3}px rgba(79,142,247,0.5);
    `;
    container.appendChild(p);
  }
}

// ── ENTER KEY FOR AUTH ───────────────────────────────────
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});
document.getElementById('reg-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('register-btn').click();
});
