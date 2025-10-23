const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  date: { type: String, unique: true }, // e.g., 20251021
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
