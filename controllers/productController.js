const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const s3 = require("../utils/s3");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");
const factory = require("./handlersFactory");

// AWS S3 setup

// Multer setup
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("only images allowed", 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadProductImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeProductImages = asyncHandler(async (req, res, next) => {
  // 1) Image cover
  if (req.files.imageCover) {
    const ext = req.files.imageCover[0].mimetype.split("/")[1];
    const imageCoverFilename = `products/${uuidv4()}-${Date.now()}-cover.${ext}`;

    const buffer = await sharp(req.files.imageCover[0].buffer)
      // .resize(2000, 1333) // optional
      .toBuffer();

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: imageCoverFilename,
      Body: buffer,
      ContentType: req.files.imageCover[0].mimetype,
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();
    req.body.imageCover = uploadResult.Location;
  }

  // 2) Multiple images
  req.body.images = [];
  if (req.files.images) {
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const ext = img.mimetype.split("/")[1];
        const filename = `products/${uuidv4()}-${Date.now()}-${
          index + 1
        }.${ext}`;

        const buffer = await sharp(img.buffer)
          // .resize(800, 800) // optional
          .toBuffer();

        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: img.mimetype,
          ACL: "public-read",
        };

        const uploadResult = await s3.upload(params).promise();
        req.body.images.push(uploadResult.Location);
      }),
    );
  }

  next();
});

// --- Factory methods unchanged ---
exports.getProducts = factory.getAll(Product, "Products");
exports.getProduct = factory.getOne(Product, "reviews");
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
