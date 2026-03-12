const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};



// REGISTER USER
const registerUser = async (req, res) => {
    try {

        let { name, email, password } = req.body;

        // Validate fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required"
            });
        }

        // Normalize email
        email = email.toLowerCase().trim();

        // Restrict to LTTS email
        if (!email.endsWith("@ltts.com")) {
            return res.status(400).json({
                message: "Only LTTS email IDs are allowed"
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: "student"
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (error) {

        console.error("Register Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};



// LOGIN USER
const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};



module.exports = {
    registerUser,
    loginUser
};
