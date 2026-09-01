import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { uploadToCloudinary } from '../services/uploadService.js';

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
    const { name, phone, email, password, role, village, district, state, farmSize, primaryCrops, businessName, produceType, orderVolume } = req.body;

    const userExists = await User.findOne({ $or: [{ phone }, { email }] });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this phone or email');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Handle Avatar Upload
    let avatarUrl = '';
    if (req.file) {
      try {
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'kisanbazaar/avatars');
        avatarUrl = cloudinaryResult.secure_url;
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError);
      }
    }

    const userObj = {
      name,
      phone,
      email,
      passwordHash: password,
      role,
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
      };
    } else if (role === 'buyer') {
      userObj.buyerProfile = {
        businessName,
        produceTypes: produceType ? produceType.split(',').map(c => c.trim()) : [],
        orderVolume,
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
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
          location: user.location,
        },
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
    const { loginId, password, role, rememberMe } = req.body;
    const user = await User.findOne({ $or: [{ phone: loginId }, { email: loginId }] });

    if (user && (await user.matchPassword(password))) {
      if (role && user.role !== role) {
        res.status(403);
        throw new Error(`Unauthorized: You are registered as a ${user.role}, please login through the correct portal.`);
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

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
          location: user.location,
        },
        token: accessToken,
      });
    } else {
      res.status(401);
      throw new Error('Invalid credentials');
    }
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
      // Return clean 401 JSON — do NOT throw so the global error handler doesn't log a stack trace
      return res.status(401).json({ message: 'No refresh token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshToken.includes(refreshToken)) {
      res.status(401);
      throw new Error('Not authorized, invalid refresh token');
    }

    // Optional: Refresh token rotation can be implemented here

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
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        location: user.location,
      },
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
      res.json(user);
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
        const uploaded = await uploadToCloudinary(file.buffer, file.originalname);
        user.avatar = uploaded.secure_url;
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        const file = req.files.coverImage[0];
        const uploaded = await uploadToCloudinary(file.buffer, file.originalname);
        user.coverImage = uploaded.secure_url;
      }
    } else if (req.body.avatar) {
      user.avatar = req.body.avatar;
    } else if (req.body.coverImage) {
      user.coverImage = req.body.coverImage;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email.toLowerCase().trim();
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

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      avatar: updatedUser.avatar,
      coverImage: updatedUser.coverImage,
      location: updatedUser.location,
      farmerProfile: updatedUser.farmerProfile,
      buyerProfile: updatedUser.buyerProfile,
    });
  } catch (error) {
    next(error);
  }
};
