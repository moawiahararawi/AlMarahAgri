const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const s3 = require("../utils/s3");
const factory = require("./handlersFactory");
const { uploadSingleImage } = require("../middlewares/imageUpload");
const Category = require("../models/categoryModel");

// Upload
exports.uploadCategoryImage = uploadSingleImage("image");

// Resize & Upload
exports.resizeCategoryImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const buffer = await sharp(req.file.buffer)
    .resize(600, 600)
    .jpeg({ quality: 90 })
    .toBuffer();

  const key = `categories/${uuidv4()}-${Date.now()}.jpeg`;

  const upload = await s3
    .upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
    .promise();

  req.body.image = upload.Location; // FULL URL
  next();
});

// CRUD
exports.getCategories = factory.getAll(Category);
exports.getCategory = factory.getOne(Category);
exports.createCategory = factory.createOne(Category);
exports.updateCategory = factory.updateOne(Category);
exports.deleteCategory = factory.deleteOne(Category);
