import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';
import Listing from '../models/Listing.js';

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ buyer: req.user.id }).populate('items.listing');
  if (!cart) {
    return res.status(200).json({ items: [] });
  }

  // Filter out any items whose listing was deleted or is null
  const originalLength = cart.items.length;
  cart.items = cart.items.filter(item => item && item.listing && (item.listing._id || item.listing.id));
  if (cart.items.length !== originalLength) {
    await cart.save();
  }

  res.json(cart);
});

// Helper to safely extract listing ID from a cart item
const getListingIdFromItem = (item) => {
  if (!item || !item.listing) return null;
  if (typeof item.listing === 'object') {
    return (item.listing._id || item.listing.id || '').toString();
  }
  return item.listing.toString();
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { listingId, quantity, mode } = req.body;

  if (!listingId) {
    return res.status(400).json({ message: 'Listing ID is required' });
  }

  const numQuantity = Number(quantity);
  if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a valid positive number' });
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found or no longer available' });
  }

  let cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) {
    cart = new Cart({ buyer: req.user.id, items: [] });
  }

  // Prune any invalid/null items
  cart.items = cart.items.filter(item => item && item.listing);

  const targetListingIdStr = listingId.toString();
  const existingItem = cart.items.find(item => getListingIdFromItem(item) === targetListingIdStr);
  const targetQuantity = existingItem
    ? (mode === 'set' ? numQuantity : existingItem.quantity + numQuantity)
    : numQuantity;

  if (targetQuantity > listing.quantity) {
    return res.status(409).json({ message: `Insufficient stock. Only ${listing.quantity} ${listing.unit || 'units'} available.` });
  }

  if (existingItem) {
    existingItem.quantity = targetQuantity;
    existingItem.priceAtAdd = listing.pricePerUnit || listing.price || existingItem.priceAtAdd || 0;
  } else {
    cart.items.push({
      listing: listing._id,
      quantity: targetQuantity,
      priceAtAdd: listing.pricePerUnit || listing.price || 0
    });
  }

  await cart.save();
  await cart.populate('items.listing');
  // Return only valid populated items
  cart.items = cart.items.filter(item => item && item.listing && (item.listing._id || item.listing.id));
  res.status(200).json(cart);
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { listingId, quantity } = req.body;

  if (!listingId) {
    return res.status(400).json({ message: 'Listing ID is required' });
  }

  const numQuantity = Number(quantity);
  if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a valid positive number' });
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }

  if (numQuantity > listing.quantity) {
    return res.status(409).json({ message: `Insufficient stock. Only ${listing.quantity} available.` });
  }

  const cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const targetListingIdStr = listingId.toString();
  const item = cart.items.find(i => getListingIdFromItem(i) === targetListingIdStr);
  if (!item) return res.status(404).json({ message: 'Item not in cart' });

  item.quantity = numQuantity;
  await cart.save();
  await cart.populate('items.listing');
  cart.items = cart.items.filter(i => i && i.listing && (i.listing._id || i.listing.id));
  res.json(cart);
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { listingId } = req.body;
  const cart = await Cart.findOne({ buyer: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const targetListingIdStr = (listingId || '').toString();
  cart.items = cart.items.filter(i => getListingIdFromItem(i) !== targetListingIdStr && i.listing);
  await cart.save();
  await cart.populate('items.listing');
  cart.items = cart.items.filter(i => i && i.listing && (i.listing._id || i.listing.id));
  res.json(cart);
});
