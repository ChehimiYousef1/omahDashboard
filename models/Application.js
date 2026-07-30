const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  portfolioUrl: {
    type: String,
    default: ''
  },
  resumeUrl: {
    type: String,
    default: ''
  },
  coverLetter: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  jobId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['applied', 'reviewed', 'interview', 'rejected', 'hired'],
    default: 'applied'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  extraFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  source: {
    type: String,
    enum: ['sheet', 'manual', 'api'],
    default: 'sheet'
  },
  userId: {
    type: String,
    default: 'sheet-sync'
  },
  // Prevent duplicates: same email + date within 24 hours
  syncIdentifier: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
applicationSchema.index({ email: 1, appliedDate: -1 });
applicationSchema.index({ jobTitle: 1 });
applicationSchema.index({ companyName: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ source: 1 });

// Create or update: prevent duplicates by email + date
applicationSchema.pre('save', function(next) {
  if (!this.syncIdentifier) {
    const dateStr = this.appliedDate.toISOString().split('T')[0];
    this.syncIdentifier = `${this.email}_${dateStr}`;
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
