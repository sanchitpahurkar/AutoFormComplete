// backend/controllers/userController.js
import User from '../models/User.js';

/**
 * Helper to safely get clerkId from request (populated by Clerk middleware)
 */
function getClerkIdFromReq(req) {
  // ClerkExpressRequireAuth() populates req.auth with { userId, orgId?, sessionId?, ... }
  if (req && req.auth && req.auth.userId) return req.auth.userId;
  return null;
}

// Create a new user profile (requires auth)
export const createUser = async (req, res) => {
  try {
    const clerkId = getClerkIdFromReq(req);
    if (!clerkId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const formData = req.body;

    // check if entry exists for this clerkId
    const existingUser = await User.findOne({ clerkId }).lean();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Entry already exists. Please use update endpoint.'
      });
    }

    // Convert dob if provided
    const dateOfBirth = formData.dob ? new Date(formData.dob) : null;

    const newUser = new User({
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      dob: dateOfBirth,
      gender: formData.gender,
      phone: formData.phone,
      rknecID: formData.rknecID,
      emailID: formData.emailID,
      alternatePhone: formData.alternatePhone,
      currentAddress: formData.currentAddress,
      permanentAddress: formData.permanentAddress,
      collegeYear: formData.collegeYear,
      branch: formData.branch,
      enrollmentNumber: formData.enrollmentNumber,
      cgpa: formData.cgpa,
      activeBacklogs: formData.activeBacklogs,
      deadBacklogs: formData.deadBacklogs,
      yearOfGraduation: formData.yearOfGraduation,
      hscSchoolName: formData.hscSchoolName,
      hscBoard: formData.hscBoard,
      hscYearOfPassing: formData.hscYearOfPassing,
      hscPercentage: formData.hscPercentage,
      sscSchoolName: formData.sscSchoolName,
      sscBoard: formData.sscBoard,
      sscYearOfPassing: formData.sscYearOfPassing,
      sscPercentage: formData.sscPercentage,
      resume: formData.resume,
      clerkId
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('❌ Error creating user : ', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// Fetch user by clerkId (requires auth)
export const getUserByClerkId = async (req, res) => {
  try {
    const clerkId = getClerkIdFromReq(req);
    if (!clerkId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOne({ clerkId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'No previous entry found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('❌ Error fetching user : ', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

// Update user by clerkId (requires auth)
export const updateUserByClerkId = async (req, res) => {
  try {
    const clerkId = getClerkIdFromReq(req);
    if (!clerkId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const updates = { ...req.body };
    if (updates.dob) updates.dob = new Date(updates.dob);

    // remove empty fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] === '' || updates[key] === null || updates[key] === undefined) delete updates[key];
    });

    const updated = await User.findOneAndUpdate({ clerkId }, updates, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'No previous entry found for updation' });
    }

    res.status(200).json({
      success: true,
      message: 'Form updated successfully',
      user: updated
    });
  } catch (error) {
    console.error('❌ Error updating user :', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};
