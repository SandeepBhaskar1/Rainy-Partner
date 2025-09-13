const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  
  plumber_id: {
    type: String,
    required: true,
    ref: 'User'
  },
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
    email: {
      type: String,
      lowercase: true,
      trim: true
    }
  },
  items: [{
    product: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  shipping: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    district: String,
    state: String,
    pin: {
      type: String,
      required: true,
      match: [/^\d{6}$/, 'Please provide a valid PIN code']
    }
  },
  billing: {
    address: String,
    city: String,
    district: String,
    state: String,
    pin: String,
    gstin: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Dispatched', 'Delivered', 'Fulfilled', 'Cancelled'],
    default: 'Pending'
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  awb_number: String,
  payment_status: String,
  payment_reference: String,
  advance_paid: Number,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  fulfilled_at: Date,
  fulfilled_by: String
});

// Update the updated_at field before saving
orderSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Calculate total amount from items
orderSchema.methods.calculateTotal = function() {
  return this.items.reduce((total, item) => total + (item.quantity * item.price), 0);
};

// Check if order can be fulfilled
orderSchema.methods.canBeFulfilled = function() {
  return this.status === 'Dispatched';
};

// Static method to find orders by plumber
orderSchema.statics.findByPlumber = function(plumberId) {
  return this.find({ plumber_id: plumberId }).sort({ created_at: -1 });
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ created_at: -1 });
};

module.exports = mongoose.model('Order', orderSchema);