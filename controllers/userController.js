import bcrypt from "bcrypt";
import User from "../models/user.js";
import { generateToken } from "../lib/utils.js";

// Signup a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing Details" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio: bio || "",
    });

    const token = generateToken(newUser._id);
    const { password: _, ...safeUserData } = newUser._doc;

    res.status(201).json({
      success: true,
      userData: safeUserData,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login an existing user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const userData = await User.findOne({ email });
    if (!userData) {
      return res.status(400).json({ success: false, message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ success: false, message: "Invalid Credentials" });
    }

    const token = generateToken(userData._id);
    const { password: _, ...safeUserData } = userData._doc;

    res.status(200).json({
      success: true,
      userData: safeUserData,
      token,
      message: "Login Successful",
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Check if user is authenticated
export const checkAuth = (req, res) => {
  res.json({ success: true, userData: req.user });
};

// Update user profile
export const updateProfile = async (req, res) => {
  const userId = req.user._id;
  const { fullName, bio, profilePic } = req.body;

  try {
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePic !== undefined) updateData.profilePic = profilePic;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      userData: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
