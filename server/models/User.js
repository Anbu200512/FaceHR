const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true, index: true, sparse: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, 'Password is required'], select: false },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    employeeId: this.employeeId,
    name: this.name,
    email: this.email,
    role: this.role,
    employee: this.employee,
    active: this.active,
  };
};

module.exports = mongoose.model('User', userSchema);