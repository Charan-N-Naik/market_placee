import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
      quantity: { type: Number, required: true, min: 1 },
      priceAtAdd: { type: Number, required: true },
    },
  ],
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
