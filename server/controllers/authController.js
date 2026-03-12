const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};


// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {

        let { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        email = email.toLowerCase();

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {

            return res.json({
                _id: user._id,
                name: user.name,
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
};};


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
