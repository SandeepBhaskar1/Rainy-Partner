const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { verifyPlumberToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');
const Lead = require('../models/Lead');

const router = express.Router();

// Get plumber profile
router.get('/profile', verifyPlumberToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.user_id);

  if (!user) {
    return res.status(404).json({ detail: 'Plumber not found' });
  }

  // Return selected fields if needed
  const profile = {
    name: user.name,
    phone: user.phone,
    email: user.email,
    kyc_status: user.kyc_status,
    experience: user.experience,
    plumber_license_number: user.plumber_license_number,
    address: user.address,
    tools: user.tools,
    service_area_pin: user.service_area_pin,
    profile: user.profile,
    aadhaar_number: user.aadhaar_number,
    trust: user.trust || 100,
  };

  res.json(profile);
  console.log(user.service_area_pin);
  
}));


// Update plumber profile
router.put('/profile', verifyPlumberToken, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.pin').optional().matches(/^\d{6}$/).withMessage('PIN must be 6 digits')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const user = await User.findOne({ id: req.user.user_id });
  
  if (!user) {
    return res.status(404).json({ detail: 'Plumber not found' });
  }

  // Update allowed fields
  const allowedFields = ['name', 'email', 'address', 'experience', 'tools'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();
  res.json({ message: 'Profile updated successfully', profile: user.getProfile() });
}));

// Agrement Accpting

router.put(
  '/agreement',
  verifyPlumberToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id; // extracted from JWT

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { agreement_status: true } }, // ✅ update here
      { new: true } // ✅ return updated doc
    );

    if (!user) {
      return res.status(404).json({ detail: 'Plumber not found' });
    }

    res.json({
      message: 'Agreement accepted successfully',
      agreement_status: user.agreement_status,
    });
  })
);

// Get assigned jobs
router.get(
  '/assigned-jobs',
  verifyPlumberToken,
  asyncHandler(async (req, res) => {
    const plumberId = req.user.user_id;

    // Use the static method from Lead model
    const leads = await Lead.findByPlumber(plumberId);

    if (!leads || leads.length === 0) {
      return res.status(200).json({ message: 'No jobs assigned yet', jobs: [] });
    }

    // Sanitize the response
    const jobs = leads.map(lead => ({
      id: lead._id,
      client: lead.client,
      status: lead.status,
      model_purchased: lead.model_purchased,
      created_at: lead.created_at,
      completion_submitted_at: lead.completion_submitted_at,
      completion_images: lead.completion_images || {}
    }));

    res.json({ jobs });
  })
);


// Get plumber orders
router.get('/orders', verifyPlumberToken, asyncHandler(async (req, res) => {
  const orders = await Order.findByPlumber(req.user.user_id);
  
  res.json(orders);
}));

router.get('/completed-jobs', verifyPlumberToken, async (req, res) => {
  try {
    const plumberId = req.user._id;
    const jobs = await Lead.find({ plumberId, status: 'completed' }).sort({ completedAt: -1 });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching completed jobs:', error);
    res.status(500).json({ detail: 'Failed to fetch completed jobs' });
  }
});

// Place new order
router.post('/place-order', verifyPlumberToken, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product code is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('client.name').trim().notEmpty().withMessage('Customer name is required'),
  body('client.phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('shipping.address').trim().notEmpty().withMessage('Shipping address is required'),
  body('shipping.city').trim().notEmpty().withMessage('City is required'),
  body('shipping.pin').matches(/^\d{6}$/).withMessage('Valid PIN code is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { items, client, shipping, billing } = req.body;

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // Create new order
  const order = new Order({
    id : uuidv4(),
    plumber_id: req.user.user_id,
    client,
    items,
    shipping,
    billing: billing || shipping, 
    total_amount: totalAmount,
    status: 'Pending'
  });

  await order.save();

  res.json({
    message: 'Order placed successfully! Admin will confirm and provide tracking details.',
    order_id: order.id,
    total_amount: totalAmount
  });
}));

// Submit job completion
router.post('/jobs/submit-completion', verifyPlumberToken, asyncHandler(async (req, res) => {
  const { job_id } = req.body;
  
  if (!job_id) {
    return res.status(400).json({ detail: 'Job ID is required' });
  }

  const db = mongoose.connection.db;
  
  // Check if job exists and is assigned to this plumber
  const job = await db.collection('leads').findOne({
    id: job_id,
    assigned_plumber_id: req.user.user_id,
    status: { $in: ['Assigned', 'assigned'] }
  });

  if (!job) {
    return res.status(404).json({ detail: 'Job not found or not assigned to you' });
  }

  // For now, simulate image upload (in real implementation, handle file uploads)
  const completionData = {
    status: 'under_review',
    completion_submitted_at: new Date(),
    completion_images: {
      serial_number_url: 'placeholder_serial_image.jpg',
      warranty_card_url: 'placeholder_warranty_image.jpg',
      installation_url: 'placeholder_installation_image.jpg'
    },
    completion_submitted_by: req.user.user_id
  };

  await db.collection('leads').updateOne(
    { id: job_id },
    { $set: completionData }
  );

  res.json({
    message: 'Job completion submitted successfully',
    status: 'under_review'
  });
}));

module.exports = router;