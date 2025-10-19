const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { verifyPlumberToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');
const Lead = require('../models/Lead');
const { token } = require('morgan');

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


router.get('/stats', async (req, res) => {
  try {
    // Fetch plumbers count and KYC status directly from MongoDB
    const plumbers = await User.find({ role: 'PLUMBER' }).select('kyc_status');
    const approved = plumbers.filter(p => p.kyc_status === 'approved').length;
    const pending = plumbers.filter(p => p.kyc_status === 'pending').length;
    const rejected = plumbers.filter(p => p.kyc_status === 'rejected').length;

    // Fetch orders and leads counts
    const ordersCount = await Order.countDocuments();
    const leadsCount = await Lead.countDocuments();

    // Count open installations and awaiting dispatch directly
    const openInstallations = await Lead.countDocuments({ status: /pending/i });
    const awaitingDispatch = await Order.countDocuments({ status: /processing/i });

    const unassignedLeads = await Lead.find({ status: { $in: ["not-assigned", "Pending"] }})
      .select('client model_purchased created_at')
      .sort({ created_at: -1 })
      .lean();

    // Debug: Let's see what your query range actually is
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;

    const nowIST = new Date(now.getTime() + istOffset);
    console.log('Current IST Time:', nowIST.toISOString());

    const startOfTodayUTC = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate()
    ) - istOffset);

    const endOfTodayUTC = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate(),
      23, 59, 59, 999
    ) - istOffset);

    const todayOrders = await Order.find({
      created_at: { $gte: startOfTodayUTC, $lte: endOfTodayUTC }
    }).select('total_amount created_at');

    console.log('\nMatched orders:', todayOrders);
    const todayOrderCount = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    const allOrders = await Order.find()
      .select('created_at total_amount')
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({
      plumbers: {
        total: plumbers.length,
        approved,
        pending,
        rejected
      },
      orders: {
        total: ordersCount,
        awaitingDispatch,
        todayOrders: todayOrderCount,
        todayRevenue
      },
      leads: {
        total: leadsCount,
        openInstallations,
        unassigned: unassignedLeads
      },
      ordersList: allOrders  // ✅ ADD THIS LINE
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      detail: 'Error fetching stats',
      error: error.message
    });
  }
});


// Agreement Accepting
router.put(
  '/agreement',
  verifyPlumberToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { agreement_status: true } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ detail: 'Plumber not found' });
    }

    res.json({
      message: 'Agreement accepted successfully',
      agreement_status: user.agreement_status,
      user: user,
    });
  })
);

// CORRECTED: Get assigned jobs (excluding completed ones)
router.get(
  '/assigned-jobs',
  verifyPlumberToken,
  asyncHandler(async (req, res) => {
    const plumberUserId = req.user.user_id.toString();
    console.log('Fetching assigned jobs for plumber:', plumberUserId);

    try {
      const db = mongoose.connection.db;
      
      // Find jobs that are NOT completed
      const leads = await db.collection('leads').find({
        assigned_plumber_id: plumberUserId,
        status: { 
          $nin: ['completed', 'Completed'] // Exclude completed jobs
        }
      }).toArray();

      console.log('Found assigned jobs:', leads.length);

      if (!leads || leads.length === 0) {
        return res.status(200).json({ 
          message: 'No pending jobs assigned yet', 
          jobs: [] 
        });
      }

      // Format the response
      const jobs = leads.map(lead => ({
        id: lead._id.toString(),
        client: lead.client,
        status: lead.status,
        model_purchased: lead.model_purchased,
        created_at: lead.created_at,
        completion_submitted_at: lead.completion_submitted_at,
        completion_images: lead.completion_images || {
          installation_url: "",
          serial_number_url: "",
          warranty_card_url: ""
        }
      }));

      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching assigned jobs:', error);
      res.status(500).json({ 
        detail: 'Failed to fetch assigned jobs',
        error: error.message 
      });
    }
  })
);

// CORRECTED: Get completed jobs
router.get('/completed-jobs', verifyPlumberToken, asyncHandler(async (req, res) => {
  const plumberUserId = req.user.user_id.toString();
  console.log('Fetching completed jobs for plumber:', plumberUserId);

  try {
    const db = mongoose.connection.db;
    
    // Find only completed jobs
    const leads = await db.collection('leads').find({
      assigned_plumber_id: plumberUserId,
      status: { 
        $in: ['completed', 'Completed'] // Only completed jobs
      }
    }).sort({ completion_date: -1 }).toArray(); // Sort by completion date, newest first

    console.log('Found completed jobs:', leads.length);

    if (!leads || leads.length === 0) {
      return res.status(200).json({ 
        message: 'No completed jobs yet', 
        jobs: [] 
      });
    }

    // Format the response (same structure as assigned jobs)
    const jobs = leads.map(lead => ({
      id: lead._id.toString(),
      client: lead.client,
      status: lead.status,
      model_purchased: lead.model_purchased,
      created_at: lead.created_at,
      completion_date: lead.completion_date,
      completion_submitted_at: lead.completion_submitted_at,
      completion_images: lead.completion_images || {
        installation_url: "",
        serial_number_url: "",
        warranty_card_url: ""
      }
    }));

    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching completed jobs:', error);
    res.status(500).json({ 
      detail: 'Failed to fetch completed jobs',
      error: error.message 
    });
  }
}));

