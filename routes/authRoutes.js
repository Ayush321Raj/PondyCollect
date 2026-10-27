const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Handles dual-role user registration with atomic transactions
 */
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, role, department, designation, phone } = req.body;

    // 1. Validation: Required fields
    if (!name || !email || !password || !confirmPassword || !role || !department || !designation) {
        return res.status(400).json({
            success: false,
            message: 'All required fields (name, email, password, confirm password, role, department, designation) must be filled.'
        });
    }

    // 2. Validation: Allowed roles
    const normalizedRole = role.toLowerCase().trim();
    if (!['employee', 'admin'].includes(normalizedRole)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role selected. Allowed roles are "employee" and "admin".'
        });
    }

    // 3. Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address.'
        });
    }

    // 4. Validation: Password strength & confirmation
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match. Please re-enter.'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // 5. Check if email already registered
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (existingUsers.length > 0) {
            connection.release();
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists. Please login instead.'
            });
        }

        // 6. Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 7. Atomic Transaction: Insert into users and corresponding role table
        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, normalizedRole]
        );

        const newUserId = userResult.insertId;

        if (normalizedRole === 'employee') {
            await connection.execute(
                'INSERT INTO employees (user_id, department, designation, phone) VALUES (?, ?, ?, ?)',
                [newUserId, department.trim(), designation.trim(), phone ? phone.trim() : null]
            );
        } else {
            await connection.execute(
                'INSERT INTO admins (user_id, department, designation, phone) VALUES (?, ?, ?, ?)',
                [newUserId, department.trim(), designation.trim(), phone ? phone.trim() : null]
            );
        }

        await connection.commit();
        connection.release();

        return res.status(201).json({
            success: true,
            message: `Account registered successfully as ${normalizedRole.toUpperCase()}! You can now log in.`,
            redirectUrl: '/login.html'
        });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackErr) {
                console.error('[Rollback Error]:', rollbackErr);
            }
        }
        console.error('[Registration Error]:', err);
        return res.status(500).json({
            success: false,
            message: 'A database error occurred during registration. Please try again later.'
        });
    }
});

/**
 * POST /api/auth/login
 * Verifies credentials, regenerates session, and stores user in session
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please enter both email and password.'
        });
    }

    try {
        // Query user by email
        const [users] = await pool.execute(
            'SELECT id, name, email, password, role FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            // Constant-time-like generic response to prevent user enumeration
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        // Verify password hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Fetch associated role profile details (department, designation, phone)
        let profile = null;
        if (user.role === 'employee') {
            const [empRows] = await pool.execute(
                'SELECT department, designation, phone FROM employees WHERE user_id = ?',
                [user.id]
            );
            profile = empRows[0] || {};
        } else if (user.role === 'admin') {
            const [adminRows] = await pool.execute(
                'SELECT department, designation, phone FROM admins WHERE user_id = ?',
                [user.id]
            );
            profile = adminRows[0] || {};
        }

        // Regenerate session to prevent session fixation attacks
        req.session.regenerate((err) => {
            if (err) {
                console.error('[Session Regeneration Error]:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error while initializing session.'
                });
            }

            // Save user profile in session
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: profile ? profile.department : '',
                designation: profile ? profile.designation : '',
                phone: profile ? profile.phone : ''
            };

            const redirectUrl = user.role === 'admin'
                ? '/admin-dashboard.html'
                : '/employee-dashboard.html';

            return res.status(200).json({
                success: true,
                message: `Welcome back, ${user.name}!`,
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                redirectUrl
            });
        });

    } catch (err) {
        console.error('[Login Error]:', err);
        return res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred during login.'
        });
    }
});

/**
 * GET /api/auth/current-user
 * Returns currently logged-in user profile
 */
router.get('/current-user', (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json({
            success: true,
            user: req.session.user
        });
    }
    return res.status(401).json({
        success: false,
        message: 'No active session found.'
    });
});

/**
 * POST /api/auth/logout and GET /api/auth/logout
 * Destroys session and clears cookie
 */
const handleLogout = (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('[Logout Error]:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Could not log out at this time.'
                });
            }
            res.clearCookie('connect.sid');
            
            // If request explicitly prefers JSON over HTML or is an API request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(200).json({
                    success: true,
                    message: 'Logged out successfully.',
                    redirectUrl: '/login.html'
                });
            }

            // If request expects HTML/browser direct navigation
            return res.redirect('/login.html');
        });
    } else {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({
                success: true,
                message: 'No session was active.',
                redirectUrl: '/login.html'
            });
        }
        return res.redirect('/login.html');
    }
};

router.post('/logout', handleLogout);
router.get('/logout', handleLogout);

module.exports = router;
