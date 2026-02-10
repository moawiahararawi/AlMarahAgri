// routes/pageRoutes.js
const express = require("express");
const { getPageByKey, updatePage } = require("../controllers/pageController");

const { protect, allowedTo } = require("../middlewares/validatorMiddleware");

const router = express.Router();

// Public
router.get("/:key", getPageByKey);

// Admin
router.put("/admin/:id", protect, allowedTo("admin"), updatePage);

module.exports = router;
