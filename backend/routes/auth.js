const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const otpStorage = new Map();

const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`Generated OTP: ${otp}`);
  return otp;
};

router.post('/send-otp', [
  body('identifier')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {    
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { identifier } = req.body;
  const otp = generateOTP();

  otpStorage.set(identifier, {
    otp,
    expires: Date.now() + 3 * 60 * 1000 
  });

  console.log(`📱 OTP for ${identifier}: ${otp}`);

  res.json({
    message: 'OTP sent successfully',
    otp
  });
}));

// Verify OTP and login
router.post('/verify-otp', [
  body('identifier')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { identifier, otp } = req.body;
  
  // Verify OTP
  const otpData = otpStorage.get(identifier);
  if (!otpData || otpData.expires < Date.now()) {
    otpStorage.delete(identifier);
    return res.status(400).json({ detail: 'OTP expired or invalid' });
  }

  if (otpData.otp !== otp) {
    return res.status(400).json({ detail: 'Invalid OTP' });
  }

  // Remove OTP after successful verification
  otpStorage.delete(identifier);

  // Find or create user
  let user = await User.findByPhone(identifier);
  
  if (!user) {
    // Create new plumber user
    user = new User({
      phone: identifier,
      role: 'PLUMBER',
      needs_onboarding: true,
      kyc_status: 'pending'
    });
    await user.save();
    console.log(`👤 New plumber registered: ${identifier}`);
  }

  // Update last login
  user.last_login = new Date();
  await user.save();

  // Generate token
  const accessToken = generateToken(user);

  // Return user data in format expected by frontend
  const userData = {
    id: user._id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    needs_onboarding: user.needs_onboarding,
    kyc_status: user.kyc_status,
    access_token: accessToken,
    agreement_status: user.agreement_status
  };

  res.json({
    message: 'Login successful',
    access_token: accessToken,
    user: userData
  });
}));

// Admin login endpoint
router.post('/admin-login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Check if it's the default admin
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    // Find admin user first by email or phone
    let admin = await User.findOne({ 
      $or: [
        { email, role: 'ADMIN' },
        { phone: '9999999999', role: 'ADMIN' }
      ]
    });
    
    if (!admin) {
      // Check if phone is already taken by another user
      const existingUser = await User.findOne({ phone: '9999999999' });
      const adminPhone = existingUser ? `999999999${Date.now().toString().slice(-1)}` : '9999999999';
      
      admin = new User({
        phone: adminPhone,
        email,
        name: 'System Admin',
        role: 'ADMIN',
        needs_onboarding: false,
        kyc_status: 'approved'
      });
      await admin.save();
    }

    admin.last_login = new Date();
    await admin.save();

    const accessToken = generateToken(admin.id);

    res.json({
      message: 'Admin login successful',
      access_token: accessToken,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } else {
    return res.status(401).json({ detail: 'Invalid admin credentials' });
  }
}));

// Refresh token endpoint
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ detail: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findOne({ id: decoded.user_id });
    
    if (!user || !user.is_active) {
      return res.status(401).json({ detail: 'User not found' });
    }

    const newToken = generateToken(user.id);
    
    res.json({
      access_token: newToken,
      user: user.getProfile()
    });
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
}));

module.exports = router;