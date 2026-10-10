const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeId: { type: String, required: true, index: true, trim: true, uppercase: true },
    date: {
      type: Date,
      required: true,
      set: (v) => (v instanceof Date ? new Date(v.getFullYear(), v.getMonth(), v.getDate()) : v),
    },
    dayName: { type: String },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    // Stored status: Present | Late | Half Day
    status: { type: String, enum: ['Present', 'Late', 'Half Day'], default: 'Present' },
    workingHoursMinutes: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    checkInPhoto: { type: String, default: null },
    checkOutPhoto: { type: String, default: null },
    checkInLocation: { type: locationSchema, default: null },
    checkOutLocation: { type: locationSchema, default: null },
    checkInMatchDistance: { type: Number },
    checkOutMatchDistance: { type: Number },
    checkInDistanceFromCompany: { type: Number, default: null },
    checkOutDistanceFromCompany: { type: Number, default: null },
    faceVerified: { type: Boolean, default: false },
    deviceInfo: {
      userAgent: { type: String, default: '' },
      platform: { type: String, default: '' },
      screen: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Enforce a single attendance row per employee per calendar day.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ employeeId: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);