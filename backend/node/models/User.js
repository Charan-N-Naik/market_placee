import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'admin'],
      required: true,
    },
    location: {
      address: String,
      lat: Number,
      lng: Number,
      district: String,
      state: String,
    },
    avatar: String,
    coverImage: String,
    
    // Authentication fields
    isVerified: {
      type: Boolean,
      default: false,
    },
    googleId: String,
    refreshToken: [String],
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Farmer specific fields
    farmerProfile: {
      farmSize: String, // e.g. "5 acres"
      primaryCrops: [String],
      certifications: [String],
      experience: String, // years of farming experience
      bio: String,        // about the farmer
    },
    
    // Buyer specific fields
    buyerProfile: {
      businessName: String,
      companySector: String, // e.g. "Wholesale Food Distributor"
      produceTypes: [String],
      orderVolume: String,
    }
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);
export default User;
