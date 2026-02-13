const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const ApiError = require("../utils/apiError");
const factory = require("./handlersFactory");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");

// @desc    Create new order
// @route   POST /api/orders/cartId
// @access  Private/Protected/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const TAX_PRICE = 0;
  const SHIPPING_PRICE = 30;
  const FREE_SHIPPING_LIMIT = 300;

  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user : ${req.user._id}`, 404),
    );
  }

  const cartPrice = cart.totalAfterDiscount
    ? Number(cart.totalAfterDiscount)
    : cart.totalCartPrice;

  let shippingPrice = SHIPPING_PRICE;
  if (cartPrice >= FREE_SHIPPING_LIMIT) {
    shippingPrice = 0;
  }

  const totalOrderPrice = cartPrice + shippingPrice + TAX_PRICE;

  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.products,
    shippingAddress: req.body.shippingAddress,
    taxPrice: TAX_PRICE,
    shippingPrice: shippingPrice,
    totalOrderPrice: totalOrderPrice,
    paymentMethodType: "cash",
  });

  if (order) {
    const bulkOption = cart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            quantity: -item.count,
            sold: +item.count,
          },
        },
      },
    }));

    await Product.bulkWrite(bulkOption);
    await Cart.findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({
    status: "success",
    data: order,
  });
});

// @desc    Get Specific order
// @route   GET /api/orders/:id
// @access  Private/Protected/User-Admin
exports.getSpecificOrder = factory.getOne(Order);

exports.filterOrdersForLoggedUser = asyncHandler(async (req, res, next) => {
  if (req.user.role === "user") req.filterObject = { user: req.user._id };
  next();
});

// @desc    Get my orders
// @route   GET /api/orders
// @access  Private/Protected/User-Admin
exports.getAllOrders = factory.getAll(Order);

// @desc    Update  order to  paid
// @route   PUT /api/orders/:id/pay
// @access  Private/Protected/User-Admin
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no order for this id: ${req.params.id}`, 404),
    );
  }

  order.isPaid = true;
  order.paidAt = Date.now();

  const updatedOrder = await order.save();
  res.status(200).json({
    status: "Success",
    data: updatedOrder,
  });
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no order for this id: ${req.params.id}`, 404),
    );
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();

  const updatedOrder = await order.save();
  res.status(200).json({ status: "Success", data: updatedOrder });
});

// @desc    Create order checkout session
// @route   GET /api/orders/:cartId
// @access  Private/User
exports.checkoutSession = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user :${req.user._id}`, 404),
    );
  }

  const cartPrice = cart.totalAfterDiscount
    ? cart.totalAfterDiscount
    : cart.totalCartPrice;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: "egp",
          product_data: {
            name: "Order Payment",
          },
          unit_amount: cartPrice * 100,
        },
        quantity: 1,
      },
    ],

    success_url: `${process.env.BASE_URL}/user/allorders`,
    cancel_url: `${process.env.BASE_URL}/cart`,

    customer_email: req.user.email,

    // 🔑 IMPORTANT FIXES
    client_reference_id: req.user._id.toString(),

    metadata: {
      cartId: req.params.cartId,
    },
  });

  res.status(200).json({
    status: "success",
    session,
  });
});
const createOrderCheckout = async (session) => {
  const userId = session.client_reference_id;
  const cartId = session.client_reference_id;
  const totalOrderPrice = session.amount_total / 100;

  if (!cartId || !userId) return;

  const cart = await Cart.findById(cartId);
  const user = await User.findById(userId);

  if (!cart || !user) return;

  const order = await Order.create({
    user: user._id,
    cartItems: cart.products,
    totalOrderPrice,
    paymentMethodType: "card",
    isPaid: true,
    paidAt: Date.now(),
  });

  if (order) {
    const bulkOption = cart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: { quantity: -item.count, sold: +item.count },
        },
      },
    }));

    await Product.bulkWrite(bulkOption);
    await Cart.findByIdAndDelete(cart._id);
  }
};

// @desc    This webhook will run when stipe payment successfully paid
// @route   PUT /webhook-checkout
// @access  From stripe
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers["stripe-signature"].toString();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    createOrderCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};
