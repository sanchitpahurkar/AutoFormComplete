import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  dob: { type: String, required: true },
  resume: { type: String } // store file path / cloud link
}, { timestamps: true });

export default mongoose.model("User", userSchema);
