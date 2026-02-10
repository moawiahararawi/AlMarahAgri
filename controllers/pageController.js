// controllers/pageController.js
const Page = require("../models/pageModel");

exports.getPageByKey = async (req, res) => {
  const page = await Page.findOne({
    key: req.params.key,
    isActive: true,
  });

  if (!page) {
    return res.status(404).json({ message: "Page not found" });
  }

  res.json(page);
};

exports.updatePage = async (req, res) => {
  const page = await Page.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(page);
};
