import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'voice'], default: 'text' },
  content: { type: String, required: true }, // for image/voice store URL
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [messageSchema],
  isGroup: { type: Boolean, default: false },
}, { timestamps: true });

// Index to quickly find a chat between two users
chatSchema.index({ participants: 1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