// Get plumber orders
router.get('/orders', verifyPlumberToken, asyncHandler(async (req, res) => {
  const orders = await Order.findByPlumber(req.user.user_id);
  res.json(orders);
}));

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
    id: uuidv4(),
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

// CORRECTED: Submit job completion
router.post(
  '/jobs/submit-completion',
  verifyPlumberToken,
  asyncHandler(async (req, res) => {
    const { job_id, serial_number_image_key, warranty_card_image_key, installation_image_key } = req.body;

    console.log('=== JOB SUBMISSION DEBUG ===');
    console.log('Received job_id:', job_id);
    
    const plumberUserId = req.user.user_id.toString();
    console.log('Plumber user ID (string):', plumberUserId);

    if (!job_id || !serial_number_image_key || !warranty_card_image_key || !installation_image_key) {
      return res.status(400).json({ detail: 'Job ID and all image keys are required' });
    }

    const db = mongoose.connection.db;

    // Try all possible ID formats to find the job
    let job = null;
    
    // Try finding by custom 'id' field first
    job = await db.collection('leads').findOne({ id: job_id });
    console.log('Job found by id field:', !!job);
    
    if (!job) {
      // Try finding by _id as string
      job = await db.collection('leads').findOne({ _id: job_id });
      console.log('Job found by _id (string):', !!job);
    }
    
    if (!job && job_id.length === 24) {
      // Try finding by _id as ObjectId (if job_id looks like ObjectId)
      try {
        job = await db.collection('leads').findOne({ _id: new mongoose.Types.ObjectId(job_id) });
        console.log('Job found by _id (ObjectId):', !!job);
      } catch (error) {
        console.log('Invalid ObjectId format');
      }
    }

    if (!job) {
      return res.status(404).json({ 
        detail: 'Job not found in database',
        debug: {
          job_id_searched: job_id,
          job_id_length: job_id.length,
          tried_formats: ['id', '_id_string', '_id_objectid'],
          found: false
        }
      });
    }

    console.log('Found job:', {
      id: job.id,
      _id: job._id,
      assigned_plumber_id: job.assigned_plumber_id,
      status: job.status
    });

    // Check if job is assigned to this plumber
    if (job.assigned_plumber_id !== plumberUserId) {
      return res.status(403).json({ 
        detail: 'Job is not assigned to you',
        debug: {
          job_assigned_to: job.assigned_plumber_id,
          your_user_id: plumberUserId,
          ids_match: job.assigned_plumber_id === plumberUserId
        }
      });
    }

    // Check if job is in correct status
    const validStatuses = ['Assigned', 'assigned', 'in_progress'];
    if (!validStatuses.includes(job.status)) {
      return res.status(400).json({ 
        detail: 'Job is not in a status that allows completion',
        debug: {
          current_status: job.status,
          valid_statuses: validStatuses
        }
      });
    }

    const completionData = {
      status: 'under_review',
      completion_submitted_at: new Date(),
      completion_images: {
        serial_number_key: serial_number_image_key,
        warranty_card_key: warranty_card_image_key,
        installation_key: installation_image_key,
      },
      completion_submitted_by: plumberUserId,
    };

    // Update using the same ID format that found the job
    const updateFilter = job.id ? { id: job.id } : { _id: job._id };
    const result = await db.collection('leads').updateOne(updateFilter, { $set: completionData });

    console.log('Update result:', result);

    res.json({
      success: true,
      message: 'Job completion submitted successfully',
      status: 'under_review',
    });
  })
);

// ADDITIONAL: Admin endpoint to approve job completion (for reference)
router.post('/admin/approve-job-completion', verifyPlumberToken, asyncHandler(async (req, res) => {
  const { job_id } = req.body;
  
  if (!job_id) {
    return res.status(400).json({ detail: 'Job ID is required' });
  }

  const db = mongoose.connection.db;
  
  // Find the job
  let job = null;
  if (job_id.length === 24) {
    try {
      job = await db.collection('leads').findOne({ _id: new mongoose.Types.ObjectId(job_id) });
    } catch (error) {
      // Try other formats if ObjectId fails
    }
  }
  
  if (!job) {
    job = await db.collection('leads').findOne({ id: job_id });
  }

  if (!job) {
    return res.status(404).json({ detail: 'Job not found' });
  }

  if (job.status !== 'under_review') {
    return res.status(400).json({ 
      detail: 'Job is not under review',
      current_status: job.status 
    });
  }

  // Mark as completed
  const completionData = {
    status: 'completed', // This will move job to completed section
    completion_date: new Date(),
    approved_by: req.user.user_id,
    approved_at: new Date()
  };

  const updateFilter = job.id ? { id: job.id } : { _id: job._id };
  await db.collection('leads').updateOne(updateFilter, { $set: completionData });

  res.json({
    success: true,
    message: 'Job completion approved successfully',
    status: 'completed'
  });
}));

module.exports = router;