import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    phone: { type: String, required: true },
    rknecID: { type: String, required: true },
    emailID: { type: String, required: true },
    alternatePhone: { type: String, required: false },
    currentAddress: { type: String, required: true },
    permanentAddress: { type: String, required: true },
    collegeYear: { type: String, required: true },
    branch: { type: String, required: true },
    enrollmentNumber: { type: Number, required: true },
    cgpa: { type: Number, required: true },
    activeBacklogs: { type: Number, required: true },
    deadBacklogs: { type: Number, required: true },
    yearOfGraduation: { type: Number, required: true },
    hscSchoolName: { type: String, required: true },
    hscBoard: { type: String, required: true },
    hscYearOfPassing: { type: Number, required: true },
    hscPercentage: { type: Number, required: true },
    sscSchoolName: { type: String, required: true },
    sscBoard: { type: String, required: true },
    sscYearOfPassing: { type: Number, required: true },
    sscPercentage: { type: Number, required: true },
    resume: { type: String, required: true }, // store file cloud link
    clerkId: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
