const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { verifyAdminToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const Order = require('../models/Order');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', verifyAdminToken, asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  
  // Get counts for different collections
  const totalPlumbers = await User.countDocuments({ role: 'PLUMBER' });
  const approvedPlumbers = await User.countDocuments({ role: 'PLUMBER', kyc_status: 'approved' });
  const pendingKYC = await User.countDocuments({ role: 'PLUMBER', kyc_status: 'pending' });
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'Pending' });
  const totalLeads = await db.collection('leads').countDocuments();
  const completedLeads = await db.collection('leads').countDocuments({ status: 'Completed' });

  // Get plumber breakdown by state
  const stateBreakdown = await User.aggregate([
    { $match: { role: 'PLUMBER' } },
    { $group: { _id: '$address.state', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.json({
    overview: {
      total_plumbers: totalPlumbers,
      approved_plumbers: approvedPlumbers,
      pending_kyc: pendingKYC,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      total_leads: totalLeads,
      completed_leads: completedLeads
    },
    plumber_breakdown: {
      by_state: stateBreakdown
    }
  });
}));

// Get all plumbers
router.get('/plumbers', verifyAdminToken, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let filter = { role: 'PLUMBER' };
  if (status) {
    filter.kyc_status = status;
  }

  const skip = (page - 1) * limit;
  const plumbers = await User.find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);

  res.json({
    plumbers: plumbers.map(p => p.getProfile()),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Approve/Reject KYC
router.post('/kyc/:plumberId/:action', verifyAdminToken, asyncHandler(async (req, res) => {
  const { plumberId, action } = req.params;
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ detail: 'Action must be approve or reject' });
  }

  const plumber = await User.findOne({ id: plumberId, role: 'PLUMBER' });
  
  if (!plumber) {
    return res.status(404).json({ detail: 'Plumber not found' });
  }

  plumber.kyc_status = action === 'approve' ? 'approved' : 'rejected';
  await plumber.save();

  res.json({
    message: `KYC ${action}d successfully`,
    plumber_id: plumberId,
    kyc_status: plumber.kyc_status
  });
}));

// Get all orders
router.get('/orders', verifyAdminToken, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const orders = await Order.find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Manually add plumber information since we use string IDs
  for (let order of orders) {
    const plumber = await User.findOne({ id: order.plumber_id });
    if (plumber) {
      order.plumber_name = plumber.name;
      order.plumber_phone = plumber.phone;
    }
  }

  const total = await Order.countDocuments(filter);

  res.json({
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Update order status
router.put('/orders/:orderId/status', verifyAdminToken, [
  body('status').isIn(['Pending', 'Processing', 'Dispatched', 'Delivered', 'Fulfilled', 'Cancelled'])
    .withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { orderId } = req.params;
  const { status, awb_number } = req.body;

  const order = await Order.findOne({ id: orderId });
  
  if (!order) {
    return res.status(404).json({ detail: 'Order not found' });
  }

  order.status = status;
  if (awb_number) {
    order.awb_number = awb_number;
  }
  
  await order.save();

  res.json({
    message: 'Order status updated successfully',
    order_id: orderId,
    status
  });
}));

// Get all leads/jobs
router.get('/leads', verifyAdminToken, asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { status, page = 1, limit = 50 } = req.query;
  
  let filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const leads = await db.collection('leads').find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(Number(limit))
    .toArray();

  const total = await db.collection('leads').countDocuments(filter);

  res.json({
    leads,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get jobs pending review
router.get('/jobs/pending-review', verifyAdminToken, asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  
  const jobs = await db.collection('leads').find({ status: 'under_review' }).toArray();
  
  // Add plumber info for each job
  for (let job of jobs) {
    const plumberId = job.completion_submitted_by || job.assigned_plumber_id;
    if (plumberId) {
      const plumber = await User.findOne({ id: plumberId });
      if (plumber) {
        job.plumber_name = plumber.name || 'Unknown';
        job.plumber_phone = plumber.phone || 'Unknown';
      }
    }
  }

  res.json(jobs);
}));

// Approve job completion
router.post('/jobs/:jobId/approve-completion', verifyAdminToken, asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const db = mongoose.connection.db;

  const result = await db.collection('leads').updateOne(
    { id: jobId, status: 'under_review' },
    {
      $set: {
        status: 'Completed',
        completed_at: new Date(),
        approved_by: req.user.id,
        approved_at: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ detail: 'Job not found or not under review' });
  }

  res.json({ message: 'Job completion approved successfully' });
}));

// Reject job completion
router.post('/jobs/:jobId/reject-completion', verifyAdminToken, [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      detail: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { jobId } = req.params;
  const { reason } = req.body;
  const db = mongoose.connection.db;

  const result = await db.collection('leads').updateOne(
    { id: jobId, status: 'under_review' },
    {
      $set: {
        status: 'Assigned',
        rejection_reason: reason,
        rejected_by: req.user.id,
        rejected_at: new Date(),
        completion_images: null,
        completion_submitted_at: null
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ detail: 'Job not found or not under review' });
  }

  res.json({ 
    message: 'Job completion rejected', 
    reason 
  });
}));

module.exports = router;