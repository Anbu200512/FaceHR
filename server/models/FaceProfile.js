const mongoose = require('mongoose');

const faceProfileSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    faceId: { type: String, required: true, unique: true },
    // 128-dimension face descriptor produced by face-api.js ResNet-50 recognition model
    descriptor: { type: [Number], default: [] },
    faceImage: { type: String, default: null },
    quality: { type: Number, default: 0 },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

faceProfileSchema.index({ employee: 1 }, { unique: true });

module.exports = mongoose.model('FaceProfile', faceProfileSchema);