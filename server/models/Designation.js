const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Designation name is required'], unique: true, trim: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Designation', designationSchema);