import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';
import Listing from '../models/Listing.js';

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {

  const cart = await Cart.findOne({ buyer: req.user.id }).populate('items.listing');
  if (!cart) {
    return res.status(200).json({ items: [] });
  }

  res.json(cart);


});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { listingId, quantity } = req.body;
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  let cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) {
    cart = new Cart({ buyer: req.user.id, items: [] });
  }
  const existingItem = cart.items.find(item => item.listing.toString() === listingId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ listing: listingId, quantity, priceAtAdd: listing.pricePerUnit || listing.price || 0 });
  }
  await cart.save();
  await cart.populate('items.listing');
  res.status(200).json(cart);
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { listingId, quantity } = req.body;
  const cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const item = cart.items.find(i => i.listing.toString() === listingId);
  if (!item) return res.status(404).json({ message: 'Item not in cart' });
  item.quantity = quantity;
  await cart.save();
  await cart.populate('items.listing');
  res.json(cart);
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { listingId } = req.body;
  const cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  cart.items = cart.items.filter(i => i.listing.toString() !== listingId);
  await cart.save();
  await cart.populate('items.listing');
  res.json(cart);
});
