const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, required: true, maxlength: 2000 },
    quantity: { type: Number, required: true },
    sold: { type: Number, default: 0 },
    price: { type: Number, required: true },
    priceAfterDiscount: Number,
    availableColors: [String],
    imageCover: { type: String, required: true },
    images: [String],
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: [{ type: mongoose.Schema.ObjectId, ref: "SubCategory" }],
    brand: { type: mongoose.Schema.ObjectId, ref: "Brand" },
    ratingsAverage: {
      type: Number,
      min: 1,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: { type: Number, default: 0 },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Virtual populate for reviews
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

// Fix image URLs
const setImageUrl = (doc) => {
  if (doc.imageCover && !doc.imageCover.startsWith("http")) {
    doc.imageCover = `${process.env.BASE_URL}/products/${doc.imageCover}`;
  }
  if (doc.images && doc.images.length > 0) {
    doc.images = doc.images.map((img) =>
      img.startsWith("http") ? img : `${process.env.BASE_URL}/products/${img}`,
    );
  }
};

// Hooks
productSchema.post("init", (doc) => setImageUrl(doc));
productSchema.post("save", (doc) => setImageUrl(doc));

module.exports = mongoose.model("Product", productSchema);
