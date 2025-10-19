// backend/models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true, 
        trim: true, 
        lowercase: true 
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    cgpa: { type: Number },
    percentage10th: { type: Number },
    percentage12th: { type: Number },
    resumeUrl: { type: String }, // URL to a cloud-stored resume (e.g., S3, Cloudinary)
    // Add any other fields you need
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('User', UserSchema);