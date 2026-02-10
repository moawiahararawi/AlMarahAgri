// models/pageModel.js
const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // "about-us"
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String, // HTML from editor
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Page", pageSchema);
