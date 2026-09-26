/**
 * WAYFARER AI - User Model & Authentication Schema
 * Implements bcrypt hashing (cost factor 12), strict role validation, and privacy controls.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return password hash in queries unless explicitly requested
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: 100
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'EMERGENCY_CONTACT', 'TRAVEL_PARTNER'],
      default: 'USER'
    },
    privacySettings: {
      locationPrecision: {
        type: String,
        enum: ['precise', 'approximate'],
        default: 'precise'
      },
      allowSharing: {
        type: Boolean,
        default: true
      },
      retentionDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
      }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save password hashing hook
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
