const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// Generate JWT token
const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {

        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        email = email.toLowerCase().trim();

        // Restrict LTTS emails
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


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
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
};    }
};


// LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// EXPORT CONTROLLERS
module.exports = {
    registerUser,
    loginUser
};                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });

        } else {

            return res.status(401).json({
                message: 'Invalid email or password'
            });

        }

    } catch (error) {

        console.error('Login Error:', error);

        res.status(500).json({
            message: 'Server error'
        });

    }
};



// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {

    try {

        let { name, email, password } = req.body;

        // Validate fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email, and password are required'
            });
        }

        email = email.toLowerCase().trim();

        // Restrict LTTS emails
        if (!email.endsWith('@ltts.com')) {
            return res.status(400).json({
                message: 'Only LTTS email IDs are allowed'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: 'student'
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid user data'
            });
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (error) {

        console.error('Register Error:', error);

        res.status(500).json({
            message: 'Server error'
        });

    }
};


module.exports = {
    loginUser,
    registerUser
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {

    try {

        let { name, email, password } = req.body;

        // Normalize email
        email = email.toLowerCase();

        // Restrict LTTS emails
        if (!email.endsWith('@ltts.com')) {
            return res.status(400).json({
                message: 'Only LTTS email IDs are allowed'
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user (force role = student)
        const user = await User.create({
            name,
            email,
            password,
            role: 'student'
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (error) {

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Only LTTS email IDs are allowed'
            });
        }

        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { loginUser, registerUser };
