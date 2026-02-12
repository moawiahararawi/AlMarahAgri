const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const s3 = require("../utils/s3");

const factory = require("./handlersFactory");
const { uploadSingleImage } = require("../middlewares/imageUpload");
const Category = require("../models/categoryModel");

// AWS S3 setup

// Middleware to handle single image upload
exports.uploadCategoryImage = uploadSingleImage("image");

// Resize and upload to S3
exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const ext = req.file.mimetype.split("/")[1];
  const filename = `categories/${uuidv4()}-${Date.now()}.${ext}`;

  // Resize using Sharp
  const buffer = await sharp(req.file.buffer)
    // .resize(500, 500) // optional
    .toBuffer();

  // Upload to S3
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // e.g., "almarah-products-bucket"
    Key: filename,
    Body: buffer,
    ContentType: req.file.mimetype,
  };

  const uploadResult = await s3.upload(params).promise();

  // Save the full S3 URL in the DB
  req.body.image = uploadResult.Location; // this is the public S3 URL
  next();
});

// --- Factory methods unchanged ---
exports.getCategories = factory.getAll(Category);
exports.getCategory = factory.getOne(Category);
exports.createCategory = factory.createOne(Category);
exports.updateCategory = factory.updateOne(Category);
exports.deleteCategory = factory.deleteOne(Category);
exports.deleteAll = factory.deleteAll(Category);
