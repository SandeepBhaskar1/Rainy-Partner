const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  role: {
    type: String,
    enum: ['PLUMBER', 'ADMIN', 'COORDINATOR'],
    required: true,
    default: 'PLUMBER'
  },
  password_hash: {
    type: String
  },
  needs_onboarding: {
    type: Boolean,
    default: true
  },
  agreement_status: {
    type: Boolean,
    default: false
  },
  kyc_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  coordinator_id: {
    type: String,
    ref: 'User'
  },
  assigned_plumbers: [{
    type: String,
    ref: 'User'
  }],
  address: {
    address: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pin: { type: String }
  },
  service_area_pin : [{type: String}],
  experience: { type: Number },
  tools: { type: String },
  profile: { type: String },
  aadhaar_front: { type: String },
  aadhaar_back: { type: String },
  aadhaar_number: { type: String },
  plumber_license_number: { type: String },
  license_front: { type: String },
  license_back: { type: String },
  trust: {
    type: Number,
    default: 100
  },
  working_hours: {
    start: {
      type: Number,
      default: 9,
      min: 0,
      max: 23
    },
    end: {
      type: Number,
      default: 19,
      min: 0,
      max: 23
    }
  },
  approvedAt: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now()
  },
  updated_at: {
    type: Date,
    default: Date.now()
  },
  last_login: Date,
  is_active: {
    type: Boolean,
    default: true
  },
  resetOtp: {type: Number},
  otpExpiry: {type: Date}
});

userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Instance method to check if user needs onboarding
userSchema.methods.needsOnboarding = function() {
  return this.needs_onboarding || this.kyc_status === 'pending';
};


userSchema.methods.canWorkNow = function() {
  if (this.role !== 'COORDINATOR') {
    return true; // Non-coordinators can work anytime
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  
  return currentHour >= this.working_hours.start && currentHour < this.working_hours.end;
};

// Instance method to check if user can approve KYC
userSchema.methods.canApproveKYC = function() {
  return this.role === 'ADMIN';
};

// Instance method to check if user can create coordinators
userSchema.methods.canCreateCoordinator = function() {
  return this.role === 'ADMIN';
};

// Instance method to get accessible plumbers for a user
userSchema.methods.getAccessiblePlumbers = async function() {
  if (this.role === 'ADMIN') {
    // Admin can see all plumbers
    return await mongoose.model('User').find({ role: 'PLUMBER' });
  } else if (this.role === 'COORDINATOR') {
    // Coordinator can only see assigned plumbers
    return await mongoose.model('User').find({
      _id: { $in: this.assigned_plumbers },
      role: 'PLUMBER'
    });
  }
  return [];
};

// Instance method to get user profile
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    role: this.role,
    kyc_status: this.kyc_status,
    address: this.address,
    experience: this.experience,
    aadhaar_number: this.aadhaar_number,
    aadhaar_front: this.aadhaar_front,
    aadhaar_back: this.aadhaar_back,
    plumber_license_number: this.plumber_license_number,
    license_front: this.license_front,
    license_back: this.license_back,
    coordinator_id: this.coordinator_id,
    tools: this.tools,
    service_area_pin: this.service_area_pin,
    profile: this.profile,
    photo_url: this.photo_url,
    trust: this.trust,
    needs_onboarding: this.needs_onboarding,
    created_at: this.created_at,
  };

  if (this.role === 'COORDINATOR') {
    profile.working_hours = this.working_hours;
    profile.assigned_plumbers = this.assigned_plumbers;
  }
};

// Static method to find by phone
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

// Static method to find plumbers only
userSchema.statics.findPlumbers = function(filter = {}) {
  return this.find({ ...filter, role: 'PLUMBER' });
};

// Static method to find admins only
userSchema.statics.findAdmins = function(filter = {}) {
  return this.find({ ...filter, role: 'ADMIN' });
};

userSchema.statics.findCoordinators = function(filter = {}) {
  return this.find({ ...filter, role: 'COORDINATOR' });
};

userSchema.statics.findAccessiblePlumbers = async function(userId) {
  const user = await this.findById(userId);
  if (!user) return [];
  return await user.getAccessiblePlumbers();
};

module.exports = mongoose.model('User', userSchema);