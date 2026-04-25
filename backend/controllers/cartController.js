const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name price image stock');
    if (!cart) {
        cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
    }

    res.json({
        status: 'success',
        message: 'Cart fetched successfully',
        data: cart,
    });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
    }

    const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);

    if (itemIndex > -1) {
        // Product exists in the cart, update the quantity
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].price = product.price;
    } else {
        // Product does not exist in cart, add new item
        cart.items.push({
            product: productId,
            quantity: quantity,
            price: product.price,
        });
    }

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    await cart.save();
    // Re-populate to send full product details
    cart = await Cart.findById(cart._id).populate('items.product', 'name price image stock');

    res.json({
        status: 'success',
        message: 'Item added to cart',
        data: cart,
    });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);

    if (itemIndex > -1) {
        if (quantity > 0) {
            cart.items[itemIndex].quantity = quantity;
        } else {
            // Remove item if quantity is 0 or less
            cart.items.splice(itemIndex, 1);
        }

        // Recalculate total
        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        await cart.save();
        cart = await Cart.findById(cart._id).populate('items.product', 'name price image stock');

        res.json({
            status: 'success',
            message: 'Cart updated',
            data: cart,
        });
    } else {
        res.status(404);
        throw new Error('Item not in cart');
    }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Cart not found');
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // Recalculate total
    cart.totalPrice = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    await cart.save();

    res.json({
        status: 'success',
        message: 'Item removed from cart',
        data: cart,
    });
});

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
};
