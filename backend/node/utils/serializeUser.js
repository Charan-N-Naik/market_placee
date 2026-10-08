/**
 * Shared User Serializer
 * Returns the safe public shape needed by the UI across login, register, googleAuth, and updateProfile.
 * Strictly omits sensitive credentials, tokens, and private identification numbers:
 * - passwordHash, refreshToken, verificationToken, verificationTokenExpires
 * - resetPasswordToken, resetPasswordExpires, aadhaarNumber, fcmToken, googleId
 */
export const serializeUser = (user) => {
  if (!user) return null;

  const doc = typeof user.toObject === 'function' ? user.toObject() : { ...user };

  return {
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    role: doc.role,
    isVerified: doc.isVerified !== undefined ? Boolean(doc.isVerified) : true,
    verificationStatus: doc.verificationStatus || 'verified',
    avatar: doc.avatar || null,
    coverImage: doc.coverImage || null,
    location: doc.location || null,
    farmerProfile: doc.farmerProfile || null,
    buyerProfile: doc.buyerProfile || null,
    deliveryAgentProfile: doc.deliveryAgentProfile || null,
    rating: doc.rating !== undefined ? doc.rating : 5.0,
    numReviews: doc.numReviews !== undefined ? doc.numReviews : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export default serializeUser;
