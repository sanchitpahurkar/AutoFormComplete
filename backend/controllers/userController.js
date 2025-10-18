import User from "../models/userSchema.js";

// create a new user
export const createUser = async (req, res) => {
    try {
        const formData = req.body;

        // DOB string to Date
        const dateOfBirth = formData.dob ? new Date(formData.dob) : null;

        const clerkId = req.auth.userId;

        const newUser = new User({
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            dob: dateOfBirth,
            gender: formData.gender,
            phone: formData.phone,
            rknecID: formData.rknecEmail,
            emailID: formData.personalEmail,
            alternatePhone: formData.alternatePhone,
            currentAddress: formData.currentAddress,
            permanentAddress: formData.permanentAddress,
            collegeYear: formData.currentDegree.year,
            branch: formData.currentDegree.branch,
            enrollmentNumber: formData.currentDegree.enrollmentNo,
            cgpa: formData.currentDegree.cgpa,
            activeBacklogs: formData.currentDegree.activeBacklogs,
            deadBacklogs: formData.currentDegree.deadBacklogs,
            yearOfGraduation: formData.currentDegree.graduationYear,
            hscSchoolName: formData.twelfth.schoolName,
            hscBoard: formData.twelfth.board,
            hscYearOfPassing: formData.twelfth.passingYear,
            hscPercentage: formData.twelfth.percentage,
            sscSchoolName: formData.tenth.schoolName,
            sscBoard: formData.tenth.board,
            sscYearOfPassing: formData.tenth.passingYear,
            sscPercentage: formData.tenth.percentage,
            resume: formData.resumeLink,
            clerkId
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


export const getAllUsers = async (req,res) => {
    try {
        const users = await User.find();
        res.status(200).json({success: true, users});
    } catch(error) {
        console.error("❌ Error fetching users : ", error);
        res.status(500).json({success: false, message: "Failed to fetch users"});
    }
}