const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const s3 = require("../utils/s3");
const Product = require("../models/productModel");
const factory = require("./handlersFactory");
const { uploadMultipleImages } = require("../middlewares/imageUpload");

// ================= Upload =================
exports.uploadProductImages = uploadMultipleImages([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

// ================= Resize & Upload to S3 =================
exports.resizeProductImages = asyncHandler(async (req, res, next) => {
  if (!req.files) return next();

  // ---- Image Cover ----
  if (req.files.imageCover) {
    const coverBuffer = await sharp(req.files.imageCover[0].buffer)
      .resize(1200, 1200)
      .jpeg({ quality: 90 })
      .toBuffer();

    const coverKey = `products/${uuidv4()}-${Date.now()}-cover.jpeg`;

    const coverUpload = await s3
      .upload({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: coverKey,
        Body: coverBuffer,
        ContentType: "image/jpeg",
      })
      .promise();

    req.body.imageCover = coverUpload.Location; // FULL URL
  }

  // ---- Images ----
  req.body.images = [];

  if (req.files.images) {
    await Promise.all(
      req.files.images.map(async (img) => {
        const buffer = await sharp(img.buffer)
          .resize(1200, 1200)
          .jpeg({ quality: 90 })
          .toBuffer();

        const key = `products/${uuidv4()}-${Date.now()}.jpeg`;

        const upload = await s3
          .upload({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg",
          })
          .promise();

        req.body.images.push(upload.Location);
      }),
    );
  }

  next();
});

// ================= CRUD =================
exports.getProducts = factory.getAll(Product, "Products");
exports.getProduct = factory.getOne(Product, "reviews");
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
