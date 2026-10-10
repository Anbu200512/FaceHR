const mongoose = require('mongoose');

const resignationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    reason: {
      type: String,
      required: true,
      enum: ['Salary', 'Better Opportunity', 'Personal Reason', 'Relocation', 'Other'],
    },
    resignationDate: { type: Date, required: true },
    feedback: { type: String, default: '', trim: true },
    comments: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    adminNote: { type: String, default: '', trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

resignationSchema.index({ employee: 1, createdAt: -1 });
resignationSchema.index({ status: 1 });
resignationSchema.index({ resignationDate: 1 });

module.exports = mongoose.model('Resignation', resignationSchema);