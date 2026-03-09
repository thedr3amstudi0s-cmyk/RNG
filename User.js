const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const inventoryItemSchema = new mongoose.Schema({
  itemId:    { type: String, required: true },
  uniqueId:  { type: String, required: true }, // unique instance ID
  obtainedAt:{ type: Date, default: Date.now },
  crateSource:{ type: String },
  locked:    { type: Boolean, default: false }, // locked from trading
});

const tradeHistorySchema = new mongoose.Schema({
  tradeId:       { type: String },
  partnerId:     { type: String },
  partnerName:   { type: String },
  itemsGiven:    [{ itemId: String, name: String, rarity: String, value: Number }],
  itemsReceived: [{ itemId: String, name: String, rarity: String, value: Number }],
  timestamp:     { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  password:     { type: String, required: true },
  coins:        { type: Number, default: 500 },   // Start with 500 coins
  inventory:    [inventoryItemSchema],
  tradeHistory: [tradeHistorySchema],
  cratesOpened: { type: Number, default: 0 },
  totalValue:   { type: Number, default: 0 },
  rarestItem:   { type: String, default: null },
  rarestTier:   { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
  lastSeen:     { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
