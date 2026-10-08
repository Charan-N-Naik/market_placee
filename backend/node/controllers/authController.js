import User from '../models/User.js';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { uploadToCloudinary } from '../services/uploadService.js';
import serializeUser from '../utils/serializeUser.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Determine frontend base for email links. Use first value from CLIENT_URLS if provided.
const FRONTEND_BASE = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5175').split(',')[0].trim();

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const setTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { 
      name, phone, email, password, role, village, district, state, 
      farmSize, primaryCrops, businessName, produceType, orderVolume,
      aadhaarNumber, kisanId, gstNumber, licenseNumber 
    } = req.body;

    const trimmedPhone = phone?.trim() || '';
    const userExists = await User.findOne({
      $or: [
        { phone: trimmedPhone },
        { phone: trimmedPhone.startsWith('+') ? trimmedPhone : `+91${trimmedPhone}` },
        { phone: trimmedPhone.replace(/^\+91/, '') },
        { email: email?.toLowerCase() }
      ]
    });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this phone or email');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Handle Uploads
    let avatarUrl = '';
    let vehiclePhotoUrl = '';
    
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        try {
          const cloudinaryResult = await uploadToCloudinary(req.files.avatar[0].buffer, 'kisanbazaar/avatars');
          avatarUrl = cloudinaryResult.secure_url;
        } catch (uploadError) {
          console.error('Avatar upload failed:', uploadError);
        }
      }
      if (req.files.vehiclePhoto && req.files.vehiclePhoto[0]) {
        try {
          const cloudinaryResult = await uploadToCloudinary(req.files.vehiclePhoto[0].buffer, 'kisanbazaar/vehicles');
          vehiclePhotoUrl = cloudinaryResult.secure_url;
        } catch (uploadError) {
          console.error('Vehicle photo upload failed:', uploadError);
        }
      }
    } else if (req.file) { // Fallback for single upload
      try {
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'kisanbazaar/avatars');
        avatarUrl = cloudinaryResult.secure_url;
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError);
      }
    } else if (req.body.avatar && typeof req.body.avatar === 'string') {
      avatarUrl = req.body.avatar;
    }

    const userObj = {
      name,
      phone,
      email,
      passwordHash: password,
      role,
      isVerified: true,
      verificationStatus: 'verified',
      aadhaarNumber: aadhaarNumber || undefined,
      kisanId: kisanId || undefined,
      gstNumber: gstNumber || undefined,
      licenseNumber: licenseNumber || undefined,
      location: {
        address: village || '',
        district: district || '',
        state: state || '',
      },
      avatar: avatarUrl || undefined,
      verificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      verificationTokenExpires,
    };

    if (role === 'farmer') {
      userObj.farmerProfile = {
        farmSize,
        primaryCrops: primaryCrops ? primaryCrops.split(',').map(c => c.trim()) : [],
        kisanCardNo: kisanId || `KSN-${Math.floor(100000 + Math.random() * 900000)}`,
      };
    } else if (role === 'buyer') {
      userObj.buyerProfile = {
        businessName: businessName || `${name} Agri Trading`,
        produceTypes: produceType ? produceType.split(',').map(c => c.trim()) : [],
        orderVolume,
        gstin: gstNumber || `29ABCDE${Math.floor(1000 + Math.random() * 9000)}F1Z5`,
        apmcLicense: licenseNumber || `APMC-KA-${Math.floor(10000 + Math.random() * 90000)}`,
      };
    } else if (role === 'delivery_agent' || role === 'driver') {
      userObj.deliveryAgentProfile = {
        vehicleType: req.body.vehicleType || 'Mini-Truck',
        vehicleNumber: req.body.vehicleNumber || `KA-${Math.floor(10 + Math.random() * 90)}-${Math.floor(1000 + Math.random() * 9000)}`,
        drivingLicense: req.body.drivingLicense || `DL-${Math.floor(1000000 + Math.random() * 9000000)}`,
        vehiclePhoto: vehiclePhotoUrl || undefined,
        perKmCharge: req.body.perKmCharge ? Number(req.body.perKmCharge) : 15,
        availabilityStatus: 'available'
      };
    }

    const user = await User.create(userObj);

    // Send Verification Email
    const verifyUrl = `${FRONTEND_BASE}/verify-email?token=${verificationToken}`;
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your KisanBazaar Account',
        html: `
          <h1>Welcome to KisanBazaar!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verifyUrl}" style="padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        `,
      });
    } catch (err) {
      console.error('Failed to send verification email', err);
      // We still return success but maybe warn the user
    }

    if (user) {
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshToken = [refreshToken];
      await user.save();

      setTokenCookie(res, refreshToken);

      res.status(201).json({
        user: serializeUser(user),
        token: accessToken,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
    }

    const { loginId, password, role, rememberMe } = req.body;
    if (!loginId || !password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const cleanLoginId = loginId?.trim() || '';
    const user = await User.findOne({
      $or: [
        { phone: cleanLoginId },
        { phone: cleanLoginId.startsWith('+') ? cleanLoginId : `+91${cleanLoginId}` },
        { phone: cleanLoginId.replace(/^\+91/, '') },
        { email: cleanLoginId.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Unauthorized: You are registered as a ${user.role}, please login through the correct portal.` });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken.push(refreshToken);
    await user.save();

    // Set refresh token cookie; longer expiration if rememberMe
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days vs 7 days
    };
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return res.json({
      user: serializeUser(user),
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   GET /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'JsonWebTokenError' || jwtErr.name === 'TokenExpiredError') {
        res.clearCookie('refreshToken');
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }
      throw jwtErr;
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.refreshToken?.includes(refreshToken)) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Not authorized, invalid refresh token' });
    }

    const accessToken = generateToken(user._id);
    res.json({ token: accessToken });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = user.refreshToken.filter(rt => rt !== refreshToken);
        await user.save();
      }
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { token, role } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { name, email, sub, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      if (!role) {
        res.status(400);
        throw new Error('Role is required for new registration');
      }
      // Create user
      user = await User.create({
        name,
        email,
        phone: `gauth_${sub}`, // Temporary phone for unique constraint
        passwordHash: crypto.randomBytes(16).toString('hex'), // Random password
        role,
        isVerified: true,
        googleId: sub,
        avatar: picture,
      });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken.push(refreshToken);
    await user.save();

    setTokenCookie(res, refreshToken);

    res.json({
      user: serializeUser(user),
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email
// @route   GET /api/auth/verify/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      verificationToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('No user found with this email');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const resetUrl = `${FRONTEND_BASE}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Reset Password</h1>
          <p>You requested a password reset. Click the link below to reset it:</p>
          <a href="${resetUrl}" style="padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        `,
      });
      res.json({ message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(500);
      throw new Error('Email could not be sent');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    user.passwordHash = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');

    if (user) {
      const userObj = user.toObject();
      if (user.role === 'farmer') {
        const stats = await Order.aggregate([
          { $match: { farmer: user._id, rating: { $exists: true, $ne: null } } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const avg = stats[0] ? Number(stats[0].avgRating.toFixed(1)) : (user.rating || 5.0);
        const count = stats[0] ? stats[0].count : (user.numReviews || 0);

        if (!userObj.farmerProfile) userObj.farmerProfile = {};
        userObj.farmerProfile.rating = avg;
        userObj.farmerProfile.numReviews = count;
        userObj.rating = avg;
        userObj.numReviews = count;
      }
      res.json(userObj);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let { name, phone, email, location, farmerProfile, buyerProfile } = req.body;

    // Handle JSON stringified bodies when sent via FormData
    if (typeof location === 'string') {
      try { location = JSON.parse(location); } catch (e) {}
    }
    if (typeof farmerProfile === 'string') {
      try { farmerProfile = JSON.parse(farmerProfile); } catch (e) {}
    }
    if (typeof buyerProfile === 'string') {
      try { buyerProfile = JSON.parse(buyerProfile); } catch (e) {}
    }

    // Handle Cloudinary image uploads if files were uploaded
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        const file = req.files.avatar[0];
        const uploaded = await uploadToCloudinary(file.buffer, 'kisanbazaar/avatars');
        user.avatar = uploaded.secure_url;
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        const file = req.files.coverImage[0];
        const uploaded = await uploadToCloudinary(file.buffer, 'kisanbazaar/covers');
        user.coverImage = uploaded.secure_url;
      }
      if (req.files.vehiclePhoto && req.files.vehiclePhoto[0]) {
        const file = req.files.vehiclePhoto[0];
        const uploaded = await uploadToCloudinary(file.buffer, file.originalname);
        if (!user.deliveryAgentProfile) user.deliveryAgentProfile = {};
        user.deliveryAgentProfile.vehiclePhoto = uploaded.secure_url;
      }
    }
    
    // Also accept pre-uploaded CDN URLs from URL-based uploaders
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }
    if (req.body.coverImage) {
      user.coverImage = req.body.coverImage;
    }
    if (req.body.vehiclePhoto) {
      if (!user.deliveryAgentProfile) user.deliveryAgentProfile = {};
      user.deliveryAgentProfile.vehiclePhoto = req.body.vehiclePhoto;
    }

    if (name) user.name = name;

    if (phone && phone.trim() !== user.phone) {
      const existingPhone = await User.findOne({ phone: phone.trim(), _id: { $ne: user._id } });
      if (existingPhone) {
        res.status(400);
        throw new Error('This phone number is already registered to another account.');
      }
      user.phone = phone.trim();
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const targetEmail = email.toLowerCase().trim();
      const existingEmail = await User.findOne({ email: targetEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        res.status(400);
        throw new Error('This email address is already registered to another account.');
      }
      user.email = targetEmail;
    }
    if (location) {
      user.location = {
        ...user.location?.toObject?.() || user.location || {},
        ...location,
      };
    }

    if (user.role === 'farmer' && farmerProfile) {
      user.farmerProfile = {
        ...user.farmerProfile?.toObject?.() || user.farmerProfile || {},
        ...farmerProfile,
      };
    }

    if (user.role === 'buyer' && buyerProfile) {
      user.buyerProfile = {
        ...user.buyerProfile?.toObject?.() || user.buyerProfile || {},
        ...buyerProfile,
      };
    }

    if ((user.role === 'delivery_agent' || user.role === 'driver') && req.body.deliveryAgentProfile) {
      let deliveryAgentProfile = req.body.deliveryAgentProfile;
      if (typeof deliveryAgentProfile === 'string') {
        try { deliveryAgentProfile = JSON.parse(deliveryAgentProfile); } catch (e) {}
      }
      user.deliveryAgentProfile = {
        ...user.deliveryAgentProfile?.toObject?.() || user.deliveryAgentProfile || {},
        ...deliveryAgentProfile,
      };
    }

    const updatedUser = await user.save();

    res.json(serializeUser(updatedUser));
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered delivery agents / drivers with real ratings from MongoDB
// @route   GET /api/auth/delivery-agents
// @access  Public
export const getDeliveryAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: { $in: ['delivery_agent', 'driver'] } }).select('-passwordHash');

    // For each agent, compute real average rating and review list from Review collection & completed Order ratings
    const formattedAgents = await Promise.all(
      agents.map(async (agent) => {
        // Query Review collection for this agent
        const dbReviews = await Review.find({ agent: agent._id }).sort({ createdAt: -1 });

        // Query Order collection for completed orders with rating
        const ratedOrders = await Order.find({
          deliveryAgent: agent._id,
          rating: { $exists: true, $ne: null },
        }).select('_id rating ratingComment createdAt buyer').populate('buyer', 'name');

        // Trips completed from Order collection
        const tripsCompleted = await Order.countDocuments({
          deliveryAgent: agent._id,
          $or: [
            { deliveryRequestStatus: 'delivered' },
            { status: { $in: ['delivered', 'received'] } }
          ]
        });

        // Combine all rating values
        const reviewRatings = dbReviews.map(r => r.rating);
        const orderRatings = ratedOrders.map(o => o.rating);
        const allRatings = [...reviewRatings, ...orderRatings];

        let avgRating = 4.8; // default baseline for newly verified agents
        if (allRatings.length > 0) {
          const sum = allRatings.reduce((acc, r) => acc + Number(r), 0);
          avgRating = parseFloat((sum / allRatings.length).toFixed(1));
        }

        // Combine review objects
        const combinedReviews = [
          ...dbReviews.map(r => ({
            id: r._id.toString(),
            reviewerName: r.reviewerName || 'Verified Buyer/Farmer',
            rating: r.rating,
            reviewText: r.reviewText,
            createdAt: r.createdAt
          })),
          ...ratedOrders.map(o => ({
            id: o._id.toString(),
            reviewerName: o.buyer?.name || 'Verified Buyer',
            rating: o.rating,
            reviewText: o.ratingComment || 'Completed delivery successfully.',
            createdAt: o.createdAt
          }))
        ];

        return {
          id: agent._id.toString(),
          _id: agent._id.toString(),
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          location: agent.location?.district || agent.location?.address || 'Karnataka',
          district: agent.location?.district || 'Karnataka',
          state: agent.location?.state || 'Karnataka',
          profilePhoto: agent.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          vehiclePhoto: agent.deliveryAgentProfile?.vehiclePhoto || '',
          vehicleType: agent.deliveryAgentProfile?.vehicleType || 'Mahindra Bolero Pickup 🚚',
          vehicleNumber: agent.deliveryAgentProfile?.vehicleNumber || 'KA-06-EA-4821',
          ratePerKm: agent.deliveryAgentProfile?.perKmCharge || 18,
          capacity: agent.deliveryAgentProfile?.capacity || '1.5 Tons',
          rating: avgRating,
          totalReviews: allRatings.length,
          reviews: combinedReviews,
          tripsCompleted: tripsCompleted || 14,
          isAvailable: agent.deliveryAgentProfile?.availabilityStatus === 'available',
          availabilityStatus: agent.deliveryAgentProfile?.availabilityStatus || 'available'
        };
      })
    );

    res.json({ success: true, agents: formattedAgents });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review for a delivery agent
// @route   POST /api/auth/delivery-agents/:agentId/reviews
// @access  Private (logged-in buyer or farmer with a completed order)
export const addDeliveryAgentReview = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { rating, reviewText, reviewerName, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required to verify your delivery experience.' });
    }

    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Delivery agent not found' });
    }

    // Verify reviewer had a completed order with this delivery agent
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAssignedAgent = order.deliveryAgent && order.deliveryAgent.toString() === agentId.toString();
    const isBuyerOrFarmer =
      (order.buyer && order.buyer.toString() === req.user._id.toString()) ||
      (order.farmer && order.farmer.toString() === req.user._id.toString());
    const isCompleted = ['received', 'delivered'].includes(order.status) || order.deliveryRequestStatus === 'delivered';

    if (!isAssignedAgent || !isBuyerOrFarmer || !isCompleted) {
      return res.status(403).json({
        message: 'You can only review a delivery agent for a completed order (delivered or received) assigned to them.'
      });
    }

    const review = await Review.create({
      agent: agent._id,
      order: order._id,
      reviewer: req.user._id,
      reviewerName: reviewerName || req.user?.name || 'Verified Customer',
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      reviewText: reviewText || '',
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

// @desc    Update FCM device token for push notifications
// @route   POST /api/auth/device-token, PUT /api/auth/device-token
// @access  Private (Authenticated)
export const updateDeviceToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fcmToken },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Device token registered successfully',
      fcmToken: user.fcmToken,
    });
  } catch (error) {
    next(error);
  }
};


