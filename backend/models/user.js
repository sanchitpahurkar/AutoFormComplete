// backend/models/User.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true }, // Added clerkId
  firstName: String,
  middleName: String,
  lastName: String,
  dob: Date,
  gender: String,
  phone: String,
  alternatePhone: String,
  rknecID: String,
  emailID: String,
  currentAddress: String,
  permanentAddress: String,
  collegeYear: String,
  branch: String,
  enrollmentNumber: String,
  cgpa: String,
  activeBacklogs: String,
  deadBacklogs: String,
  yearOfGraduation: String,
  hscSchoolName: String,
  hscBoard: String,
  hscYearOfPassing: String,
  hscPercentage: String,
  sscSchoolName: String,
  sscBoard: String,
  sscYearOfPassing: String,
  sscPercentage: String,
  resume: String,           // path or URL
  marksheetPaths: [String], // multiple marksheets
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models?.User || mongoose.model('User', UserSchema);
