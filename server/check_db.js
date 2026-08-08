import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
console.log('Using URI:', mongoUri);

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');
    
    const users = await User.find({}, 'name email phone role isVerified');
    console.log('Users found:', users);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}
main();