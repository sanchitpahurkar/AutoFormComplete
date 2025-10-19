import User from "../models/userSchema.js";

// create a new user
export const createUser = async (req, res) => {
    try {
        const formData = req.body;
        const clerkId = req.auth.userId; // comes from clerk

        // checking if a user already has a entry or not
        const existingUser = await User.findOne({ clerkId });
        if(existingUser) {
            return res.status(400).json({
                success: false,
                message: "Entry already exists. Please use updated route.",
            });
        }

        // DOB string to Date
        const dateOfBirth = formData.dob ? new Date(formData.dob) : null;

        
        // comes direcly in flattened format
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
            clerkId,
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser,
        });

    } catch(error) {
        console.error("❌ Error creating user : ", error);
        res.status(500).json({success: false, message: "Failed to create user"});
    }
};

// fetch user by clerkId
export const getUserByClerkId = async (req, res) => {
    try {
        const clerkId = req.auth.userId; // comes from clerk
        const user = await User.findOne({ clerkId });
        if(!user) {
            return res.status(404).json({success: false, message: "No previous entry found"});
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("❌ Error fetching user : ", error);
        res.status(500).json({success: false, message: "Failed to fetch user"});
    }
}


// update current user details using clerkId
// update current user details using clerkId
export const updateUserByClerkId = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const updates = { ...req.body };

    // handle DOB conversion if present
    if (updates.dob) {
      updates.dob = new Date(updates.dob);
    }

    // removes any empty or undefined fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] === "" || updates[key] === null) {
        delete updates[key];
      }
    });

    const updated = await User.findOneAndUpdate({ clerkId }, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "No previous entry found for updation" });
    }

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      user: updated,
    });
  } catch (error) {
    console.error("❌ Error updating user :", error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};



