const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  client: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
    },
    address: {
      type: String,
      required: true
    }
  },
  model_purchased: {
    type: String,
    required: true
  },
  assigned_plumber_id: {
    type: String,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Assigned', 'assigned', 'under_review', 'Completed', 'Cancelled'],
    default: 'Assigned'
  },
  lead_type: {
    type: String,
    enum: ['IO', 'SI'],
    default: 'IO'
  },
  install_fee_charged: {
    type: Number,
    min: 0
  },
  completion_submitted_at: Date,
  completion_submitted_by: String,
  completion_images: {
    serial_number_url: String,
    warranty_card_url: String,
    installation_url: String
  },
  approved_by: String,
  approved_at: Date,
  rejected_by: String,
  rejected_at: Date,
  rejection_reason: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  customer_paid: {
    type: Boolean,
    default: false
  },
  plumber_paid: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'leads'
});

// Update the updated_at field before saving
leadSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Check if lead can be completed
leadSchema.methods.canBeCompleted = function() {
  return ['Assigned', 'assigned'].includes(this.status);
};

// Check if lead is under review
leadSchema.methods.isUnderReview = function() {
  return this.status === 'under_review';
};

// Static method to find by plumber
leadSchema.statics.findByPlumber = function(plumberId) {
  return this.find({ assigned_plumber_id: plumberId }).sort({ created_at: -1 });
};

// Static method to find by status
leadSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ created_at: -1 });
};

module.exports = mongoose.model('Lead', leadSchema);