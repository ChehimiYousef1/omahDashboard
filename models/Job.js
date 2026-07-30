const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  companyId: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'closed'],
    default: 'active'
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
jobSchema.index({ title: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ active: 1 });

module.exports = mongoose.model('Job', jobSchema);
