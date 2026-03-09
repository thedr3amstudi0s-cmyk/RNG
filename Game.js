const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require ? require('crypto').randomUUID : () => Math.random().toString(36).slice(2);
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { RARITIES, ITEMS, CRATES } = require('../gameData');

// Helper: generate unique ID
function genUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Helper: roll an item from a crate
function rollItem(crateId, io) {
  const crate = CRATES.find(c => c.id === crateId);
  if (!crate) return null;

  // Build weighted pool from crate items
  const pool = crate.items.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  
  // Calculate weights
  const weighted = [];
  for (const item of pool) {
    const rarity = RARITIES[item.rarity];
    if (rarity) weighted.push({ item, weight: rarity.chance });
  }

  // Normalize weights
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const { item, weight } of weighted) {
    rand -= weight;
    if (rand <= 0) return item;
  }
  return weighted[weighted.length - 1].item;
}

// GET /api/game/crates - list all crates
router.get('/crates', (req, res) => {
  res.json(CRATES);
});

// GET /api/game/items - list all items
router.get('/items', (req, res) => {
  res.json(ITEMS);
});

// GET /api/game/rarities
router.get('/rarities', (req, res) => {
  res.json(RARITIES);
});

// POST /api/game/open-crate - open a crate
router.post('/open-crate', authMiddleware, async (req, res) => {
  try {
    const { crateId } = req.body;
    const crate = CRATES.find(c => c.id === crateId);
    if (!crate) return res.status(400).json({ error: 'Invalid crate' });

    const user = req.user;
    if (user.coins < crate.price) return res.status(400).json({ error: 'Not enough coins' });

    // Deduct coins
    user.coins -= crate.price;

    // Roll item
    const item = rollItem(crateId);
    if (!item) return res.status(500).json({ error: 'Failed to roll item' });

    // Add to inventory
    const invItem = {
      itemId: item.id,
      uniqueId: genUID(),
      crateSource: crateId,
      obtainedAt: new Date(),
    };
    user.inventory.push(invItem);
    user.cratesOpened += 1;

    // Update rarest item
    const rarity = RARITIES[item.rarity];
    if (rarity && rarity.tier > user.rarestTier) {
      user.rarestItem = item.id;
      user.rarestTier = rarity.tier;
    }

    // Update total value
    user.totalValue = user.inventory.reduce((sum, inv) => {
      const it = ITEMS.find(i => i.id === inv.itemId);
      return sum + (it ? it.value : 0);
    }, 0);

    await user.save();

    // Check for ultra rare - broadcast via socket (handled in server index)
    const isUltraRare = ['ultra1','ultra2','ultra3','ultra4','divine','mythic'].includes(item.rarity);

    res.json({
      item,
      invItem,
      coins: user.coins,
      isUltraRare,
      rarity: RARITIES[item.rarity],
    });
  } catch (err) {
    console.error('Open crate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/game/inventory - get user inventory
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const enriched = user.inventory.map(inv => {
      const item = ITEMS.find(i => i.id === inv.itemId);
      return { ...inv.toObject(), item };
    }).filter(e => e.item);
    res.json({ inventory: enriched, coins: user.coins });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/game/sell - sell items
router.post('/sell', authMiddleware, async (req, res) => {
  try {
    const { uniqueIds } = req.body; // array of uniqueId
    const user = req.user;
    let earned = 0;
    const soldNames = [];

    for (const uid of uniqueIds) {
      const idx = user.inventory.findIndex(i => i.uniqueId === uid);
      if (idx === -1) continue;
      const inv = user.inventory[idx];
      const item = ITEMS.find(i => i.id === inv.itemId);
      if (item) {
        earned += Math.floor(item.value * 0.7); // 70% sell price
        soldNames.push(item.name);
      }
      user.inventory.splice(idx, 1);
    }

    user.coins += earned;
    user.totalValue = user.inventory.reduce((sum, inv) => {
      const it = ITEMS.find(i => i.id === inv.itemId);
      return sum + (it ? it.value : 0);
    }, 0);

    await user.save();
    res.json({ earned, coins: user.coins, soldNames });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/game/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const richest = await User.find({}).sort({ coins: -1 }).limit(10).select('username coins cratesOpened rarestItem rarestTier totalValue');
    const mostCrates = await User.find({}).sort({ cratesOpened: -1 }).limit(10).select('username coins cratesOpened rarestItem rarestTier');
    const mostValue = await User.find({}).sort({ totalValue: -1 }).limit(10).select('username totalValue coins cratesOpened rarestItem rarestTier');

    // Enrich with rarest item name
    const enrich = (users) => users.map(u => {
      const rItem = u.rarestItem ? ITEMS.find(i => i.id === u.rarestItem) : null;
      return { ...u.toObject(), rarestItemName: rItem ? rItem.name : 'None', rarestItemIcon: rItem ? rItem.icon : '—' };
    });

    res.json({
      richest: enrich(richest),
      mostCrates: enrich(mostCrates),
      mostValue: enrich(mostValue),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/game/trade-history
router.get('/trade-history', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({ tradeHistory: user.tradeHistory });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/game/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const rItem = user.rarestItem ? ITEMS.find(i => i.id === user.rarestItem) : null;
    res.json({
      username: user.username,
      coins: user.coins,
      cratesOpened: user.cratesOpened,
      inventoryCount: user.inventory.length,
      totalValue: user.totalValue,
      rarestItem: rItem,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
